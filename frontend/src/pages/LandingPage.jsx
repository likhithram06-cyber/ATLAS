// src/pages/LandingPage.jsx
// Redesign: Emerald & Ink theme — centered hero, layered gradient overlay,
// Ken Burns video zoom, scroll-triggered reveals, count-up stats, magnetic buttons

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4";

// ── Mouse tracking (parallax) ─────────────────────────────────────────────
function useMouseTracking() {
  const [pos, setPos] = useState({ px: 0, py: 0 });
  const target  = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf     = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      target.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    function animate() {
      current.current.x += (target.current.x - current.current.x) * 0.06;
      current.current.y += (target.current.y - current.current.y) * 0.06;
      setPos({ px: current.current.x * 30, py: current.current.y * 14 });
      raf.current = requestAnimationFrame(animate);
    }
    window.addEventListener("mousemove", onMove);
    raf.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);
  return pos;
}

// ── Scroll-triggered reveal hook ──────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting) {
            // Stagger delay via dataset
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => {
              entry.target.classList.add("revealed");
            }, Number(delay));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Count-up hook ─────────────────────────────────────────────────────────
function useCountUp(target, duration = 1800, suffix = "") {
  const [value, setValue] = useState("0");
  const ref = useRef(null);
  const started = useRef(false);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const isNum = !isNaN(parseFloat(target));
    if (!isNum) { setValue(target); return; }
    const end = parseFloat(target);
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      const current = Math.round(eased * end);
      setValue(current + suffix);
      if (progress < 1) requestAnimationFrame(step);
      else setValue(target + suffix);
    }
    requestAnimationFrame(step);
  }, [target, duration, suffix]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) start(); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [start]);

  return [value, ref];
}

