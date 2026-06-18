// What this file does: admin dashboard page with property overview, user leads list, image carousels, global search, and detailed lead negotiation metrics
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Routes, Route, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart2, Phone, ArrowLeft, ChevronRight, User, TrendingUp, Search, ShieldCheck } from 'lucide-react';
import api from '../../api/axios';
import AddPropertyPage from './AddPropertyPage';
import { getImageUrl } from '../../utils/imageUrl';

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

// ─── Image Carousel Component ───
function ImageCarousel({ images, alt }) {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div style={{ height: '180px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No Images Available
      </div>
    );
  }

  function handlePrev(e) {
    e.stopPropagation();
    setIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }

  function handleNext(e) {
    e.stopPropagation();
    setIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  }

  return (
    <div style={{ height: '180px', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
      <img
        src={getImageUrl(images[index])}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(10,14,13,0.7)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--emerald)', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s', zIndex: 5
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--emerald)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,14,13,0.7)'}
          >
            ‹
          </button>
          <button
            onClick={handleNext}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(10,14,13,0.7)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--emerald)', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s', zIndex: 5
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--emerald)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,14,13,0.7)'}
          >
            ›
          </button>
          <div style={{
            position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(10,14,13,0.85)', border: '1px solid rgba(16,185,129,0.15)',
            padding: '2px 10px', borderRadius: '20px',
            fontSize: '0.65rem', color: 'var(--cream)', fontFamily: 'var(--font-label)', letterSpacing: '0.05em'
          }}>
            {index + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dashboard Home: toggleable Properties vs Leads overview ───
function DashboardHome({ search }) {
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' or 'properties'
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminGet('/api/admin/properties'),
      adminGet('/api/admin/enquiries')
    ])
      .then(([propsRes, enquiriesRes]) => {
        setProperties(propsRes.data);
        setLeads(enquiriesRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter listings based on global search parameter
  const filteredProperties = properties.filter(p => 
    p.title?.toLowerCase().includes(search.toLowerCase()) || 
    p.location?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLeads = leads.filter(l => 
    l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.property?.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.property?.location?.toLowerCase().includes(search.toLowerCase()) ||
    (l.user?._id && String(l.user._id).includes(search))
  );

  return (
    <div>
      {/* Sub-Header & Tab Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--cream)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
            {activeTab === 'leads' ? 'INTERESTED USER LEADS' : 'PROPERTY INVENTORY'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            {activeTab === 'leads' 
              ? 'Real-time prospective homebuyer leads with bargaining details & conversational intent.'
              : 'List of seeded property listings and caller analytics.'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setActiveTab('leads')}
            style={{
              padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', fontSize: '0.78rem',
              fontFamily: 'var(--font-label)', letterSpacing: '0.05em', cursor: 'pointer',
              background: activeTab === 'leads' ? 'var(--emerald)' : 'transparent',
              color: activeTab === 'leads' ? 'var(--void)' : 'var(--text-muted)',
              fontWeight: 600, transition: 'all 0.25s'
            }}
          >
            USER LEADS ({filteredLeads.length})
          </button>
          <button 
            onClick={() => setActiveTab('properties')}
            style={{
              padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', fontSize: '0.78rem',
              fontFamily: 'var(--font-label)', letterSpacing: '0.05em', cursor: 'pointer',
              background: activeTab === 'properties' ? 'var(--emerald)' : 'transparent',
              color: activeTab === 'properties' ? 'var(--void)' : 'var(--text-muted)',
              fontWeight: 600, transition: 'all 0.25s'
            }}
          >
            PROPERTIES ({filteredProperties.length})
          </button>
          {activeTab === 'properties' && (
            <div style={{ marginLeft: '1rem' }}>
              <button onClick={() => navigate('add')} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', background: 'var(--rose)', color: 'white' }}>
                + Add Property
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>
      ) : activeTab === 'leads' ? (
        // Grid of individual leads (Task 6 requirement)
        filteredLeads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            No matching leads found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {filteredLeads.map(lead => (
              <motion.div
                key={lead._id}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/admin/dashboard/enquiry/${lead._id}`)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column'
                }}
              >
                {/* Embedded Property Images Carousel inside Lead Card */}
                <ImageCarousel images={lead.property?.images} alt={lead.property?.title} />

                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-label)', color: 'var(--accent)', letterSpacing: '0.05em', background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                        INTENT: {lead.intentScore}%
                      </span>
                      <span className={`badge ${lead.status === 'interested' ? 'badge-rose' : 'badge-slate'}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                        {lead.status}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '0.92rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '0.2rem' }}>
                      {lead.property?.title || 'Unknown Property'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                      {lead.property?.location}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--cream)', fontWeight: 500 }}>
                      👤 {lead.user?.name || 'Anonymous Guest'}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem', wordBreak: 'break-all' }}>
                      ID: {lead.user?._id || 'guest_user'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        // Grid of properties
        filteredProperties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            No matching properties found.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filteredProperties.map(p => (
              <motion.div
                key={p._id}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/admin/dashboard/property/${p._id}`)}
                className="card"
                style={{ cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}
              >
                <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={getImageUrl(p.images?.[0])}
                    alt={p.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
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
        )
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

// ─── Call Detail Sheet with Negotiation Tracker ───
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
  if (!enquiry) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Lead not found.</div>;

  // Calculate discount percentage if bargaining occurred
  const original = enquiry.originalPrice || enquiry.property?.price || 0;
  const offered = enquiry.offeredPrice || enquiry.finalPriceAsked || original;
  const agreed = enquiry.finalAgreedPrice || original;
  
  const discountAmount = original - agreed;
  const discountPercent = original > 0 ? ((discountAmount / original) * 100).toFixed(1) : 0;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-label)', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
        <ArrowLeft size={16} /> BACK TO LIST
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* LEFT: Caller Info & Transcript */}
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--cream)', marginBottom: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>USER DETAILS</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <InfoRow label="Username"    value={enquiry.user?.name     || 'Anonymous Guest'} />
              <InfoRow label="User ID"     value={enquiry.user?._id      || 'Guest (Unauthenticated)'} />
              <InfoRow label="Email"       value={enquiry.user?.email    || '—'} />
              <InfoRow label="Phone"       value={enquiry.user?.phone    || '—'} />
              <InfoRow label="Captured At" value={new Date(enquiry.createdAt).toLocaleString('en-IN')} />
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--cream)', marginBottom: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>PROPERTY INTERESTED</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <InfoRow label="Property Name" value={enquiry.property?.title || '—'} />
              <InfoRow label="Location"      value={enquiry.property?.location || '—'} />
              <InfoRow label="Listed Price"  value={formatPrice(original)} />
            </div>
          </div>

          {/* Transcript bubble sheet */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--cream)', marginBottom: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>AI CONVERSATION HISTORY</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto' }}>
              {enquiry.transcript?.length > 0 ? enquiry.transcript.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth:     '85%',
                    padding:      '0.6rem 1rem',
                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background:   msg.role === 'user' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                    color:        'var(--cream)',
                    fontSize:     '0.82rem',
                    lineHeight:   1.5,
                    border:       msg.role === 'user' ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)',
                  }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontFamily: 'var(--font-label)', letterSpacing: '0.05em' }}>
                      {msg.role === 'user' ? 'USER' : 'ATLAS VOICE AGENT'}
                    </span>
                    {msg.text}
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No audio transcript record found.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Intent & Negotiation Pricing Panel */}
        <div>
          <div style={{
            background:   `linear-gradient(135deg, rgba(16,185,129,0.05), var(--bg-card))`,
            border:       '1px solid var(--border)',
            borderRadius: '12px',
            padding:      '2rem',
            marginBottom: '1.5rem',
            textAlign:    'center',
          }}>
            <p className="label" style={{ color: 'var(--accent)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>LEAD BUYING INTENT</p>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '4.5rem', fontWeight: 700, color: enquiry.intentScore >= 60 ? 'var(--emerald)' : 'var(--text-muted)' }}>
              {enquiry.intentScore}%
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Probability of conversion</div>

            <div style={{ marginTop: '1.25rem' }}>
              <span className={`badge ${enquiry.status === 'interested' ? 'badge-rose' : 'badge-slate'}`} style={{ fontSize: '0.8rem', letterSpacing: '0.08em', padding: '4px 12px' }}>
                {enquiry.status === 'interested' ? '🔥 Interested Lead' : '⏳ Review Pending'}
              </span>
            </div>
          </div>

          {/* Pricing Quote & Negotiation tracking */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--cream)', marginBottom: '1.2rem', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>NEGOTIATION SUMMARY</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>Original price</span>
                <span style={{ fontSize: '0.88rem', color: 'var(--cream)', fontWeight: 600 }}>{formatPrice(original)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>Offered price (User Bargain)</span>
                <span style={{ fontSize: '0.88rem', color: 'var(--accent)', fontWeight: 600 }}>{formatPrice(offered)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>Final agreed price</span>
                <span style={{ fontSize: '0.88rem', color: 'var(--cream)', fontWeight: 600 }}>{formatPrice(agreed)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.83rem', color: 'var(--accent)' }}>Negotiated Discount</span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--accent)', fontWeight: 600 }}>
                    {formatPrice(discountAmount)} ({discountPercent}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', fontSize: '0.83rem' }}>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-label)', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color: 'var(--cream)', fontWeight: 500, textAlign: 'right', wordBreak: 'break-all', maxWidth: '70%' }}>{value}</span>
    </div>
  );
}

