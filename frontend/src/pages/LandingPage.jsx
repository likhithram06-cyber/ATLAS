// src/pages/LandingPage.jsx
// What this file does: ATLAS hero — Background video with cursor parallax + depth text + Twilight / Forest palette

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar      from "../components/Navbar";

// ── Mouse tracking hook ───────────────────────────────────────────────────
// Returns:
//   px, py  — pixel offsets         (fed to CSS layers for parallax)
function useMouseTracking() {
  const [state, setState] = useState({ px: 0, py: 0 });
  const target  = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf     = useRef(null);
  function lerp(a, b, t) { return a + (b - a) * t; }
  useEffect(() => {
    function onMove(e) {
      target.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    }
    function animate() {
      current.current.x = lerp(current.current.x, target.current.x, 0.06);
      current.current.y = lerp(current.current.y, target.current.y, 0.06);
      setState({
        px: current.current.x * 38,   // pixel offset for parallax layers
        py: current.current.y * 18,
      });
      raf.current = requestAnimationFrame(animate);
    }
    window.addEventListener("mousemove", onMove);
    raf.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);
  return state;
}

function getT(px, py, mult) {
  return `translate(${px * mult}px, ${py * mult}px)`;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const mouse    = useMouseTracking();

  return (
    <div style={{ background: "var(--void)", minHeight: "100vh", overflow: "hidden" }}>
      <Navbar />

      {/* ════════════════════════════════════════════
          HERO — full viewport with video background
          ════════════════════════════════════════════ */}
      <section style={{ position: "relative", height: "100dvh", overflow: "hidden" }}>

        {/* ── LAYER 0: Background video (luxury home at dusk) ── */}
        <div
          style={{
            position:   "absolute",
            inset:      0,
            zIndex:     0,
            overflow:   "hidden",
            transform:  `${getT(mouse.px, mouse.py, 0.1)} scale(1.04)`,
            transition: "transform 0.1s linear",
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.35) saturate(0.85) contrast(1.1)",
            }}
          >
            <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Subtle vignette overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(5,8,17,0.85) 100%)",
        }} />

        {/* ── LAYER 10: Hero Text overlay ── */}
        <div
          style={{
            position:       "absolute",
            inset:          0,
            zIndex:         10,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            transform:      getT(mouse.px, mouse.py, 0.14),
            transition:     "transform 0.1s linear",
            pointerEvents:  "none",
            userSelect:     "none",
          }}
        >
          {/* LINE 1: "FIND WHERE" */}
          <div style={{
            fontFamily:    "'Bebas Neue', sans-serif",
            fontSize:      "clamp(5rem, 14vw, 13rem)",
            lineHeight:    "0.88",
            letterSpacing: "0.04em",
            color:         "var(--white)",
            width:         "100%",
            textAlign:     "center",
            animation:     "fadeUp 1s 0.1s cubic-bezier(0.16,1,0.3,1) forwards",
            opacity:       0,
          }}>
            FIND WHERE
          </div>

          {/* LINE 2: "YOU BELONG." ── warm cozy glowing amber */}
          <div style={{
            fontFamily:    "'Bebas Neue', sans-serif",
            fontSize:      "clamp(5rem, 14vw, 13rem)",
            lineHeight:    "0.88",
            letterSpacing: "0.04em",
            color:         "var(--hazegold)",
            width:         "100%",
            textAlign:     "center",
            animation:     "fadeUp 1s 0.2s cubic-bezier(0.16,1,0.3,1) forwards",
            opacity:       0,
            marginTop:     "15px",
          }}>
            YOU BELONG.
          </div>
        </div>

        {/* ── LAYER 50: UI — bottom copy + CTA ── */}
        <div
          style={{
            position:  "absolute",
            bottom:    0, left: 0, right: 0,
            zIndex:    50,
            padding:   "0 5vw 48px",
            display:   "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap:       "24px",
            flexWrap:  "wrap",
          }}
        >
          {/* Bottom-left: descriptor */}
          <div
            className="anim-fade-up"
            style={{ animationDelay: "0.7s", maxWidth: "280px" }}
          >
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize:   "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color:      "var(--hazegold)",
              marginBottom: "10px",
            }}>
              AI-Powered Real Estate
            </p>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize:   "0.85rem",
              lineHeight: "1.75",
              color:      "rgba(248,250,252,0.55)",
            }}>
              Every missed call is a lost deal. ATLAS answers 24/7,
              scores every lead live, and alerts you the moment
              someone is serious.
            </p>
          </div>

          {/* Bottom-right: CTA */}
          <div
            className="anim-fade-up"
            style={{ animationDelay: "0.85s", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "16px" }}
          >
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize:   "0.85rem",
              lineHeight: "1.75",
              color:      "rgba(248,250,252,0.55)",
              maxWidth:   "260px",
              textAlign:  "right",
            }}>
              Browse listings, talk to our AI agent,
              and experience properties via cinematic previews —
              before you ever visit.
            </p>

            {/* Primary button */}
            <button
              onClick={() => navigate("/browse")}
              style={{
                fontFamily:    "'Space Grotesk', sans-serif",
                fontWeight:    600,
                fontSize:      "0.85rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background:    "var(--hazegold)",
                color:         "var(--void)",
                border:        "none",
                borderRadius:  "2px",
                padding:       "14px 32px",
                cursor:        "pointer",
                transition:    "background 0.2s, transform 0.15s",
              }}
              onMouseEnter={e => { e.target.style.background = "var(--hazelight)"; e.target.style.transform = "scale(1.03)"; }}
              onMouseLeave={e => { e.target.style.background = "var(--hazegold)"; e.target.style.transform = "scale(1)"; }}
            >
              Explore Homes →
            </button>

            {/* Ghost secondary button */}
            <button
              onClick={() => navigate("/login")}
              style={{
                fontFamily:    "'Space Grotesk', sans-serif",
                fontWeight:    500,
                fontSize:      "0.8rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background:    "transparent",
                color:         "rgba(248,250,252,0.5)",
                border:        "1px solid rgba(248,250,252,0.15)",
                borderRadius:  "2px",
                padding:       "11px 28px",
                cursor:        "pointer",
                transition:    "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={e => { e.target.style.borderColor = "rgba(245,158,11,0.5)"; e.target.style.color = "var(--hazegold)"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(248,250,252,0.15)"; e.target.style.color = "rgba(248,250,252,0.5)"; }}
            >
              Agent Login
            </button>
          </div>
        </div>

        {/* Bottom gradient — fades hero into page */}
        <div style={{
          position:   "absolute",
          bottom:     0, left: 0, right: 0,
          height:     "220px",
          background: "linear-gradient(to top, var(--void) 0%, transparent 100%)",
          zIndex:     45,
          pointerEvents: "none",
        }} />

      </section>

      {/* ════════════════════════
          BELOW FOLD SECTIONS
          ════════════════════════ */}
      <StatsBar />
      <HowItWorks />
      <FeaturesGrid />
      <AgentCTA navigate={navigate} />
      <Footer />
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────
function StatsBar() {
  return (
    <section style={{
      display:             "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      borderTop:    "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
    }}>
      {[
        { value: "10K+", label: "Properties Listed" },
        { value: "98%",  label: "Lead Capture Rate" },
        { value: "24/7", label: "AI Agent Uptime"   },
      ].map((s, i) => (
        <div key={i} style={{
          padding:    "48px 32px",
          textAlign:  "center",
          borderRight: i < 2 ? "1px solid var(--border)" : "none",
        }}>
          <div style={{
            fontFamily:    "'Bebas Neue', sans-serif",
            fontSize:      "3.5rem",
            letterSpacing: "0.02em",
            color:         "var(--hazegold)",
            lineHeight:    1,
            marginBottom:  "8px",
          }}>
            {s.value}
          </div>
          <div style={{
            fontFamily:    "'Space Grotesk', sans-serif",
            fontSize:      "0.7rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color:         "var(--silver)",
          }}>
            {s.label}
          </div>
        </div>
      ))}
    </section>
  );
}

