import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const p = id.replace(/\\/g, '/');
          if (/node_modules\/(react|react-dom|scheduler)\//.test(p)) return 'react';
          if (/node_modules\/react-router/.test(p)) return 'router';
          if (/node_modules\/lucide-react/.test(p)) return 'icons';
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
