/**
 * ⚠️ DEPRECATED: auth-core.js
 * 
 * This file has been DISABLED as part of the unified auth system overhaul.
 * All authentication now uses: window.AppState.auth (see app-state-unified.js)
 * 
 * DO NOT USE THIS FILE
 */

console.warn('[AUTH-CORE] DEPRECATED - Use AppState.auth instead');

// Placeholder exports to prevent import errors
export const AuthCore = {
  init: () => console.warn('[AUTH-CORE] Disabled'),
  verify: async () => { throw new Error('auth-core.js is disabled'); },
  logout: () => console.warn('[AUTH-CORE] Disabled')
};

export default AuthCore;