// ── How It Works ───────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "100px 8vw" }}>
      <p style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontSize:      "0.7rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color:         "var(--hazegold)",
        marginBottom:  "20px",
      }}>
        The Process
      </p>
      <h2 style={{
        fontFamily:    "'Bebas Neue', sans-serif",
        fontSize:      "clamp(2.5rem, 5vw, 4.5rem)",
        letterSpacing: "0.02em",
        color:         "var(--white)",
        marginBottom:  "60px",
        lineHeight:    0.95,
      }}>
        Three Steps.<br />Zero Missed Calls.
      </h2>

      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap:                 "1px",
        background:          "var(--border)",
        border:              "1px solid var(--border)",
      }}>
        {[
          { num: "01", title: "Agent Lists", desc: "Add your property in under 2 minutes. Photos, price, description — live instantly." },
          { num: "02", title: "AI Answers",  desc: "Every call gets picked up. Speaks Telugu, Hindi, English. Scores intent live." },
          { num: "03", title: "You Close",   desc: "See ranked leads on your dashboard. Hot leads ping your WhatsApp immediately." },
        ].map((s, i) => (
          <div key={i} style={{
            background: "var(--deep)",
            padding:    "44px 36px",
          }}>
            <div style={{
              fontFamily:    "'Bebas Neue', sans-serif",
              fontSize:      "4rem",
              color:         "var(--ghost)",
              lineHeight:    1,
              marginBottom:  "20px",
            }}>
              {s.num}
            </div>
            <h3 style={{
              fontFamily:    "'Bebas Neue', sans-serif",
              fontSize:      "1.6rem",
              letterSpacing: "0.02em",
              color:         "var(--white)",
              marginBottom:  "12px",
            }}>
              {s.title}
            </h3>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight:  300,
              fontSize:   "0.88rem",
              lineHeight: "1.75",
              color:      "var(--silver)",
            }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Features Grid ──────────────────────────────────────────────────────────
function FeaturesGrid() {
  const features = [
    { num: "—01", title: "AI Voice Agent",    desc: "Answers every call. Speaks your language. Never sleeps." },
    { num: "—02", title: "Intent Scoring",   desc: "Know who's serious before you spend a minute calling back." },
    { num: "—03", title: "WhatsApp Alerts",  desc: "Hot leads ping your phone the moment they hang up." },
    { num: "—04", title: "3D Property Tour", desc: "Clients walk through before they visit. More visits, better visits." },
    { num: "—05", title: "AR Brochure Scan", desc: "Point camera at any printout. Unlock the full digital listing." },
    { num: "—06", title: "Smart Matching",   desc: "Cosine similarity surfaces the right listing for the right buyer." },
  ];

  return (
    <section style={{ padding: "0 8vw 100px" }}>
      <p style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontSize:      "0.7rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color:         "var(--hazegold)",
        marginBottom:  "20px",
      }}>
        Platform Features
      </p>
      <h2 style={{
        fontFamily:    "'Bebas Neue', sans-serif",
        fontSize:      "clamp(2.5rem, 5vw, 4.5rem)",
        letterSpacing: "0.02em",
        color:         "var(--white)",
        marginBottom:  "48px",
        lineHeight:    0.95,
      }}>
        Built For Agents<br />Who Move Fast.
      </h2>

      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap:                 "1px",
        background:          "var(--border)",
        border:              "1px solid var(--border)",
      }}>
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              background:  "var(--deep)",
              padding:     "36px 32px",
              cursor:      "default",
              transition:  "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--steel)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--deep)"}
          >
            <div style={{
              fontFamily:    "'Space Grotesk', sans-serif",
              fontSize:      "0.7rem",
              letterSpacing: "0.1em",
              color:         "var(--hazegold)",
              marginBottom:  "16px",
            }}>
              {f.num}
            </div>
            <h3 style={{
              fontFamily:    "'Bebas Neue', sans-serif",
              fontSize:      "1.3rem",
              letterSpacing: "0.02em",
              color:         "var(--white)",
              marginBottom:  "10px",
            }}>
              {f.title}
            </h3>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight:  300,
              fontSize:   "0.85rem",
              lineHeight: "1.7",
              color:      "var(--silver)",
            }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Agent CTA Banner ───────────────────────────────────────────────────────
