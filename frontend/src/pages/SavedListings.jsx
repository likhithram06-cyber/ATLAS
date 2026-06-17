// What this file does: saved listings page showing properties the user has bookmarked
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Home } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import PropertyCard from '../components/PropertyCard';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function SavedListings() {
  const [saved,   setSaved]   = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate  = useNavigate();

  // Fetches the logged-in user's profile to get their saved property IDs
  useEffect(() => {
    async function loadSaved() {
      try {
        const userRes = await api.get('/api/auth/me');
        const savedIds = userRes.data.savedProperties || [];

        if (savedIds.length === 0) { setLoading(false); return; }

        // Fetch each saved property's details
        const promises = savedIds.map(id => api.get(`/api/properties/${id}`));
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
    <div className="page-wrapper">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '1100px', margin: '0 auto', padding: '8rem 2rem 4rem' }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="font-label" style={{ color: 'var(--dusty-rose)', fontSize: '0.72rem', marginBottom: '0.6rem' }}>
            Your Collection
          </p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <Heart size={28} fill="var(--dusty-rose)" color="var(--dusty-rose)" />
            Saved Listings
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading your saved properties…</div>
        ) : saved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Home size={48} color="var(--border)" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>No saved listings yet.</p>
            <button onClick={() => navigate('/browse')} className="btn-primary">Browse Properties</button>
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
