
console.log('[AssetsDirectBus] Checking localStorage for acc_assets');
const stored = localStorage.getItem('acc_assets');
console.log('[AssetsDirectBus] Found:', stored ? 'YES' : 'NO', stored ? JSON.parse(stored) : 'EMPTY');

// Define AssetsDirectBus if not already defined
if (typeof window.AssetsDirectBus === 'undefined') {
    window.AssetsDirectBus = {
        loadFromCache: function() {
            try {
                const cached = localStorage.getItem('acc_assets');
                if (cached) {
                    const assets = JSON.parse(cached);
                    window.AppState = window.AppState || {};
                    window.AppState.assets = assets;
                    console.log('[AssetsDirectBus] Loaded from cache:', assets);
                    return assets;
                }
            } catch(e) {
                console.warn('[AssetsDirectBus] Cache load error:', e);
            }
            return null;
        },
        saveToCache: function(assets) {
            try {
                localStorage.setItem('acc_assets', JSON.stringify(assets));
                console.log('[AssetsDirectBus] Saved to cache');
            } catch(e) {
                console.warn('[AssetsDirectBus] Cache save error:', e);
            }
        },
        publish: function(event, data) {
            console.log('[AssetsDirectBus] Publish:', event, data);
            window.dispatchEvent(new CustomEvent('assets:updated', { detail: data }));
        }
    };
}

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
            // [GUEST MODE CHECK] Skip server sync if not logged in
            const sessionId = localStorage.getItem('sessionId');
            const userId = localStorage.getItem('userId');
            
            if (!sessionId || !userId) {
                console.log('[AssetsDirect] Guest mode - using localStorage only');
                if (typeof AssetsDirectBus !== 'undefined' && typeof AssetsDirectBus.loadFromCache === 'function') { AssetsDirectBus.loadFromCache(); }
                return;
            }
            
            try {

                // [CRITICAL FIX] Fetch from API with timeout and storage fallback
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
                
                let data = null;
                let snapshot = null;
                
                try {
                    const res = await fetch('/api/codes/list', { 
                        credentials: 'include',
                        signal: controller.signal 
                    });
                    clearTimeout(timeout);
                    
                    if (res.ok) {
                        data = await res.json();
                        if (data.success) {
                            const rows = Array.isArray(data.codes) ? data.codes : [];
                            const toCode = r => (typeof r === 'string' ? r : r.code);
                            snapshot = {
                                codes:  rows.filter(r => !r.type || r.type === 'codes' || r.type === 'normal').map(toCode),
                                silver: rows.filter(r => r.type === 'silver').map(toCode),
                                gold:   rows.filter(r => r.type === 'gold').map(toCode),
                                lastSync: Date.now(),
                                source: 'api'
                            };
                        }
                    }
                } catch(fetchErr) {
                    clearTimeout(timeout);
                    if (fetchErr.name === 'AbortError') {
                        console.error('[AssetsManager] Sync timed out after 8s, trying fallback...');
                    } else {
                        console.error('[AssetsManager] Fetch error, trying fallback:', fetchErr.message);
                    }
                }
                
                // [FALLBACK] If API failed, try to load from localStorage
                if (!snapshot) {
                    try {
                        const cached = localStorage.getItem('codebank_assets');
                        if (cached) {
                            snapshot = JSON.parse(cached);
                            snapshot.source = 'cache';
                            console.log('[AssetsManager] Loaded from localStorage cache');
                        }
                    } catch(cacheErr) {
                        console.error('[AssetsManager] Cache load failed:', cacheErr);
                    }
                }
                
                // [LAST RESORT] If still no data, create minimal snapshot with stored last code
                if (!snapshot) {
                    let lastCode = null;
                    try {
                        lastCode = localStorage.getItem('last_generated_code');
                    } catch(_) {}
                    
                    snapshot = {
                        codes: lastCode ? [lastCode] : [],
                        silver: [],
                        gold: [],
                        lastSync: Date.now(),
                        source: 'last_generated'
                    };
                    console.log('[AssetsManager] Using last generated code fallback');
                }

                window.AppState.assets  = snapshot;
                window.AppState.lastSync = snapshot.lastSync;

                // 🔒 SECURITY: Tag cached assets with user ID to prevent leakage
                const userId = window.AppState.user?.id || window.AppState.user?.userId || 'anonymous';
                try { 
                    localStorage.setItem('codebank_assets', JSON.stringify(snapshot)); 
                    localStorage.setItem('acc_assets', JSON.stringify(snapshot));
                    localStorage.setItem('codebank_assets_user', userId);
                    // Also store the first code as last generated code
                    if (snapshot.codes && snapshot.codes.length > 0) {
                        localStorage.setItem('last_generated_code', snapshot.codes[0]);
                    }
                    console.log('[PIPELINE STEP 1] Generated and stored:', snapshot);
                } catch(_) {}

                // SAFE EventBus dispatch - check if available
                if (window.EventBus && typeof window.EventBus.dispatch === 'function') {
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
                }
                // Legacy compat events (always works)
                window.dispatchEvent(new CustomEvent('sqlite:snapshot', { detail: { latestCode: snapshot.codes[0], codesList: snapshot.codes, count: snapshot.codes.length } }));
                window.dispatchEvent(new CustomEvent('assets:updated', { detail: { latest: snapshot.codes[0], list: snapshot.codes, type: 'codes', count: snapshot.codes.length } }));

                // 🔄 Send to all iframes via postMessage (for SafeCode, etc)
                try {
                    // Send in multiple formats to support different iframe implementations
                    const msgData1 = { 
                        type: 'parent:assets-init', 
                        assets: snapshot,
                        user: window.AppState.user
                    };
                    
                    // Also send in assetbus:snapshot format for SafeCode bridge
                    const msgData2 = {
                        type: 'assetbus:snapshot',
                        data: snapshot
                    };
                    
                    document.querySelectorAll('iframe').forEach(iframe => {
                        try {
                            iframe.contentWindow?.postMessage(msgData1, '*');
                            iframe.contentWindow?.postMessage(msgData2, '*');
                        } catch(e) {}
                    });
                    
                    console.log('[AssetsManager] Broadcast assets to', document.querySelectorAll('iframe').length, 'iframes');
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
