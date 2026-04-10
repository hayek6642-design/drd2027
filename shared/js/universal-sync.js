/**
 * Universal Sync Client
 * Works in: CodeBank parent, SafeCode, Samma3ny, Farragna, Pebalaash, Battalooda, etc.
 * 
 * Usage in any service:
 *   <script src="/shared/js/universal-sync.js"></script>
 *   window.UniversalSync.subscribe(event => { console.log(event); });
 */
(function(window) {
    'use strict';
    
    const SYNC_INTERVAL = 30000; // 30 seconds
    const RETRY_DELAY = 5000;
    const MAX_RETRIES = 3;
    
    window.UniversalSync = {
        state: {
            authenticated: false,
            user: null,
            assets: { codes: [], silver: [], gold: [] },
            totals: { codes: 0, silver: 0, gold: 0 },
            lastSync: null,
            syncing: false
        },
        
        listeners: new Set(),
        
        // Initialize sync
        async init() {
            console.log('[UniversalSync] Initializing...');
            
            // First sync
            await this.sync();
            
            // Periodic sync
            setInterval(() => this.sync(), SYNC_INTERVAL);
            
            // Visibility change sync (when tab becomes active)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    this.sync();
                }
            });
            
            console.log('[UniversalSync] Initialized');
        },
        
        // Main sync function
        async sync(retryCount = 0) {
            if (this.state.syncing) return;
            this.state.syncing = true;
            
            try {
                // 1. Check auth status using existing endpoint
                const authRes = await fetch('/api/auth/me', {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                // If not authenticated, try session endpoint
                let authData;
                if (authRes.status === 401) {
                    const sessionRes = await fetch('/api/session', { 
                        credentials: 'include' 
                    }).catch(() => null);
                    if (sessionRes && sessionRes.ok) {
                        authData = await sessionRes.json();
                        authData.authenticated = authData.user ? true : false;
                    } else {
                        authData = { authenticated: false, user: null };
                    }
                } else {
                    authData = await authRes.json();
                    authData.authenticated = authData.user ? true : false;
                }
                
                if (!authData.authenticated) {
                    this.clearState();
                    this.notifyListeners('auth:changed', { authenticated: false });
                    this.state.syncing = false;
                    return;
                }
                
                // 2. Get balances using existing endpoint
                const balanceRes = await fetch('/api/assets/balance', {
                    credentials: 'include'
                });
                
                let totals = { codes: 0, silver: 0, gold: 0 };
                if (balanceRes.ok) {
                    const balance = await balanceRes.json();
                    totals = {
                        codes: balance.codes_count || 0,
                        silver: balance.silver_count || 0,
                        gold: balance.gold_count || 0
                    };
                }
                
                // 3. Get full asset list
                let assets = { codes: [], silver: [], gold: [] };
                try {
                    const codesRes = await fetch('/api/codes/list', {
                        credentials: 'include'
                    });
                    if (codesRes.ok) {
                        const codesData = await codesRes.json();
                        assets.codes = codesData.codes || [];
                    }
                } catch(e) {
                    console.warn('[UniversalSync] Could not fetch codes list');
                }
                
                // 4. Update state
                this.state = {
                    authenticated: true,
                    user: authData.user,
                    assets: assets,
                    totals: totals,
                    lastSync: Date.now(),
                    syncing: false
                };
                
                // 5. Cache to localStorage (for offline resilience)
                this.cacheState();
                
                // 6. Notify all listeners
                this.notifyListeners('sync:complete', this.state);
                this.notifyListeners('assets:updated', this.state.assets);
                
                console.log('[UniversalSync] Sync complete:', {
                    codes: this.state.totals.codes,
                    silver: this.state.totals.silver,
                    gold: this.state.totals.gold
                });
                
            } catch (err) {
                console.error('[UniversalSync] Sync error:', err);
                this.state.syncing = false;
                
                // Retry logic
                if (retryCount < MAX_RETRIES) {
                    setTimeout(() => this.sync(retryCount + 1), RETRY_DELAY);
                } else {
                    // Use cached data if available
                    this.loadFromCache();
                }
            }
        },
        
        // Cache state to localStorage
        cacheState() {
            try {
                const cache = {
                    user: this.state.user,
                    assets: this.state.assets,
                    totals: this.state.totals,
                    timestamp: this.state.lastSync,
                    sessionId: this.getSessionId()
                };
                localStorage.setItem('universal_sync_cache', JSON.stringify(cache));
            } catch (e) {}
        },
        
        // Load from cache
        loadFromCache() {
            try {
                const cached = localStorage.getItem('universal_sync_cache');
                if (cached) {
                    const data = JSON.parse(cached);
                    // Verify session matches
                    if (data.sessionId === this.getSessionId()) {
                        this.state.assets = data.assets;
                        this.state.totals = data.totals;
                        this.state.user = data.user;
                        this.state.authenticated = !!data.user;
                        this.notifyListeners('sync:cache', this.state);
                        console.log('[UniversalSync] Loaded from cache');
                    }
                }
            } catch (e) {}
        },
        
        // Transaction API (for services to spend/earn)
        async transaction(type, action, amount, service, metadata = {}) {
            try {
                const res = await fetch('/api/assets/transaction', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, action, amount, service, metadata })
                });
                
                const result = await res.json();
                
                if (result.success) {
                    // Force immediate sync
                    await this.sync();
                    return result;
                } else {
                    throw new Error(result.error);
                }
                
            } catch (err) {
                console.error('[UniversalSync] Transaction failed:', err);
                throw err;
            }
        },
        
        // Subscribe to changes
        subscribe(callback) {
            this.listeners.add(callback);
            // Immediately call with current state
            callback({ type: 'init', state: this.state });
            
            // Return unsubscribe
            return () => this.listeners.delete(callback);
        },
        
        notifyListeners(type, data) {
            this.listeners.forEach(cb => {
                try {
                    cb({ type, data, timestamp: Date.now() });
                } catch (e) {}
            });
        },
        
        clearState() {
            this.state = {
                authenticated: false,
                user: null,
                assets: { codes: [], silver: [], gold: [] },
                totals: { codes: 0, silver: 0, gold: 0 },
                lastSync: null,
                syncing: false
            };
            localStorage.removeItem('universal_sync_cache');
        },
        
        getSessionId() {
            const match = document.cookie.match(/sessionId=([^;]+)/);
            const match2 = document.cookie.match(/session_token=([^;]+)/);
            return match ? match[1] : (match2 ? match2[1] : null);
        },
        
        // Getters for services
        isAuthenticated() { return this.state.authenticated; },
        getUser() { return this.state.user; },
        getAssets() { return this.state.assets; },
        getTotals() { return this.state.totals; },
        getCodes() { return this.state.assets.codes || []; },
        getSilver() { return this.state.assets.silver || []; },
        getGold() { return this.state.assets.gold || []; }
    };
    
    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.UniversalSync.init());
    } else {
        window.UniversalSync.init();
    }
    
})(window);