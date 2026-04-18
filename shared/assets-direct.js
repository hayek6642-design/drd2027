/**
 * AssetsDirect - Production-Ready Asset Manager
 * NO INFINITE LOOPS. NO CACHE SPAM. REAL SERVER SYNC.
 */

// Define AssetsDirectBus if not already defined
if (typeof window.AssetsDirectBus === 'undefined') {
    window.AssetsDirectBus = {
        loadFromCache: function() {
            try {
                const cached = localStorage.getItem('acc_assets') || localStorage.getItem('codebank_assets');
                if (cached) {
                    const assets = JSON.parse(cached);
                    window.AppState = window.AppState || {};
                    window.AppState.assets = assets;
                    console.log('[AssetsDirectBus] Loaded from cache:', assets);
                    return assets;
                }
            } catch(e) {
                console.warn('[AssetsDirectBus] Cache load error:', e);
            }
            return null;
        },
        saveToCache: function(assets) {
            try {
                localStorage.setItem('acc_assets', JSON.stringify(assets));
                console.log('[AssetsDirectBus] Saved to cache');
            } catch(e) {
                console.warn('[AssetsDirectBus] Cache save error:', e);
            }
        },
        publish: function(event, data) {
            console.log('[AssetsDirectBus] Publish:', event, data);
            window.dispatchEvent(new CustomEvent('assets:updated', { detail: data }));
        }
    };
}

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
      
      // Force UI update with current cache counts
      this.updateUICounts();
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
    
    // Minimum sync interval to prevent rapid syncs (5 seconds)
    MIN_SYNC_INTERVAL = 5000;
    
    debouncedServerSync() {
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => { this.syncToServer(); }, 5000);
    }
    
    async syncToServer() {
      // Throttle: prevent sync if too soon
      const now = Date.now();
      if (this.lastSyncTime && (now - this.lastSyncTime) < this.MIN_SYNC_INTERVAL) {
        log('Sync throttled - too soon since last sync');
        return;
      }
      
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
    
    // Direct UI update that doesn't depend on event bus
    updateUICounts() {
        const counts = this.getCounts();
        const codes = this.assets.codes || [];
        
        // Update all code count elements
        document.querySelectorAll('.code-count, #code-count, [data-code-count]').forEach(el => {
            el.textContent = counts.codes;
        });
        
        // Update code list display if container exists
        const listContainer = document.getElementById('code-list') || document.getElementById('generated-codes');
        if (listContainer && codes.length > 0) {
            listContainer.innerHTML = codes.map(code => 
                `<div class="code-item">${code}</div>`
            ).join('');
        }
        
        // Dispatch event for any listeners
        window.dispatchEvent(new CustomEvent('assets:updated', { 
            detail: { type: 'codes', count: counts.codes, list: codes } 
        }));
        
        console.log('[AssetsDirect] UI updated with', counts.codes, 'codes');
    }
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