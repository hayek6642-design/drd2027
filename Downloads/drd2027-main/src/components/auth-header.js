/**
 * Authentication Header Component
 * Displays Sign In, Sign Up, and Google Sign In buttons at the top of the app
 */

export class AuthHeader {
  constructor(container) {
    this.container = container;
    this.apiBase = '/api';
    this.render();
  }

  render() {
    const header = document.createElement('div');
    header.className = 'auth-header-container';
    header.innerHTML = `
      <style>
        .auth-header-container {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-bottom: 2px solid rgba(0, 212, 255, 0.3);
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0, 212, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .auth-header-title {
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #00d4ff, #0099ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          letter-spacing: 2px;
        }

        .auth-buttons-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .auth-button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .auth-button-signin {
          background: rgba(0, 212, 255, 0.1);
          color: #00d4ff;
          border: 1px solid #00d4ff;
        }

        .auth-button-signin:hover {
          background: rgba(0, 212, 255, 0.2);
          box-shadow: 0 0 12px rgba(0, 212, 255, 0.4);
          transform: translateY(-2px);
        }

        .auth-button-signup {
          background: linear-gradient(135deg, #00d4ff, #0099ff);
          color: #000;
          border: none;
        }

        .auth-button-signup:hover {
          box-shadow: 0 0 16px rgba(0, 212, 255, 0.6);
          transform: translateY(-2px);
        }

        .auth-button-google {
          background: #fff;
          color: #000;
          border: 1px solid #ddd;
          gap: 8px;
        }

        .auth-button-google:hover {
          background: #f5f5f5;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .auth-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .auth-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 12px;
          background: rgba(0, 212, 255, 0.1);
          border-radius: 20px;
          border: 1px solid rgba(0, 212, 255, 0.3);
          color: #00d4ff;
          font-size: 12px;
        }

        .auth-user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00d4ff, #0099ff);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          font-weight: 700;
          font-size: 11px;
        }

        .auth-logout-button {
          padding: 6px 12px;
          background: rgba(255, 80, 80, 0.1);
          color: #ff5050;
          border: 1px solid #ff5050;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .auth-logout-button:hover {
          background: rgba(255, 80, 80, 0.2);
          box-shadow: 0 0 12px rgba(255, 80, 80, 0.3);
        }

        /* Modal Styles */
        .auth-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(4px);
        }

        .auth-modal {
          background: #1a1a2e;
          border: 2px solid rgba(0, 212, 255, 0.3);
          border-radius: 12px;
          padding: 32px;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .auth-modal-header {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 6px;
          background: linear-gradient(135deg, #00d4ff, #0099ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .auth-modal-subtitle {
          color: #888;
          font-size: 13px;
          margin-bottom: 24px;
        }

        .auth-form-group {
          margin-bottom: 16px;
        }

        .auth-form-label {
          display: block;
          color: #00d4ff;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .auth-form-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(0, 212, 255, 0.05);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          font-family: inherit;
        }

        .auth-form-input:focus {
          outline: none;
          border-color: #00d4ff;
          background: rgba(0, 212, 255, 0.1);
          box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
        }

        .auth-form-input::placeholder {
          color: #666;
        }

        .auth-form-button {
          width: 100%;
          padding: 10px;
          background: linear-gradient(135deg, #00d4ff, #0099ff);
          border: none;
          border-radius: 6px;
          color: #000;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
        }

        .auth-form-button:hover {
          box-shadow: 0 0 16px rgba(0, 212, 255, 0.5);
          transform: translateY(-2px);
        }

        .auth-form-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-error-message {
          color: #ff5050;
          font-size: 12px;
          margin-top: 8px;
          padding: 8px;
          background: rgba(255, 80, 80, 0.1);
          border-radius: 4px;
          border-left: 2px solid #ff5050;
        }

        .auth-success-message {
          color: #00ff88;
          font-size: 12px;
          margin-top: 8px;
          padding: 8px;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 4px;
          border-left: 2px solid #00ff88;
        }

        .auth-modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: #888;
          font-size: 24px;
          cursor: pointer;
          transition: color 0.3s;
        }

        .auth-modal-close:hover {
          color: #00d4ff;
        }

        .auth-divider {
          text-align: center;
          margin: 16px 0;
          color: #666;
          font-size: 12px;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          display: inline-block;
          width: 40%;
          height: 1px;
          background: linear-gradient(90deg, transparent, #666, transparent);
          vertical-align: middle;
          margin: 0 6px;
        }

        .google-icon {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 768px) {
          .auth-header-container {
            flex-direction: column;
            gap: 12px;
          }

          .auth-buttons-group {
            width: 100%;
            justify-content: center;
          }

          .auth-button {
            padding: 6px 12px;
            font-size: 12px;
          }

          .auth-modal {
            width: 95%;
            padding: 20px;
          }
        }
      </style>

      <h1 class="auth-header-title">🏦 CodeBank</h1>
      
      <div class="auth-buttons-group" id="authButtonsGroup">
        <button class="auth-button auth-button-signin" onclick="window.authHeader.showSignIn()">
          🔓 Sign In
        </button>
        <button class="auth-button auth-button-signup" onclick="window.authHeader.showSignUp()">
          ✨ Sign Up
        </button>
        <button class="auth-button auth-button-google" onclick="window.authHeader.handleGoogleSignIn()">
          <svg class="google-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google Sign In
        </button>
      </div>

      <!-- User Info (shown when logged in) -->
      <div id="authUserInfo" style="display: none;"></div>
    `;

    this.container.insertBefore(header, this.container.firstChild);
    window.authHeader = this;
    
    this.setupAuthListeners();
    this.checkAuthStatus();
  }

