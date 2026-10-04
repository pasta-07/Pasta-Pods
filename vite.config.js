import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures assets load correctly on GitHub Pages, Vercel, and Render
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
