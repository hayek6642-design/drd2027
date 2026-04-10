/**
 * Auth Client - Direct API communication, NO BRIDGES
 * Used by: CodeBank, SafeCode, Samma3ny, Farragna, Pebalaash, Battalooda, etc.
 * 
 * Each service independently checks /api/auth/status and /api/assets/sync
 * Same-origin = shared cookies = automatic auth
 */
(function(window) {
    'use strict';
    
    window.AuthClient = {
        state: {
            authenticated: false,
            user: null,
            assets: null,
            loading: true,
            autoModeActive: false
        },
        
        autoModeCheckInterval: null,
        
        listeners: [],
        
        /**
         * Initialize and check auth status
         */
        async init() {
            console.log('[AuthClient] Initializing...');
            await this.checkAuth();
            
            // Periodic re-check every 5 minutes
            setInterval(() => this.checkAuth(), 300000);
        },
        
        /**
         * Check auth status directly with API
         * Reads sessionId from cookie automatically via credentials: 'include'
         */
        async checkAuth() {
            try {
                const res = await fetch('/api/auth/status', {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                const data = await res.json();
                
                this.state.loading = false;
                this.state.authenticated = data.authenticated || false;
                this.state.user = data.user || null;
                
                if (this.state.authenticated) {
                    // Fetch assets if authenticated
                    await this.fetchAssets();
                }
                
                this.notify('auth:changed', this.state);
                return this.state.authenticated;
                
            } catch (err) {
                console.error('[AuthClient] Auth check failed:', err);
                this.state.loading = false;
                this.state.authenticated = false;
                this.notify('auth:changed', this.state);
                return false;
            }
        },
        
        /**
         * Fetch assets directly from API
         */
        async fetchAssets() {
            try {
                const res = await fetch('/api/assets/sync', {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                const data = await res.json();
                
                if (data.success) {
                    this.state.assets = data.assets || {};
                    this.notify('assets:updated', data.assets);
                }
                
                return data;
            } catch (err) {
                console.error('[AuthClient] Asset fetch failed:', err);
                return null;
            }
        },
        
        /**
         * Login with email and password
         */
        async login(email, password) {
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    this.state.authenticated = true;
                    this.state.user = data.user || null;
                    await this.fetchAssets();
                    this.notify('auth:login', this.state);
                }
                
                return data;
            } catch (err) {
                console.error('[AuthClient] Login failed:', err);
                return { success: false, error: 'Network error' };
            }
        },
        
        /**
         * Logout and clear session
         */
        async logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (err) {
                console.error('[AuthClient] Logout fetch failed:', err);
            }
            
            this.state.authenticated = false;
            this.state.user = null;
            this.state.assets = null;
            this.notify('auth:logout', {});
            
            // Redirect to login
            window.location.href = '/login.html';
        },
        
        /**
         * Record a transaction (spend/earn codes/silver/gold)
         */
        async transaction(type, action, amount, service, metadata = {}) {
            // Check authentication first
            if (!this.state.authenticated) {
                console.warn('[AuthClient] Transaction blocked: not authenticated');
                return { success: false, error: 'Not authenticated', code: 'NOT_AUTH' };
            }
            
            try {
                const res = await fetch('/api/assets/transaction', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, action, amount, service, metadata })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    // Refresh assets after transaction
                    await this.fetchAssets();
                }
                
                return data;
            } catch (err) {
                console.error('[AuthClient] Transaction failed:', err);
                return { success: false, error: 'Network error' };
            }
        },
        
        /**
         * Start auto-mode session (called when user activates auto-mode in Samma3ny)
         */
        async startAutoMode() {
            if (!this.state.authenticated) {
                return { success: false, error: 'Not authenticated' };
            }
            
            try {
                const res = await fetch('/api/auto-mode/start', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await res.json();
                
                if (data.success) {
                    console.log('[AuthClient] Auto-mode started');
                    this.state.autoModeActive = true;
                    
                    // Start polling for silver awards every 60 seconds
                    if (!this.autoModeCheckInterval) {
                        this.autoModeCheckInterval = setInterval(() => this.checkAutoMode(), 60000);
                    }
                }
                
                return data;
            } catch (err) {
                console.error('[AuthClient] Auto-mode start failed:', err);
                return { success: false, error: 'Network error' };
            }
        },
        
        /**
         * Stop auto-mode session (called when user deactivates auto-mode)
         */
        async stopAutoMode() {
            if (!this.state.authenticated) {
                return { success: false, error: 'Not authenticated' };
            }
            
            try {
                // Clear polling interval
                if (this.autoModeCheckInterval) {
                    clearInterval(this.autoModeCheckInterval);
                    this.autoModeCheckInterval = null;
                }
                
                const res = await fetch('/api/auto-mode/stop', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await res.json();
                
                if (data.success) {
                    console.log('[AuthClient] Auto-mode stopped');
                    this.state.autoModeActive = false;
                }
                
                return data;
            } catch (err) {
                console.error('[AuthClient] Auto-mode stop failed:', err);
                return { success: false, error: 'Network error' };
            }
        },
        
        /**
         * Check auto-mode status and award silver if 2 hours elapsed
         * Called periodically while auto-mode is active
         */
        async checkAutoMode() {
            if (!this.state.authenticated) {
                return;
            }
            
            try {
                const res = await fetch('/api/auto-mode/check', {
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                const data = await res.json();
                
                if (data.success) {
                    // If silver was awarded, refresh assets and notify
                    if (data.silverAwarded > 0) {
                        console.log(`[AuthClient] 🎉 ${data.silverAwarded} silver awarded!`);
                        await this.fetchAssets();
                        this.notify('silver:awarded', {
                            amount: data.silverAwarded,
                            totalAwards: data.totalAwards,
                            newAssets: data.newAssets
                        });
                    }
                    
                    // Update auto-mode status
                    if (!data.isActive) {
                        this.state.autoModeActive = false;
                        if (this.autoModeCheckInterval) {
                            clearInterval(this.autoModeCheckInterval);
                            this.autoModeCheckInterval = null;
                        }
                    }
                }
                
                return data;
            } catch (err) {
                console.error('[AuthClient] Auto-mode check failed:', err);
            }
        },
        
        /**
         * Subscribe to auth events
         */
        on(event, callback) {
            this.listeners.push({ event, callback });
        },
        
        /**
         * Notify all listeners of an event
         */
        notify(event, data) {
            this.listeners.forEach(l => {
                if (l.event === event) {
                    try {
                        l.callback(data);
                    } catch (err) {
                        console.error(`[AuthClient] Callback error for ${event}:`, err);
                    }
                }
            });
        },
        
        /**
         * Transfer assets to another user
         */
        async transfer(receiverEmail, assetType, amount) {
            if (!this.state.authenticated) {
                return { success: false, error: 'Not authenticated' };
            }
            
            if (!receiverEmail || !assetType || !amount) {
                return { success: false, error: 'Missing required fields' };
            }
            
            try {
                // Generate unique transaction ID for idempotency
                const transactionId = `TXF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // Prepare the request body based on asset type
                let body = {
                    transactionId,
                    receiverEmail,
                    type: assetType,
                    amount: amount
                };
                
                // For codes, we need an array of code values
                if (assetType === 'codes' && Array.isArray(amount)) {
                    body.codes = amount;
                } else if (assetType === 'codes') {
                    body.codes = []; // Will be filled by backend if needed
                }
                
                const res = await fetch('/api/transfer', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                const data = await res.json();
                
                if (data.success) {
                    // Refresh assets after successful transfer
                    await this.fetchAssets();
                    this.notify('transfer:success', { receiverEmail, assetType, amount });
                }
                
                return data;
            } catch (err) {
                console.error('[AuthClient] Transfer failed:', err);
                return { success: false, error: 'Network error' };
            }
        },
        
        /**
         * Getters
         */
        isAuth() { return this.state.authenticated; },
        getUser() { return this.state.user; },
        getAssets() { return this.state.assets; },
        getEmail() { return this.state.user?.email; },
        isLoading() { return this.state.loading; }
    };
    
    /**
     * Auto-initialize on page load
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.AuthClient.init();
        });
    } else {
        window.AuthClient.init();
    }
    
})(window);
