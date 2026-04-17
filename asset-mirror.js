/**
 * AssetMirror - Client-side asset state manager
 * Manages codes, silver, gold without constant server sync
 * Provides fallback values in guest mode
 */

class AssetMirror {
  constructor() {
    this.assets = {
      codes: parseInt(localStorage.getItem('asset_codes') || '0', 10),
      silver: parseInt(localStorage.getItem('asset_silver') || '0', 10),
      gold: parseInt(localStorage.getItem('asset_gold') || '0', 10)
    };
    
    this.listeners = [];
    this.syncTimer = null;
    this.lastSync = 0;
    
    // Listen for auth changes
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('asset_')) {
        this.refresh();
      }
    });
  }

  /**
   * Sync assets from server (only if authenticated)
   */
  async sync() {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      console.log('[AssetMirror] Guest mode - using localStorage');
      return this.assets;
    }

    const now = Date.now();
    if (now - this.lastSync < 3000) return this.assets; // Debounce

    try {
      const res = await fetch('/api/assets/status', {
        headers: { 'Authorization': `Bearer ${sessionId}` },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        this.update(data);
        this.lastSync = now;
      }
    } catch (e) {
      console.warn('[AssetMirror] Sync failed:', e.message);
    }

    return this.assets;
  }

  /**
   * Update assets and notify listeners
   */
  update(data) {
    if (data.codes !== undefined) {
      this.assets.codes = parseInt(data.codes, 10);
      localStorage.setItem('asset_codes', this.assets.codes);
    }
    if (data.silver !== undefined) {
      this.assets.silver = parseInt(data.silver, 10);
      localStorage.setItem('asset_silver', this.assets.silver);
    }
    if (data.gold !== undefined) {
      this.assets.gold = parseInt(data.gold, 10);
      localStorage.setItem('asset_gold', this.assets.gold);
    }
    this.notify();
  }

  /**
   * Get current assets
   */
  get() {
    return { ...this.assets };
  }

  /**
   * Add amount to asset
   */
  add(type, amount) {
    if (this.assets[type] !== undefined) {
      this.assets[type] += amount;
      localStorage.setItem(`asset_${type}`, this.assets[type]);
      this.notify();
    }
  }

  /**
   * Subtract amount from asset
   */
  subtract(type, amount) {
    if (this.assets[type] !== undefined) {
      this.assets[type] = Math.max(0, this.assets[type] - amount);
      localStorage.setItem(`asset_${type}`, this.assets[type]);
      this.notify();
    }
  }

  /**
   * Refresh from localStorage
   */
  refresh() {
    this.assets.codes = parseInt(localStorage.getItem('asset_codes') || '0', 10);
    this.assets.silver = parseInt(localStorage.getItem('asset_silver') || '0', 10);
    this.assets.gold = parseInt(localStorage.getItem('asset_gold') || '0', 10);
    this.notify();
  }

  /**
   * Subscribe to changes
   */
  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.get());
      } catch (e) {
        console.error('[AssetMirror] Listener error:', e);
      }
    });
  }
}

window.AssetMirror = AssetMirror;
