// What this file does: displays properties in a responsive grid layout with slide-in animations
import React from 'react';
import { motion } from 'framer-motion';
import PropertyCard from './PropertyCard';

export default function PropertyGrid({ properties, onCardClick, savedIds = [], onSaveToggle }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {properties.map((p, i) => (
        <motion.div
          key={p._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.04 }}
        >
          <PropertyCard
            property={p}
            onClick={onCardClick}
            savedIds={savedIds}
            onSaveToggle={onSaveToggle}
          />
        </motion.div>
      ))}
    </div>
  );
}
