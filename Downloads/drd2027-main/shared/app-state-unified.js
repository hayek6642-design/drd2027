/**
 * === APP STATE - UNIFIED AUTH SYSTEM (SINGLE SOURCE OF TRUTH) ===
 * 
 * This is THE ONLY auth authority. All other auth systems are disabled.
 * No fallbacks. No fake users. No desync.
 */

window.AppState = window.AppState || {};

window.AppState.auth = {
  isAuthenticated: false,
  user: null,
  token: null,
  sessionId: null,
  lastVerified: null,
  
  // Initialize from session storage or localStorage (only immediately after login)
  async restore() {
    try {
      const stored = sessionStorage.getItem('appstate_auth');
      if (stored) {
        const saved = JSON.parse(stored);
        this.isAuthenticated = saved.isAuthenticated;
        this.user = saved.user;
        this.token = saved.token;
        this.sessionId = saved.sessionId;
        console.log('[AppState] Restored from sessionStorage:', this.user?.email);
        return true;
      }
    } catch (e) {
      console.warn('[AppState] Session restore failed:', e.message);
    }
    return false;
  },
  
  // Verify session with backend - REQUIRED before any API calls
  async verify() {
    if (!this.token) {
      console.warn('[AppState] No token to verify');
      return false;
    }
    
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        console.error('[AppState] Session expired or invalid');
        this.logout();
        return false;
      }
      
      if (!response.ok) {
        console.error('[AppState] Verification failed:', response.status);
        this.logout();
        return false;
      }
      
      const data = await response.json();
      
      if (!data.authenticated || !data.user) {
        console.error('[AppState] Server rejected session');
        this.logout();
        return false;
      }
      
      // Update user data from backend
      this.user = data.user;
      this.isAuthenticated = true;
      this.lastVerified = new Date();
      
      this.persist();
      console.log('[AppState] Verified:', this.user.email);
      return true;
    } catch (err) {
      console.error('[AppState] Verification error:', err.message);
      this.logout();
      return false;
    }
  },
  
  // Set user after successful login
  setUser(user, token, sessionId) {
    if (!user || !user.id || !user.email) {
      throw new Error('Invalid user object');
    }
    
    this.user = user;
    this.token = token;
    this.sessionId = sessionId;
    this.isAuthenticated = true;
    this.lastVerified = new Date();
    
    this.persist();
    console.log('[AppState] User logged in:', user.email);
  },
  
  // Persist to sessionStorage (NOT localStorage after login to prevent stale data)
  persist() {
    try {
      sessionStorage.setItem('appstate_auth', JSON.stringify({
        isAuthenticated: this.isAuthenticated,
        user: this.user,
        token: this.token,
        sessionId: this.sessionId
      }));
    } catch (e) {
      console.warn('[AppState] Persist failed:', e.message);
    }
  },
  
  // Logout completely
  logout() {
    console.log('[AppState] Logging out');
    
    // Notify backend
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    
    // Clear everything
    this.isAuthenticated = false;
    this.user = null;
    this.token = null;
    this.sessionId = null;
    this.lastVerified = null;
    
    // CRITICAL: Only remove auth-related keys, NOT code generation state
    const authKeys = [
      'appstate_auth', 'auth_token', 'session_token', 
      'refresh_token', 'user_email', 'auth_session',
      'auth_verified', 'auth_timestamp'
    ];
    authKeys.forEach(key => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
    
    // DO NOT touch: bankode_pIndex, bankode_nextDueAt, bankode_codes, user_prefs, etc.
    console.log('[AppState] Auth keys cleared; code generation state preserved');
    
    // Redirect to login
    window.location.href = '/login.html';
  },
  
  // Get Authorization header for API calls
  getAuthHeader() {
    if (!this.token) return null;
    return { 'Authorization': `Bearer ${this.token}` };
  }
};

// Broadcast auth state changes to iframes via postMessage
function broadcastAuthToIframes() {
  if (window.self === window.top) {
    // This is parent window
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'AUTH_REQUEST') {
        e.source.postMessage({
          type: 'AUTH_RESPONSE',
          auth: {
            isAuthenticated: AppState.auth.isAuthenticated,
            user: AppState.auth.user,
            token: AppState.auth.token,
            getAuthHeader: () => AppState.auth.getAuthHeader()
          }
        }, e.origin);
      }
    });
  } else {
    // This is an iframe - request auth from parent
    window.parent.postMessage({ type: 'AUTH_REQUEST' }, '*');
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'AUTH_RESPONSE') {
        Object.assign(window.AppState.auth, e.data.auth);
        console.log('[AppState] Iframe received auth:', e.data.auth.user?.email);
      }
    });
  }
}

broadcastAuthToIframes();

console.log('[AppState] Unified auth system initialized');
