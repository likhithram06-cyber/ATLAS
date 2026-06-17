// What this file does: Signup page with Firebase Phone OTP and Google Sign-in flow
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerUser, googleAuth } from '../api/authApi';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

export default function Signup() {
  const [form,    setForm]    = useState({ name: '', phone: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');
  
  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // Google sign in states
  const [googleUser, setGoogleUser] = useState(null); // stores { idToken }
  const [needPhoneForGoogle, setNeedPhoneForGoogle] = useState(false);
  const [googlePhone, setGooglePhone] = useState('');

  const { login } = useAuth();
  const navigate  = useNavigate();
  const recaptchaVerifierRef = useRef(null);

  // Clean up recaptcha verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.warn('Error clearing reCAPTCHA', e);
        }
      }
    };
  }, []);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Helper to normalize phone number to E.164 format (Firebase requirement)
  function formatE164(phoneStr) {
    let cleaned = phoneStr.replace(/\s+/g, '').replace(/-/g, '');
    if (!cleaned.startsWith('+')) {
      // Default to India prefix (+91) if it looks like a standard 10-digit number
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }

  // Prepares the reCAPTCHA verifier instance
  function getRecaptchaVerifier() {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    
    // Add the invisible recaptcha container to DOM if not already present
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      }
    });
    return recaptchaVerifierRef.current;
  }

  // Handles standard signup form submission
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    
    if (!form.name || !form.phone || !form.email || !form.password) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const appVerifier = getRecaptchaVerifier();
      const formattedPhone = formatE164(form.phone);
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setToast('Verification code sent to ' + formattedPhone);
      setTimeout(() => setToast(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send verification SMS. Verify number format.');
    } finally {
      setLoading(false);
    }
  }

  // Verifies the code and registers the user
  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setError('');
    setVerifyingOtp(true);
    try {
      // Confirm the SMS verification code
      const credential = await confirmationResult.confirm(otpCode);
      const firebaseIdToken = await credential.user.getIdToken();

      // Submit data to our backend along with the verified ID token
      const res = await registerUser({
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        firebaseIdToken
      });

      setToast('Signup successful! Welcome.');
      login(res.data.token, res.data.user);
      
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'OTP verification or registration failed');
    } finally {
      setVerifyingOtp(false);
    }
  }

  // Handles Google sign-in
  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await googleAuth(idToken);

      if (res.data.needsPhone) {
        setGoogleUser({ idToken });
        setNeedPhoneForGoogle(true);
        setToast('Please verify a phone number to complete your account setup');
        setTimeout(() => setToast(''), 4000);
      } else {
        login(res.data.token, res.data.user);
        setToast('Signed in with Google!');
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Please open the app at http://localhost:5173 (not 127.0.0.1) for Google Sign-In to work.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setError(err.response?.data?.error || err.message || 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  }

  // Google Flow: Sends phone verification code
  async function handleSendGooglePhoneSms(e) {
    e.preventDefault();
    if (!googlePhone) {
      setError('Phone number is required');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const appVerifier = getRecaptchaVerifier();
      const formattedPhone = formatE164(googlePhone);
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setToast('Verification code sent to ' + formattedPhone);
      setTimeout(() => setToast(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send SMS to phone');
    } finally {
      setLoading(false);
    }
  }

  // Google Flow: Verifies SMS code and signs in/registers
  async function handleVerifyGooglePhoneOtp(e) {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setError('');
    setVerifyingOtp(true);
    try {
      const credential = await confirmationResult.confirm(otpCode);
      const phoneIdToken = await credential.user.getIdToken();

      // Submit Google ID token and Phone verification token to backend
      const res = await googleAuth(googleUser.idToken, phoneIdToken);
      
      setToast('Account registration complete!');
      login(res.data.token, res.data.user);
      
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to verify phone and register');
    } finally {
      setVerifyingOtp(false);
    }
  }

  const fields = [
    { id: 'su-name',     name: 'name',     icon: <User  size={15} />, label: 'Full Name',     type: 'text',     placeholder: 'John Doe' },
    { id: 'su-phone',    name: 'phone',     icon: <Phone size={15} />, label: 'Phone Number',  type: 'tel',      placeholder: '+91 98765 43210' },
    { id: 'su-email',    name: 'email',     icon: <Mail  size={15} />, label: 'Email Address', type: 'email',    placeholder: 'you@example.com' },
    { id: 'su-password', name: 'password',  icon: <Lock  size={15} />, label: 'Password',      type: 'password', placeholder: '••••••••' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <div id="recaptcha-container" style={{ display: 'none' }}></div>
      
      <motion.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        style={{ width: '100%', maxWidth: '440px', background: 'var(--base)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2.5rem' }}
      >
        {!needPhoneForGoogle ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--pale)' }}>ATLAS</span>
              </Link>
              <p style={{ color: 'var(--muted)', marginTop: '0.4rem', fontSize: '0.875rem' }}>Create your account</p>
            </div>

            {/* Google Sign-In */}
            <button id="google-btn" onClick={handleGoogle} disabled={loading} style={{
              width: '100%', padding: '0.7rem', background: 'var(--void)',
              border: '1px solid var(--slate)', borderRadius: '8px',
              color: 'var(--pale)', cursor: 'pointer', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              marginBottom: '1.25rem', transition: 'border-color 0.2s',
              opacity: loading ? 0.7 : 1
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ color: 'var(--muted)', fontSize: '0.73rem' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {fields.map(f => (
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

              <button id="signup-btn" type="submit" className="btn-rose"
                disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1, borderRadius: '8px', marginTop: '0.25rem' }}>
                {loading ? 'Sending verification SMS…' : 'Verify Phone & Sign Up'}
              </button>
            </form>
          </>
        ) : (
          /* Google Phone Input Phase */
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button onClick={() => setNeedPhoneForGoogle(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pale)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem' }}>
                <ArrowLeft size={16} /> Back
              </button>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--pale)' }}>PHONE LINK REQUIRED</span>
              <p style={{ color: 'var(--muted)', marginTop: '0.4rem', fontSize: '0.875rem' }}>Verify a phone number to complete your profile setup.</p>
            </div>

            <form onSubmit={handleSendGooglePhoneSms} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label htmlFor="google-phone" className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }}><Phone size={15} /></span>
                  <input id="google-phone" className="input-field" style={{ paddingLeft: '2.2rem' }}
                    type="tel" value={googlePhone} onChange={(e) => setGooglePhone(e.target.value)}
                    placeholder="+91 98765 43210" required />
                </div>
              </div>

              {error && <p style={{ color: 'var(--rose)', fontSize: '0.8rem', textAlign: 'center' }}>{error}</p>}

              <button id="link-phone-btn" type="submit" className="btn-rose"
                disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1, borderRadius: '8px' }}>
                {loading ? 'Sending SMS…' : 'Send Verification SMS'}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.83rem', marginTop: '1.25rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--rose)', textDecoration: 'none' }}>Sign in</Link>
        </p>

        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--base)', border: '1px solid var(--slate)', borderRadius: '10px', padding: '0.75rem 1.2rem', color: 'var(--pale)', fontSize: '0.83rem', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {toast}
          </motion.div>
        )}
      </motion.div>

      {/* Sleek Custom Glassmorphic Modal for SMS OTP Input */}
      <AnimatePresence>
        {otpSent && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(7, 12, 15, 0.85)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              style={{
                width: '100%', maxWidth: '380px', background: 'var(--base)', 
                border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--rose)' }}>
                <CheckCircle2 size={40} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--pale)', marginBottom: '0.5rem' }}>VERIFY NUMBER</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.83rem', marginBottom: '1.5rem' }}>
                We've sent a 6-digit verification code to your phone. Please enter it below.
              </p>

              <form onSubmit={needPhoneForGoogle ? handleVerifyGooglePhoneOtp : handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input 
                  type="text" 
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456" 
                  required
                  style={{
                    width: '100%', padding: '0.8rem', background: 'var(--void)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    color: 'var(--pale)', fontSize: '1.5rem', letterSpacing: '0.75rem',
                    textAlign: 'center', fontFamily: 'monospace'
                  }}
                />

                {error && <p style={{ color: 'var(--rose)', fontSize: '0.8rem' }}>{error}</p>}

                <button 
                  type="submit" 
                  className="btn-rose"
                  disabled={verifyingOtp}
                  style={{ width: '100%', justifyContent: 'center', borderRadius: '8px' }}
                >
                  {verifyingOtp ? 'Verifying Code…' : 'Verify & Continue'}
                </button>

                <button 
                  type="button" 
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setError('');
                  }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--muted)',
                    fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline',
                    marginTop: '0.5rem'
                  }}
                >
                  Cancel & Change Number
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
