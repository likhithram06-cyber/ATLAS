// What this file does: admin dashboard — shows all properties with call counts, enquiry drill-down, and call detail view
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Routes, Route, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart2, Phone, ArrowLeft, ChevronRight, User, Calendar, TrendingUp } from 'lucide-react';
import api from '../api/axios';

// Formats price to Indian notation
function formatPrice(price) {
  if (!price) return '—';
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000)   return `₹${(price / 100000).toFixed(0)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

// Shared admin API helper: includes adminToken in Authorization header
async function adminGet(path) {
  const token = localStorage.getItem('atlas_admin_token');
  return api.get(path, { headers: { Authorization: `Bearer ${token}` } });
}

// ─── Dashboard Home: list of properties with enquiry counts ──────────────
function DashboardHome() {
  const [properties, setProperties] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const navigate = useNavigate();

  // Fetches all properties with their enquiry counts from admin API
  useEffect(() => {
    adminGet('/api/admin/properties')
      .then(res => setProperties(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <p className="font-label" style={{ color: 'var(--dusty-rose)', fontSize: '0.72rem', marginBottom: '0.6rem' }}>Admin Panel</p>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)' }}>Property Overview</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>Click a property to see caller leads sorted by intent score.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading properties…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1.5rem' }}>
          {properties.map(p => (
            <motion.div
              key={p._id}
              id={`admin-prop-${p._id}`}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/admin/property/${p._id}`)}
              className="card"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600'}
                  alt={p.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Call count badge */}
                <div style={{
                  position:   'absolute',
                  top:        '0.75rem',
                  right:      '0.75rem',
                  background: p.enquiryCount > 0 ? 'var(--burgundy)' : 'var(--storm)',
                  borderRadius: '20px',
                  padding:    '0.2rem 0.7rem',
                  fontSize:   '0.75rem',
                  fontFamily: 'var(--font-label)',
                  color:      'white',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '0.3rem',
                }}>
                  <Phone size={11} /> {p.enquiryCount} Calls
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>{p.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.location} · {formatPrice(p.price)}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.8rem' }}>
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

