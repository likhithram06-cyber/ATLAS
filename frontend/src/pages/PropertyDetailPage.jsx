// What this file does: full property detail page with photo carousel, Twilio talk to agent trigger, and similar properties
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, BedDouble, ChevronLeft, ChevronRight, Heart, Mic, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import PropertyCard from '../components/property/PropertyCard';
import PhotoCarousel from '../components/property/PhotoCarousel';
import SaveButton from '../components/property/SaveButton';
import TalkToAgentButton from '../components/agent/TalkToAgentButton';
import { getProperty, getSimilarProperties } from '../api/propertyApi';
import { toggleSaveProperty, getMe } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/formatters';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property,  setProperty]  = useState(null);
  const [similar,   setSimilar]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saved,     setSaved]     = useState(false);

  // Load property details
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [propRes, simRes] = await Promise.all([
          getProperty(id),
          getSimilarProperties(id),
        ]);
        setProperty(propRes.data);
        setSimilar(simRes.data);

        // Check if saved
        if (user) {
          try {
            const userRes = await getMe();
            const savedIds = userRes.data.savedProperties || [];
            setSaved(savedIds.includes(id));
          } catch (e) {
            console.warn('Failed to fetch user profile saved status', e);
          }
        }
      } catch (err) {
        console.error('Failed to load property:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  async function handleSaveToggle() {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await toggleSaveProperty(id);
      const savedIds = res.data.savedProperties || [];
      setSaved(savedIds.includes(id));
    } catch (err) {
      console.warn('Could not toggle save:', err.message);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Property not found.
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: '1100px', margin: '0 auto', padding: '6rem 2rem 4rem' }}
      >
        {/* Back link */}
        <button
          id="property-back-btn"
          onClick={() => navigate('/browse')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-label)', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}
        >
          <ArrowLeft size={16} /> Back to Browse
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          {/* LEFT: Carousel */}
          <div>
            <PhotoCarousel images={property.images} />
            
            {property.features?.length > 0 && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {property.features.map((f, i) => (
                  <span key={i} className="badge badge-slate">{f}</span>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
              <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={11} /> {property.location}
              </span>
              <span className="badge badge-hot">{property.bhk} BHK</span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', color: 'var(--cream)', marginBottom: '0.8rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{property.title}</h1>

            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '1.5rem' }}>
              {formatPrice(property.price)}
            </div>

            <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, fontSize: '0.92rem', marginBottom: '2rem' }}>
              {property.description}
            </p>

            {/* Static Location Map */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--cream)', marginBottom: '0.75rem', fontFamily: 'var(--font-label)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Property Location
              </h3>
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <iframe
                  title="Property Location Map"
                  width="100%"
                  height="220"
                  style={{ border: 0, display: 'block', filter: 'invert(90%) hue-rotate(180deg) grayscale(40%)' }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(property.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <TalkToAgentButton property={property} />
              <SaveButton isSaved={saved} onClick={handleSaveToggle} />
            </div>

            <div style={{
              marginTop:    '1.5rem',
              padding:      '0.8rem 1rem',
              background:   'rgba(44,30,15,0.15)',
              border:       '1px solid var(--border-glow)',
              borderRadius: '8px',
              fontSize:     '0.78rem',
              color:        'var(--text-muted)',
            }}>
              💡 When you express interest, ATLAS notifies the listing agent instantly via Telegram.
            </div>
          </div>
        </div>

        {/* Similar properties */}
        {similar.length > 0 && (
          <div style={{ marginTop: '4rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--cream)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>SIMILAR PROPERTIES</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1.2rem' }}>
              {similar.map(p => (
                <PropertyCard key={p._id} property={p} onClick={() => navigate(`/property/${p._id}`)} />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
