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
        drop_console: true,
        drop_debugger: true
      }
    },
    
    rollupOptions: {
      output: {
        manualChunks: {
          'core-auth': ['src/core/auth-core.js', 'src/core/session-manager-v2.js'],
          'core-services': ['src/core/service-manager-v2.js', 'src/core/assetbus-v2.js', 'src/core/watch-dog-v2.js'],
          'api-bankode': ['src/api/bankode-core.js', 'src/api/bankode-ledger.js'],
          'api-safecode': ['src/api/safecode-core.js', 'src/api/safecode-validation.js'],
          'ui-components': ['src/components/app-launcher.js', 'src/components/app-grid.js', 'src/components/service-container.js'],
          'admin-module': ['src/admin/admin-dashboard.js', 'src/admin/admin-routes.js'],
          'utils': ['src/utils/helpers.js', 'src/utils/formatters.js', 'src/utils/validators.js'],
          'styles': ['src/styles/index.css', 'src/styles/theme.css']
        },
        
        chunkFileNames: 'chunks/[name].[hash].js',
        entryFileNames: '[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    },
    
    chunkSizeWarningLimit: 500,
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