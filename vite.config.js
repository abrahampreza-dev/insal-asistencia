import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separar Firebase y framer-motion: caché estable entre deploys
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
          'framer-motion': ['framer-motion'],
        },
      },
    },
  },
});
