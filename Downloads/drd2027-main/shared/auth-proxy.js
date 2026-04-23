(function(){
  /**
   * Smart Client Auth Proxy
   * Direct reading of parent state (window.top.__APP__)
   */
  function syncFromParent(){
    try {
      const app = window.top.__APP__;
      if (app && app.auth) {
        // Source of Truth injection
        window.Auth = app.auth;
        
        // Sync state flags for legacy code
        if (window.Auth.isAuthenticated()) {
          window.__AUTH_READY__ = true;
          window.authReady = true;
          console.log("✅ [AuthProxy] Auth synced from Parent Brain");
        }
        
        return true;
      }
    } catch(e){
      console.warn("⚠️ [AuthProxy] Cannot access parent directly (isolation?)");
    }
    return false;
  }

  // 🛡️ BLOCK IFRAME ESCAPE
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a && a.target === "_top") {
      e.preventDefault();
      console.warn("🚫 [Security] Blocked iframe escape to:", a.href);
    }
  }, true);

  // Disable window.open to prevent popups escaping
  const originalOpen = window.open;
  window.open = function(url, target) {
    if (target === "_top" || target === "_parent") {
      console.warn("🚫 [Security] Blocked window.open escape to:", url);
      return null;
    }
    return originalOpen.apply(window, arguments);
  };

  // Retry logic
  let retries = 20;
  function startSync(){
    if (syncFromParent()) return;
    if (retries-- > 0) setTimeout(startSync, 150);
  }

  if (window.self !== window.top) {
    startSync();
  }
})();
