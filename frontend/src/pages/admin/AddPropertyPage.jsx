import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Save, ArrowLeft } from 'lucide-react';
import api from '../../api/axios';
import { createProperty } from '../../api/propertyApi';

export default function AddPropertyPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    bhk: '',
    sqft: '',
    facing: '',
    ageYears: '',
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setForm(prev => ({ ...prev, images: Array.from(e.target.files) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (key === 'images') {
          val.forEach(file => formData.append('images', file));
        } else {
          formData.append(key, val);
        }
      });
      const res = await createProperty(formData);
      setToast('Property created successfully!');
      setTimeout(() => navigate('/admin/dashboard'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', position: 'relative' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '560px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' }}>
        <button type="button" onClick={() => navigate('/admin/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--cream)', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cream)', marginBottom: '1rem' }}>Add New Property</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" className="input-field" value={form.title} onChange={handleChange} required />
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" className="input-field" rows={3} value={form.description} onChange={handleChange} required />
          </div>
          <div>
            <label className="label" htmlFor="price">Price (₹)</label>
            <input id="price" name="price" type="number" className="input-field" value={form.price} onChange={handleChange} required />
          </div>
          <div>
            <label className="label" htmlFor="location">Location</label>
            <input id="location" name="location" className="input-field" value={form.location} onChange={handleChange} required />
          </div>
          <div>
            <label className="label" htmlFor="bhk">BHK</label>
            <input id="bhk" name="bhk" type="number" className="input-field" value={form.bhk} onChange={handleChange} required />
          </div>
          <div>
            <label className="label" htmlFor="images">Photos (up to 5)</label>
            <input id="images" name="images" type="file" accept="image/*" multiple onChange={handleFileChange} />
          </div>
          {error && <p style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{error}</p>}
          <button type="submit" className="btn-rose" disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving…' : <><Camera size={18} style={{ marginRight: '0.5rem' }} /> Create Property</>}
          </button>
        </form>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border-hover)', borderRadius: '10px', padding: '0.75rem 1.2rem', color: 'var(--cream)', fontSize: '0.85rem' }}>
            {toast}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
