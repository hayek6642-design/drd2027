// src/components/app-grid.js

/**
 * App Grid Component - Performance Optimized
 * Lazy loading, virtualization, and efficient rendering
 */

class AppGrid {
  constructor(container) {
    this.container = container;
    this.apps = [];
    this.visibleApps = new Set();
    this.intersectionObserver = null;
    this.resizeObserver = null;
    this.authHeader = null;
    this.apiBase = '/api';
    
    this.init();
  }

  init() {
    this.setupAuthHeader();
    this.setupGrid();
    this.setupObservers();
    this.loadApps();
  }

  setupAuthHeader() {
    // Create authentication header at the top
    const header = document.createElement('div');
    header.className = 'auth-header-container';
    header.id = 'authHeader';
    header.innerHTML = this.getAuthHeaderHTML();
    
    this.container.insertBefore(header, this.container.firstChild);
    
    // Setup event listeners
    this.setupAuthListeners();
    this.checkAuthStatus();
  }

  getAuthHeaderHTML() {
    return `
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

        @media (max-width: 768px) {
          .auth-header-container {
            flex-wrap: wrap;
            gap: 12px;
          }

          .auth-buttons-group {
            width: 100%;
            justify-content: center;
            order: 3;
          }

          .auth-button {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      </style>

      <h1 class="auth-header-title">🏦 CodeBank</h1>
      
      <div class="auth-buttons-group" id="authButtonsGroup">
        <button class="auth-button auth-button-signin" id="signInBtn">🔓 Sign In</button>
        <button class="auth-button auth-button-signup" id="signUpBtn">✨ Sign Up</button>
        <button class="auth-button auth-button-google" id="googleSignInBtn">
          <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>
      </div>

      <div id="authUserInfo" style="display: none;"></div>
    `;
  }

  setupAuthListeners() {
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const googleBtn = document.getElementById('googleSignInBtn');

    if (signInBtn) signInBtn.addEventListener('click', () => this.showAuthModal('signin'));
    if (signUpBtn) signUpBtn.addEventListener('click', () => this.showAuthModal('signup'));
    if (googleBtn) googleBtn.addEventListener('click', () => this.handleGoogleSignIn());
  }

