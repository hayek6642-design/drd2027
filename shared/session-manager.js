/**
 * Session Manager - Zagel OS Authentication Core
 * Unified session handling: Guest Mode + Authenticated Mode
 * No redirects, no loops, clean state management
 */

(function(window) {
    'use strict';

    // Session storage key
    const SESSION_KEY = 'zagelsession';
    const SESSION_VERSION = '2.0';

    // Simple logger
    const logger = {
        log: function(...args) {
            if (window.DEBUG_MODE) console.log('[Session]', ...args);
        },
        warn: function(...args) {
            console.warn('[Session]', ...args);
        },
        error: function(...args) {
            console.error('[Session]', ...args);
        }
    };

    class SessionManager {
        constructor() {
            this.currentSession = null;
            this.listeners = new Set();
            this.validationInProgress = false;
            
            // Initialize immediately
            this.init();
        }

        /**
         * Initialize session on app start
         */
        init() {
            logger.log('Initializing...');
            
            const stored = this.getStoredSession();
            
            if (stored) {
                // Validate and restore
                this.restoreSession(stored);
            } else {
                // Create new guest session
                this.createGuestSession();
            }
            
            // Background validation (delayed to not block UI)
            setTimeout(() => this.validateWithServer(), 2000);
            
            logger.log('Initialized:', this.currentSession?.type);
        }

        /**
         * Get session from storage
         */
        getStoredSession() {
            try {
                const data = localStorage.getItem(SESSION_KEY);
                if (!data) return null;
                
                const parsed = JSON.parse(data);
                
                // Version check for migrations
                if (parsed.version !== SESSION_VERSION) {
                    logger.log('Version mismatch, treating as new');
                    return null;
                }
                
                return parsed;
            } catch (err) {
                logger.error('Parse error:', err);
                return null;
            }
        }

        /**
         * Create new guest session
         */
        createGuestSession() {
            const session = {
                version: SESSION_VERSION,
                type: 'guest',
                guestId: 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                createdAt: Date.now(),
                lastActive: Date.now(),
                metadata: {
                    visits: 1,
                    firstVisit: Date.now()
                }
            };
            
            this.setSession(session);
            logger.log('Guest session created:', session.guestId);
            
            return session;
        }

        /**
         * Restore existing session
         */
        restoreSession(session) {
            // Check expiration for user sessions
            if (session.type === 'user' && session.expiresAt) {
                if (Date.now() > session.expiresAt) {
                    logger.log('User session expired, converting to guest');
                    this.createGuestSession();
                    return;
                }
            }
            
            // Update last active
            session.lastActive = Date.now();
            if (session.metadata) {
                session.metadata.visits = (session.metadata.visits || 0) + 1;
            }
            
            this.setSession(session);
            logger.log('Restored:', session.type, session.type === 'user' ? session.userId : session.guestId);
        }

        /**
         * Set session and notify listeners
         */
        setSession(session) {
            this.currentSession = session;
            
            try {
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            } catch (err) {
                logger.error('Storage failed:', err);
            }
            
            this.notifyListeners(session);
        }

        /**
         * Upgrade guest to user (called from login.html only)
         */
        upgradeToUser(userData, token, expiresInDays = 7) {
            const oldSession = this.currentSession;
            
            const newSession = {
                version: SESSION_VERSION,
                type: 'user',
                userId: userData.id,
                email: userData.email,
                token: token,
                expiresAt: Date.now() + (expiresInDays * 24 * 60 * 60 * 1000),
                createdAt: Date.now(),
                lastActive: Date.now(),
                metadata: {
                    ...userData,
                    upgradedFrom: oldSession?.guestId || null,
                    upgradedAt: Date.now()
                }
            };
            
            // Merge guest data if exists
            if (oldSession?.type === 'guest') {
                this.mergeGuestData(oldSession.guestId, userData.id);
            }
            
            this.setSession(newSession);
            logger.log('Upgraded to user:', userData.id);
            
            return newSession;
        }

        /**
         * Downgrade to guest (logout)
         */
        downgradeToGuest() {
            logger.log('Downgrading to guest');
            this.createGuestSession();
        }

        /**
         * Merge guest data to user account
         */
        async mergeGuestData(guestId, userId) {
            try {
                // Call API to merge data
                const response = await fetch('/api/auth/merge-guest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guestId, userId })
                });
                
                if (response.ok) {
                    logger.log('Guest data merged:', guestId, '→', userId);
                }
            } catch (err) {
                logger.error('Merge failed:', err);
            }
        }

        /**
         * Silent server validation
         */
        async validateWithServer() {
            if (this.validationInProgress) return;
            this.validationInProgress = true;
            
            try {
                const session = this.currentSession;
                
                // Skip validation for fresh guests
                if (session?.type === 'guest' && !session.metadata?.upgradedAt) {
                    this.validationInProgress = false;
                    return;
                }
                
                const response = await fetch('/api/auth/me', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(session?.token ? { 'Authorization': 'Bearer ' + session.token } : {})
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.success && data.user) {
                        // Valid user session
                        if (session?.type !== 'user' || session.userId !== data.user.id) {
                            // Session mismatch, upgrade
                            this.upgradeToUser(data.user, data.token || session?.token);
                        }
                        logger.log('Server validation: valid user');
                    } else {
                        // Invalid, fallback to guest
                        if (session?.type === 'user') {
                            logger.log('Server validation: invalid, falling back to guest');
                            this.downgradeToGuest();
                        }
                    }
                } else {
                    // Server error, keep current session but mark as offline
                    logger.warn('Validation failed, operating offline');
                }
            } catch (err) {
                logger.error('Validation error:', err);
            } finally {
                this.validationInProgress = false;
            }
        }

        /**
         * Get current session (safe)
         */
        getSession() {
            return this.currentSession;
        }

        /**
         * Check if authenticated user
         */
        isUser() {
            return this.currentSession?.type === 'user';
        }

        /**
         * Check if guest
         */
        isGuest() {
            return this.currentSession?.type === 'guest';
        }

        /**
         * Get auth token (null for guests)
         */
        getToken() {
            return this.currentSession?.type === 'user' ? this.currentSession.token : null;
        }

        /**
         * Get user/guest ID
         */
        getId() {
            const s = this.currentSession;
            return s?.type === 'user' ? s.userId : s?.guestId;
        }

        /**
         * Get user email (only for users)
         */
        getEmail() {
            return this.currentSession?.type === 'user' ? this.currentSession.email : null;
        }

        /**
         * Subscribe to session changes
         */
        subscribe(listener) {
            this.listeners.add(listener);
            // Immediate callback with current state
            if (this.currentSession) {
                try {
                    listener(this.currentSession);
                } catch (err) {
                    logger.error('Listener error:', err);
                }
            }
            return () => this.listeners.delete(listener);
        }

        /**
         * Notify all listeners
         */
        notifyListeners(session) {
            this.listeners.forEach(listener => {
                try {
                    listener(session);
                } catch (err) {
                    logger.error('Listener error:', err);
                }
            });
            
            // Dispatch DOM event for framework compatibility
            window.dispatchEvent(new CustomEvent('session:changed', { detail: session }));
        }

        /**
         * Update session metadata
         */
        updateMetadata(updates) {
            if (!this.currentSession) return;
            
            this.currentSession.metadata = {
                ...this.currentSession.metadata,
                ...updates
            };
            this.currentSession.lastActive = Date.now();
            
            this.setSession(this.currentSession);
        }

        /**
         * Clear session (logout)
         */
        clear() {
            localStorage.removeItem(SESSION_KEY);
            this.currentSession = null;
            this.createGuestSession();
        }

        /**
         * Get session info for debugging
         */
        getDebugInfo() {
            return {
                type: this.currentSession?.type,
                id: this.getId(),
                isUser: this.isUser(),
                isGuest: this.isGuest(),
                expiresAt: this.currentSession?.expiresAt,
                lastActive: this.currentSession?.lastActive
            };
        }
    }

    // Singleton instance
    const sessionManager = new SessionManager();

    // React Hook (for React projects)
    window.useSession = function() {
        const [session, setSession] = React.useState(sessionManager.getSession());
        
        React.useEffect(() => {
            return sessionManager.subscribe(setSession);
        }, []);
        
        return {
            session,
            isUser: session?.type === 'user',
            isGuest: session?.type === 'guest',
            userId: session?.type === 'user' ? session.userId : null,
            guestId: session?.type === 'guest' ? session.guestId : null,
            token: session?.token,
            upgrade: sessionManager.upgradeToUser.bind(sessionManager),
            logout: sessionManager.downgradeToGuest.bind(sessionManager)
        };
    };

    // Export
    window.SessionManager = SessionManager;
    window.sessionManager = sessionManager;

    // Also export as ES module for modern browsers
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sessionManager;
    }

    logger.log('Session Manager loaded');

})(typeof window !== 'undefined' ? window : global);