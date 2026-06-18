// What this file does: admin dashboard page with property overview, user leads list, image carousels, global search, and detailed lead negotiation metrics
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Routes, Route, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart2, Phone, ArrowLeft, ChevronRight, User, TrendingUp, Search, ShieldCheck } from 'lucide-react';
import api from '../../api/axios';
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


// ─── Call Record helpers ───
function MaskedPhone({ phone }) {
  const [revealed, setRevealed] = useState(false);
  if (!phone) return <span>—</span>;
  
  const masked = phone.length > 7 ? `${phone.slice(0, 3)} ****** ${phone.slice(-4)}` : phone;
  
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <span>{revealed ? phone : masked}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setRevealed(!revealed);
        }}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '0.65rem',
          color: 'var(--silver)',
          cursor: 'pointer',
          fontFamily: 'var(--font-label)',
          outline: 'none'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--emerald-dim)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function getDuration(startedAt, endedAt) {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const diffMs = end - start;
  if (diffMs < 0) return '0s';
  const diffSecs = Math.floor(diffMs / 1000);
  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function statusBadge(status) {
  switch (status) {
    case 'in-progress':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'rgba(52,216,196,0.12)',
          color: 'var(--emerald-lit)',
          border: '1px solid rgba(52,216,196,0.3)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.68rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          fontFamily: 'var(--font-label)',
        }}>
          <span className="pulse-dot" style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#34D8C4',
            display: 'inline-block'
          }} />
          IN PROGRESS
        </span>
      );
    case 'completed':
      return (
        <span style={{
          display: 'inline-block',
          background: 'rgba(16,185,129,0.12)',
          color: 'var(--emerald)',
          border: '1px solid rgba(16,185,129,0.3)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.68rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          fontFamily: 'var(--font-label)',
        }}>
          COMPLETED
        </span>
      );
    case 'failed':
      return (
        <span style={{
          display: 'inline-block',
          background: 'rgba(239,68,68,0.12)',
          color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.3)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.68rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          fontFamily: 'var(--font-label)',
        }}>
          FAILED
        </span>
      );
    case 'initiated':
    default:
      return (
        <span style={{
          display: 'inline-block',
          background: 'rgba(240,244,248,0.08)',
          color: 'var(--text-secondary)',
          border: '1px solid rgba(240,244,248,0.15)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.68rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          fontFamily: 'var(--font-label)',
        }}>
          INITIATED
        </span>
      );
  }
}