// ─── Property Enquiries: list of callers sorted by intent score (max-heap) ─
function PropertyEnquiries() {
  const { propId } = useParams();
  const [enquiries, setEnquiries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const navigate = useNavigate();

  // Fetches enquiries for this property — sorted by max-heap on backend
  useEffect(() => {
    adminGet(`/api/admin/property/${propId}`)
      .then(res => setEnquiries(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [propId]);

  return (
    <div>
      <button onClick={() => navigate('/admin/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-label)', fontSize: '0.75rem' }}>
        <ArrowLeft size={16} /> All Properties
      </button>

      <h1 style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>Caller Leads</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Sorted by intent score (highest first) — powered by Max-Heap
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading leads…</div>
      ) : enquiries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No calls recorded yet for this property.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {enquiries.map((e, i) => (
            <motion.div
              key={e._id}
              id={`enquiry-row-${e._id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/admin/enquiry/${e._id}`)}
              style={{
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'space-between',
                padding:      '1rem 1.5rem',
                background:   'var(--bg-card)',
                border:       '1px solid var(--border)',
                borderRadius: '10px',
                cursor:       'pointer',
                transition:   'background 0.2s, border-color 0.2s',
              }}
              whileHover={{ borderColor: 'var(--dusty-rose)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width:  '40px', height: '40px',
                  background: 'rgba(107,30,42,0.15)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={18} color="var(--dusty-rose)" />
                </div>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                    {e.user?.name || 'Anonymous Caller'}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {e.user?.phone || '—'}  ·  {new Date(e.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Intent score badge */}
                <div style={{
                  padding:      '0.25rem 0.75rem',
                  borderRadius: '20px',
                  background:   e.intentScore >= 60 ? 'rgba(107,30,42,0.3)' : 'rgba(80,96,112,0.3)',
                  border:       `1px solid ${e.intentScore >= 60 ? 'var(--burgundy)' : 'var(--storm)'}`,
                  color:        e.intentScore >= 60 ? 'var(--blush)' : 'var(--slate)',
                  fontSize:     '0.8rem',
                  fontFamily:   'var(--font-label)',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.3rem',
                }}>
                  <TrendingUp size={12} /> {e.intentScore}%
                </div>

                {/* Status badge */}
                <span className={`badge ${e.status === 'interested' ? 'badge-burgundy' : 'badge-storm'}`}>
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

// ─── Call Detail: full transcript + intent breakdown ──────────────────────
function CallDetail() {
  const { enquiryId } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetches full enquiry detail including transcript and intent breakdown
  useEffect(() => {
    adminGet(`/api/admin/enquiry/${enquiryId}`)
      .then(res => setEnquiry(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [enquiryId]);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading call details…</div>;
  if (!enquiry) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Enquiry not found.</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-label)', fontSize: '0.75rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* ── Left: Caller Info + Transcript ── */}
        <div>
          {/* Caller info card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Caller Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <InfoRow label="Name"     value={enquiry.user?.name     || 'Anonymous'} />
              <InfoRow label="Phone"    value={enquiry.user?.phone    || '—'} />
              <InfoRow label="Email"    value={enquiry.user?.email    || '—'} />
              <InfoRow label="Property" value={enquiry.property?.title || '—'} />
              <InfoRow label="Date"     value={new Date(enquiry.createdAt).toLocaleString('en-IN')} />
            </div>
          </div>

          {/* Transcript */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Conversation Transcript</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto' }}>
              {enquiry.transcript?.length > 0 ? enquiry.transcript.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth:     '80%',
                    padding:      '0.6rem 1rem',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background:   msg.role === 'user' ? 'var(--blush)' : 'var(--bg-primary)',
                    color:        msg.role === 'user' ? 'var(--ink)' : 'var(--text-primary)',
                    fontSize:     '0.82rem',
                    lineHeight:   1.5,
                    border:       msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.2rem', fontFamily: 'var(--font-label)' }}>
                      {msg.role === 'user' ? 'Caller' : 'ATLAS AI'}
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

        {/* ── Right: Intent Analysis ── */}
        <div>
          {/* Overall score */}
          <div style={{
            background:   `linear-gradient(135deg, rgba(107,30,42,0.2), rgba(26,33,48,1))`,
            border:       '1px solid var(--burgundy)',
            borderRadius: '12px',
            padding:      '1.5rem',
            marginBottom: '1.5rem',
            textAlign:    'center',
          }}>
            <p className="font-label" style={{ color: 'var(--dusty-rose)', fontSize: '0.72rem', marginBottom: '0.5rem' }}>Intent Score</p>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', fontWeight: 700, color: enquiry.intentScore >= 60 ? 'var(--blush)' : 'var(--slate)' }}>
              {enquiry.intentScore}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>out of 100</div>

            {/* Status */}
            <div style={{ marginTop: '1rem' }}>
              <span className={`badge ${enquiry.status === 'interested' ? 'badge-burgundy' : 'badge-storm'}`} style={{ fontSize: '0.8rem' }}>
                {enquiry.status === 'interested' ? '🔥 Interested' : enquiry.status === 'not_interested' ? '❄️ Not Interested' : '⏳ Pending'}
              </span>
            </div>
          </div>

          {/* Intent breakdown */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Score Breakdown</h2>
            {enquiry.intentBreakdown?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {enquiry.intentBreakdown.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>{b.reason}</span>
                    <span style={{ color: 'var(--blush)', fontFamily: 'var(--font-label)', fontSize: '0.8rem' }}>+{b.points}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No specific signals detected.</p>
            )}
          </div>

          {/* Quoted price */}
          {enquiry.quotedPrice > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.7rem' }}>Price Mentioned</h2>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--dusty-rose)' }}>
                {formatPrice(enquiry.quotedPrice)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper: label-value info row
function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'var(--font-label)', minWidth: '70px' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{value}</span>
    </div>
  );
}

// ─── Admin Dashboard Wrapper with nested routing ───────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminToken = localStorage.getItem('atlas_admin_token');

  // Redirect to admin login if no admin token found
  useEffect(() => {
    if (!adminToken) navigate('/admin/login');
  }, [adminToken, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ── Admin Navbar ── */}
      <nav style={{
        position:        'fixed',
        top:             0, left: 0, right: 0,
        zIndex:          1000,
        background:      'rgba(26,33,48,0.9)',
        backdropFilter:  'blur(16px)',
        borderBottom:    '1px solid var(--border)',
        height:          '60px',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <BarChart2 size={20} color="var(--dusty-rose)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--dusty-rose)' }}>
            ATLAS Admin
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/admin/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.78rem', fontFamily: 'var(--font-label)' }}>
            Dashboard
          </Link>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.78rem', fontFamily: 'var(--font-label)' }}>
            View Site
          </Link>
          <button
            id="admin-logout-btn"
            onClick={() => { localStorage.removeItem('atlas_admin_token'); navigate('/admin/login'); }}
            className="btn-ghost"
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.72rem' }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 2rem 4rem' }}>
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="property/:propId"      element={<PropertyEnquiries />} />
          <Route path="enquiry/:enquiryId"    element={<CallDetail />} />
        </Routes>
      </div>
    </div>
  );
}
