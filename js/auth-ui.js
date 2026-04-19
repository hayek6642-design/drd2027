/**
 * AuthUIController - Manages Sign In / Sign Up / Logged In views
 * Ensures only one view is shown at a time
 */
class AuthUIController {
  constructor() {
    this.currentView = 'signin'; // signin | signup | loggedin
  }

  init() {
    console.log('[AuthUI] Initializing...');
    this.bindEvents();
    this.checkExistingSession();
    this.setupStorageListener();
  }

  bindEvents() {
    // Tab switching buttons in navbar
    const showSignup = document.getElementById('show-signup');
    const showSignin = document.getElementById('show-signin');

    if (showSignup) {
      showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSignup();
      });
    }

    if (showSignin) {
      showSignin.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSignin();
      });
    }

    // Form submissions
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');

    if (signinForm) {
      signinForm.addEventListener('submit', (e) => this.handleSignin(e));
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    console.log('[AuthUI] Events bound');
  }

  showSignin() {
    console.log('[AuthUI] Switching to SIGN IN view');
    this.currentView = 'signin';

    const signinContainer = document.getElementById('signin-form-container');
    const signupContainer = document.getElementById('signup-form-container');
    const userDisplay = document.getElementById('user-display');
    const googleBtn = document.getElementById('google-signin-btn');

    if (signinContainer) signinContainer.style.display = 'block';
    if (signupContainer) signupContainer.style.display = 'none';
    if (userDisplay) userDisplay.style.display = 'none';
    if (googleBtn) googleBtn.style.display = 'block';

    // Update navbar buttons
    this.updateNavbarButtons();
  }

  showSignup() {
    console.log('[AuthUI] Switching to SIGN UP view');
    this.currentView = 'signup';

    const signinContainer = document.getElementById('signin-form-container');
    const signupContainer = document.getElementById('signup-form-container');
    const userDisplay = document.getElementById('user-display');
    const googleBtn = document.getElementById('google-signin-btn');

    if (signinContainer) signinContainer.style.display = 'none';
    if (signupContainer) signupContainer.style.display = 'block';
    if (userDisplay) userDisplay.style.display = 'none';
    if (googleBtn) googleBtn.style.display = 'none';

    // Update navbar buttons
    this.updateNavbarButtons();
  }

  showLoggedIn(user) {
    console.log('[AuthUI] Switching to LOGGED IN view for:', user.email);
    this.currentView = 'loggedin';

    const signinContainer = document.getElementById('signin-form-container');
    const signupContainer = document.getElementById('signup-form-container');
    const userDisplay = document.getElementById('user-display');
    const googleBtn = document.getElementById('google-signin-btn');

    if (signinContainer) signinContainer.style.display = 'none';
    if (signupContainer) signupContainer.style.display = 'none';
    if (googleBtn) googleBtn.style.display = 'none';

    if (userDisplay) {
      userDisplay.style.display = 'flex';
      const avatar = user.avatar || user.picture || 'default-avatar.png';
      userDisplay.innerHTML = `
        <img src="${avatar}" alt="User" style="width:32px;height:32px;border-radius:50%;margin-right:10px;">
        <span style="flex:1;font-weight:500;">${user.email}</span>
        <button onclick="authUI.logout()" class="logout-btn" style="margin-left:10px;">🚪 Sign Out</button>
      `;
    }

    // Update navbar buttons
    this.updateNavbarButtons();
  }

  updateNavbarButtons() {
    const signupNavBtn = document.getElementById('signupNavBtn');
    const loginNavBtn = document.getElementById('loginNavBtn');
    const signoutNavBtn = document.getElementById('signoutNavBtn');

    if (this.currentView === 'loggedin') {
      if (signupNavBtn) signupNavBtn.style.display = 'none';
      if (loginNavBtn) loginNavBtn.style.display = 'none';
      if (signoutNavBtn) signoutNavBtn.style.display = 'block';
    } else {
      if (signupNavBtn) signupNavBtn.style.display = 'block';
      if (loginNavBtn) loginNavBtn.style.display = 'block';
      if (signoutNavBtn) signoutNavBtn.style.display = 'none';
    }
  }

  async handleSignin(e) {
    e.preventDefault();
    const email = document.getElementById('signin-email')?.value;
    const password = document.getElementById('signin-password')?.value;

    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    console.log('[AuthUI] Signing in:', email);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        console.log('[AuthUI] ✓ Login successful');
        this.saveSession(data);
        this.showLoggedIn(data.user);
        window.dispatchEvent(new CustomEvent('auth:loggedin', { detail: data.user }));
      } else {
        console.error('[AuthUI] Login failed:', data.error);
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('[AuthUI] Network error:', err);
      alert('Network error. Please try again.');
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email')?.value;
    const password = document.getElementById('signup-password')?.value;
    const confirm = document.getElementById('signup-confirm')?.value;

    if (!email || !password || !confirm) {
      alert('Please fill all fields');
      return;
    }

    if (password !== confirm) {
      alert('Passwords do not match');
      return;
    }

    console.log('[AuthUI] Signing up:', email);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        console.log('[AuthUI] ✓ Registration successful');
        alert('✓ Account created! Please sign in.');
        this.showSignin();
        // Clear form
        document.getElementById('signup-form')?.reset();
      } else {
        console.error('[AuthUI] Registration failed:', data.error);
        alert(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('[AuthUI] Network error:', err);
      alert('Network error. Please try again.');
    }
  }

  saveSession(data) {
    localStorage.setItem('session_token', data.token);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('user_email', data.user.email);
    localStorage.setItem('user_avatar', data.user.picture || '');
  }

  checkExistingSession() {
    const token = localStorage.getItem('session_token');
    const email = localStorage.getItem('user_email');

    if (token && email) {
      console.log('[AuthUI] Existing session found, verifying...');
      this.verifySession(token, email);
    } else {
      console.log('[AuthUI] No existing session');
      this.showSignin();
    }
  }

  async verifySession(token, email) {
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[AuthUI] ✓ Session verified');
        this.showLoggedIn({
          email,
          picture: localStorage.getItem('user_avatar'),
          ...data.user
        });
      } else {
        console.warn('[AuthUI] Session verification failed');
        this.clearSession();
        this.showSignin();
      }
    } catch (e) {
      console.error('[AuthUI] Session check error:', e);
      this.clearSession();
      this.showSignin();
    }
  }

  clearSession() {
    localStorage.removeItem('session_token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_avatar');
  }

  logout() {
    console.log('[AuthUI] Logging out...');
    this.clearSession();

    // Call logout API
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch(e => console.error('Logout API error:', e));

    location.reload();
  }

  setupStorageListener() {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'session_token') {
        console.log('[AuthUI] Session changed in another tab');
        if (!e.newValue) {
          this.clearSession();
          this.showSignin();
        } else {
          this.checkExistingSession();
        }
      }
    });
  }
}

// Initialize globally
window.authUI = new AuthUIController();

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.authUI.init();
});
