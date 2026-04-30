/**
 * CRITICAL FIX: Stop 401 spam by checking authentication before API calls
 * Previously: Client kept retrying /api/assets/sync every 1 second without auth
 * Result: 100+ failed requests per minute (rate-limiting risk)
 * Fix: Check sessionId first, only sync if authenticated
 */

// FIX 4: Helper to merge snapshot data without duplicates
function mergeArraysUnique(newArr, existingArr) {
    if (!Array.isArray(newArr)) return existingArr || [];
    if (!Array.isArray(existingArr)) existingArr = [];
    
    const seen = new Set();
    existingArr.forEach(item => seen.add(item.code || String(item)));
    
    const merged = [...existingArr];
    for (const item of newArr) {
        const code = item.code || String(item);
        if (!seen.has(code)) {
            merged.push(item);
            seen.add(code);
        }
    }
    
    console.log('[Merge] Combined', newArr.length, '+', 
               existingArr.length, '=', merged.length, 'unique codes');
    return merged;
}

// Define AssetsDirectBus if not already defined
if (typeof window.AssetsDirectBus === 'undefined') {
    window.AssetsDirectBus = {
        loadFromCache: function() {
            try {
                const cached = localStorage.getItem('acc_assets') || localStorage.getItem('codebank_assets');
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
            } catch(e) {}
        },
        publish: function(event, data) {
            window.dispatchEvent(new CustomEvent('assets:updated', { detail: data }));
        }
    };
}

