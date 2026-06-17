// What this file does: hook for voice recording, talking to backend AI agent endpoints, and speech synthesis
import { useState, useRef } from 'react';
import { getAgentResponse, finalizeConversation } from '../api/agentApi';

export function useVoiceAgent(property) {
  const [transcript,   setTranscript]   = useState([]);   // [{role, text}]
  const [isListening,  setIsListening]  = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [isThinking,   setIsThinking]   = useState(false);
  const [intentScore,  setIntentScore]  = useState(0);
  const [error,        setError]        = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);

  // Adds one message to the transcript
  function addMessage(role, text) {
    setTranscript(prev => [...prev, { role, text, timestamp: new Date() }]);
  }

  // Speaks text aloud using browser Web Speech API
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

  // Starts recording audio from mic
  async function startListening() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop          = () => handleStop(stream);
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (err) {
      setError('Microphone access denied.');
    }
  }

  // Stops recording
  function stopListening() {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }

  // Audio upload -> Backend Whisper -> Backend LLaMA -> Speak Response
  async function handleStop(stream) {
    stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    setIsThinking(true);
    setError('');

    try {
      const res = await getAgentResponse(blob, property._id, transcript);
      const { transcription, reply } = res.data;

      if (!transcription.trim()) {
        setIsThinking(false);
        return;
      }

      // Update transcript with user query and assistant answer
      setTranscript(prev => [
        ...prev,
        { role: 'user', text: transcription },
        { role: 'assistant', text: reply }
      ]);

      speak(reply);
    } catch (err) {
      console.error(err);
      setError('Failed to communicate with AI agent.');
    } finally {
      setIsThinking(false);
    }
  }

  // Finalizes the call, scores the lead, saves in DB, and fires Telegram alert
  async function endCall() {
    if (transcript.length === 0) return null;
    setIsThinking(true);
    try {
      const res = await finalizeConversation(property._id, transcript);
      setIntentScore(res.data.intentScore);
      return res.data;
    } catch (err) {
      console.warn('Finalize call failed:', err.message);
      return null;
    } finally {
      setIsThinking(false);
    }
  }

  return {
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
  };
}
