// What this file does: modal overlay showing property preview with backdrop blur and spring animation
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, BedDouble, ArrowRight } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';

function formatPrice(price) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000)   return `₹${(price / 100000).toFixed(0)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

export default function PropertyModal({ property, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!property) return null;
  const { _id, title, location, price, bhk, images, description } = property;

  function handleViewDetails() {
    navigate(`/property/${_id}`);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        id="property-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(7, 12, 15, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex:     2000,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding:    '1rem',
        }}
      >
        <motion.div
          id="property-modal-card"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background:   'var(--bg-card)',
            border:       '1px solid var(--border)',
            borderRadius: '16px',
            overflow:     'hidden',
            width:        '100%',
            maxWidth:     '540px',
          }}
        >
          {/* Cover image */}
          <div style={{ position: 'relative', height: '280px' }}>
            <img
              src={getImageUrl(images?.[0])}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Close */}
            <button
              id="modal-close-btn"
              onClick={onClose}
              style={{
                position:     'absolute',
                top:          '1rem',
                right:        '1rem',
                background:   'rgba(7,12,15,0.8)',
                border:       '1px solid var(--border)',
                borderRadius: '50%',
                width:        '36px',
                height:       '36px',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                cursor:       'pointer',
                color:        'var(--cream)',
              }}
            >
              <X size={16} />
            </button>
            {/* BHK Tag */}
            <span className="badge badge-rose" style={{ position: 'absolute', bottom: '1rem', left: '1rem', letterSpacing: '0.12em', fontWeight: 600 }}>
              {bhk} BHK
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--cream)' }}>
              {title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <MapPin size={14} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{location}</span>
            </div>

            {description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {description.slice(0, 150)}…
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                {formatPrice(price)}
              </span>
              <button
                id="modal-view-details-btn"
                onClick={handleViewDetails}
                className="btn-rose"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
              >
                View Details <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
