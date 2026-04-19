// AUTH UI CONTROLLER - ONLY ONE FORM VISIBLE AT A TIME
class AuthUIController {
  constructor() {
    this.currentView = 'signin'; // 'signin' | 'signup' | 'loggedin'
  }

  init() {
    console.log('[AuthUI] Initializing...');
    this.bindEvents();
    this.checkExistingSession();
  }

  bindEvents() {
    console.log('[AuthUI] Binding event listeners...');
    
    // Toggle links
    const showSignup = document.getElementById('show-signup');
    const showSignin = document.getElementById('show-signin');
    
    if (showSignup) {
      showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSignup();
      });
      console.log('[AuthUI] ✓ Show signup link bound');
    } else {
      console.warn('[AuthUI] #show-signup not found');
    }
    
    if (showSignin) {
      showSignin.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSignin();
      });
      console.log('[AuthUI] ✓ Show signin link bound');
    } else {
      console.warn('[AuthUI] #show-signin not found');
    }

    // Form submissions
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    
    if (signinForm) {
      signinForm.addEventListener('submit', (e) => this.handleSignin(e));
      console.log('[AuthUI] ✓ Sign in form bound');
    } else {
      console.warn('[AuthUI] #signin-form not found');
    }
    
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
      console.log('[AuthUI] ✓ Sign up form bound');
    } else {
      console.warn('[AuthUI] #signup-form not found');
    }
  }

  showSignin() {
    console.log('[AuthUI] Showing signin form');
    this.currentView = 'signin';
    
    const signinForm = document.getElementById('signin-form-container');
    const signupForm = document.getElementById('signup-form-container');
    const userDisplay = document.getElementById('user-display');
    const googleBtn = document.getElementById('google-signin-btn');
    
    if (signinForm) signinForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
    if (userDisplay) userDisplay.style.display = 'none';
    if (googleBtn) googleBtn.style.display = 'block';
  }

  showSignup() {
    console.log('[AuthUI] Showing signup form');
    this.currentView = 'signup';
    
    const signinForm = document.getElementById('signin-form-container');
    const signupForm = document.getElementById('signup-form-container');
    const userDisplay = document.getElementById('user-display');
    const googleBtn = document.getElementById('google-signin-btn');
    
    if (signinForm) signinForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
    if (userDisplay) userDisplay.style.display = 'none';
    if (googleBtn) googleBtn.style.display = 'block';
  }

  showLoggedIn(user) {
    console.log('[AuthUI] Showing logged in state for:', user.email);
    this.currentView = 'loggedin';
    
    const signinForm = document.getElementById('signin-form-container');
    const signupForm = document.getElementById('signup-form-container');
    const userDisplay = document.getElementById('user-display');
    const googleBtn = document.getElementById('google-signin-btn');
    
    if (signinForm) signinForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (googleBtn) googleBtn.style.display = 'none';
    
    if (userDisplay) {
      userDisplay.style.display = 'flex';
      userDisplay.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; padding: 10px;">
          <img src="${user.avatar || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2216%22 fill=%22%230066cc%22/%3E%3C/svg%3E'}" 
               class="user-avatar" style="width:32px;height:32px;border-radius:50%;">
          <span class="user-email" style="font-weight: 500;">${user.email}</span>
          <button onclick="window.authUI.logout()" class="btn-signout" style="margin-left:10px; padding: 5px 10px; cursor: pointer;">Sign Out</button>
        </div>
      `;
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

    console.log('[AuthUI] Signing in user:', email);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      console.log('[AuthUI] Sign in response:', data.success ? '✓ Success' : '✗ Failed');
      
      if (data.success) {
        this.saveSession(data);
        this.showLoggedIn(data.user);
        
        // Notify other services
        window.dispatchEvent(new CustomEvent('auth:success', { 
          detail: { user: data.user, token: data.token } 
        }));
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('[AuthUI] Login error:', err);
      alert('Network error');
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
    
    console.log('[AuthUI] Registering user:', email);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      console.log('[AuthUI] Registration response:', data.success ? '✓ Success' : '✗ Failed');
      
      if (data.success) {
        alert('✓ Account created! Please sign in.');
        // Clear form and show signin
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-confirm').value = '';
        this.showSignin();
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('[AuthUI] Registration error:', err);
      alert('Network error');
    }
  }

  saveSession(data) {
    localStorage.setItem('session_token', data.token);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('user_email', data.user.email);
    console.log('[AuthUI] Session saved');
  }

  checkExistingSession() {
    const token = localStorage.getItem('session_token');
    const email = localStorage.getItem('user_email');
    
    console.log('[AuthUI] Checking existing session...', token ? '✓ Token found' : '✗ No token');
    
    if (token && email) {
      // Verify with server
      this.verifySession(token, email);
    } else {
      // Default to signin
      this.showSignin();
    }
  }

  async verifySession(token, email) {
    try {
      console.log('[AuthUI] Verifying session...');
      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('[AuthUI] ✓ Session valid');
        this.showLoggedIn({ email, ...data.user });
      } else {
        console.log('[AuthUI] ✗ Session invalid');
        this.clearSession();
        this.showSignin();
      }
    } catch (e) {
      console.error('[AuthUI] Verify error:', e);
      this.showSignin();
    }
  }

  clearSession() {
    localStorage.removeItem('session_token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user_email');
    console.log('[AuthUI] Session cleared');
  }

  logout() {
    console.log('[AuthUI] User logging out');
    this.clearSession();
    location.reload();
  }
}

// Create global instance
window.authUI = new AuthUIController();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('[AuthUI] DOMContentLoaded - initializing');
  window.authUI.init();
});

console.log('[AuthUI] Script loaded');
