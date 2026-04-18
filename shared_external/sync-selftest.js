// ✅ sync-selftest.js
// Self-test module for CodeBank sync system
// Loaded by indexCB.html to validate client-server communication

(function() {
  'use strict';

  console.log('[SyncSelfTest] Module loaded');

  // Health check
  const SyncSelfTest = {
    version: '1.0.0',
    
    async checkConnectivity() {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        const data = await response.json();
        console.log('[SyncSelfTest] Connectivity check:', data);
        return { ok: true, data };
      } catch (err) {
        console.error('[SyncSelfTest] Connectivity failed:', err);
        return { ok: false, error: err.message };
      }
    },

    async validateSession() {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        return await response.json();
      } catch (err) {
        return { authenticated: false, error: err.message };
      }
    },

    async ping() {
      try {
        const response = await fetch('/ping', {
          credentials: 'include'
        });
        return await response.json();
      } catch (err) {
        console.error('[SyncSelfTest] Ping failed:', err);
        return { error: err.message };
      }
    }
  };

  // Export globally
  if (typeof window !== 'undefined') {
    window.SyncSelfTest = SyncSelfTest;
  }

  // For Node.js modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncSelfTest;
  }

  // Initialize
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      console.log('[SyncSelfTest] Ready');
    });
  }
})();