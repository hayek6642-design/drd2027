// auth-ready-component.js
// Base class for components that depend on authentication
// Include in services that need auth state

(function() {
  'use strict';

  window.AuthReadyComponent = class AuthReadyComponent {
    constructor(options = {}) {
      this.options = {
        requireAuth: true,
        timeout: 10000,
        autoRetry: true,
        maxRetries: 3,
        onAuthReady: null,
        onAuthError: null,
        onNoAuth: null,
        ...options
      };
      
      this.authState = {
        ready: false,
        authenticated: false,
        user: null,
        retries: 0
      };
      
      this.init();
    }

    init() {
      // Wait for auth system to be available
      this.waitForAuthSystem().then(() => {
        this.setupAuthListeners();
        this.checkAuthState();
      });
    }

    async waitForAuthSystem() {
      return new Promise((resolve) => {
        const check = () => {
          if (window.Auth && typeof window.Auth.isAuthenticated === 'function') {
            resolve();
            return true;
          }
          return false;
        };
        
        if (check()) return;
        
        const interval = setInterval(() => {
          if (check()) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
        
        // Timeout fallback
        setTimeout(() => {
          clearInterval(interval);
          resolve(); // Resolve anyway to prevent hanging
        }, 5000);
      });
    }

    setupAuthListeners() {
      // Listen for auth ready event
      window.addEventListener('auth:ready', (e) => {
        this.handleAuthReady(e.detail);
      });
      
      // Listen for auth changes
      window.addEventListener('auth:changed', (e) => {
        this.handleAuthChanged(e.detail);
      });
      
      // Listen for logout
      window.addEventListener('auth:logout', () => {
        this.handleAuthLogout();
      });
      
      // Listen for errors
      window.addEventListener('auth:error', (e) => {
        this.handleAuthError(e.detail);
      });
    }

    checkAuthState() {
      const isAuth = window.Auth.isAuthenticated();
      const user = window.Auth.getUser ? window.Auth.getUser() : null;
      
      if (isAuth) {
        this.handleAuthReady({
          authenticated: true,
          userId: user?.id,
          user: user
        });
        return;
      }

      // FIX: If auth state was already received (even as guest/unauthenticated),
      // handle it immediately instead of waiting for auth:ready event (which already fired).
      // This prevents the 30-second "Max retries exceeded" race condition where
      // iframe-auth-client.js fires auth:ready before our listener is registered.
      const existingState = window.__AUTH_STATE__;
      const clientResolved = window.IframeAuthClient && window.IframeAuthClient.getState().initialResponseReceived;
      if ((existingState && existingState.timestamp) || clientResolved) {
        if (this.options.requireAuth) {
          // Auth resolved but user is not authenticated — show login/guest state immediately
          this.handleAuthReady({
            authenticated: false,
            userId: null,
            user: null
          });
        } else {
          this.handleNoAuth();
        }
        return;
      }

      if (this.options.requireAuth) {
        // Auth response not yet received, wait for the event
        this.waitForAuth();
      } else {
        // Auth not required, proceed without
        this.handleNoAuth();
      }
    }

    async waitForAuth() {
      if (this.authState.retries >= this.options.maxRetries) {
        this.handleAuthError({
          error: 'Max retries exceeded',
          retries: this.authState.retries
        });
        return;
      }

      this.authState.retries++;
      
      const timeout = setTimeout(() => {
        if (!this.authState.ready && this.options.autoRetry) {
          this.waitForAuth();
        }
      }, this.options.timeout);

      // Wait for auth:ready event
      const authPromise = new Promise((resolve) => {
        const handler = (e) => {
          window.removeEventListener('auth:ready', handler);
          clearTimeout(timeout);
          resolve(e.detail);
        };
        window.addEventListener('auth:ready', handler);
      });

      const result = await authPromise;
      this.handleAuthReady(result);
    }

    handleAuthReady(detail) {
      this.authState.ready = true;
      this.authState.authenticated = detail.authenticated;
      this.authState.user = detail.user || { id: detail.userId };
      
      if (this.options.onAuthReady) {
        this.options.onAuthReady(this.authState);
      }
      
      this.onAuthReady && this.onAuthReady(this.authState);
    }

    handleAuthChanged(detail) {
      this.authState.authenticated = detail.authenticated;
      this.authState.user = detail.user || { id: detail.userId };
      
      this.onAuthChanged && this.onAuthChanged(this.authState);
    }

    handleAuthLogout() {
      this.authState.authenticated = false;
      this.authState.user = null;
      
      this.onAuthLogout && this.onAuthLogout();
      
      if (this.options.requireAuth) {
        // Re-init if auth is required
        this.authState.ready = false;
        this.init();
      }
    }

    handleAuthError(error) {
      if (this.options.onAuthError) {
        this.options.onAuthError(error);
      }
      
      this.onAuthError && this.onAuthError(error);
    }

    handleNoAuth() {
      this.authState.ready = true;
      
      if (this.options.onNoAuth) {
        this.options.onNoAuth();
      }
      
      this.onNoAuth && this.onNoAuth();
    }

    // Override these in subclasses
    onAuthReady(state) {}
    onAuthChanged(state) {}
    onAuthLogout() {}
    onAuthError(error) {}
    onNoAuth() {}
  };

  // Helper function for simple auth waiting
  window.waitForAuth = function(options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Auth wait timeout'));
      }, options.timeout || 10000);
      
      const checkAuth = () => {
        if (window.Auth && window.Auth.isAuthenticated()) {
          clearTimeout(timeout);
          resolve(window.Auth.getState());
          return true;
        }
        return false;
      };
      
      if (checkAuth()) return;
      
      window.addEventListener('auth:ready', (e) => {
        if (e.detail.authenticated) {
          clearTimeout(timeout);
          resolve(e.detail);
        }
      });
      
      window.addEventListener('auth:error', (e) => {
        clearTimeout(timeout);
        reject(new Error(e.detail.error || 'Auth error'));
      });
    });
  };

  console.log('[AuthReadyComponent] Loaded');
})();