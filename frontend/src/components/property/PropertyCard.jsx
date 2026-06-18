// src/components/property/PropertyCard.jsx
// What this file does: displays a single property as a card in the browse grid
// No Atropos. Uses CSS hover transitions only.

import { Heart, MapPin, BedDouble, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import { getImageUrl } from "../../utils/imageUrl";

// What this does: formats a number like 7500000 → "₹75 L" or "₹1.5 Cr"
function formatPrice(price) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  return `₹${(price / 100000).toFixed(0)} L`;
}

export default function PropertyCard({ property, onClick, savedIds = [], onSaveToggle }) {
  const isSaved = savedIds.includes(property._id);

  // What this does: stops click from bubbling to the card when saving
  function handleSave(e) {
    e.stopPropagation();
    if (onSaveToggle) onSaveToggle(property._id);
  }

  return (
    <motion.div
      className="property-card"
      onClick={() => onClick && onClick(property)}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        background:   "var(--bg-card-surface)",
        border:       "1px solid var(--border)",
        borderRadius: "12px",
        overflow:     "hidden",
        cursor:       "pointer",
        position:     "relative",
        transition:   "border-color 0.25s ease, box-shadow 0.25s ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--border-hover)";
        e.currentTarget.style.boxShadow   = "0 8px 32px rgba(196, 132, 58, 0.12)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow   = "none";
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", height: "220px", overflow: "hidden" }}>
        <img
          src={getImageUrl(property.images?.[0])}
          alt={property.title}
          style={{
            width:      "100%",
            height:     "100%",
            objectFit:  "cover",
            transition: "transform 0.4s ease",
          }}
          onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
          onMouseLeave={e => e.target.style.transform = "scale(1)"}
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          style={{
            position:        "absolute",
            top:             "12px",
            right:           "12px",
            background:      "rgba(14, 10, 6, 0.7)",
            border:          "1px solid var(--border)",
            borderRadius:    "50%",
            width:           "36px",
            height:          "36px",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            cursor:          "pointer",
            backdropFilter:  "blur(8px)",
          }}
        >
          <Heart
            size={16}
            fill={isSaved ? "var(--amber)" : "none"}
            stroke={isSaved ? "var(--amber)" : "var(--parchment)"}
          />
        </button>

        {/* BHK badge */}
        <div
          style={{
            position:       "absolute",
            bottom:         "12px",
            left:           "12px",
            background:     "rgba(14, 10, 6, 0.8)",
            border:         "1px solid var(--border-glow)",
            borderRadius:   "6px",
            padding:        "4px 10px",
            fontSize:       "11px",
            fontFamily:     "Space Grotesk, sans-serif",
            letterSpacing:  "0.08em",
            textTransform:  "uppercase",
            color:          "var(--gold)",
          }}
        >
          {property.bhk} BHK
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: "16px" }}>
        {/* Title */}
        <h3 style={{
          fontFamily:    "Anton, sans-serif",
          fontSize:      "1.15rem",
          letterSpacing: "-0.02em",
          color:         "var(--cream)",
          marginBottom:  "6px",
        }}>
          {property.title}
        </h3>

        {/* Location */}
        <div style={{
          display:       "flex",
          alignItems:    "center",
          gap:           "4px",
          marginBottom:  "12px",
          color:         "var(--ash)",
          fontSize:      "13px",
        }}>
          <MapPin size={12} stroke="var(--bronze)" />
          {property.location}
        </div>

        {/* Price + sqft row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontFamily:    "Anton, sans-serif",
            fontSize:      "1.3rem",
            letterSpacing: "-0.02em",
            color:         "var(--amber)",
          }}>
            {formatPrice(property.price)}
          </span>

          {property.sqft && (
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        "4px",
              color:      "var(--ash)",
              fontSize:   "12px",
            }}>
              <Maximize2 size={12} />
              {property.sqft} sqft
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
