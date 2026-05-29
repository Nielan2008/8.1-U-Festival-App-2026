import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['eight-1-u-festival-app-2026.onrender.com']
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['eight-1-u-festival-app-2026.onrender.com']
  }
})