  showAuthModal(mode) {
    const isSignUp = mode === 'signup';
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'auth-modal-overlay';
    modalOverlay.id = 'authModalOverlay';
    modalOverlay.innerHTML = this.getAuthModalHTML(mode);
    document.body.appendChild(modalOverlay);

    // Setup modal event listeners
    const closeBtn = document.querySelector('.auth-modal-close');
    const form = document.getElementById('authForm');
    if (closeBtn) closeBtn.addEventListener('click', () => modalOverlay.remove());
    if (form) form.addEventListener('submit', (e) => this.handleFormSubmit(e, mode));

    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.remove();
    });

    // Add modal styles
    this.addModalStyles();
  }

  getAuthModalHTML(mode) {
    const isSignUp = mode === 'signup';
    const title = isSignUp ? 'Create Account' : 'Sign In';
    const subtitle = isSignUp ? 'Join CodeBank and unlock exclusive features' : 'Welcome back to CodeBank';

    return `
      <div class="auth-modal">
        <button class="auth-modal-close">✕</button>
        <div class="auth-modal-header">${title}</div>
        <div class="auth-modal-subtitle">${subtitle}</div>
        
        <form id="authForm">
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

          <button type="submit" class="auth-form-button" id="submitBtn">
            ${isSignUp ? '✨ Create Account' : '🔓 Sign In'}
          </button>

          <div id="authMessage"></div>
        </form>

        <div class="auth-divider">OR</div>

        <button class="auth-button auth-button-google" style="width: 100%; justify-content: center;">
          Continue with Google
        </button>

        <div style="text-align: center; margin-top: 16px; color: #888; font-size: 12px;">
          ${
            isSignUp
              ? `Already have an account? <button type="button" onclick="document.getElementById('authModalOverlay').remove(); setTimeout(() => window.appGrid.showAuthModal('signin'), 100);" style="background: none; border: none; color: #00d4ff; cursor: pointer; text-decoration: underline;">Sign In</button>`
              : `Don't have an account? <button type="button" onclick="document.getElementById('authModalOverlay').remove(); setTimeout(() => window.appGrid.showAuthModal('signup'), 100);" style="background: none; border: none; color: #00d4ff; cursor: pointer; text-decoration: underline;">Sign Up</button>`
          }
        </div>
      </div>
    `;
  }

  addModalStyles() {
    // Check if styles already exist
    if (document.getElementById('authModalStyles')) return;

    const style = document.createElement('style');
    style.id = 'authModalStyles';
    style.textContent = `
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
        position: relative;
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
        box-sizing: border-box;
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
    `;
    document.head.appendChild(style);
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
          body: JSON.stringify({ fullName, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Signup failed');
        }

        // Upgrade session if SessionManager exists
        if (window.sessionManager && data.user && data.token) {
          await window.sessionManager.upgradeToUser(data.user, data.token);
        }

        messageDiv.className = 'auth-success-message';
        messageDiv.textContent = '✅ Account created successfully! Redirecting...';

        setTimeout(() => {
          document.getElementById('authModalOverlay').remove();
          this.checkAuthStatus();
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

        // Upgrade session if SessionManager exists
        if (window.sessionManager && data.user && data.token) {
          await window.sessionManager.upgradeToUser(data.user, data.token);
        }

        messageDiv.className = 'auth-success-message';
        messageDiv.textContent = '✅ Signed in successfully! Redirecting...';

        setTimeout(() => {
          document.getElementById('authModalOverlay').remove();
          this.checkAuthStatus();
        }, 1500);
      }
    } catch (error) {
      console.error('[Auth] Error:', error);
      messageDiv.className = 'auth-error-message';
      messageDiv.textContent = `❌ ${error.message}`;
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'signup' ? '✨ Create Account' : '🔓 Sign In';
    }
  }

  handleGoogleSignIn() {
    alert('Google Sign In integration requires Google OAuth configuration on the backend.\n\nPlease configure your Google OAuth credentials in the backend settings.');
  }

  checkAuthStatus() {
    // Safe check: method exists AND returns truthy
    const isLoggedIn = window.sessionManager && 
                     typeof window.sessionManager.isUser === 'function' &&
                     window.sessionManager.isUser();
    const buttonsGroup = document.getElementById('authButtonsGroup');
    const userInfo = document.getElementById('authUserInfo');

    if (buttonsGroup && userInfo) {
      if (isLoggedIn && window.sessionManager) {
        const email = window.sessionManager.getEmail();
        const avatar = email ? email.charAt(0).toUpperCase() : '👤';

        buttonsGroup.style.display = 'none';
        userInfo.style.display = 'flex';
        userInfo.className = 'auth-user-info';
        userInfo.innerHTML = `
          <div class="auth-user-avatar">${avatar}</div>
          <span>${email}</span>
          <button class="auth-logout-button" onclick="window.appGrid.handleLogout()">Logout</button>
        `;
      } else {
        buttonsGroup.style.display = 'flex';
        userInfo.style.display = 'none';
      }
    }
  }

  async handleLogout() {
    try {
      if (window.sessionManager) {
        await window.sessionManager.logout();
        this.checkAuthStatus();
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
  }

  setupGrid() {
    this.container.innerHTML += `
      <div class="app-grid-container">
        <div class="app-grid-header">
          <h2 class="app-grid-title">Services Dashboard</h2>
          <div class="app-grid-stats">
            <span class="stat-item">Services: <span id="app-count">0</span></span>
            <span class="stat-item">Active: <span id="active-count">0</span></span>
          </div>
        </div>
        <div id="app-grid" class="app-grid-grid"></div>
      </div>
    `;
    
    // Add grid styles
    this.addGridStyles();
  }

  addGridStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Remove any side panel styles */
      body {
        margin: 0;
        padding: 0;
        background: #0f0f0f;
      }

      #app {
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .app-grid-container {
        padding: 24px 20px;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
      }
      
      .app-grid-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        padding-bottom: 20px;
        border-bottom: 2px solid rgba(0, 212, 255, 0.2);
      }
      
      .app-grid-title {
        font-size: 2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #00d4ff, #0099ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        letter-spacing: 1px;
      }
      
      .app-grid-stats {
        display: flex;
        gap: 16px;
        font-size: 0.9rem;
        color: #888;
      }
      
      .stat-item {
        background: rgba(0, 212, 255, 0.05);
        padding: 6px 14px;
        border-radius: 20px;
        border: 1px solid rgba(0, 212, 255, 0.2);
        transition: all 0.3s ease;
      }

      .stat-item:hover {
        background: rgba(0, 212, 255, 0.1);
        border-color: rgba(0, 212, 255, 0.4);
      }
      
      .app-grid-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 20px;
        animation: fadeIn 0.5s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .app-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 14px;
        padding: 18px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 180px;
      }

      .app-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: -1;
      }
      
      .app-card:hover {
        transform: translateY(-6px) scale(1.02);
        border-color: rgba(0, 212, 255, 0.5);
        background: rgba(255, 255, 255, 0.05);
        box-shadow: 0 12px 40px rgba(0, 212, 255, 0.15);
      }

      .app-card:hover::before {
        opacity: 1;
      }
      
      .app-card:active {
        transform: translateY(-2px) scale(0.98);
      }
      
      .app-icon {
        width: 52px;
        height: 52px;
        border-radius: 10px;
        background: linear-gradient(135deg, #00d4ff, #0099ff);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
        font-size: 28px;
        box-shadow: 0 4px 15px rgba(0, 212, 255, 0.25);
      }
      
      .app-name {
        font-weight: 600;
        color: #fff;
        margin-bottom: 6px;
        font-size: 1.05rem;
        letter-spacing: 0.5px;
      }
      
      .app-desc {
        font-size: 0.85rem;
        color: #aaa;
        line-height: 1.5;
        flex-grow: 1;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .app-status {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
      }
      
      .app-status.active {
        background: #00ff88;
        box-shadow: 0 0 12px rgba(0, 255, 136, 0.7);
      }
      
      .app-status.loading {
        background: #ffaa00;
        animation: pulse 1.2s infinite;
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 170, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0); }
      }
      
      /* Responsive design */
      @media (max-width: 1024px) {
        .app-grid-grid {
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        }
      }

      @media (max-width: 768px) {
        .app-grid-container {
          padding: 16px 12px;
        }

        .app-grid-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .app-grid-title {
          font-size: 1.5rem;
        }

        .app-grid-stats {
          width: 100%;
          justify-content: flex-start;
          flex-wrap: wrap;
        }
        
        .app-grid-grid {
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }

        .app-card {
          padding: 12px;
          min-height: 140px;
        }

        .app-icon {
          width: 40px;
          height: 40px;
          font-size: 20px;
        }

        .app-name {
          font-size: 0.9rem;
        }

        .app-desc {
          font-size: 0.75rem;
        }
      }

      @media (max-width: 480px) {
        .app-grid-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }
      }

      /* Remove any scrollbar styling that might come from side panels */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(0, 212, 255, 0.3);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 212, 255, 0.5);
      }
    `;
    document.head.appendChild(style);
  }

  setupObservers() {
    // Intersection Observer for lazy loading
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const card = entry.target;
        if (entry.isIntersecting) {
          this.loadAppCard(card);
        }
      });
    }, {
      root: null,
      rootMargin: '50px',
      threshold: 0.1
    });

    // Resize Observer for responsive updates
    this.resizeObserver = new ResizeObserver(() => {
      this.updateGridStats();
    });
    this.resizeObserver.observe(this.container);
  }

  loadApps() {
    // Mock app data - in real app, this would come from a service
    this.apps = [
      {
        id: 'safecode',
        name: 'SafeCode',
        description: 'Secure code generation and validation',
        icon: '🔒',
        category: 'security',
        url: '/safecode.html'
      },
      {
        id: 'e7ki',
        name: 'E7ki',
        description: 'Advanced analytics and insights',
        icon: '📊',
        category: 'analytics',
        url: '/e7ki.html'
      },
      {
        id: 'farragna',
        name: 'Farragna',
        description: 'Media streaming and management',
        icon: '🎬',
        category: 'media',
        url: '/farragna.html'
      },
      {
        id: 'samma3ny',
        name: 'Samma3ny',
        description: 'Audio processing and effects',
        icon: '🎵',
        category: 'audio',
        url: '/samma3ny.html'
      },
      {
        id: 'pebalaash',
        name: 'Pebalaash',
        description: 'Image processing and filters',
        icon: '🖼️',
        category: 'graphics',
        url: '/pebalaash.html'
      },
      {
        id: 'battalooda',
        name: 'Battalooda',
        description: 'Music creation and studio tools',
        icon: '🎧',
        category: 'studio',
        url: '/battalooda.html'
      }
    ];

    this.renderApps();
    this.updateGridStats();
  }

  renderApps() {
    const grid = document.getElementById('app-grid');
    grid.innerHTML = '';

    this.apps.forEach(app => {
      const card = document.createElement('div');
      card.className = 'app-card';
      card.dataset.appId = app.id;
      card.dataset.appUrl = app.url;
      card.innerHTML = `
        <div class="app-icon">${app.icon}</div>
        <div class="app-name">${app.name}</div>
        <div class="app-desc">${app.description}</div>
        <div class="app-status" id="status-${app.id}"></div>
      `;
      
      card.addEventListener('click', () => this.launchApp(app));
      grid.appendChild(card);
      
      // Observe for lazy loading
      this.intersectionObserver.observe(card);
    });
  }

  loadAppCard(card) {
    // Add performance optimizations
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 50);
  }

  async launchApp(app) {
    try {
      // Update status
      const status = document.getElementById(`status-${app.id}`);
      status.className = 'app-status loading';
      
      // Use ServiceManager V2
      if (window.serviceManager) {
        const container = document.getElementById('app');
        await window.serviceManager.mountService(app.id, container);
        
        status.className = 'app-status active';
      } else {
        // Fallback
        window.location.href = app.url;
      }
      
    } catch (error) {
      console.error('Failed to launch app:', error);
      const status = document.getElementById(`status-${app.id}`);
      status.style.background = '#ff4444';
    }
  }

  updateGridStats() {
    const appCount = document.getElementById('app-count');
    const activeCount = document.getElementById('active-count');
    
    if (appCount) appCount.textContent = this.apps.length;
    if (activeCount) {
      const active = Array.from(document.querySelectorAll('.app-status.active')).length;
      activeCount.textContent = active;
    }
  }

  // Performance methods
  cleanup() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  pause() {
    // Pause animations and heavy operations
    document.querySelectorAll('.app-card').forEach(card => {
      card.style.animation = 'none';
    });
  }

  resume() {
    // Resume normal operation
    document.querySelectorAll('.app-card').forEach(card => {
      card.style.animation = '';
    });
  }
}

// Export function for module loading
export function renderAppGrid(container) {
  const appGrid = new AppGrid(container);
  // Store reference globally for modal switching
  window.appGrid = appGrid;
  return appGrid;
}