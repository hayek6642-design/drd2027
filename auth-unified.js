/**
 * AuthUnified - Centralized auth state management
 * Prevents auth state desync, handles guest/user transitions
 */

class AuthUnified {
  constructor() {
    this.state = {
      authenticated: false,
      userId: null,
      email: null,
      sessionId: null,
      sessionExpiry: null,
      isGuest: true
    };

    this.listeners = [];
    this.retryCount = 0;
    this.maxRetries = 3;

    this.init();
  }

  /**
   * Initialize auth state from storage
   */
  init() {
    const sessionId = localStorage.getItem('sessionId') ||
                     sessionStorage.getItem('sessionId');
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');

    if (sessionId && userId) {
      this.setState({
        authenticated: true,
        userId,
        email,
        sessionId,
        isGuest: false
      });
      console.log('[AuthUnified] ✅ Session restored');
    } else {
      this.setState({
        authenticated: false,
        isGuest: true
      });
      console.log('[AuthUnified] 👤 Guest mode');
    }

    // Listen for storage changes (other tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === 'sessionId' || e.key === 'userId') {
        console.log('[AuthUnified] Storage changed - refreshing state');
        this.init();
      }
    });
  }

  /**
   * Update state and notify listeners
   */
  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };

    if (JSON.stringify(oldState) !== JSON.stringify(this.state)) {
      console.log('[AuthUnified] State changed:', this.state);
      this.notify();
    }
  }

  /**
   * Login user
   */
  async login(email, sessionId, userId, expiryMinutes = 60) {
    localStorage.setItem('sessionId', sessionId);
    localStorage.setItem('userId', userId);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('sessionExpiry', Date.now() + expiryMinutes * 60 * 1000);

    this.setState({
      authenticated: true,
      userId,
      email,
      sessionId,
      sessionExpiry: Date.now() + expiryMinutes * 60 * 1000,
      isGuest: false
    });

    console.log('[AuthUnified] ✅ Logged in as', email);
    window.dispatchEvent(new Event('auth:login'));
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('sessionExpiry');
    sessionStorage.removeItem('sessionId');

    this.setState({
      authenticated: false,
      userId: null,
      email: null,
      sessionId: null,
      sessionExpiry: null,
      isGuest: true
    });

    console.log('[AuthUnified] 👤 Logged out - guest mode');
    window.dispatchEvent(new Event('auth:logout'));
  }

  /**
   * Check if session is still valid
   */
  isSessionValid() {
    if (!this.state.sessionId) return false;

    const expiry = localStorage.getItem('sessionExpiry');
    if (!expiry) return true; // No expiry set, assume valid

    return Date.now() < parseInt(expiry, 10);
  }

  /**
   * Refresh session from server
   */
  async refreshSession() {
    if (!this.state.sessionId) return false;

    try {
      const res = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${this.state.sessionId}`
        },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          console.log('[AuthUnified] ✅ Session valid');
          this.retryCount = 0;
          return true;
        }
      }

      if (res.status === 401) {
        console.warn('[AuthUnified] Session expired (401)');
        this.logout();
        return false;
      }
    } catch (e) {
      console.error('[AuthUnified] Validation error:', e.message);
      this.retryCount++;

      if (this.retryCount >= this.maxRetries) {
        console.warn('[AuthUnified] Max retries exceeded, clearing session');
        this.logout();
        return false;
      }
    }

    return this.state.authenticated;
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  onChange(callback) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.state);
      } catch (e) {
        console.error('[AuthUnified] Listener error:', e);
      }
    });
  }
}

window.AuthUnified = AuthUnified;
window.authUnified = new AuthUnified();