function AgentCTA({ navigate }) {
  return (
    <section style={{
      padding:     "100px 8vw",
      textAlign:   "center",
      borderTop:   "1px solid var(--border)",
      borderBottom:"1px solid var(--border)",
      position:    "relative",
      overflow:    "hidden",
    }}>
      {/* Subtle amber glow behind CTA */}
      <div style={{
        position:  "absolute",
        top:       "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width:     "600px", height: "200px",
        background:"radial-gradient(ellipse, rgba(200,150,60,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <p style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontSize:      "0.7rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color:         "var(--hazegold)",
        marginBottom:  "20px",
      }}>
        Live Demo
      </p>
      <h2 style={{
        fontFamily:    "'Bebas Neue', sans-serif",
        fontSize:      "clamp(3rem, 8vw, 7rem)",
        letterSpacing: "0.02em",
        color:         "var(--white)",
        lineHeight:    "0.9",
        marginBottom:  "28px",
      }}>
        Talk to ATLAS.
      </h2>
      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight:  300,
        fontSize:   "0.95rem",
        color:      "var(--silver)",
        marginBottom: "40px",
      }}>
        Ask it anything. It knows every listing.
      </p>
      <button
        onClick={() => navigate("/browse")}
        style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontWeight:    600,
          fontSize:      "0.85rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          background:    "var(--hazegold)",
          color:         "var(--void)",
          border:        "none",
          borderRadius:  "2px",
          padding:       "16px 40px",
          cursor:        "pointer",
          transition:    "background 0.2s, transform 0.15s",
        }}
        onMouseEnter={e => { e.target.style.background = "var(--hazelight)"; e.target.style.transform = "scale(1.03)"; }}
        onMouseLeave={e => { e.target.style.background = "var(--hazegold)"; e.target.style.transform = "scale(1)"; }}
      >
        Try the AI Agent →
      </button>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      padding:        "48px 8vw",
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "center",
      flexWrap:       "wrap",
      gap:            "16px",
      borderTop:      "1px solid var(--border)",
    }}>
      <div style={{
        fontFamily:    "'Bebas Neue', sans-serif",
        fontSize:      "1.8rem",
        letterSpacing: "0.02em",
        color:         "var(--hazegold)",
      }}>
        ATLAS
      </div>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize:   "0.75rem",
        letterSpacing: "0.06em",
        color:      "var(--ghost)",
      }}>
        Built at Hackathon 2024 · Powered by Groq + n8n
      </div>
    </footer>
  );
}