(function() {
    const SYNC_INTERVAL = 5000; // 5 seconds
    const MAX_RETRIES = 3;
    let syncInterval = null;
    let retryCount = 0;
    let lastSyncTime = 0;
    let isSyncing = false;

    /**
     * Check if user is authenticated
     * Returns: sessionId if authenticated, null if guest
     */
    function isAuthenticated() {
        // Try multiple storage locations
        const sessionId = localStorage.getItem('sessionId') || 
                         sessionStorage.getItem('sessionId') ||
                         localStorage.getItem('auth_token');
        return sessionId ? sessionId : null;
    }

    /**
     * Sync assets with server (ONLY if authenticated)
     */
    async function syncWithServer() {
        // 🔴 CRITICAL: Stop if not authenticated (prevents 401 spam)
        const sessionId = isAuthenticated();
        if (!sessionId) {
            console.log('[Assets] Guest mode - skipping server sync (no auth token)');
            return;
        }

        // Prevent concurrent syncs
        if (isSyncing) {
            return;
        }

        const now = Date.now();
        if (now - lastSyncTime < SYNC_INTERVAL) {
            return;
        }

        isSyncing = true;
        lastSyncTime = now;

        try {
            const response = await fetch('/api/assets/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionId}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    timestamp: now,
                    client: 'browser'
                })
            });

            // FIX 5: Handle 404 gracefully (endpoint doesn't exist yet)
            if (response.status === 404) {
                console.log('[Assets] Server endpoint /api/assets/sync not implemented (404)');
                console.log('[Assets] Falling back to localStorage cache only');
                stopSync(); // Don't retry - endpoint doesn't exist
                return;
            }

            if (response.status === 401) {
                console.warn('[Assets] Auth expired (401) - clearing token and stopping sync');
                localStorage.removeItem('sessionId');
                sessionStorage.removeItem('sessionId');
                localStorage.removeItem('auth_token');
                stopSync(); // Stop retry loop
                return;
            }

            if (!response.ok) {
                console.warn(`[Assets] Sync failed: ${response.status}`);
                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                    console.error('[Assets] Max retries exceeded, stopping sync');
                    stopSync();
                }
                return;
            }

            retryCount = 0; // Reset on success
            const data = await response.json();
            console.log('[Assets] Sync successful', data);
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('assets:synced', { detail: data }));

        } catch (error) {
            console.error('[Assets] Sync error:', error.message);
            retryCount++;
            if (retryCount >= MAX_RETRIES) {
                console.error('[Assets] Max retries exceeded, stopping sync');
                stopSync();
            }
        } finally {
            isSyncing = false;
        }
    }

    /**
     * Sync codes with server (ONLY if authenticated)
     */
    async function syncCodes() {
        const sessionId = isAuthenticated();
        if (!sessionId) {
            console.log('[Codes] Guest mode - skipping sync');
            return;
        }

        try {
            const response = await fetch('/api/codes/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionId}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                console.warn('[Codes] Auth expired - clearing token');
                localStorage.removeItem('sessionId');
                stopSync();
                return;
            }

            if (response.ok) {
                const data = await response.json();
                window.dispatchEvent(new CustomEvent('codes:synced', { detail: data }));
            }
        } catch (error) {
            console.error('[Codes] Sync error:', error.message);
        }
    }

    /**
     * Start the sync loop
     */
    function startSync() {
        if (syncInterval) {
            return; // Already running
        }
        console.log('[Assets] Starting sync loop');
        syncWithServer(); // Initial sync
        syncInterval = setInterval(() => {
            syncWithServer();
            syncCodes();
        }, SYNC_INTERVAL);
    }

    /**
     * Stop the sync loop
     */
    function stopSync() {
        if (syncInterval) {
            console.log('[Assets] Stopping sync loop');
            clearInterval(syncInterval);
            syncInterval = null;
            retryCount = 0;
        }
    }

    /**
     * Auto-start based on auth status
     */
    function autoStartSync() {
        if (isAuthenticated()) {
            startSync();
        } else {
            console.log('[Assets] No auth - guest mode');
        }
    }

    /**
     * Listen for auth changes
     */
    window.addEventListener('storage', (e) => {
        if (e.key === 'sessionId' || e.key === 'auth_token') {
            if (e.newValue) {
                console.log('[Assets] Auth detected - starting sync');
                startSync();
            } else {
                console.log('[Assets] Auth cleared - stopping sync');
                stopSync();
            }
        }
    });

    // Export for manual control
    window.AssetSync = {
        start: startSync,
        stop: stopSync,
        sync: syncWithServer,
        syncCodes: syncCodes,
        isAuthenticated: isAuthenticated
    };

    // FIX 4: Listen for snapshot data from parent via postMessage
    window.addEventListener('message', function(event) {
        try {
            // Handle CODEBANK_ASSETS_SYNC messages from parent
            if (event.data?.type === 'CODEBANK_ASSETS_SYNC' && event.data.payload) {
                const snapshot = event.data.payload;
                console.log('[AssetsDirect] Received snapshot via postMessage:', {
                    codes: snapshot.codes?.length,
                    silver: snapshot.silver?.length,
                    gold: snapshot.gold?.length
                });
                
                // Load current cache
                let cache = AssetsDirectBus.loadFromCache() || {
                    codes: [],
                    silver: [],
                    gold: [],
                    likes: 0,
                    superlikes: 0
                };
                
                // Merge snapshot with existing cache
                if (snapshot.codes && Array.isArray(snapshot.codes)) {
                    cache.codes = mergeArraysUnique(snapshot.codes, cache.codes);
                }
                if (snapshot.silver) cache.silver = snapshot.silver;
                if (snapshot.gold) cache.gold = snapshot.gold;
                if (snapshot.likes) cache.likes = snapshot.likes;
                if (snapshot.superlikes) cache.superlikes = snapshot.superlikes;
                
                // Save merged cache
                AssetsDirectBus.saveToCache(cache);
                AssetsDirectBus.publish('assets:merged', cache);
                
                console.log('[AssetsDirect] ✅ Snapshot merged:', {
                    total: cache.codes.length,
                    from: 'postMessage'
                });
            }
        } catch (e) {
            console.error('[AssetsDirect] Snapshot merge error:', e);
        }
    });

    // Auto-start on page load
    document.addEventListener('DOMContentLoaded', autoStartSync);
    
    // Also try on script load (in case DOMContentLoaded already fired)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoStartSync);
    } else {
        autoStartSync();
    }

    console.log('[Assets] Direct client loaded - sync disabled in guest mode');
})();
