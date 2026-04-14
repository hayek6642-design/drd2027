/**
 * SessionManager v2
 * Handles guest and user sessions with JWT tokens
 * Integrates with backend /api/auth endpoints
 */

class SessionManager {
  constructor() {
    this.STORAGE_KEY = 'zagelsession';
    this.GUEST_ID_KEY = 'zagel_guest_id';
    this.session = null;
    this.listeners = [];
    this.apiBase = '/api';
    
    // Initialize on creation
    this.init();
  }

  /**
   * Initialize session from storage or create new guest
   */
  async init() {
    try {
      // Try to load existing session
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.session = JSON.parse(stored);
        console.log('[SessionManager] Loaded existing session:', this.session.type);
      }
      
      // If no session, create guest
      if (!this.session) {
        await this.createGuestSession();
      }
      
      // Validate session with backend
      await this.validateWithBackend();
      
      // Notify listeners
      this.notify();
    } catch (error) {
      console.error('[SessionManager] Init error:', error);
      // Fallback to guest session
      await this.createGuestSession();
    }
  }

  /**
   * Create a new guest session
   */
  async createGuestSession() {
    const guestId = this.generateId('guest');
    
    this.session = {
      type: 'guest',
      guestId: guestId,
      version: '2.0',
      createdAt: Date.now(),
      metadata: {
        userAgent: navigator.userAgent,
        locale: navigator.language
      }
    };
    
    this.saveSession();
    console.log('[SessionManager] Created new guest session:', guestId);
    this.notify();
  }

  /**
   * Upgrade from guest to user (after login)
   */
  async upgradeToUser(userData, token) {
    const oldGuestId = this.session?.guestId;
    
    this.session = {
      type: 'user',
      userId: userData.id,
      email: userData.email,
      token: token,
      version: '2.0',
      createdAt: Date.now(),
      metadata: {
        upgradedFrom: oldGuestId,
        upgradedAt: Date.now(),
        userAgent: navigator.userAgent
      }
    };
    
    this.saveSession();
    console.log('[SessionManager] Upgraded to user:', userData.email);
    this.notify();
    
    // Try to merge guest data with user account
    if (oldGuestId) {
      this.mergeGuestData(oldGuestId, token);
    }
  }

  /**
   * Downgrade from user to guest (after logout)
   */
  async downgradeToGuest() {
    const oldUserId = this.session?.userId;
    
    await this.createGuestSession();
    if (oldUserId) {
      this.session.metadata.downgradedFrom = oldUserId;
      this.saveSession();
    }
    
    console.log('[SessionManager] Downgraded to guest');
    this.notify();
  }

  /**
   * Merge guest data to user account
   */
  async mergeGuestData(guestId, userToken) {
    try {
      const response = await fetch(`${this.apiBase}/auth-v2/merge-guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          guestId: guestId,
          timestamp: Date.now()
        })
      });
      
      if (response.ok) {
        console.log('[SessionManager] Guest data merged successfully');
      }
    } catch (error) {
      console.warn('[SessionManager] Guest merge failed (non-critical):', error);
    }
  }

  /**
   * Validate session with backend
   */
  async validateWithBackend() {
    try {
      const response = await fetch(`${this.apiBase}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.session?.token || ''}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          console.log('[SessionManager] Session validated with backend');
          return true;
        }
      }
    } catch (error) {
      console.warn('[SessionManager] Backend validation failed (non-critical):', error);
    }
    return false;
  }

  /**
   * Save session to localStorage
   */
  saveSession() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.session));
  }

  /**
   * Get current session object
   */
  getSession() {
    return this.session;
  }

  /**
   * Get session ID (guest or user)
   */
  getId() {
    return this.session?.guestId || this.session?.userId;
  }

  /**
   * Get auth token
   */
  getToken() {
    return this.session?.token || null;
  }

  /**
   * Check if user is logged in
   */
  isUser() {
    return this.session?.type === 'user' && !!this.session?.userId;
  }

  /**
   * Check if session is guest
   */
  isGuest() {
    return this.session?.type === 'guest' && !!this.session?.guestId;
  }

  /**
   * Get user email (if user session)
   */
  getEmail() {
    return this.session?.email || null;
  }

  /**
   * Subscribe to session changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of session change
   */
  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.session);
      } catch (error) {
        console.error('[SessionManager] Listener error:', error);
      }
    });
  }

  /**
   * Generate unique ID
   */
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    return {
      type: this.session?.type,
      id: this.getId(),
      isUser: this.isUser(),
      isGuest: this.isGuest(),
      email: this.getEmail(),
      token: this.getToken() ? '***' : null,
      createdAt: this.session?.createdAt,
      metadata: this.session?.metadata
    };
  }

  /**
   * Clear session (logout)
   */
  async logout() {
    try {
      // Call logout endpoint
      await fetch(`${this.apiBase}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.session?.token || ''}`
        }
      });
    } catch (error) {
      console.warn('[SessionManager] Logout endpoint error:', error);
    }
    
    // Always downgrade to guest locally
    await this.downgradeToGuest();
  }

  /**
   * Perform login
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.token) {
          await this.upgradeToUser(data.user, data.token);
          return { success: true, user: data.user };
        }
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('[SessionManager] Login error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}