/**
 * single-session.js
 * Enforces one-device-at-a-time sessions (WhatsApp-like).
 * Include AFTER auth-core.js in any page that should enforce single-device.
 *
 * Flow:
 *   1. On auth:ready (authenticated) → POST /api/session/takeover
 *      → server kicks old device via SSE + revokes its token
 *   2. SSE listener → if SESSION_TAKEN_OVER received → auto-logout + redirect
 *   3. Heartbeat every 45s → if server 401 (token revoked) → auto-logout + redirect
 */
;(function SingleSession() {
  'use strict';

  // Prevent double-init
  if (window.__SINGLE_SESSION_INIT__) return;
  window.__SINGLE_SESSION_INIT__ = true;

  var _heartbeatTimer = null;
  var _sseSource = null;
  var _takenOver = false;
  var _heartbeatFailCount = 0;
  var MAX_HEARTBEAT_FAILS = 2;

  // ── helpers ─────────────────────────────────────────────────────────────

  function _getToken() {
    var m = document.cookie.match(/(^|; )session_token=([^;]+)/);
    if (m) return decodeURIComponent(m[2]);
    return localStorage.getItem('session_token') || null;
  }

  function _clearAllSession() {
    // [EMERGENCY FIX] Do NOT clear session if user is legitimately authenticated
    if (localStorage.getItem('session_active') === 'true' && window.AuthCore && window.AuthCore.isAuthenticated?.()) {
      console.warn('[SingleSession] BLOCKED _clearAllSession - user is legitimately authenticated with session_active');
      return; // Don't clear anything
    }
    
    var keys = [
      'session_token', 'user_data', 'auth_timestamp',
      '__cached_user__', '__cached_session_id__', 'session_active',
      'safeCodes', 'bankode_codes', 'bankode_user_id', 'bankode_session',
      'bankode_snapshot', 'acc_assets', 'acc_balance'
    ];
    keys.forEach(function(k) { try { localStorage.removeItem(k); } catch(_) {} });

    // Expire session cookie
    try {
      document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
      document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure';
    } catch(_) {}

    // Clear CodeBank IDB snapshot
    try { indexedDB.deleteDatabase('CodeBankSnapshotDB'); } catch(_) {}
    try { indexedDB.deleteDatabase('AuthDB'); } catch(_) {}
  }

  function _stopAll() {
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
    if (_sseSource) { try { _sseSource.close(); } catch(_) {} _sseSource = null; }
  }

  function _handleKickout(newDevice) {
    if (_takenOver) return; // only once
    
    // [EMERGENCY FIX] Do NOT kickout if user is legitimately authenticated with session_active
    if (localStorage.getItem('session_active') === 'true' && window.AuthCore && window.AuthCore.isAuthenticated?.()) {
      console.warn('[SingleSession] BLOCKED _handleKickout - user is legitimately authenticated with session_active');
      return;
    }
    
    _takenOver = true;

    _stopAll();

    var msg = newDevice
      ? ('Your account was opened on ' + newDevice + '. You\'ve been signed out here.')
      : 'Your session was transferred to another device. Sign in here to continue.';

    try { sessionStorage.setItem('__kickout_reason__', msg); } catch(_) {}

    _clearAllSession();

    // Give AuthCore a chance to clean up
    try { if (window.Auth && window.Auth.logout) window.Auth.logout(); } catch(_) {}

    // Redirect
    setTimeout(function() {
      window.location.href = '/login.html?reason=kicked';
    }, 300);
  }

  // ── SSE listener ────────────────────────────────────────────────────────

  function _startSSE() {
    if (_sseSource) return;

    // Re-use existing global SSE source if already open
    if (window.__MAIN_SSE_SOURCE__ && window.__MAIN_SSE_SOURCE__.readyState !== 2) {
      _sseSource = window.__MAIN_SSE_SOURCE__;
    } else {
      try {
        _sseSource = new EventSource('/events');
        window.__MAIN_SSE_SOURCE__ = _sseSource;
      } catch(e) {
        console.warn('[SingleSession] Could not open SSE:', e.message);
        return;
      }
    }

    var _origOnMessage = _sseSource.onmessage;
    _sseSource.onmessage = function(e) {
      // Call any existing handler first
      if (typeof _origOnMessage === 'function') {
        try { _origOnMessage.call(_sseSource, e); } catch(_) {}
      }
      // Check for kickout
      try {
        var data = JSON.parse(e.data);
        if (data && data.type === 'SESSION_TAKEN_OVER') {
          _handleKickout(data.newDevice || null);
        }
      } catch(_) {}
    };

    // Also listen via window event (some pages forward SSE via CustomEvent)
    window.addEventListener('sse:message', function(e) {
      var data = e.detail || {};
      if (data.type === 'SESSION_TAKEN_OVER') {
        _handleKickout(data.newDevice || null);
      }
    });
  }

  // ── heartbeat ────────────────────────────────────────────────────────────

  function _startHeartbeat() {
    if (_heartbeatTimer) return;

    _heartbeatTimer = setInterval(function() {
      var token = _getToken();
      if (!token) { _stopAll(); return; }

      fetch('/api/session/heartbeat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      }).then(function(r) {
        if (r.status === 401 || r.status === 403) {
          // [EMERGENCY FIX] If session_active is set, don't count this as a real failure
          if (localStorage.getItem('session_active') === 'true') {
            console.warn('[SingleSession] Got 401/403 but session_active is set - ignoring heartbeat failure');
            _heartbeatFailCount = 0; // reset to prevent kickout
            return;
          }
          
          _heartbeatFailCount++;
          if (_heartbeatFailCount >= MAX_HEARTBEAT_FAILS) {
            _handleKickout(null);
          }
        } else {
          _heartbeatFailCount = 0; // reset on success
        }
      }).catch(function() {
        // network error — don't kick, could be temporary
      });
    }, 45000); // every 45 seconds
  }

  // ── takeover ─────────────────────────────────────────────────────────────

  function _takeover() {
    var token = _getToken();
    if (!token) return;

    fetch('/api/session/takeover', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }).then(function(r) {
      // 200 ok = we are now the active device
      // Any 4xx = problem, but don't kick ourselves here
      if (r.ok) {
        _startHeartbeat();
        _startSSE();
      } else {
        // Could not take over — still start heartbeat + SSE to detect if we get kicked
        _startHeartbeat();
        _startSSE();
      }
    }).catch(function() {
      // Network error — still monitor via heartbeat
      _startHeartbeat();
      _startSSE();
    });
  }

  // ── init ─────────────────────────────────────────────────────────────────

  function _init() {
    // Wait for auth:ready
    window.addEventListener('auth:ready', function(e) {
      var detail = e.detail || {};
      if (detail.authenticated) {
        _takeover();
      }
    });

    // Also handle if auth is already resolved before this script loaded
    if (window.__AUTH_STATE__ && window.__AUTH_STATE__.authenticated) {
      _takeover();
    }

    // Also trigger on auth:changed (e.g. session restored from cache)
    window.addEventListener('auth:changed', function(e) {
      var detail = e.detail || {};
      if (detail.authenticated && !_heartbeatTimer) {
        _takeover();
      }
    });
  }

  _init();

  // Expose for debugging
  window.__SingleSession__ = {
    forceKickout: _handleKickout,
    stop: _stopAll
  };

})();
