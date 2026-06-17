// What this file does: displays the user's profile and saved property listings
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Home } from 'lucide-react';
import Navbar from '../components/Navbar';
import PropertyCard from '../components/property/PropertyCard';
import { getMe } from '../api/authApi';
import { getProperty } from '../api/propertyApi';

export default function ProfilePage() {
  const [saved,   setSaved]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate  = useNavigate();

  useEffect(() => {
    async function loadSaved() {
      try {
        const userRes = await getMe();
        const savedIds = userRes.data.savedProperties || [];

        if (savedIds.length === 0) { 
          setLoading(false); 
          return; 
        }

        const promises = savedIds.map(id => getProperty(id));
        const results  = await Promise.allSettled(promises);
        const props    = results
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value.data);
        setSaved(props);
      } catch (err) {
        console.error('Could not load saved listings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSaved();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '1100px', margin: '0 auto', padding: '8rem 2rem 4rem' }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="label" style={{ color: 'var(--accent)', marginBottom: '0.6rem' }}>
            Your Collection
          </p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '0.7rem', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
            <Heart size={28} fill="var(--accent)" color="var(--accent)" />
            SAVED LISTINGS
          </h1>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
        ) : saved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Home size={48} color="var(--border-hover)" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ marginBottom: '1.5rem' }}>No saved listings yet.</p>
            <button onClick={() => navigate('/browse')} className="btn-rose" style={{ borderRadius: '8px' }}>Browse Properties</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.5rem' }}>
            {saved.map(p => (
              <PropertyCard key={p._id} property={p} onClick={() => navigate(`/property/${p._id}`)} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
