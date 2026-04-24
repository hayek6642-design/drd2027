/**
 * ⚠️ DEPRECATED: auth-global.js
 * 
 * This file has been DISABLED as part of the unified auth system overhaul.
 * All authentication now uses: window.AppState.auth (see app-state-unified.js)
 * 
 * DO NOT USE THIS FILE
 */

console.warn('[AUTH-GLOBAL] DEPRECATED - Use AppState.auth instead');

// Placeholder implementation
window.authGlobal = {
  init: () => console.warn('[AUTH-GLOBAL] Disabled'),
  verify: async () => { throw new Error('auth-global.js is disabled'); },
  logout: () => console.warn('[AUTH-GLOBAL] Disabled')
};
