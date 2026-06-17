// What this file does: admin dashboard — lists properties with caller counts, lead drill-downs, and intent score sheets
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Routes, Route, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart2, Phone, ArrowLeft, ChevronRight, User, TrendingUp } from 'lucide-react';
import api from '../../api/axios';

function formatPrice(price) {
  if (!price) return '—';
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000)   return `₹${(price / 100000).toFixed(0)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

async function adminGet(path) {
  const token = localStorage.getItem('atlas_admin_token');
  return api.get(path, { headers: { Authorization: `Bearer ${token}` } });
}

// ─── Dashboard Home: list of properties ───
function DashboardHome() {
  const [properties, setProperties] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    adminGet('/api/admin/properties')
      .then(res => setProperties(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="label" style={{ color: 'var(--accent)', fontSize: '0.75rem', marginBottom: '0.6rem' }}>ADMIN PANEL</p>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', color: 'var(--cream)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>PROPERTY OVERVIEW</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>Click a property to see caller leads sorted by intent score (Max-Heap).</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1.5rem' }}>
          {properties.map(p => (
            <motion.div
              key={p._id}
              id={`admin-prop-${p._id}`}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/admin/dashboard/property/${p._id}`)}
              className="card"
              style={{ cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}
            >
              <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600'}
                  alt={p.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Calls Count Badge */}
                <div style={{
                  position:   'absolute',
                  top:        '0.75rem',
                  right:      '0.75rem',
                  background: p.enquiryCount > 0 ? 'var(--accent)' : 'var(--border-hover)',
                  borderRadius: '20px',
                  padding:    '0.25rem 0.75rem',
                  fontSize:   '0.72rem',
                  fontFamily: 'var(--font-label)',
                  color:      'var(--cream)',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '0.3rem',
                  letterSpacing: '0.05em'
                }}>
                  <Phone size={11} /> {p.enquiryCount} CALLS
                </div>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '0.4rem' }}>{p.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.location} · {formatPrice(p.price)}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Property Enquiries list (Max-Heap sorted) ───
