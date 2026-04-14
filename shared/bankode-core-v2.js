/**
 * Bankode Core V2 - Source of Truth for All Data
 * Handles both Guest and User modes
 * Unified data access with optional server sync
 */

const sessionManager = typeof window !== 'undefined' ? window.sessionManager : null;

class BankodeCore {
  constructor() {
    this.syncEnabled = false;
    this.localCache = new Map();
    this.subscribers = new Map();
    
    // Subscribe to session changes if available
    if (sessionManager && typeof sessionManager.subscribe === 'function') {
      sessionManager.subscribe((session) => {
        this.handleSessionChange(session);
      });
    }
  }

  handleSessionChange(session) {
    if (session?.type === 'user') {
      this.enableSync(true);
      this.syncFromServer();
    } else {
      this.enableSync(false);
    }
  }

  /**
   * Enable/disable server sync
   */
  enableSync(enabled) {
    this.syncEnabled = enabled;
    console.log('[Bankode] Sync:', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Get data (unified interface)
   */
  async get(key) {
    // Try local first
    const local = this.localCache.get(key);
    
    if (this.syncEnabled && sessionManager?.getToken()) {
      // Try server
      try {
        const server = await this.fetchFromServer(key);
        if (server) {
          this.localCache.set(key, server);
          return server;
        }
      } catch (err) {
        console.warn('[Bankode] Server fetch failed, using local');
      }
    }
    
    return local || null;
  }

  /**
   * Set data (unified interface)
   */
  async set(key, value) {
    // Always save locally
    this.localCache.set(key, value);
    
    // Notify subscribers
    this.notify(key, value);
    
    // Sync to server if enabled
    if (this.syncEnabled && sessionManager?.getToken()) {
      try {
        await this.syncToServer(key, value);
      } catch (err) {
        console.warn('[Bankode] Sync failed:', err);
      }
    }
    
    return true;
  }

  /**
   * Fetch from server
   */
  async fetchFromServer(key) {
    const token = sessionManager?.getToken();
    if (!token) return null;
    
    const response = await fetch(`/api/data/${key}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) return null;
    return await response.json();
  }

  /**
   * Sync to server
   */
  async syncToServer(key, value) {
    const token = sessionManager?.getToken();
    if (!token) return;
    
    await fetch(`/api/data/${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(value)
    });
  }

  /**
   * Full sync from server
   */
  async syncFromServer() {
    if (!this.syncEnabled || !sessionManager?.getToken()) return;
    
    try {
      const token = sessionManager.getToken();
      const response = await fetch('/api/data/sync', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update local cache
        Object.entries(data).forEach(([key, value]) => {
          this.localCache.set(key, value);
          this.notify(key, value);
        });
      }
    } catch (err) {
      console.error('[Bankode] Full sync failed:', err);
    }
  }

  /**
   * Subscribe to data changes
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    
    // Return unsubscribe
    return () => this.subscribers.get(key)?.delete(callback);
  }

  /**
   * Notify subscribers
   */
  notify(key, value) {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(cb => {
        try { cb(value); } catch (e) {}
      });
    }
  }

  /**
   * Load user data (called on mode switch)
   */
  async loadUserData(userId) {
    await this.syncFromServer();
  }
}

// Singleton
const bankodeCore = new BankodeCore();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = bankodeCore;
} else if (typeof window !== 'undefined') {
  window.bankodeCore = bankodeCore;
}
