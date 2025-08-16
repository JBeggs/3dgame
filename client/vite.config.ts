import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true, // listen on 0.0.0.0 so LAN devices can connect
    port: 5173,
  },
  preview: {
    host: true,
    port: 5173,
  },
});


