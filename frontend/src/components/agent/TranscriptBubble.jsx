// What this file does: displays a single conversation bubble with role-specific color theme
import React from 'react';

export default function TranscriptBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div style={{
      display:        'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom:   '0.8rem'
    }}>
      <div style={{
        maxWidth:     '80%',
        padding:      '0.6rem 1rem',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background:   isUser ? 'var(--accent)' : 'var(--bg-card)',
        color:        isUser ? 'var(--obsidian)' : 'var(--cream)',
        fontSize:     '0.82rem',
        lineHeight:   1.5,
        border:       '1px solid var(--border)',
        boxShadow:    '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {message.text}
      </div>
    </div>
  );
}
