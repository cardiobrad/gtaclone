import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * GitHub Pages project site: https://cardiobrad.github.io/gtaclone/
 * Asset URLs in the production build are prefixed with this path.
 * Set VITE_BASE=/ when hosting at the domain root (see netlify.toml).
 */
const base = process.env.VITE_BASE || '/gtaclone/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
});
