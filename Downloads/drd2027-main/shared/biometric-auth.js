/**
 * biometric-auth.js - Native Biometric Authentication Bridge for CodeBank
 * 
 * Provides fingerprint / Face ID login using the Capacitor NativeBiometric plugin.
 * Falls back gracefully when running in a regular browser (non-Capacitor).
 * 
 * Usage:
 *   import { BiometricAuth } from './biometric-auth.js';
 *   
 *   // Check availability
 *   const available = await BiometricAuth.isAvailable();
 *   
 *   // Store credentials after successful login
 *   await BiometricAuth.saveCredentials(userId, email, token);
 *   
 *   // Authenticate with fingerprint and retrieve saved credentials
 *   const creds = await BiometricAuth.authenticate();
 *   // creds = { userId, email, token }
 *   
 *   // Remove credentials on logout
 *   await BiometricAuth.clearCredentials();
 */

const SERVER_ID = 'com.codebank.app';

// BiometricAuth singleton
export const BiometricAuth = {

  _plugin: null,
  _available: null,

  /**
   * Get the NativeBiometric plugin (Capacitor bridge)
   */
  _getPlugin() {
    if (this._plugin) return this._plugin;
    try {
      // Capacitor 6.x style
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeBiometric) {
        this._plugin = window.Capacitor.Plugins.NativeBiometric;
        return this._plugin;
      }
      // Legacy / direct import fallback
      if (typeof NativeBiometric !== 'undefined') {
        this._plugin = NativeBiometric;
        return this._plugin;
      }
    } catch (e) {
      console.warn('[BiometricAuth] Plugin not available:', e.message);
    }
    return null;
  },

  /**
   * Check if biometric authentication is available on this device
   * @returns {Promise<{available: boolean, biometryType: string}>}
   */
  async isAvailable() {
    if (this._available !== null) return this._available;

    const plugin = this._getPlugin();
    if (!plugin) {
      this._available = { available: false, biometryType: 'NONE', reason: 'Not running in Capacitor' };
      return this._available;
    }

    try {
      const result = await plugin.isAvailable();
      this._available = {
        available: result.isAvailable !== false,
        biometryType: result.biometryType || 'UNKNOWN',
        // 1=FINGERPRINT, 2=FACE_ID, 3=IRIS
        errorCode: result.errorCode || null
      };
      console.log('[BiometricAuth] Available:', JSON.stringify(this._available));
    } catch (err) {
      console.warn('[BiometricAuth] Availability check failed:', err);
      this._available = { available: false, biometryType: 'NONE', reason: err.message };
    }

    return this._available;
  },

  /**
   * Prompt the user to authenticate with biometrics (fingerprint / face)
   * If successful, returns saved credentials.
   * @returns {Promise<{userId: string, email: string, token: string}|null>}
   */
  async authenticate() {
    const plugin = this._getPlugin();
    if (!plugin) {
      console.warn('[BiometricAuth] Cannot authenticate - plugin not available');
      return null;
    }

    try {
      // Step 1: Verify biometric (shows OS fingerprint/face dialog)
      await plugin.verifyIdentity({
        reason: 'Sign in to CodeBank',
        title: 'CodeBank Login',
        subtitle: 'Use your fingerprint to sign in',
        description: 'Touch the fingerprint sensor',
        negativeButtonText: 'Use Password',
        maxAttempts: 3,
        useFallback: true // Allow device PIN/pattern as fallback
      });

      // Step 2: Retrieve stored credentials
      const credentials = await plugin.getCredentials({ server: SERVER_ID });
      
      if (credentials && credentials.username) {
        let parsed = {};
        try {
          parsed = JSON.parse(credentials.password || '{}');
        } catch (_) {
          parsed = { token: credentials.password };
        }

        console.log('[BiometricAuth] Authentication successful for:', credentials.username);
        return {
          userId: parsed.userId || null,
          email: credentials.username,
          token: parsed.token || null,
          sessionId: parsed.sessionId || null
        };
      }

      console.warn('[BiometricAuth] No stored credentials found');
      return null;

    } catch (err) {
      // User cancelled or biometric failed
      console.warn('[BiometricAuth] Authentication failed:', err.message || err);
      
      if (err.code === 'AUTH_CANCELLED' || err.message?.includes('cancel')) {
        return { cancelled: true };
      }
      return null;
    }
  },

  /**
   * Save credentials for biometric login (call after successful password login)
   * @param {string} userId
   * @param {string} email  
   * @param {string} token - auth token / session
   * @param {string} sessionId
   */
  async saveCredentials(userId, email, token, sessionId) {
    const plugin = this._getPlugin();
    if (!plugin) return false;

    try {
      await plugin.setCredentials({
        server: SERVER_ID,
        username: email,
        password: JSON.stringify({ userId, token, sessionId })
      });
      console.log('[BiometricAuth] Credentials saved for:', email);
      
      // Also persist the biometric-enabled flag in localStorage
      try {
        localStorage.setItem('codebank_biometric_enabled', 'true');
        localStorage.setItem('codebank_biometric_email', email);
      } catch (_) {}
      
      return true;
    } catch (err) {
      console.error('[BiometricAuth] Failed to save credentials:', err);
      return false;
    }
  },

  /**
   * Clear saved biometric credentials (call on logout)
   */
  async clearCredentials() {
    const plugin = this._getPlugin();
    if (!plugin) return;

    try {
      await plugin.deleteCredentials({ server: SERVER_ID });
      console.log('[BiometricAuth] Credentials cleared');
    } catch (err) {
      // May fail if no credentials existed - that's fine
      console.warn('[BiometricAuth] Clear credentials:', err.message);
    }

    try {
      localStorage.removeItem('codebank_biometric_enabled');
      localStorage.removeItem('codebank_biometric_email');
    } catch (_) {}
  },

  /**
   * Check if biometric login was previously enabled for this device
   */
  isBiometricEnabled() {
    try {
      return localStorage.getItem('codebank_biometric_enabled') === 'true';
    } catch (_) {
      return false;
    }
  },

  /**
   * Get the email that was saved for biometric login
   */
  getSavedEmail() {
    try {
      return localStorage.getItem('codebank_biometric_email') || null;
    } catch (_) {
      return null;
    }
  },

  /**
   * Full biometric login flow: check availability → authenticate → return creds
   * Suitable for calling from the login page's "Sign in with Fingerprint" button
   */
  async quickLogin() {
    const avail = await this.isAvailable();
    if (!avail.available) {
      return { success: false, error: 'Biometric not available', reason: avail.reason };
    }

    const creds = await this.authenticate();
    if (!creds) {
      return { success: false, error: 'Authentication failed' };
    }
    if (creds.cancelled) {
      return { success: false, error: 'cancelled' };
    }

    return { success: true, ...creds };
  }
};

// Make globally available for inline scripts
window.BiometricAuth = BiometricAuth;

// Auto-detect and log on load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    const avail = await BiometricAuth.isAvailable();
    if (avail.available) {
      console.log('[BiometricAuth] Ready — biometryType:', avail.biometryType);
      window.dispatchEvent(new CustomEvent('biometric:ready', { detail: avail }));
    }
  });
}
