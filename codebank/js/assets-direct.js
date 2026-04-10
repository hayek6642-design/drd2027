/**
 * assets-direct.js
 * Unified asset management — no bridge, no postMessage.
 * All services read/write via window.AppState.assets + EventBus events.
 *
 * READ:  window.AppState.assets.codes / .silver / .gold
 * WRITE: EventBus.dispatch('assets:update', { type, action, data })
 */
(function(window) {
    'use strict';

    window.AssetsManager = {
        async sync() {
            try {
                const res = await fetch('/api/codes/list', { credentials: 'include' });
                if (!res.ok) return null;
                const data = await res.json();
                if (!data.success) return null;

                const rows = Array.isArray(data.codes) ? data.codes : [];
                const toCode = r => (typeof r === 'string' ? r : r.code);

                const snapshot = {
                    codes:  rows.filter(r => !r.type || r.type === 'codes' || r.type === 'normal').map(toCode),
                    silver: rows.filter(r => r.type === 'silver').map(toCode),
                    gold:   rows.filter(r => r.type === 'gold').map(toCode),
                    lastSync: Date.now()
                };

                window.AppState.assets  = snapshot;
                window.AppState.lastSync = snapshot.lastSync;

                // 🔒 SECURITY: Tag cached assets with user ID to prevent leakage
                const userId = window.AppState.user?.id || window.AppState.user?.userId || 'anonymous';
                try { 
                    localStorage.setItem('codebank_assets', JSON.stringify(snapshot)); 
                    localStorage.setItem('codebank_assets_user', userId);
                } catch(_) {}

                window.EventBus.dispatch('assets:updated', snapshot);
                // Legacy compat events
                window.dispatchEvent(new CustomEvent('sqlite:snapshot', { detail: snapshot }));
                window.dispatchEvent(new CustomEvent('assets:updated', { detail: snapshot }));

                console.log('[AssetsManager] Synced:', snapshot.codes.length, 'codes,',
                    snapshot.silver.length, 'silver,', snapshot.gold.length, 'gold');
                return snapshot;
            } catch(e) {
                console.error('[AssetsManager] Sync failed:', e);
                return null;
            }
        },

        async writeCode(code) {
            try {
                const res = await fetch('/api/codes/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                    credentials: 'include'
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    await this.sync();
                    return { ok: true };
                }
                return { ok: false, error: result.error };
            } catch(e) {
                return { ok: false, error: e.message };
            }
        },

        snapshot()    { return window.AppState.assets; },
        getSnapshot() { return Promise.resolve(window.AppState.assets); }
    };

    // Handle write requests from services - WITH SAFETY CHECK
    if (window.EventBus && typeof window.EventBus.on === 'function') {
        window.EventBus.on('assets:update', async ({ type, action, data } = {}) => {
            if (action === 'add' && data) await window.AssetsManager.writeCode(data);
            else await window.AssetsManager.sync();
        });
    } else {
        console.error('[AssetsManager] EventBus not available! Retrying in 500ms...');
        // Retry after delay
        setTimeout(() => {
            if (window.EventBus && typeof window.EventBus.on === 'function') {
                window.EventBus.on('assets:update', async ({ type, action, data } = {}) => {
                    if (action === 'add' && data) await window.AssetsManager.writeCode(data);
                    else await window.AssetsManager.sync();
                });
                console.log('[AssetsManager] EventBus subscription successful after retry');
            } else {
                console.error('[AssetsManager] EventBus still not available after retry');
            }
        }, 500);
    }

    // Legacy shims
    window.writeCodeToSQLite = async function(d) {
        return window.AssetsManager.writeCode(d.code || d);
    };
    window.GET_AUTHORITATIVE_ASSETS = function() { return window.AppState.assets; };

    // On load, verify cached assets match current user
    function loadCachedAssetsIfMatching() {
        try {
            const cachedUser = localStorage.getItem('codebank_assets_user');
            const currentUser = window.AppState.user?.id || window.AppState.user?.userId;
            const cached = localStorage.getItem('codebank_assets');
            
            if (cached && currentUser && cachedUser === currentUser) {
                // Same user - safe to use cache
                const snapshot = JSON.parse(cached);
                window.AppState.assets = snapshot;
                window.AppState.lastSync = snapshot.lastSync;
                window.EventBus.dispatch('assets:updated', snapshot);
                console.log('[AssetsManager] Loaded cached assets for user:', currentUser);
            } else if (cached && !currentUser) {
                // No user logged in, clear cached assets
                localStorage.removeItem('codebank_assets');
                localStorage.removeItem('codebank_assets_user');
                window.AppState.assets = { codes: [], silver: [], gold: [] };
            }
            // Different user - don't use cache, will fetch fresh
        } catch(_) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadCachedAssetsIfMatching();
            window.AssetsManager.sync();
        });
    } else {
        loadCachedAssetsIfMatching();
        window.AssetsManager.sync();
    }

    setInterval(() => window.AssetsManager.sync(), 30000);

    // 🔒 SECURITY: Clear assets on logout
    window.addEventListener('auth:logout', () => {
        localStorage.removeItem('codebank_assets');
        localStorage.removeItem('codebank_assets_user');
        window.AppState.assets = { codes: [], silver: [], gold: [] };
        console.log('[AssetsManager] Cleared assets on logout');
    });

    // Also listen for auth state changes
    window.addEventListener('auth:changed', (e) => {
        if (!e.detail?.authenticated) {
            localStorage.removeItem('codebank_assets');
            localStorage.removeItem('codebank_assets_user');
            window.AppState.assets = { codes: [], silver: [], gold: [] };
        } else if (e.detail?.authenticated) {
            // User authenticated - sync assets
            window.AssetsManager.sync();
        }
    });

    // Also listen for login/signup events
    window.addEventListener('auth:login', () => {
        console.log('[AssetsManager] Login detected, syncing...');
        window.AssetsManager.sync();
    });
    window.addEventListener('auth:signup', () => {
        console.log('[AssetsManager] Signup detected, syncing...');
        window.AssetsManager.sync();
    });

    console.log('[AssetsManager] Direct asset manager initialized.');

})(window);
