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

})(window);
