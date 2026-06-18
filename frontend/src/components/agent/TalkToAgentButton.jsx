// What this file does: Talk to Agent button and interactive modal/inline form.
// Replaces the chatbot trigger, requests phone number (pre-filling logged-in user phone if available),
// validates it (E.164 or Indian +91 format), and calls the backend Twilio make-call API.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Phone, X, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { makeCall } from '../../api/callApi';

export default function TalkToAgentButton({ property }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '+91 9676678346');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validates if a number matches a generic E.164 or +91 standard Indian format
  function validatePhoneNumber(num) {
    const cleanNum = num.replace(/[\s\-().]/g, '');
    
    // Check if it starts with +91 and has 10 digits after that
    if (/^\+91[6-9]\d{9}$/.test(cleanNum)) {
      return true;
    }
    
    // Or check if it matches standard E.164 format globally (+ followed by 7 to 15 digits)
    if (/^\+[1-9]\d{6,14}$/.test(cleanNum)) {
      return true;
    }
    
    return false;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const cleanNum = phone.trim();
    if (!cleanNum) {
      setError('Phone number is required.');
      return;
    }

    if (!validatePhoneNumber(cleanNum)) {
      setError('Please enter a valid phone number with country code, e.g. +91XXXXXXXXXX or +1XXXXXXXXXX.');
      return;
    }

    setLoading(true);
    try {
      const response = await makeCall(cleanNum, property?._id);
      if (response.data?.success) {
        setSuccess(true);
      } else {
        setError(response.data?.error || 'Failed to request call. Please try again.');
      }
    } catch (err) {
      console.error('[TalkToAgentButton] Call error:', err);
      setError(err.response?.data?.error || 'Unable to connect to the call service. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setIsOpen(true);
    // Refresh prefilled phone in case user logged in after page loaded
    if (user?.phone) {
      setPhone(user.phone);
    } else if (!phone || phone === '+91 9676678346') {
      setPhone('+91 9676678346');
    }
  }

  function handleClose() {
    setIsOpen(false);
    setError('');
    setSuccess(false);
  }

  return (
    <>
      <button
        id="talk-to-agent-btn"
        onClick={handleOpen}
        className="btn-rose"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flex: 1,
          justifyContent: 'center',
          borderRadius: '8px',
        }}
      >
        <Mic size={16} /> Talk to Agent
      </button>

      <AnimatePresence>
        {isOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 3000,
              padding: '1.5rem',
            }}
          >
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                width: '100%',
                maxWidth: '420px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glow)',
                borderRadius: '16px',
                padding: '2rem',
                position: 'relative',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--emerald-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                  }}
                >
                  <Phone size={20} />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.4rem',
                      color: 'var(--cream)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Talk to Agent
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Outbound Audio Call Flow
                  </p>
                </div>
              </div>

              {!success ? (
                <form onSubmit={handleSubmit}>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      marginBottom: '1.5rem',
                    }}
                  >
                    Enter your phone number below. We will instantly call you to answer any questions about{' '}
                    <strong style={{ color: 'var(--cream)' }}>{property?.title || 'this property'}</strong>.
                  </p>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label
                      htmlFor="phone-input"
                      className="label"
                      style={{ display: 'block', marginBottom: '0.5rem' }}
                    >
                      Your Phone Number
                    </label>
                    <input
                      id="phone-input"
                      type="tel"
                      placeholder="e.g. +919876543210 or +1234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                      className="input-field"
                      style={{ paddingLeft: '1rem' }}
                    />
                  </div>

                  {error && (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        color: '#f87171',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-rose"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      padding: '0.8rem',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      gap: '0.5rem',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader size={16} className="animate-spin" /> Calling you now...
                      </>
                    ) : (
                      'Request Call'
                    )}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      color: 'var(--accent)',
                      display: 'inline-block',
                      marginBottom: '1rem',
                    }}
                  >
                    <CheckCircle2 size={48} />
                  </motion.div>
                  <h4
                    style={{
                      color: 'var(--cream)',
                      fontSize: '1.1rem',
                      fontFamily: 'var(--font-label)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Call Requested!
                  </h4>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      marginBottom: '1.5rem',
                    }}
                  >
                    You should receive a call shortly at <span style={{ color: 'var(--accent-light)' }}>{phone}</span>.
                  </p>
                  <button
                    onClick={handleClose}
                    className="btn-ghost"
                    style={{
                      borderRadius: '8px',
                      padding: '0.5rem 1.5rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
