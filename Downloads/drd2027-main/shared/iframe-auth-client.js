// iframe-auth-client.js
// Universal Authentication Client for Iframes
// Include this as the FIRST script in ALL service iframes
// Version: 2.0.0

(function() {
  'use strict';
  
  // Skip if we're the parent window
  if (window.self === window.top) return;
  
  // Prevent multiple initialization
  if (window.__IFRAME_AUTH_CLIENT_LOADED__) return;
  window.__IFRAME_AUTH_CLIENT_LOADED__ = true;

  // console.log('[IframeAuthClient] Initializing...');  // DISABLED - no auth logging on startup

  // ============================================
  // CONFIGURATION
  // ============================================

  const CONFIG = {
    // How long to wait for parent response (ms)
    REQUEST_TIMEOUT: 5000,
    
    // Retry attempts for initial auth
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    
    // Heartbeat interval to keep connection alive (ms)
    HEARTBEAT_INTERVAL: 30000,
    
    // Debug logging
    DEBUG: true
  };

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const state = {
    parentOrigin: null,
    iframeId: null,
    requestId: null,
    authenticated: false,
    userId: null,
    sessionId: null,
    user: null,
    connected: false,
    connectionAttempts: 0,
    lastAuthTime: null
  };

  const listeners = {
    authReady: [],
    authChanged: [],
    authError: [],
    authLogout: []
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function generateId() {
    return 'auth_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  function log(...args) {
    if (CONFIG.DEBUG) {
      console.log('[IframeAuthClient]', ...args);
    }
  }

  function warn(...args) {
    console.warn('[IframeAuthClient]', ...args);
  }

  function error(...args) {
    console.error('[IframeAuthClient]', ...args);
  }

  // ============================================
  // PARENT ORIGIN DETECTION
  // ============================================

  function detectParentOrigin() {
    // Method 1: URL parameter (most reliable)
    const params = new URLSearchParams(window.location.search);
    const authOrigin = params.get('auth_origin');
    
    if (authOrigin) {
      try {
        const decoded = decodeURIComponent(authOrigin);
        // Validate it's a proper URL
        new URL(decoded);
        state.parentOrigin = decoded;
        log('Parent origin from URL param:', state.parentOrigin);
        return true;
      } catch(e) {
        warn('Invalid auth_origin parameter:', authOrigin);
      }
    }

    // Method 2: Referrer
    // 🔧 FIX: Skip about:blank — its .origin is the string literal 'null', not a real origin.
    // When an iframe is set from about:blank then src changes, document.referrer = 'about:blank'
    // and new URL('about:blank').origin = 'null', poisoning state.parentOrigin with 'null'.
    if (document.referrer && document.referrer !== 'about:blank') {
      try {
        const url = new URL(document.referrer);
        const refOrigin = url.origin;
        // Extra guard: skip the literal string 'null' (sandboxed/opaque origins)
        if (refOrigin && refOrigin !== 'null') {
          state.parentOrigin = refOrigin;
          log('Parent origin from referrer:', state.parentOrigin);
          return true;
        }
      } catch(e) {
        warn('Invalid referrer:', document.referrer);
      }
    }

    // Method 3: Try direct access (will fail cross-origin, but we catch it)
    try {
      if (window.parent.location.origin) {
        state.parentOrigin = window.parent.location.origin;
        log('Parent origin from direct access:', state.parentOrigin);
        return true;
      }
    } catch(e) {
      // Expected for cross-origin
    }

    // Method 4: Fallback to document.origin if same-origin
    if (document.location.origin === window.parent.location?.origin) {
      state.parentOrigin = document.location.origin;
      return true;
    }

    error('CRITICAL: Cannot detect parent origin!');
    error('Solutions:');
    error('1. Add ?auth_origin=PARENT_URL to iframe src');
    error('2. Ensure document.referrer is available');
    error('3. Use same-origin deployment');
    
    return false;
  }

  // ============================================
  // MESSAGE HANDLING
  // ============================================

  function handleMessage(event) {
    // 🔧 FIX: If parentOrigin is still unknown or was poisoned with the string 'null'
    // (which happens when iframe starts as about:blank and referrer = 'about:blank'),
    // learn the real parent origin from the first trusted auth message.
    // This is the self-healing fallback so AUTH_RESPONSE is never silently ignored.
    if ((!state.parentOrigin || state.parentOrigin === 'null') &&
        event.origin && event.origin !== 'null') {
      const _d = event.data;
      if (_d && typeof _d === 'object' &&
          (_d.type === 'AUTH_RESPONSE' || _d.type === 'AUTH_CHANGED' ||
           _d.type === 'codebank:init'  || _d.type === 'auth:ready')) {
        state.parentOrigin = event.origin;
        log('Parent origin self-healed from first message:', state.parentOrigin);
      }
    }

    // SECURITY: Validate origin
    if (event.origin !== state.parentOrigin) {
      // Silently ignore - could be messages from other origins
      return;
    }

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    log('Received message:', data.type);

    switch(data.type) {
      case 'AUTH_RESPONSE':
        handleAuthResponse(data);
        break;
        
      case 'AUTH_CHANGED':
        handleAuthChanged(data);
        break;
        
      case 'AUTH_LOGOUT':
        handleAuthLogout(data);
        break;
        
      case 'AUTH_VALIDATE_RESPONSE':
        // Handle validation response if needed
        break;
        
      case 'AUTH_PONG':
        // Parent is alive
        state.connected = true;
        break;
        
      default:
        // Unknown message type
        break;
    }
  }

  function handleAuthResponse(data) {
    log('Auth response received:', {
      authenticated: data.authenticated,
      userId: data.userId
    });

    const wasAuthenticated = state.authenticated;
    
    state.authenticated = !!data.authenticated;
    state.userId = data.userId || null;
    state.sessionId = data.sessionId || null;
    state.user = data.user || null;
    state.lastAuthTime = Date.now();
    state.connected = true;

    // Update global flags
    updateGlobalState();

    // Dispatch events
    if (!wasAuthenticated && state.authenticated) {
      // First time auth
      dispatchEvent('authReady', {
        authenticated: true,
        userId: state.userId,
        sessionId: state.sessionId,
        user: state.user
      });
    }

    // Always dispatch ready event on first response
    if (!state.initialResponseReceived) {
      state.initialResponseReceived = true;
      dispatchEvent('authReady', {
        authenticated: state.authenticated,
        userId: state.userId,
        sessionId: state.sessionId,
        user: state.user,
        source: 'initial'
      });
    }
  }

  function handleAuthChanged(data) {
    log('Auth changed:', {
      from: state.authenticated,
      to: data.authenticated,
      userId: data.userId
    });

    const wasAuthenticated = state.authenticated;
    
    state.authenticated = !!data.authenticated;
    state.userId = data.userId || null;
    state.sessionId = data.sessionId || null;
    state.user = data.user || null;
    state.lastAuthTime = Date.now();

    updateGlobalState();

    dispatchEvent('authChanged', {
      authenticated: state.authenticated,
      userId: state.userId,
      sessionId: state.sessionId,
      user: state.user,
      wasAuthenticated: wasAuthenticated
    });
  }

  function handleAuthLogout(data) {
    log('Auth logout received');
    
    state.authenticated = false;
    state.userId = null;
    state.sessionId = null;
    state.user = null;

    updateGlobalState();

    dispatchEvent('authLogout', {});
  }

  // ============================================
  // EVENT SYSTEM
  // ============================================

  function dispatchEvent(type, detail) {
    // Internal listeners
    if (listeners[type]) {
      listeners[type].forEach(cb => {
        try {
          cb(detail);
        } catch(e) {
          error('Listener error:', e);
        }
      });
    }

    // DOM events for compatibility
    const eventName = 'auth:' + type.toLowerCase().replace(/([A-Z])/g, '-$1');
    try {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch(e) {
      // IE11 fallback if needed
    }

    // Also dispatch standard names
    const standardNames = {
      authReady: ['auth:ready', 'iframe:auth:ready'],
      authChanged: ['auth:changed', 'iframe:auth:changed'],
      authLogout: ['auth:logout', 'iframe:auth:logout'],
      authError: ['auth:error', 'iframe:auth:error']
    };

    if (standardNames[type]) {
      standardNames[type].forEach(name => {
        try {
          window.dispatchEvent(new CustomEvent(name, { detail }));
        } catch(e) {}
      });
    }
  }

  function addEventListener(type, callback) {
    if (!listeners[type]) {
      warn('Unknown event type:', type);
      return () => {};
    }
    
    listeners[type].push(callback);
    
    // Return unsubscribe function
    return () => {
      const idx = listeners[type].indexOf(callback);
      if (idx > -1) listeners[type].splice(idx, 1);
    };
  }

  // ============================================
  // COMMUNICATION WITH PARENT
  // ============================================

  function sendToParent(message) {
    if (!state.parentOrigin) {
      error('Cannot send message: no parent origin');
      return false;
    }

    try {
      window.parent.postMessage(message, state.parentOrigin);
      return true;
    } catch(e) {
      error('Failed to send message:', e);
      return false;
    }
  }

  function requestAuth() {
    if (!state.parentOrigin) {
      error('Cannot request auth: no parent origin');
      return false;
    }

    state.requestId = generateId();
    state.iframeId = window.name || document.title || 'iframe_' + generateId();

    log('Requesting auth from parent...');

    return sendToParent({
      type: 'AUTH_REQUEST',
      requestId: state.requestId,
      iframeId: state.iframeId,
      origin: window.location.origin,
      href: window.location.href,
      timestamp: Date.now()
    });
  }

  function refreshAuth() {
    log('Refreshing auth...');
    
    return sendToParent({
      type: 'AUTH_REFRESH',
      requestId: state.requestId,
      iframeId: state.iframeId,
      timestamp: Date.now()
    });
  }

  function validateAuth() {
    return sendToParent({
      type: 'AUTH_VALIDATE',
      requestId: state.requestId,
      iframeId: state.iframeId,
      sessionId: state.sessionId,
      timestamp: Date.now()
    });
  }

  function sendReadySignal() {
    return sendToParent({
      type: 'IFRAME_READY',
      requestId: state.requestId,
      iframeId: state.iframeId,
      timestamp: Date.now()
    });
  }

  function startHeartbeat() {
    setInterval(() => {
      sendToParent({
        type: 'AUTH_PING',
        requestId: state.requestId,
        iframeId: state.iframeId,
        timestamp: Date.now()
      });
    }, CONFIG.HEARTBEAT_INTERVAL);
  }

  // ============================================
  // GLOBAL INTERFACE
  // ============================================

  function updateGlobalState() {
    // Create window.Auth interface
    window.Auth = {
      isAuthenticated: () => state.authenticated,
      getStatus: () => state.authenticated ? 'authenticated' : (state.userId ? 'loading' : 'unauthenticated'),
      getUser: () => state.user || { id: state.userId },
      getToken: () => state.sessionId,
      getState: () => ({
        authenticated: state.authenticated,
        userId: state.userId,
        sessionId: state.sessionId,
        user: state.user
      }),
      refresh: () => {
        refreshAuth();
        return Promise.resolve(state.authenticated);
      },
      // 🔧 FIX 4: Prevent direct reload in iframe
      reload: () => {
        log('[Auth] Iframe reload requested, sending postMessage instead');
        sendToParent({ type: 'auth:done', timestamp: Date.now() });
      },
      onChange: (callback) => addEventListener('authChanged', callback),
      onReady: (callback) => addEventListener('authReady', callback),
      onLogout: (callback) => addEventListener('authLogout', callback),
      waitForAuth: (timeout = 10000) => {
        return new Promise((resolve) => {
          if (state.authenticated) {
            resolve(true);
            return;
          }
          
          const check = setInterval(() => {
            if (state.authenticated) {
              clearInterval(check);
              resolve(true);
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(check);
            resolve(false);
          }, timeout);
        });
      }
    };

    // Legacy compatibility flags
    window.__AUTH_READY__ = state.authenticated;
    window.authReady = state.authenticated;
    window.__AUTH_STATE__ = {
      authenticated: state.authenticated,
      userId: state.userId,
      sessionId: state.sessionId,
      user: state.user,
      timestamp: Date.now()
    };

    // Update __APP__ if exists
    if (!window.__APP__) {
      window.__APP__ = {};
    }
    window.__APP__.auth = window.Auth;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    log('Starting initialization...');

    // 1. Detect parent origin
    if (!detectParentOrigin()) {
      // Fatal: cannot proceed without parent origin
      dispatchEvent('authError', {
        error: 'Cannot detect parent origin',
        solutions: [
          'Add ?auth_origin=PARENT_URL to iframe src',
          'Ensure document.referrer is available'
        ]
      });
      return;
    }

    // 2. Setup message listener
    window.addEventListener('message', handleMessage);

    // 3. Generate IDs
    state.requestId = generateId();
    state.iframeId = window.name || document.title || 'iframe_' + generateId();

    // 4. Request initial auth with retries
    function tryRequest(attempt = 1) {
      log('Auth request attempt', attempt);
      
      requestAuth();
      
      // Wait for response
      setTimeout(() => {
        if (!state.initialResponseReceived && attempt < CONFIG.MAX_RETRIES) {
          tryRequest(attempt + 1);
        } else if (!state.initialResponseReceived) {
          // Max retries reached
          error('Failed to get auth response after', CONFIG.MAX_RETRIES, 'attempts');
          dispatchEvent('authError', {
            error: 'Auth request timeout',
            attempts: CONFIG.MAX_RETRIES
          });
        }
      }, CONFIG.REQUEST_TIMEOUT);
    }

    tryRequest();

    // 5. Start heartbeat
    startHeartbeat();

    // 6. Expose global API
    window.IframeAuthClient = {
      requestAuth,
      refreshAuth,
      validateAuth,
      getState: () => ({ ...state }),
      on: addEventListener,
      reconnect: () => {
        state.initialResponseReceived = false;
        tryRequest();
      }
    };

    log('Initialization complete, waiting for parent response...');
  }

  // Start immediately or on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();