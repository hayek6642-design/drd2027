// storage-adapter.js
// Unified Storage Abstraction for Web (IndexedDB) and Capacitor (SQLite)
// UV: STORAGE-ADAPTER-2026-03-08 - FIXED VERSION - PASSIVE MODE

(function() {
  if (window.__storageAdapterLoaded) return;
  window.__storageAdapterLoaded = true;

  'use strict';

  let isHealing = false;
  let lastCheck = 0;
  window.DEBUG_MODE = false; // Set to true in console to see verbose logs

  // 📦 WEB STORAGE (IndexedDB - The Code Vault)
  const WebStorage = {
    DB_NAME: 'CodeVault',
    STORE_NAME: 'codes_store',
    VERSION: 4, // 🛡️ UPGRADED VERSION TO FIX IDB VERSION ERROR
    _inMemoryVault: [],

    async autoHealState(code) {
      if (isHealing) {
        if (window.DEBUG_MODE) console.warn("[AUTO-HEAL] Skipped (already healing)");
        return false;
      }

      isHealing = true;
      console.warn("[AUTO-HEAL] Rebuilding state ONCE due to integrity issue with:", code);

      try {
        const stored = await this.getCodes(true); // Get all codes, skip recursive integrity check
        
        if (window.__BANKODE__ && typeof window.__BANKODE__.restoreFromStorage === 'function') {
          window.__BANKODE__.restoreFromStorage(stored);
        }
        
        setTimeout(() => {
          isHealing = false;
        }, 3000);
        
        return true;
      } catch (e) {
        console.error('[AUTO-HEAL FAILED]', e);
        isHealing = false;
        return false;
      }
    },

    async init() {
      try {
        return await new Promise((resolve, reject) => {
          const request = indexedDB.open(this.DB_NAME, this.VERSION);
          request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(this.STORE_NAME)) {
              db.createObjectStore(this.STORE_NAME, { keyPath: 'code' });
            }
            if (!db.objectStoreNames.contains('pending_txs')) {
              db.createObjectStore('pending_txs', { keyPath: 'id' });
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        console.warn('[VAULT] IndexedDB failed, using in-memory vault fallback');
        return null;
      }
    },

    async saveCode(entry) {
      const db = await this.init();
      const code = entry.code;
      const userId = window.Auth?._userId || 'guest';
      
      // 🛡️ 1. Validate input
      if (!code || typeof code !== 'string' || code.trim() === '') {
        console.error('[VAULT][ERROR] Invalid code input:', code);
        return false;
      }
      
      // 🛡️ FORMAT VALIDATION
      const formatRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P[0-9]$/; 
      if (!formatRegex.test(code)) { 
        console.error('[VAULT] Code format validation failed:', code); 
        // Still save it (don't block), but warn 
      } 
      
      // 🛡️ 2. Ensure record has a valid ID (Requirement 1)
      const id = entry.id || code; // Use existing ID or fallback to code
      
      // 🛡️ 3. Double Save Protection (Requirement 5)
      const isDuplicate = await this.checkDuplicate(code);
      if (isDuplicate) {
        if (window.DEBUG_MODE) console.log('[VAULT][SKIP] Code already exists, ignoring double save:', code);
        return true; 
      }
      
      const integrityRaw = code + userId;
      const integrityHash = await this._generateHash(integrityRaw);
      
      const record = {
        id: id, // 👈 REQUIRED: Valid ID field
        code: code,
        type: entry.type || 'codes',
        status: 'owned',
        createdAt: entry.createdAt || Date.now(),
        meta: entry.meta || {},
        integrity: integrityHash,
        syncStatus: 'local_only'
      };

      if (!db) {
        this._inMemoryVault.push(record);
        console.warn('[VAULT][FALLBACK] IndexedDB unavailable, stored in-memory:', code);
        return true;
      }

      // 🛡️ 4. Retry Mechanism & Self-Healing (Requirement 5)
      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await new Promise((resolve, reject) => {
            try {
              const tx = db.transaction(this.STORE_NAME, 'readwrite');
              const store = tx.objectStore(this.STORE_NAME);
              
              const request = store.put(record);
              request.onsuccess = () => {
                // console.log(`[VAULT][SUCCESS] Attempt ${attempt} - Code saved to IndexedDB:`, code);
                
                // 🛡️ SYNC TO SERVER (Requirement from actly.md)
                if (navigator.onLine) {
                  this.syncToServer(record).catch(err => console.warn('[VAULT][SYNC] Background sync failed:', err));
                }
                
                resolve(true);
              };
              request.onerror = (e) => {
                console.error(`[VAULT][ERROR] Attempt ${attempt} - IndexedDB put error:`, e.target.error);
                reject(e.target.error);
              };
            } catch (err) {
              console.error(`[VAULT][ERROR] Attempt ${attempt} - Transaction failed:`, err);
              reject(err);
            }
          });
          
          if (result) return true;
        } catch (error) {
          console.warn(`[VAULT][RETRY] Attempt ${attempt} failed for code ${code}:`, error.name || error);
          
          // Self-healing: If DataError occurs, try to fix ID or record structure
          if (error.name === 'DataError') {
            if (window.DEBUG_MODE) console.log('[VAULT][HEALING] DataError detected, attempting to normalize record...');
            record.id = record.id || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            record.updatedAt = Date.now();
          }

          if (attempt === MAX_RETRIES) {
            console.error('[VAULT][FATAL] All retries failed for code:', code);
            this._inMemoryVault.push(record);
            return true; // Still return true to avoid blocking UI, but log error
          }
          
          // Wait before retrying (Exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
      
      return false;
    },

    async syncToServer(record) {
      if (!navigator.onLine) return false;
      
      try {
        const response = await fetch('/api/codes/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: record.code,
            meta: record.meta
          })
        });
        
        if (response.ok) {
          if (window.DEBUG_MODE) console.log('[VAULT][SYNC] Code synced to server:', record.code);
          // Update sync status in local storage
          record.syncStatus = 'synced';
          const db = await this.init();
          if (db) {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            tx.objectStore(this.STORE_NAME).put(record);
          }
          return true;
        }
      } catch (err) {
        console.warn('[VAULT][SYNC] Server sync failed:', err.message);
      }
      return false;
    },

    async _generateHash(text) {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async verifyIntegrity(record) {
      if (!record || !record.integrity) return false;
      const userId = window.Auth?._userId || 'guest';
      const expected = await this._generateHash(record.code + userId);
      return record.integrity === expected;
    },

    async checkDuplicate(code) {
      const db = await this.init();
      return new Promise((resolve) => {
        if (!db) {
          // Check in-memory vault for duplicates
          const exists = this._inMemoryVault.some(rec => rec.code === code);
          resolve(exists);
          return;
        }
        
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.get(code);
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => resolve(false);
      });
    },

    async getCodes(skipIntegrity = false) {
      const db = await this.init();
      
      // 🛡️ AUTH CHECK - Require authentication for authoritative data
      const isAuth = window.Auth?.isAuthenticated() || window.__AUTH_STATE__?.authenticated;
      
      // 🛡️ FETCH FROM SERVER IF ONLINE & AUTHENTICATED (Source of Truth)
      if (isAuth && navigator.onLine) {
        try {
          const response = await fetch('/api/codes/list', {
            headers: { 'Cache-Control': 'no-cache' }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.codes)) {
              // console.log('[VAULT] Fetched authoritative codes from server:', data.codes.length);
              // Update local cache in background
              this._updateLocalCache(data.codes).catch(() => {});
              return data.codes.map(c => ({
                code: c.code,
                type: c.type || 'codes',
                status: 'owned',
                syncStatus: 'synced',
                createdAt: c.created_at || Date.now()
              }));
            }
          }
        } catch (e) {
          console.warn('[VAULT] Server fetch failed, falling back to IndexedDB cache:', e.message);
        }
      }

      if (!db) {
        // Return from in-memory vault
        const verified = [];
        for (const rec of this._inMemoryVault) {
          if (skipIntegrity || await this.verifyIntegrity(rec)) {
            verified.push(rec);
          }
        }
        return verified;
      }
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.getAll();
        request.onsuccess = async () => {
          const all = request.result || [];
          const verified = [];
          
          const now = Date.now();
          const shouldCheckIntegrity = !skipIntegrity && (now - lastCheck >= 2000);
          if (shouldCheckIntegrity) lastCheck = now;

          for (const rec of all) {
            if (!shouldCheckIntegrity || await this.verifyIntegrity(rec)) {
              verified.push(rec);
            } else {
              if (window.DEBUG_MODE) console.warn('[vault] ⚠️ integrity violation detected - soft fixing for:', rec.code);
              // Trigger auto-heal but continue with this batch to avoid UI freeze
              setTimeout(() => this.autoHealState(rec.code), 100);
            }
          }
          
          // 🛡️ Chronological Sort (Requirement: Latest first/last consistency)
          verified.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          
          resolve(verified);
        };
        request.onerror = () => resolve([]);
      });
    },

    async _updateLocalCache(serverCodes) {
      const db = await this.init();
      if (!db) return;
      
      // SAFETY: Do NOT clear local IDB if server returns 0 codes
      // but local has data — prevents destructive wipe after Render redeploy
      if (!Array.isArray(serverCodes) || serverCodes.length === 0) {
        const localCount = await this.getCodeCount();
        if (localCount > 0) {
          console.warn('[VAULT] Server returned 0 codes but local has', localCount, '- skipping destructive cache clear');
          return;
        }
      }
      
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      
      // Only clear when server has authoritative data to replace it
      store.clear();
      
      for (const code of serverCodes) {
        const record = {
          id: code.id || code.code,
          code: code.code,
          type: code.type || 'codes',
          status: 'owned',
          createdAt: code.created_at || Date.now(),
          syncStatus: 'synced'
        };
        store.put(record);
      }
    },

    async getCodeCount() {
      const db = await this.init();
      if (!db) return this._inMemoryVault.length;
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });
    },

    // 🛡️ HOLE 5 FIX: Transaction Queue in IndexedDB
    async savePendingTx(tx) {
      const db = await this.init();
      if (!db) return false;
      return new Promise((resolve, reject) => {
        const t = db.transaction('pending_txs', 'readwrite');
        const store = t.objectStore('pending_txs');
        const request = store.put(tx);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    },

    async getAllPendingTxs() {
      const db = await this.init();
      if (!db) return [];
      return new Promise((resolve) => {
        const t = db.transaction('pending_txs', 'readonly');
        const store = t.objectStore('pending_txs');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
      });
    },

    async deletePendingTx(id) {
      const db = await this.init();
      if (!db) return false;
      return new Promise((resolve) => {
        const t = db.transaction('pending_txs', 'readwrite');
        const store = t.objectStore('pending_txs');
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    }
  };

  // 📱 CAPACITOR STORAGE (SQLite Fallback)
  const CapacitorStorage = {
    async isAvailable() {
      return !!(window.Capacitor && window.Capacitor.isNativePlatform());
    },
    // Fallback to WebStorage logic if SQLite plugin is not explicitly configured
    async saveCode(entry) { return WebStorage.saveCode(entry); },
    async checkDuplicate(code) { return WebStorage.checkDuplicate(code); },
    async getCodes() { return WebStorage.getCodes(); },
    async getCodeCount() { return WebStorage.getCodeCount(); },
    async savePendingTx(tx) { return WebStorage.savePendingTx(tx); },
    async getAllPendingTxs() { return WebStorage.getAllPendingTxs(); },
    async deletePendingTx(id) { return WebStorage.deletePendingTx(id); }
  };

  // --- PUBLIC INTERFACE ---
   const StorageAdapter = {
     async saveCode(input, type = 'normal', meta = {}) {
       const code = typeof input === 'string' ? input : input?.code;

       if (!code) {
         console.error('[StorageAdapter] Invalid code input:', input);
         return false;
       }

       const entry = {
         code,
         createdAt: Date.now(),
         type,
         meta: {
           ...meta,
           persisted: false,
           syncStatus: 'pending'
         }
       };

       if (window.DEBUG_MODE) console.log(`[StorageAdapter] 🚀 START SYNC SAVE: ${code} (${type})`);

       // 1. IndexedDB Save (Primary Local)
       let localResult = false;
       try {
         if (await CapacitorStorage.isAvailable()) {
           localResult = await CapacitorStorage.saveCode(entry);
         } else {
           localResult = await WebStorage.saveCode(entry);
         }
       } catch (e) {
         console.error('[StorageAdapter] IndexedDB save failed:', e);
       }

       // 2. Neon/SQLite Sync (Parallel but non-blocking for UI)
       try {
         if (window.writeCodeToSQLite) {
           window.writeCodeToSQLite({ code, ts: entry.createdAt })
             .then(res => { if (window.DEBUG_MODE) console.log('[StorageAdapter] SQLite saved'); })
             .catch(err => console.warn('[StorageAdapter] SQLite sync failed (will retry later):', err));
         }
       } catch (e) {
         console.warn('[StorageAdapter] SQLite sync initiation failed:', e);
       }

       // 3. Notify AssetBus (Proactive UI Update)
       if (localResult && window.AssetBus && typeof window.AssetBus.addCode === 'function') {
         // console.log('[StorageAdapter] Notifying AssetBus of new code');
         window.AssetBus.addCode(code, type);
       }

       return localResult;
     },

     // AUTH METHODS DISABLED - DELEGATED TO AUTH-CORE.JS
     async saveAuth(user) {
       if (window.DEBUG_MODE) console.log('[StorageAdapter] Auth delegated to auth-core.js');
       return Promise.resolve(); // Do nothing - auth-core.js handles auth
     },
     
     async getAuth() {
       if (window.DEBUG_MODE) console.log('[StorageAdapter] Auth delegated to auth-core.js');
       return Promise.resolve(null); // Return empty, let auth-core handle
     },
     
     async clearAuth() {
       if (window.DEBUG_MODE) console.log('[StorageAdapter] Auth delegated to auth-core.js');
       return Promise.resolve(); // Do nothing
     },

     async checkDuplicate(code) {
       if (await CapacitorStorage.isAvailable()) {
         return await CapacitorStorage.checkDuplicate(code);
       }
       return await WebStorage.checkDuplicate(code);
     },

     async getCodes() {
       if (await CapacitorStorage.isAvailable()) {
         return await CapacitorStorage.getCodes();
       }
       return await WebStorage.getCodes();
     },

     async getCodeCount() {
       // 🛡️ STABILITY FIX: Ensure we get the most accurate count from multiple sources if possible
       let count = 0;
       try {
         if (await CapacitorStorage.isAvailable()) {
           count = await CapacitorStorage.getCodeCount();
         } else {
           count = await WebStorage.getCodeCount();
         }
       } catch(e) {
         console.warn('[StorageAdapter] Failed to get local count:', e);
       }
       return count;
     }
   };

  window.StorageAdapter = StorageAdapter;
  if (window.DEBUG_MODE) console.log('✅ [StorageAdapter] Initialized - Fixed version (PASSIVE MODE)');
})();
