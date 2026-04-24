// Bankode Core - Single Source of Truth
// Holds session, ledger, persistence (IndexedDB primary, localStorage backup)
// Emits events via CodeEngine to mirrors only
//
// =====================================================
// ARCHITECTURE: HYBRID PERSISTENCE - OFFLINE FIRST
// =====================================================
// Source of truth is CONTEXTUAL:
// - If (authenticated + online): SQLite is authoritative for P0-P9
// - If (offline OR PP code): Local is authoritative
// 
// Generation ALWAYS succeeds locally.
// SQLite is a synchronization layer, NOT a gatekeeper.
// 
// ASSET TYPES:
// - P0-P9 codes: Sync with SQLite, backend-validated
// - PP codes: Local-only, MUST work offline
// =====================================================

(function() { 
   const originalSetItem = localStorage.setItem; 
   localStorage.setItem = function(key, value) { 
     if (key === 'Bankode.pIndex' && value === '0') { 
       console.trace('[DEBUG] Something is resetting pIndex to 0!'); 
       console.warn('[DEBUG] Current value was:', localStorage.getItem('Bankode.pIndex')); 
     } 
     return originalSetItem.apply(this, arguments); 
   }; 
 })();

(function(){
  // 1️⃣ Enforce SINGLETON for Bankode Core
  if (window.__BANKODE_CORE__) {
    if (window.DEBUG_MODE) console.log("BANKODE INSTANCE", window.__BANKODE_CORE__, "(already initialized)");
    return;
  }
  window.__BANKODE_CORE__ = true;
  if (window.DEBUG_MODE) console.log("BANKODE INSTANCE", window.__BANKODE_CORE__, "(first initialization)");

  try {
    if (!window.BankodeEvents) {
      window.BankodeEvents = {
        listeners: {},
        on: function(event, cb){ if(!event||typeof cb!=='function') return; (this.listeners[event]||(this.listeners[event]=[])).push(cb); },
        emit: function(event, payload){ try { (this.listeners[event]||[]).forEach(fn=>{ try { fn(payload); } catch(e){ console.error('[EventBus Error]', e); } }); } catch(_){} }
      };
    }
  } catch(_){ }
  const BankodeBus = {
    listeners: [],
    on(fn){
      if (typeof fn === 'function') this.listeners.push(fn);
    },
    emit(payload){
      for (const fn of this.listeners) {
        try { fn(payload) } catch(e) { console.error('Bankode listener error', e) }
      }
    }
  };
  const GenEventsBC = new BroadcastChannel('bankode-events');
  const CodeBankChannel = new BroadcastChannel('codebank');
  const FIVE_MIN = 5 * 60 * 1000;
  let __isGenerating = false;
  let __lastGenTime = 0;
  let syncLock = false; // 2️⃣ Sync Lock
  
  // Debounce for processSyncQueue to prevent console spam
  let _lastProcessSyncTime = 0;
  const SYNC_DEBOUNCE_MS = 5000; // 5 seconds minimum between syncs
  
  function canGenerate(){ 
    const now = Date.now(); 
    if (now - __lastGenTime < FIVE_MIN) return false; 
    // 🛡️ FIX: Don't update __lastGenTime here. Update it in generateIfDue() after actual generation.
    return true; 
  }

  function uid() {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }

  // 🧪 DIAGNOSTIC: Track all reload calls (from actly.md)
  (function() {
      window.addEventListener('beforeunload', (e) => {
          console.trace('🚨 RELOAD TRIGGERED FROM:');
      });

      const originalReload = location.reload;
      location.reload = function(...args) {
          console.error('🚨 location.reload() called from:', new Error().stack);
          originalReload.apply(this, args);
      };

      const originalReplace = location.replace;
      location.replace = function(...args) {
          console.error('🚨 location.replace() called with:', args, 'from:', new Error().stack);
          originalReplace.apply(this, args);
      };
  })();

  // Minimal IndexedDB helper
  const DB_NAME = 'BankodeDB';
  const STORE_CODES = 'codes';
  const STORE_META = 'meta';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 4); // 🛡️ UPGRADED VERSION TO MATCH StorageAdapter
      req.onupgradeneeded = (e) => {
        const db = req.result;
        const oldVersion = e.oldVersion;
        if (window.DEBUG_MODE) console.log(`[BankodeDB] Upgrading from ${oldVersion} to 4`);
        
        if (!db.objectStoreNames.contains(STORE_CODES)) {
          db.createObjectStore(STORE_CODES, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
        // Ensure pending_txs store exists (synced with StorageAdapter)
        if (!db.objectStoreNames.contains('pending_txs')) {
          db.createObjectStore('pending_txs', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(storeName, key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = key != null ? store.put(value, key) : store.put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbAddCode(entry) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CODES, 'readwrite');
      const store = tx.objectStore(STORE_CODES);
      const req = store.add(entry);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbCountCodes() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CODES, 'readonly');
      const store = tx.objectStore(STORE_CODES);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGetAllCodes() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CODES, 'readonly');
      const store = tx.objectStore(STORE_CODES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbCheckDuplicate(code) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CODES, 'readonly');
      const store = tx.objectStore(STORE_CODES);
      const index = store.index ? store.index('code') : null; 
      // If no index, we have to getAll and check, but ideally we should have an index.
      // For now, let's just use getAll and check since it's simpler without changing schema yet.
      const req = store.getAll();
      req.onsuccess = () => {
        const exists = req.result.some(c => c.code === code);
        resolve(exists);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function idbUpdateCode(entry) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CODES, 'readwrite');
      const store = tx.objectStore(STORE_CODES);
      const req = store.put(entry);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

    function generateSecureCode() { 
   const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
   const parts = []; 
   
   // Generate 6 parts 
   for (let i = 0; i < 6; i++) { 
     const randomValues = new Uint32Array(4); 
     crypto.getRandomValues(randomValues); 
     let part = ""; 
     for (let j = 0; j < 4; j++) { 
       part += charset.charAt(randomValues[j] % charset.length); 
     } 
     parts.push(part); 
   } 
 
   // 🛡️ FIX: Use monotonic generation counter instead of rotating index 
   // This ensures we never go backwards (P2 → P0) 
   let genCount; 
   try { 
     const stored = localStorage.getItem('Bankode.genCount'); 
     genCount = parseInt(stored, 10); 
     if (isNaN(genCount) || genCount < 0) { 
       genCount = 0; 
     } 
   } catch(_) { 
     genCount = 0; 
   } 
   
   // Derive P-index from counter (0-9 rotating) 
   const idx = genCount % 10; 
   
   // Increment and store for NEXT generation 
   const nextCount = genCount + 1; 
   try { 
     localStorage.setItem('Bankode.genCount', String(nextCount)); 
     // Keep old key for backward compatibility during transition 
     localStorage.setItem('Bankode.pIndex', String((idx + 1) % 10)); 
   } catch(e) { 
     console.error('[Bankode] Failed to store counter:', e); 
   } 
 
   const suffix = 'P' + idx; 
   const finalCode = parts.join('-') + '-' + suffix; 
   
   // Validation 
   const formatRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P[0-9]$/; 
   if (!formatRegex.test(finalCode)) { 
     console.error('[Bankode] Format validation failed:', finalCode); 
     return generateSecureCode(); 
   } 
   
   if (window.DEBUG_MODE) console.log(`[Bankode] Generated: ${finalCode} (genCount: ${genCount}, idx: ${idx}, next: ${nextCount})`);
   return finalCode; 
 }

  // Normal code generator (Legacy replacement)
  function generateNormalCode() {
    return generateSecureCode();
  }

  // Silver bar generator
  function generateSilverBar() {
    const code = generateSecureCode();
    return 'SLVR-' + code;
  }

  // Gold bar generator
  function generateGoldBar() {
    const code = generateSecureCode();
    return 'GOLD-' + code;
  }

  const ls = {
    get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch(_) { return d } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)) } catch(_){} }
  };

  if (window.__bankodeInitialized) return;
  window.__bankodeInitialized = true;

  // 🛡️ Global Auth Ready Promise
  window.authReadyPromise = window.authReadyPromise || new Promise((resolve) => {
    window.__resolveAuthReady = resolve;
  });

  // 🛡️ Send Lock
  window.__sendLock = false;

  const Bankode = {
    _generatedCodes: new Set(), // 🛡️ Prevent session duplicates
    sessionId: null,
    codes: [],
    count: 0,
    _timer: null,
    _nextDueAt: 0,
    isPaused: false,
    isSyncPaused: false,
    _syncQueue: [],
    _txQueue: [],
    likes: 0,
    superlikes: 0,
    __integrityWatchdogRunning: false,
    
    // Initialize Bankode storage and session state before any UI/bridge code uses it
    async init(){ 
      // Wait for auth before full initialization if possible
      try {
        if (window.authReadyPromise) await window.authReadyPromise;
      } catch(e) {
        console.warn('[Bankode] Initialization proceeding without auth promise resolution');
      }
      
      await this._initFromStorage(); 
      this._loadSyncQueue();
      
      // FIX: If IDB returned 0 codes but sync queue has pending items,
      // merge them into the codes array and re-persist to IDB
      if (this.codes.length === 0 && this._syncQueue.length > 0) {
        if (window.DEBUG_MODE) console.log('[Bankode] Recovering', this._syncQueue.length, 'codes from sync queue');
        const queueCodes = this._syncQueue.map(item => item.code).filter(Boolean);
        const seen = new Set(this.codes);
        for (const code of queueCodes) {
          if (!seen.has(code)) {
            this.codes.push(code);
            seen.add(code);
          }
        }
        this.count = this.codes.length;
        if (window.DEBUG_MODE) console.log('[Bankode] Recovered', this.count, 'codes from sync queue');
        // Re-persist to IDB so they survive and can be synced to server
        if (window.StorageAdapter && typeof window.StorageAdapter.saveCode === 'function') {
          for (const code of queueCodes) {
            try {
              await window.StorageAdapter.saveCode({ code, type: 'codes', meta: { source: 'sync-queue-recovery', syncStatus: 'pending' } });
            } catch(_) {}
          }
          // console.log('[Bankode] Sync queue codes persisted to IDB');
        }
        this.publishSnapshot('sync-queue-recovery');
      }
      
      // Publish snapshot AFTER sync queue merge (deferred from _initFromStorage)
      this.publishSnapshot('init');
      
      this.runIntegrityWatchdog(); // Start Financial Integrity Watchdog
      return true; 
    },
    
    // Set the next due time and ensure the session timer is running
    startTimer(ms){ if(typeof ms==='number'&&ms>0){ this._nextDueAt=Date.now()+ms } this.startSession() },
    
    pauseNormalGeneration() {
      this.isPaused = true;
      if (window.DEBUG_MODE) console.log('[Bankode] Normal code generation paused');
    },
    
    resumeNormalGeneration() {
      this.isPaused = false;
      if (window.DEBUG_MODE) console.log('[Bankode] Normal code generation resumed');
    },

    // Unified Asset Generator
    generateAsset(type) {
      if (type === 'silver') return generateSilverBar();
      if (type === 'gold') return generateGoldBar();
      return generateNormalCode();
    },

    // Manual Asset Reward (External usage)
    async rewardAsset(type) {
      if (!this.sessionId) await this._initFromStorage();
      const now = Date.now();
      
      let code = this.generateAsset(type);
      
      // 🛡️ DUPLICATE CHECK: Before saving locally via StorageAdapter
      let attempts = 0;
      const checker = window.StorageAdapter ? window.StorageAdapter.checkDuplicate.bind(window.StorageAdapter) : idbCheckDuplicate;
      while (await checker(code) && attempts < 10) {
        console.warn('[REWARD] Duplicate code detected, regenerating...', code);
        code = this.generateAsset(type);
        attempts++;
      }

      const meta = {
        persisted: false,
        source: 'local',
        syncStatus: 'pending',
        syncedAt: null,
        assetType: type
      };

      // 1. ALWAYS succeed locally first via StorageAdapter
      if (window.StorageAdapter) {
        await window.StorageAdapter.saveCode({ code, type, meta }); // Pass as object
        if (window.DEBUG_MODE) console.log('[REWARD LOCAL SUCCESS] via StorageAdapter', { code, type });
      } else {
        // Fallback to legacy if StorageAdapter missing
        const entry = { code, createdAt: now, meta };
        await this._persistAfterGen(entry);
        console.warn('[REWARD LOCAL SUCCESS] via Legacy persistAfterGen', { code, type });
      }

      // 2. Trigger shadow sync (Async)
      this.syncWithServer().catch(_ => {});

      // 📣 Update SSoT state and publish
      this.codes.push(code);
      this.count = this.codes.length;
      await this.publishSnapshot('reward');

      return code;
    },

    async _initFromStorage(){
      // 2️⃣ Ensure Bankode restores state only once
      if (this.__stateRestored) {
        if (window.DEBUG_MODE) console.log('[Bankode] State already restored, skipping duplicate call');
        return;
      }
      this.__stateRestored = true;

      const sessionId = ls.get('Bankode.sessionId', null) || uid();
      this.sessionId = sessionId;
      const meta = ls.get('Bankode.meta', { count: 0, nextDueAt: 0 });
      this._nextDueAt = meta.nextDueAt || 0;
      
      // 🛡️ SSoT: Load full codes list from IDB on init
      try {
        // 🛡️ FIX: Use StorageAdapter if available to avoid DB mismatch (CodeVault vs BankodeDB)
        let all = [];
        if (window.StorageAdapter && typeof window.StorageAdapter.getCodes === 'function') {
          if (window.DEBUG_MODE) console.log('[Bankode] Restoring state via StorageAdapter...');
          all = await window.StorageAdapter.getCodes();
        } else {
          if (window.DEBUG_MODE) console.log('[Bankode] Restoring state via legacy IDB helper...');
          all = await idbGetAllCodes();
        }
        
        this.codes = Array.isArray(all) ? all.map(c => c.code || c) : [];
        this.count = this.codes.length;
        if (window.DEBUG_MODE) console.log('[Bankode] State restored from storage:', this.count, 'codes');
      } catch(e) {
        console.warn('[Bankode] Failed to restore codes from storage:', e);
        this.codes = [];
        this.count = 0;
      }

      await idbPut(STORE_META, 'session', { sessionId });
      
      // 📣 Publish initial snapshot after state restoration
      // this.publishSnapshot('init'); // DEFERRED: moved to init() after sync queue merge
    },

    // 📣 Centralized snapshot publishing
    async publishSnapshot(triggerSource = 'internal') {
      try {
        // ✅ PERMANENT FIX: Event Replay System + Retry instead of defer
        // Never lose codes again due to timing / race conditions
        let attempts = 0;
        const maxAttempts = 40; // 20 seconds total retry window
        const retryDelay = 500;

        // Store snapshot in global buffer immediately
        window.__BANKODE_PENDING_SNAPSHOTS__ = window.__BANKODE_PENDING_SNAPSHOTS__ || [];
        window.__BANKODE_PENDING_SNAPSHOTS__.push({
          snapshot: snapshot,
          timestamp: Date.now(),
          triggerSource: triggerSource
        });

        // Retry until AssetBus is available (no more defer!)
        const publishWithRetry = async () => {
          while (attempts < maxAttempts) {
            if (window.AssetBus && typeof window.AssetBus.update === 'function') {
              // Publish all pending snapshots
              for (let i = 0; i < window.__BANKODE_PENDING_SNAPSHOTS__.length; i++) {
                const pending = window.__BANKODE_PENDING_SNAPSHOTS__[i];
                window.AssetBus.update(pending.snapshot, pending.triggerSource);
                if (window.DEBUG_MODE) console.log(`[Bankode] ✅ Published pending snapshot (attempt ${attempts + 1})`, pending.snapshot.code);
              }
              window.__BANKODE_PENDING_SNAPSHOTS__ = [];
              return true;
            }
            attempts++;
            await new Promise(r => setTimeout(r, retryDelay));
          }

          console.warn(`[Bankode] ⚠️ Failed to publish after ${maxAttempts} attempts, snapshot preserved in buffer`);
          return false;
        };

        // Run in background without blocking generation
        publishWithRetry();

        if (window.AssetBus && typeof window.AssetBus.update === 'function') {
          // 🛡️ RE-LOAD FROM IDB: If codes array is empty, force reload from StorageAdapter
          if (this.codes.length === 0) {
            if (window.DEBUG_MODE) console.log('[Bankode] Empty codes array during publish, reloading...');
            let all = [];
            if (window.StorageAdapter && typeof window.StorageAdapter.getCodes === 'function') {
              all = await window.StorageAdapter.getCodes();
            } else {
              all = await idbGetAllCodes();
            }
            this.codes = Array.isArray(all) ? all.map(c => c.code || c) : [];
            this.count = this.codes.length;
          }

          let currentCodes = this.codes;
          
          // Filter assets for normalization
          const normalCodes = currentCodes.filter(c => !String(c).includes('SLVR') && !String(c).includes('GOLD'));
          const silverBars = currentCodes.filter(c => String(c).includes('SLVR'));
          const goldBars = currentCodes.filter(c => String(c).includes('GOLD'));

          // 🛡️ GUARANTEE LATEST: Use the absolute last code from internal array
          const latestCode = currentCodes[currentCodes.length - 1] || null;

          const snapshot = {
            codes: normalCodes,
            silver: silverBars,
            gold: goldBars,
            count: currentCodes.length,
            latestCode: latestCode,
            latest: latestCode,
            code: latestCode, 
            likes: this.likes || 0,
            superlikes: this.superlikes || 0,
            timestamp: Date.now(),
            source: 'bankode-core',
            trigger: triggerSource
          };
          
          window.AssetBus.update(snapshot, 'internal-verified');
          if (window.DEBUG_MODE) console.log(`[Bankode] Snapshot published (trigger: ${triggerSource}) with ${currentCodes.length} codes. Latest:`, latestCode);
        } else {
          console.warn('[Bankode] AssetBus not found after 5s, snapshot deferred');
        }
      } catch(e) {
        console.warn('[Bankode] Failed to publish snapshot:', e);
      }
    },

    async _persistAfterGen(entry){
      try { await idbAddCode(entry); } catch(_) {}
      try { this.count = await idbCountCodes(); } catch(_) {}
      ls.set('Bankode.meta', { count: this.count, nextDueAt: this._nextDueAt });
      ls.set('Bankode.last', entry);
      
      // 4️⃣ Ensure IndexedDB writes trigger AssetBus publish
      if (window.DEBUG_MODE) console.log('[Bankode] Legacy persist complete, publishing snapshot...');
      await this.publishSnapshot('legacy-persist');
    },

    startSession(){
      // 3️⃣ Prevent Bankode Double Session
      if (window.__BANKODE_RUNNING__) {
        console.warn("[Bankode] Session already running");
        return;
      }
      window.__BANKODE_RUNNING__ = true;

      if (!this.sessionId) { this._initFromStorage(); }
      if (!this._nextDueAt || Date.now() >= this._nextDueAt) { this._nextDueAt = Date.now(); }
      try { if (window.__CODEGEN_INTERVAL__) { clearInterval(window.__CODEGEN_INTERVAL__); } } catch(_){}
      
      if (window.DEBUG_MODE) console.log('[Bankode] Starting generation session (5 min interval)');
      window.__CODEGEN_INTERVAL__ = setInterval(async () => { 
        if (window.DEBUG_MODE) console.log('[Bankode] Generation tick (checking if due)');
        await generateCode(); 
      }, 30000); // Check every minute to be safe
    },

    stopSession(){
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      try { if (window.__CODEGEN_INTERVAL__) { clearInterval(window.__CODEGEN_INTERVAL__); window.__CODEGEN_INTERVAL__ = null; } } catch(_){}
      if (window.DEBUG_MODE) console.log('[Bankode] Generation session stopped');
    },

    // =====================================================
    // SYNC QUEUE - For eventual consistency
    // =====================================================
    _loadSyncQueue() {
      try {
        const stored = localStorage.getItem('Bankode.syncQueue');
        if (stored) {
          this._syncQueue = JSON.parse(stored);
          if (window.DEBUG_MODE) console.log('[SYNC QUEUE] Loaded', this._syncQueue.length, 'pending codes');
        }
      } catch(e) {
        this._syncQueue = [];
      }
    },

    _saveSyncQueue() {
      try {
        localStorage.setItem('Bankode.syncQueue', JSON.stringify(this._syncQueue));
      } catch(e) {
        console.error('[SYNC QUEUE] Failed to save:', e);
      }
    },

    _queueForSync(code, ts) {
      const existing = this._syncQueue.find(item => item.code === code);
      if (existing) return; // Already queued
      
      this._syncQueue.push({ code, ts, attempts: 0, queuedAt: Date.now() });
      this._saveSyncQueue();
      if (window.DEBUG_MODE) console.log('[SYNC QUEUE] Code queued for later sync:', code);
    },

    // =====================================================
    // OFFLINE-FIRST SYNC STRATEGY
    // =====================================================
    async _computeHash(data) {
      if (typeof crypto === 'undefined' || !crypto.subtle) return null;
      const msgUint8 = new TextEncoder().encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // =====================================================
    // ASSET COMPRESSION (Rule: 100:1)
    // =====================================================
    async compressAssets() {
      const allCodes = await idbGetAllCodes();
      const normalCodes = allCodes.filter(c => (c.meta?.assetType || 'normal') === 'normal');
      const silverBars = allCodes.filter(c => c.meta?.assetType === 'silver');
      
      let compressed = false;

      // 1. Normal -> Silver (100:1)
      if (normalCodes.length >= 100) {
        if (window.DEBUG_MODE) console.log('[COMPRESSION] 100 normal codes -> 1 silver bar');
        // Delete 100 codes
        const toDelete = normalCodes.slice(0, 100);
        const db = await openDB();
        const tx = db.transaction(STORE_CODES, 'readwrite');
        const store = tx.objectStore(STORE_CODES);
        for (const c of toDelete) {
          store.delete(c.id);
        }
        await new Promise(r => tx.oncomplete = r);
        
        // Add 1 silver bar
        await this.rewardAsset('silver');
        compressed = true;
      }

      // 2. Silver -> Gold (100:1)
      if (silverBars.length >= 100) {
        if (window.DEBUG_MODE) console.log('[COMPRESSION] 100 silver bars -> 1 gold bar');
        // Delete 100 silver bars
        const toDelete = silverBars.slice(0, 100);
        const db = await openDB();
        const tx = db.transaction(STORE_CODES, 'readwrite');
        const store = tx.objectStore(STORE_CODES);
        for (const c of toDelete) {
          store.delete(c.id);
        }
        await new Promise(r => tx.oncomplete = r);
        
        // Add 1 gold bar
        await this.rewardAsset('gold');
        compressed = true;
      }

      if (compressed) {
        // Recursive call to handle cascading compression
        await this.compressAssets();
      }
    },

    async syncWithServer() {
      // 2️⃣ Prevent Duplicate Delta Sync
      if (syncLock) {
        console.warn("[Bankode] Sync already running");
        return { status: 'skipped', reason: 'sync_locked' };
      }
      syncLock = true;

      const online = typeof navigator !== 'undefined' && navigator.onLine === true;
      const isAuth = !!(window.Auth && typeof window.Auth.isAuthenticated === 'function' && window.Auth.isAuthenticated());
      
      if (!online || !isAuth) {
        syncLock = false; // Release lock before returning
        return { status: 'skipped', reason: 'offline_or_unauth' };
      }

      try {
        // 0. Perform compression before sync
        await this.compressAssets();

        // 1. Identify new unsynced codes
        const allCodes = await idbGetAllCodes();
        const unsynced = allCodes.filter(c => !c.meta?.synced);
        
        if (unsynced.length === 0) {
          if (window.DEBUG_MODE) console.log('[Bankode] No new codes to sync.');
          syncLock = false; // Release lock
          return { status: 'success', delta: 0 };
        }

        // 2. Calculate deltas
        const delta_codes = unsynced.filter(c => (c.meta?.assetType || 'normal') === 'normal').length;
        const delta_silver = unsynced.filter(c => c.meta?.assetType === 'silver').length;
        const delta_gold = unsynced.filter(c => c.meta?.assetType === 'gold').length;
        
        // 3. Generate unique sync_id for idempotency
        const sync_id = uid(); // Using the existing uid() helper

        // 4. Prepare payload with DELTAS ONLY
        const payload = {
          delta_codes,
          delta_silver,
          delta_gold,
          sync_id
        };

        if (window.DEBUG_MODE) console.log('[Bankode] Syncing deltas to server...', payload);

        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (window.DEBUG_MODE) console.log('[Bankode] ✅ Delta sync successful. New balance:', data);
          
          // 5. Mark codes as synced in IDB
          for (const entry of unsynced) {
            entry.meta = entry.meta || {};
            entry.meta.synced = true;
            entry.meta.syncedAt = Date.now();
            await idbUpdateCode(entry);
          }

          localStorage.setItem('Bankode.lastSyncAt', Date.now());
          
          // 6. Update Local AssetBus with safe list
          if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
             window.AssetBus.sync();
          }
          
          return { status: 'success', balance: data };
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('[Bankode] ❌ Delta sync failed:', res.status, errData.error);
          return { status: 'failed', code: res.status, error: errData.error };
        }
      } catch (err) {
        console.error('[Bankode] ❌ Delta sync error:', err.message);
        return { status: 'error', error: err.message };
      } finally {
        syncLock = false; // 🛡️ Guarantee lock release
      }
    },

    // =====================================================
    // FINANCIAL INTEGRITY WATCHDOG (FIXED)
    // =====================================================
    runIntegrityWatchdog() {
      // 🛡️ Singleton guard (from actly.md)
      if (this.__integrityWatchdogRunning || window.__bankode_watchdog_running) return;
      this.__integrityWatchdogRunning = true;
      window.__bankode_watchdog_running = true;

      // ✅ FIXED - Event-driven with backoff (from actly.md)
      class LedgerMonitor {
        constructor(bankode) {
          this.bankode = bankode;
          this.mismatchCount = 0;
          this.maxRetries = 3;
          this.checkInterval = 30000; // 30 seconds
          this.isRunning = false;
        }

        start() {
          if (this.isRunning) return;
          this.isRunning = true;
          if (window.DEBUG_MODE) console.log('[LedgerMonitor] Started (30s interval)');
          this.scheduleCheck();
        }

        scheduleCheck() {
          if (!this.isRunning) return;
          setTimeout(() => this.check(), this.checkInterval);
        }

        async check() {
          const isAuth = !!(window.Auth && typeof window.Auth.isAuthenticated === 'function' && window.Auth.isAuthenticated());
          const online = typeof navigator !== 'undefined' && navigator.onLine === true;

          if (!isAuth || !online) {
            this.scheduleCheck();
            return;
          }

          try {
            const res = await fetch('/api/ledger/verify', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to verify ledger');
            const serverLedger = await res.json();
            
            const allCodes = await idbGetAllCodes();
            const localCounts = {
              codes: allCodes.filter(c => (c.meta?.assetType || 'normal') === 'normal').length,
              silver: allCodes.filter(c => c.meta?.assetType === 'silver').length,
              gold: allCodes.filter(c => c.meta?.assetType === 'gold').length
            };

            const isMatch = (
              localCounts.codes === serverLedger.codes &&
              localCounts.silver === serverLedger.silver &&
              localCounts.gold === serverLedger.gold
            );

            if (!isMatch) {
              this.mismatchCount++;
              console.warn(`[LedgerMonitor] Mismatch #${this.mismatchCount}`, { local: localCounts, server: serverLedger });
              
              if (this.mismatchCount >= this.maxRetries) {
                console.error('[LedgerMonitor] Max retries reached, forcing recovery refresh');
                // Use replace instead of reload to prevent history spam
                console.warn('[LedgerMonitor] Max retries reached — skipping reload, resetting counter');
                this.mismatchCount = 0;
                this.checkInterval = 60000;
                this.scheduleCheck();
                return;
              }
              
              // Align local state if possible
              if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
                await window.AssetBus.sync();
              }

              // Exponential backoff
              this.checkInterval = Math.min(this.checkInterval * 2, 300000); 
              if (window.DEBUG_MODE) console.log(`[LedgerMonitor] Backoff: next check in ${this.checkInterval}ms`);
            } else {
              this.mismatchCount = 0; 
              this.checkInterval = 30000;
            }
          } catch (err) {
            // Silence errors to prevent loop noise
          }
          
          this.scheduleCheck();
        }

        stop() {
          this.isRunning = false;
        }
      }

      const monitor = new LedgerMonitor(this);
      monitor.start();
    },

    async resyncFromServer() {
      if (window.DEBUG_MODE) console.log('[RESYNC] Synchronizing client state from authoritative server ledger...');
      // In a ledger-only model, we can't recover full code strings from the server.
      // But we can mark existing ones as synced and align counters.
      // For now, we trigger AssetBus sync to refresh UI counters from server totals.
      if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
        await window.AssetBus.sync();
      }
    },

    // Process pending syncs when back online - called by network recovery
    async processSyncQueue() {
      const now = Date.now();
      if (now - _lastProcessSyncTime < SYNC_DEBOUNCE_MS) {
        if (window.DEBUG_MODE) console.log('[Bankode] processSyncQueue debounced, skipping');
        return;
      }
      _lastProcessSyncTime = now;
      
      if (this.isSyncPaused) {
        console.warn('[Bankode] Sync is paused due to integrity alert.');
        return;
      }
      // Legacy per-code sync removed in favor of periodic shadow sync
      await this.syncWithServer();
    },

    _loadTxQueue() {
      try {
        const stored = localStorage.getItem('Bankode.txQueue');
        if (stored) this._txQueue = JSON.parse(stored);
      } catch(_) { this._txQueue = []; }
    },
    _saveTxQueue() {
      try { localStorage.setItem('Bankode.txQueue', JSON.stringify(this._txQueue)); } catch(_){}
    },
    storeTransaction(tx) {
      if (!tx || !tx.id) return;
      if (!this._txQueue.length) this._loadTxQueue();
      const exists = this._txQueue.find(t => t.id === tx.id);
      if (exists) return;
      this._txQueue.push({ ...tx, attempts: tx.attempts || 0 });
      this._saveTxQueue();
      try { BankodeBus.emit({ type:'TX_STORED', data: tx }); } catch(_){}
    },
    updateTx(id, changes) {
      if (!id) return;
      if (!this._txQueue.length) this._loadTxQueue();
      const idx = this._txQueue.findIndex(t => t.id === id);
      if (idx >= 0) {
        this._txQueue[idx] = { ...this._txQueue[idx], ...changes };
        this._saveTxQueue();
      }
    },
    queueTransaction(tx) {
      if (!tx || !tx.id) return;
      if (!this._txQueue.length) this._loadTxQueue();
      const e = this._txQueue.find(t => t.id === tx.id);
      if (e) {
        e.status = 'pending';
        e.syncStatus = 'queued';
        this._saveTxQueue();
        return;
      }
      this._txQueue.push({ ...tx, status:'pending', syncStatus:'queued', attempts: 0 });
      this._saveTxQueue();
    },
    async retryTxQueue() {
      if (!this._txQueue.length) this._loadTxQueue();
      if (!this._txQueue.length) return;
      const online = typeof navigator !== 'undefined' && navigator.onLine === true;
      const isAuth = !!(window.Auth && typeof window.Auth.isAuthenticated === 'function' && window.Auth.isAuthenticated());
      if (!online || !isAuth) return;
      const remain = [];
      for (const tx of this._txQueue) {
        const needs = (tx && (tx.syncStatus === 'queued' || tx.syncStatus === 'failed'));
        if (!needs) { remain.push(tx); continue; }
        try {
          const idem = tx.id || ('tx_'+Date.now());
          const body = { codes: Array.isArray(tx.codes)?tx.codes: [tx.code || ''], receiverEmail: tx.to };
          try { if(window.DEBUG_MODE) console.log('[API BODY]', body); } catch(_){}
          const res = await fetch('/api/send-codes', { method:'POST', headers:{ 'Content-Type':'application/json', 'Idempotency-Key': idem }, credentials:'include', body: JSON.stringify(body) });
          const j = await res.json().catch(()=>({}));
          if (res.ok && j && (j.ok || j.success)) {
            remain.push({ ...tx, status:'sent', syncStatus:'synced' });
            this.updateTx(tx.id, { status:'sent', syncStatus:'synced' });
          } else {
            remain.push({ ...tx, attempts:(tx.attempts||0)+1, status:'pending', syncStatus:'failed' });
          }
        } catch(_) {
          remain.push({ ...tx, attempts:(tx.attempts||0)+1, status:'pending', syncStatus:'failed' });
        }
      }
      this._txQueue = remain;
      this._saveTxQueue();
    },

    // =====================================================
    // GENERATION - OFFLINE FIRST, ALWAYS SUCCEEDS
    // =====================================================
    async generateIfDue(){
      if (!this.sessionId) await this._initFromStorage();
      const now = Date.now();
      if (now < (this._nextDueAt || 0)) return;
      
      // Skip normal code generation if paused or during Extra Mode or pending reward
      const extraActive = !!(window.extraModeActive || (document && document.body && document.body.classList.contains('extra-mode')));
      const hasPending = !!(window.ExtraMode && typeof window.ExtraMode.hasPendingReward==='function' && window.ExtraMode.hasPendingReward());
      if (this.isPaused || extraActive || hasPending) {
        if (window.DEBUG_MODE) console.log('[Bankode] Normal code generation skipped -', this.isPaused ? 'paused' : 'Extra Mode or pending reward');
        return;
      }
      
      let code = generateNormalCode();
      
      // 🛡️ SESSION-LEVEL DUPLICATE CHECK
      if (this._generatedCodes.has(code)) {
        console.warn('[Bankode] Session duplicate code prevented:', code);
        return; // Skip this tick
      }
      this._generatedCodes.add(code);

      // Get generation count and current state
      const allCodes = await idbGetAllCodes();
      const genCount = allCodes.length;
      const localCount = this.codes.length;
      const pendingSyncCount = this._syncQueue.length;
      
      if (window.DEBUG_MODE) console.log(
        `[Bankode] Generated: ${code} | total=${genCount} | local=${localCount} | pendingSync=${pendingSyncCount}`
      );
      
      // 🛡️ DUPLICATE CHECK: Before saving locally via StorageAdapter
      let genAttempts = 0;
      const genChecker = window.StorageAdapter ? window.StorageAdapter.checkDuplicate.bind(window.StorageAdapter) : idbCheckDuplicate;
      while (await genChecker(code) && genAttempts < 10) {
        console.warn('[CODEGEN] Duplicate code detected, regenerating...', code);
        code = generateNormalCode();
        genAttempts++;
      }

      const isPn = /P[0-9]$/.test(code);
      const isPP = code.endsWith('PP');
      
      // =====================================================
      // HYBRID PERSISTENCE MODEL - OFFLINE FIRST
      // =====================================================
      // Initialize meta state for tracking
      // meta = { persisted, source, syncStatus, syncedAt }
      // =====================================================
      
      let meta = {
        persisted: false,       // Is it in SQLite?
        source: 'local',        // 'local' or 'sqlite'
        syncStatus: 'pending',  // 'synced' | 'pending' | 'failed' | 'local-only'
        syncedAt: null
      };
      
      try { 
        if (window.DEBUG_MODE) console.log('[CODE GENERATED]', {
          code, 
          codeType: isPP ? 'PP (offline/local)' : 'P0-P9 (sync-capable)',
          suffix: isPP ? 'PP' : code.match(/P[0-9]$/)[0]
        }); 
      } catch(_){}
      
      // =====================================================
      // ATTEMPT SQLITE SYNC (NON-BLOCKING)
      // For P0-P9 codes, try to sync with SQLite
      // FAILURE DOES NOT BLOCK GENERATION
      // =====================================================
      
      if (isPn && window.writeCodeToSQLite) {
        // TRULY NON-BLOCKING: SQLite sync runs in background with 8s timeout.
        // NEVER await this - it MUST NOT block local code generation.
        (function _bgSqliteSync(bankodeRef, codeVal, tsVal) {
          Promise.race([
            window.writeCodeToSQLite({ code: codeVal, ts: tsVal }),
            new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('SQLITE_TIMEOUT_8s')); }, 8000); })
          ]).then(function(writeResult) {
            if (writeResult && writeResult.ok) {
              if (window.DEBUG_MODE) console.log('[SQLITE SYNC BG OK]', codeVal);
              try {
                if (window.BankodeEvents && typeof window.BankodeEvents.emit === 'function') {
                  window.BankodeEvents.emit('SQLITE_CODE_SYNCED', { code: codeVal, userId: bankodeRef.sessionId });
                }
                window.dispatchEvent(new CustomEvent('SQLITE_CODE_SYNCED', { detail: { code: codeVal } }));
              } catch (_) {}
            } else {
              if (window.DEBUG_MODE) console.warn('[SQLITE SYNC BG FAIL]', codeVal, writeResult && writeResult.error);
              try { bankodeRef._queueForSync(codeVal, tsVal); } catch (_) {}
            }
          }).catch(function(err) {
            if (window.DEBUG_MODE) console.warn('[SQLITE SYNC BG TIMEOUT]', codeVal, err.message);
            try { bankodeRef._queueForSync(codeVal, tsVal); } catch (_) {}
          });
        })(this, code, now);
        // Continue immediately - SQLite sync is fire-and-forget
      } else if (isPP) {
        // PP codes are LOCAL-ONLY by design - this is correct behavior
        meta.persisted = false;
        meta.source = 'local';
        meta.syncStatus = 'local-only';
        if (window.DEBUG_MODE) console.log('[PP CODE] Local-only, no SQLite sync needed:', code);
      }
      
      // =====================================================
      // ALWAYS persist locally via StorageAdapter
      // The system MUST continue working even if SQLite is down
      // =====================================================
      
      if (window.StorageAdapter) {
        await window.StorageAdapter.saveCode({ code, meta }); // Pass as object
        if (window.DEBUG_MODE) console.log('[BANKODE] Code persisted locally via StorageAdapter', { code, meta });
      } else {
        // Fallback to legacy
        const entry = { id: undefined, code, createdAt: now, meta };
        await this._persistAfterGen(entry);
        console.warn('[BANKODE] Code persisted locally via Legacy', { code, meta });
      }
      
      this._nextDueAt = now + FIVE_MIN;
      __lastGenTime = now;
      this.codes.push(code);
      this.count = this.codes.length;
      
      // 📣 SSoT: Centralized snapshot publication
      await this.publishSnapshot('generation');
      
      // 🛡️ Also dispatch directly for maximum compatibility
      window.dispatchEvent(new CustomEvent('bankode:code-generated', {
        detail: { code, count: this.count, source: 'bankode-core' }
      }));

      return { code, timestamp: now, meta };
    }
  };

  window.Bankode = Bankode;
  window.BankodeBus = BankodeBus;
  Bankode.on = function(fn){ BankodeBus.on(fn); };
  Bankode.emit = function(){ throw new Error('External emit forbidden. Bankode is the sole emitter.'); };

  // 🛡️ INITIALIZATION BOOTSTRAP
  async function bootstrap(){
    try {
      // 🧠 WAIT FOR ASSETBUS: Ensure we can publish initial state
      if (!window.AssetBus) {
          if (window.DEBUG_MODE) console.log('[Bankode] AssetBus not ready, waiting for assetbus:ready...');
          await new Promise(resolve => {
              window.addEventListener('assetbus:ready', resolve, { once: true });
              // Safety timeout
              setTimeout(resolve, 2000);
          });
      }

      await Bankode.init();
      // 🛡️ FIX: Start the generation session automatically on bootstrap
      Bankode.startSession();
      if (window.DEBUG_MODE) console.log('[Bankode] Bootstrap complete');
      
      // 🔔 Dispatch ready event for subscribers
      window.dispatchEvent(new CustomEvent('bankode:ready'));
    } catch(e) {
      console.error('[Bankode] Bootstrap failed:', e);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  async function generateCode(){ 
    if (__isGenerating) return; 
    // console.log('[Bankode] generateCode() check');
    if (!canGenerate()) return; 
    __isGenerating = true; 
    try { 
      if (window.DEBUG_MODE) console.log('[Bankode] Generation due! Executing generateIfDue()');
      await Bankode.generateIfDue(); 
    } finally { 
      __isGenerating = false; 
    } 
  }
  
  try { 
    if (window.__CODEGEN_INTERVAL__) { 
      clearInterval(window.__CODEGEN_INTERVAL__); 
    } 
    window.__CODEGEN_INTERVAL__ = setInterval(async () => { 
      await generateCode(); 
    }, 30000); // Check every minute
  } catch(_){}
  
  // =====================================================
  // NETWORK RECOVERY - Process sync queue when back online
  // =====================================================
  try {
    window.addEventListener('online', function() {
      if (window.DEBUG_MODE) console.log('[NETWORK] Back online - processing sync queue');
      if (Bankode.processSyncQueue) {
        Bankode.processSyncQueue();
      }
      try { if (Bankode.retryTxQueue) Bankode.retryTxQueue(); } catch(_){ }
    });
    
    window.addEventListener('auth:ready', function(e) {
      if (navigator.onLine && e && e.detail && e.detail.authenticated) {
        if (window.DEBUG_MODE) console.log('[AUTH] Ready and online - processing sync queue');
        if (Bankode.processSyncQueue) {
          Bankode.processSyncQueue();
        }
        try { if (Bankode.retryTxQueue) Bankode.retryTxQueue(); } catch(_){ }
        // [FIX] Auto-restore IndexedDB codes to server after auth is ready
        try {
          (async function autoRestoreToServer() {
            try {
              const allCodes = await idbGetAllCodes();
              if (!allCodes || allCodes.length === 0) return;
              // Get server count first
              const serverResp = await fetch('/api/sqlite/codes', { credentials: 'include' });
              const serverData = await serverResp.json().catch(() => ({}));
              const serverCount = serverData.count || 0;
              if (serverCount >= allCodes.length) return; // Server already has same or more
              console.log(`[RESTORE] Local has ${allCodes.length} codes, server has ${serverCount} — pushing to server`);
              const resp = await fetch('/api/sync/restore-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ codes: allCodes })
              });
              const result = await resp.json().catch(() => ({}));
              if (result.success) {
                console.log(`[RESTORE] ✅ Synced ${result.inserted} codes to server (skipped ${result.skipped}). Total: ${result.total_server}`);
                // Dispatch event so UI can refresh count
                window.dispatchEvent(new CustomEvent('codes:restored', { detail: result }));
              }
            } catch(e) {
              console.warn('[RESTORE] Auto-restore failed:', e.message);
            }
          })();
        } catch(_) {}
      }
    });
  } catch(_) {}
  
  async function fetchFullSqliteSnapshot(){
    try{
      if (window.sqliteAdapter && typeof window.sqliteAdapter.fetchCodes==='function'){
        const res = await window.sqliteAdapter.fetchCodes();
        return Array.isArray(res && res.rows) ? res.rows : []
      }
    }catch(_){}
    try{
      if (typeof window.getSQLiteCodes==='function'){
        const res = await window.getSQLiteCodes();
        return Array.isArray(res && res.rows) ? res.rows : []
      }
    }catch(_){}
    try{
      const r = await fetch('/api/sqlite/codes', { credentials:'include' });
      const j = await r.json().catch(()=>({}));
      return Array.isArray(j && j.rows) ? j.rows : []
    }catch(_){ return [] }
  }
  try{ window.fetchFullSqliteSnapshot = fetchFullSqliteSnapshot }catch(_){}
})();

window.__BANKODE_INSTANCE__ = Bankode;
