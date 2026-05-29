import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    allowedHosts: ['eight-1-u-festival-app-2026.onrender.com']
  }
})
