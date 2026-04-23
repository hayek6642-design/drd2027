/**
 * SessionManager v2 - ENHANCED WITH SAME-SITE AUTH
 * Handles guest and user sessions with JWT tokens
 * Integrates with backend /api/auth endpoints
 * ✨ NOW WITH: Secure cookies, CSRF tokens, authenticated requests
 */

class SessionManager {
  constructor() {
    this.STORAGE_KEY = 'zagelsession';
    this.GUEST_ID_KEY = 'zagel_guest_id';
    this.COOKIE_NAME = 'zagel_auth';          // 🔒 Secure auth cookie
    this.CSRF_TOKEN_KEY = 'zagel_csrf';       // 🔒 CSRF protection token
    this.session = null;
    this.listeners = [];
    this.apiBase = '/api';
    
    // Initialize secure cookie handling
    this.initSecureCookies();
    
    // Initialize on creation
    this.init();
  }

  /**
   * Initialize secure cookie handling
   */
  initSecureCookies() {
    // Check if running on secure context
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      console.warn('[SessionManager] Not on secure context, using localStorage only');
      return;
    }
    
    // Load auth cookie if exists
    const authCookie = this.getCookie(this.COOKIE_NAME);
    if (authCookie) {
      try {
        this.session = JSON.parse(authCookie);
        console.log('[SessionManager] Loaded session from secure cookie');
      } catch (e) {
        console.error('[SessionManager] Failed to parse auth cookie:', e);
      }
    }
  }

  /**
   * Get cookie by name
   */
  getCookie(name) {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
    return null;
  }

  /**
   * Set secure cookie with SameSite protection
   */
  setCookie(name, value, options = {}) {
    const defaults = {
      'path': '/',
      'sameSite': 'Strict',    // 🔒 CSRF protection
      'maxAge': 24 * 60 * 60   // 24 hours
    };
    
    // Add Secure flag for HTTPS
    if (window.isSecureContext || location.hostname === 'localhost') {
      defaults['secure'] = true;
    }
    
    const finalOptions = { ...defaults, ...options };
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    Object.entries(finalOptions).forEach(([key, val]) => {
      if (val === true) {
        cookieString += `; ${key}`;
      } else if (val !== false && val !== null) {
        cookieString += `; ${key}=${val}`;
      }
    });
    
    document.cookie = cookieString;
    console.log(`[SessionManager] Set cookie: ${name}`);
  }

  /**
   * Delete cookie
   */
  deleteCookie(name) {
    this.setCookie(name, '', { maxAge: -1 });
    console.log(`[SessionManager] Deleted cookie: ${name}`);
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    this.setCookie(this.CSRF_TOKEN_KEY, token, { 
      httpOnly: false, 
      sameSite: 'Strict',
      maxAge: 60 * 60 // 1 hour
    });
    console.log('[SessionManager] Generated new CSRF token');
    return token;
  }

  /**
   * Get CSRF token (create if missing)
   */
  getCSRFToken() {
    let token = this.getCookie(this.CSRF_TOKEN_KEY);
    if (!token) {
      token = this.generateCSRFToken();
    }
    return token;
  }

  /**
   * Make authenticated HTTP request with CSRF protection
   */
  async makeAuthenticatedRequest(url, options = {}) {
    const headers = {
      ...options.headers,
      'X-CSRF-Token': this.getCSRFToken()
    };

    // Add authorization header if user session
    if (this.session?.token) {
      headers['Authorization'] = `Bearer ${this.session.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // 🔒 Include cookies in request
    });

    return response;
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
      
      // Ensure CSRF token exists
      this.getCSRFToken();
      
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
    
    // Generate CSRF token for authenticated session
    const csrfToken = this.generateCSRFToken();
    
    this.session = {
      type: 'user',
      userId: userData.id,
      email: userData.email,
      token: token,
      csrfToken: csrfToken,  // 🔒 Store CSRF token in session
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
      const response = await this.makeAuthenticatedRequest(
        `${this.apiBase}/auth-v2/merge-guest`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestId: guestId,
            timestamp: Date.now()
          })
        }
      );
      
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
      const response = await this.makeAuthenticatedRequest(`${this.apiBase}/auth/me`);
      
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
   * Save session to localStorage AND secure cookie
   */
  saveSession() {
    const sessionJSON = JSON.stringify(this.session);
    
    // Save to localStorage (for offline access and persistence)
    localStorage.setItem(this.STORAGE_KEY, sessionJSON);
    
    // Save to secure cookie with SameSite
    if (this.session?.token) {
      this.setCookie(this.COOKIE_NAME, sessionJSON, {
        maxAge: 24 * 60 * 60,
        sameSite: 'Strict'
      });
    }
    
    console.log('[SessionManager] Session saved');
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
      csrfToken: this.getCSRFToken() ? '***' : null,
      createdAt: this.session?.createdAt,
      metadata: this.session?.metadata
    };
  }

  /**
   * Clear session (logout)
   */
  async logout() {
    try {
      // Call logout endpoint with CSRF protection
      const response = await this.makeAuthenticatedRequest(
        `${this.apiBase}/auth/logout`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        console.warn('[SessionManager] Logout endpoint returned:', response.status);
      }
    } catch (error) {
      console.warn('[SessionManager] Logout endpoint error:', error);
    }
    
    // Clear cookies
    this.deleteCookie(this.COOKIE_NAME);
    this.deleteCookie(this.CSRF_TOKEN_KEY);
    
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
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        credentials: 'include', // 🔒 Send cookies
        body: JSON.stringify({ email, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.token) {
          await this.upgradeToUser(data.user, data.token);
          return { success: true, user: data.user };
        }
      } else {
        const error = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: error.message || `Login failed with status ${response.status}` 
        };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('[SessionManager] Login error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform registration
   */
  async register(email, password, name = '') {
    try {
      const response = await fetch(`${this.apiBase}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, name })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user && data.token) {
          await this.upgradeToUser(data.user, data.token);
          return { success: true, user: data.user };
        }
      } else {
        const error = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: error.message || `Registration failed with status ${response.status}` 
        };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('[SessionManager] Register error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}

// Global reference
window.SessionManager = SessionManager;
