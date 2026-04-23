/**
 * CodeBank Service Sync
 * 
 * Universal synchronization module for all codebank services.
 * Handles:
 * - Auth state management and updates
 * - Storage (localStorage/sessionStorage) sync
 * - Asset snapshot reception
 * - Parent-to-iframe communication
 * 
 * Usage:
 * <script src="/shared/codebank-service-sync.js"></script>
 * <script>
 *   CodeBankServiceSync.onAuthReady((auth) => {
 *     console.log('Auth ready:', auth);
 *   });
 *   CodeBankServiceSync.onStorageChange((key, newValue) => {
 *     console.log('Storage changed:', key, newValue);
 *   });
 *   CodeBankServiceSync.onAssetsUpdate((assets) => {
 *     console.log('Assets updated:', assets);
 *   });
 * </script>
 */

const CodeBankServiceSync = (() => {
  const STATE = {
    authenticated: false,
    user: null,
    sessionId: null,
    token: null,
    assets: null,
    authCallbacks: [],
    storageCallbacks: [],
    assetsCallbacks: [],
    syncInProgress: false
  };

  // ─────────────────────────────────────────────────────────────
  // 1. REQUEST AUTH FROM PARENT
  // ─────────────────────────────────────────────────────────────
  const requestAuthFromParent = () => {
    try {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'codebank:auth-request',
          source: 'service',
          timestamp: Date.now()
        }, '*');
        console.log('[CodeBankServiceSync] Auth requested from parent');
      }
    } catch (e) {
      console.error('[CodeBankServiceSync] Failed to request auth:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. REQUEST ASSETS FROM PARENT
  // ─────────────────────────────────────────────────────────────
  const requestAssetsFromParent = () => {
    try {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'codebank:assets-request',
          source: 'service',
          timestamp: Date.now()
        }, '*');
        console.log('[CodeBankServiceSync] Assets requested from parent');
      }
    } catch (e) {
      console.error('[CodeBankServiceSync] Failed to request assets:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. HANDLE PARENT MESSAGES
  // ─────────────────────────────────────────────────────────────
  const handleParentMessage = (event) => {
    const data = event.data;
    if (!data) return;

    try {
      // Auth Ready Message
      if (data.type === 'auth:ready' || data.type === 'codebank:auth-response') {
        const authData = data.payload || data;
        STATE.authenticated = authData.authenticated !== false;
        STATE.user = authData.user || null;
        STATE.sessionId = authData.sessionId || null;
        STATE.token = authData.token || null;

        console.log('[CodeBankServiceSync] Auth received:', {
          authenticated: STATE.authenticated,
          user: STATE.user?.id || STATE.user?.email
        });

        // Trigger callbacks
        STATE.authCallbacks.forEach(cb => {
          try {
            cb({
              authenticated: STATE.authenticated,
              user: STATE.user,
              sessionId: STATE.sessionId,
              token: STATE.token
            });
          } catch (e) {
            console.error('[CodeBankServiceSync] Auth callback error:', e);
          }
        });
      }

      // Assets Update
      if (data.type === 'parent:assets-init' || data.type === 'assetbus:snapshot' || data.type === 'codebank:assets-response') {
        const assets = data.assets || data.data || data.payload;
        if (assets) {
          STATE.assets = assets;
          console.log('[CodeBankServiceSync] Assets received:', {
            codes: assets.codes?.length || 0,
            silver: assets.silver?.length || 0,
            gold: assets.gold?.length || 0
          });

          // Trigger callbacks
          STATE.assetsCallbacks.forEach(cb => {
            try {
              cb(assets);
            } catch (e) {
              console.error('[CodeBankServiceSync] Assets callback error:', e);
            }
          });
        }
      }

      // Storage Sync from Parent
      if (data.type === 'codebank:storage-sync') {
        const { key, value } = data;
        console.log('[CodeBankServiceSync] Storage sync from parent:', key);
        
        // Update local storage
        if (value === null) {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } else {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        }

        // Trigger callbacks
        STATE.storageCallbacks.forEach(cb => {
          try {
            cb(key, value);
          } catch (e) {
            console.error('[CodeBankServiceSync] Storage callback error:', e);
          }
        });
      }

      // Service Ready Acknowledgment
      if (data.type === 'codebank:service-ready') {
        console.log('[CodeBankServiceSync] Parent acknowledged service ready');
      }
    } catch (e) {
      console.error('[CodeBankServiceSync] Error handling parent message:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. LISTEN FOR STORAGE CHANGES
  // ─────────────────────────────────────────────────────────────
  const setupStorageListener = () => {
    window.addEventListener('storage', (event) => {
      if (event.key) {
        const newValue = event.newValue ? JSON.parse(event.newValue) : null;
        console.log('[CodeBankServiceSync] Storage changed:', event.key);

        STATE.storageCallbacks.forEach(cb => {
          try {
            cb(event.key, newValue);
          } catch (e) {
            console.error('[CodeBankServiceSync] Storage callback error:', e);
          }
        });
      }
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 5. REGISTER MESSAGE LISTENER
  // ─────────────────────────────────────────────────────────────
  const setupMessageListener = () => {
    window.addEventListener('message', handleParentMessage);
  };

  // ─────────────────────────────────────────────────────────────
  // 6. SEND SERVICE READY SIGNAL
  // ─────────────────────────────────────────────────────────────
  const sendServiceReady = () => {
    try {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'codebank:service-ready',
          source: 'service',
          timestamp: Date.now()
        }, '*');
        console.log('[CodeBankServiceSync] Service ready signal sent');
      }
    } catch (e) {
      console.error('[CodeBankServiceSync] Failed to send service ready:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7. PUBLIC API
  // ─────────────────────────────────────────────────────────────
  const publicAPI = {
    /**
     * Register callback for auth changes
     * @param {Function} callback - Called with {authenticated, user, sessionId, token}
     */
    onAuthReady(callback) {
      if (typeof callback === 'function') {
        STATE.authCallbacks.push(callback);
        // If already have auth, call immediately
        if (STATE.authenticated || STATE.user) {
          callback({
            authenticated: STATE.authenticated,
            user: STATE.user,
            sessionId: STATE.sessionId,
            token: STATE.token
          });
        }
      }
      return this;
    },

    /**
     * Register callback for storage changes
     * @param {Function} callback - Called with (key, newValue)
     */
    onStorageChange(callback) {
      if (typeof callback === 'function') {
        STATE.storageCallbacks.push(callback);
      }
      return this;
    },

    /**
     * Register callback for assets updates
     * @param {Function} callback - Called with (assets)
     */
    onAssetsUpdate(callback) {
      if (typeof callback === 'function') {
        STATE.assetsCallbacks.push(callback);
        // If already have assets, call immediately
        if (STATE.assets) {
          callback(STATE.assets);
        }
      }
      return this;
    },

    /**
     * Get current auth state
     */
    getAuth() {
      return {
        authenticated: STATE.authenticated,
        user: STATE.user,
        sessionId: STATE.sessionId,
        token: STATE.token
      };
    },

    /**
     * Get current assets
     */
    getAssets() {
      return STATE.assets;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
      return STATE.authenticated === true;
    },

    /**
     * Get user object
     */
    getUser() {
      return STATE.user || null;
    },

    /**
     * Get auth token
     */
    getToken() {
      return STATE.token || null;
    },

    /**
     * Request fresh auth from parent
     */
    refreshAuth() {
      requestAuthFromParent();
      return this;
    },

    /**
     * Request fresh assets from parent
     */
    refreshAssets() {
      requestAssetsFromParent();
      return this;
    },

    /**
     * Notify parent that service is loaded and ready
     */
    markReady() {
      sendServiceReady();
      return this;
    },

    /**
     * Initialize the sync system (called automatically, but can be called manually)
     */
    init() {
      if (STATE.syncInProgress) return this;
      STATE.syncInProgress = true;

      setupMessageListener();
      setupStorageListener();

      // Request initial data from parent
      requestAuthFromParent();
      requestAssetsFromParent();
      sendServiceReady();

      // Retry requests if no response after 3 seconds
      setTimeout(() => {
        if (!STATE.authenticated) {
          console.warn('[CodeBankServiceSync] No auth response after 3s, requesting again...');
          requestAuthFromParent();
        }
      }, 3000);

      return this;
    }
  };

  return publicAPI;
})();

// ─────────────────────────────────────────────────────────────
// AUTO-INITIALIZE ON LOAD
// ─────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CodeBankServiceSync.init();
  });
} else {
  CodeBankServiceSync.init();
}
