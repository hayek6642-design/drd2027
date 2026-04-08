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

                try { localStorage.setItem('codebank_assets', JSON.stringify(snapshot)); } catch(_) {}

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

    // Handle write requests from services
    window.EventBus.on('assets:update', async ({ type, action, data } = {}) => {
        if (action === 'add' && data) await window.AssetsManager.writeCode(data);
        else await window.AssetsManager.sync();
    });

    // Legacy shims
    window.writeCodeToSQLite = async function(d) {
        return window.AssetsManager.writeCode(d.code || d);
    };
    window.GET_AUTHORITATIVE_ASSETS = function() { return window.AppState.assets; };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.AssetsManager.sync());
    } else {
        window.AssetsManager.sync();
    }

    setInterval(() => window.AssetsManager.sync(), 30000);
    console.log('[AssetsManager] Direct asset manager initialized.');

})(window);
