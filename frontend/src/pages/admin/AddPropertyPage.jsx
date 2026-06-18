// What this file does: Admin form to add a new property listing with image upload and preview
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Save, ArrowLeft, X, Plus, Home, MapPin, DollarSign, BedDouble, Maximize2, Compass, CalendarDays, FileText } from 'lucide-react';
import { createProperty } from '../../api/propertyApi';

export default function AddPropertyPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    bhk: '',
    sqft: '',
    facing: 'East',
    ageYears: '',
    features: '',
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error,   setError]         = useState('');
  const [toast,   setToast]         = useState('');
  const fileInputRef = useRef();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  function addFiles(files) {
    const valid = files.filter(f => f.type.startsWith('image/')).slice(0, 5 - imageFiles.length);
    if (!valid.length) return;
    setImageFiles(prev => [...prev, ...valid]);
    valid.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
  }

  function removeImage(idx) {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (imageFiles.length === 0) {
      setError('Please upload at least one photo.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      imageFiles.forEach(file => formData.append('images', file));

      await createProperty(formData);
      setToast('✅ Property created successfully!');
      setTimeout(() => navigate('/admin/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0.65rem 0.85rem 0.65rem 2.4rem',
    color: 'var(--cream)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', outline: 'none',
    transition: 'border-color 0.2s', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: '0.72rem', fontFamily: 'var(--font-label)', letterSpacing: '0.05em',
    color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem',
  };
  const iconStyle = {
    position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text-muted)', display: 'flex',
  };

  function Field({ label, name, type = 'text', icon: Icon, required = true, as, rows, options, placeholder }) {
    const focusStyle = { borderColor: 'var(--emerald)' };
    if (as === 'textarea') return (
      <div>
        <label style={labelStyle}>{label}</label>
        <div style={{ position: 'relative' }}>
          <span style={{ ...iconStyle, top: '0.85rem', transform: 'none' }}><Icon size={14} /></span>
          <textarea
            name={name} value={form[name]} onChange={handleChange} required={required} rows={rows || 3}
            placeholder={placeholder}
            style={{ ...inputStyle, paddingLeft: '2.4rem', resize: 'vertical' }}
            onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>
    );
    if (as === 'select') return (
      <div>
        <label style={labelStyle}>{label}</label>
        <div style={{ position: 'relative' }}>
          <span style={iconStyle}><Icon size={14} /></span>
          <select name={name} value={form[name]} onChange={handleChange}
            style={{ ...inputStyle, appearance: 'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          >
            {options.map(o => <option key={o} value={o} style={{ background: '#0a0e0d' }}>{o}</option>)}
          </select>
        </div>
      </div>
    );
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <div style={{ position: 'relative' }}>
          <span style={iconStyle}><Icon size={14} /></span>
          <input
            name={name} type={type} value={form[name]} onChange={handleChange}
            required={required} placeholder={placeholder}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '2rem' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ maxWidth: '700px', margin: '0 auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button type="button" onClick={() => navigate('/admin/dashboard')}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', cursor: 'pointer', fontFamily: 'var(--font-label)', fontSize: '0.72rem', letterSpacing: '0.05em' }}>
            <ArrowLeft size={14} /> BACK
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--cream)', letterSpacing: '0.05em', margin: 0 }}>ADD PROPERTY</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Fill in the details — this listing will go live immediately</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── Photos Upload Section ── */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.5rem' }}>
            <p style={{ ...labelStyle, marginBottom: '1rem', fontSize: '0.78rem' }}>PROPERTY PHOTOS <span style={{ color: 'var(--accent)' }}>*</span> (up to 5)</p>

            {/* Drop zone */}
            <div
              onClick={() => imageFiles.length < 5 && fileInputRef.current.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                border: '2px dashed var(--border-hover)', borderRadius: '10px', padding: '2rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                cursor: imageFiles.length < 5 ? 'pointer' : 'default',
                background: 'rgba(255,255,255,0.01)',
                transition: 'border-color 0.2s',
                marginBottom: previews.length ? '1rem' : 0,
              }}
              onMouseEnter={e => { if (imageFiles.length < 5) e.currentTarget.style.borderColor = 'var(--emerald)'; }}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
            >
              <Camera size={28} color="var(--text-muted)" />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                {imageFiles.length < 5 ? 'Click or drag & drop images here' : 'Maximum 5 photos reached'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>JPG, PNG, WEBP — max 5MB each</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Previews */}
            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                {previews.map((src, idx) => (
                  <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '4/3' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeImage(idx)}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                      <X size={12} />
                    </button>
                    {idx === 0 && (
                      <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'var(--emerald)', color: 'var(--void)', fontSize: '0.6rem', fontFamily: 'var(--font-label)', padding: '1px 5px', borderRadius: '3px' }}>COVER</span>
                    )}
                  </div>
                ))}
                {previews.length < 5 && (
                  <div onClick={() => fileInputRef.current.click()}
                    style={{ borderRadius: '8px', border: '2px dashed var(--border)', aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--emerald)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <Plus size={20} />
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-label)' }}>ADD</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Basic Info ── */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ ...labelStyle, marginBottom: '0.25rem', fontSize: '0.78rem' }}>BASIC INFORMATION</p>
            <Field label="PROPERTY TITLE" name="title" icon={Home} placeholder="e.g. Aurum Residences" />
            <Field label="LOCATION" name="location" icon={MapPin} placeholder="e.g. Banjara Hills, Hyderabad" />
            <Field label="DESCRIPTION" name="description" icon={FileText} as="textarea" rows={3} placeholder="Describe the property…" />
          </div>

          {/* ── Pricing & Specs ── */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.5rem' }}>
            <p style={{ ...labelStyle, marginBottom: '1rem', fontSize: '0.78rem' }}>PRICING & SPECS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="PRICE (₹)" name="price" type="number" icon={DollarSign} placeholder="e.g. 4500000" />
              <Field label="BHK" name="bhk" type="number" icon={BedDouble} placeholder="e.g. 3" />
              <Field label="AREA (SQFT)" name="sqft" type="number" icon={Maximize2} placeholder="e.g. 1500" />
              <Field label="AGE (YEARS)" name="ageYears" type="number" icon={CalendarDays} placeholder="0 = New" />
              <Field label="FACING" name="facing" icon={Compass} as="select" options={['East','West','North','South']} />
            </div>
          </div>

          {/* ── Features ── */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.5rem' }}>
            <p style={{ ...labelStyle, marginBottom: '0.75rem', fontSize: '0.78rem' }}>FEATURES <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma-separated)</span></p>
            <Field label="e.g. Modular Kitchen, Swimming Pool, Gym" name="features" icon={Plus} required={false} placeholder="Modular Kitchen, Swimming Pool, 24/7 Security" />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#f87171', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: loading ? 'var(--border)' : 'linear-gradient(135deg, var(--emerald), #059669)', color: 'var(--void)', border: 'none', borderRadius: '10px', padding: '0.9rem 2rem', fontFamily: 'var(--font-label)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.25s' }}>
            {loading ? 'SAVING…' : <><Save size={16} /> PUBLISH PROPERTY</>}
          </button>
        </form>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--bg-card)', border: '1px solid var(--emerald)', borderRadius: '10px', padding: '0.85rem 1.4rem', color: 'var(--cream)', fontSize: '0.875rem', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
