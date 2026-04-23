/**
 * AUTH-BRIDGE.JS
 * 
 * Unified authentication system for all CodeBank services
 * Services listen to main app auth from login.html (Google OAuth)
 * No separate login needed - uses parent window or localStorage
 * 
 * Usage in any service:
 *   <script src="../auth-bridge.js"></script>
 *   authBridge.onAuthChange((user, token) => {
 *     if (user) console.log('User logged in:', user.email);
 *     else console.log('User logged out');
 *   });
 */

class AuthBridge {
  constructor() {
    this.user = null;
    this.token = null;
    this.listeners = [];
    this.isReady = false;
    this.authCheckInterval = null;
    
    // Initialize immediately
    this.init();
  }

  /**
   * Initialize auth system - check localStorage and parent window
   */
  async init() {
    try {
      // Check if we have cached auth from login.html
      const cached = this.getCachedAuth();
      if (cached) {
        this.user = cached.user;
        this.token = cached.token;
        this.isReady = true;
        this.notifyListeners();
      }

      // Poll parent window for auth changes (if in iframe)
      if (window.parent !== window) {
        this.setupParentMessaging();
      }

      // Setup periodic auth check
      this.setupAuthCheck();
      
    } catch (error) {
      console.error('[AuthBridge] Init error:', error);
    }
  }

  /**
   * Get cached auth from localStorage
   */
  getCachedAuth() {
    try {
      const authData = localStorage.getItem('farragna_auth');
      if (!authData) return null;
      
      const parsed = JSON.parse(authData);
      if (!parsed.token || !parsed.user) return null;
      
      // Check if token is not expired
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem('farragna_auth');
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('[AuthBridge] Cache read error:', error);
      return null;
    }
  }

  /**
   * Setup parent window communication (for iframe mode)
   */
  setupParentMessaging() {
    window.addEventListener('message', (event) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'AUTH_CHANGE') {
        this.handleAuthChange(event.data.user, event.data.token);
      } else if (event.data.type === 'AUTH_REQUEST') {
        // Respond with current auth state
        window.parent.postMessage({
          type: 'AUTH_RESPONSE',
          user: this.user,
          token: this.token,
          isReady: this.isReady
        }, window.location.origin);
      }
    });

    // Request current auth state from parent
    window.parent.postMessage({
      type: 'AUTH_REQUEST'
    }, window.location.origin);
  }

  /**
   * Handle auth state changes
   */
  handleAuthChange(user, token) {
    if (this.user?.id === user?.id && this.token === token) {
      return; // No change
    }

    this.user = user;
    this.token = token;
    this.isReady = true;

    if (user && token) {
      this.saveAuthCache({ user, token });
    } else {
      this.clearAuthCache();
    }

    this.notifyListeners();
  }

  /**
   * Save auth to localStorage
   */
  saveAuthCache(auth) {
    try {
      const data = {
        user: auth.user,
        token: auth.token,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24h
      };
      localStorage.setItem('farragna_auth', JSON.stringify(data));
    } catch (error) {
      console.error('[AuthBridge] Cache save error:', error);
    }
  }

  /**
   * Clear cached auth
   */
  clearAuthCache() {
    localStorage.removeItem('farragna_auth');
  }

  /**
   * Setup periodic auth check (every 5 minutes)
   */
  setupAuthCheck() {
    this.authCheckInterval = setInterval(() => {
      const cached = this.getCachedAuth();
      if (!cached && this.user) {
        // Token expired
        this.handleAuthChange(null, null);
      } else if (cached && !this.user) {
        // New token available
        this.handleAuthChange(cached.user, cached.token);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Register listener for auth changes
   */
  onAuthChange(callback) {
    this.listeners.push(callback);
    // Notify immediately if ready
    if (this.isReady) {
      callback(this.user, this.token);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of auth change
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.user, this.token);
      } catch (error) {
        console.error('[AuthBridge] Listener error:', error);
      }
    });

    // Broadcast to other iframes/windows
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'AUTH_CHANGE',
        user: this.user,
        token: this.token
      }, window.location.origin);
    }
  }

  /**
   * Get current auth state
   */
  getAuth() {
    return {
      user: this.user,
      token: this.token,
      isAuthenticated: !!this.user && !!this.token
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.user && !!this.token;
  }

  /**
   * Get user email (helper)
   */
  getUserEmail() {
    return this.user?.email || null;
  }

  /**
   * Get user name (helper)
   */
  getUserName() {
    return this.user?.name || this.user?.email || 'User';
  }

  /**
   * Logout (clear auth)
   */
  logout() {
    this.handleAuthChange(null, null);
  }

  /**
   * Set auth manually (called by login.html after Google OAuth)
   */
  setAuth(user, token) {
    this.handleAuthChange(user, token);
  }

  /**
   * Setup redirect to login if not authenticated
   */
  requireAuth(redirectPath = '/login.html') {
    if (!this.isAuthenticated()) {
      window.location.href = redirectPath;
      return false;
    }
    return true;
  }

  /**
   * Get API headers with auth token
   */
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(url, options = {}) {
    try {
      const headers = this.getAuthHeaders();
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });

      if (response.status === 401) {
        // Token expired
        this.handleAuthChange(null, null);
        throw new Error('Authentication expired. Please log in again.');
      }

      return response;
    } catch (error) {
      console.error('[AuthBridge] API request error:', error);
      throw error;
    }
  }

  /**
   * Cleanup on unload
   */
  destroy() {
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
    }
    this.listeners = [];
  }
}

// Global instance
window.authBridge = new AuthBridge();
