// What this file does: Vite + Tailwind v4 config with ATLAS v2 brand color tokens
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwind()],

  // Tell Vite to treat .glb and .gltf as static assets — serve them as-is
  // Without this, Vite intercepts /models/house.glb and returns HTML (404 page)
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.bin'],

  resolve: {
    // Prevent duplicate React / Three copies — breaks @react-three/fiber Canvas
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
    // Exclude drei from pre-bundling — it uses dynamic imports that break with optimizeDeps
    exclude: ['@react-three/drei'],
  },
});