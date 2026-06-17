// What this file does: full floating AI voice assistant widget panel using the useVoiceAgent hook
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2 } from 'lucide-react';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import TranscriptBubble from './TranscriptBubble';
import MicButton from './MicButton';

export default function VoiceAgentWidget({ property, onClose }) {
  const {
    transcript,
    isListening,
    isSpeaking,
    isThinking,
    intentScore,
    error,
    startListening,
    stopListening,
    addMessage,
    speak,
    endCall
  } = useVoiceAgent(property);

  const transcriptEndRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, isThinking]);

  // Greet the user on mount
  useEffect(() => {
    const greeting = `Hello! I'm ATLAS, your AI assistant. I can help you with the price, features, or location of ${property?.title || 'this home'}, or note your interest to book a site visit.`;
    addMessage('assistant', greeting);
    speak(greeting);
  }, [property]);

  // Ends the call, triggers intent scoring / saving, and closes the agent panel
  async function handleEndConversation() {
    await endCall();
    onClose();
  }

  return (
    <motion.div
      id="ai-agent-panel"
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
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
        boxShadow:    '0 24px 64px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div style={{
        padding:         '1.2rem 1.5rem',
        background:      'linear-gradient(135deg, var(--accent-dark), var(--accent))',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        color:           'var(--cream)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem',
            }}>
              🤖
            </div>
            {isSpeaking && (
              <div className="pulse-ring" style={{
                position: 'absolute', inset: '-4px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)',
              }} />
            )}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.05em' }}>ATLAS ASSISTANT</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-label)', letterSpacing: '0.05em' }}>
              {isSpeaking ? '🔊 SPEAKING...' : isListening ? '🔴 LISTENING...' : isThinking ? '💭 THINKING...' : '● ONLINE'}
            </div>
          </div>
        </div>

        <button id="agent-close-btn" onClick={handleEndConversation} style={{ background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {/* Waveform indicator */}
      {isSpeaking && (
        <div style={{ padding: '0.6rem 1.5rem', display: 'flex', gap: '4px', alignItems: 'center', background: 'var(--bg-page)' }}>
          <Volume2 size={14} color="var(--accent)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ATLAS is speaking...</span>
        </div>
      )}

      {/* Conversations log */}
      <div style={{
        flex:      1,
        overflowY: 'auto',
        padding:   '1.2rem',
        display:   'flex',
        flexDirection: 'column',
        gap:       '0.8rem',
      }}>
        {transcript.map((msg, i) => (
          <TranscriptBubble key={i} message={msg} />
        ))}

        {isThinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '0.6rem 1rem', background: 'var(--bg-card)', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--border)' }}>
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

      <div style={{
        padding:    '1.2rem',
        borderTop:  '1px solid var(--border)',
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap:        '1rem',
        background: 'var(--bg-page)'
      }}>
        <MicButton isListening={isListening} onStart={startListening} onStop={stopListening} />
        
        {transcript.length > 1 && (
          <button
            id="agent-end-btn"
            onClick={handleEndConversation}
            className="btn-ghost"
            style={{ fontSize: '0.75rem', borderRadius: '9999px', padding: '0.4rem 1.2rem' }}
          >
            End Conversation
          </button>
        )}
      </div>
    </motion.div>
  );
}
