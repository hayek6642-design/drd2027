/**
 * CodeBank Complete Auth System
 * Client-side with SHA-256 hashing + localStorage persistence
 * NO backend dependency - all auth done locally
 */

window.AuthSystem = {
  SALT: 'CodeBank2025Salt',
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // SHA-256 hash implementation
  async sha256(str) {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Get all users from localStorage
  getAllUsers() {
    try {
      const data = localStorage.getItem('cb_users_db');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('[Auth] Failed to load users:', e);
      return {};
    }
  },

  // Save all users to localStorage
  saveUsers(users) {
    try {
      localStorage.setItem('cb_users_db', JSON.stringify(users));
      console.log('[Auth] Users saved to localStorage');
    } catch (e) {
      console.error('[Auth] Failed to save users:', e);
    }
  },

  // Signup: Create new account
  async signup(email, password, confirmPassword) {
    console.log('[Auth] Signup attempt:', email);
    
    // Validation
    if (!email || !password || !confirmPassword) {
      return { success: false, error: '❌ All fields required' };
    }
    
    if (password !== confirmPassword) {
      return { success: false, error: '❌ Passwords do not match' };
    }
    
    if (password.length < 6) {
      return { success: false, error: '❌ Password must be at least 6 characters' };
    }
    
    const users = this.getAllUsers();
    
    // Check if user exists
    if (users[email]) {
      return { success: false, error: '❌ Account already exists' };
    }
    
    // Hash password
    const passwordHash = await this.sha256(password + this.SALT);
    
    // Create user
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    users[email] = {
      id: userId,
      email: email,
      passwordHash: passwordHash,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    // Save
    this.saveUsers(users);
    console.log('[Auth] Account created:', email);
    
    // Auto-login after signup
    return this.login(email, password);
  },

  // Login: Authenticate user
  async login(email, password) {
    console.log('[Auth] Login attempt:', email);
    
    if (!email || !password) {
      return { success: false, error: '❌ Email and password required' };
    }
    
    const users = this.getAllUsers();
    const user = users[email];
    
    if (!user) {
      return { success: false, error: '❌ Account not found. Please sign up.' };
    }
    
    // Hash password and compare
    const passwordHash = await this.sha256(password + this.SALT);
    
    if (passwordHash !== user.passwordHash) {
      return { success: false, error: '❌ Invalid password' };
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    this.saveUsers(users);
    
    // Create session token
    const sessionToken = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const sessionData = {
      token: sessionToken,
      email: email,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.SESSION_DURATION
    };
    
    // Save session
    localStorage.setItem('__cb_session_token__', sessionToken);
    localStorage.setItem('__cb_user_data__', JSON.stringify(sessionData));
    
    console.log('[Auth] User authenticated:', email);
    return { success: true, email: email, token: sessionToken };
  },

  // Restore session from localStorage
  async restoreSession() {
    const sessionToken = localStorage.getItem('__cb_session_token__');
    const sessionDataStr = localStorage.getItem('__cb_user_data__');
    
    if (!sessionToken || !sessionDataStr) {
      console.log('[Auth] No valid session found');
      return null;
    }
    
    try {
      const sessionData = JSON.parse(sessionDataStr);
      
      // Check if expired
      if (Date.now() > sessionData.expiresAt) {
        console.log('[Auth] Session expired');
        this.logout();
        return null;
      }
      
      console.log('[Auth] Session restored:', sessionData.email);
      return sessionData;
    } catch (e) {
      console.error('[Auth] Failed to restore session:', e);
      return null;
    }
  },

  // Logout: Clear session
  logout() {
    console.log('[Auth] Logout');
    localStorage.removeItem('__cb_session_token__');
    localStorage.removeItem('__cb_user_data__');
  },

  // Get current user
  getCurrentUser() {
    const sessionDataStr = localStorage.getItem('__cb_user_data__');
    if (!sessionDataStr) return null;
    
    try {
      const sessionData = JSON.parse(sessionDataStr);
      if (Date.now() > sessionData.expiresAt) {
        this.logout();
        return null;
      }
      return sessionData;
    } catch (e) {
      return null;
    }
  },

  // Check if authenticated
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }
};

console.log('[Auth] System ready');