  setupAuthListeners() {
    // Listen for session changes if SessionManager is available
    if (window.sessionManager) {
      window.sessionManager.subscribe((session) => {
        this.checkAuthStatus();
      });
    }
  }

  checkAuthStatus() {
    const isLoggedIn = window.sessionManager && window.sessionManager.isUser();
    const buttonsGroup = document.getElementById('authButtonsGroup');
    const userInfo = document.getElementById('authUserInfo');

    if (isLoggedIn && window.sessionManager) {
      const email = window.sessionManager.getEmail();
      const avatar = email ? email.charAt(0).toUpperCase() : '👤';

      buttonsGroup.innerHTML = '';
      userInfo.style.display = 'flex';
      userInfo.innerHTML = `
        <div class="auth-user-info">
          <div class="auth-user-avatar">${avatar}</div>
          <span>${email}</span>
          <button class="auth-logout-button" onclick="window.authHeader.handleLogout()">Logout</button>
        </div>
      `;
    } else {
      buttonsGroup.style.display = 'flex';
      userInfo.style.display = 'none';
    }
  }

  showSignIn() {
    this.showAuthModal('signin');
  }

  showSignUp() {
    this.showAuthModal('signup');
  }

  showAuthModal(mode) {
    const overlay = document.createElement('div');
    overlay.className = 'auth-modal-overlay';
    overlay.id = 'authModalOverlay';

    const isSignUp = mode === 'signup';
    const title = isSignUp ? 'Create Account' : 'Sign In';
    const subtitle = isSignUp ? 'Join CodeBank and unlock exclusive features' : 'Welcome back to CodeBank';

    overlay.innerHTML = `
      <div class="auth-modal">
        <button class="auth-modal-close" onclick="document.getElementById('authModalOverlay').remove()">✕</button>
        <div class="auth-modal-header">${title}</div>
        <div class="auth-modal-subtitle">${subtitle}</div>
        
        <form id="authForm" onsubmit="window.authHeader.handleFormSubmit(event, '${mode}')">
          ${
            isSignUp
              ? `
            <div class="auth-form-group">
              <label class="auth-form-label">Full Name</label>
              <input type="text" class="auth-form-input" id="fullName" placeholder="Your Full Name" required>
            </div>
          `
              : ''
          }
          
          <div class="auth-form-group">
            <label class="auth-form-label">Email</label>
            <input type="email" class="auth-form-input" id="email" placeholder="you@example.com" required>
          </div>

          <div class="auth-form-group">
            <label class="auth-form-label">Password</label>
            <input type="password" class="auth-form-input" id="password" placeholder="••••••••" required>
          </div>

          ${
            isSignUp
              ? `
            <div class="auth-form-group">
              <label class="auth-form-label">Confirm Password</label>
              <input type="password" class="auth-form-input" id="confirmPassword" placeholder="••••••••" required>
            </div>
          `
              : ''
          }

          <button type="submit" class="auth-form-button" id="submitBtn">${
            isSignUp ? '✨ Create Account' : '🔓 Sign In'
          }</button>

          <div id="authMessage"></div>
        </form>

        <div class="auth-divider">OR</div>

        <button class="auth-button auth-button-google" style="width: 100%; justify-content: center;" onclick="window.authHeader.handleGoogleSignIn()">
          <svg class="google-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div style="text-align: center; margin-top: 16px; color: #888; font-size: 12px;">
          ${
            isSignUp
              ? `Already have an account? <button onclick="window.authHeader.showSignIn()" style="background: none; border: none; color: #00d4ff; cursor: pointer; text-decoration: underline;">Sign In</button>`
              : `Don't have an account? <button onclick="window.authHeader.showSignUp()" style="background: none; border: none; color: #00d4ff; cursor: pointer; text-decoration: underline;">Sign Up</button>`
          }
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close modal when clicking overlay background
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  async handleFormSubmit(event, mode) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('#submitBtn');
    const messageDiv = form.querySelector('#authMessage');
    messageDiv.innerHTML = '';

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Processing...';

