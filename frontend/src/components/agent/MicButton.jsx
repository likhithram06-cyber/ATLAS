// What this file does: mic recording button supporting touch and mouse hold interactions
import { Mic, MicOff } from 'lucide-react';

export default function MicButton({ isListening, onStart, onStop }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <button
        id="mic-btn"
        onMouseDown={onStart}
        onMouseUp={onStop}
        onTouchStart={onStart}
        onTouchEnd={onStop}
        style={{
          width:        '64px',
          height:       '64px',
          borderRadius: '50%',
          border:       'none',
          cursor:       'pointer',
          background:   isListening
            ? 'var(--accent-light)'
            : 'linear-gradient(135deg, var(--accent-dark), var(--accent))',
          color:        'var(--obsidian)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          transition:   'transform 0.15s, box-shadow 0.15s',
          boxShadow:    isListening
            ? '0 0 0 8px rgba(92, 143, 166, 0.25)'
            : '0 4px 20px rgba(92, 143, 166, 0.4)',
          transform:    isListening ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
      </button>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-label)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {isListening ? 'Release to send' : 'Hold to speak'}
      </p>
    </div>
  );
}
