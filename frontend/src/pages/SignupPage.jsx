// What this file does: Signup page supporting standard registration and Firebase Google Sign-in with phone input
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerUser, googleAuth } from '../api/authApi';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

export default function SignupPage() {
  const [form,    setForm]    = useState({ name: '', phone: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');

  // Google phone setup states
  const [pendingGoogleToken, setPendingGoogleToken] = useState(null);
  const [needPhoneForGoogle, setNeedPhoneForGoogle] = useState(false);
  const [googlePhone, setGooglePhone] = useState('');

  const { login } = useAuth();
  const navigate  = useNavigate();

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Form submission
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await registerUser({
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password
      });
      setToast('Account created successfully!');
      login(res.data.token, res.data.user);
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  // Firebase Google Sign-In
  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const res = await googleAuth(idToken);
      
      if (res.data.needsPhone) {
        setPendingGoogleToken(idToken);
        setNeedPhoneForGoogle(true);
        setToast('Phone number is required to complete signup.');
        setTimeout(() => setToast(''), 4000);
      } else {
        login(res.data.token, res.data.user);
        setToast('Google Sign-In successful!');
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.response?.data?.error || err.message || 'Google Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  // Submit phone number to complete Google Setup
  async function handleGooglePhoneSubmit(e) {
    e.preventDefault();
    if (!googlePhone) {
      setError('Phone number is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await googleAuth(pendingGoogleToken, googlePhone);
      login(res.data.token, res.data.user);
      setToast('Successfully registered and logged in!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save phone number');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <motion.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2.5rem' }}
      >
        {!needPhoneForGoogle ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--cream)', letterSpacing: '-0.02em' }}>ATLAS</span>
              </Link>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.875rem' }}>Create your account</p>
            </div>

            {/* Google Authentication */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1.5rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--cream)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Name */}
              <div>
                <label htmlFor="su-name" className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }}><User size={15} /></span>
                  <input id="su-name" className="input-field" style={{ paddingLeft: '2.2rem' }}
                    type="text" name="name" value={form.name} onChange={handleChange}
                    placeholder="John Doe" required />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="su-phone" className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }}><Phone size={15} /></span>
                  <input id="su-phone" className="input-field" style={{ paddingLeft: '2.2rem' }}
                    type="tel" name="phone" value={form.phone} onChange={handleChange}
                    placeholder="+91 99999 99999" required />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="su-email" className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }}><Mail size={15} /></span>
                  <input id="su-email" className="input-field" style={{ paddingLeft: '2.2rem' }}
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="you@example.com" required />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="su-password" className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }}><Lock size={15} /></span>
                  <input id="su-password" className="input-field" style={{ paddingLeft: '2.2rem' }}
                    type="password" name="password" value={form.password} onChange={handleChange}
                    placeholder="••••••••" required />
                </div>
              </div>

              {error && <p style={{ color: 'var(--accent)', fontSize: '0.8rem', textAlign: 'center' }}>{error}</p>}

              <button id="signup-btn" type="submit" className="btn-rose"
                disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.6 : 1, borderRadius: '8px', marginTop: '0.25rem' }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          </>
        ) : (
          /* Phone Required form for Google Auth */
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button type="button" onClick={() => setNeedPhoneForGoogle(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem' }}>
                <ArrowLeft size={16} /> Back
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--cream)' }}>PHONE REQUIRED</span>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.875rem' }}>A phone number is required to complete your registration.</p>
            </div>

            <form onSubmit={handleGooglePhoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label htmlFor="google-phone" className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }}><Phone size={15} /></span>
                  <input id="google-phone" className="input-field" style={{ paddingLeft: '2.2rem' }}
                    type="tel" value={googlePhone} onChange={(e) => setGooglePhone(e.target.value)}
                    placeholder="+91 99999 99999" required />
                </div>
              </div>

              {error && <p style={{ color: 'var(--accent)', fontSize: '0.8rem', textAlign: 'center' }}>{error}</p>}

              <button id="link-phone-btn" type="submit" className="btn-rose"
                disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1, borderRadius: '8px' }}>
                {loading ? 'Saving…' : 'Complete Setup'}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem', marginTop: '1.25rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in</Link>
        </p>

        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border-hover)', borderRadius: '10px', padding: '0.75rem 1.2rem', color: 'var(--cream)', fontSize: '0.83rem', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {toast}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