      const email = form.querySelector('#email').value;
      const password = form.querySelector('#password').value;

      if (mode === 'signup') {
        const fullName = form.querySelector('#fullName').value;
        const confirmPassword = form.querySelector('#confirmPassword').value;

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        // Call signup endpoint
        const response = await fetch(`${this.apiBase}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            email,
            password
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Signup failed');
        }

        // Upgrade session to user
        if (window.sessionManager && data.user && data.token) {
          await window.sessionManager.upgradeToUser(data.user, data.token);
        }

        messageDiv.className = 'auth-success-message';
        messageDiv.textContent = '✅ Account created successfully! Redirecting...';

        setTimeout(() => {
          document.getElementById('authModalOverlay').remove();
        }, 1500);
      } else {
        // Sign In
        const response = await fetch(`${this.apiBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        // Upgrade session to user
        if (window.sessionManager && data.user && data.token) {
          await window.sessionManager.upgradeToUser(data.user, data.token);
        }

        messageDiv.className = 'auth-success-message';
        messageDiv.textContent = '✅ Signed in successfully! Redirecting...';

        setTimeout(() => {
          document.getElementById('authModalOverlay').remove();
        }, 1500);
      }
    } catch (error) {
      console.error('[AuthHeader] Error:', error);
      messageDiv.className = 'auth-error-message';
      messageDiv.textContent = `❌ ${error.message}`;
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'signup' ? '✨ Create Account' : '🔓 Sign In';
    }
  }

  async handleGoogleSignIn() {
    try {
      // This would normally open a Google OAuth popup
      // For now, we'll show a placeholder message
      alert('Google Sign In integration requires Google OAuth configuration on the backend.\n\nPlease configure your Google OAuth credentials in the backend settings.');
    } catch (error) {
      console.error('[AuthHeader] Google Sign In error:', error);
    }
  }

  async handleLogout() {
    try {
      if (window.sessionManager) {
        await window.sessionManager.logout();
        this.checkAuthStatus();
      }
    } catch (error) {
      console.error('[AuthHeader] Logout error:', error);
    }
  }
}

// Export for use as a module
export default AuthHeader;
