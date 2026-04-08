import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    cssMinify: true,
    
    // Code splitting
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        codebank: resolve(__dirname, 'codebank/indexCB.html'),
        e7ki: resolve(__dirname, 'services/e7ki/index.html'),
        farragna: resolve(__dirname, 'services/farragna/index.html'),
        samman: resolve(__dirname, 'services/samman/index.html'),
        pebalaash: resolve(__dirname, 'services/pebalaash/index.html'),
        eb3at: resolve(__dirname, 'services/eb3at/index.html'),
        games: resolve(__dirname, 'services/games/index.html'),
        battalooda: resolve(__dirname, 'battalooda/index.html')
      },
      output: {
        manualChunks: {
          // Shared vendor chunks
          'vendor-auth': ['./shared/auth-core.js', './shared/iframe-auth-client.js'],
          'vendor-service': ['./shared/service-base.js', './shared/service-manager-v3.js'],
          'vendor-crypto': ['./battalooda/battalooda-crypto.js'],
          
          // Feature chunks
          'ui-components': ['./shared/ui-kit.js'],
          'utils': ['./shared/utils.js']
        }
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    
    // Asset optimization
    assetsInlineLimit: 4096,
    
    // Source maps for debugging
    sourcemap: process.env.NODE_ENV !== 'production'
  },
  
  // Development server
  server: {
    port: 3000,
    strictPort: true,
    cors: true
  },
  
  // Optimizations
  optimizeDeps: {
    include: ['wavesurfer.js']
  }
});