function PropertyEnquiries() {
  const { propId } = useParams();
  const [enquiries, setEnquiries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    adminGet(`/api/admin/property/${propId}`)
      .then(res => setEnquiries(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [propId]);

  return (
    <div>
      <button onClick={() => navigate('/admin/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-label)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
        <ArrowLeft size={16} /> ALL PROPERTIES
      </button>

      <h1 style={{ fontSize: '1.8rem', color: 'var(--cream)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>CALLER LEADS</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Sorted by intent score (highest first) — powered by custom Max-Heap
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : enquiries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No calls recorded yet for this property.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {enquiries.map((e, i) => (
            <motion.div
              key={e._id}
              id={`enquiry-row-${e._id}`}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/admin/dashboard/enquiry/${e._id}`)}
              style={{
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'space-between',
                padding:      '1rem 1.5rem',
                background:   'var(--bg-card)',
                border:       '1px solid var(--border)',
                borderRadius: '10px',
                cursor:       'pointer',
                transition:   'all 0.2s',
              }}
              whileHover={{ borderColor: 'var(--accent)', y: -2 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width:  '40px', height: '40px',
                  background: 'rgba(92, 143, 166, 0.15)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={18} color="var(--accent)" />
                </div>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--cream)' }}>
                    {e.user?.name || 'Anonymous Guest'}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                    {e.user?.phone || '—'}  ·  {new Date(e.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Intent score */}
                <div style={{
                  padding:      '0.25rem 0.75rem',
                  borderRadius: '20px',
                  background:   e.intentScore >= 60 ? 'rgba(92, 143, 166, 0.15)' : 'rgba(184, 194, 202, 0.15)',
                  border:       `1px solid ${e.intentScore >= 60 ? 'var(--accent)' : 'var(--border-hover)'}`,
                  color:        e.intentScore >= 60 ? 'var(--cream)' : 'var(--text-muted)',
                  fontSize:     '0.8rem',
                  fontFamily:   'var(--font-label)',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.3rem',
                }}>
                  <TrendingUp size={12} /> {e.intentScore}%
                </div>

                {/* Status */}
                <span className={`badge ${e.status === 'interested' ? 'badge-rose' : 'badge-slate'}`} style={{ letterSpacing: '0.08em', fontSize: '0.72rem' }}>
                  {e.status}
                </span>

                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Call Detail Sheet ───
function CallDetail() {
  const { enquiryId } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    adminGet(`/api/admin/enquiry/${enquiryId}`)
      .then(res => setEnquiry(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [enquiryId]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;
  if (!enquiry) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Enquiry not found.</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-label)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
        <ArrowLeft size={16} /> BACK
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* LEFT: Caller Info & Transcript */}
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--cream)', marginBottom: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>CALLER DETAILS</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <InfoRow label="Name"     value={enquiry.user?.name     || 'Anonymous'} />
              <InfoRow label="Phone"    value={enquiry.user?.phone    || '—'} />
              <InfoRow label="Email"    value={enquiry.user?.email    || '—'} />
              <InfoRow label="Property" value={enquiry.property?.title || '—'} />
              <InfoRow label="Date"     value={new Date(enquiry.createdAt).toLocaleString('en-IN')} />
            </div>
          </div>

          {/* Transcript bubble sheet */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--cream)', marginBottom: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>CONVERSATION TRANSCRIPT</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto' }}>
              {enquiry.transcript?.length > 0 ? enquiry.transcript.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth:     '80%',
                    padding:      '0.6rem 1rem',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background:   msg.role === 'user' ? 'var(--accent)' : 'var(--bg-page)',
                    color:        'var(--cream)',
                    fontSize:     '0.82rem',
                    lineHeight:   1.5,
                    border:       '1px solid var(--border)',
                  }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontFamily: 'var(--font-label)', letterSpacing: '0.05em' }}>
                      {msg.role === 'user' ? 'CALLER' : 'ATLAS Assistant'}
                    </span>
                    {msg.text}
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No transcript recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Intent Analysis */}
        <div>
          <div style={{
            background:   `linear-gradient(135deg, rgba(8, 23, 32, 0.3), var(--bg-card))`,
            border:       '1px solid var(--border)',
            borderRadius: '12px',
            padding:      '2rem',
            marginBottom: '1.5rem',
            textAlign:    'center',
          }}>
            <p className="label" style={{ color: 'var(--accent)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>INTENT SCORE</p>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '4.5rem', fontWeight: 700, color: enquiry.intentScore >= 60 ? 'var(--accent)' : 'var(--text-muted)' }}>
              {enquiry.intentScore}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>out of 100</div>

            <div style={{ marginTop: '1.25rem' }}>
              <span className={`badge ${enquiry.status === 'interested' ? 'badge-rose' : 'badge-slate'}`} style={{ fontSize: '0.8rem', letterSpacing: '0.08em' }}>
                {enquiry.status === 'interested' ? '🔥 Interested' : '⏳ Pending'}
              </span>
            </div>
          </div>

          {/* Pricing Quote */}
          {enquiry.finalPriceAsked > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--cream)', marginBottom: '0.7rem', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>PRICE MENTIONED</h2>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', color: 'var(--accent)' }}>
                {formatPrice(enquiry.finalPriceAsked)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-label)', minWidth: '80px', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color: 'var(--cream)', fontSize: '0.85rem' }}>{value}</span>
    </div>
  );
}

// ─── Main Admin Wrapper ───
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const adminToken = localStorage.getItem('atlas_admin_token');

  useEffect(() => {
    if (!adminToken) navigate('/admin/login');
  }, [adminToken, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Admin Nav */}
      <nav style={{
        position:        'fixed',
        top:             0, left: 0, right: 0,
        zIndex:          1000,
        background:      'rgba(8,23,32,0.85)',
        backdropFilter:  'blur(16px)',
        borderBottom:    '1px solid var(--border)',
        height:          '60px',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <BarChart2 size={20} color="var(--accent)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--cream)', letterSpacing: '0.05em' }}>
            ATLAS ADMIN
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/admin/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.78rem', fontFamily: 'var(--font-label)', letterSpacing: '0.05em' }}>
            DASHBOARD
          </Link>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.78rem', fontFamily: 'var(--font-label)', letterSpacing: '0.05em' }}>
            VIEW SITE
          </Link>
          <button
            id="admin-logout-btn"
            onClick={() => { localStorage.removeItem('atlas_admin_token'); navigate('/admin/login'); }}
            className="btn-ghost"
            style={{ padding: '0.35rem 0.9rem', fontSize: '0.72rem', borderRadius: '9999px' }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Contents */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5.5rem 2rem 4rem' }}>
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="property/:propId"      element={<PropertyEnquiries />} />
          <Route path="enquiry/:enquiryId"    element={<CallDetail />} />
        </Routes>
      </div>
    </div>
  );
}
