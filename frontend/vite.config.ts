import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The SPA calls the API through this server (same origin), so the browser's Resource Timing API
 * exposes the real transferred sizes and the X-DB-Query-Count header without CORS.
 * In Docker, nginx plays the same role (see nginx/default.conf.template).
 */
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';
const proxy = {
  '/api': { target: backendUrl, changeOrigin: true },
  '/graphql': { target: backendUrl, changeOrigin: true },
  '/health': { target: backendUrl, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, strictPort: true, proxy },
  preview: { host: true, port: 5173, strictPort: true, proxy },
});
