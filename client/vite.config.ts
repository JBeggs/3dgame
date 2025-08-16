import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Check if compressed assets exist and use them if available
const compressedAssetsPath = path.resolve('../dist-assets-compressed');
const useCompressedAssets = fs.existsSync(compressedAssetsPath);

if (useCompressedAssets) {
  console.log('✅ Using compressed assets for optimal loading performance');
} else {
  console.log('⚠️ Using uncompressed assets - run "npm run assets:compress" for better performance');
}

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true, // listen on 0.0.0.0 so LAN devices can connect
    port: 5173,
    fs: {
      // Allow serving files from compressed assets directory
      allow: ['..']
    }
  },
  preview: {
    host: true,
    port: 5173,
    fs: {
      allow: ['..']
    }
  },
  // Use compressed assets if available
  publicDir: useCompressedAssets ? compressedAssetsPath : 'public',
  assetsInclude: ['**/*.glb', '**/*.ktx2', '**/*.png', '**/*.jpg', '**/*.jpeg']
});


