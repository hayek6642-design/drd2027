/**
 * init.js - App Initialization & Dependency Loading
 * Ensures all core modules load in the correct order
 */

console.log('[Init] Starting app initialization...');

// Track loaded modules
window.__LOADED_MODULES__ = window.__LOADED_MODULES__ || {};

/**
 * Load script dynamically
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      console.log(`[Init] ✅ Loaded: ${src}`);
      resolve();
    };
    script.onerror = () => {
      console.warn(`[Init] ⚠️  Failed to load: ${src}`);
      resolve(); // Don't fail, continue with polyfills
    };
    document.head.appendChild(script);
  });
}

/**
 * Initialize in correct order
 */
async function initApp() {
  try {
    // Phase 1: Load core dependencies (in order)
    console.log('[Init] Phase 1: Loading core modules...');
    
    const coreModules = [
      '/asset-mirror.js',
      '/performance-monitor.js',
      '/auth-unified.js',
      '/guardian-3d.js',
      '/assets-direct.js'
    ];

    for (const module of coreModules) {
      await loadScript(module);
    }

    // Phase 2: Wait for DOM to be ready
    console.log('[Init] Phase 2: Waiting for DOM...');
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    // Phase 3: Initialize core systems
    console.log('[Init] Phase 3: Initializing core systems...');
    
    if (window.authUnified) {
      console.log('[Init] AuthUnified ready');
    }
    
    if (window.assetMirror) {
      console.log('[Init] AssetMirror ready');
    }
    
    if (window.performanceMonitor) {
      console.log('[Init] PerformanceMonitor ready');
    }

    console.log('[Init] ✅ App initialization complete');
    window.__APP_INITIALIZED__ = true;
    window.dispatchEvent(new Event('app:initialized'));

  } catch (e) {
    console.error('[Init] ❌ Initialization failed:', e);
  }
}

// Start immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for debugging
window.initApp = initApp;
