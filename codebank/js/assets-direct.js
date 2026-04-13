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

                // [EMERGENCY FIX] Add timeout to prevent hanging forever
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
                
                try {
                    const res = await fetch('/api/codes/list', { 
                        credentials: 'include',
                        signal: controller.signal 
                    });
                    clearTimeout(timeout);
                    
                    if (!res.ok) {
                        console.warn('[AssetsManager] API returned', res.status);
                        return null;
                    }
                    const data = await res.json();
                    if (!data.success) {
                        console.warn('[AssetsManager] API returned success:false');
                        return null;
                    }
                } catch(fetchErr) {
                    clearTimeout(timeout);
                    if (fetchErr.name === 'AbortError') {
                        console.error('[AssetsManager] Sync timed out after 8s');
                    } else {
                        console.error('[AssetsManager] Fetch error:', fetchErr.message);
                    }
                    return null;
                }

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

                window.EventBus.dispatch('assets:updated', {
                    type: 'codes',
                    list: snapshot.codes,
                    latest: snapshot.codes[0] || null,
                    count: snapshot.codes.length
                });
                window.EventBus.dispatch('assets:updated', {
                    type: 'silver',
                    list: snapshot.silver,
                    latest: snapshot.silver[0] || null,
                    count: snapshot.silver.length
                });
                window.EventBus.dispatch('assets:updated', {
                    type: 'gold',
                    list: snapshot.gold,
                    latest: snapshot.gold[0] || null,
                    count: snapshot.gold.length
                });
                // Legacy compat events
                window.dispatchEvent(new CustomEvent('sqlite:snapshot', { detail: { latestCode: snapshot.codes[0], codesList: snapshot.codes, count: snapshot.codes.length } }));
                window.dispatchEvent(new CustomEvent('assets:updated', { detail: { latest: snapshot.codes[0], list: snapshot.codes, type: 'codes', count: snapshot.codes.length } }));

                // 🔄 Send to all iframes via postMessage (for SafeCode, etc)
                try {
                    // Send in format SafeCode expects: { type: 'parent:assets-init', assets: {...} }
                    const msgData = { 
                        type: 'parent:assets-init', 
                        assets: snapshot,
                        user: window.AppState.user
                    };
                    document.querySelectorAll('iframe').forEach(iframe => {
                        try {
                            iframe.contentWindow?.postMessage(msgData, '*');
                        } catch(e) {}
                    });
                } catch(e) {}

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
    
    // [FIX] Auto-sync on page load if authenticated
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
            if (window.Auth && window.Auth.isAuthenticated && window.Auth.isAuthenticated()) {
                console.log('[AssetsManager] Auto-syncing on DOMContentLoaded...');
                window.AssetsManager.sync();
            } else if (window.AuthCore && window.AuthCore.isAuthenticated && window.AuthCore.isAuthenticated()) {
                console.log('[AssetsManager] Auto-syncing on DOMContentLoaded (AuthCore)...');
                window.AssetsManager.sync();
            }
        });
    } else {
        // Document already loaded
        if (window.Auth && window.Auth.isAuthenticated && window.Auth.isAuthenticated()) {
            console.log('[AssetsManager] Auto-syncing immediately...');
            window.AssetsManager.sync();
        }
    }

    console.log('[AssetsManager] Direct asset manager initialized.');

})(window);
