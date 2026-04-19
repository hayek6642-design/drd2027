/**
 * GoogleAuthManager - Google OAuth 2.0 Handler
 * Initializes Google Sign-In button and handles credential responses
 */
class GoogleAuthManager {
  constructor() {
    this.clientId = null;
    this.initialized = false;
    this.user = null;
  }

  async init() {
    console.log('[GoogleAuth] Initializing...');
    
    // Load config from server
    const config = await this.loadConfig();
    this.clientId = config?.google?.clientId;
    
    if (!this.clientId) {
      console.warn('[GoogleAuth] No Google Client ID - hiding button');
      this.hideGoogleButton();
      return false;
    }

    // Load Google Script
    try {
      await this.loadGoogleScript();
    } catch (e) {
      console.error('[GoogleAuth] Failed to load Google script:', e);
      this.hideGoogleButton();
      return false;
    }

    // Initialize Google Sign-In
    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: this.handleCredentialResponse.bind(this),
      auto_select: false,
      cancel_on_tap_outside: true
    });

    // Render button
    this.renderButton();
    this.initialized = true;
    console.log('[GoogleAuth] ✓ Initialized successfully');
    return true;
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/config/client');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error('[GoogleAuth] Config load failed:', e.message);
      return null;
    }
  }

  loadGoogleScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.getElementById('google-jssdk') || window.google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-jssdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('[GoogleAuth] Google script loaded');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Google script'));
      };
      document.head.appendChild(script);
    });
  }

  renderButton() {
    const btnContainer = document.getElementById('google-signin-btn');
    if (!btnContainer) {
      console.warn('[GoogleAuth] Button container not found');
      return;
    }

    try {
      google.accounts.id.renderButton(btnContainer, {
        theme: 'outline',
        size: 'large',
        width: 250,
        locale: 'en'
      });
      console.log('[GoogleAuth] Button rendered successfully');
    } catch (e) {
      console.error('[GoogleAuth] Button render failed:', e);
    }
  }

  hideGoogleButton() {
    const btn = document.getElementById('google-signin-btn');
    if (btn) {
      btn.style.display = 'none';
      console.log('[GoogleAuth] Button hidden');
    }
  }

  async handleCredentialResponse(response) {
    console.log('[GoogleAuth] Credential received, verifying...');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();
      
      if (data.success) {
        console.log('[GoogleAuth] ✓ Verification successful');
        this.saveSession(data);
        if (typeof authUI !== 'undefined') {
          authUI.showLoggedIn(data.user);
        }
        // Trigger event for other services to listen to
        window.dispatchEvent(new CustomEvent('auth:loggedin', { detail: data.user }));
      } else {
        console.error('[GoogleAuth] Verification failed:', data.error);
        alert('Google sign-in failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('[GoogleAuth] Auth request failed:', e.message);
      alert('Sign-in error: ' + e.message + '. Please try again.');
    }
  }

  saveSession(data) {
    localStorage.setItem('session_token', data.token);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('user_email', data.user.email);
    localStorage.setItem('user_avatar', data.user.picture || '');
    localStorage.setItem('session_active', 'true');
    console.log('[GoogleAuth] Session saved');
  }

  logout() {
    console.log('[GoogleAuth] Logging out...');
    this.clearSession();
    // Also sign out from Google
    if (window.google) {
      google.accounts.id.disableAutoSelect();
    }
    location.reload();
  }

  clearSession() {
    localStorage.removeItem('session_token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_avatar');
    localStorage.removeItem('session_active');
  }
}

// Initialize globally
window.googleAuth = new GoogleAuthManager();

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.googleAuth.init();
});
