/**
 * AUTH-GLOBAL.js - Global Authentication Singleton
 * 
 * PURPOSE: Replace all auth-core.js, bridge files, and scattered auth logic.
 * USAGE: Include this script in indexCB.html and yt-new-clear.html (parent windows ONLY).
 * Iframes should use service-auth.js instead.
 * 
 * This file handles:
 * - Reading session from localStorage on page load
 * - Setting window.AUTH_GLOBAL
 * - Providing AuthAPI for iframes to query
 * - Broadcasting auth changes to all iframes
 * - Token refresh logic
 */

(function initGlobalAuth() {
  'use strict';

  // Prevent double-init
  if (window.__AUTH_GLOBAL_INITIALIZED) return;
  window.__AUTH_GLOBAL_INITIALIZED = true;

  const SESSION_KEY = 'codebank_session';
  const TOKEN_COOKIE = 'cb_token';
  // REMOVED: LOGIN_URL redirect - stay on page as guest instead

  // ── Helpers ──────────────────────────────────────────────

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function clearAuth() {
    window.AUTH_GLOBAL = null;
    localStorage.removeItem(SESSION_KEY);
    document.cookie = TOKEN_COOKIE + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  // ── Restore session from localStorage ────────────────────

  if (!window.AUTH_GLOBAL) {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.expiresAt && session.expiresAt > Date.now()) {
          window.AUTH_GLOBAL = session;
        } else {
          clearAuth();
          console.log('[Auth] Session expired - continuing as guest');
          // Stay on page as guest instead of redirect
          return;
        }
      } catch (e) {
        clearAuth();
        console.log('[Auth] Session parse error - continuing as guest');
        return;
      }
    } else {
      // No session at all — stay on page as guest
      console.log('[Auth] No session - continuing as guest');
      return;
    }
  }

  // ── Public AuthAPI (used by iframes via postMessage) ─────

  window.AuthAPI = {
    getSession: function () {
      return window.AUTH_GLOBAL;
    },

    isAuthenticated: function () {
      return (
        window.AUTH_GLOBAL &&
        window.AUTH_GLOBAL.authenticated === true &&
        window.AUTH_GLOBAL.expiresAt > Date.now()
      );
    },

    getToken: function () {
      return getCookie(TOKEN_COOKIE);
    },

    logout: function () {
      clearAuth();
      // Notify all iframes before redirect
      window.broadcastAuth(null);
      // Stay on page after logout instead of redirecting
      console.log('[Auth] Logged out - staying on page as guest');
    },

    /**
     * Called from login.html after successful authentication.
     * @param {Object} session - { userId, email, sessionId, authenticated, timestamp, expiresAt, permissions }
     * @param {string} jwt - JWT token string
     */
    setSession: function (session, jwt) {
      window.AUTH_GLOBAL = session;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      if (jwt) {
        document.cookie =
          TOKEN_COOKIE + '=' + encodeURIComponent(jwt) +
          '; path=/; max-age=86400; SameSite=Strict';
      }
      window.broadcastAuth(session);
    }
  };

  // ── Iframe message handler ───────────────────────────────

  function handleIframeMessage(event) {
    if (!event.data || typeof event.data.type !== 'string') return;

    switch (event.data.type) {
      case 'auth:request':
        if (event.source) {
          event.source.postMessage({
            type: 'auth:response',
            auth: window.AuthAPI.getSession(),
            token: window.AuthAPI.getToken()
          }, '*');
        }
        break;

      case 'auth:refresh':
        // Token refresh — re-read from cookie/storage and broadcast
        var freshStored = localStorage.getItem(SESSION_KEY);
        if (freshStored) {
          try {
            window.AUTH_GLOBAL = JSON.parse(freshStored);
          } catch (e) { /* ignore */ }
        }
        if (event.source) {
          event.source.postMessage({
            type: 'auth:response',
            auth: window.AUTH_GLOBAL,
            token: window.AuthAPI.getToken()
          }, '*');
        }
        break;

      case 'auth:logout':
        window.AuthAPI.logout();
        break;
    }
  }

  window.addEventListener('message', handleIframeMessage);

  // ── Broadcast to all child iframes ───────────────────────

  window.broadcastAuth = function (authData) {
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      try {
        iframes[i].contentWindow.postMessage({
          type: 'auth:update',
          auth: authData
        }, '*');
      } catch (e) { /* cross-origin ignore */ }
    }
  };

  // ── Periodic expiry check (every 60s) ────────────────────

  setInterval(function () {
    if (window.AUTH_GLOBAL && window.AUTH_GLOBAL.expiresAt <= Date.now()) {
      console.warn('[Auth] Session expired');
      window.AuthAPI.logout();
    }
  }, 60000);

  console.log('[Auth] Global auth initialized for user:', window.AUTH_GLOBAL?.userId);
})();
