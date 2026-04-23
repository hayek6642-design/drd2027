/**
 * SERVICE-AUTH.js - Authentication client for iframe services
 * 
 * PURPOSE: Drop into ANY service iframe (SafeCode, E7ki, Farragna, etc.)
 * to get auth state from the parent window.
 * 
 * USAGE:
 *   <script src="/shared/service-auth.js"></script>
 *   <script>
 *     const auth = new ServiceAuth();
 *     auth.onReady = function(session) {
 *       console.log('Authenticated as', session.userId);
 *       // Initialize your service here
 *     };
 *   </script>
 */

(function (global) {
  'use strict';

  function ServiceAuth() {
    this.auth = null;
    this.token = null;
    this.ready = false;
    this._readyCallbacks = [];

    var self = this;

    // Listen for auth messages from parent
    window.addEventListener('message', function (e) {
      if (!e.data || typeof e.data.type !== 'string') return;

      if (e.data.type === 'auth:response' || e.data.type === 'auth:update') {
        self.auth = e.data.auth;
        self.token = e.data.token || (e.data.auth && e.data.auth.token) || null;
        self.ready = true;

        // Fire ready callbacks
        for (var i = 0; i < self._readyCallbacks.length; i++) {
          try { self._readyCallbacks[i](self.auth); } catch (err) { console.error(err); }
        }
        self._readyCallbacks = [];

        // Call onReady hook if defined
        if (typeof self.onReady === 'function') {
          try { self.onReady(self.auth); } catch (err) { console.error(err); }
        }
      }
    });

    // Request auth from parent
    this._requestAuth();
  }

  ServiceAuth.prototype._requestAuth = function () {
    var self = this;
    var attempts = 0;
    var maxAttempts = 20; // 10 seconds

    function tryRequest() {
      if (self.ready) return;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'auth:request' }, '*');
      }
    }

    tryRequest();

    var interval = setInterval(function () {
      attempts++;
      if (self.ready || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!self.ready) {
          console.error('[ServiceAuth] Failed to get auth from parent after', maxAttempts, 'attempts');
          if (typeof self.onAuthFailed === 'function') {
            self.onAuthFailed();
          } else {
            self._showLoginRequired();
          }
        }
      } else {
        tryRequest();
      }
    }, 500);
  };

  /**
   * Wait for auth to be ready (Promise-like).
   * @param {Function} callback - Called with auth session when ready
   */
  ServiceAuth.prototype.whenReady = function (callback) {
    if (this.ready) {
      callback(this.auth);
    } else {
      this._readyCallbacks.push(callback);
    }
  };

  /**
   * Make an authenticated API call.
   * Automatically includes Authorization header.
   */
  ServiceAuth.prototype.apiCall = function (endpoint, options) {
    if (!this.token) {
      return Promise.reject(new Error('Not authenticated'));
    }

    options = options || {};
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + this.token;
    if (!options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }

    var self = this;
    return fetch(endpoint, options).then(function (response) {
      if (response.status === 401) {
        // Request token refresh from parent
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'auth:refresh' }, '*');
        }
        throw new Error('Session expired - refreshing');
      }
      return response;
    });
  };

  /**
   * Request logout via parent window.
   */
  ServiceAuth.prototype.logout = function () {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'auth:logout' }, '*');
    }
  };

  ServiceAuth.prototype._showLoginRequired = function () {
    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.85);display:flex;align-items:center;' +
      'justify-content:center;z-index:99999;color:#fff;font-family:sans-serif;';
    overlay.innerHTML =
      '<div style="text-align:center;padding:2rem;">' +
      '<h2 style="margin-bottom:1rem;">Authentication Required</h2>' +
      '<p style="margin-bottom:1.5rem;opacity:0.7;">Please login to access this service</p>' +
      '<a href="/login.html" target="_top" ' +
      'style="background:#4f46e5;color:#fff;padding:0.75rem 2rem;' +
      'border-radius:8px;text-decoration:none;font-weight:600;">Go to Login</a>' +
      '</div>';
    document.body.appendChild(overlay);
  };

  global.ServiceAuth = ServiceAuth;
})(window);
