// What this file does: Browse page with search bar, filter panel, staggered property grid — v2 palette
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import PropertyCard from '../components/PropertyCard';
import PropertyModal from '../components/PropertyModal';
import { getProperties } from '../api/propertyApi';
import { binarySearchByPrice } from '../utils/binarySearch';

export default function Browse() {
  const [properties,   setProperties]   = useState([]);
  const [loading,      setLoading]       = useState(true);
  const [error,        setError]         = useState('');
  const [search,       setSearch]        = useState('');
  const [filterOpen,   setFilterOpen]    = useState(false);
  const [selectedProp, setSelectedProp]  = useState(null);
  const [savedIds,     setSavedIds]      = useState([]);
  const [filters,      setFilters]       = useState({ minPrice: '', maxPrice: '', bhk: '', location: '' });

  // Fetches properties on mount
  useEffect(() => { fetchProperties(); }, []);

  // Builds query params from current filters and fetches from backend
  async function fetchProperties() {
    setLoading(true);
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

  // Client-side price filter using binary search + text search
  const filtered = (() => {
    let list = properties;
    // Binary search on sorted-by-price list for price range
    if (filters.minPrice || filters.maxPrice) {
      const sorted = [...list].sort((a, b) => a.price - b.price);
      list = binarySearchByPrice(sorted, Number(filters.minPrice) || 0, Number(filters.maxPrice) || Infinity);
    }
    // Text search on title + location
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
    }
    return list;
  })();

  function handleSaveToggle(id) {
    setSavedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function applyFilters() { setFilterOpen(false); fetchProperties(); }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)' }}>
      <Navbar />
      <div style={{ padding: '5.5rem 2rem 3rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="label" style={{ color: 'var(--rose)', marginBottom: '0.5rem' }}>{filtered.length} Listings</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,5vw,3.5rem)', color: 'var(--pale)', marginBottom: '2rem' }}>
            BROWSE HOMES
          </h1>
        </motion.div>

        {/* Search + Filter row */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem',
            background: 'var(--base)', border: '1px solid var(--slate)',
            borderRadius: '9999px', padding: '0.6rem 1rem',
          }}>
            <Search size={16} color="var(--muted)" />
            <input id="browse-search" type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or city…"
              style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, color: 'var(--pale)', fontSize: '0.875rem' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={14} /></button>}
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
              <div style={{ background: 'var(--base)', border: '1px solid var(--slate)', borderRadius: '12px', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>
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
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid var(--slate)', background: filters.bhk === b ? 'var(--rose)' : 'var(--void)', color: 'var(--pale)', cursor: 'pointer', fontSize: '0.8rem', transition: 'background 0.15s' }}>
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
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--rose)' }}>
            <p>{error}</p>
            <button onClick={fetchProperties} className="btn-ghost" style={{ marginTop: '1rem', borderRadius: '8px' }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)' }}>No properties match your search.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.25rem' }}>
            {filtered.map((p, i) => (
              <motion.div key={p._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <PropertyCard property={p} onClick={setSelectedProp} savedIds={savedIds} onSaveToggle={handleSaveToggle} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {selectedProp && <PropertyModal property={selectedProp} onClose={() => setSelectedProp(null)} />}
    </div>
  );
}
