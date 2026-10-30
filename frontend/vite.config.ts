import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      '/api/auth': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/dossiers': { target: 'http://localhost:3003', changeOrigin: true },
      '/api/decisions': { target: 'http://localhost:3006', changeOrigin: true },
      '/api/analyses': { target: 'http://localhost:3005', changeOrigin: true },
      '/api/chatbot': { target: 'http://localhost:3005', changeOrigin: true },
      '/api/documents': { target: 'http://localhost:3004', changeOrigin: true },
    },
  },
})
