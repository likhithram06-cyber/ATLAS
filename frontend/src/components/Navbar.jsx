// src/components/Navbar.jsx
// Redesign: Emerald & Ink theme
// Layout: Logo left | "Browse Properties" pill centered | Sign In + menu right
// Scroll: glassmorphism appears after scrolling past hero (backdrop-blur, emerald border)

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setMenuOpen(false); setDropOpen(false); }, [location]);

  function handleLogout() {
    logout();
    navigate("/");
    setDropOpen(false);
  }

  const initial = user?.name?.[0]?.toUpperCase() || "?";

  return (
    <>
      <nav
        style={{
          position:       "fixed",
          top:            0,
          left:           0,
          right:          0,
          zIndex:         200,
          height:         "64px",
          display:        "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems:     "center",
          padding:        "0 5vw",
          background:     scrolled ? "rgba(10,14,13,0.60)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom:   scrolled
            ? "1px solid rgba(16,185,129,0.18)"
            : "none",
          transition:
            "background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease",
        }}
      >
        {/* ── LEFT: ATLAS wordmark ── */}
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border:     "none",
            cursor:     "pointer",
            display:    "flex",
            alignItems: "center",
            gap:        "10px",
            padding:    0,
            justifySelf: "start",
          }}
        >
          {/* Logo mark — emerald triangles */}
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 95,50 5,50"  fill="#10B981" />
            <polygon points="5,100 50,55 95,100" fill="#059669" />
          </svg>
          <span
            style={{
              fontFamily:    "'Bebas Neue', sans-serif",
              fontSize:      "1.5rem",
              letterSpacing: "0.05em",
              background:    "linear-gradient(135deg, #10B981 0%, #34D8C4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight:    1,
            }}
          >
            ATLAS
          </span>
        </button>

        {/* ── CENTER: Browse Properties pill (desktop only) ── */}
        <div className="hidden md:flex" style={{ justifySelf: "center" }}>
          <button
            onClick={() => navigate("/browse")}
            style={{
              fontFamily:    "'Space Grotesk', sans-serif",
              fontWeight:    600,
              fontSize:      "0.78rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background:    "transparent",
              color:         "var(--emerald)",
              border:        "1px solid rgba(16,185,129,0.5)",
              borderRadius:  "9999px",
              padding:       "8px 22px",
              cursor:        "pointer",
              transition:    "all 0.25s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background  = "rgba(16,185,129,0.12)";
              e.currentTarget.style.borderColor = "var(--emerald)";
              e.currentTarget.style.boxShadow   = "0 0 16px rgba(16,185,129,0.2)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background  = "transparent";
              e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)";
              e.currentTarget.style.boxShadow   = "none";
            }}
          >
            Browse Properties
          </button>
        </div>

        {/* ── RIGHT: Sign In + dropdown + hamburger ── */}
        <div
          style={{
            display:     "flex",
            alignItems:  "center",
            gap:         "12px",
            justifySelf: "end",
          }}
        >
          {/* Desktop auth area */}
          {isAuthenticated ? (
            <div className="hidden md:block" style={{ position: "relative" }}>
              <button
                onClick={() => setDropOpen(!dropOpen)}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        "8px",
                  background: "rgba(16,185,129,0.10)",
                  border:     "1px solid rgba(16,185,129,0.3)",
                  borderRadius: "9999px",
                  padding:    "6px 14px 6px 8px",
                  cursor:     "pointer",
                  color:      "var(--white)",
                  outline:    "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background   = "rgba(16,185,129,0.18)";
                  e.currentTarget.style.borderColor  = "var(--emerald)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background   = "rgba(16,185,129,0.10)";
                  e.currentTarget.style.borderColor  = "rgba(16,185,129,0.3)";
                }}
              >
                <div
                  style={{
                    width: "24px", height: "24px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #10B981, #34D8C4)",
                    color: "var(--void)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", fontWeight: 700,
                  }}
                >
                  {initial}
                </div>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {user?.name?.split(" ")[0]}
                </span>
              </button>

              {dropOpen && (
                <div
                  style={{
                    position: "absolute",
                    top:      "calc(100% + 10px)",
                    right:    0,
                    background:   "rgba(13,18,16,0.96)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border:   "1px solid rgba(16,185,129,0.2)",
                    borderRadius: "12px",
                    padding:  "8px",
                    minWidth: "160px",
                    boxShadow:"0 8px 40px rgba(0,0,0,0.7)",
                    zIndex:   2000,
                  }}
                >
                  {[
                    { label: "Profile",        action: () => { navigate("/profile");  setDropOpen(false); } },
                    { label: "Saved Listings", action: () => { navigate("/profile");  setDropOpen(false); } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      style={dropItemStyle(false)}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div style={{ height: "1px", background: "rgba(16,185,129,0.15)", margin: "4px 0" }} />
                  <button
                    onClick={handleLogout}
                    style={dropItemStyle(true)}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
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
                background:    "transparent",
                color:         "rgba(245,245,240,0.65)",
                border:        "1px solid rgba(245,245,240,0.15)",
                borderRadius:  "9999px",
                padding:       "8px 18px",
                fontFamily:    "'Space Grotesk', sans-serif",
                fontWeight:    500,
                fontSize:      "0.78rem",
                letterSpacing: "0.06em",
                cursor:        "pointer",
                transition:    "all 0.25s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)";
                e.currentTarget.style.color       = "var(--emerald)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(245,245,240,0.15)";
                e.currentTarget.style.color       = "rgba(245,245,240,0.65)";
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
              background: "none", border: "none",
              cursor: "pointer", padding: "6px",
              display: "flex", flexDirection: "column", gap: "5px",
            }}
          >
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  display:    "block",
                  width:      "22px",
                  height:     "1.5px",
                  background: "var(--emerald)",
                  transition: "all 0.25s",
                  transform:  menuOpen
                    ? i === 0 ? "rotate(45deg) translate(4.5px, 4.5px)"
                    : i === 1 ? "scaleX(0)"
                    : "rotate(-45deg) translate(4.5px, -4.5px)"
                    : "none",
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        </div>
      </nav>

      {/* ── Mobile dropdown menu ── */}
      <div
        className="md:hidden"
        style={{
          position:       "fixed",
          top:            "64px",
          left:           0,
          right:          0,
          zIndex:         199,
          background:     "rgba(10,14,13,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom:   "1px solid rgba(16,185,129,0.15)",
          padding:        menuOpen ? "20px 5vw 24px" : "0 5vw",
          maxHeight:      menuOpen ? "420px" : "0",
          overflow:       "hidden",
          transition:     "max-height 0.35s cubic-bezier(0.16,1,0.3,1), padding 0.35s ease",
        }}
      >
        {[
          { label: "Browse Properties", path: "/browse" },
          { label: "AI Agent",          path: "/browse" },
          { label: "For Agents",        path: "/admin/login" },
        ].map(link => (
          <button
            key={link.label}
            onClick={() => navigate(link.path)}
            style={{
              display:      "block",
              width:        "100%",
              textAlign:    "left",
              background:   "none",
              border:       "none",
              borderBottom: "1px solid rgba(16,185,129,0.08)",
              padding:      "14px 0",
              fontFamily:   "'Space Grotesk', sans-serif",
              fontWeight:   500,
              fontSize:     "0.9rem",
              letterSpacing:"0.04em",
              color:        "rgba(245,245,240,0.75)",
              cursor:       "pointer",
            }}
          >
            {link.label}
          </button>
        ))}

        {isAuthenticated ? (
          <>
            <button
              onClick={() => navigate("/profile")}
              style={mobileMenuItemStyle()}
            >
              Profile
            </button>
            <button
              onClick={() => navigate("/profile")}
              style={mobileMenuItemStyle()}
            >
              Saved Listings
            </button>
            <button onClick={handleLogout} style={mobileMenuItemStyle(true)}>
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            style={mobileMenuItemStyle()}
          >
            Sign In
          </button>
        )}
      </div>
    </>
  );
}

function dropItemStyle(danger) {
  return {
    width:      "100%",
    display:    "flex",
    alignItems: "center",
    padding:    "9px 12px",
    background: "transparent",
    border:     "none",
    borderRadius: "8px",
    cursor:     "pointer",
    color:      danger ? "var(--emerald)" : "var(--white)",
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize:   "0.78rem",
    textAlign:  "left",
    transition: "background 0.15s",
  };
}

function mobileMenuItemStyle(danger = false) {
  return {
    display:      "block",
    width:        "100%",
    textAlign:    "left",
    background:   "none",
    border:       "none",
    borderBottom: "1px solid rgba(16,185,129,0.08)",
    padding:      "14px 0",
    fontFamily:   "'Space Grotesk', sans-serif",
    fontWeight:   danger ? 600 : 500,
    fontSize:     "0.9rem",
    letterSpacing:"0.04em",
    color:        danger ? "var(--emerald)" : "rgba(245,245,240,0.75)",
    cursor:       "pointer",
  };
}
