import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    },
    
    rollupOptions: {
      output: {
        chunkFileNames: 'chunks/[name].[hash].js',
        entryFileNames: '[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    },
    
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false
  },
  
  server: {
    port: 3000,
    strictPort: false,
    host: '0.0.0.0',
    cors: true,
    sourcemap: false,
    middlewareMode: false
  },
  
  preview: {
    port: 4173,
    strictPort: false,
    host: '0.0.0.0'
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['src/services/**', 'src/admin/**']
  },
  
  logLevel: 'warn'
});
