/**
 * Guest ID Manager
 * Handles generation, storage, and migration of guest IDs
 * 
 * Format: guest_{timestamp}_{random}
 * Example: guest_1234567890_ab3c9d
 */

class GuestIDManager {
  constructor() {
    this.STORAGE_KEY = 'guest_id_manager';
    this.SESSION_STORAGE_KEY = 'guest_id_session'; // Fallback
  }

  /**
   * Get or create guest ID
   * @returns {string} Guest ID (guest_TIMESTAMP_RANDOM)
   */
  getOrCreateID() {
    try {
      let id = localStorage.getItem(this.STORAGE_KEY);
      
      if (!id || !this._isValidGuestID(id)) {
        id = this._generateID();
        localStorage.setItem(this.STORAGE_KEY, id);
        console.log('[GuestID] Created new guest ID:', id);
      }
      
      return id;
    } catch (err) {
      console.warn('[GuestID] localStorage failed, using session:', err.message);
      return this._getSessionID();
    }
  }

  /**
   * Get current guest ID without creating
   * @returns {string|null}
   */
  getID() {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch (err) {
      return sessionStorage.getItem(this.SESSION_STORAGE_KEY);
    }
  }

  /**
   * Validate guest ID format
   * @private
   */
  _isValidGuestID(id) {
    return /^guest_\d+_[a-z0-9]+$/.test(id);
  }

  /**
   * Generate new guest ID
   * @private
   */
  _generateID() {
    const timestamp = Math.floor(Date.now() / 1000); // seconds
    const random = Math.random().toString(36).substring(2, 8); // 6 random chars
    return `guest_${timestamp}_${random}`;
  }

  /**
   * Session-based fallback ID
   * @private
   */
  _getSessionID() {
    let id = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
    if (!id) {
      id = this._generateID();
      sessionStorage.setItem(this.SESSION_STORAGE_KEY, id);
    }
    return id;
  }

  /**
   * Migrate guest content to registered user
   * When user signs up, call this to reassign all guest content to their new user ID
   * 
   * @param {string} newUserId - The registered user ID
   * @param {string} authToken - JWT token for API calls
   */
  async migrateToRegistered(newUserId, authToken) {
    try {
      const guestId = this.getID();
      if (!guestId) {
        console.log('[GuestID] No guest ID to migrate');
        return { success: false, error: 'No guest session found' };
      }

      // Call backend migration endpoint
      const response = await fetch('/api/auth/migrate-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          guestId,
          userId: newUserId
        })
      });

      const result = await response.json();

      if (result.success) {
        // Clear guest ID after successful migration
        this._clearGuestID();
        console.log('[GuestID] Migration successful:', result);
        return result;
      } else {
        console.error('[GuestID] Migration failed:', result.error);
        return result;
      }
    } catch (err) {
      console.error('[GuestID] Migration error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Clear guest ID (after migration or logout)
   * @private
   */
  _clearGuestID() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (err) {
      console.warn('[GuestID] Failed to clear localStorage');
    }
    try {
      sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    } catch (err) {}
  }

  /**
   * Check if current user is guest
   * @returns {boolean}
   */
  isGuest() {
    const sessionId = localStorage.getItem('sessionId');
    return !sessionId && !!this.getID();
  }

  /**
   * Get guest ID as header for API calls
   * @returns {Object} Header object or empty
   */
  getAuthHeader() {
    const guestId = this.getID();
    if (guestId) {
      return { 'x-guest-id': guestId };
    }
    return {};
  }

  /**
   * Check if guest reached daily upload limit (5 posts/day)
   * @returns {boolean}
   */
  checkUploadLimit() {
    try {
      const key = `guest_uploads_${this.getID()}`;
      const uploads = JSON.parse(localStorage.getItem(key) || '[]');
      const today = new Date().toDateString();
      
      // Filter to today's uploads
      const todayUploads = uploads.filter(date => date === today);
      
      if (todayUploads.length >= 5) {
        console.warn('[GuestID] Daily upload limit reached (5/day)');
        return false;
      }
      
      // Record this upload
      uploads.push(today);
      localStorage.setItem(key, JSON.stringify(uploads));
      return true;
    } catch (err) {
      console.warn('[GuestID] Failed to check upload limit:', err.message);
      return true; // Allow on error
    }
  }

  /**
   * Get remaining uploads today
   * @returns {number}
   */
  getRemainingUploads() {
    try {
      const key = `guest_uploads_${this.getID()}`;
      const uploads = JSON.parse(localStorage.getItem(key) || '[]');
      const today = new Date().toDateString();
      const todayUploads = uploads.filter(date => date === today).length;
      return Math.max(0, 5 - todayUploads);
    } catch (err) {
      return 5; // Default on error
    }
  }

  /**
   * Clear old upload records (keep only last 3 days)
   */
  cleanupOldRecords() {
    try {
      const guestId = this.getID();
      if (!guestId) return;

      const key = `guest_uploads_${guestId}`;
      const uploads = JSON.parse(localStorage.getItem(key) || '[]');
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const validUploads = uploads.filter(date => {
        const uploadDate = new Date(date);
        return uploadDate > threeDaysAgo;
      });

      localStorage.setItem(key, JSON.stringify(validUploads));
    } catch (err) {
      console.warn('[GuestID] Cleanup error:', err.message);
    }
  }
}

// Export singleton instance
export default new GuestIDManager();

// Also make available as window.GuestIDManager for non-module usage
if (typeof window !== 'undefined') {
  window.GuestIDManager = new GuestIDManager();
}
