/**
 * AssetsDirect - Production-Ready Asset Manager
 * NO INFINITE LOOPS. NO CACHE SPAM. REAL SERVER SYNC.
 */
(function() {
  'use strict';
  
  const DEBUG = true;
  const log = (...args) => DEBUG && console.log('[AssetsDirect]', ...args);
  
  class AssetsManager {
    constructor() {
      this.userId = null;
      this.authToken = null;
      this.assets = { codes: [], silver: [], gold: [] };
      this.isInitialized = false;
      this.syncInProgress = false;
      this.lastSyncTime = 0;
      this.pendingSync = false;
      this.init();
    }
    
    async init() {
      if (this.isInitialized) {
        log('Already initialized, skipping');
        return;
      }
      
      log('Initializing...');
      await this.waitForAuth();
      await this.loadFromServer();
      this.setupEventListeners();
      this.broadcastToIframes();
      this.isInitialized = true;
      log('Initialized with:', this.getCounts());
    }
    
    waitForAuth() {
      return new Promise((resolve) => {
        if (window.AuthGlobal?.authenticated && window.AuthGlobal?.userId) {
          this.userId = window.AuthGlobal.userId;
          this.authToken = window.AuthGlobal.token;
          log('Auth found immediately');
          resolve();
          return;
        }
        
        const checkAuth = () => {
          if (window.AuthGlobal?.authenticated) {
            this.userId = window.AuthGlobal.userId;
            this.authToken = window.AuthGlobal.token;
            resolve();
          } else {
            setTimeout(checkAuth, 100);
          }
        };
        
        checkAuth();
        
        setTimeout(() => {
          if (!this.userId) {
            log('ERROR: Auth timeout');
            resolve();
          }
        }, 10000);
      });
    }
    
    async loadFromServer() {
      if (!this.userId) {
        log('No userId, cannot load from server');
        return;
      }
      
      log('Loading from server for user:', this.userId);
      
      try {
        const response = await fetch(`/api/assets/all?userId=${this.userId}`, {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        
        const data = await response.json();
        log('Server returned:', data);
        
        this.assets.codes = data.codes || [];
        this.assets.silver = data.silver || [];
        this.assets.gold = data.gold || [];
        
        this.saveToCache();
        this.notifyUpdate();
        
      } catch (err) {
        log('Server load failed:', err);
        this.loadFromCache();
      }
    }
    
    loadFromCache() {
      log('Loading from cache (fallback)...');
      try {
        const cached = localStorage.getItem(`assets_${this.userId}`);
        if (cached) {
          const data = JSON.parse(cached);
          this.assets.codes = data.codes || [];
          this.assets.silver = data.silver || [];
          this.assets.gold = data.gold || [];
          this.lastSyncTime = data.timestamp || 0;
          log('Cache loaded:', this.getCounts());
          this.notifyUpdate();
        }
      } catch (e) { log('Cache load error:', e); }
    }
    
    saveToCache() {
      try {
        const data = { ...this.assets, timestamp: Date.now(), userId: this.userId };
        localStorage.setItem(`assets_${this.userId}`, JSON.stringify(data));
        log('Saved to cache');
      } catch (e) { log('Cache save error:', e); }
    }
    
    setupEventListeners() {
      window.addEventListener('bankode:code-generated', (e) => {
        log('New code generated:', e.detail);
        this.addCode(e.detail);
      });
      
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'assets:request') {
          log('Iframe requested assets');
          this.sendToIframe(e.source);
        }
      });
      
      // Periodic sync every 30 seconds
      setInterval(() => { this.syncIfNeeded(); }, 30000);
    }
    
    addCode(codeData) {
      this.assets.codes.unshift(codeData);
      this.saveToCache();
      this.notifyUpdate();
      this.broadcastToIframes();
      this.debouncedServerSync();
    }
    
    debouncedServerSync() {
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => { this.syncToServer(); }, 5000);
    }
    
    async syncToServer() {
      if (this.syncInProgress) {
        this.pendingSync = true;
        return;
      }
      
      this.syncInProgress = true;
      log('Syncing to server...');
      
      try {
        const response = await fetch('/api/assets/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: this.userId, assets: this.assets, timestamp: Date.now() })
        });
        
        if (response.ok) {
          this.lastSyncTime = Date.now();
          log('Server sync successful');
        }
      } catch (err) { log('Server sync failed:', err); }
      finally {
        this.syncInProgress = false;
        if (this.pendingSync) {
          this.pendingSync = false;
          setTimeout(() => this.syncToServer(), 1000);
        }
      }
    }
    
    syncIfNeeded() {
      const timeSinceLastSync = Date.now() - this.lastSyncTime;
      if (timeSinceLastSync > 60000) this.syncToServer();
    }
    
    notifyUpdate() {
      window.dispatchEvent(new CustomEvent('assets:updated', {
        detail: { ...this.assets, counts: this.getCounts() }
      }));
    }
    
    broadcastToIframes() {
      const snapshot = this.createSnapshot();
      log('Broadcasting to all iframes:', snapshot);
      
      document.querySelectorAll('iframe').forEach(iframe => {
        this.sendToIframe(iframe.contentWindow);
      });
    }
    
    sendToIframe(targetWindow) {
      if (!targetWindow || targetWindow === window) return;
      
      const snapshot = this.createSnapshot();
      targetWindow.postMessage({
        type: 'assets:snapshot',
        data: snapshot,
        timestamp: Date.now()
      }, '*');
    }
    
    createSnapshot() {
      return {
        codes: this.assets.codes,
        silver: this.assets.silver,
        gold: this.assets.gold,
        counts: this.getCounts(),
        lastSync: this.lastSyncTime,
        source: 'assets-direct'
      };
    }
    
    getCounts() {
      return {
        codes: this.assets.codes.length,
        silver: this.assets.silver.reduce((sum, s) => sum + (s.amount || 0), 0),
        gold: this.assets.gold.reduce((sum, g) => sum + (g.amount || 0), 0)
      };
    }
    
    getAssets() { return { ...this.assets }; }
    getCodes() { return [...this.assets.codes]; }
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.AssetsManager = new AssetsManager();
    });
  } else {
    window.AssetsManager = new AssetsManager();
  }
})();