/**
 * Storage Manager for Samma3ny Player
 * Provides persistent storage using IndexedDB + localStorage fallback
 * Handles: likes, flags, downloads, shares, counter state
 */

class StorageManager {
  constructor(userId = 'default-user') {
    this.userId = userId;
    this.dbName = 'Samma3nyDB';
    this.dbVersion = 1;
    this.storeName = 'userActions';
    this.appStateName = 'appState';
    this.useIndexedDB = true;
    this.db = null;
    
    // Try to initialize IndexedDB
    this.initIndexedDB().catch(() => {
      console.log('IndexedDB unavailable, falling back to localStorage');
      this.useIndexedDB = false;
    });
  }

  /**
   * Initialize IndexedDB
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.appStateName)) {
          db.createObjectStore(this.appStateName, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save a user action (like, flag, download, share)
   */
  async saveUserAction(actionType, trackId, metadata = {}) {
    const action = {
      id: `${this.userId}-${actionType}-${trackId}`,
      userId: this.userId,
      actionType,
      trackId,
      metadata,
      timestamp: new Date().toISOString()
    };

    if (this.useIndexedDB && this.db) {
      return this._saveToIndexedDB(action);
    } else {
      return this._saveToLocalStorage(action);
    }
  }

  /**
   * Save to IndexedDB
   */
  _saveToIndexedDB(action) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(action);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new Error('Failed to save to IndexedDB'));
    });
  }

  /**
   * Save to localStorage (fallback)
   */
  _saveToLocalStorage(action) {
    try {
      const key = `samma3ny-${action.id}`;
      localStorage.setItem(key, JSON.stringify(action));
      return Promise.resolve(true);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return Promise.resolve(false);
    }
  }

  /**
   * Get all actions of a specific type for this user
   */
  async getUserActions(actionType = null) {
    if (this.useIndexedDB && this.db) {
      return this._getFromIndexedDB(actionType);
    } else {
      return this._getFromLocalStorage(actionType);
    }
  }

  /**
   * Get from IndexedDB
   */
  _getFromIndexedDB(actionType) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let actions = request.result.filter(a => a.userId === this.userId);
        if (actionType) {
          actions = actions.filter(a => a.actionType === actionType);
        }
        resolve(actions);
      };
      request.onerror = () => reject(new Error('Failed to read from IndexedDB'));
    });
  }

  /**
   * Get from localStorage (fallback)
   */
  _getFromLocalStorage(actionType) {
    try {
      const actions = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('samma3ny-')) {
          const action = JSON.parse(localStorage.getItem(key));
          if (action.userId === this.userId && (!actionType || action.actionType === actionType)) {
            actions.push(action);
          }
        }
      }
      return Promise.resolve(actions);
    } catch (e) {
      console.error('Failed to get from localStorage:', e);
      return Promise.resolve([]);
    }
  }

  /**
   * Save app state (counter, codes, tier, etc.)
   */
  async saveAppState(stateKey, stateData) {
    const state = {
      key: `${this.userId}-${stateKey}`,
      userId: this.userId,
      stateKey,
      data: stateData,
      timestamp: new Date().toISOString()
    };

    if (this.useIndexedDB && this.db) {
      return this._saveStateToIndexedDB(state);
    } else {
      return this._saveStateToLocalStorage(state);
    }
  }

  /**
   * Save state to IndexedDB
   */
  _saveStateToIndexedDB(state) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.appStateName], 'readwrite');
      const store = transaction.objectStore(this.appStateName);
      const request = store.put(state);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new Error('Failed to save state to IndexedDB'));
    });
  }

  /**
   * Save state to localStorage (fallback)
   */
  _saveStateToLocalStorage(state) {
    try {
      localStorage.setItem(`samma3ny-state-${state.key}`, JSON.stringify(state));
      return Promise.resolve(true);
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
      return Promise.resolve(false);
    }
  }

  /**
   * Get app state
   */
  async getAppState(stateKey = null) {
    if (this.useIndexedDB && this.db) {
      return this._getStateFromIndexedDB(stateKey);
    } else {
      return this._getStateFromLocalStorage(stateKey);
    }
  }

  /**
   * Get state from IndexedDB
   */
  _getStateFromIndexedDB(stateKey) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.appStateName], 'readonly');
      const store = transaction.objectStore(this.appStateName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let states = request.result.filter(s => s.userId === this.userId);
        if (stateKey) {
          states = states.filter(s => s.stateKey === stateKey);
          resolve(states.length > 0 ? states[0].data : null);
        } else {
          const result = {};
          states.forEach(s => {
            result[s.stateKey] = s.data;
          });
          resolve(result);
        }
      };
      request.onerror = () => reject(new Error('Failed to read state from IndexedDB'));
    });
  }

  /**
   * Get state from localStorage (fallback)
   */
  _getStateFromLocalStorage(stateKey) {
    try {
      if (stateKey) {
        const key = `samma3ny-state-${this.userId}-${stateKey}`;
        const data = localStorage.getItem(key);
        return Promise.resolve(data ? JSON.parse(data).data : null);
      } else {
        const result = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith(`samma3ny-state-${this.userId}-`)) {
            const state = JSON.parse(localStorage.getItem(key));
            result[state.stateKey] = state.data;
          }
        }
        return Promise.resolve(result);
      }
    } catch (e) {
      console.error('Failed to get state from localStorage:', e);
      return Promise.resolve(stateKey ? null : {});
    }
  }

  /**
   * Check if a track is liked
   */
  async isLiked(trackId) {
    const actions = await this.getUserActions('like');
    return actions.some(a => a.trackId === trackId);
  }

  /**
   * Check if a track is flagged/skipped
   */
  async isFlagged(trackId) {
    const actions = await this.getUserActions('flag');
    return actions.some(a => a.trackId === trackId);
  }

  /**
   * Get all liked track IDs
   */
  async getLikedTracks() {
    const actions = await this.getUserActions('like');
    return actions.map(a => a.trackId);
  }

  /**
   * Get all flagged track IDs
   */
  async getFlaggedTracks() {
    const actions = await this.getUserActions('flag');
    return actions.map(a => a.trackId);
  }

  /**
   * Remove an action (undo like, unflag, etc.)
   */
  async removeAction(actionType, trackId) {
    const actionId = `${this.userId}-${actionType}-${trackId}`;
    
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(actionId);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(new Error('Failed to delete from IndexedDB'));
      });
    } else {
      try {
        localStorage.removeItem(`samma3ny-${actionId}`);
        return Promise.resolve(true);
      } catch (e) {
        console.error('Failed to remove from localStorage:', e);
        return Promise.resolve(false);
      }
    }
  }

  /**
   * Clear all data for this user
   */
  async clearUserData() {
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName, this.appStateName], 'readwrite');
        
        const store1 = transaction.objectStore(this.storeName);
        const store2 = transaction.objectStore(this.appStateName);
        
        store1.clear();
        store2.clear();
        
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(new Error('Failed to clear IndexedDB'));
      });
    } else {
      try {
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith(`samma3ny-${this.userId}`)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
        return Promise.resolve(true);
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
        return Promise.resolve(false);
      }
    }
  }
}

// Export for use in Node.js/CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
