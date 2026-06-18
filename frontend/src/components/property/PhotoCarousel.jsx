// What this file does: slide-based image viewer carousel for property details
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';

export default function PhotoCarousel({ images = [] }) {
  const [index, setIndex] = useState(0);

  const list = images.length > 0 ? images.map(getImageUrl) : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'];

  function handlePrev() {
    setIndex(prev => (prev - 1 + list.length) % list.length);
  }

  function handleNext() {
    setIndex(prev => (prev + 1) % list.length);
  }

  return (
    <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', aspectRatio: '4/3', border: '1px solid var(--border)' }}>
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={list[index]}
          alt={`Photo ${index + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AnimatePresence>

      {/* Prev/Next buttons */}
      {list.length > 1 && (
        <>
          <button id="carousel-prev" onClick={handlePrev} style={btnStyle('left')}>
            <ChevronLeft size={20} />
          </button>
          <button id="carousel-next" onClick={handleNext} style={btnStyle('right')}>
            <ChevronRight size={20} />
          </button>

          {/* Dot Indicators */}
          <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10 }}>
            {list.map((_, i) => (
              <button
                key={i}
                id={`carousel-dot-${i}`}
                onClick={() => setIndex(i)}
                style={{
                  width:        i === index ? '20px' : '8px',
                  height:       '8px',
                  borderRadius: '4px',
                  background:   i === index ? 'var(--rose)' : 'rgba(255,255,255,0.4)',
                  border:       'none',
                  cursor:       'pointer',
                  transition:   'all 0.3s ease',
                  padding:      0,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function btnStyle(side) {
  return {
    position:     'absolute',
    top:          '50%',
    [side]:       '0.85rem',
    transform:    'translateY(-50%)',
    background:   'rgba(19, 28, 35, 0.75)',
    border:       '1px solid var(--border)',
    borderRadius: '50%',
    width:        '40px',
    height:       '40px',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    cursor:       'pointer',
    color:        'var(--pale)',
    zIndex:       5,
  };
}
