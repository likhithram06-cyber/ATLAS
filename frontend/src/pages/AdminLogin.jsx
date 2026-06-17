// What this file does: admin login page — shield-icon card, dark theme v2
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function AdminLogin() {
  const [form,    setForm]    = useState({ adminId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Authenticates admin and stores the admin JWT separately
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/admin-login', form);
      adminLogin(res.data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        style={{
          width: '100%', maxWidth: '400px',
          background: 'var(--base)',
          border: '1px solid rgba(135,81,95,0.3)',
          borderRadius: '16px', padding: '2.5rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'rgba(135,81,95,0.15)', border: '1px solid rgba(135,81,95,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
          }}>
            <ShieldCheck size={26} color="var(--rose)" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--pale)' }}>
            ADMIN PORTAL
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.83rem', marginTop: '0.3rem' }}>ATLAS Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { id: 'admin-id',   name: 'adminId',  icon: <User size={15} />, label: 'Admin ID',  type: 'text',     placeholder: 'atlas_admin' },
            { id: 'admin-pass', name: 'password', icon: <Lock size={15} />, label: 'Password',  type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.name}>
              <label htmlFor={f.id} className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>{f.label}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}>{f.icon}</span>
                <input id={f.id} className="input-field" style={{ paddingLeft: '2.2rem' }}
                  type={f.type} name={f.name} value={form[f.name]} onChange={handleChange}
                  placeholder={f.placeholder} required />
              </div>
            </div>
          ))}

          {error && <p style={{ color: 'var(--rose)', fontSize: '0.8rem', textAlign: 'center' }}>{error}</p>}

          <button id="admin-login-btn" type="submit" className="btn-rose"
            disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1, borderRadius: '8px' }}>
            {loading ? 'Authenticating…' : 'Enter Dashboard'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" className="label" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← Back to site</Link>
        </p>
      </motion.div>
    </div>
  );
}
