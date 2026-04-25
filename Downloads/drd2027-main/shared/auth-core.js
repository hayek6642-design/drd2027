/**
 * ⚠️ DEPRECATED: auth-core.js
 * 
 * This file has been DISABLED as part of the unified auth system overhaul.
 * All authentication now uses: window.AppState.auth (see app-state-unified.js)
 * 
 * DO NOT USE THIS FILE
 */

console.warn('[AUTH-CORE] DEPRECATED - Use AppState.auth instead');

// Placeholder - no longer exports as ES module to avoid load errors
window.AuthCore = {
  init: () => console.warn('[AUTH-CORE] Disabled'),
  verify: async () => { throw new Error('auth-core.js is disabled'); },
  logout: () => console.warn('[AUTH-CORE] Disabled')
};
