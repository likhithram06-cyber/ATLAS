// What this file does: reusable save/unsave bookmark button with heart icon
import React from 'react';
import { Heart } from 'lucide-react';

export default function SaveButton({ isSaved, onClick }) {
  return (
    <button
      id="save-property-btn"
      onClick={onClick}
      className="btn-ghost"
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        borderRadius: '8px', 
        transition: 'all 0.2s',
      }}
    >
      <Heart 
        size={16} 
        fill={isSaved ? 'var(--accent)' : 'none'} 
        color={isSaved ? 'var(--accent)' : 'var(--text-muted)'} 
      />
      <span style={{ color: isSaved ? 'var(--cream)' : 'var(--text-muted)' }}>
        {isSaved ? 'Saved' : 'Save'}
      </span>
    </button>
  );
}
