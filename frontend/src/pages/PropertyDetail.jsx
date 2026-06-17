// What this file does: full property detail page with photo carousel, AI agent, and similar properties
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, BedDouble, ChevronLeft, ChevronRight, Heart, Mic, ArrowLeft } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import AIAgent from '../components/AIAgent';
import PropertyCard from '../components/PropertyCard';
import api from '../api/axios';

// Formats rupee price in Indian notation
function formatPrice(price) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000)   return `₹${(price / 100000).toFixed(0)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property,  setProperty]  = useState(null);
  const [similar,   setSimilar]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [imgIndex,  setImgIndex]  = useState(0);
  const [saved,     setSaved]     = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  // Fetches property details and similar listings on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [propRes, simRes] = await Promise.all([
          api.get(`/api/properties/${id}`),
          api.get(`/api/properties/similar/${id}`),
        ]);
        setProperty(propRes.data);
        setSimilar(simRes.data);
      } catch (err) {
        console.error('Failed to load property:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Advances to the next photo in the carousel
  function nextImage() {
    setImgIndex(prev => (prev + 1) % (property?.images?.length || 1));
  }

  // Goes back to the previous photo in the carousel
  function prevImage() {
    setImgIndex(prev => (prev - 1 + (property?.images?.length || 1)) % (property?.images?.length || 1));
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '2px solid var(--border)', borderTop: '2px solid var(--dusty-rose)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Property not found.
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: '1100px', margin: '0 auto', padding: '6rem 2rem 4rem' }}
      >
        {/* ── Back button ── */}
        <button
          id="property-back-btn"
          onClick={() => navigate('/browse')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-label)', fontSize: '0.75rem' }}
        >
          <ArrowLeft size={16} /> Back to Browse
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          {/* ── LEFT: Photo Carousel ── */}
          <div>
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', aspectRatio: '4/3' }}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={imgIndex}
                  src={property.images?.[imgIndex] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'}
                  alt={`${property.title} photo ${imgIndex + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </AnimatePresence>

              {/* Carousel Controls */}
              {property.images?.length > 1 && (
                <>
                  <button id="carousel-prev" onClick={prevImage} style={carouselBtnStyle('left')}>
                    <ChevronLeft size={20} />
                  </button>
                  <button id="carousel-next" onClick={nextImage} style={carouselBtnStyle('right')}>
                    <ChevronRight size={20} />
                  </button>

                  {/* Dot indicators */}
                  <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                    {property.images.map((_, i) => (
                      <button
                        key={i}
                        id={`carousel-dot-${i}`}
                        onClick={() => setImgIndex(i)}
                        style={{
                          width:        i === imgIndex ? '20px' : '8px',
                          height:       '8px',
                          borderRadius: '4px',
                          background:   i === imgIndex ? 'var(--dusty-rose)' : 'rgba(255,255,255,0.4)',
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

            {/* Features tags */}
            {property.features?.length > 0 && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {property.features.map((f, i) => (
                  <span key={i} className="badge badge-storm">{f}</span>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Property Info ── */}
          <div>
            {/* Location & BHK badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
              <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={11} /> {property.location}
              </span>
              <span className="badge badge-burgundy">{property.bhk} BHK</span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: '0.8rem' }}>{property.title}</h1>

            {/* Price */}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--dusty-rose)', marginBottom: '1.5rem' }}>
              {formatPrice(property.price)}
            </div>

            {/* Description */}
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, fontSize: '0.92rem', marginBottom: '2rem' }}>
              {property.description}
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                id="talk-to-agent-btn"
                onClick={() => setAgentOpen(true)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}
              >
                <Mic size={16} /> Talk to Agent
              </button>
              <button
                id="save-property-btn"
                onClick={() => setSaved(!saved)}
                className="btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Heart size={16} fill={saved ? 'var(--dusty-rose)' : 'none'} color={saved ? 'var(--dusty-rose)' : 'var(--text-muted)'} />
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>

            {/* n8n automation note for demo */}
            <div style={{
              marginTop:    '1.5rem',
              padding:      '0.8rem 1rem',
              background:   'rgba(107,30,42,0.1)',
              border:       '1px solid rgba(107,30,42,0.25)',
              borderRadius: '8px',
              fontSize:     '0.78rem',
              color:        'var(--text-muted)',
            }}>
              💡 When you express interest, our n8n automation notifies the agent instantly via Telegram.
            </div>
          </div>
        </div>

        {/* ── Similar Properties ── */}
        {similar.length > 0 && (
          <div style={{ marginTop: '4rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Similar Properties</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1.2rem' }}>
              {similar.map(p => (
                <PropertyCard key={p._id} property={p} onClick={() => navigate(`/property/${p._id}`)} />
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── AI Agent Panel ── */}
      <AnimatePresence>
        {agentOpen && <AIAgent property={property} onClose={() => setAgentOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

// Helper for carousel button styles
function carouselBtnStyle(side) {
  return {
    position:     'absolute',
    top:          '50%',
    [side]:       '0.75rem',
    transform:    'translateY(-50%)',
    background:   'rgba(15,19,24,0.7)',
    border:       '1px solid var(--border)',
    borderRadius: '50%',
    width:        '40px',
    height:       '40px',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    cursor:       'pointer',
    color:        'var(--text-primary)',
    zIndex:       1,
  };
}
