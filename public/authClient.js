/**
 * ============================================================================
 * FIXED AuthClient - All 5 Critical Issues Resolved
 * ============================================================================
 * 
 * FIXES IMPLEMENTED:
 * 1. ✅ AuthClient exposed to window (was wrapped in IIFE without export)
 * 2. ✅ Integrated with /api/auth/refresh endpoint
 * 3. ✅ Automatic session validation on page load
 * 4. ✅ Retry logic with exponential backoff for network resilience
 * 5. ✅ Token rotation and refresh token management
 * 
 * USAGE:
 *   In browser console: window.AuthClient.login({email, password})
 */

(function() {
  'use strict';
  
  console.log('[AuthClient] Initializing fixed auth client...');

  class ResilientAuthClient {
    constructor() {
      this.baseUrl = window.location.origin;
      this.maxRetries = 3;
      this.baseDelay = 1000; // 1 second
      this.token = null;
      this.refreshToken = null;
      this.sessionExpiry = null;
      this.refreshTimer = null;
      
      // Load persisted tokens
      this.loadPersistedTokens();
      
      // Validate session on init
      this.validateSessionOnLoad();
    }

    /**
     * Load tokens from localStorage (CRITICAL FIX #1 - Part A)
     * Enables frontend to access stored authentication
     */
    loadPersistedTokens() {
      try {
        this.token = localStorage.getItem('auth_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        const expiry = localStorage.getItem('session_expiry');
        if (expiry) {
          this.sessionExpiry = new Date(expiry);
        }
        
        if (this.token) {
          console.log('[AuthClient] Tokens loaded from localStorage');
          this.scheduleRefresh();
        }
      } catch (e) {
        console.error('[AuthClient] Error loading tokens:', e);
      }
    }

    /**
     * Exponential backoff with jitter to prevent thundering herd
     * (CRITICAL FIX #5)
     */
    async sleep(attempt) {
      const delay = this.baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // Random jitter
      const totalDelay = delay + jitter;
      console.log(`[AuthClient] Waiting ${totalDelay.toFixed(0)}ms before retry ${attempt + 1}...`);
      return new Promise(resolve => setTimeout(resolve, totalDelay));
    }

    /**
     * Resilient HTTP fetch with automatic retry logic
     * (CRITICAL FIX #5)
     */
    async fetchWithRetry(url, options, attempt = 0) {
      try {
        const response = await fetch(url, options);
        
        // Don't retry 4xx errors (client errors - server won't help)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }
        
        // Retry 5xx errors and network failures
        if (!response.ok && attempt < this.maxRetries) {
          console.log(`[AuthClient] Server returned ${response.status}, retrying (attempt ${attempt + 1}/${this.maxRetries})...`);
          await this.sleep(attempt);
          return this.fetchWithRetry(url, options, attempt + 1);
        }
        
        return response;
        
      } catch (error) {
        // Network error - retry
        if (attempt < this.maxRetries) {
          console.log(`[AuthClient] Network error: ${error.message}, retrying (attempt ${attempt + 1}/${this.maxRetries})...`);
          await this.sleep(attempt);
          return this.fetchWithRetry(url, options, attempt + 1);
        }
        
        // Final retry failed
        console.error(`[AuthClient] All ${this.maxRetries} retries failed:`, error);
        throw error;
      }
    }

    /**
     * CRITICAL FIX #3: Validate session on page load
     * Checks if current session is still valid without requiring user to re-login
     */
    async validateSessionOnLoad() {
      if (!this.token) {
        console.log('[AuthClient] No token found, skipping session validation');
        return false;
      }

      try {
        console.log('[AuthClient] Validating session on page load...');
        const response = await this.fetchWithRetry(
          `${this.baseUrl}/api/auth/session`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();

        if (response.ok && data.authenticated) {
          console.log('[AuthClient] ✅ Session is valid', data.user);
          
          // Update session expiry if provided
          if (data.sessionExpires) {
            this.sessionExpiry = new Date(data.sessionExpires);
            localStorage.setItem('session_expiry', this.sessionExpiry.toISOString());
            this.scheduleRefresh();
          }
          
          return true;
        } else {
          console.warn('[AuthClient] Session validation failed, clearing auth');
          this.clearTokens();
          return false;
        }
      } catch (error) {
        console.error('[AuthClient] Session validation error:', error);
        return false;
      }
    }

    /**
     * CRITICAL FIX #1: Expose login to window
     * Allows frontend to authenticate users
     */
    async login(credentials) {
      try {
        console.log('[AuthClient] Attempting login...');
        
        const response = await this.fetchWithRetry(
          `${this.baseUrl}/api/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error('[AuthClient] Login failed:', data.error);
          return { ok: false, error: data.error || 'Login failed' };
        }

        if (data.token) {
          this.setTokens(data.token, data.refreshToken, data.expiresIn);
          console.log('[AuthClient] ✅ Login successful');
          return { ok: true, user: data.user };
        }

        return { ok: false, error: 'No token in response' };

      } catch (error) {
        console.error('[AuthClient] Login error:', error);
        return { ok: false, error: error.message };
      }
    }

    /**
     * CRITICAL FIX #1: Expose register to window
     * Allows frontend to register new users
     */
    async register(userData) {
      try {
        console.log('[AuthClient] Attempting registration...');
        
        const response = await this.fetchWithRetry(
          `${this.baseUrl}/api/auth/register`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error('[AuthClient] Registration failed:', data.error);
          return { ok: false, error: data.error || 'Registration failed' };
        }

        // Some APIs auto-login after registration
        if (data.token) {
          this.setTokens(data.token, data.refreshToken, data.expiresIn);
          console.log('[AuthClient] ✅ Registration and auto-login successful');
          return { ok: true, user: data.user };
        }

        console.log('[AuthClient] ✅ Registration successful, please login');
        return { ok: true, message: 'Registration successful. Please login.' };

      } catch (error) {
        console.error('[AuthClient] Registration error:', error);
        return { ok: false, error: error.message };
      }
    }

    /**
     * CRITICAL FIX #2: Token refresh with exponential backoff
     * Automatically refreshes expired tokens without user interaction
     */
    async refreshSession() {
      if (!this.refreshToken) {
        console.warn('[AuthClient] No refresh token available');
        this.redirectToLogin();
        throw new Error('No refresh token available');
      }

      try {
        console.log('[AuthClient] Refreshing session...');
        
        const response = await this.fetchWithRetry(
          `${this.baseUrl}/api/auth/refresh`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: this.refreshToken })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.warn('[AuthClient] Token refresh failed:', data.error);
          this.clearTokens();
          this.redirectToLogin();
          throw new Error(data.error || 'Token refresh failed');
        }

        // CRITICAL FIX #2: Token rotation (revoke old, use new)
        if (data.accessToken) {
          this.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
          console.log('[AuthClient] ✅ Session refreshed successfully');
          return data;
        }

        throw new Error('No access token in refresh response');

      } catch (error) {
        console.error('[AuthClient] Refresh failed:', error);
        this.clearTokens();
        this.redirectToLogin();
        throw error;
      }
    }

    /**
     * Check if current session is likely expired
     */
    isTokenExpired() {
      if (!this.sessionExpiry) return true;
      
      // Consider expired if less than 1 minute remaining
      const now = new Date();
      const timeUntilExpiry = this.sessionExpiry.getTime() - now.getTime();
      return timeUntilExpiry < 60000;
    }

    /**
     * Schedule automatic token refresh before expiry
     * Prevents users from getting logged out unexpectedly
     */
    scheduleRefresh() {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }

      if (!this.sessionExpiry) return;

      const now = new Date();
      const timeUntilExpiry = this.sessionExpiry.getTime() - now.getTime();
      
      // Refresh at 80% of token lifetime (or 5 minutes before expiry, whichever is sooner)
      const refreshAt = Math.min(timeUntilExpiry * 0.8, timeUntilExpiry - 5 * 60 * 1000);

      if (refreshAt > 0) {
        console.log(`[AuthClient] Token refresh scheduled in ${(refreshAt / 1000).toFixed(0)} seconds`);
        this.refreshTimer = setTimeout(() => {
          this.refreshSession().catch(e => {
            console.error('[AuthClient] Scheduled refresh failed:', e);
          });
        }, refreshAt);
      }
    }

    /**
     * CRITICAL FIX #1: Set tokens and persist
     * Stores tokens in localStorage and schedules refresh
     */
    setTokens(accessToken, refreshToken, expiresIn) {
      this.token = accessToken;
      this.refreshToken = refreshToken;
      
      // Set session expiry (expiresIn is in seconds)
      if (expiresIn) {
        const expiryTime = new Date();
        expiryTime.setSeconds(expiryTime.getSeconds() + expiresIn);
        this.sessionExpiry = expiryTime;
        localStorage.setItem('session_expiry', expiryTime.toISOString());
      }

      // Persist to localStorage
      localStorage.setItem('auth_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }

      console.log('[AuthClient] Tokens stored in localStorage');
      this.scheduleRefresh();
    }

    /**
     * Clear all authentication data
     */
    clearTokens() {
      this.token = null;
      this.refreshToken = null;
      this.sessionExpiry = null;
      
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('session_expiry');
      
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }
      
      console.log('[AuthClient] Tokens cleared');
    }

    /**
     * CRITICAL FIX #1: Expose logout to window
     * Allows frontend to logout users
     */
    async logout() {
      try {
        console.log('[AuthClient] Attempting logout...');
        
        // Notify server to invalidate session
        await this.fetchWithRetry(
          `${this.baseUrl}/api/auth/logout`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

      } catch (error) {
        console.error('[AuthClient] Server logout notification failed:', error);
      } finally {
        // Clear local state regardless of server response
        this.clearTokens();
        this.redirectToLogin();
      }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
      const hasToken = !!this.token || !!localStorage.getItem('auth_token');
      const notExpired = !this.isTokenExpired();
      return hasToken && notExpired;
    }

    /**
     * Get current authentication token
     */
    getToken() {
      return this.token || localStorage.getItem('auth_token');
    }

    /**
     * Get auth header for API requests
     */
    getAuthHeader() {
      const token = this.getToken();
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Make authenticated API request with automatic retry and refresh
     */
    async fetchApi(url, options = {}) {
      // Ensure token is fresh
      if (this.isTokenExpired()) {
        try {
          await this.refreshSession();
        } catch (e) {
          throw new Error('Session expired and refresh failed');
        }
      }

      // Add auth header
      const headers = {
        ...this.getAuthHeader(),
        ...options.headers
      };

      const response = await this.fetchWithRetry(url, { ...options, headers });
      
      // If 401, try refreshing and retry
      if (response.status === 401) {
        try {
          await this.refreshSession();
          const retryHeaders = {
            ...this.getAuthHeader(),
            ...options.headers
          };
          return this.fetchWithRetry(url, { ...options, headers: retryHeaders });
        } catch (e) {
          console.error('[AuthClient] Failed to refresh on 401');
          throw e;
        }
      }

      return response;
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
      console.log('[AuthClient] Redirecting to login...');
      window.location.href = '/login';
    }
  }

  // ============================================================================
  // CRITICAL FIX #1: Expose to window
  // ============================================================================
  // This is the key fix that allows frontend code to call:
  //   window.AuthClient.login(...)
  //   window.AuthClient.register(...)
  //   window.AuthClient.logout(...)
  
  window.AuthClient = new ResilientAuthClient();
  console.log('[AuthClient] ✅ Exposed to window.AuthClient');
  console.log('[AuthClient] Available methods:');
  console.log('  - window.AuthClient.login({email, password})');
  console.log('  - window.AuthClient.register({email, password, ...})');
  console.log('  - window.AuthClient.logout()');
  console.log('  - window.AuthClient.isAuthenticated()');
  console.log('  - window.AuthClient.getToken()');
  console.log('  - window.AuthClient.fetchApi(url, options)');

})();
