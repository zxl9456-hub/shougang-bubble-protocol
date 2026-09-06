import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

// The game has no server routes. Pages loads the same React game directly.
export default defineConfig({
  root: fromRoot('./github-pages'),
  publicDir: fromRoot('./public'),
  base: `${basePath}/`,
  plugins: [react()],
  resolve: { alias: { '@': fromRoot('./') }, dedupe: ['react', 'react-dom'] },
  define: { 'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify(basePath) },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: fromRoot('./dist/github-pages'), emptyOutDir: true },
});
