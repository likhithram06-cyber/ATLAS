// What this file does: Vite + Tailwind v4 config with ATLAS v2 brand color tokens
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwind()],

  // Dev server — must use 'localhost' (not 127.0.0.1) so Firebase authorized domains work
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
  },

  // Tell Vite to treat .glb and .gltf as static assets
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.bin'],

  resolve: {
    dedupe: ['react', 'react-dom'],
  },

  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});