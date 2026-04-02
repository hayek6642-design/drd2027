/**
 * Bankode AssetBus Bridge - GLOBAL PROVIDER
 */
(function(window) {
    'use strict';

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
                console.log(`[Bridge] Direct Pull: Serving ${data.codes?.length || 0} codes.`);
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
        console.log(`[Bridge] Syncing code to server: ${code}`);
        
        try {
            const res = await fetch('/api/codes/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
                credentials: 'include'
            });
            
            const result = await res.json();
            
            if (res.ok && result.success) {
                console.log(`✅ [Bridge] Sync SUCCESS: ${code}`);
                // Notify AssetBus to refresh
                if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
                    window.AssetBus.sync();
                }
                return { ok: true };
            } else {
                console.error(`❌ [Bridge] Sync FAILED: ${result.error || 'Unknown error'}`);
                return { ok: false, error: result.error };
            }
        } catch (err) {
            console.error('[Bridge] Sync EXCEPTION:', err);
            return { ok: false, error: err.message };
        }
    };

    // 🛡️ MODIFIED: Prevent rapid reload loops in iframes (from actly.md)
    let reloadPrevented = false;
    window.addEventListener('beforeunload', (e) => {
        if (reloadPrevented) return;
        
        // Check if this is an auth-related reload in an iframe
        const authState = localStorage.getItem('session_token');
        if (authState && window.parent !== window) {
            // We're in an iframe with valid auth - don't reload parent
            e.preventDefault();
            e.returnValue = '';
            console.warn('[Bridge] Prevented reload, syncing state instead');
            
            // Sync state instead of reloading
            window.parent.postMessage({
                type: 'bridge:sync-state',
                data: { timestamp: Date.now() }
            }, '*');
            
            return '';
        }
    });

    console.log("✅ AssetBridge Agent: Global Provider is ACTIVE.");
})(window);