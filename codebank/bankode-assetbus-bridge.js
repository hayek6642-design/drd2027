/**
 * Bankode AssetBus Bridge - GLOBAL PROVIDER
 * Enhanced with Capacitor native HTTP support for CORS-free requests on mobile.
 */
(function(window) {
    'use strict';

    // ==========================================
    // NATIVE HTTP BRIDGE (Capacitor support)
    // ==========================================
    const _isNativePlatform = (() => {
        try { return window.Capacitor && window.Capacitor.isNativePlatform(); } catch(_) { return false; }
    })();

    const _serverUrl = 'https://drd2027.onrender.com';

    /**
     * Smart fetch that uses native HTTP on mobile (bypasses CORS)
     * and standard fetch on web.
     */
    async function bridgeFetch(path, options = {}) {
        const url = path.startsWith('http') ? path : (_isNativePlatform ? _serverUrl + path : path);
        
        // On native, try CapacitorHttp first for CORS-free requests
        if (_isNativePlatform && window.NativeBridge && typeof window.NativeBridge.nativeFetch === 'function') {
            try {
                return await window.NativeBridge.nativeFetch(url, options);
            } catch (e) {
                if (window.DEBUG_MODE) console.warn('[Bridge] Native fetch failed, falling back to standard fetch:', e.message);
            }
        }

        // Standard fetch (web or fallback)
        return fetch(url, options);
    }

    // This is the "Public Tap" that the iframe looks for
    let _lastPullLog = 0;
    window.GET_AUTHORITATIVE_ASSETS = function() {
        // Attempt to get data from AssetBus or Bankode Core
        const data = (window.AssetBus && typeof window.AssetBus.snapshot === 'function') 
            ? window.AssetBus.snapshot() 
            : (window.__BANKODE_INSTANCE__ && window.__BANKODE_INSTANCE__.snapshot 
                ? window.__BANKODE_INSTANCE__.snapshot() 
                : null);

        if (data) {
            const now = Date.now();
            if (now - _lastPullLog > 1000) { // Debounce logging to 1s
                if(window.DEBUG_MODE) console.log(`[Bridge] Direct Pull: Serving ${data.codes?.length || 0} codes.`);
                _lastPullLog = now;
            }
        }
        return data;
    };

    /**
     * writeCodeToSQLite - BRIDGING AGENT
     * Syncs a single generated code to the server's SQLite database.
     */
    window.writeCodeToSQLite = async function(data) {
        const { code } = data;
        if (window.DEBUG_MODE) console.log(`[Bridge] Syncing code to server: ${code}`);
        
        try {
            const res = await bridgeFetch('/api/codes/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
                credentials: 'include'
            });
            
            const result = await res.json();
            
            if (res.ok && result.success) {
                if(window.DEBUG_MODE) console.log(`[Bridge] Sync SUCCESS: ${code}`);
                // Notify AssetBus to refresh
                if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
                    window.AssetBus.sync();
                }
                return { ok: true };
            } else {
                console.error(`[Bridge] Sync FAILED: ${result.error || 'Unknown error'}`);
                return { ok: false, error: result.error };
            }
        } catch (err) {
            console.error('[Bridge] Sync EXCEPTION:', err);
            return { ok: false, error: err.message };
        }
    };

    // Notify parent when service unloads (e.g. switching services) — do NOT block navigation
    window.addEventListener('beforeunload', () => {
        const authState = localStorage.getItem('session_token');
        if (authState && window.parent !== window) {
            // Sync state to parent without blocking the navigation
            window.parent.postMessage({
                type: 'bridge:sync-state',
                data: { timestamp: Date.now() }
            }, '*');
        }
    });

    if (window.DEBUG_MODE) console.log("[AssetBridge] Global Provider is ACTIVE.");

    // ==========================================
    // ASSET SNAPSHOT + SYNC (injected onto AssetBus)
    // ==========================================
    let _snapshotCache = null;

    // Try to restore from localStorage immediately so initialRender() can use it
    try {
        const raw = localStorage.getItem('codebank_assets');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (
                (Array.isArray(parsed.codes)  && parsed.codes.length  > 0) ||
                (Array.isArray(parsed.silver) && parsed.silver.length > 0) ||
                (Array.isArray(parsed.gold)   && parsed.gold.length   > 0)
            )) {
                _snapshotCache = parsed;
                if (window.DEBUG_MODE) console.log('[AssetBridge] Restored snapshot from localStorage');
            }
        }
    } catch(_) {}

    /**
     * Fetch assets from server and update _snapshotCache.
     * Dispatches 'sqlite:snapshot' and 'assets:updated' so safe-asset-list.js re-renders.
     */
    async function _syncAssets() {
        try {
            const res = await bridgeFetch('/api/codes/list', { credentials: 'include' });
            if (!res.ok) return null;
            const data = await res.json();
            if (!data.success) return null;

            const rows = Array.isArray(data.codes) ? data.codes : [];
            const codeRows   = rows.filter(r => !r.type || r.type === 'codes' || r.type === 'normal');
            const silverRows = rows.filter(r => r.type === 'silver');
            const goldRows   = rows.filter(r => r.type === 'gold');

            _snapshotCache = {
                codes:  codeRows.map(r  => (typeof r === 'string' ? r : r.code)),
                silver: silverRows.map(r => (typeof r === 'string' ? r : r.code)),
                gold:   goldRows.map(r   => (typeof r === 'string' ? r : r.code)),
                authoritative: true,
                status: 'success',
                synced: true,
                timestamp: Date.now()
            };

            // Persist for offline fallback
            try { localStorage.setItem('codebank_assets', JSON.stringify(_snapshotCache)); } catch(_) {}

            // Notify listeners
            window.dispatchEvent(new CustomEvent('sqlite:snapshot', { detail: _snapshotCache }));
            window.dispatchEvent(new CustomEvent('assets:updated',  { detail: _snapshotCache }));

            if (window.DEBUG_MODE) console.log(`[AssetBridge] Synced: ${_snapshotCache.codes.length} codes, ${_snapshotCache.silver.length} silver, ${_snapshotCache.gold.length} gold`);
            return _snapshotCache;
        } catch(e) {
            console.error('[AssetBridge] Sync failed:', e);
            return null;
        }
    }

    /**
     * Inject snapshot() and sync() onto window.AssetBus once it is available.
     */
    function _injectAssetBusMethods() {
        if (!window.AssetBus) {
            setTimeout(_injectAssetBusMethods, 100);
            return;
        }

        // snapshot() — returns cached asset data
        window.AssetBus.snapshot = function() {
            return _snapshotCache;
        };

        // sync() — fetches from server and updates snapshot cache
        window.AssetBus.sync = _syncAssets;

        console.log('[AssetBridge] snapshot() and sync() injected onto AssetBus');

        // Auto-sync immediately so data is available for initialRender()
        _syncAssets();

        // Periodic refresh every 30 s
        setInterval(_syncAssets, 30000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _injectAssetBusMethods);
    } else {
        _injectAssetBusMethods();
    }
})(window);