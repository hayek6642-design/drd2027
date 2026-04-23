/**
 * client-session-manager.js
 * Browser-side WebSocket session manager.
 *
 * Connects to the server WebSocket, sends AUTH on load,
 * shows a conflict dialog if another device is trying to take over,
 * and forces logout if this device's session is revoked.
 *
 * Include AFTER auth-core.js in any page that should enforce single-device.
 * Works alongside the existing single-session.js (SSE system).
 *
 * Usage: included as a plain <script> tag — no module syntax needed.
 */
;(function ClientSessionManager() {
    'use strict';

    // Prevent double-init
    if (window.__CLIENT_SM_INIT__) return;
    window.__CLIENT_SM_INIT__ = true;

    // ── Config ────────────────────────────────────────────────────────────
    var MAX_RECONNECT  = 5;
    var RECONNECT_BASE = 3000; // ms, multiplied by attempt count

    // ── State ─────────────────────────────────────────────────────────────
    var _ws             = null;
    var _connected      = false;
    var _authed         = false;
    var _reconnectCount = 0;
    var _stopped        = false;
    var _conflictShown  = false;

    // ── Helpers ────────────────────────────────────────────────────────────

    function _getToken() {
        var m = document.cookie.match(/(^|; )session_token=([^;]+)/);
        if (m) return decodeURIComponent(m[2]);
        return localStorage.getItem('session_token') || null;
    }

    function _detectDevice() {
        if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
            var p = Capacitor.getPlatform ? Capacitor.getPlatform() : 'native';
            return { type: p, name: (p === 'ios' ? 'iPhone' : 'Android') + ' (App)' };
        }
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return { type: 'ios-web',     name: 'iPhone (Browser)' };
        if (/Android/.test(navigator.userAgent))          return { type: 'android-web', name: 'Android (Browser)' };
        return { type: 'desktop', name: 'Desktop (Browser)' };
    }

    function _getWsUrl() {
        var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return proto + '//' + location.host;
        // Raw WebSocket server listens on the root path (not /ws which is socket.io)
    }

    function _send(obj) {
        if (_ws && _ws.readyState === 1) {
            try { _ws.send(JSON.stringify(obj)); } catch (_) {}
        }
    }

    // ── Connection ─────────────────────────────────────────────────────────

    function _connect() {
        if (_stopped) return;

        var token = _getToken();
        if (!token) {
            // Not logged in — nothing to do
            return;
        }

        // Guard: don't open a second connection while one is already open/connecting
        if (_ws && (_ws.readyState === 0 /* CONNECTING */ || _ws.readyState === 1 /* OPEN */)) {
            return;
        }

        // Clean up any stale socket before opening a new one
        if (_ws) {
            try { _ws.close(); } catch (_) {}
            _ws = null;
        }

        try {
            _ws = new WebSocket(_getWsUrl());
        } catch (e) {
            console.warn('[ClientSM] Could not open WebSocket:', e.message);
            return;
        }

        _ws.onopen = function() {
            _connected      = true;
            _reconnectCount = 0;
            console.log('[ClientSM] Connected');
            _sendAuth();
        };

        _ws.onmessage = function(e) {
            var msg;
            try { msg = JSON.parse(e.data); } catch (_) { return; }
            _handleMessage(msg);
        };

        _ws.onclose = function(evt) {
            _connected = false;
            _authed    = false;
            console.log('[ClientSM] Disconnected:', evt.code, evt.reason);
            if (!_stopped) _scheduleReconnect();
        };

        _ws.onerror = function() {
            // Will trigger onclose
        };
    }

    function _sendAuth() {
        var token  = _getToken();
        var device = _detectDevice();
        if (!token) return;

        _send({
            type        : 'AUTH',
            sessionToken: token,
            deviceType  : device.type,
            deviceName  : device.name
        });
    }

    function _scheduleReconnect() {
        if (_stopped || _reconnectCount >= MAX_RECONNECT) {
            console.warn('[ClientSM] Max reconnect attempts reached');
            return;
        }
        _reconnectCount++;
        var delay = RECONNECT_BASE * _reconnectCount;
        console.log('[ClientSM] Reconnecting in', delay, 'ms (attempt', _reconnectCount + ')');
        setTimeout(_connect, delay);
    }

    // ── Message Handling ───────────────────────────────────────────────────

    function _handleMessage(msg) {
        switch (msg.type) {

            case 'AUTH_OK':
                _authed = true;
                console.log('[ClientSM] Auth confirmed for user', msg.userId);
                break;

            case 'AUTH_FAILED':
                console.warn('[ClientSM] Auth failed:', msg.reason);
                // Don't permanently stop on first failure — server may have just restarted
                // and briefly couldn't validate. Allow one delayed retry, then give up.
                if (_reconnectCount < MAX_RECONNECT) {
                    _reconnectCount = MAX_RECONNECT - 1; // one final attempt
                    setTimeout(function() {
                        if (!_stopped) { _reconnectCount = 0; _connect(); }
                    }, 8000);
                } else {
                    _stopped = true;
                }
                break;

            case 'PING':
                // Respond immediately
                _send({ type: 'PONG', timestamp: Date.now() });
                break;

            case 'FORCE_LOGOUT':
                // Server has revoked this session
                _handleForceLogout(msg);
                break;

            case 'SESSION_CONFLICT':
                // EMERGENCY GUARD: If session_active is set, this is a valid session — skip the conflict
                var sessionActive = localStorage.getItem('session_active');
                if (sessionActive === '1' || sessionActive === 'true') {
                    console.warn('[ClientSM] SESSION_CONFLICT received but session_active is set — IGNORING conflict');
                    break;
                }
                
                // Another device is trying to open the account
                if (!_conflictShown) {
                    _conflictShown = true;
                    _showConflictDialog(msg.newDevice || 'another device');
                }
                break;

            case 'SESSION_CLAIMED':
                // We successfully claimed the session
                _conflictShown = false;
                _showToast('✅ Session claimed — other device has been signed out.');
                break;

            default:
                break;
        }
    }

    // ── Force Logout ───────────────────────────────────────────────────────

    function _handleForceLogout(msg) {
        _stopped = true;

        // Clear session data
        _clearSession();

        var message = msg.message || 'Your session was terminated on another device.';
        _showAlert('Signed Out', message, function() {
            // Stay on page after session cleared - continue as guest
            console.log('[Session] Terminated - staying as guest');
            window.location.reload();
        });
    }

    function _clearSession() {
        var keys = [
            'session_token', 'user_data', 'auth_timestamp',
            '__cached_user__', '__cached_session_id__', 'session_active',
            'safeCodes', 'bankode_codes', 'bankode_user_id', 'bankode_session'
        ];
        keys.forEach(function(k) { try { localStorage.removeItem(k); } catch (_) {} });
        try { document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax'; } catch (_) {}
        try { document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure'; } catch (_) {}
        try { indexedDB.deleteDatabase('CodeBankSnapshotDB'); } catch (_) {}
        try { indexedDB.deleteDatabase('AuthDB'); } catch (_) {}

        if (_ws) { try { _ws.close(); } catch (_) {} }

        if (window.Auth && window.Auth.logout) {
            try { window.Auth.logout(); } catch (_) {}
        }
    }

    // ── Conflict Dialog ────────────────────────────────────────────────────

    function _showConflictDialog(newDevice) {
        // Remove any existing dialog
        var existing = document.getElementById('__csm-conflict-modal__');
        if (existing) existing.remove();

        var device = _detectDevice();
        var modal  = document.createElement('div');
        modal.id   = '__csm-conflict-modal__';
        modal.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:2147483647',
            'background:rgba(0,0,0,0.92)',
            'display:flex', 'align-items:center', 'justify-content:center',
            'font-family:system-ui,-apple-system,sans-serif'
        ].join(';');

        modal.innerHTML = [
            '<div style="background:linear-gradient(135deg,#0d1b2a 0%,#1b2838 100%);',
            'padding:36px 32px;border-radius:20px;max-width:440px;width:90%;',
            'text-align:center;border:1px solid #00c8ff;',
            'box-shadow:0 0 40px rgba(0,200,255,0.25);">',

              '<div style="font-size:44px;margin-bottom:16px">⚠️</div>',
              '<h2 style="color:#00c8ff;margin:0 0 12px;font-size:22px;font-weight:700">',
                'Account Open Elsewhere',
              '</h2>',
              '<p style="color:#aaa;margin:0 0 20px;line-height:1.6;font-size:15px">',
                'Your account was just opened on <strong style="color:#fff">',
                _escHtml(newDevice),
                '</strong>.<br>Only one device can be active at a time.',
              '</p>',

              '<div style="background:rgba(0,200,255,0.08);padding:12px 16px;',
              'border-radius:10px;margin-bottom:24px">',
                '<span style="color:#00c8ff;font-size:13px">',
                  'This device: <strong>', _escHtml(device.name), '</strong>',
                '</span>',
              '</div>',

              '<div style="display:flex;flex-direction:column;gap:12px">',
                '<button id="__csm-continue__" style="',
                  'padding:14px 24px;background:linear-gradient(135deg,#00c8ff,#0088cc);',
                  'border:none;border-radius:10px;color:#000;font-weight:700;',
                  'font-size:15px;cursor:pointer;transition:opacity .2s">',
                  '✅ Stay Here — Sign Out Other Device',
                '</button>',
                '<button id="__csm-logout__" style="',
                  'padding:14px 24px;background:transparent;',
                  'border:2px solid #ff5555;border-radius:10px;color:#ff5555;',
                  'font-weight:700;font-size:15px;cursor:pointer;transition:all .2s">',
                  '🚪 Sign Out From This Device',
                '</button>',
              '</div>',
            '</div>'
        ].join('');

        document.body.appendChild(modal);

        var btnContinue = document.getElementById('__csm-continue__');
        var btnLogout   = document.getElementById('__csm-logout__');

        btnContinue.onmouseover = function() { this.style.opacity = '0.85'; };
        btnContinue.onmouseout  = function() { this.style.opacity = '1'; };

        btnLogout.onmouseover = function() {
            this.style.background = '#ff5555';
            this.style.color      = '#000';
        };
        btnLogout.onmouseout = function() {
            this.style.background = 'transparent';
            this.style.color      = '#ff5555';
        };

        btnContinue.onclick = function() {
            modal.remove();
            _claimSession();
        };

        btnLogout.onclick = function() {
            modal.remove();
            _clearSession();
            // Stay on page after logout - reload instead of redirect
            console.log('[Session] Self logout - staying as guest');
            window.location.reload();
        };
    }

    function _claimSession() {
        _send({ type: 'CLAIM_SESSION', deviceType: _detectDevice().type });
        // Also call existing SSE-based takeover for backwards compat
        var token = _getToken();
        if (token) {
            fetch('/api/session/takeover', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }).catch(function() {});
        }
    }

    // ── Alert / Toast ──────────────────────────────────────────────────────

    function _showAlert(title, message, onConfirm) {
        var modal = document.createElement('div');
        modal.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:2147483647',
            'background:rgba(0,0,0,0.92)',
            'display:flex', 'align-items:center', 'justify-content:center',
            'font-family:system-ui,-apple-system,sans-serif'
        ].join(';');

        modal.innerHTML = [
            '<div style="background:#1a1a2e;padding:30px 28px;border-radius:16px;',
            'max-width:380px;width:90%;text-align:center;border:1px solid #ff5555">',
              '<h2 style="color:#ff5555;margin:0 0 12px;font-size:20px">' + _escHtml(title) + '</h2>',
              '<p style="color:#ccc;margin:0 0 22px;line-height:1.6">' + _escHtml(message) + '</p>',
              '<button id="__csm-alert-ok__" style="',
                'padding:12px 28px;background:#ff5555;border:none;border-radius:8px;',
                'color:#000;font-weight:700;font-size:14px;cursor:pointer">OK</button>',
            '</div>'
        ].join('');

        document.body.appendChild(modal);
        document.getElementById('__csm-alert-ok__').onclick = function() {
            modal.remove();
            if (typeof onConfirm === 'function') onConfirm();
        };
    }

    function _showToast(message) {
        var t = document.createElement('div');
        t.style.cssText = [
            'position:fixed', 'bottom:28px', 'left:50%',
            'transform:translateX(-50%)',
            'background:#00c8ff', 'color:#000',
            'padding:13px 28px', 'border-radius:10px',
            'font-weight:700', 'font-size:14px',
            'z-index:2147483647',
            'box-shadow:0 4px 20px rgba(0,200,255,.4)'
        ].join(';');
        t.textContent = message;
        document.body.appendChild(t);
        setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
    }

    function _escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Init ───────────────────────────────────────────────────────────────

    function _init() {
        // Connect when auth is ready
        window.addEventListener('auth:ready', function(e) {
            var d = (e && e.detail) || {};
            if (d.authenticated) _connect();
        });

        // If auth already resolved before this script loaded
        if (window.__AUTH_STATE__ && window.__AUTH_STATE__.authenticated) {
            _connect();
        }

        // Re-connect on auth:changed (e.g. token refresh)
        window.addEventListener('auth:changed', function(e) {
            var d = (e && e.detail) || {};
            // Reset stopped state on auth:changed so a fresh connect can succeed
            if (d.authenticated) {
                if (_stopped) { _stopped = false; _reconnectCount = 0; }
                if (!_connected) _connect();
            }
        });

        // Clean up on page unload
        window.addEventListener('beforeunload', function() {
            _stopped = true;
            if (_ws) { try { _ws.close(1000, 'page_unload'); } catch (_) {} }
        });
    }

    _init();

    // Public API
    window.__ClientSessionManager__ = {
        connect    : _connect,
        disconnect : function() { _stopped = true; if (_ws) _ws.close(); },
        send       : _send,
        claim      : _claimSession,
        isConnected: function() { return _connected && _authed; }
    };

})();
