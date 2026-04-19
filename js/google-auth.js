// COMPLETE GOOGLE SIGN-IN IMPLEMENTATION
class GoogleAuthManager {
  constructor() {
    this.clientId = null;
    this.initialized = false;
    this.user = null;
  }

  async init() {
    console.log('[GoogleAuth] Initializing...');
    
    // Wait for config to load
    let attempts = 0;
    while (!window.AppConfig?.loaded && attempts < 100) {
      await new Promise(r => setTimeout(r, 50));
      attempts++;
    }
    
    if (!window.AppConfig?.loaded) {
      console.error('[GoogleAuth] ✗ Config never loaded');
      this.hideGoogleButton();
      return false;
    }

    // Get client ID from config
    const config = await window.AppConfig.load();
    this.clientId = config?.google?.clientId;
    
    if (!this.clientId) {
      console.error('[GoogleAuth] ✗ No Google Client ID in config - Google button hidden');
      this.hideGoogleButton();
      return false;
    }

    console.log('[GoogleAuth] ✓ Client ID found, loading Google SDK...');
    
    // Load Google SDK
    const sdkLoaded = await this.loadGoogleScript();
    if (!sdkLoaded) {
      console.error('[GoogleAuth] ✗ Failed to load Google SDK');
      this.hideGoogleButton();
      return false;
    }

    // Initialize Google Accounts
    try {
      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      console.log('[GoogleAuth] ✓ Google Accounts initialized');

      // Render button
      await this.renderButton();
      this.initialized = true;
      console.log('[GoogleAuth] ✅ READY');
      return true;
    } catch (e) {
      console.error('[GoogleAuth] ✗ Initialization failed:', e);
      this.hideGoogleButton();
      return false;
    }
  }

  loadGoogleScript() {
    return new Promise((resolve) => {
      // Check if already loaded
      if (window.google?.accounts?.id) {
        console.log('[GoogleAuth] Google SDK already loaded');
        resolve(true);
        return;
      }

      if (document.getElementById('google-jssdk')) {
        console.log('[GoogleAuth] Google SDK script already exists');
        resolve(true);
        return;
      }
      
      const script = document.createElement('script');
      script.id = 'google-jssdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('[GoogleAuth] ✓ Google SDK script loaded');
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('[GoogleAuth] ✗ Failed to load Google SDK script');
        resolve(false);
      };
      
      document.head.appendChild(script);
    });
  }

  renderButton() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const btnContainer = document.getElementById('google-signin-btn');
        if (!btnContainer) {
          console.error('[GoogleAuth] ✗ Button container #google-signin-btn not found in DOM');
          resolve(false);
          return;
        }

        try {
          google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: 250,
            locale: 'en'
          });

          console.log('[GoogleAuth] ✓ Google button rendered in DOM');
          resolve(true);
        } catch (e) {
          console.error('[GoogleAuth] ✗ Failed to render button:', e);
          resolve(false);
        }
      }, 100);
    });
  }

  hideGoogleButton() {
    const btn = document.getElementById('google-signin-btn');
    if (btn) {
      btn.style.display = 'none';
      console.log('[GoogleAuth] Button hidden');
    }
  }

  async handleCredentialResponse(response) {
    console.log('[GoogleAuth] Credential received from Google');
    
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();
      
      console.log('[GoogleAuth] Server response:', data);
      
      if (data.success) {
        console.log('[GoogleAuth] ✓ Authentication successful');
        this.saveSession(data);
        this.updateUI(data.user);
        
        // Notify other services
        window.dispatchEvent(new CustomEvent('auth:success', { 
          detail: { user: data.user, token: data.token } 
        }));
      } else {
        console.error('[GoogleAuth] Auth failed:', data.error);
        alert('Google sign-in failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('[GoogleAuth] Auth error:', e);
      alert('Sign-in error. Please try again.');
    }
  }

  saveSession(data) {
    localStorage.setItem('session_token', data.token);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('user_email', data.user.email);
    localStorage.setItem('session_active', 'true');
    console.log('[GoogleAuth] Session saved for:', data.user.email);
  }

  updateUI(user) {
    console.log('[GoogleAuth] Updating UI for user:', user.email);
    
    // HIDE sign-in/sign-up forms
    const signinContainer = document.getElementById('signin-form-container');
    const signupContainer = document.getElementById('signup-form-container');
    const userDisplay = document.getElementById('user-display');
    
    if (signinContainer) signinContainer.style.display = 'none';
    if (signupContainer) signupContainer.style.display = 'none';
    
    if (userDisplay) {
      userDisplay.style.display = 'flex';
      userDisplay.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${user.picture || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2216%22 fill=%22%23ccc%22/%3E%3C/svg%3E'}" 
               alt="User" style="width:32px;height:32px;border-radius:50%;">
          <span style="font-weight: 500;">${user.email}</span>
          <button onclick="window.googleAuth.logout()" style="margin-left:10px; padding: 5px 10px; cursor: pointer;">Sign Out</button>
        </div>
      `;
    }

    console.log('[GoogleAuth] ✓ UI updated');
  }

  logout() {
    console.log('[GoogleAuth] Logging out...');
    localStorage.removeItem('session_token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user_email');
    localStorage.removeItem('session_active');
    
    // Reload page to clear state
    location.reload();
  }
}

// Create global instance
window.googleAuth = new GoogleAuthManager();

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('[GoogleAuth] DOMContentLoaded - starting initialization');
  window.googleAuth.init();
});

console.log('[GoogleAuth] Script loaded and ready');
