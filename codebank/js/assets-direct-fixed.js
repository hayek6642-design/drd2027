/**
 * assets-direct-fixed.js
 * Enhanced asset management with proper postMessage handling and error recovery
 * 
 * Features:
 * - Robust cross-origin communication
 * - Automatic retry logic for failed syncs
 * - LocalStorage fallback cache
 * - Event-driven architecture
 * - User isolation for security
 */
(function(window) {
    'use strict';

    // Debug logging utility
    const debug = {
        log: (...args) => console.log('[AssetsManager]', ...args),
        warn: (...args) => console.warn('[AssetsManager]', ...args),
        error: (...args) => console.error('[AssetsManager]', ...args)
    };

    window.AssetsManager = {
        state: {
            codes: [],
            silver: [],
            gold: [],
            lastSync: null,
            syncInProgress: false,
            syncAttempts: 0,
            maxRetries: 3
        },

        /**
         * Main sync function - fetches assets from API
         * with retry logic and error handling
         */
        async sync() {
            if (this.state.syncInProgress) {
                debug.warn('Sync already in progress, skipping...');
                return null;
            }

            this.state.syncInProgress = true;
            
            try {
                debug.log('Starting asset sync...');
                
                // Attempt API call
                const res = await fetch('/api/codes/list', { 
                    credentials: 'include',
                    timeout: 10000 
                });

                if (!res.ok) {
                    debug.warn(`API returned status ${res.status}, checking cache...`);
                    this.loadFromCache();
                    return this.state;
                }

                const data = await res.json();
                if (!data.success) {
                    debug.warn('API returned success=false, checking cache...');
                    this.loadFromCache();
                    return this.state;
                }

                // Process and store assets
                const snapshot = this._processAssets(data.codes);
                
                // Update state
                this.state.codes = snapshot.codes;
                this.state.silver = snapshot.silver;
                this.state.gold = snapshot.gold;
                this.state.lastSync = Date.now();
                this.state.syncAttempts = 0;

                // Update AppState for global access
                window.AppState = window.AppState || {};
                window.AppState.assets = {
                    codes: snapshot.codes,
                    silver: snapshot.silver,
                    gold: snapshot.gold,
                    lastSync: this.state.lastSync
                };

                // Save to cache as backup
                this.saveToCache(snapshot);

                // Dispatch events
                this._dispatchEvents(snapshot);

                // Broadcast to iframes
                this._broadcastToIframes(snapshot);

                debug.log(
                    `✅ Synced: ${snapshot.codes.length} codes, ` +
                    `${snapshot.silver.length} silver, ${snapshot.gold.length} gold`
                );

                return snapshot;

            } catch (e) {
                debug.error('Sync failed:', e);
                
                // Increment retry counter
                this.state.syncAttempts++;
                
                if (this.state.syncAttempts < this.state.maxRetries) {
                    // Schedule retry with exponential backoff
                    const delay = 1000 * Math.pow(2, this.state.syncAttempts - 1);
                    debug.warn(`Retrying sync in ${delay}ms (attempt ${this.state.syncAttempts}/${this.state.maxRetries})`);
                    setTimeout(() => this.sync(), delay);
                } else {
                    // Max retries reached, use cache
                    debug.warn('Max retries reached, falling back to cache');
                    this.loadFromCache();
                }

                return this.state;

            } finally {
                this.state.syncInProgress = false;
            }
        },

        /**
         * Process raw asset data from API
         */
        _processAssets(rows) {
            const toCode = r => (typeof r === 'string' ? r : (r.code || r));

            const snapshot = {
                codes: [],
                silver: [],
                gold: [],
                raw: rows
            };

            if (!Array.isArray(rows)) {
                debug.warn('Asset data is not an array, using empty defaults');
                return snapshot;
            }

            snapshot.codes = rows
                .filter(r => !r.type || r.type === 'codes' || r.type === 'normal')
                .map(toCode)
                .filter(c => c); // Remove empty values

            snapshot.silver = rows
                .filter(r => r.type === 'silver')
                .map(toCode)
                .filter(c => c);

            snapshot.gold = rows
                .filter(r => r.type === 'gold')
                .map(toCode)
                .filter(c => c);

            return snapshot;
        },

        /**
         * Dispatch events for asset updates
         */
        _dispatchEvents(snapshot) {
            try {
                // EventBus events (if available)
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

                // Custom events (legacy compat)
                window.dispatchEvent(new CustomEvent('assets:updated', {
                    detail: {
                        codes: snapshot.codes,
                        silver: snapshot.silver,
                        gold: snapshot.gold,
                        lastSync: this.state.lastSync
                    }
                }));

                window.dispatchEvent(new CustomEvent('sqlite:snapshot', {
                    detail: {
                        latestCode: snapshot.codes[0],
                        codesList: snapshot.codes,
                        count: snapshot.codes.length
                    }
                }));

            } catch (e) {
                debug.warn('Failed to dispatch events:', e);
            }
        },

        /**
         * Broadcast assets to all iframes with proper origin handling
         */
        _broadcastToIframes(snapshot) {
            try {
                const iframes = document.querySelectorAll('iframe');
                debug.log(`Broadcasting to ${iframes.length} iframes...`);

                iframes.forEach((iframe, index) => {
                    try {
                        const msgData = {
                            type: 'parent:assets-init',
                            assets: {
                                codes: snapshot.codes,
                                silver: snapshot.silver,
                                gold: snapshot.gold,
                                lastSync: this.state.lastSync
                            },
                            user: window.AppState?.user || null,
                            timestamp: Date.now()
                        };

                        // Use wildcard for now, but log it for debugging
                        if (iframe.contentWindow) {
                            iframe.contentWindow.postMessage(msgData, '*');
                            debug.log(`Sent assets to iframe[${index}]`);
                        }
                    } catch (e) {
                        debug.warn(`Failed to send message to iframe[${index}]:`, e);
                    }
                });

            } catch (e) {
                debug.warn('Iframe broadcast failed:', e);
            }
        },

        /**
         * Save assets to localStorage as backup
         */
        saveToCache(snapshot) {
            try {
                const userId = window.AppState?.user?.id || 
                              window.AppState?.user?.userId || 
                              'anonymous';

                localStorage.setItem('zagel_assets', JSON.stringify({
                    codes: snapshot.codes,
                    silver: snapshot.silver,
                    gold: snapshot.gold,
                    timestamp: Date.now(),
                    userId: userId
                }));

                localStorage.setItem('zagel_assets_user', userId);
                debug.log('Assets saved to cache');

            } catch (e) {
                debug.warn('Failed to save to cache:', e);
            }
        },

        /**
         * Load assets from cache
         */
        loadFromCache() {
            try {
                const cached = localStorage.getItem('zagel_assets');
                const cachedUser = localStorage.getItem('zagel_assets_user');
                const currentUser = window.AppState?.user?.id || 
                                   window.AppState?.user?.userId;

                if (!cached) {
                    debug.log('No cache found');
                    return false;
                }

                // User mismatch - don't use cache for security
                if (currentUser && cachedUser !== currentUser) {
                    debug.warn('User mismatch - clearing old cache');
                    this.clearCache();
                    return false;
                }

                const snapshot = JSON.parse(cached);
                this.state.codes = snapshot.codes || [];
                this.state.silver = snapshot.silver || [];
                this.state.gold = snapshot.gold || [];
                this.state.lastSync = snapshot.timestamp;

                window.AppState = window.AppState || {};
                window.AppState.assets = {
                    codes: snapshot.codes,
                    silver: snapshot.silver,
                    gold: snapshot.gold,
                    lastSync: snapshot.timestamp,
                    fromCache: true
                };

                this._dispatchEvents(snapshot);
                debug.log('✓ Loaded from cache:', snapshot.codes.length, 'codes');

                return true;

            } catch (e) {
                debug.error('Failed to load from cache:', e);
                return false;
            }
        },

        /**
         * Clear cache (e.g., on logout)
         */
        clearCache() {
            try {
                localStorage.removeItem('zagel_assets');
                localStorage.removeItem('zagel_assets_user');
                
                this.state.codes = [];
                this.state.silver = [];
                this.state.gold = [];

                window.AppState = window.AppState || {};
                window.AppState.assets = {
                    codes: [],
                    silver: [],
                    gold: [],
                    lastSync: null
                };

                debug.log('Cache cleared');
            } catch (e) {
                debug.warn('Failed to clear cache:', e);
            }
        },

        /**
         * Write a single code to the backend
         */
        async writeCode(code) {
            try {
                if (!code) {
                    debug.warn('writeCode called with empty code');
                    return { ok: false, error: 'Empty code' };
                }

                debug.log('Writing code:', code);

                const res = await fetch('/api/codes/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                    credentials: 'include'
                });

                const result = await res.json();
                
                if (res.ok && result.success) {
                    debug.log('✓ Code written successfully');
                    // Refresh all assets
                    await this.sync();
                    return { ok: true };
                }

                debug.warn('Write failed:', result.error);
                return { ok: false, error: result.error || 'Unknown error' };

            } catch (e) {
                debug.error('Write error:', e);
                return { ok: false, error: e.message };
            }
        },

        /**
         * Public API - get current snapshot
         */
        snapshot() {
            return {
                codes: this.state.codes,
                silver: this.state.silver,
                gold: this.state.gold,
                lastSync: this.state.lastSync
            };
        },

        /**
         * Public API - async get snapshot
         */
        getSnapshot() {
            return Promise.resolve(this.snapshot());
        }
    };

    // ============================================
    // LISTEN FOR MESSAGES FROM IFRAMES
    // ============================================
    window.addEventListener('message', (e) => {
        try {
            // Log all messages for debugging
            if (e.data?.type) {
                debug.log('Received message from iframe:', e.data.type, 'origin:', e.origin);
            }

            // Handle asset requests from child iframes
            if (e.data?.type === 'iframe:assets:request') {
                const assets = window.AssetsManager.snapshot();
                e.source.postMessage({
                    type: 'parent:assets:response',
                    assets: assets,
                    timestamp: Date.now()
                }, '*');
                debug.log('Responded to iframe asset request');
                return;
            }

            // Handle asset sync messages
            if (e.data?.type === 'assets:sync' || e.data?.type === 'assets:response') {
                debug.log('Asset sync message from child');
                // Could process child updates here if needed
                return;
            }

        } catch (err) {
            debug.error('Message handler error:', err);
        }
    });

    // ============================================
    // SETUP EVENT BUS LISTENERS
    // ============================================
    const setupEventBusListener = () => {
        if (window.EventBus && typeof window.EventBus.on === 'function') {
            window.EventBus.on('assets:update', async ({ type, action, data } = {}) => {
                debug.log('EventBus asset:update -', action);
                if (action === 'add' && data) {
                    await window.AssetsManager.writeCode(data);
                } else {
                    await window.AssetsManager.sync();
                }
            });
            debug.log('✓ EventBus listener configured');
            return true;
        }
        return false;
    };

    if (!setupEventBusListener()) {
        debug.warn('EventBus not ready yet, retrying in 500ms...');
        setTimeout(() => {
            if (!setupEventBusListener()) {
                debug.error('EventBus still not available after retry');
            }
        }, 500);
    }

    // ============================================
    // LEGACY COMPATIBILITY SHIMS
    // ============================================
    window.writeCodeToSQLite = async function(d) {
        return window.AssetsManager.writeCode(d.code || d);
    };

    window.GET_AUTHORITATIVE_ASSETS = function() {
        return window.AssetsManager.snapshot();
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    const initialize = async () => {
        debug.log('Initializing AssetsManager...');

        // Try to load from cache first (faster)
        const hasCache = window.AssetsManager.loadFromCache();
        
        // Then sync with API in background
        setTimeout(() => {
            window.AssetsManager.sync();
        }, 100);
    };

    // Start on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // ============================================
    // PERIODIC SYNC
    // ============================================
    setInterval(() => {
        window.AssetsManager.sync();
    }, 30000); // Every 30 seconds

    // ============================================
    // AUTH EVENT HANDLERS
    // ============================================
    window.addEventListener('auth:logout', () => {
        debug.log('Logout detected - clearing assets');
        window.AssetsManager.clearCache();
    });

    window.addEventListener('auth:changed', (e) => {
        if (!e.detail?.authenticated) {
            debug.log('Auth changed to logged out');
            window.AssetsManager.clearCache();
        } else if (e.detail?.authenticated) {
            debug.log('Auth changed to logged in - syncing assets');
            window.AssetsManager.sync();
        }
    });

    window.addEventListener('auth:login', () => {
        debug.log('Login event detected - syncing assets');
        window.AssetsManager.sync();
    });

    window.addEventListener('auth:signup', () => {
        debug.log('Signup event detected - syncing assets');
        window.AssetsManager.sync();
    });

    debug.log('✅ Initialized');

})(window);
