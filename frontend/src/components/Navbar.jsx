// src/components/Navbar.jsx
// What this file does: fixed top nav — transparent → dark blur on scroll
// Blade Runner feel: minimal, sharp, no rounded corners on desktop, authenticated user dropdown

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { label: "Browse",    path: "/browse"    },
  { label: "AI Agent",  path: "/browse"     }, // Maps to browse page where AI features live
  { label: "For Agents",path: "/admin/login"},
  { label: "About",     path: "/"          },
];

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [dropOpen, setDropOpen]   = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // What this does: adds backdrop blur once user scrolls past 60px
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location]);

  function handleLogout() {
    logout();
    navigate('/');
    setDropOpen(false);
  }

  const initial = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <>
      <nav style={{
        position:       "fixed",
        top:            0,
        left:           0,
        right:          0,
        zIndex:         200,
        height:         "64px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0 5vw",
        background:     scrolled ? "rgba(4,6,10,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)"        : "none",
        borderBottom:   scrolled ? "1px solid rgba(240,244,248,0.06)" : "none",
        transition:     "background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
      }}>

        {/* ── LEFT: ATLAS wordmark ── */}
        <button
          onClick={() => navigate("/")}
          style={{
            background:    "none",
            border:        "none",
            cursor:        "pointer",
            display:       "flex",
            alignItems:    "center",
            gap:           "10px",
            padding:       0,
          }}
        >
          {/* Logo mark — two triangles (house/A shape) */}
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 95,50 5,50"  fill="#C8963C" />
            <polygon points="5,100 50,55 95,100" fill="#8B6A30" />
          </svg>
          <span style={{
            fontFamily:    "'Bebas Neue', sans-serif",
            fontSize:      "1.5rem",
            letterSpacing: "0.05em",
            color:         "#F0F4F8",
            lineHeight:    1,
          }}>
            ATLAS
          </span>
        </button>

        {/* ── CENTER: Nav links (desktop only) ── */}
        <div style={{
          display:    "none",
          gap:        "8px",
          alignItems: "center",
        }}
          className="hidden md:flex"
        >
          {NAV_LINKS.map(link => {
            const active = location.pathname === link.path && link.path !== "/";
            return (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                style={{
                  background:    active ? "rgba(200,150,60,0.12)" : "transparent",
                  border:        active ? "1px solid rgba(200,150,60,0.3)" : "1px solid transparent",
                  borderRadius:  "2px",
                  padding:       "6px 16px",
                  fontFamily:    "'Space Grotesk', sans-serif",
                  fontWeight:    500,
                  fontSize:      "0.8rem",
                  letterSpacing: "0.06em",
                  color:         active ? "#C8963C" : "rgba(240,244,248,0.6)",
                  cursor:        "pointer",
                  transition:    "all 0.2s",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color       = "#F0F4F8";
                    e.currentTarget.style.borderColor = "rgba(240,244,248,0.15)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color       = "rgba(240,244,248,0.6)";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
              >
                {link.label}
              </button>
            );
          })}
        </div>

        {/* ── RIGHT: CTA + Profile Dropdown + hamburger ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* List Property — desktop */}
          <button
            onClick={() => navigate("/signup")}
            className="hidden md:block"
            style={{
              background:    "var(--hazegold)",
              color:         "var(--void)",
              border:        "none",
              borderRadius:  "2px",
              padding:       "9px 20px",
              fontFamily:    "'Space Grotesk', sans-serif",
              fontWeight:    600,
              fontSize:      "0.78rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor:        "pointer",
              transition:    "background 0.2s",
            }}
            onMouseEnter={e => e.target.style.background = "var(--hazelight)"}
            onMouseLeave={e => e.target.style.background = "var(--hazegold)"}
          >
            List Property
          </button>

          {/* Desktop authentication profile dropdown */}
          {isAuthenticated ? (
            <div className="hidden md:block relative">
              <button
                onClick={() => setDropOpen(!dropOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(200, 150, 60, 0.12)",
                  border: "1px solid rgba(200, 150, 60, 0.3)",
                  borderRadius: "2px",
                  padding: "6px 14px",
                  cursor: "pointer",
                  color: "var(--white)",
                  outline: "none",
                }}
              >
                <div style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "var(--hazegold)",
                  color: "var(--void)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}>
                  {initial}
                </div>
                <span style={{
                  fontSize: "0.78rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 500
                }}>
                  {user?.name?.split(' ')[0]}
                </span>
              </button>

              {dropOpen && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "var(--steel)",
                  border: "1px solid var(--iron)",
                  borderRadius: "2px",
                  padding: "6px",
                  minWidth: "150px",
                  boxShadow: "0 8px 32px rgba(4,6,10,0.8)",
                  zIndex: 2000,
                }}>
                  <button
                    onClick={() => { navigate('/profile'); setDropOpen(false); }}
                    style={dropdownItemStyle(false)}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => { navigate('/profile'); setDropOpen(false); }}
                    style={dropdownItemStyle(false)}
                  >
                    Saved Listings
                  </button>
                  <div style={{ height: "1px", background: "var(--iron)", margin: "4px 0" }} />
                  <button
                    onClick={handleLogout}
                    style={dropdownItemStyle(true)}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="hidden md:block"
              style={{
                background: "transparent",
                color: "rgba(240,244,248,0.6)",
                border: "1px solid rgba(240,244,248,0.15)",
                borderRadius: "2px",
                padding: "8px 18px",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
                fontSize: "0.78rem",
                letterSpacing: "0.06em",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(200,150,60,0.5)";
                e.currentTarget.style.color = "var(--hazegold)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(240,244,248,0.15)";
                e.currentTarget.style.color = "rgba(240,244,248,0.6)";
              }}
            >
              Sign In
            </button>
          )}

          {/* Hamburger — mobile */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
            style={{
              background: "none",
              border:     "none",
              cursor:     "pointer",
              padding:    "6px",
              display:    "flex",
              flexDirection: "column",
              gap:        "5px",
            }}
          >
            {[0,1,2].map(i => (
              <span key={i} style={{
                display:    "block",
                width:      "22px",
                height:     "1.5px",
                background: "#F0F4F8",
                transition: "all 0.25s",
                transform:  menuOpen
                  ? i === 0 ? "rotate(45deg) translate(4.5px, 4.5px)"
                  : i === 1 ? "scaleX(0)"
                  : "rotate(-45deg) translate(4.5px, -4.5px)"
                  : "none",
                opacity: menuOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>
      </nav>

      {/* ── Mobile dropdown menu ── */}
      <div
        className="md:hidden"
        style={{
          position:      "fixed",
          top:           "64px",
          left:          0, right: 0,
          zIndex:        199,
          background:    "rgba(4,6,10,0.97)",
          backdropFilter:"blur(20px)",
          borderBottom:  "1px solid rgba(240,244,248,0.06)",
          padding:       menuOpen ? "20px 5vw 24px" : "0 5vw",
          maxHeight:     menuOpen ? "400px" : "0",
          overflow:      "hidden",
          transition:    "max-height 0.35s cubic-bezier(0.16,1,0.3,1), padding 0.35s ease",
        }}
      >
        {NAV_LINKS.map(link => (
          <button
            key={link.label}
            onClick={() => navigate(link.path)}
            style={{
              display:    "block",
              width:      "100%",
              textAlign:  "left",
              background: "none",
              border:     "none",
              borderBottom: "1px solid rgba(240,244,248,0.05)",
              padding:    "14px 0",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 500,
              fontSize:   "0.9rem",
              letterSpacing: "0.04em",
              color:      "rgba(240,244,248,0.75)",
              cursor:     "pointer",
            }}
          >
            {link.label}
          </button>
        ))}
        {isAuthenticated ? (
          <>
            <button
              onClick={() => navigate('/profile')}
              style={{
                display:    "block",
                width:      "100%",
                textAlign:  "left",
                background: "none",
                border:     "none",
                borderBottom: "1px solid rgba(240,244,248,0.05)",
                padding:    "14px 0",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
                fontSize:   "0.9rem",
                letterSpacing: "0.04em",
                color:      "rgba(240,244,248,0.75)",
                cursor:     "pointer",
              }}
            >
              Profile
            </button>
            <button
              onClick={() => navigate('/profile')}
              style={{
                display:    "block",
                width:      "100%",
                textAlign:  "left",
                background: "none",
                border:     "none",
                borderBottom: "1px solid rgba(240,244,248,0.05)",
                padding:    "14px 0",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
                fontSize:   "0.9rem",
                letterSpacing: "0.04em",
                color:      "rgba(240,244,248,0.75)",
                cursor:     "pointer",
              }}
            >
              Saved Listings
            </button>
            <button
              onClick={handleLogout}
              style={{
                display:    "block",
                width:      "100%",
                textAlign:  "left",
                background: "none",
                border:     "none",
                borderBottom: "1px solid rgba(240,244,248,0.05)",
                padding:    "14px 0",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                fontSize:   "0.9rem",
                letterSpacing: "0.04em",
                color:      "var(--hazegold)",
                cursor:     "pointer",
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            style={{
              display:    "block",
              width:      "100%",
              textAlign:  "left",
              background: "none",
              border:     "none",
              borderBottom: "1px solid rgba(240,244,248,0.05)",
              padding:    "14px 0",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 500,
              fontSize:   "0.9rem",
              letterSpacing: "0.04em",
              color:      "rgba(240,244,248,0.75)",
              cursor:     "pointer",
            }}
          >
            Sign In
          </button>
        )}
        <button
          onClick={() => navigate("/signup")}
          style={{
            marginTop:     "16px",
            width:         "100%",
            background:    "var(--hazegold)",
            color:         "var(--void)",
            border:        "none",
            borderRadius:  "2px",
            padding:       "13px",
            fontFamily:    "'Space Grotesk', sans-serif",
            fontWeight:    600,
            fontSize:      "0.85rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor:        "pointer",
          }}
        >
          List Property
        </button>
      </div>
    </>
  );
}

function dropdownItemStyle(danger) {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: "none",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    color: danger ? "var(--hazegold)" : "var(--white)",
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "0.78rem",
    textAlign: "left",
    transition: "background 0.15s",
  };
}
