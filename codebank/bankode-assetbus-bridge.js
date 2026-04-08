/**
 * Bankode AssetBus Bridge - GLOBAL PROVIDER
 * Enhanced with Capacitor native HTTP support for CORS-free requests on mobile.
 */
(function(window) {
    'use strict';

    // ==========================================
    // RELIABLE IFRAME DETECTION
    // ==========================================
    function isInIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            // Access denied = definitely in iframe
            return true;
        }
    }
    
    const _isIframe = isInIframe();
    
    // Console rate limiter to prevent spam
    const _logCounts = new Map();
    let _lastLogTime = 0;
    function _rateLimitedLog(...args) {
        const key = args.join('').slice(0, 50);
        const now = Date.now();
        
        if (now - _lastLogTime > 1000) {
            _logCounts.clear();
            _lastLogTime = now;
        }
        
        const count = _logCounts.get(key) || 0;
        if (count < 3) {
            _logCounts.set(key, count + 1);
            console.log(...args);
        } else if (count === 3) {
            console.log('[... logs suppressed for:', key.slice(0, 30), ']');
            _logCounts.set(key, count + 1);
        }
    }

    // ==========================================
    // EARLY IFRAME PROXY - Install BEFORE any other code
    // ==========================================
    if (_isIframe) {
        console.log('[Bridge] Running in iframe - installing early proxy');
        
        // Install proxy AssetBus that receives messages from parent
        window.AssetBus = {
            _snapshot: null,
            _listeners: new Map(),
            
            subscribe: function(event, callback) {
                if (!this._listeners.has(event)) {
                    this._listeners.set(event, new Set());
                }
                this._listeners.get(event).add(callback);
                
                // Request initial data from parent
                window.parent.postMessage({
                    type: 'bridge:request-assets',
                    source: 'safecode-iframe',
                    timestamp: Date.now()
                }, '*');
                
                return () => this._listeners.get(event)?.delete(callback);
            },
            
            publish: function(event, data) {
                window.parent.postMessage({
                    type: 'assetbus:publish',
                    event: event,
                    data: data
                }, '*');
            },
            
            snapshot: function() {
                return this._snapshot;
            },
            
            getSnapshot: function() {
                return Promise.resolve(this._snapshot);
            },
            
            sync: function() {
                window.parent.postMessage({
                    type: 'bridge:request-assets',
                    source: 'safecode-iframe',
                    timestamp: Date.now()
                }, '*');
            }
        };
        
        // Listen for messages from parent
        window.addEventListener('message', function(e) {
            const data = e.data;
            if (!data) return;
            
            console.log('[Bridge] Iframe received:', data.type);
            
            // Handle asset snapshots
            if (data.type === 'assetbus:snapshot' || data.type === 'CODEBANK_ASSETS_SYNC') {
                window.AssetBus._snapshot = data.data || data.payload;
                console.log('[Bridge] Iframe snapshot updated:', window.AssetBus._snapshot);
                
                // Dispatch events
                window.dispatchEvent(new CustomEvent('sqlite:snapshot', { 
                    detail: window.AssetBus._snapshot 
                }));
                window.dispatchEvent(new CustomEvent('assets:updated', { 
                    detail: window.AssetBus._snapshot 
                }));
            }
            
            // Handle assets:sync from indexCB
            if (data.type === 'assets:sync' && data.assets) {
                window.AssetBus._snapshot = data.assets;
                console.log('[Bridge] Iframe assets:sync updated:', window.AssetBus._snapshot);
                
                window.dispatchEvent(new CustomEvent('sqlite:snapshot', { 
                    detail: window.AssetBus._snapshot 
                }));
                window.dispatchEvent(new CustomEvent('assets:updated', { 
                    detail: window.AssetBus._snapshot 
                }));
            }
            
            // Handle specific event broadcasts
            if (data.type && data.type.startsWith('assetbus:')) {
                const eventName = data.type.replace('assetbus:', '');
                window.AssetBus._listeners.get(eventName)?.forEach(cb => {
                    try { cb(data.data); } catch(e) {}
                });
            }
        });
        
        console.log('[Bridge] Early iframe proxy installed');
    }

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

    // Enable debug mode
    window.DEBUG_MODE = true;
    
    // ==========================================
    // IFRAME ASSETBUS PROXY - For SafeCode iframe communication
    // ==========================================
    console.log('[Bridge] Parent check: window.parent !== window =', window.parent !== window);
    
    if (window.parent !== window) {
        console.log('[Bridge] Running in iframe mode, creating IframeAssetBusProxy');
        
        // Expose for debugging
        window.BankodeAssetBusBridge = {
            mode: 'iframe',
            createdAt: Date.now()
        };
        
        class IframeAssetBusProxy {
            constructor() {
                this.listeners = new Map();
                this._ready = false;
                this._readyResolve = null;
                this._snapshot = null;
                
                this.setupListener();
                this.requestAssets();
                
                // Signal ready
                this._ready = true;
                window.dispatchEvent(new CustomEvent('assetbus-ready'));
            }
            
            setupListener() {
                window.addEventListener('message', (e) => {
                    const data = e.data;
                    if (!data) return;
                    
                    console.log('[Bridge] Received message:', data.type, data);
                    
                    // Handle asset snapshot from parent (bridge:request-assets response)
                    if (data.type === 'assetbus:snapshot' || data.type === 'CODEBANK_ASSETS_SYNC') {
                        console.log('[Bridge] Received asset snapshot from parent:', data);
                        this._snapshot = data.data || data.payload;
                        
                        // Dispatch events for safe-asset-list.js
                        window.dispatchEvent(new CustomEvent('sqlite:snapshot', { 
                            detail: this._snapshot 
                        }));
                        window.dispatchEvent(new CustomEvent('assets:updated', { 
                            detail: this._snapshot 
                        }));
                        
                        console.log('[Bridge] Dispatched events, snapshot now:', this._snapshot);
                    }
                    
                    // Handle assets:sync from indexCB.html
                    if (data.type === 'assets:sync' && data.assets) {
                        console.log('[Bridge] Received assets:sync from parent:', data);
                        this._snapshot = data.assets;
                        
                        // Dispatch events for safe-asset-list.js
                        window.dispatchEvent(new CustomEvent('sqlite:snapshot', { 
                            detail: this._snapshot 
                        }));
                        window.dispatchEvent(new CustomEvent('assets:updated', { 
                            detail: this._snapshot 
                        }));
                        
                        console.log('[Bridge] Dispatched events from assets:sync, snapshot now:', this._snapshot);
                    }
                    
                    // Handle direct asset updates
                    if (data.type && data.type.startsWith('assetbus:')) {
                        this.handleMessage(data);
                    }
                });
            }
            
            requestAssets() {
                // Request initial assets from parent
                console.log('[Bridge] Requesting assets from parent');
                window.parent.postMessage({
                    type: 'bridge:request-assets',
                    source: 'safecode',
                    timestamp: Date.now()
                }, '*');
                
                // Retry after 2 seconds in case parent wasn't ready
                setTimeout(() => {
                    if (!this._snapshot) {
                        console.log('[Bridge] Retrying asset request');
                        window.parent.postMessage({
                            type: 'bridge:request-assets',
                            source: 'safecode-retry',
                            timestamp: Date.now()
                        }, '*');
                    }
                }, 2000);
            }
            
            subscribe(event, callback) {
                if (!this.listeners.has(event)) {
                    this.listeners.set(event, new Set());
                }
                this.listeners.get(event).add(callback);
                
                // Subscribe in parent too
                window.parent.postMessage({
                    type: 'assetbus:subscribe',
                    event: event
                }, '*');
                
                return () => this.unsubscribe(event, callback);
            }
            
            unsubscribe(event, callback) {
                this.listeners.get(event)?.delete(callback);
            }
            
            publish(event, data) {
                window.parent.postMessage({
                    type: 'assetbus:publish',
                    event: event,
                    data: data
                }, '*');
            }
            
            handleMessage(msg) {
                if (msg.type === 'assetbus:broadcast' && msg.event) {
                    this.listeners.get(msg.event)?.forEach(cb => {
                        try { cb(msg.data); } catch(e) {}
                    });
                }
            }
            
            snapshot() {
                return this._snapshot;
            }
            
            getSnapshot() {
                return new Promise((resolve) => {
                    if (this._snapshot) {
                        resolve(this._snapshot);
                        return;
                    }
                    
                    const handler = (e) => {
                        if (e.data?.type === 'assetbus:snapshot' || e.data?.type === 'CODEBANK_ASSETS_SYNC') {
                            window.removeEventListener('message', handler);
                            resolve(e.data.data || e.data.payload);
                        }
                    };
                    window.addEventListener('message', handler);
                    
                    // Request from parent
                    this.requestAssets();
                    
                    setTimeout(() => resolve(this._snapshot), 3000);
                });
            }
            
            sync() {
                this.requestAssets();
            }
        }
        
        // Install the proxy
        window.AssetBus = new IframeAssetBusProxy();
        console.log('[Bridge] IframeAssetBusProxy installed');
    }

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