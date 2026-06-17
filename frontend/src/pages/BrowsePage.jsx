// What this file does: Browse page with search bar, filter panel, and O(log N) price range binary search grid
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import PropertyGrid from '../components/property/PropertyGrid';
import PropertyModal from '../components/property/PropertyModal';
import { getProperties } from '../api/propertyApi';
import { toggleSaveProperty, getMe } from '../api/authApi';
import { binarySearchByPrice } from '../utils/binarySearch';
import { useAuth } from '../context/AuthContext';

export default function BrowsePage() {
  const [properties,   setProperties]   = useState([]);
  const [loading,      setLoading]       = useState(true);
  const [error,        setError]         = useState('');
  const [search,       setSearch]        = useState('');
  const [filterOpen,   setFilterOpen]    = useState(false);
  const [selectedProp, setSelectedProp]  = useState(null);
  const [savedIds,     setSavedIds]      = useState([]);
  const [filters,      setFilters]       = useState({ minPrice: '', maxPrice: '', bhk: '', location: '' });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch properties on mount
  useEffect(() => { 
    fetchProperties(); 
  }, []);

  // Fetch user saved properties on mount / auth change
  useEffect(() => {
    async function loadSaved() {
      if (user) {
        try {
          const res = await getMe();
          setSavedIds(res.data.savedProperties || []);
        } catch (e) {
          console.warn('Failed to load user saved properties', e);
        }
      }
    }
    loadSaved();
  }, [user]);

  async function fetchProperties() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.location) params.location = filters.location;
      if (filters.bhk)      params.bhk      = filters.bhk;
      const res = await getProperties(params);
      setProperties(res.data);
    } catch {
      setError('Could not load properties. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  // Client-side price filter using O(log N) binary search bounds
  const filtered = (() => {
    let list = properties;
    if (filters.minPrice || filters.maxPrice) {
      const sorted = [...list].sort((a, b) => a.price - b.price);
      list = binarySearchByPrice(sorted, Number(filters.minPrice) || 0, Number(filters.maxPrice) || Infinity);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
    }
    return list;
  })();

  // Toggle bookmark in DB
  async function handleSaveToggle(id) {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await toggleSaveProperty(id);
      setSavedIds(res.data.savedProperties || []);
    } catch (err) {
      console.warn('Failed to toggle save property:', err.message);
    }
  }

  function applyFilters() { 
    setFilterOpen(false); 
    fetchProperties(); 
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <Navbar />
      <div style={{ padding: '5.5rem 2rem 3rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="label" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>{filtered.length} Listings</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,5vw,3.5rem)', color: 'var(--cream)', marginBottom: '2rem', letterSpacing: '-0.03em' }}>
            BROWSE HOMES
          </h1>
        </motion.div>

        {/* Search + Filter row */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem',
            background: 'var(--bg-card)', border: '1px solid var(--border-hover)',
            borderRadius: '9999px', padding: '0.6rem 1rem',
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input id="browse-search" type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or city…"
              style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, color: 'var(--cream)', fontSize: '0.875rem' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>}
          </div>
          <button id="filter-toggle-btn" onClick={() => setFilterOpen(!filterOpen)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '9999px', padding: '0.6rem 1.1rem', whiteSpace: 'nowrap' }}>
            <SlidersHorizontal size={15} /> Filters
          </button>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div id="filter-panel"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: '1.5rem' }}
            >
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hover)', borderRadius: '12px', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>
                {[
                  { id: 'f-min', label: 'Min Price (₹)', name: 'minPrice', ph: '4500000' },
                  { id: 'f-max', label: 'Max Price (₹)', name: 'maxPrice', ph: '25000000' },
                  { id: 'f-loc', label: 'Location',      name: 'location', ph: 'Hyderabad' },
                ].map(f => (
                  <div key={f.name}>
                    <label htmlFor={f.id} className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>{f.label}</label>
                    <input id={f.id} className="input-field" type="text" name={f.name} value={filters[f.name]}
                      onChange={e => setFilters(p => ({ ...p, [e.target.name]: e.target.value }))} placeholder={f.ph} />
                  </div>
                ))}
                <div>
                  <p className="label" style={{ marginBottom: '0.5rem' }}>BHK</p>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {['', '1', '2', '3'].map(b => (
                      <button key={b} id={`bhk-${b || 'all'}`} onClick={() => setFilters(p => ({ ...p, bhk: b }))}
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-hover)', background: filters.bhk === b ? 'var(--accent)' : 'var(--bg-page)', color: 'var(--cream)', cursor: 'pointer', fontSize: '0.8rem', transition: 'background 0.15s' }}>
                        {b || 'All'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <button id="filter-apply" onClick={applyFilters} className="btn-rose" style={{ flex: 1, justifyContent: 'center', borderRadius: '8px' }}>Apply</button>
                  <button id="filter-reset" onClick={() => { setFilters({ minPrice: '', maxPrice: '', bhk: '', location: '' }); fetchProperties(); setFilterOpen(false); }}
                    className="btn-ghost" style={{ flex: 1, justifyContent: 'center', borderRadius: '8px' }}>Reset</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--accent)' }}>
            <p>{error}</p>
            <button onClick={fetchProperties} className="btn-ghost" style={{ marginTop: '1rem', borderRadius: '8px' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No properties match your search.</div>
        ) : (
          <PropertyGrid properties={filtered} onCardClick={setSelectedProp} savedIds={savedIds} onSaveToggle={handleSaveToggle} />
        )}
      </div>

      {selectedProp && <PropertyModal property={selectedProp} onClose={() => setSelectedProp(null)} />}
    </div>
  );
}