// ─── Main Admin Wrapper ───
export default function AdminDashboardPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const adminToken = localStorage.getItem('atlas_admin_token');

  useEffect(() => {
    if (!adminToken) navigate('/admin/login');
  }, [adminToken, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* ─── Premium Admin Header (ATLAS | Search Bar | Admin Profile) ─── */}
      <nav style={{
        position:        'fixed',
        top:             0, left: 0, right: 0,
        zIndex:          1000,
        background:      'rgba(10,14,13,0.85)',
        backdropFilter:  'blur(16px)',
        borderBottom:    '1px solid var(--border)',
        height:          '64px',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 2rem',
      }}>
        {/* Logo Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <ShieldCheck size={20} color="var(--emerald)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--cream)', letterSpacing: '0.05em' }}>
            ATLAS ADMIN
          </span>
        </div>

        {/* Global Search Bar (Task 4 requirement) */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px', margin: '0 2rem' }}>
          <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1, display: 'flex' }}>
            <Search size={15} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads, users, locations..."
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '0.45rem 1rem 0.45rem 2.2rem',
              color: 'var(--cream)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.82rem',
              outline: 'none',
              transition: 'all 0.25s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Nav Links & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/admin/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.78rem', fontFamily: 'var(--font-label)', letterSpacing: '0.05em', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--emerald)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            DASHBOARD
          </Link>
          
          {/* Admin Profile indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald)' }} />
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-label)', color: 'var(--cream)', letterSpacing: '0.03em' }}>
              ADMINISTRATOR
            </span>
          </div>

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

      {/* Main Contents Area */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5.5rem 2rem 4rem' }}>
        <Routes>
          <Route index element={<DashboardHome search={search} />} />
          <Route path="add"                   element={<AddPropertyPage />} />
          <Route path="property/:propId"      element={<PropertyEnquiries />} />
          <Route path="enquiry/:enquiryId"    element={<CallDetail />} />
        </Routes>
      </div>
    </div>
  );
}
