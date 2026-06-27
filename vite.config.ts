import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // Permettre un fallback si le port est occupé
    host: true,
    hmr: {
      overlay: true,
      timeout: 30000, // Augmenter le timeout HMR
    },
    proxy: {
      '/api-tavily': {
        target: 'https://api.tavily.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-tavily/, '')
      },
      '/api-brightdata': {
        target: 'https://api.brightdata.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-brightdata/, '')
      }
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignorer certains warnings non critiques
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        warn(warning)
      },
    },
  },
})

