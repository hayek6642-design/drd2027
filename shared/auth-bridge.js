// Auth Bridge - Unified JWT Management for yt-new.html and CodeBank
// Provides centralized authentication state and JWT access

class AuthBridge {
    constructor() {
        this.currentUser = null;
        this.jwt = null;
        this.ready = false;
        this.readyCallbacks = [];
        this.init();
    }

    async init() {
        try {
            // Wait for AuthClient to be available
            if (!window.AuthClient) {
                await new Promise(resolve => {
                    const checkAuthClient = () => {
                        if (window.AuthClient) {
                            resolve();
                        } else {
                            setTimeout(checkAuthClient, 100);
                        }
                    };
                    checkAuthClient();
                });
            }

            // Get initial session
            const session = await window.AuthClient.getSession();
            if (session?.user) {
                this.currentUser = session.user;
                this.jwt = session.access_token || session.jwt;
            }

            this.ready = true;
            this.notifyReady();

            // Listen for auth changes
            window.addEventListener('auth:verified', () => this.handleAuthChange());
            window.addEventListener('auth:signedOut', () => this.handleAuthChange());

        } catch (error) {
            console.warn('AuthBridge initialization failed:', error);
            this.ready = true;
            this.notifyReady();
        }
    }

    handleAuthChange() {
        // Refresh auth state
        this.init();
    }

    onAuthReady(callback) {
        if (this.ready) {
            callback();
        } else {
            this.readyCallbacks.push(callback);
        }
    }

    notifyReady() {
        this.readyCallbacks.forEach(callback => callback());
        this.readyCallbacks = [];
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getJWT() {
        return this.jwt;
    }

    async refreshJWT() {
        try {
            if (window.AuthClient?.refreshSession) {
                const session = await window.AuthClient.refreshSession();
                if (session?.access_token) {
                    this.jwt = session.access_token;
                    return this.jwt;
                }
            }
        } catch (error) {
            console.warn('JWT refresh failed:', error);
        }
        return null;
    }

    isAuthenticated() {
        return !!(this.currentUser && this.jwt);
    }
}

// Create singleton instance
const authBridge = new AuthBridge();

// Export for module use
export { authBridge as default };

// Also expose globally for non-module access
window.AuthBridge = authBridge;