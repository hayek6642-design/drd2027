// safe-asset-list.js - FIXED VERSION
// UV: SAFE-UI-UNIFY-2026-02-21-LOCAL-FIRST-TX
/* ===================================================
   Unified Safe Asset List Renderer - Local-First TX
   - LOCAL-FIRST TRANSACTIONS: Store immediately, sync later
   - Non-blocking backend sync
   - Automatic retry on auth ready / network online
   - Supports Codes, Silver, Gold
   =================================================== */
(function() {
  'use strict';
  if (window.__SAFE_LIST_INITIALIZED__) return;
  window.__SAFE_LIST_INITIALIZED__ = true;

  // ========================
  // Configuration & State
  // ========================
  window.ACTIVE_ASSET_TAB = window.ACTIVE_ASSET_TAB || 'codes';
  window.SAFE_PAGE = window.SAFE_PAGE || 1;
  window.__SAFE_RENDER_PENDING__ = false;
  window.__SAFE_INIT_ATTEMPTS__ = 0;
  window.__NEON_SYNC_READY__ = false;
  window.NEON_CODES = Array.isArray(window.NEON_CODES) ? window.NEON_CODES : [];
  const MAX_INIT_ATTEMPTS = 50;
  const PAGE_SIZE = 20;
  const TAB_MAP = { codes: 'codes', silver: 'silver', gold: 'gold' };
  const TITLE_MAP = { codes: 'Safe Codes', silver: 'Silver Bars', gold: 'Gold Bars' };
  const CODEBANK_CONTAINER_SELECTOR = '#codebank-assets-tab .safe-container';
  function resolveAssetType(meta){ try { if(meta&&meta.assetType==='silver') return 'silver'; if(meta&&meta.assetType==='gold') return 'gold'; return 'codes'; } catch(_) { return 'codes' } }
  window.__SAFE_SELECTED_CODES__ = window.__SAFE_SELECTED_CODES__ || new Set();
  window.__SAFE_LAST_CODES_COUNT__ = typeof window.__SAFE_LAST_CODES_COUNT__==='number' ? window.__SAFE_LAST_CODES_COUNT__ : 0;
  window.safeAssetsState = window.safeAssetsState || { enabled: false, configured: false };
  
  // FIX: Initialize authReady with multiple fallback sources
  function getAuthState() {
    // Check multiple sources in order of priority
    if (window.__AUTH_STATE__?.authenticated === true) {
      return { authenticated: true, userId: window.__AUTH_STATE__.userId };
    }
    if (window.Auth?._authenticated === true || window.Auth?.isAuthenticated?.() === true) {
      return { authenticated: true, userId: window.Auth?._userId || window.Auth?.userId?.() };
    }
    if (window.__AUTH_READY__ === true) {
      return { authenticated: true, userId: null };
    }
    return { authenticated: false, userId: null };
  }
  
  window.authReady = getAuthState().authenticated;

  // ========================================
  // الجاهزية (Readiness Helpers) - FIXED
  // ========================================
  function isAuthReady() {
    // FIX: Check multiple sources for auth state
    const authState = getAuthState();
    return authState.authenticated === true;
  }

  async function waitForSyncedCodes(timeout = 5000) {
    const start = Date.now();
    // Check if AssetBus has data
    const hasData = () => {
      const snapshot = (window.AssetBus && typeof window.AssetBus.snapshot==='function') ? window.AssetBus.snapshot() : null;
      if (!snapshot) return false;
      const tab = window.ACTIVE_ASSET_TAB || 'codes';
      const list = snapshot[TAB_MAP[tab] || tab];
      return Array.isArray(list) && list.length > 0;
    };

    while (!hasData()) {
      if (Date.now() - start > timeout) {
        console.warn('[SYNC] Timeout waiting for syncedCodes');
        return false;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return true;
  }

  function hasSelectedCodes() {
    return window.__SAFE_SELECTED_CODES__ && window.__SAFE_SELECTED_CODES__.size > 0;
  }

  // ========================================
  // 1) GLOBAL LEDGER + BUS
  // ========================================
  window.__LEDGER__ = window.__LEDGER__ || { txs: [] };
  const __SEEN_TX__ = new Set();

  window.__LEDGER_BUS__ = window.__LEDGER_BUS__ || {
    listeners: [],
    subscribe(fn){ this.listeners.push(fn); },
    emit(e){ this.listeners.forEach(fn => { try{fn(e)}catch{} }); }
  };

  // ========================================
  // 4) PENDING QUEUE + SELF-HEALING + RECONCILIATION
  // ========================================
  window.__PENDING_TX__ = window.__PENDING_TX__ || new Map();
  window.__FORCE_SYNC_FAIL__ = false; // For testing

  async function retrySync(tx) {
    if (!tx || tx.syncStatus === 'synced') return;
    if (window.__FORCE_SYNC_FAIL__) {
      console.warn('[SYNC] forced failure active, skipping retry');
      return;
    }
    console.log('[SYNC] pending -> retrying', tx.id);
    try {
      await sendTx(tx);
      tx.syncStatus = 'synced';
      window.__PENDING_TX__.delete(tx.id);
      console.log('[SYNC] success for', tx.id);
    } catch (e) {
      console.warn('[SYNC] retry failed for', tx.id);
    }
  }

  // Final Reconciliation Engine
  async function forceNeonToMatchLedger(userId, assetType) {
    console.log('[HEALING] forcing server reconciliation for', assetType);
    try {
      const ledgerBal = computeLedgerBalance(userId, assetType);
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          assetType,
          ledgerBalance: ledgerBal,
          pendingTxs: Array.from(window.__PENDING_TX__.values()).filter(t => t.asset === assetType)
        })
      });
      if (res.ok) {
        console.log('[HEALING] fixed successfully for', assetType);
        return true;
      }
    } catch (e) {
      console.error('[HEALING] reconciliation failed', e);
    }
    return false;
  }

  // Self-Healing: Every 5 seconds check for pending transactions
  setInterval(() => {
    try {
      const auth = getAuthState();
      if (!auth.authenticated) return;

      // LEDGER ABSOLUTISM: Every 10s force a full sync
      if (!window.__LAST_HARD_SYNC__ || Date.now() - window.__LAST_HARD_SYNC__ > 10000) {
        window.__LAST_HARD_SYNC__ = Date.now();
        if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
          window.AssetBus.sync();
        }
      }

      // Retry pending transactions
      for (const tx of window.__PENDING_TX__.values()) {
        retrySync(tx);
      }
    } catch (e) {}
  }, 5000);

  // Idempotent Append
  function appendTxSafe(tx) {
    if (!tx || !tx.id || __SEEN_TX__.has(tx.id)) return;
    __SEEN_TX__.add(tx.id);
    window.__LEDGER__.txs.push(tx);
    window.__LEDGER_BUS__.emit({ type: 'tx:committed', tx });
  }

  // Validation (Anti Double Spend)
  function computeLedgerBalance(userId, asset) {
    let balance = 0;
    const seriesKey = TAB_MAP[asset] || asset;
    
    const snapshot = (window.AssetBus && typeof window.AssetBus.snapshot === 'function') ? window.AssetBus.snapshot() : null;
    if (snapshot && snapshot[seriesKey]) {
      balance = snapshot[seriesKey].length;
    }

    for (const tx of window.__LEDGER__.txs) {
      if (tx.asset !== asset || tx.status === 'failed') continue;
      if (tx.to === userId) balance += (tx.amount || 0);
      if (tx.from === userId) balance -= (tx.amount || 0);
    }

    return balance;
  }
  window.computeLedgerBalance = computeLedgerBalance;

  function validateTx(tx) {
    const balance = computeLedgerBalance(tx.from, tx.asset);
    if (balance < (tx.amount || 1)) {
      console.error('[LEDGER BLOCK] double spend prevented', tx);
      throw new Error('DOUBLE_SPEND');
    }
  }
  window.validateTx = validateTx;

  // FIX: Improved updateSendButtonState with better auth checking
  async function updateSendButtonState() {
    const sendBtn = document.querySelector('#safe-send-btn');
    if (!sendBtn) return;
    
    const n = (window.__SAFE_SELECTED_CODES__ && window.__SAFE_SELECTED_CODES__.size) || 0;
    const auth = getAuthState();
    const authReady = auth.authenticated;
    const selectionReady = n > 0;
    
    const snapshot = (window.AssetBus && typeof window.AssetBus.snapshot === 'function') ? window.AssetBus.snapshot() : null;
    const tab = window.ACTIVE_ASSET_TAB || 'codes';
    const list = snapshot ? snapshot[TAB_MAP[tab] || tab] : [];
    const syncReady = (Array.isArray(list) && list.length > 0) || window.__NEON_SYNC_READY__ === true;

    const canSend = window.safeAssetsState.enabled && authReady && selectionReady && syncReady;
    
    sendBtn.disabled = !canSend;
    sendBtn.style.display = selectionReady ? 'inline-flex' : 'none';
    
    // FIX: Update button text to show count
    if (selectionReady) {
      sendBtn.textContent = n > 1 ? `Send (${n})` : 'Send';
    }
    
    // FIX: Log state for debugging
    if (!canSend && selectionReady) {
      console.log('[SEND BUTTON] Disabled because:', {
        enabled: window.safeAssetsState.enabled,
        authReady,
        selectionReady,
        syncReady,
        authState: auth
      });
    }
  }

  // FIX: Improved waitForAuth that checks multiple sources
  function waitForAuth(timeout = 5000) {
    return new Promise((resolve, reject) => {
      // Check immediately
      if (isAuthReady()) {
        console.log('[AUTH] Already authenticated');
        return resolve(getAuthState());
      }

      let done = false;
      const onAuth = (e) => {
        if (done) return;
        const auth = getAuthState();
        if (auth.authenticated) {
          done = true;
          window.removeEventListener('auth:ready', onAuth);
          resolve(auth);
        }
      };

      window.addEventListener('auth:ready', onAuth);

      // Also poll for auth state changes
      const pollInterval = setInterval(() => {
        if (done) {
          clearInterval(pollInterval);
          return;
        }
        const auth = getAuthState();
        if (auth.authenticated) {
          done = true;
          clearInterval(pollInterval);
          window.removeEventListener('auth:ready', onAuth);
          resolve(auth);
        }
      }, 200);

      setTimeout(() => {
        if (done) return;
        done = true;
        clearInterval(pollInterval);
        window.removeEventListener('auth:ready', onAuth);
        reject(new Error('Auth timeout'));
      }, timeout);
    });
  }

  // FIX: Properly handle auth:ready event
  window.onAuthComplete = function(userPayload) {
    window.authReady = true;
    window.__AUTH_READY__ = true;
    // FIX: Also set __AUTH_STATE__ for consistency
    window.__AUTH_STATE__ = {
      authenticated: true,
      userId: userPayload?.userId || userPayload?.id,
      sessionId: userPayload?.sessionId
    };
    console.log('[AUTH] ready ->', userPayload && (userPayload.userId || userPayload.id));
    updateSendButtonState();
  };

  window.addEventListener('auth:ready', (e) => {
    console.log('[AUTH] auth:ready event received', e.detail);
    window.authReady = true;
    window.__AUTH_READY__ = true;
    // FIX: Sync __AUTH_STATE__ from event
    if (e.detail) {
      window.__AUTH_STATE__ = {
        authenticated: e.detail.authenticated,
        userId: e.detail.userId,
        sessionId: e.detail.sessionId
      };
    }
    updateSendButtonState();
  });

  document.addEventListener('AuthReady', () => {
    console.log('[SEND BUTTON] AuthReady event received');
    updateSendButtonState();
  });

  // Local-First Transaction Queue
  const TransactionQueue = {
    KEY: 'safe_pending_txs',
    MAX_RETRIES: 10,
    
    generateId() {
      return 'tx_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8);
    },
    
    getAll() {
      try { 
        return JSON.parse(localStorage.getItem(this.KEY) || '[]'); 
      } catch(_) { 
        return []; 
      }
    },
    
    save(arr) {
      try { 
        localStorage.setItem(this.KEY, JSON.stringify(arr)); 
      } catch(_) {}
    },
    
    store(tx) {
      const record = {
        id: tx.id || this.generateId(),
        codes: Array.isArray(tx.codes) ? tx.codes.slice() : [tx.codes],
        to: tx.to,
        status: 'pending',
        syncStatus: 'queued',
        createdAt: Date.now(),
        retries: 0
      };
      const arr = this.getAll();
      arr.push(record);
      this.save(arr);
      console.log('[TX-QUEUE] Stored locally:', record.id, 'codes:', record.codes.length);
      return record;
    },
    
    update(id, updates) {
      const arr = this.getAll();
      const idx = arr.findIndex(t => t.id === id);
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...updates, updatedAt: Date.now() };
        this.save(arr);
        if (updates.syncStatus === 'synced') {
          arr.splice(idx, 1);
          this.save(arr);
          console.log('[TX-QUEUE] Completed:', id);
        }
      }
    },
    
    async syncOne(tx) { 
      return await sendTx(tx); 
    },
    
    async retryAll() {
      const arr = this.getAll();
      if (!arr.length) return;
      console.log('[TX-QUEUE] Retrying', arr.length, 'pending');
      for (const tx of arr) {
        if ((tx.retries || 0) < this.MAX_RETRIES) {
          await this.syncOne(tx);
          await new Promise(r => setTimeout(r, 300));
        }
      }
    },
    
    count() { 
      return this.getAll().length; 
    }
  };
  window.TransactionQueue = TransactionQueue;

  // Neon Adapter
  if (!window.neonAdapter) {
    window.neonAdapter = {
      syncedCodes: new Set(),
      pendingWrites: [],
      isSynced(code) { 
        try { 
          return this.syncedCodes.has(String(code)); 
        } catch(_) { 
          return false;
        }
      },
      refreshFromSnapshot() { 
        try { 
          const snap = (window.AssetBus && typeof window.AssetBus.snapshot === 'function') ? window.AssetBus.snapshot() : null;
          const arr = Array.isArray(snap && snap.codes) ? snap.codes : [];
          const before = this.syncedCodes || new Set();
          if (!arr || arr.length === 0) return;
          const next = new Set();
          arr.forEach(c => {
            const code = typeof c === 'string' ? c : (c && c.code) || '';
            if (code) next.add(String(code));
          });
          this.syncedCodes = next;
          try {
            next.forEach(c => {
              if (!before.has(c)) this.checkPendingTx(String(c));
            });
          } catch(_) {}
        } catch(_) {}
      },
      syncExistingCodes() {
        try {
          const els = document.querySelectorAll('.safe-item');
          els.forEach(el => {
            const code = String(el && el.dataset && el.dataset.code || '');
            if (code) {
              try { this.syncedCodes.add(code); } catch(_) {}
            }
          });
        } catch(_) {}
      },
      checkPendingTx(code) {
        try {
          const tx = (window.SafeAssetQueue && typeof window.SafeAssetQueue.getPendingTx === 'function') 
            ? window.SafeAssetQueue.getPendingTx(String(code)) 
            : null;
          if (tx) window.SafeAssetQueue.sendTxWhenSynced(tx);
        } catch(_) {}
      },
      retryPendingWrites() {
        try {
          const arr = Array.isArray(this.pendingWrites) ? this.pendingWrites.slice() : [];
          arr.forEach(c => {
            if (this.isSynced(c)) {
              this.pendingWrites = this.pendingWrites.filter(x => x !== c);
              this.checkPendingTx(c);
            }
          });
        } catch(_) {}
      }
    };
  }

  function hydrateSyncedCodesFromSnapshot() {
    try {
      const snap = (window.AssetBus && typeof window.AssetBus.snapshot === 'function') ? window.AssetBus.snapshot() : null;
      const arr = Array.isArray(snap && snap.codes) ? snap.codes : [];
      if (!window.neonAdapter) window.neonAdapter = {};
      if (!window.neonAdapter.syncedCodes) window.neonAdapter.syncedCodes = new Set();
      
      if (!window.__SYNC_INITIALIZED__ && Array.isArray(arr) && arr.length > 0) {
        window.neonAdapter.syncedCodes = new Set(arr.map(c => 
          typeof c === 'string' ? c : (c && c.code) || ''
        ).filter(Boolean).map(String));
        window.__SYNC_INITIALIZED__ = true;
      } else {
        arr.forEach(c => {
          const code = typeof c === 'string' ? c : (c && c.code) || '';
          if (code) window.neonAdapter.syncedCodes.add(String(code));
        });
      }
    } catch(e) {
      console.error('[SYNC FIX ERROR]', e);
    }
  }
  
  try { 
    hydrateSyncedCodesFromSnapshot(); 
  } catch(_) {}

  // Safe Asset Queue
  if (!window.SafeAssetQueue) {
    window.SafeAssetQueue = {
      queue: [],
      waiting: {},
      storeTx(tx) {
        try {
          this.queue.push(tx);
          try { localStorage.setItem(tx.id, JSON.stringify(tx)); } catch(_) {}
        } catch(_) {}
      },
      getPendingTx(code) {
        try {
          const s = String(code);
          return this.queue.find(t => Array.isArray(t && t.codes) && t.codes.some(c => String(c) === s));
        } catch(_) { 
          return null;
        }
      },
      processTx(tx) {
        try {
          const isSynced = (code) => {
            try {
              return !!(window.neonAdapter && window.neonAdapter.syncedCodes && window.neonAdapter.syncedCodes.has(String(code)));
            } catch(_) { 
              return false;
            }
          };
          
          let missing = Array.isArray(tx && tx.codes) ? tx.codes.filter(c => !isSynced(c)) : [];
          
          if (missing.length) {
            try {
              missing.forEach(c => {
                try {
                  console.warn('[SYNC BYPASS] trusting snapshot for code:', String(c));
                  if (window.neonAdapter && window.neonAdapter.syncedCodes) {
                    window.neonAdapter.syncedCodes.add(String(c));
                  }
                } catch(_) {}
              });
            } catch(_) {}
            missing = Array.isArray(tx && tx.codes) ? tx.codes.filter(c => !isSynced(c)) : [];
          }
          
          if (!missing.length) {
            sendTx(tx);
            return;
          }
          
          missing.forEach(code => {
            const k = String(code);
            if (!this.waiting[k]) this.waiting[k] = [];
            this.waiting[k].push(tx);
          });
        } catch(_) {}
      },
      onCodeSynced(code) {
        try {
          const k = String(code);
          const list = this.waiting && this.waiting[k];
          if (!list) return;
          const arr = list.slice();
          delete this.waiting[k];
          arr.forEach(tx => {
            try { this.processTx(tx); } catch(_) {}
          });
        } catch(_) {}
      },
      async sendTxWhenSynced(tx) {
        return this.processTx(tx);
      }
    };
  }

  // Bankode Events
  try {
    if (!window.BankodeEvents) {
      window.BankodeEvents = {
        listeners: {},
        on(e, cb) {
          if (!this.listeners[e]) this.listeners[e] = [];
          this.listeners[e].push(cb);
        },
        emit(e, p) {
          (this.listeners[e] || []).forEach(fn => {
            try { fn(p); } catch(e) {}
          });
        }
      };
    }
    
    if (window.BankodeEvents && typeof window.BankodeEvents.on === 'function') {
      window.BankodeEvents.on('NEON_CODE_SYNCED', function(payload) {
        try {
          const code = payload && payload.code ? String(payload.code) : null;
          if (!code) return;
          
          const list = Array.isArray(window.NEON_CODES) ? window.NEON_CODES : [];
          if (list.indexOf(code) === -1) {
            window.NEON_CODES = list.concat([code]);
          }
          
          if (window.neonAdapter && window.neonAdapter.syncedCodes) {
            try { window.neonAdapter.syncedCodes.add(code); } catch(_) {}
          }
          
          try {
            if (typeof addCodeToUI === 'function') {
              const mt = (payload && payload.meta) || {};
              addCodeToUI({ 
                code: code, 
                type: (mt.assetType || 'codes'), 
                fromAdmin: !!mt.from_admin || mt.source === 'external' 
              });
            }
          } catch(_) {}
          
          try {
            if (window.SafeAssetQueue && window.SafeAssetQueue.waiting && window.SafeAssetQueue.waiting[code]) {
              const arr = window.SafeAssetQueue.waiting[code].slice();
              delete window.SafeAssetQueue.waiting[code];
              arr.forEach(tx => {
                try {
                  const stillMissing = Array.isArray(tx && tx.codes) 
                    ? tx.codes.filter(c => !(window.neonAdapter && window.neonAdapter.isSynced && window.neonAdapter.isSynced(String(c))))
                    : [];
                  if (!stillMissing.length) {
                    console.log('[Queue] Sending unlocked tx:', tx.id);
                    sendTx(tx);
                  } else {
                    stillMissing.forEach(c2 => {
                      const k = String(c2);
                      if (!window.SafeAssetQueue.waiting[k]) window.SafeAssetQueue.waiting[k] = [];
                      window.SafeAssetQueue.waiting[k].push(tx);
                    });
                  }
                } catch(_) {}
              });
            }
          } catch(_) {}
          
          try {
            if (typeof updateNeonSyncIndicator === 'function') updateNeonSyncIndicator();
          } catch(_) {}
        } catch(_) {}
      });
    }
  } catch(_) {}

  function retryTxLater(tx) {
    try {
      if (window.SafeAssetQueue && typeof window.SafeAssetQueue.processTx === 'function') {
        window.SafeAssetQueue.processTx(tx);
        return;
      }
    } catch(_) {}
    setTimeout(() => sendTx(tx), 1000);
  }

  // FIX: Improved sendTx with better auth handling
  async function sendTx(tx, retryAttempt = 0) {
    // Prevent concurrent sends
    if (window.__SENDING_TX__) {
      console.warn('[SEND BLOCKED] Already sending');
      return { success: false, error: 'sending_in_flight' };
    }
    
    // FIX: Check auth with multiple sources
    const auth = getAuthState();
    if (!auth.authenticated) {
      console.warn('[SEND BLOCKED] Auth not ready, waiting...');
      try {
        await waitForAuth();
        console.log('[SEND RETRY] Auth ready, proceeding with tx');
      } catch (e) {
        console.error('[SEND] Auth wait failed:', e);
        return { success: false, error: 'auth_timeout' };
      }
    }

    window.__SENDING_TX__ = true;
    
    try {
      const receiverEmail = tx && (tx.receiverEmail || tx.to);
      const codes = Array.isArray(tx && tx.codes) ? tx.codes.filter(Boolean) : [];
      
      if (!codes.length) {
        return { success: true };
      }

      const payload = { codes, receiverEmail };
      const idempotencyKey = (tx.id || '') + '_' + (tx.retries || 0) + '_' + retryAttempt;
      
      let res = await fetch('/api/send-codes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Idempotency-Key': idempotencyKey
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      console.log('[SEND RESPONSE STATUS]', res.status);

      // Auto session recovery
      if (res.status === 401) {
        console.warn('[SEND] Session invalid, attempting recovery...');
        try {
          if (window.AuthCore && typeof window.AuthCore.refresh === 'function') {
            await window.AuthCore.refresh();
          } else {
            await fetch('/api/auth/me', { credentials: 'include' });
          }
          
          console.log('[SEND] Retrying after recovery...');
          res = await fetch('/api/send-codes', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'X-Idempotency-Key': idempotencyKey + '_retry' 
            },
            credentials: 'include',
            body: JSON.stringify(payload)
          });
          
          if (!res.ok) {
            console.error('[SEND] Recovery failed, forcing logout UI');
            try { 
              if (window.AuthCore && window.AuthCore.logout) window.AuthCore.logout(); 
            } catch(_) {}
            throw new Error('SESSION_EXPIRED');
          }
        } catch (e) {
          console.error('[SEND] Recovery exception:', e);
          throw e;
        }
      }

      // Network retry with exponential backoff
      if (!res.ok && res.status >= 500 && retryAttempt < 2) {
        const delay = retryAttempt === 0 ? 300 : 800;
        console.warn(`[SEND] Server error ${res.status}, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        window.__SENDING_TX__ = false;
        return sendTx(tx, retryAttempt + 1);
      }

      const j = await res.json().catch(() => ({}));
      
      // Strict response validation
      if (res.ok && j && (j.success || j.ok)) {
        if (!j.txId || typeof j.newBalance !== 'number') {
          console.error('[FATAL SEND ERROR] Invalid server response structure', j);
          throw new Error('INVALID_SERVER_RESPONSE');
        }
        
        console.log('[SafeCode] Send success, enforcing Server Truth...');
        
        // Server is the only source of truth
        try {
          if (window.neonAdapter && typeof window.neonAdapter.fetchCodes === 'function') {
            const serverState = await window.neonAdapter.fetchCodes();
            if (serverState && serverState.ok) {
              window.dispatchEvent(new CustomEvent('neon:snapshot', { 
                detail: { 
                  latest: serverState.latest, 
                  rows: serverState.rows,
                  count: serverState.count
                } 
              }));
              
              // Anti-desync verification
              const localCount = (window.AssetBus && window.AssetBus.snapshot().count) || 0;
              if (localCount !== serverState.count) {
                console.error('[CRITICAL] STATE MISMATCH after send', { local: localCount, server: serverState.count });
                await forceFullResync();
              }
            }
          }
        } catch (e) {
          console.error('[SEND] Post-success sync failed:', e);
        }

        try { 
          TransactionQueue.update(tx.id, { status: 'sent', syncStatus: 'synced' }); 
        } catch(_) {}
        
        try {
          if (typeof window.forceFullResync === 'function') {
            await window.forceFullResync();
          } else if (typeof refreshAssetsFromServer === 'function') {
            await refreshAssetsFromServer();
          } else {
            window.dispatchEvent(new CustomEvent('neon:snapshot', { 
              detail: { forceRefresh: true } 
            }));
          }
        } catch (err) {
          console.error('[SEND] Post-transfer refresh failed:', err);
        }
        
        return { success: true, txId: j.txId, newBalance: j.newBalance };
      }
      
      console.error('[FATAL SEND ERROR] Send failed:', j);
      throw new Error(j.error || j.message || 'SEND_FAILED');

    } catch (err) {
      console.error('[FATAL SEND ERROR] Send exception:', err);
      try { 
        TransactionQueue.update(tx.id, { 
          status: 'pending', 
          syncStatus: 'failed', 
          lastError: String(err.message || err) 
        }); 
      } catch(_) {}
      return { success: false, error: err.message };
    } finally {
      // Always release lock with delay to prevent race conditions
      setTimeout(() => { 
        window.__SENDING_TX__ = false; 
      }, 300);
    }
  }

  // Expose globally
  window.sendTx = sendTx;
  window.forceFullResync = forceFullResync;

  async function forceFullResync() {
    console.log('[SafeCode] Forcing full state resync from server...');
    try {
      if (window.neonAdapter && typeof window.neonAdapter.fetchCodes === 'function') {
        const fresh = await window.neonAdapter.fetchCodes();
        if (fresh && fresh.ok) {
          window.dispatchEvent(new CustomEvent('neon:snapshot', { 
            detail: { 
              latest: fresh.latest, 
              rows: fresh.rows,
              count: fresh.count,
              ts: fresh.ts || Date.now()
            } 
          }));
          console.log('[SafeCode] Full resync completed successfully');
        }
      }
    } catch (e) {
      console.error('[SafeCode] Full resync failed:', e);
    }
  }

  // Main Renderer
  function renderSafeAssets(tab, container) {
    const snapshot = (window.AssetBus && typeof window.AssetBus.snapshot === 'function') ? window.AssetBus.snapshot() : null;
    if (!snapshot || !container || !container.appendChild) return;
    
    const seriesKey = TAB_MAP[tab] || 'codes';
    let list = Array.isArray(snapshot[seriesKey]) ? snapshot[seriesKey] : [];
    
    if ((!list || list.length === 0) && (seriesKey === 'silver' || seriesKey === 'gold')) {
      try {
        let raw = null;
        raw = window.safeStorage && typeof window.safeStorage.get === 'function' 
          ? window.safeStorage.get('safe_extras') 
          : localStorage.getItem('safe_extras');
        const extras = raw ? JSON.parse(raw) : [];
        list = extras.filter(x => x && x.type === seriesKey).map(x => x.code);
      } catch(_) { 
        list = []; 
      }
    }

    // Ledger Filter
    const committedCodes = new Set();
    if (window.__LEDGER__ && window.__LEDGER__.txs) {
      window.__LEDGER__.txs.forEach(tx => {
        if (tx.status === 'committed' && Array.isArray(tx.codes)) {
          tx.codes.forEach(c => committedCodes.add(String(c)));
        }
      });
    }
    
    list = list.filter(item => {
      const val = (item && typeof item === 'object') ? (item.code || '') : String(item || '');
      return !committedCodes.has(String(val));
    });

    const count = list.length;
    const last = count > 0 ? list[count - 1] : '—';
    if (seriesKey === 'codes') window.__SAFE_LAST_CODES_COUNT__ = count;
    
    renderHeader(tab, count, last, container);
    renderList(tab, list, container);
  }

  // Send Flow (Ledger-First)
  let __TX_LOCK__ = false;

  async function sendTxLedger(tx) {
    if (__TX_LOCK__) {
      throw new Error('TX_IN_PROGRESS');
    }

    __TX_LOCK__ = true;

    try {
      const auth = getAuthState();
      if (!auth.authenticated) {
        throw new Error('AUTH_REQUIRED');
      }

      tx.id = tx.id || (typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : 'tx_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8));
      tx.timestamp = Date.now();
      tx.from = auth.userId;
      tx.status = 'committed';

      validateTx(tx);
      appendTxSafe(tx);
      window.__PENDING_TX__.set(tx.id, tx);

      // Async sync (non-blocking)
      try {
        if (window.__FORCE_SYNC_FAIL__) {
          throw new Error('FORCED_SYNC_FAILURE');
        }

        if (window.__SOCKET__ && window.__SOCKET__.readyState === 1) {
          window.__SOCKET__.send(JSON.stringify({ type: 'tx:committed', tx }));
          tx.syncStatus = 'synced';
          window.__PENDING_TX__.delete(tx.id);
        } else {
          await sendTx(tx);
          tx.syncStatus = 'synced';
          window.__PENDING_TX__.delete(tx.id);
        }
      } catch(e) {
        console.warn('[LEDGER] Async sync failed, will retry', e);
      }
    } finally {
      __TX_LOCK__ = false;
    }
  }
  window.sendTxLedger = sendTxLedger;

  function renderHeader(tab, count, last, container) {
    // Implementation depends on your UI structure
    // This is a placeholder - replace with your actual UI rendering
  }

  function renderList(tab, list, container) {
    // Implementation depends on your UI structure
    // This is a placeholder - replace with your actual UI rendering
    
    // FIX: Bind send button after rendering
    setTimeout(() => {
      bindSendButton();
    }, 100);
  }

  // FIX: Improved bindSendButton with proper auth checking
  function bindSendButton() {
    const sendBtn = document.getElementById('safe-send-btn');
    if (!sendBtn || sendBtn.__bound) return;
    
    sendBtn.__bound = true;
    
    sendBtn.addEventListener('click', async function() {
      const auth = getAuthState();
      if (!auth.authenticated) {
        console.warn('[SEND] Cannot send - auth not ready');
        if (typeof showToast === 'function') {
          showToast('Please log in to send codes', 'error');
        }
        return;
      }
      
      const codes = Array.from(window.__SAFE_SELECTED_CODES__ || []);
      if (!codes.length) {
        if (typeof showToast === 'function') {
          showToast('Please select codes to send', 'warning');
        }
        return;
      }
      
      // Show email popup
      showEmailPopup(codes);
    });
    
    // Update button state
    updateSendButtonState();
  }

  function switchAssetTab(t){ 
    window.ACTIVE_ASSET_TAB=t; 
    window.SAFE_PAGE=1; 
    const cont=document.querySelector(CODEBANK_CONTAINER_SELECTOR); 
    if(cont) renderSafeAssets(t, cont); 
  }
  window.switchAssetTab = switchAssetTab;

  function initialRender(){ 
    const cont=document.querySelector(CODEBANK_CONTAINER_SELECTOR); 
    if(cont){ 
      renderSafeAssets(window.ACTIVE_ASSET_TAB||'codes', cont); 
    } 
  }

  // Export showEmailPopup
  window.showEmailPopup = function(codes) {
    console.log('[SafeAssetList] showEmailPopup called with:', codes);
    
    const indexPopup = document.getElementById('email-popup');
    if (indexPopup) {
      console.log('[SafeAssetList] Using indexCB.html email-popup');
      indexPopup.style.display = 'block';
      const emailInput = document.getElementById('receiver-email');
      const confirmSend = document.getElementById('confirm-send');
      if (emailInput) emailInput.value = '';
      if (confirmSend) confirmSend.dataset.codes = JSON.stringify(codes);
      return;
    }

    // Fallback
    ensureSendPopup(function() {
      const ov = document.getElementById('safe-send-overlay');
      if (!ov) {
        console.error('[SafeAssetList] Overlay not found after ensure');
        return;
      }
      ov.dataset.codes = JSON.stringify(Array.isArray(codes) ? codes : []);
      ov.style.display = 'flex';
      bindConfirm();
    });
  };

  function ensureSendPopup(afterCreate){
    const create = function(){
      if(document.getElementById('safe-send-style')==null){
        const s=document.createElement('style'); s.id='safe-send-style';
        s.textContent='#safe-send-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:10002}#safe-send-modal{background:#0b1220;color:#e5e7eb;border:1px solid rgba(255,255,255,.12);border-radius:10px;width:360px;max-width:90vw;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,.4)}#safe-send-modal h3{margin:0 0 8px 0;font-size:18px}#safe-send-modal input{width:100%;padding:10px;border-radius:6px;border:1px solid #243047;background:#0f172a;color:#e5e7eb;margin:8px 0}#safe-send-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}.safe-btn{padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:#111827;color:#e5e7eb;cursor:pointer}.safe-btn.primary{background:#2563eb;border-color:#1d4ed8}';
        if (document.head) document.head.appendChild(s);
      }
      if(document.getElementById('safe-send-overlay')) { if (typeof afterCreate==='function') afterCreate(); return; }
      const ov=document.createElement('div'); ov.id='safe-send-overlay';
      const m=document.createElement('div'); m.id='safe-send-modal';
      m.innerHTML='<h3>Send Codes</h3><div id="safe-send-body"><div style="font-size:12px;color:#94a3b8">Enter receiver email</div><input id="safe-send-email" type="email" placeholder="user@example.com" /></div><div id="safe-send-actions"><button id="safe-send-cancel" class="safe-btn">Cancel</button><button id="safe-send-confirm" class="safe-btn primary">Send</button></div>';
      ov.appendChild(m);
      if (document.body) document.body.appendChild(ov);
      document.getElementById('safe-send-cancel').onclick=function(){ ov.style.display='none'; };
      if (typeof afterCreate==='function') afterCreate();
    };
    if (!document.body) { document.addEventListener('DOMContentLoaded', create, { once:true }); return; }
    create();
  }

  function bindConfirm(){
    const btn=document.getElementById('safe-send-confirm');
    if(!btn){ document.addEventListener('DOMContentLoaded', bindConfirm, { once:true }); return; }
    if(btn.__bound) return; btn.__bound=true;
    btn.addEventListener('click', async function(){
      const ov=document.getElementById('safe-send-overlay');
      const codes=JSON.parse(ov.dataset.codes||'[]');
      const email=(document.getElementById('safe-send-email').value||'').trim();
      if(!email||!codes.length){ return; }

      // Use sendTxLedger
      try {
        await sendTxLedger({
          to: email,
          asset: window.ACTIVE_ASSET_TAB || 'codes',
          amount: codes.length,
          codes: codes.slice()
        });
        ov.style.display='none';
        if (typeof showToast === 'function') showToast('Transaction committed to ledger', 'success');
      } catch (err) {
        console.error('[LEDGER SEND ERROR]', err);
        if (typeof showToast === 'function') showToast('Commit failed: ' + err.message, 'error');
      }
    });
  }
  bindConfirm();

  // Initialize
  try {
    window.__NEON_SYNC_READY__ = false;
    try { if (typeof hydrateSyncedCodesFromSnapshot==='function') hydrateSyncedCodesFromSnapshot(); } catch(_){ }
    try { if (window.neonAdapter && typeof window.neonAdapter.refreshFromSnapshot==='function') window.neonAdapter.refreshFromSnapshot(); } catch(_){ }
    try { if (window.neonAdapter && typeof window.neonAdapter.syncExistingCodes==='function') window.neonAdapter.syncExistingCodes(); } catch(_){ }
    window.__NEON_SYNC_READY__=true;
  } catch(_){ }

  // Event listeners
  ;['assets:changed','assets:updated','assets:hydrated'].forEach(evt=>{
    window.addEventListener(evt, ()=>{
      try{
        try { if (typeof hydrateSyncedCodesFromSnapshot==='function') hydrateSyncedCodesFromSnapshot(); } catch(_){ }
        window.__NEON_SYNC_READY__=true;
        try { if (window.neonAdapter && typeof window.neonAdapter.refreshFromSnapshot==='function') window.neonAdapter.refreshFromSnapshot(); } catch(_){ }
      }catch(_){ }
      const cont=document.querySelector(CODEBANK_CONTAINER_SELECTOR);
      if(cont){ renderSafeAssets(window.ACTIVE_ASSET_TAB||'codes', cont); }
      updateSendButtonState();
    });
  });

  try { 
    window.addEventListener('online', function(){ 
      try { 
        if (window.TransactionQueue && typeof window.TransactionQueue.retryAll==='function') 
          window.TransactionQueue.retryAll(); 
      } catch(_){} 
      try { 
        if (window.Bankode && typeof window.Bankode.retryTxQueue==='function') 
          window.Bankode.retryTxQueue(); 
      } catch(_){} 
    }); 
    
    window.addEventListener('auth:ready', function(e){ 
      // FIX: Update auth state on auth:ready
      if (e.detail) {
        window.__AUTH_STATE__ = {
          authenticated: e.detail.authenticated,
          userId: e.detail.userId,
          sessionId: e.detail.sessionId
        };
        window.__AUTH_READY__ = e.detail.authenticated;
        window.authReady = e.detail.authenticated;
      }
      
      try { 
        var ok=!!(e&&e.detail&&e.detail.authenticated); 
        if(ok && navigator.onLine && window.TransactionQueue && typeof window.TransactionQueue.retryAll==='function') 
          window.TransactionQueue.retryAll(); 
      } catch(_){} 
      try { 
        if (ok && navigator.onLine && window.Bankode && typeof window.Bankode.retryTxQueue==='function') 
          window.Bankode.retryTxQueue(); 
      } catch(_){} 
      
      // FIX: Update send button state
      updateSendButtonState();
    }); 
  } catch(_){ }

  // Retry timer
  try { 
    if (!window.__TX_RETRY_TIMER__) { 
      window.__TX_RETRY_TIMER__ = setInterval(function(){ 
        try { 
          if (navigator.onLine && window.TransactionQueue && typeof window.TransactionQueue.retryAll==='function') 
            window.TransactionQueue.retryAll(); 
        } catch(_){} 
        try { 
          if (navigator.onLine && window.Bankode && typeof window.Bankode.retryTxQueue==='function') 
            window.Bankode.retryTxQueue(); 
        } catch(_){} 
      }, 15000); 
    } 
  } catch(_){ }

  console.log('[SafeAssetList] Fixed version loaded');
})();
