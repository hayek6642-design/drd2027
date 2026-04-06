import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'e7ki/client/src'),
    },
  },
  server: {
    // Proxy API calls to backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
    // Allow serving files from the parent codebank directory
    fs: {
      allow: ['.', '..'],
    },
  },
})
