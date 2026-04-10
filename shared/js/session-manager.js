/**
 * Session Manager
 * Handles persistent sessions, auto-login, and email display
 */
(function(window) {
    'use strict';
    
    const SESSION_KEY = 'codebank_session';
    const USER_KEY = 'codebank_user';
    
    window.SessionManager = {
        state: {
            authenticated: false,
            user: null,
            sessionId: null,
            initialized: false
        },
        
        // Initialize on app load
        async init() {
            console.log('[SessionManager] Initializing...');
            
            // Try to restore session
            const restored = await this.restoreSession();
            
            if (restored) {
                console.log('[SessionManager] Auto-login successful');
                this.redirectToApp();
            } else {
                console.log('[SessionManager] No valid session, showing login');
                this.redirectToLogin();
            }
            
            this.state.initialized = true;
        },
        
        // Attempt to restore session from multiple sources
        async restoreSession() {
            let sessionId = null;
            
            // Check localStorage backup
            try {
                const cached = localStorage.getItem(SESSION_KEY);
                if (cached) {
                    const session = JSON.parse(cached);
                    if (session.sessionId && new Date(session.expiresAt) > new Date()) {
                        sessionId = session.sessionId;
                    }
                }
            } catch (e) {}
            
            // Validate with server
            if (sessionId) {
                try {
                    const res = await fetch('/api/auth/validate-session', {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'X-Session-Id': sessionId,
                            'Accept': 'application/json'
                        }
                    });
                    
                    const data = await res.json();
                    
                    if (data.valid) {
                        this.state.authenticated = true;
                        this.state.user = data.user;
                        this.state.sessionId = data.sessionId || sessionId;
                        
                        // Update localStorage
                        this.saveSession(data.sessionId || sessionId, data.user);
                        
                        // Dispatch auth ready event
                        window.dispatchEvent(new CustomEvent('auth:ready', {
                            detail: { user: data.user, sessionId: data.sessionId }
                        }));
                        
                        return true;
                    } else {
                        // Session invalid, clear cache
                        this.clearSession();
                    }
                    
                } catch (err) {
                    console.error('[SessionManager] Validation error:', err);
                    // Network error - try to use cached session temporarily
                    return this.useCachedSession(sessionId);
                }
            }
            
            return false;
        },
        
        // Use cached session temporarily (offline mode)
        useCachedSession(sessionId) {
            try {
                const cached = localStorage.getItem(USER_KEY);
                if (cached) {
                    const user = JSON.parse(cached);
                    this.state.authenticated = true;
                    this.state.user = user;
                    this.state.sessionId = sessionId;
                    
                    window.dispatchEvent(new CustomEvent('auth:ready', {
                        detail: { user: user, sessionId: sessionId, offline: true }
                    }));
                    
                    return true;
                }
            } catch (e) {}
            
            return false;
        },
        
        // Save session to all storage
        saveSession(sessionId, user, expiresAt) {
            const expiry = expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            
            const sessionData = {
                sessionId: sessionId,
                expiresAt: expiry,
                savedAt: new Date().toISOString()
            };
            
            try {
                localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
                localStorage.setItem(USER_KEY, JSON.stringify(user));
            } catch (e) {
                console.warn('[SessionManager] localStorage failed');
            }
            
            this.state.sessionId = sessionId;
            this.state.user = user;
            this.state.authenticated = true;
        },
        
        // Login handler
        async login(email, password) {
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    this.saveSession(data.sessionId, data.user, data.expiresAt);
                    
                    window.dispatchEvent(new CustomEvent('auth:login', {
                        detail: { user: data.user }
                    }));
                    
                    return { success: true, user: data.user };
                } else {
                    return { success: false, error: data.error };
                }
                
            } catch (err) {
                console.error('[SessionManager] Login error:', err);
                return { success: false, error: 'Network error' };
            }
        },
        
        // Logout handler
        async logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (e) {}
            
            this.clearSession();
            
            window.dispatchEvent(new CustomEvent('auth:logout'));
            
            // Redirect to login
            this.redirectToLogin();
        },
        
        // Clear all session data
        clearSession() {
            this.state = {
                authenticated: false,
                user: null,
                sessionId: null,
                initialized: true
            };
            
            try {
                localStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(USER_KEY);
                sessionStorage.removeItem(SESSION_KEY);
            } catch (e) {}
            
            // Clear all app caches
            this.clearAppCaches();
        },
        
        clearAppCaches() {
            // Clear asset caches
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('codebank_') || key.includes('_cache'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                try { localStorage.removeItem(key); } catch(e) {}
            });
        },
        
        // Redirect helpers
        redirectToApp() {
            const currentPage = window.location.pathname;
            if (currentPage.includes('login') || currentPage === '/' || currentPage === '/index.html') {
                window.location.href = '/codebank/indexCB.html';
            }
        },
        
        redirectToLogin() {
            const currentPage = window.location.pathname;
            if (!currentPage.includes('login') && currentPage !== '/') {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href);
            }
        },
        
        // Getters
        isAuthenticated() { return this.state.authenticated; },
        getUser() { return this.state.user; },
        getEmail() { return this.state.user?.email || null; },
        getSessionId() { return this.state.sessionId; }
    };
    
    // Auto-init
    window.SessionManager.init();
    
})(window);
