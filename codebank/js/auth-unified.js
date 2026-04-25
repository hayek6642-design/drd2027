/**
 * auth-unified.js
 * Single auth layer for all CodeBank services.
 * Replaces auth-bridge.js — no postMessage, no bridge forwarding.
 * All services read window.AppState.user directly.
 * 
 * FIXED: Now properly validates session with backend instead of faking auth.
 */
(function(window) {
    'use strict';

    window.AuthManager = {
        async init() {
            try {
                const res = await fetch('/api/auth/session', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated && data.user) {
                        this._setUser(data.user, data.sessionId || data.session_token);
                        console.log('[AuthManager] Session validated from backend:', data.user.email);
                        return;
                    }
                }
                
                // Also try /api/auth/me as fallback
                const meRes = await fetch('/api/auth/me', { credentials: 'include' });
                if (meRes.ok) {
                    const meData = await meRes.json();
                    if (meData.authenticated && meData.user) {
                        this._setUser(meData.user, meData.sessionId);
                        console.log('[AuthManager] Session validated via /me:', meData.user.email);
                        return;
                    }
                }
            } catch(e) {
                console.warn('[AuthManager] Backend session check failed:', e.message);
            }

            // No valid session from backend - clear any cached localStorage data
            console.log('[AuthManager] No backend session, clearing localStorage cache');
            localStorage.removeItem('__cached_user__');
            localStorage.removeItem('__cached_session_id__');
            localStorage.removeItem('session_token');
            
            this._clearUser();
        },

        requireAuth() {
            if (!window.AppState.isAuthenticated) {
                console.warn('[AuthManager] Not authenticated. Staying as guest.');
                return false;
            }
            return true;
        },

        getUser()          { return window.AppState.user; },
        isAuthenticated()  { return window.AppState.isAuthenticated; },
        
        login(user, sid)   { this._setUser(user, sid); },

        async logout() {
            try { 
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); 
            } catch(_) {}
            
            // Clear all localStorage
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
            console.log('[Auth] Logged out - reloading page');
            window.location.reload();
        },

        _setUser(user, sessionId) {
            if (!user || typeof user !== 'object') {
                console.warn('[AuthManager] Invalid user object:', user);
                return;
            }
            
            window.AppState.user = user;
            window.AppState.isAuthenticated = !!(user && (user.uid || user.id || user.email));
            window.AppState.sessionId = sessionId || null;
            
            try {
                localStorage.setItem('__cached_user__', JSON.stringify(user));
                if (sessionId) localStorage.setItem('session_token', sessionId);
            } catch(_) {}
            
            window.EventBus.dispatch('auth:changed', {
                user, isAuthenticated: window.AppState.isAuthenticated, sessionId
            });
            
            if (window.AppState.isAuthenticated && window.AssetsManager && typeof window.AssetsManager.sync === 'function') {
                window.AssetsManager.sync().catch(e => console.warn('[AuthManager] Asset sync on auth:', e.message));
            }
            console.log('[AuthManager] User set:', user?.email || user?.uid || 'unknown');
        },

        _clearUser() {
            window.AppState.user = null;
            window.AppState.isAuthenticated = false;
            window.AppState.sessionId = null;
            window.EventBus.dispatch('auth:changed', { user: null, isAuthenticated: false, sessionId: null });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.AuthManager.init());
    } else {
        window.AuthManager.init();
    }

    console.log('[AuthManager] Unified auth initialized.');

})(window);