// ── Magnetic button effect ─────────────────────────────────────────────────
function useMagnetic(strength = 0.25) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width  / 2);
      const y = e.clientY - (rect.top  + rect.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px) scale(1.03)`;
    };
    const onLeave = () => {
      el.style.transform = "translate(0,0) scale(1)";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);
  return ref;
}

// ── Scroll parallax on video ───────────────────────────────────────────────
function useScrollParallax() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY * 0.35);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return offset;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const mouse     = useMouseTracking();
  const scrollY   = useScrollParallax();
  useScrollReveal();

  return (
    <div style={{ background: "var(--void)", minHeight: "100vh", overflow: "hidden" }}>
      <Navbar />

      {/* ══════════════════════════════════════════════════════════
          HERO — full viewport
          ══════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        style={{ position: "relative", height: "100dvh", overflow: "hidden" }}
      >
        {/* ── LAYER 0: Background video with Ken Burns + parallax ── */}
        <div
          style={{
            position:  "absolute",
            inset:     0,
            zIndex:    0,
            overflow:  "hidden",
            transform: `translateY(${scrollY * 0.3}px) translate(${mouse.px * 0.08}px, ${mouse.py * 0.05}px)`,
            transition: "transform 0.12s linear",
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={VIDEO_URL + "?poster"}
            style={{
              width: "100%",
              height: "110%",        /* slight oversize for parallax headroom */
              objectFit: "cover",
              animation: "kenBurns 20s ease-in-out infinite alternate",
              filter: "brightness(0.75) saturate(1.1) contrast(1.05)",
            }}
          >
            <source src={VIDEO_URL} type="video/mp4" />
          </video>
        </div>

        {/* ── LAYER 1: Layered gradient overlay ── */}
        {/* Top band (behind nav) */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "220px", zIndex: 1,
          background: "linear-gradient(to bottom, rgba(10,14,13,0.78) 0%, transparent 100%)",
          pointerEvents: "none",
        }} />
        {/* Bottom band (behind text block) */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: "55%", zIndex: 1,
          background: "linear-gradient(to top, rgba(10,14,13,0.82) 0%, rgba(10,14,13,0.30) 60%, transparent 100%)",
          pointerEvents: "none",
        }} />
        {/* Subtle radial vignette */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          background: "radial-gradient(ellipse 120% 80% at 50% 50%, transparent 35%, rgba(10,14,13,0.45) 100%)",
          pointerEvents: "none",
        }} />

        {/* ── LAYER 10: Centered hero text block ── */}
        <div
          style={{
            position:       "absolute",
            inset:          0,
            zIndex:         10,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            transform:      `translate(${mouse.px * 0.12}px, ${mouse.py * 0.08}px)`,
            transition:     "transform 0.12s linear",
            padding:        "0 20px",
            pointerEvents:  "none",
          }}
        >
          {/* Content block — max 800px wide */}
          <div style={{ maxWidth: "800px", width: "100%", textAlign: "center" }}>

            {/* Eyebrow label */}
            <p
              className="anim-fade-up"
              style={{
                fontFamily:    "'Space Grotesk', sans-serif",
                fontSize:      "0.72rem",
                fontWeight:    600,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color:         "var(--emerald)",
                marginBottom:  "24px",
                animationDelay: "0.05s",
              }}
            >
              AI-Powered Real Estate
            </p>

            {/* Headline line 1 */}
            <div
              className="anim-fade-up"
              style={{
                fontFamily:    "'Bebas Neue', sans-serif",
                fontSize:      "clamp(4.5rem, 13vw, 11rem)",
                lineHeight:    "0.88",
                letterSpacing: "0.03em",
                color:         "var(--white)",
                animationDelay: "0.15s",
              }}
            >
              FIND WHERE
            </div>

            {/* Headline line 2 — emerald gradient */}
            <div
              className="anim-fade-up"
              style={{
                fontFamily:    "'Bebas Neue', sans-serif",
                fontSize:      "clamp(4.5rem, 13vw, 11rem)",
                lineHeight:    "0.88",
                letterSpacing: "0.03em",
                background:    "linear-gradient(135deg, #10B981 0%, #34D8C4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginTop:     "12px",
                animationDelay: "0.25s",
              }}
            >
              YOU BELONG.
            </div>

            {/* Supporting paragraph */}
            <p
              className="anim-fade-up"
              style={{
                fontFamily:    "'Inter', sans-serif",
                fontWeight:    300,
                fontSize:      "clamp(0.88rem, 1.5vw, 1rem)",
                lineHeight:    "1.8",
                color:         "var(--silver)",
                maxWidth:      "520px",
                margin:        "28px auto 0",
                animationDelay: "0.38s",
              }}
            >
              Browse listings, talk to our AI agent, and experience properties
              via cinematic previews — before you ever visit.
            </p>

            {/* CTA button row */}
            <div
              className="anim-fade-up"
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            "16px",
                marginTop:      "36px",
                flexWrap:       "wrap",
                animationDelay: "0.52s",
                pointerEvents:  "auto",
              }}
            >
              <PrimaryButton onClick={() => navigate("/browse")}>
                Explore Homes →
              </PrimaryButton>
              <GhostButton onClick={() => navigate("/login")}>
                Agent Login
              </GhostButton>
            </div>
          </div>
        </div>

        {/* Bottom fade into page */}
        <div style={{
          position:   "absolute",
          bottom:     0, left: 0, right: 0,
          height:     "120px",
          background: "linear-gradient(to top, var(--void) 0%, transparent 100%)",
          zIndex:     45,
          pointerEvents: "none",
        }} />
      </section>

      {/* ══════════════════════════════════════════
          BELOW FOLD SECTIONS
          ══════════════════════════════════════════ */}
      <StatsBar />
      <HowItWorks />
      <FeaturesGrid />
      <AgentCTA navigate={navigate} />
      <Footer />
    </div>
  );
}

// ── Primary Solid Emerald Button (magnetic) ───────────────────────────────
function PrimaryButton({ children, onClick }) {
  const ref = useMagnetic(0.28);
  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontWeight:    600,
        fontSize:      "0.88rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background:    "var(--emerald)",
        color:         "var(--void)",
        border:        "none",
        borderRadius:  "9999px",
        padding:       "15px 36px",
        cursor:        "pointer",
        transition:    "background 0.25s, transform 0.2s ease, box-shadow 0.25s",
        animation:     "glowPulse 3s ease-in-out infinite",
        boxShadow:     "0 0 16px rgba(16,185,129,0.35)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background  = "var(--emerald-lit)";
        e.currentTarget.style.animation   = "none";
        e.currentTarget.style.boxShadow   = "0 0 36px rgba(16,185,129,0.6), 0 8px 40px rgba(52,216,196,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background  = "var(--emerald)";
        e.currentTarget.style.animation   = "glowPulse 3s ease-in-out infinite";
        e.currentTarget.style.boxShadow   = "0 0 16px rgba(16,185,129,0.35)";
        e.currentTarget.style.transform   = "translate(0,0) scale(1)";
      }}
    >
      {children}
    </button>
  );
}

// ── Ghost Outline Button (magnetic) ──────────────────────────────────────
function GhostButton({ children, onClick }) {
  const ref = useMagnetic(0.22);
  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontWeight:    500,
        fontSize:      "0.85rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background:    "transparent",
        color:         "rgba(245,245,240,0.7)",
        border:        "1px solid rgba(16,185,129,0.35)",
        borderRadius:  "9999px",
        padding:       "14px 32px",
        cursor:        "pointer",
        transition:    "all 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background   = "rgba(16,185,129,0.12)";
        e.currentTarget.style.borderColor  = "var(--emerald)";
        e.currentTarget.style.color        = "var(--emerald-lit)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background   = "transparent";
        e.currentTarget.style.borderColor  = "rgba(16,185,129,0.35)";
        e.currentTarget.style.color        = "rgba(245,245,240,0.7)";
        e.currentTarget.style.transform    = "translate(0,0) scale(1)";
      }}
    >
      {children}
    </button>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────
function StatCell({ value, numericValue, suffix, label, delay }) {
  const [display, ref] = useCountUp(numericValue, 1600, suffix);
  return (
    <div
      ref={ref}
      className="reveal"
      data-delay={delay}
      style={{
        padding:    "52px 32px",
        textAlign:  "center",
      }}
    >
      <div style={{
        fontFamily:    "'Bebas Neue', sans-serif",
        fontSize:      "3.5rem",
        letterSpacing: "0.02em",
        color:         "var(--emerald)",
        lineHeight:    1,
        marginBottom:  "8px",
      }}>
        {display || value}
      </div>
      <div style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontSize:      "0.7rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color:         "var(--silver)",
      }}>
        {label}
      </div>
    </div>
  );
}

function StatsBar() {
  const stats = [
    { value: "10K+", numericValue: "10000", suffix: "+",  label: "Properties Listed" },
    { value: "98%",  numericValue: "98",    suffix: "%",  label: "Lead Capture Rate" },
    { value: "24/7", numericValue: "24/7",  suffix: "",   label: "AI Agent Uptime"   },
  ];
  return (
    <section style={{
      display:             "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      borderTop:    "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
    }}>
      {stats.map((s, i) => (
        <div
          key={i}
          style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}
        >
          <StatCell {...s} delay={i * 100} />
        </div>
      ))}
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "100px 8vw" }}>
      <p className="reveal" data-delay="0" style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "0.7rem", letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--emerald)",
        marginBottom: "20px",
      }}>
        The Process
      </p>
      <h2 className="reveal" data-delay="80" style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
        letterSpacing: "0.02em", color: "var(--white)",
        marginBottom: "60px", lineHeight: 0.95,
      }}>
        Three Steps.<br />Zero Missed Calls.
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "1px", background: "var(--border)",
        border: "1px solid var(--border)",
      }}>
        {[
          { num: "01", title: "Agent Lists",  desc: "Add your property in under 2 minutes. Photos, price, description — live instantly." },
          { num: "02", title: "AI Answers",   desc: "Every call gets picked up. Speaks Telugu, Hindi, English. Scores intent live." },
          { num: "03", title: "You Close",    desc: "See ranked leads on your dashboard. Hot leads ping your WhatsApp immediately." },
        ].map((s, i) => (
          <div
            key={i}
            className="reveal"
            data-delay={i * 100}
            style={{ background: "var(--deep)", padding: "44px 36px" }}
          >
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "4rem", color: "var(--iron)",
              lineHeight: 1, marginBottom: "20px",
            }}>
              {s.num}
            </div>
            <h3 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "1.6rem", letterSpacing: "0.02em",
              color: "var(--white)", marginBottom: "12px",
            }}>
              {s.title}
            </h3>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300, fontSize: "0.88rem",
              lineHeight: "1.75", color: "var(--silver)",
            }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Features Grid ─────────────────────────────────────────────────────────
function FeaturesGrid() {
  const features = [
    { num: "—01", title: "AI Voice Agent",    desc: "Answers every call. Speaks your language. Never sleeps." },
    { num: "—02", title: "Intent Scoring",    desc: "Know who's serious before you spend a minute calling back." },
    { num: "—03", title: "WhatsApp Alerts",   desc: "Hot leads ping your phone the moment they hang up." },
    { num: "—04", title: "3D Property Tour",  desc: "Clients walk through before they visit. More visits, better visits." },
    { num: "—05", title: "AR Brochure Scan",  desc: "Point camera at any printout. Unlock the full digital listing." },
    { num: "—06", title: "Smart Matching",    desc: "Cosine similarity surfaces the right listing for the right buyer." },
  ];

  return (
    <section style={{ padding: "0 8vw 100px" }}>
      <p className="reveal" data-delay="0" style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "0.7rem", letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--emerald)",
        marginBottom: "20px",
      }}>
        Platform Features
      </p>
      <h2 className="reveal" data-delay="80" style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
        letterSpacing: "0.02em", color: "var(--white)",
        marginBottom: "48px", lineHeight: 0.95,
      }}>
        Built For Agents<br />Who Move Fast.
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1px", background: "var(--border)",
        border: "1px solid var(--border)",
      }}>
        {features.map((f, i) => (
          <div
            key={i}
            className="reveal"
            data-delay={i * 80}
            style={{
              background: "var(--deep)", padding: "36px 32px",
              cursor: "default", transition: "background 0.25s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--steel)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--deep)"}
          >
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.7rem", letterSpacing: "0.1em",
              color: "var(--emerald)", marginBottom: "16px",
            }}>
              {f.num}
            </div>
            <h3 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "1.3rem", letterSpacing: "0.02em",
              color: "var(--white)", marginBottom: "10px",
            }}>
              {f.title}
            </h3>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300, fontSize: "0.85rem",
              lineHeight: "1.7", color: "var(--silver)",
            }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Agent CTA Banner ──────────────────────────────────────────────────────
function AgentCTA({ navigate }) {
  const ref = useMagnetic(0.2);
  return (
    <section style={{
      padding: "100px 8vw", textAlign: "center",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Emerald glow behind CTA */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "700px", height: "220px",
        background: "radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <p className="reveal" data-delay="0" style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "0.7rem", letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--emerald)",
        marginBottom: "20px",
      }}>
        Live Demo
      </p>
      <h2 className="reveal" data-delay="80" style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "clamp(3rem, 8vw, 7rem)",
        letterSpacing: "0.02em", color: "var(--white)",
        lineHeight: "0.9", marginBottom: "28px",
      }}>
        Talk to ATLAS.
      </h2>
      <p className="reveal" data-delay="160" style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 300, fontSize: "0.95rem",
        color: "var(--silver)", marginBottom: "40px",
      }}>
        Ask it anything. It knows every listing.
      </p>
      <div className="reveal" data-delay="240">
        <button
          ref={ref}
          onClick={() => navigate("/browse")}
          style={{
            fontFamily:    "'Space Grotesk', sans-serif",
            fontWeight:    600,
            fontSize:      "0.88rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            background:    "var(--emerald)",
            color:         "var(--void)",
            border:        "none",
            borderRadius:  "9999px",
            padding:       "16px 44px",
            cursor:        "pointer",
            transition:    "all 0.25s ease",
            boxShadow:     "0 0 16px rgba(16,185,129,0.3)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = "var(--emerald-lit)";
            e.currentTarget.style.boxShadow   = "0 0 36px rgba(16,185,129,0.55)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = "var(--emerald)";
            e.currentTarget.style.boxShadow   = "0 0 16px rgba(16,185,129,0.3)";
            e.currentTarget.style.transform   = "translate(0,0) scale(1)";
          }}
        >
          Try the AI Agent →
        </button>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      padding: "48px 8vw",
      display: "flex", justifyContent: "space-between",
      alignItems: "center", flexWrap: "wrap", gap: "16px",
      borderTop: "1px solid var(--border)",
    }}>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "1.8rem", letterSpacing: "0.02em",
        background: "linear-gradient(135deg, #10B981 0%, #34D8C4 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor:  "transparent",
        backgroundClip: "text",
      }}>
        ATLAS
      </div>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "0.75rem", letterSpacing: "0.06em",
        color: "var(--ghost)",
      }}>
        Built at Hackathon 2024 · Powered by Groq + n8n
      </div>
    </footer>
  );
}
