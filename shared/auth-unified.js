/**
 * Unified Auth - Single Authentication System
 * All services read auth state from AppState directly
 */

(function() {
    'use strict';

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    window.isAuthenticated = function() {
        if (window.AppState?.isAuthenticated) {
            return true;
        }
        
        // Legacy support
        if (window.Auth?.isAuthenticated) {
            return window.Auth.isAuthenticated();
        }
        if (window.AuthCore?.isAuthenticated) {
            return window.AuthCore.isAuthenticated();
        }
        
        return false;
    };

    /**
     * Get current user
     * @returns {object|null}
     */
    window.getCurrentUser = function() {
        if (window.AppState?.user) {
            return window.AppState.user;
        }
        
        // Legacy support
        if (window.APP_AUTH?.user) {
            return window.APP_AUTH.user;
        }
        
        return null;
    };

    /**
     * Require authentication - guard function
     * @param {function} callback - Called if authenticated
     * @param {function} [onFail] - Called if not authenticated
     */
    window.requireAuth = function(callback, onFail) {
        if (window.isAuthenticated()) {
            callback(window.getCurrentUser());
        } else if (onFail) {
            onFail();
        } else {
            // Default: redirect to login
            window.location.href = '/login.html';
        }
    };

    /**
     * Require auth with promise
     * @returns {Promise<object>} Resolves with user, rejects if not authenticated
     */
    window.requireAuthPromise = function() {
        return new Promise((resolve, reject) => {
            if (window.isAuthenticated()) {
                resolve(window.getCurrentUser());
            } else {
                reject(new Error('Not authenticated'));
            }
        });
    };

    /**
     * Login handler - update AppState
     * @param {object} user - User object
     */
    window.handleLogin = function(user) {
        if (window.AppState?.setUser) {
            window.AppState.setUser(user);
        }
        
        if (window.dispatch) {
            window.dispatch('auth:login', user);
        }
    };

    /**
     * Logout handler - clear AppState
     */
    window.handleLogout = function() {
        if (window.AppState?.setUser) {
            window.AppState.setUser(null);
        }
        
        if (window.dispatch) {
            window.dispatch('auth:logout', {});
        }
        
        // Clear legacy auth if exists
        if (window.APP_AUTH) {
            window.APP_AUTH.user = null;
        }
    };

    /**
     * Get auth token
     * @returns {string|null}
     */
    window.getAuthToken = function() {
        const user = window.getCurrentUser();
        return user?.token || user?.sessionToken || null;
    };

    /**
     * Add auth change listener
     * @param {function} callback - Called with { user, isAuthenticated }
     * @returns {function} Unsubscribe function
     */
    window.onAuthChanged = function(callback) {
        if (window.AppState?.on) {
            return window.AppState.on('auth:changed', callback);
        }
        
        // Legacy support
        if (window.addEventListener) {
            window.addEventListener('auth:ready', callback);
        }
        
        return function() {};
    };

    // Quick aliases
    window.getUser = window.getCurrentUser;
    window.checkAuth = window.isAuthenticated;

    console.log('[AuthUnified] Initialized');
})();