/**
 * Safe Storage Utility for CodeBank
 * Provides secure localStorage operations with fallback to in-memory storage
 * Prevents SecurityError in restricted environments (file://, iframe, etc.)
 */

// Safe Storage Manager
const safeStorage = {
  // Fallback storage object for when localStorage is unavailable
  _fallback: {},
  _forceLocalKeys: new Set(['codebank_assets']),
  
  // Environment detection
  _isLocalStorageAvailable: null,
  
  // Initialize environment detection
  _checkEnvironment() {
    if (this._isLocalStorageAvailable !== null) {
      return this._isLocalStorageAvailable;
    }
    
    try {
      // Test localStorage availability
      const testKey = '__codebank_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this._isLocalStorageAvailable = true;
      // console.log('✅ localStorage is available and working');
      return true;
    } catch (error) {
      this._isLocalStorageAvailable = false;
      // console.warn('⚠️ localStorage is not available, using fallback storage:', error.message);
      return false;
    }
  },
  
  /**
   * Set an item in storage (localStorage or fallback)
   * @param {string} key - The storage key
   * @param {string} value - The value to store
   * @returns {boolean} - Success status
   */
  set: (key, value) => {
    try {
      if (safeStorage._checkEnvironment()) {
        localStorage.setItem(key, value);
        return true;
      } else {
        try {
          if (safeStorage._forceLocalKeys && safeStorage._forceLocalKeys.has(key)) {
            localStorage.setItem(key, value);
            return true;
          }
        } catch(_){ }
        safeStorage._fallback[key] = value;
        return false;
      }
    } catch (error) {
      console.warn(`⚠️ Storage write failed for key "${key}":`, error);
      // Try fallback even if environment check passed
      try {
        safeStorage._fallback[key] = value;
        return false;
      } catch (fallbackError) {
        console.error(`❌ Failed to store "${key}" in both localStorage and fallback:`, fallbackError);
        return false;
      }
    }
  },
  
  /**
   * Get an item from storage (localStorage or fallback)
   * @param {string} key - The storage key
   * @returns {string|null} - The stored value or null
   */
  get: (key) => {
    try {
      if (safeStorage._checkEnvironment()) {
        return localStorage.getItem(key);
      } else {
        try {
          if (safeStorage._forceLocalKeys && safeStorage._forceLocalKeys.has(key)) {
            return localStorage.getItem(key);
          }
        } catch(_){ }
        return safeStorage._fallback[key] || null;
      }
    } catch (error) {
      console.warn(`⚠️ Storage read failed for key "${key}":`, error);
      // Try fallback even if environment check passed
      try {
        return safeStorage._fallback[key] || null;
      } catch (fallbackError) {
        console.error(`❌ Failed to read "${key}" from both localStorage and fallback:`, fallbackError);
        return null;
      }
    }
  },
  // Compatibility aliases for legacy code expecting localStorage-style API
  getItem: (key) => {
    try { return safeStorage.get(key) } catch(_) { return null }
  },
  
  /**
   * Remove an item from storage (localStorage or fallback)
   * @param {string} key - The storage key
   */
  remove: (key) => {
    try {
      if (safeStorage._checkEnvironment()) {
        localStorage.removeItem(key);
      } else {
        try {
          if (safeStorage._forceLocalKeys && safeStorage._forceLocalKeys.has(key)) {
            localStorage.removeItem(key);
            return;
          }
        } catch(_){ }
        delete safeStorage._fallback[key];
      }
    } catch (error) {
      console.warn(`⚠️ Storage remove failed for key "${key}":`, error);
      // Try fallback even if environment check passed
      try {
        delete safeStorage._fallback[key];
      } catch (fallbackError) {
        console.error(`❌ Failed to remove "${key}" from both localStorage and fallback:`, fallbackError);
      }
    }
  },
  // Compatibility alias
  removeItem: (key) => {
    try { return safeStorage.remove(key) } catch(_) {}
  },
  
  /**
   * Clear all storage (localStorage or fallback)
   */
  clear: () => {
    try {
      if (safeStorage._checkEnvironment()) {
        localStorage.clear();
      } else {
        // Use fallback storage
        safeStorage._fallback = {};
      }
    } catch (error) {
      console.warn('⚠️ Storage clear failed:', error);
      // Try fallback even if environment check passed
      try {
        safeStorage._fallback = {};
      } catch (fallbackError) {
        console.error('❌ Failed to clear both localStorage and fallback:', fallbackError);
      }
    }
  },
  // Compatibility alias
  setItem: (key, value) => {
    try { return safeStorage.set(key, value) } catch(_) { return false }
  },
  
  /**
   * Get storage statistics
   * @returns {Object} - Storage information
   */
  getStats: () => {
    const isAvailable = safeStorage._checkEnvironment();
    const fallbackSize = Object.keys(safeStorage._fallback).length;
    
    if (isAvailable) {
      try {
        const localStorageSize = Object.keys(localStorage).length;
        return {
          type: 'localStorage',
          available: true,
          keys: localStorageSize,
          fallbackKeys: fallbackSize
        };
      } catch (error) {
        return {
          type: 'localStorage',
          available: false,
          keys: 0,
          fallbackKeys: fallbackSize
        };
      }
    } else {
      return {
        type: 'fallback',
        available: false,
        keys: 0,
        fallbackKeys: fallbackSize
      };
    }
  },
  
  /**
   * Get all keys from storage
   * @returns {Array} - Array of storage keys
   */
  getKeys: () => {
    try {
      if (safeStorage._checkEnvironment()) {
        return Object.keys(localStorage);
      } else {
        return Object.keys(safeStorage._fallback);
      }
    } catch (error) {
      console.warn('⚠️ Failed to get storage keys:', error);
      return Object.keys(safeStorage._fallback);
    }
  },
  
  /**
   * Check if a key exists in storage
   * @param {string} key - The storage key
   * @returns {boolean} - Key existence status
   */
  has: (key) => {
    try {
      if (safeStorage._checkEnvironment()) {
        return localStorage.getItem(key) !== null;
      } else {
        try {
          if (safeStorage._forceLocalKeys && safeStorage._forceLocalKeys.has(key)) {
            return localStorage.getItem(key) !== null;
          }
        } catch(_){ }
        return key in safeStorage._fallback;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to check key "${key}":`, error);
      return key in safeStorage._fallback;
    }
  }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/CommonJS
  module.exports = safeStorage;
} else if (typeof define === 'function' && define.amd) {
  // AMD
  define([], () => safeStorage);
} else {
  // Browser global
  window.safeStorage = safeStorage;
}

// Initialize environment check on load
safeStorage._checkEnvironment();

// Log storage status for debugging
// console.log('📦 Safe Storage initialized:', safeStorage.getStats());
