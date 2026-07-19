import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  // Load env files (.env, .env.production, etc.) for the current mode.
  const env = loadEnv(mode, path.resolve(__dirname), '');

  // Guaranteed build-time fallbacks so the SPA never crashes on a missing var.
  // In production the Express server serves both API and static files on the same origin,
  // so the API base must be empty string (not '/') to avoid '//api/...' protocol-relative URLs.
  // Strip ALL leading/trailing slashes so we never end up with '//api/...'.
  const VITE_API_BASE = (env.VITE_API_BASE || '')
    .replace(/^\/+/, '')   // strip leading slashes
    .replace(/\/+$/, '')   // strip trailing slashes
    || '';
  const VITE_ENGINE_MODE = env.VITE_ENGINE_MODE || 'simulation';

  return {
    base: '/',
    define: {
      'import.meta.env.VITE_API_BASE': JSON.stringify(VITE_API_BASE),
      'import.meta.env.VITE_ENGINE_MODE': JSON.stringify(VITE_ENGINE_MODE),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Use hashed asset filenames to bust CDN caches and prevent stale JS references.
      rollupOptions: {
        output: {
          entryFileNames: 'assets/index.[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash][extname]',
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy API and WebSocket requests to Express backend
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://localhost:3000',
          ws: true,
        },
      },
    },
  };
});