// ─── Dashboard Home: toggleable Properties vs Leads vs Calls overview ───
function DashboardHome({ search }) {
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('leads'); // 'leads', 'properties', or 'calls'
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [callsData, setCallsData] = useState({ calls: [], totalPages: 1, totalCalls: 0 });
  const [callsPage, setCallsPage] = useState(1);
  const [callsLoading, setCallsLoading] = useState(false);

  const [expandedCallSid, setExpandedCallSid] = useState(null);
  const [expandedCallDetails, setExpandedCallDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchCalls = (showLoading = false) => {
    if (showLoading) setCallsLoading(true);
    const token = localStorage.getItem('atlas_admin_token');
    api.get(`/api/admin/calls?page=${callsPage}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setCallsData(res.data);
      })
      .catch(console.error)
      .finally(() => {
        if (showLoading) setCallsLoading(false);
      });
  };

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

  useEffect(() => {
    if (activeTab === 'calls') {
      fetchCalls(true);
    }
  }, [activeTab, callsPage]);

  // Poll for calls list updates
  useEffect(() => {
    let interval;
    if (activeTab === 'calls') {
      interval = setInterval(() => {
        fetchCalls(false);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeTab, callsPage]);

  // Handle row click to toggle expansion
  const handleRowClick = (callSid) => {
    if (expandedCallSid === callSid) {
      setExpandedCallSid(null);
      setExpandedCallDetails(null);
    } else {
      setExpandedCallSid(callSid);
      setExpandedCallDetails(null);
      setDetailsLoading(true);
      const token = localStorage.getItem('atlas_admin_token');
      api.get(`/api/admin/calls/${callSid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setExpandedCallDetails(res.data);
        })
        .catch(console.error)
        .finally(() => setDetailsLoading(false));
    }
  };

  // Poll details for expanded active call (if it's in-progress or initiated)
  useEffect(() => {
    let interval;
    if (expandedCallSid && expandedCallDetails && (expandedCallDetails.status === 'in-progress' || expandedCallDetails.status === 'initiated')) {
      interval = setInterval(() => {
        const token = localStorage.getItem('atlas_admin_token');
        api.get(`/api/admin/calls/${expandedCallSid}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => {
            setExpandedCallDetails(res.data);
          })
          .catch(console.error);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [expandedCallSid, expandedCallDetails?.status]);

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

  const filteredCalls = (callsData.calls || []).filter(c => 
    c.callerPhone?.toLowerCase().includes(search.toLowerCase()) ||
    c.propertyId?.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.propertyId?.location?.toLowerCase().includes(search.toLowerCase()) ||
    c.callSid?.toLowerCase().includes(search.toLowerCase()) ||
    c.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Sub-Header & Tab Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--cream)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
            {activeTab === 'leads' ? 'INTERESTED USER LEADS' : activeTab === 'properties' ? 'PROPERTY INVENTORY' : 'LIVE VOICE CALL RECORDS'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            {activeTab === 'leads' 
              ? 'Real-time prospective homebuyer leads with bargaining details & conversational intent.'
              : activeTab === 'properties'
              ? 'List of seeded property listings and caller analytics.'
              : 'Log of real-time voice calls connected through Twilio with full live conversational transcripts.'}
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
            PROPERTY INVENTORY ({filteredProperties.length})
          </button>
          <button 
            onClick={() => setActiveTab('calls')}
            style={{
              padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', fontSize: '0.78rem',
              fontFamily: 'var(--font-label)', letterSpacing: '0.05em', cursor: 'pointer',
              background: activeTab === 'calls' ? 'var(--emerald)' : 'transparent',
              color: activeTab === 'calls' ? 'var(--void)' : 'var(--text-muted)',
              fontWeight: 600, transition: 'all 0.25s'
            }}
          >
            CALL RECORDS
          </button>
        </div>
      </div>

      {loading || (activeTab === 'calls' && callsLoading) ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>
      ) : activeTab === 'leads' ? (
        // Grid of individual leads
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
      ) : activeTab === 'properties' ? (
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
      ) : (
        // Call Records List / Table (expanded details inline)
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
          <style>{`
            @keyframes live-pulse {
              0% { opacity: 0.4; }
              50% { opacity: 1; }
              100% { opacity: 0.4; }
            }
            .pulse-dot {
              animation: live-pulse 1.5s infinite;
            }
          `}</style>
          {filteredCalls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No matching call records found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Property</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Caller Phone</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Time</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((call) => {
                    const isExpanded = expandedCallSid === call.callSid;
                    return (
                      <optgroup key={call.callSid} label="" style={{ display: 'table-row-group' }}>
                        <tr 
                          onClick={() => handleRowClick(call.callSid)}
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.03)', 
                            cursor: 'pointer',
                            background: isExpanded ? 'rgba(255,255,255,0.01)' : 'transparent',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = isExpanded ? 'rgba(255,255,255,0.01)' : 'transparent'}
                        >
                          <td style={{ padding: '1rem', color: 'var(--cream)', fontWeight: 500, fontSize: '0.88rem' }}>
                            <div>{call.propertyId?.title || 'Unknown Property'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.15rem' }}>{call.propertyId?.location || '—'}</div>
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--silver)', fontSize: '0.85rem' }}>
                            <MaskedPhone phone={call.callerPhone} />
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {statusBadge(call.status)}
                          </td>
                          <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            {new Date(call.startedAt).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <button
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--emerald)',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                fontFamily: 'var(--font-label)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                outline: 'none'
                              }}
                            >
                              {isExpanded ? 'Collapse ▲' : 'View Details ▼'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} style={{ padding: '1.5rem', background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                                {/* Left Side: Metadata */}
                                <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '2rem' }}>
                                  <h4 style={{ color: 'var(--emerald)', fontSize: '0.8rem', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Call Metadata</h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Call SID:</span>
                                      <span style={{ color: 'var(--cream)', wordBreak: 'break-all', maxWidth: '65%', textAlign: 'right' }}>{call.callSid}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Stream SID:</span>
                                      <span style={{ color: 'var(--cream)', wordBreak: 'break-all', maxWidth: '65%', textAlign: 'right' }}>{call.streamSid}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                                      <span style={{ color: 'var(--cream)' }}>{getDuration(call.startedAt, call.endedAt)}</span>
                                    </div>
                                    {call.endedAt && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Ended At:</span>
                                        <span style={{ color: 'var(--cream)' }}>{new Date(call.endedAt).toLocaleTimeString('en-IN')}</span>
                                      </div>
                                    )}
                                    <div style={{ marginTop: '1rem' }}>
                                      <Link
                                        to={`/property/${call.propertyId?._id}`}
                                        style={{
                                          display: 'inline-block',
                                          color: 'var(--emerald)',
                                          textDecoration: 'none',
                                          fontSize: '0.78rem',
                                          fontFamily: 'var(--font-label)',
                                          border: '1px solid rgba(16,185,129,0.3)',
                                          borderRadius: '4px',
                                          padding: '4px 10px',
                                          background: 'rgba(16,185,129,0.05)'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--emerald-dim)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.05)'}
                                      >
                                        View Public Property Page →
                                      </Link>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Transcript bubbles */}
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4 style={{ color: 'var(--emerald)', fontSize: '0.8rem', fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      Conversation Transcript
                                    </h4>
                                    {(call.status === 'in-progress' || call.status === 'initiated') && (
                                      <span style={{
                                        fontSize: '0.7rem',
                                        color: 'var(--emerald-lit)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontFamily: 'var(--font-label)'
                                      }}>
                                        <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D8C4' }} />
                                        LIVE TRANSCRIBING...
                                      </span>
                                    )}
                                  </div>

                                  {detailsLoading && !expandedCallDetails ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" style={{ width: '24px', height: '24px' }} /></div>
                                  ) : (
                                    <div style={{ 
                                      maxHeight: '300px', 
                                      overflowY: 'auto', 
                                      paddingRight: '0.5rem', 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      gap: '0.65rem' 
                                    }}>
                                      {expandedCallDetails?.transcript && expandedCallDetails.transcript.length > 0 ? (
                                        expandedCallDetails.transcript.map((msg, mIdx) => (
                                          <div 
                                            key={mIdx} 
                                            style={{ 
                                              display: 'flex', 
                                              justifyContent: msg.speaker === 'caller' ? 'flex-end' : 'flex-start' 
                                            }}
                                          >
                                            <div style={{
                                              maxWidth: '80%',
                                              padding: '0.5rem 0.85rem',
                                              borderRadius: msg.speaker === 'caller' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                              background: msg.speaker === 'caller' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                                              color: 'var(--cream)',
                                              fontSize: '0.8rem',
                                              lineHeight: 1.45,
                                              border: msg.speaker === 'caller' ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--border)',
                                            }}>
                                              <span style={{ 
                                                display: 'block', 
                                                fontSize: '0.6rem', 
                                                color: 'var(--text-muted)', 
                                                marginBottom: '0.15rem', 
                                                fontFamily: 'var(--font-label)', 
                                                letterSpacing: '0.05em' 
                                              }}>
                                                {msg.speaker === 'caller' ? 'CALLER' : 'ATLAS AGENT'}
                                              </span>
                                              {msg.text}
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                                          No transcript available yet.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </optgroup>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {callsData.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing page {callsData.page} of {callsData.totalPages} ({callsData.totalCalls} total calls)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  disabled={callsPage === 1}
                  onClick={() => setCallsPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: callsPage === 1 ? 'transparent' : 'rgba(255,255,255,0.03)',
                    color: callsPage === 1 ? 'var(--text-muted)' : 'var(--cream)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-label)',
                    cursor: callsPage === 1 ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={e => { if (callsPage > 1) e.currentTarget.style.borderColor = 'var(--emerald)'; }}
                  onMouseLeave={e => { if (callsPage > 1) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  Previous
                </button>
                <button
                  disabled={callsPage === callsData.totalPages}
                  onClick={() => setCallsPage(prev => Math.min(prev + 1, callsData.totalPages))}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: callsPage === callsData.totalPages ? 'transparent' : 'rgba(255,255,255,0.03)',
                    color: callsPage === callsData.totalPages ? 'var(--text-muted)' : 'var(--cream)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-label)',
                    cursor: callsPage === callsData.totalPages ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={e => { if (callsPage < callsData.totalPages) e.currentTarget.style.borderColor = 'var(--emerald)'; }}
                  onMouseLeave={e => { if (callsPage < callsData.totalPages) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
          <Route path="property/:propId"      element={<PropertyEnquiries />} />
          <Route path="enquiry/:enquiryId"    element={<CallDetail />} />
        </Routes>
      </div>
    </div>
  );
}
