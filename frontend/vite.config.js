// What this file does: Vite + Tailwind v4 config with ATLAS v2 brand color tokens
import { defineConfig } from 'vite';
import react    from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwind()],
});
