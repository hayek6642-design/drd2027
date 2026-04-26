/**
 * auth-unified.js
 * Single auth layer for all CodeBank services.
 * Replaces auth-bridge.js — no postMessage, no bridge forwarding.
 * All services read window.AppState.user directly.
 */
(function(window) {
    'use strict';

    window.AuthManager = {
        async init() {
            try {
                const res = await fetch('/api/auth/session', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.user || data.authenticated) {
                        this._setUser(data.user, data.sessionId || data.session_token);
                        return;
                    }
                }
            } catch(_) {}

            // Fallback: restore from localStorage cache
            try {
                const userRaw = localStorage.getItem('__cached_user__') || localStorage.getItem('user');
                const sessionId = localStorage.getItem('session_token') || localStorage.getItem('__cached_session_id__');
                if (userRaw && sessionId) {
                    const user = JSON.parse(userRaw);
                    if (user) { this._setUser(user, sessionId); return; }
                }
            } catch(_) {}

            this._clearUser();
        },

        requireAuth() {
            if (!window.AppState.isAuthenticated) {
                console.warn('[AuthManager] Not authenticated. Staying as guest.');
                // Don't redirect - stay on page as guest
                return false;
            }
            return true;
        },

        getUser()          { return window.AppState.user; },
        isAuthenticated()  { return window.AppState.isAuthenticated; },
        login(user, sid)   { this._setUser(user, sid); },

        async logout() {
            try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch(_) {}
            [
                'session_active','session_token','user_data','__cached_user__',
                '__cached_session_id__','auth_timestamp','safeCodes','bankode_codes',
                'last_reload_time','codebank_assets'
            ].forEach(k => localStorage.removeItem(k));
            try {
                const req = indexedDB.open('CodeBankSnapshotDB', 1);
                req.onsuccess = () => {
                    try {
                        const db = req.result;
                        db.transaction('snapshots','readwrite').objectStore('snapshots').clear();
                        db.close();
                    } catch(_) {}
                };
            } catch(_) {}
            this._clearUser();
            console.log('[Auth] Logged out - staying on page as guest');
            // Don't redirect to login - reload to clear state
            window.location.reload();
        },

        _setUser(user, sessionId) {
            window.AppState.user = user;
            window.AppState.isAuthenticated = !!(user && (user.uid || user.id || user.email));
            window.AppState.sessionId = sessionId || null;
            try {
                localStorage.setItem('__cached_user__', JSON.stringify(user));
                if (sessionId) localStorage.setItem('session_token', sessionId);
            } catch(_) {}
            // SAFE dispatch - check EventBus exists first
            if (window.EventBus && typeof window.EventBus.dispatch === 'function') {
                window.EventBus.dispatch('auth:changed', {
                    user, isAuthenticated: window.AppState.isAuthenticated, sessionId
                });
            } else {
                window.dispatchEvent(new CustomEvent('auth:changed', { detail: {
                    user, isAuthenticated: window.AppState.isAuthenticated, sessionId
                }}));
            }
            // 🔧 FIX: Automatically sync assets when user is authenticated
            if (window.AppState.isAuthenticated && window.AssetsManager && typeof window.AssetsManager.sync === 'function') {
                window.AssetsManager.sync().catch(e => console.warn('[AuthManager] Asset sync on auth:', e.message));
            }
            console.log('[AuthManager] User set:', user?.email || user?.uid || 'unknown');
        },

        _clearUser() {
            window.AppState.user = null;
            window.AppState.isAuthenticated = false;
            window.AppState.sessionId = null;
            // SAFE dispatch - check EventBus exists first
            if (window.EventBus && typeof window.EventBus.dispatch === 'function') {
                window.EventBus.dispatch('auth:changed', { user: null, isAuthenticated: false, sessionId: null });
            } else {
                window.dispatchEvent(new CustomEvent('auth:changed', { detail: {
                    user: null, isAuthenticated: false, sessionId: null
                }}));
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.AuthManager.init());
    } else {
        window.AuthManager.init();
    }

    console.log('[AuthManager] Unified auth initialized.');

})(window);
