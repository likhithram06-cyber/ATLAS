// src/components/common/Navbar.jsx
// What this file does: top navigation bar — transparent, blurs to dark on scroll, supports user profile dropdown

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, LogOut, User, Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // What this does: adds blur background to navbar once user scrolls down
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function handleLogout() {
    logout();
    navigate('/');
    setDropOpen(false);
  }

  const initial = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <nav style={{
      position:        "fixed",
      top:             0,
      left:            0,
      right:           0,
      zIndex:          1000,
      padding:         "15px 8vw",
      display:         "flex",
      justifyContent:  "space-between",
      alignItems:      "center",
      background:      scrolled ? "var(--glass-bg)" : "transparent",
      backdropFilter:  scrolled ? "var(--glass-blur)" : "none",
      borderBottom:    scrolled ? "1px solid var(--glass-border)" : "none",
      transition:      "all 0.3s ease",
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate("/")}
        style={{
          fontFamily:    "Anton, sans-serif",
          fontSize:      "1.6rem",
          letterSpacing: "-0.03em",
          color:         "var(--amber)",
          cursor:        "pointer",
        }}
      >
        ATLAS
      </div>

      {/* Desktop links */}
      <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
        {["Browse"].map(link => (
          <button
            key={link}
            onClick={() => navigate(`/${link.toLowerCase()}`)}
            style={{
              background:    "transparent",
              border:        "none",
              color:         "var(--parchment)",
              fontFamily:    "Space Grotesk, sans-serif",
              fontSize:      "0.9rem",
              cursor:        "pointer",
              transition:    "color 0.2s",
            }}
            onMouseEnter={e => e.target.style.color = "var(--cream)"}
            onMouseLeave={e => e.target.style.color = "var(--parchment)"}
          >
            {link}
          </button>
        ))}

        {isAuthenticated ? (
          <div style={{ position: 'relative' }}>
            <button
              id="nav-profile-pill"
              onClick={() => setDropOpen(!dropOpen)}
              style={{
                display:      'flex', alignItems: 'center', gap: '0.5rem',
                background:   'rgba(139, 94, 60, 0.2)',
                border:       '1px solid var(--border-glow)',
                borderRadius: '9999px',
                padding:      '0.3rem 0.8rem 0.3rem 0.3rem',
                cursor:       'pointer', color: 'var(--cream)',
              }}
            >
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'var(--amber)',
                color: 'var(--obsidian)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 600,
              }}>
                {initial}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                {user?.name?.split(' ')[0]}
              </span>
            </button>

            {dropOpen && (
              <div style={{
                position:     'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                background:   'var(--bg-card-surface)',
                border:       '1px solid var(--border-hover)',
                borderRadius: '10px',
                padding:      '0.4rem',
                minWidth:     '150px',
                boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
                zIndex:       2000,
              }}>
                <button
                  onClick={() => { navigate('/profile'); setDropOpen(false); }}
                  style={dropdownItemStyle(false)}
                >
                  <User size={14} /> Profile
                </button>
                <button
                  onClick={() => { navigate('/profile'); setDropOpen(false); }}
                  style={dropdownItemStyle(false)}
                >
                  <Heart size={14} /> Saved
                </button>
                <div style={{ height: '1px', background: 'var(--border)', margin: '0.3rem 0' }} />
                <button
                  onClick={handleLogout}
                  style={dropdownItemStyle(true)}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <motion.button
            onClick={() => navigate("/login")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background:    "transparent",
              border:        "1px solid var(--border-hover)",
              borderRadius:  "8px",
              padding:       "8px 20px",
              color:         "var(--cream)",
              fontFamily:    "Space Grotesk, sans-serif",
              fontSize:      "0.85rem",
              cursor:        "pointer",
            }}
          >
            Sign In
          </motion.button>
        )}
      </div>
    </nav>
  );
}

function dropdownItemStyle(danger) {
  return {
    width:          '100%',
    display:        'flex', alignItems: 'center', gap: '0.6rem',
    padding:        '0.5rem 0.75rem',
    background:     'none', border: 'none',
    borderRadius:   '7px',
    cursor:         'pointer',
    color:          danger ? 'var(--amber)' : 'var(--cream)',
    fontSize:       '0.82rem',
    textAlign:      'left',
    transition:     'background 0.15s',
  };
}
