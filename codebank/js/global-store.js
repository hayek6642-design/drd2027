/**
 * global-store.js
 * Single source of truth for all CodeBank services.
 * Replaces bankode-assetbus-bridge.js + auth-bridge.js bridge architecture.
 */
(function(window) {
    'use strict';

    window.AppState = {
        user: null,
        isAuthenticated: false,
        assets: {
            codes: [],
            silver: [],
            gold: []
        },
        sessionId: null,
        lastSync: null
    };

    // Restore cached assets immediately so first render has data
    (function restoreFromCache() {
        try {
            const raw = localStorage.getItem('codebank_assets');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.codes))  window.AppState.assets.codes  = parsed.codes;
                    if (Array.isArray(parsed.silver)) window.AppState.assets.silver = parsed.silver;
                    if (Array.isArray(parsed.gold))   window.AppState.assets.gold   = parsed.gold;
                }
            }
        } catch(_) {}

        try {
            const userRaw = localStorage.getItem('__cached_user__') || localStorage.getItem('user');
            if (userRaw) {
                const user = JSON.parse(userRaw);
                if (user) {
                    window.AppState.user = user;
                    window.AppState.isAuthenticated = !!(user.uid || user.id || user.email);
                    window.AppState.sessionId = localStorage.getItem('session_token')
                        || localStorage.getItem('__cached_session_id__') || null;
                }
            }
        } catch(_) {}
    })();

    console.log('[AppState] Global store initialized. Auth:', window.AppState.isAuthenticated);

    // ═════════════════════════════════════════════════════════════
    // ACC BRIDGE - Critical for iframe communication
    // ═════════════════════════════════════════════════════════════
    window.ACCBridge = {
        clients: [],
        
        init() {
            window.addEventListener('message', (e) => {
                if (!e.data || !e.data.type) return;

                // Register iframe clients
                if (e.data.type === 'register:service') {
                    this.clients.push(e.source);
                    console.log('[ACCBridge] Client registered:', e.data.name);
                }

                // E7ki auth request
                if (e.data.type === 'e7ki:auth:request') {
                    e.source.postMessage({
                        type: 'e7ki:auth:response',
                        authenticated: true,
                        sessionId: localStorage.getItem('sessionId'),
                        userId: localStorage.getItem('userId')
                    }, '*');
                    console.log('[ACCBridge] E7ki auth response sent');
                }

                // Asset request from any iframe
                if (e.data.type === 'assets:request') {
                    const assets = this.getAssets();
                    e.source.postMessage({
                        type: 'assets:response',
                        assets
                    }, '*');
                    console.log('[PIPELINE STEP 3] Sent assets to iframe:', assets);
                }
            });
            console.log('[ACCBridge] Initialized');
        },

        getAssets() {
            try {
                const stored = localStorage.getItem('acc_assets');
                return stored ? JSON.parse(stored) : { codes: [], silver: [], gold: [] };
            } catch {
                return { codes: [], silver: [], gold: [] };
            }
        },

        broadcast(assets) {
            this.clients.forEach(client => {
                try {
                    client.postMessage({ type: 'assets:update', assets }, '*');
                } catch(e) {}
            });
            console.log('[ACCBridge] Broadcast to', this.clients.length, 'clients');
        }
    };

    // Initialize bridge immediately
    window.ACCBridge.init();

})(window);
