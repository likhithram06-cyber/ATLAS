// What this file does: in-browser AI voice agent — mic input → Groq → speech synthesis → saves enquiry
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Keywords that indicate purchase/visit intent
const INTENT_KEYWORDS = {
  'book a visit':     { reason: 'Requested site visit', points: 25 },
  'site visit':       { reason: 'Mentioned site visit', points: 20 },
  'i\'m interested':  { reason: 'Expressed direct interest', points: 20 },
  'price':            { reason: 'Asked about price', points: 15 },
  'loan':             { reason: 'Asked about loan', points: 15 },
  'emi':              { reason: 'Asked about EMI', points: 15 },
  'when can i':       { reason: 'Asked about timing', points: 10 },
  'available':        { reason: 'Asked about availability', points: 10 },
  'negotiate':        { reason: 'Asked about negotiation', points: 10 },
};

// Scores a message based on intent keywords it contains
function scoreMessage(text) {
  const lower = text.toLowerCase();
  const breakdown = [];
  let total = 0;
  for (const [keyword, data] of Object.entries(INTENT_KEYWORDS)) {
    if (lower.includes(keyword)) {
      breakdown.push({ reason: data.reason, points: data.points });
      total += data.points;
    }
  }
  return { total, breakdown };
}

export default function AIAgent({ property, onClose }) {
  const [transcript,    setTranscript]    = useState([]);
  const [isListening,   setIsListening]   = useState(false);
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [isThinking,    setIsThinking]    = useState(false);
  const [intentScore,   setIntentScore]   = useState(0);
  const [intentBreakdown, setIntentBreakdown] = useState([]);
  const [error,         setError]         = useState('');
  const transcriptEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const { isAuthenticated } = useAuth();

  // Auto-scroll transcript to bottom on new messages
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Greet the user when the agent opens
  useEffect(() => {
    const greeting = `Hello! I'm ATLAS, your AI property assistant. I'm here to help you learn about ${property?.title || 'this property'}. Feel free to ask me anything — about the price, location, amenities, or to book a site visit!`;
    speak(greeting);
    addMessage('assistant', greeting);
  }, []);

  // Adds a message to the transcript array
  function addMessage(role, text) {
    setTranscript(prev => [...prev, { role, text, timestamp: new Date() }]);
  }

  // Uses Web Speech API to speak a text response aloud
  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate  = 0.95;
    utterance.pitch = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  // Starts recording from the microphone
  async function startListening() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = handleRecordingStop;
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (err) {
      setError('Microphone access denied. Please allow mic permissions.');
    }
  }

  // Stops recording and triggers transcription
  function stopListening() {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsListening(false);
    }
  }

  // Sends recorded audio to Groq Whisper for transcription, then to LLaMA for response
  async function handleRecordingStop() {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    setIsThinking(true);

    try {
      const groqKey = import.meta.env.VITE_GROQ_API_KEY;

      // Step 1: Transcribe audio via Groq Whisper
      let userText = '';
      if (groqKey && groqKey !== 'your_groq_key_here') {
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-large-v3');
        const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${groqKey}` },
          body: formData,
        });
        const whisperData = await whisperRes.json();
        userText = whisperData.text || '';
      } else {
        // Fallback: browser SpeechRecognition for demo without Groq key
        userText = await browserSpeechRecognition(blob);
      }

      if (!userText.trim()) { setIsThinking(false); return; }
      addMessage('user', userText);

      // Score the user's message for intent
      const { total, breakdown } = scoreMessage(userText);
      setIntentScore(prev => Math.min(100, prev + total));
      setIntentBreakdown(prev => [...prev, ...breakdown]);

      // Step 2: Get AI response via Groq LLaMA
      let aiReply = '';
      if (groqKey && groqKey !== 'your_groq_key_here') {
        const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization:  `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
              {
                role:    'system',
                content: buildSystemPrompt(property),
              },
              ...transcript.map(m => ({ role: m.role, content: m.text })),
              { role: 'user', content: userText },
            ],
            max_tokens: 200,
          }),
        });
        const chatData = await chatRes.json();
        aiReply = chatData.choices?.[0]?.message?.content || 'I apologize, I could not process that.';
      } else {
        // Fallback response for demo without API key
        aiReply = getFallbackResponse(userText, property);
      }

      addMessage('assistant', aiReply);
      speak(aiReply);

      // If strong interest detected, save the enquiry automatically
      if (intentScore + total >= 40 && isAuthenticated) {
        saveEnquiry([...transcript, { role: 'user', text: userText }, { role: 'assistant', text: aiReply }], intentScore + total, [...intentBreakdown, ...breakdown]);
      }

    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  }

  // Saves the conversation as an enquiry record in the database
  async function saveEnquiry(fullTranscript, score, breakdown) {
    try {
      await api.post('/api/enquiries', {
        property:        property._id,
        transcript:      fullTranscript,
        intentScore:     score,
        intentBreakdown: breakdown,
        status:          score >= 60 ? 'interested' : 'pending',
      });
    } catch (err) {
      console.warn('Could not save enquiry:', err.message);
    }
  }

  // Builds the system prompt that gives the AI context about the listing
  function buildSystemPrompt(prop) {
    return `You are ATLAS, a professional and warm AI property assistant for a real estate platform. You are currently helping a user with this specific property:

Property: ${prop?.title}
Location: ${prop?.location}
Price: ₹${prop?.price?.toLocaleString('en-IN')}
BHK: ${prop?.bhk} Bedroom
Features: ${prop?.features?.join(', ')}
Description: ${prop?.description}

Your job:
- Answer questions about this property accurately and concisely
- Be friendly, professional, and helpful
- If asked about a site visit or booking, say "I'll note your interest and our agent will contact you shortly"
- Keep replies under 3 sentences
- Do not make up information not provided above`;
  }

  // Simple fallback responses when no Groq API key is set
  function getFallbackResponse(userText, prop) {
    const lower = userText.toLowerCase();
    if (lower.includes('price') || lower.includes('cost')) {
      return `This property is listed at ₹${(prop?.price / 100000).toFixed(0)} Lakhs. Would you like to know about the payment options or EMI plans?`;
    }
    if (lower.includes('location') || lower.includes('where')) {
      return `This property is located in ${prop?.location}. It's well-connected to major roads, schools, and hospitals in the area.`;
    }
    if (lower.includes('visit') || lower.includes('see') || lower.includes('interested')) {
      return `Wonderful! I'll note your interest in ${prop?.title}. Our agent will reach out to you shortly to schedule a site visit at your convenience.`;
    }
    if (lower.includes('bhk') || lower.includes('bedroom') || lower.includes('room')) {
      return `This is a ${prop?.bhk} BHK property with spacious rooms and modern fittings. Would you like to know more about the layout?`;
    }
    return `Thank you for your interest in ${prop?.title}. This ${prop?.bhk} BHK property in ${prop?.location} is a great investment. What specific aspect would you like to know more about?`;
  }

  // Uses browser speech recognition as fallback (no API key needed)
  function browserSpeechRecognition() {
    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { resolve('Hello, I have a question about this property.'); return; }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.onresult = (e) => resolve(e.results[0][0].transcript);
      recognition.onerror  = ()  => resolve('');
      recognition.start();
    });
  }

  return (
    <motion.div
      id="ai-agent-panel"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      style={{
        position:     'fixed',
        bottom:       '2rem',
        right:        '2rem',
        width:        '380px',
        maxHeight:    '540px',
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        borderRadius: '20px',
        display:      'flex',
        flexDirection:'column',
        zIndex:       3000,
        overflow:     'hidden',
        boxShadow:    '0 24px 64px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding:         '1.2rem 1.5rem',
        background:      'linear-gradient(135deg, var(--accent-dark), var(--accent))',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {/* Pulsing avatar */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem',
            }}>
              🏠
            </div>
            {isSpeaking && (
              <div className="pulse-ring" style={{
                position: 'absolute', inset: '-4px',
                borderRadius: '50%',
                border: '2px solid rgba(92, 143, 166, 0.6)',
              }} />
            )}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem' }}>ATLAS Agent</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-label)' }}>
              {isSpeaking ? '🔊 Speaking...' : isListening ? '🔴 Listening...' : isThinking ? '💭 Thinking...' : '● Online'}
            </div>
          </div>
        </div>

        {/* Intent score badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '20px',
            padding: '0.2rem 0.7rem',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-label)',
          }}>
            Intent: {intentScore}%
          </div>
          <button id="agent-close-btn" onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Waveform (when speaking) ── */}
      {isSpeaking && (
        <div style={{ padding: '0.6rem 1.5rem', display: 'flex', gap: '4px', alignItems: 'center', background: 'var(--bg-page)' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="wave-bar" style={{ height: `${12 + i * 4}px`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      )}

      {/* ── Transcript ── */}
      <div style={{
        flex:      1,
        overflowY: 'auto',
        padding:   '1rem 1.2rem',
        display:   'flex',
        flexDirection: 'column',
        gap:       '0.8rem',
      }}>
        {transcript.map((msg, i) => (
          <div key={i} style={{
            display:       'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth:     '80%',
              padding:      '0.6rem 1rem',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background:   msg.role === 'user' ? 'var(--accent)' : 'var(--bg-page)',
              color:        msg.role === 'user' ? 'var(--obsidian)' : 'var(--text-primary)',
              fontSize:     '0.82rem',
              lineHeight:   1.5,
              border:       msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {isThinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '0.6rem 1rem', background: 'var(--bg-page)', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: `wave 1s ${i * 0.2}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p style={{ color: 'var(--accent)', fontSize: '0.78rem', textAlign: 'center' }}>{error}</p>}
        <div ref={transcriptEndRef} />
      </div>

      {/* ── Controls ── */}
      <div style={{
        padding:    '1rem 1.5rem',
        borderTop:  '1px solid var(--border)',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap:        '1rem',
      }}>
        <button
          id="mic-btn"
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          style={{
            width:        '64px',
            height:       '64px',
            borderRadius: '50%',
            border:       'none',
            cursor:       'pointer',
            background:   isListening
              ? 'var(--accent-light)'
              : 'linear-gradient(135deg, var(--accent-dark), var(--accent))',
            color:        'white',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            transition:   'transform 0.15s, box-shadow 0.15s',
            boxShadow:    isListening
              ? '0 0 0 8px rgba(26,75,97,0.25)'
              : '0 4px 20px rgba(26,75,97,0.4)',
            transform:    isListening ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-label)', letterSpacing: '0.04em' }}>
          {isListening ? 'Release to send' : 'Hold to speak'}
        </p>
      </div>
    </motion.div>
  );
}
