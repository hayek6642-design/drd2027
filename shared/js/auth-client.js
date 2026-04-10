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
            loading: true
        },
        
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
