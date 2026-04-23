/**
 * SessionManager Loader & Initializer
 * Loads and initializes SessionManager on page load
 */

(async function initSessionManager() {
  try {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startInit);
    } else {
      startInit();
    }
    
    async function startInit() {
      console.log('[Init] Starting SessionManager initialization...');
      
      // Wait a tick to ensure script order
      await new Promise(r => setTimeout(r, 100));
      
      if (typeof SessionManager !== 'function') {
        console.error('[Init] SessionManager class not found!');
        return;
      }
      
      // Initialize SessionManager
      window.sessionManager = new SessionManager();
      console.log('[Init] ✅ SessionManager initialized successfully');
      console.log('[Init] Debug info:', window.sessionManager.getDebugInfo());
      
      // Dispatch custom event for other scripts to know SM is ready
      window.dispatchEvent(new CustomEvent('sessionManager:ready', {
        detail: { sessionManager: window.sessionManager }
      }));
    }
  } catch (error) {
    console.error('[Init] SessionManager initialization error:', error);
  }
})();
