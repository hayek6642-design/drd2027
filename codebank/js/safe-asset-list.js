// safe-asset-list.js - DIRECT ASSETBUS ACCESS VERSION
(function() {
    'use strict';

    // ========================
    // Configuration & State
    // ========================
    const PAGE_SIZE = 10;
    const TAB_MAP = { codes: 'codes', silver: 'silver', gold: 'gold' };
    const TITLE_MAP = { codes: 'Safe Codes', silver: 'Silver Bars', gold: 'Gold Bars' };
    const ASSET_ICONS = {
      codes: 'https://cdn-icons-png.flaticon.com/512/1048/1048453.png',
      silver: 'https://cdn-icons-png.flaticon.com/512/3135/3135783.png',
      gold: 'https://cdn-icons-png.flaticon.com/512/2489/2489745.png'
    };
    const CODEBANK_CONTAINER_SELECTOR = '#safe-assets-container';
    const _tabCache = {}; // Per-tab data cache to survive snapshot gaps during tab switches

    // Consolidate rendering to renderSafeAssets
    function bruteForceManifest() {
        console.log('[SafeCode] Triggering render via consolidated logic...');
        const cont = document.querySelector(CODEBANK_CONTAINER_SELECTOR);
        if (cont) {
            renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont);
        }
        return true;
    }
    
    function showEmptyState() {
        // Redundant, handled by renderList
        console.log('[SafeCode] showEmptyState called (delegating to renderList)');
        const cont = document.querySelector(CODEBANK_CONTAINER_SELECTOR);
        if (cont) {
            renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont);
        }
    }

    // Event-driven updates - render when assets are updated or snapshot is received
    window.addEventListener('assets:updated', (e) => {
        console.log('[SafeCode] assets:updated event received');
        const cont = document.querySelector(CODEBANK_CONTAINER_SELECTOR);
        if (cont) renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont);
    });

    window.addEventListener('sqlite:snapshot', (e) => {
        console.log('[SafeCode] sqlite:snapshot event received');
        const cont = document.querySelector(CODEBANK_CONTAINER_SELECTOR);
        if (cont) renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont);
    });

  // Initial data load
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
          console.log('[SafeCode] Initial render triggered');
          initialRender();
      }, { once: true });
  } else {
      initialRender();
  }

    // Prevent duplicate initialization
    if (window.__SAFE_LIST_INITIALIZED__) return;
    window.__SAFE_LIST_INITIALIZED__ = true;

  window.ACTIVE_ASSET_TAB = window.ACTIVE_ASSET_TAB || 'codes';
  window.SAFE_PAGE = window.SAFE_PAGE || 1;
  window.__SAFE_RENDER_PENDING__ = false;
  window.__SAFE_INIT_ATTEMPTS__ = 0;
  window.__SQLITE_SYNC_READY__ = false;
  window.LOCAL_CODES = Array.isArray(window.LOCAL_CODES) ? window.LOCAL_CODES : [];
  
  // 7️⃣ Stabilize UI Refresh - Debounce
  let refreshTimer;
  function refreshUI(tab, container) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      renderSafeAssets(tab, container);
    }, 100);
  }
  window.refreshSafeUI = refreshUI;

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

  // Wait for SafeAssetList to be ready using event
  function waitForSyncedCodes(timeout = 5000) {
    return new Promise((resolve) => {
      console.log('[SAFE-UI] Waiting for safeAssetList:ready event...');
      
      // Check if already ready
      const checkIfReady = () => {
        const snapshot = (window.AssetBus && typeof window.AssetBus.snapshot==='function') ? window.AssetBus.snapshot() : null;
        if (snapshot) {
          const tab = window.ACTIVE_ASSET_TAB || 'codes';
          const seriesKey = TAB_MAP[tab] || tab;
          if (Array.isArray(snapshot[seriesKey]) && snapshot[seriesKey].length > 0) {
            console.log('[SAFE-UI] Codes ready for display');
            resolve(true);
            return true;
          }
        }
        return false;
      };
      
      if (checkIfReady()) {
        return;
      }
      
      // Listen for ready event
      const handleReady = () => {
        console.log('[SAFE-UI] safeAssetList:ready event received');
        resolve(true);
      };
      
      window.addEventListener('safeAssetList:ready', handleReady);
      
      // Timeout fallback
      setTimeout(() => {
        window.removeEventListener('safeAssetList:ready', handleReady);
        console.warn('[SAFE-UI] Timeout waiting for safeAssetList:ready');
        resolve(false);
      }, timeout);
    });
  }

  // 🔄 UI Self-Healing & Auto-Refresh
  function startSafeUISelfHealing() {
    setInterval(async () => {
      const cont = document.querySelector(CODEBANK_CONTAINER_SELECTOR);
      if (!cont) return;

      // 🛡️ RE-SYNC WITH ASSETBUS Snapshot
      const snapshot = (window.AssetBus && typeof window.AssetBus.snapshot==='function') ? window.AssetBus.snapshot() : null;
      
      // If snapshot is missing, try to get from window.top (Bridge fallback)
      const authoritativeData = snapshot || (window.top && typeof window.top.GET_AUTHORITATIVE_ASSETS === 'function' ? window.top.GET_AUTHORITATIVE_ASSETS() : null);
      
      if (authoritativeData) {
          const currentCount = authoritativeData.codes?.length || 0;
          const uiItems = cont.querySelectorAll('.asset-item:not(.empty-state)').length;

          // If UI doesn't match the snapshot, force a re-render
          if (currentCount > 0 && uiItems === 0) {
              console.log('[Safe-UI] Healing: UI empty but authoritative data exists, re-rendering...');
              renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont, authoritativeData);
          }
      } else {
          // If no authoritative data, check StorageAdapter directly as last resort
          if (window.StorageAdapter) {
            const actualCount = await window.StorageAdapter.getCodeCount();
            if (actualCount > 0) {
              console.log('[Safe-UI] Healing: No authoritative data, but StorageAdapter has codes. Triggering AssetBus sync...');
              if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
                  window.AssetBus.sync();
              }
            }
          }
      }
    }, 5000);
  }
  startSafeUISelfHealing();

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
  async function forceSqliteToMatchLedger(userId, assetType) {
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

  // ========================================
  // FIXED: Update Send Button State
  // ========================================
  function updateSendButtonState() {
    const sendBtn = document.getElementById('safe-send-btn');
    if (!sendBtn) return;

    const n = (window.__SAFE_SELECTED_CODES__ && window.__SAFE_SELECTED_CODES__.size) || 0;
    const auth = getAuthState();
    const authReady = auth.authenticated;

    // Always show button if codes are selected
    if (n === 0) {
      sendBtn.style.display = 'none';
      return;
    }

    sendBtn.style.display = 'inline-flex';
    
    // 🛡️ FIX: Enable button if we have selection and auth
    // Remove the strict safeAssetsState.enabled check that was blocking
    const canSend = authReady && n > 0;
    
    sendBtn.disabled = !canSend;
    
    if (!canSend) {
      sendBtn.classList.add('disabled');
      sendBtn.style.opacity = '0.5';
      sendBtn.style.cursor = 'not-allowed';
      sendBtn.title = authReady ? 'Select codes to send' : 'Please log in';
    } else {
      sendBtn.classList.remove('disabled');
      sendBtn.style.opacity = '1';
      sendBtn.style.cursor = 'pointer';
      sendBtn.title = `Send ${n} code(s)`;
    }

    // Update button text
    sendBtn.textContent = n > 1 ? `Send (${n})` : 'Send';
    
    // 🛡️ FIX: Ensure click handler is bound
    attachSendHandler(sendBtn);
  }

  // ========================================
  // NEW: Proper Send Handler Attachment
  // ========================================
  function attachSendHandler(btn) {
    // Remove existing handlers to prevent duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[SEND] Button clicked');
      
      const auth = getAuthState();
      if (!auth.authenticated) {
        console.warn('[SEND] Cannot send - auth not ready');
        showToast('Please log in to send codes', 'error');
        return;
      }
      
      const codes = Array.from(window.__SAFE_SELECTED_CODES__ || []);
      if (!codes.length) {
        showToast('Please select codes to send', 'warning');
        return;
      }
      
      console.log('[SEND] Opening email popup for codes:', codes);
      showEmailPopup(codes);
    });
    
    // Update reference
    const controls = document.querySelector('.safe-pagination');
    if (controls) {
      const oldBtn = controls.querySelector('#safe-send-btn');
      if (oldBtn && oldBtn !== newBtn) {
        oldBtn.replaceWith(newBtn);
      }
    }
  }

  // ========================================
  // FIXED: Send Transaction with proper unlock
  // ========================================
  async function sendTxLedger(tx) {
    // Prevent concurrent sends with timeout-based recovery
    if (__TX_LOCK__) {
      console.warn('[SEND] Transaction already in progress, waiting...');
      // Wait a bit and retry
      await new Promise(r => setTimeout(r, 500));
      if (__TX_LOCK__) {
        throw new Error('TX_IN_PROGRESS');
      }
    }

    __TX_LOCK__ = true;
    
    // Auto-release lock after 30 seconds to prevent permanent lock
    const lockTimeout = setTimeout(() => {
      console.error('[SEND] Transaction lock timeout - forcing release');
      __TX_LOCK__ = false;
    }, 30000);

    try {
      const auth = getAuthState();
      if (!auth.authenticated) {
        throw new Error('AUTH_REQUIRED');
      }

      // Generate transaction ID
      tx.id = tx.id || (typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : 'tx_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8));
      tx.timestamp = Date.now();
      tx.from = auth.userId;
      tx.status = 'committed';

      // Validate
      validateTx(tx);
      appendTxSafe(tx);
      window.__PENDING_TX__.set(tx.id, tx);

      // Async sync (non-blocking)
      try {
        await sendTx(tx);
        tx.syncStatus = 'synced';
        window.__PENDING_TX__.delete(tx.id);
        showToast('Codes sent successfully!', 'success');
      } catch(e) {
        console.warn('[LEDGER] Async sync failed, will retry', e);
        tx.syncStatus = 'pending';
        // Queue for retry
        retryTxLater(tx);
        showToast('Send queued - will retry automatically', 'info');
      }
      
      // Clear selection after send attempt
      window.__SAFE_SELECTED_CODES__.clear();
      updateSendButtonState();
      
      // Refresh the list
      const cont = document.querySelector(CODEBANK_CONTAINER_SELECTOR);
      if (cont) {
        renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont);
      }
      
    } finally {
      clearTimeout(lockTimeout);
      __TX_LOCK__ = false;
    }
  }

  // ========================================
  // FIXED: Email Popup with proper handlers
  // ========================================
  window.showEmailPopup = function(codes) {
    console.log('[SafeAssetList] showEmailPopup called with:', codes);
    
    // Use the dedicated popup if available
    ensureSendPopup(function() {
      const ov = document.getElementById('safe-send-overlay');
      if (!ov) {
        console.error('[SafeAssetList] Overlay not found after ensure');
        return;
      }
      
      // Store codes
      ov.dataset.codes = JSON.stringify(Array.isArray(codes) ? codes : []);
      
      // Update UI to show selected codes
      const body = document.getElementById('safe-send-body');
      if (body) {
        body.innerHTML = `
          <div style="margin-bottom: 10px; padding: 8px; background: rgba(37,99,235,0.1); border-radius: 6px;">
            <strong>Sending ${codes.length} code(s):</strong>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
              ${codes.slice(0, 3).join(', ')}${codes.length > 3 ? ` and ${codes.length - 3} more...` : ''}
            </div>
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">Enter receiver email</div>
          <input id="safe-send-email" type="email" placeholder="user@example.com" style="width: 100%;" />
        `;
      }
      
      ov.style.display = 'flex';
      
      // Bind confirm button
      bindConfirmHandler();
    });
  };

  function bindConfirmHandler() {
    const btn = document.getElementById('safe-send-confirm');
    if (!btn) return;
    
    // Prevent duplicate bindings
    if (btn.__bound) return;
    btn.__bound = true;
    
    btn.addEventListener('click', async function() {
      const ov = document.getElementById('safe-send-overlay');
      const codes = JSON.parse(ov?.dataset?.codes || '[]');
      const emailInput = document.getElementById('safe-send-email');
      const email = emailInput?.value?.trim();
      
      if (!email) {
        showToast('Please enter a valid email', 'error');
        return;
      }
      if (!codes.length) {
        showToast('No codes selected', 'error');
        return;
      }

      // Show loading state
      btn.disabled = true;
      btn.textContent = 'Sending...';

      try {
        await sendTxLedger({
          to: email,
          receiverEmail: email, // Both for compatibility
          asset: window.ACTIVE_ASSET_TAB || 'codes',
          amount: codes.length,
          codes: codes.slice()
        });
        
        ov.style.display = 'none';
        // Clear selection
        window.__SAFE_SELECTED_CODES__.clear();
        updateSendButtonState();
        
      } catch (err) {
        console.error('[SEND ERROR]', err);
        showToast('Send failed: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send';
      }
    });
  }

  // ========================================
  // FIXED: Ensure popup exists
  // ========================================
  function ensureSendPopup(afterCreate) {
    const create = function() {
      if (document.getElementById('safe-send-style') == null) {
        const s = document.createElement('style');
        s.id = 'safe-send-style';
        s.textContent = `
          #safe-send-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: none; align-items: center; justify-content: center; z-index: 10002; backdrop-filter: blur(4px); }
          #safe-send-modal { background: #0b1220; color: #e5e7eb; border: 1px solid rgba(255,255,255,.15); border-radius: 12px; width: 400px; max-width: 90vw; padding: 20px; box-shadow: 0 12px 40px rgba(0,0,0,.5); }
          #safe-send-modal h3 { margin: 0 0 12px 0; font-size: 18px; color: #fff; }
          #safe-send-body { margin-bottom: 16px; }
          #safe-send-body input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #243047; background: #0f172a; color: #e5e7eb; font-size: 14px; box-sizing: border-box; }
          #safe-send-body input:focus { outline: none; border-color: #2563eb; }
          #safe-send-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
          .safe-btn { padding: 10px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,.18); background: #111827; color: #e5e7eb; cursor: pointer; font-size: 14px; transition: all 0.2s; }
          .safe-btn:hover { background: #1f2937; }
          .safe-btn.primary { background: #2563eb; border-color: #1d4ed8; color: white; }
          .safe-btn.primary:hover { background: #1d4ed8; }
          .safe-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        `;
        if (document.head) document.head.appendChild(s);
      }
      
      if (document.getElementById('safe-send-overlay')) {
        if (typeof afterCreate === 'function') afterCreate();
        return;
      }
      
      const ov = document.createElement('div');
      ov.id = 'safe-send-overlay';
      ov.innerHTML = `
        <div id="safe-send-modal">
          <h3>Send Codes</h3>
          <div id="safe-send-body">
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">Enter receiver email</div>
            <input id="safe-send-email" type="email" placeholder="user@example.com" />
          </div>
          <div id="safe-send-actions">
            <button id="safe-send-cancel" class="safe-btn">Cancel</button>
            <button id="safe-send-confirm" class="safe-btn primary">Send</button>
          </div>
        </div>
      `;
      
      if (document.body) document.body.appendChild(ov);
      
      // Bind cancel
      document.getElementById('safe-send-cancel').addEventListener('click', function() {
        ov.style.display = 'none';
      });
      
      if (typeof afterCreate === 'function') afterCreate();
    };
    
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', create, { once: true });
      return;
    }
    create();
  }

  // Simple toast notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'safe-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10003;
      font-size: 14px;
      animation: fadeIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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

  // Sqlite Adapter
  if (!window.sqliteAdapter) {
    window.sqliteAdapter = {
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
      if (!window.sqliteAdapter) window.sqliteAdapter = {};
      if (!window.sqliteAdapter.syncedCodes) window.sqliteAdapter.syncedCodes = new Set();
      
      if (!window.__SYNC_INITIALIZED__ && Array.isArray(arr) && arr.length > 0) {
        window.sqliteAdapter.syncedCodes = new Set(arr.map(c => 
          typeof c === 'string' ? c : (c && c.code) || ''
        ).filter(Boolean).map(String));
        window.__SYNC_INITIALIZED__ = true;
      } else {
        arr.forEach(c => {
          const code = typeof c === 'string' ? c : (c && c.code) || '';
          if (code) window.sqliteAdapter.syncedCodes.add(String(code));
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
              return !!(window.sqliteAdapter && window.sqliteAdapter.syncedCodes && window.sqliteAdapter.syncedCodes.has(String(code)));
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
                  if (window.sqliteAdapter && window.sqliteAdapter.syncedCodes) {
                    window.sqliteAdapter.syncedCodes.add(String(c));
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
      window.BankodeEvents.on('SQLITE_CODE_SYNCED', function(payload) {
        try {
          const code = payload && payload.code ? String(payload.code) : null;
          if (!code) return;
          
          const list = Array.isArray(window.LOCAL_CODES) ? window.LOCAL_CODES : [];
          if (list.indexOf(code) === -1) {
            window.LOCAL_CODES = list.concat([code]);
          }
          
          if (window.sqliteAdapter && window.sqliteAdapter.syncedCodes) {
            try { window.sqliteAdapter.syncedCodes.add(code); } catch(_) {}
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
                    ? tx.codes.filter(c => !(window.sqliteAdapter && window.sqliteAdapter.isSynced && window.sqliteAdapter.isSynced(String(c))))
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
            if (typeof updateSqliteSyncIndicator === 'function') updateSqliteSyncIndicator();
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
      
      let res = await fetch('/api/codes/send-codes', {
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
          res = await fetch('/api/codes/send-codes', {
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
          if (window.sqliteAdapter && typeof window.sqliteAdapter.fetchCodes === 'function') {
            const serverState = await window.sqliteAdapter.fetchCodes();
            if (serverState && serverState.ok) {
              window.dispatchEvent(new CustomEvent('sqlite:snapshot', { 
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
            window.dispatchEvent(new CustomEvent('sqlite:snapshot', { 
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
      if (window.sqliteAdapter && typeof window.sqliteAdapter.fetchCodes === 'function') {
        const fresh = await window.sqliteAdapter.fetchCodes();
        if (fresh && fresh.ok) {
          window.dispatchEvent(new CustomEvent('sqlite:snapshot', { 
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
   function renderSafeAssets(tab, container, providedSnapshot) {
    // 🛡️ Ensure tab is valid
    const activeTab = tab || window.ACTIVE_ASSET_TAB || 'codes';
    window.ACTIVE_ASSET_TAB = activeTab;

    // 🛡️ CROSS-IFRAME FIX: Resolve snapshot from multiple sources
    const snapshot = providedSnapshot || 
      ((window.AssetBus && typeof window.AssetBus.snapshot === 'function') ? window.AssetBus.snapshot() : null) ||
      (window.top && typeof window.top.GET_AUTHORITATIVE_ASSETS === 'function' ? window.top.GET_AUTHORITATIVE_ASSETS() : null) ||
      (() => { try { const _raw = localStorage.getItem('codebank_assets'); return _raw ? JSON.parse(_raw) : null; } catch(_e) { return null; } })();

    // Check if container exists or try to find it (strict selector only)
    const cont = container || document.querySelector(CODEBANK_CONTAINER_SELECTOR);

    if (!cont) {
      console.warn('[SafeAssetList] Render failed: container missing');
      return;
    }

    if (!snapshot) {
      console.warn('[SafeAssetList] Render deferred: snapshot missing');
      // 🛡️ If we have NO snapshot at all, we show loading but don't clear the container yet
      const loading = document.getElementById('loading');
      if (loading) loading.classList.remove('hidden');
      return;
    }
    
    const seriesKey = TAB_MAP[activeTab] || 'codes';
    let list = Array.isArray(snapshot[seriesKey]) ? snapshot[seriesKey] : [];

    // 🛡️ TAB-SWITCH CACHE: If snapshot returned empty but we previously had data for this tab, use the cache
    if (list.length === 0 && _tabCache[seriesKey] && _tabCache[seriesKey].length > 0 && !isAuthoritative) {
      console.warn('[SafeAssetList] Snapshot empty for tab:', seriesKey, '— using tab cache (', _tabCache[seriesKey].length, 'items)');
      list = _tabCache[seriesKey].slice(); // use cached data
    }
    
    // 🛡️ CRITICAL FIX: Enhanced State Protection
     // We only allow clearing the list if:
     // 1. The snapshot explicitly marks itself as 'authoritative' or 'synced'
     // 2. Or if we are rendering mock data (providedSnapshot exists)
     // 3. Or if the UI is already empty
     // 4. Or if the tab has changed (we must clear the old tab's items)
     // 5. Or if we are explicitly rendering a specific snapshot (e.g. from pagination)
     const uiItems = cont.querySelectorAll('.asset-item:not(.empty-state)').length;
     const isAuthoritative = snapshot && (snapshot.authoritative === true || snapshot.status === 'success' || snapshot.synced === true);
     
     // Detect tab change by checking the current header or a state variable
     const lastRenderedTab = window.__LAST_RENDERED_TAB__;
     const tabChanged = lastRenderedTab && lastRenderedTab !== activeTab;
     window.__LAST_RENDERED_TAB__ = activeTab;
     
     // 🛡️ PAGINATION GUARD: If providedSnapshot is present, it means we're coming from a direct call (like pagination)
     // and we SHOULD allow the render even if the list is smaller or different.
     if (list.length === 0 && uiItems > 0 && !providedSnapshot && !isAuthoritative && !tabChanged) {
         console.warn('[SafeAssetList] Snapshot returned empty list but UI has items on same tab. Ignoring to prevent flicker.');
         // If we're ignoring a snapshot, let's trigger a background sync to get real data
         if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
             window.AssetBus.sync();
         }
         return;
     }

    console.log(`[SafeAssetList] Rendering ${activeTab} (${seriesKey}):`, list.length, 'items');
    
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

    // 💾 Cache this tab's data for future tab switches
    if (list.length > 0) _tabCache[seriesKey] = list.slice();

    const count = list.length;
    const last = count > 0 ? list[count - 1] : '—';
    if (seriesKey === 'codes') window.__SAFE_LAST_CODES_COUNT__ = count;
    
    renderHeader(tab, count, last, container);
    renderList(tab, list, container);

    // Hide loading
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');

    // 🛡️ PERSIST TO LOCAL STORAGE: Ensure durability across sessions/reloads
    try {
      const ss = window.safeStorage || {
        set: (k, v) => { try { localStorage.setItem(k, v) } catch(_) {} }
      };
      ss.set('codebank_assets', JSON.stringify(snapshot));
    } catch (_) {}

    // 📣 Signal completion for loading screens
    console.log('[SafeAssetList] Assets rendered, dispatching safe-assets-rendered');
    window.dispatchEvent(new CustomEvent('safe-assets-rendered'));
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'safe-assets-rendered' }, '*');
    }
  }

  // Send Flow (Ledger-First)
  let __TX_LOCK__ = false;

  async function sendTxLedger(tx) {
    // Prevent concurrent sends with timeout-based recovery
    if (__TX_LOCK__) {
      console.warn('[SEND] Transaction already in progress, waiting...');
      // Wait a bit and retry
      await new Promise(r => setTimeout(r, 500));
      if (__TX_LOCK__) {
        throw new Error('TX_IN_PROGRESS');
      }
    }

    __TX_LOCK__ = true;
    
    // Auto-release lock after 30 seconds to prevent permanent lock
    const lockTimeout = setTimeout(() => {
      console.error('[SEND] Transaction lock timeout - forcing release');
      __TX_LOCK__ = false;
    }, 30000);

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
          showToast('Codes sent successfully!', 'success');
        } else {
          await sendTx(tx);
          tx.syncStatus = 'synced';
          window.__PENDING_TX__.delete(tx.id);
          showToast('Codes sent successfully!', 'success');
        }
      } catch(e) {
        console.warn('[LEDGER] Async sync failed, will retry', e);
        tx.syncStatus = 'pending';
        // Queue for retry
        retryTxLater(tx);
        showToast('Send queued - will retry automatically', 'info');
      }
      
      // Clear selection after send attempt
      window.__SAFE_SELECTED_CODES__.clear();
      updateSendButtonState();
      
      // Refresh the list
      const cont = document.querySelector(CODEBANK_CONTAINER_SELECTOR);
      if (cont) {
        renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont);
      }
    } finally {
      clearTimeout(lockTimeout);
      __TX_LOCK__ = false;
    }
  }
  window.sendTxLedger = sendTxLedger;

  function renderHeader(tab, count, last, container) {
    // 🛡️ Update count display if exists
    const countEl = document.getElementById('total-count');
    if (countEl) {
        const _t = tab || ''; countEl.textContent = `${count} ${_t ? _t.charAt(0).toUpperCase() + _t.slice(1) : ''}`;
    }

    // 🛡️ Ensure tabs are synchronized
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      
      // Bind click if not already bound
      if (!btn.__clickBound) {
        btn.__clickBound = true;
        btn.addEventListener('click', () => {
          switchAssetTab(btn.dataset.tab);
        });
      }
    });

    // Update count/stats if needed (Samma3ny style usually doesn't have a simple count header)
    // But we can notify the parent or update a hidden element
  }

  function renderList(tab, list, container) {
    // 🛡️ Ensure container exists
    const listContainer = container || document.querySelector(CODEBANK_CONTAINER_SELECTOR);
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    if (!list.length) {
      const validTab = TAB_MAP[tab] || 'codes';
      const title = TITLE_MAP[validTab] || 'assets';
      listContainer.innerHTML = `
        <div class="empty-state" style="border: 2px dashed var(--border-color); border-radius: 16px; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.6; text-align: center;">
          <div class="asset-thumbnail" style="margin: 0 0 15px 0; border: 2px dashed var(--border-color); background: transparent;">
            <img src="${ASSET_ICONS[tab]}" style="width: 40px; height: 40px; object-fit: contain; opacity: 0.5;" />
          </div>
          <h3 style="color: var(--text-muted); font-size: 18px; margin-bottom: 8px;">No ${String(title).toLowerCase()} found yet.</h3>
          <p style="color: var(--text-muted); font-size: 14px;">Your vault is currently empty for this category.</p>
        </div>
      `;
      
      // 📈 Ensure pagination is still visible even if empty
      const pagination = document.getElementById('pagination');
      if (pagination) {
          pagination.style.display = 'flex';
          const currentEl = document.getElementById('current-page');
          const totalEl = document.getElementById('total-pages');
          if (currentEl) currentEl.textContent = '1';
          if (totalEl) totalEl.textContent = '1';
          
          const prevBtn = document.getElementById('prev-page');
          const nextBtn = document.getElementById('next-page');
          if (prevBtn) prevBtn.disabled = true;
          if (nextBtn) nextBtn.disabled = true;
      }
      return;
    }

    // 📈 Use external pagination logic from safe-list-actions.js
    const pageItems = window.SafeActions ? 
        window.SafeActions.updatePagination(list, () => renderSafeAssets(tab, listContainer)) : 
        list.slice(0, PAGE_SIZE);

    // 🎨 Render Items
    pageItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'asset-item';
      if (tab === 'silver') row.classList.add('silver');
      if (tab === 'gold') row.classList.add('gold');
      
      let val = (item && typeof item === 'object') ? (item.code || '') : String(item || '');
      const isSelected = window.__SAFE_SELECTED_CODES__ && window.__SAFE_SELECTED_CODES__.has(String(val));
      if (isSelected) row.classList.add('selected');
      
      // Rarity and metadata
      const rarity = tab === 'codes' ? 'Common' : (tab === 'silver' ? 'Rare' : 'Legendary');
      const date = (item && item.timestamp) ? new Date(item.timestamp).toLocaleDateString() : 'N/A';
      
      row.innerHTML = `
        <div class="asset-thumbnail">
          <img src="${ASSET_ICONS[tab]}" style="width: 40px; height: 40px; object-fit: contain;" />
        </div>
        <div class="asset-details">
          <div class="asset-name" style="font-family: 'JetBrains Mono', monospace;">${val}</div>
          <div class="asset-meta">${rarity} • Added ${date}</div>
        </div>
        <div class="asset-actions" style="opacity: 0.6;">
          <span style="font-size: 12px; font-weight: bold; color: var(--primary-color);">
            ${isSelected ? 'SELECTED' : 'OWNED'}
          </span>
        </div>
      `;

      row.addEventListener('click', () => {
        const c = String(val);
        if (!window.__SAFE_SELECTED_CODES__) window.__SAFE_SELECTED_CODES__ = new Set();
        
        const currentlySelected = window.__SAFE_SELECTED_CODES__.has(c);
        if (!currentlySelected) {
          window.__SAFE_SELECTED_CODES__.add(c);
          row.classList.add('selected');
          const statusSpan = row.querySelector('.asset-actions span');
          if (statusSpan) statusSpan.textContent = 'SELECTED';
        } else {
          window.__SAFE_SELECTED_CODES__.delete(c);
          row.classList.remove('selected');
          const statusSpan = row.querySelector('.asset-actions span');
          if (statusSpan) statusSpan.textContent = 'OWNED';
        }

        // Use external send button logic
        if (window.SafeActions) {
            window.SafeActions.updateSendButtonVisibility();
            // 📣 Signal WatchDog to be ALERT during selection
            if (window.__GUARDIAN__) window.__GUARDIAN__.setState('watching');
        }
      });

      listContainer.appendChild(row);
    });

    // 🛡️ Ensure send button exists if selection
    if (window.SafeActions) window.SafeActions.setupSendButton();
  }

  function ensureSendButton() {
    if (window.SafeActions) {
      window.SafeActions.setupSendButton();
      return;
    }
    // Fallback if SafeActions missing
    let sendBtn = document.getElementById('safe-send-btn');
    if (!sendBtn) {
      sendBtn = document.createElement('button');
      sendBtn.id = 'safe-send-btn';
      sendBtn.className = 'tab-btn active';
      sendBtn.style.cssText = 'position: fixed; bottom: 100px; right: 40px; z-index: 100; padding: 12px 24px; border-radius: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
      document.body.appendChild(sendBtn);
      
      // Bind handler
      sendBtn.addEventListener('click', async function() {
        console.log('[SEND] Button clicked');
        const auth = getAuthState();
        if (!auth.authenticated) {
          showToast('Please log in to send codes', 'error');
          return;
        }
        
        const codes = Array.from(window.__SAFE_SELECTED_CODES__ || []);
        if (!codes.length) {
          showToast('Please select codes to send', 'warning');
          return;
        }
        
        showEmailPopup(codes);
      });
    }
    updateSendButtonState();
  }

  // FIX: Improved bindSendButton with proper auth checking
  function bindSendButton() {
    const sendBtn = document.getElementById('safe-send-btn');
    if (!sendBtn) return;
    
    // Always remove and re-add listener to avoid ghost bindings
    const newBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    
    newBtn.addEventListener('click', async function() {
      console.log('[SEND] Button clicked');
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
      
      console.log('[SEND] Opening email popup for codes:', codes);
      // Show email popup
      showEmailPopup(codes);
    });
    
    // Update button state
    updateSendButtonState();
  }

  // ========================================
  // FIXED: Update Send Button State (Main Version)
  // ========================================
  function updateSendButtonState() {
    const sendBtn = document.getElementById('safe-send-btn');
    if (!sendBtn) return;

    const n = (window.__SAFE_SELECTED_CODES__ && window.__SAFE_SELECTED_CODES__.size) || 0;
    const auth = getAuthState();
    const authReady = auth.authenticated;

    // Always show button if codes are selected
    if (n === 0) {
      sendBtn.style.display = 'none';
      return;
    }

    sendBtn.style.display = 'inline-flex';
    
    // 🛡️ FIX: Enable button if we have selection and auth
    const canSend = authReady && n > 0;
    
    sendBtn.disabled = !canSend;
    
    if (!canSend) {
      sendBtn.classList.add('disabled');
      sendBtn.style.opacity = '0.5';
      sendBtn.style.cursor = 'not-allowed';
      sendBtn.title = authReady ? 'Select codes to send' : 'Please log in';
    } else {
      sendBtn.classList.remove('disabled');
      sendBtn.style.opacity = '1';
      sendBtn.style.cursor = 'pointer';
      sendBtn.title = `Send ${n} code(s)`;
    }

    // Update button text
    sendBtn.textContent = n > 1 ? `Send (${n})` : 'Send';
    
    // 🛡️ FIX: Ensure click handler is bound
    attachSendHandler(sendBtn);
  }

  function switchAssetTab(t){ 
    window.ACTIVE_ASSET_TAB=t; 
    window.SAFE_PAGE=1; 
    const cont=document.querySelector(CODEBANK_CONTAINER_SELECTOR); 
    if(cont) renderSafeAssets(t, cont); 
  }
  window.switchAssetTab = switchAssetTab;

  // 3️⃣ Ensure UI always listens to latest snapshot - Add renderSafeByTab for compatibility
  function renderSafeByTab(tab, list) {
    console.log('[SafeCode] Rendering tab:', tab, 'items:', list?.length);
    
    const container = document.querySelector(CODEBANK_CONTAINER_SELECTOR);
    if (!container) {
      console.warn('[SafeCode] Render failed: container not found', CODEBANK_CONTAINER_SELECTOR);
      return;
    }

    if (!list || list.length === 0) {
      container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No assets yet</div>';
    } else {
      // Use the provided list for immediate rendering
      container.innerHTML = list.map(code => {
        const val = typeof code === 'string' ? code : (code.code || '');
        return `
          <div class="asset-item" style="padding:15px; background:rgba(255,255,255,0.05); border-radius:12px; margin-bottom:10px; border:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
            <div class="asset-name" style="font-family:monospace; color:#fff; font-size:14px;">${val}</div>
            <div class="asset-status" style="font-size:10px; color:var(--primary-color); text-transform:uppercase;">Verified</div>
          </div>
        `;
      }).join('');
    }

    // 🚀 CRITICAL: notify UI to hide loading
    document.dispatchEvent(new CustomEvent('safe-assets-rendered'));
    window.dispatchEvent(new CustomEvent('safe-assets-rendered'));
    
    // Notify parent if in iframe
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'safe-assets-rendered' }, '*');
    }

    console.log('[SafeCode] Render completed');
  }
  window.renderSafeByTab = renderSafeByTab;

  function initialRender(){
    const cont=document.querySelector(CODEBANK_CONTAINER_SELECTOR);
    if(cont){
      // 1. Try to grab real data from parent/top first
      const data = (window.top && typeof window.top.GET_AUTHORITATIVE_ASSETS === 'function') ? 
                   window.top.GET_AUTHORITATIVE_ASSETS() : 
                   ((window.AssetBus && typeof window.AssetBus.snapshot === 'function') ? window.AssetBus.snapshot() : null);

      const _hasAnyAssets = (d) => d && (
          (Array.isArray(d.codes)  && d.codes.length  > 0) ||
          (Array.isArray(d.silver) && d.silver.length > 0) ||
          (Array.isArray(d.gold)   && d.gold.length   > 0)
      );
      if (_hasAnyAssets(data)) {
          console.log('[SafeCode] Initial render using authoritative data:', (data.codes||[]).length, 'codes', (data.silver||[]).length, 'silver', (data.gold||[]).length, 'gold');
          renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont, data);
      } else {
          // 2. Check local storage fallback before mock
          try {
              const raw = localStorage.getItem('codebank_assets');
              if (raw) {
                  const localData = JSON.parse(raw);
                  if (_hasAnyAssets(localData)) {
                      console.log('[SafeCode] Initial render using local storage fallback:', (localData.codes||[]).length, 'codes', (localData.silver||[]).length, 'silver');
                      renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont, localData);
                      return;
                  }
              }
          } catch(e) {}

          // 3. [FIX] No mock data fallback — show loading state and retry for real data
          console.log('[SafeCode] No authoritative data found — starting retry loop for real data');

          // Show a non-blocking loading message instead of fake codes
          cont.innerHTML = '<div style="text-align:center;padding:32px;color:#aaa;font-size:14px;">' +
            '<div class="bankode-spinner" style="margin:0 auto 12px;"></div>' +
            '<p>Loading your assets…</p>' +
            '</div>';

          // [FIX] Retry up to 8 times (200 ms apart) waiting for real data
          let _retries = 0;
          const _MAX_RETRIES = 8;
          const _retryTimer = setInterval(function() {
            _retries++;
            const retryData =
              (window.top && typeof window.top.GET_AUTHORITATIVE_ASSETS === 'function')
                ? window.top.GET_AUTHORITATIVE_ASSETS()
                : (window.AssetBus && typeof window.AssetBus.snapshot === 'function')
                    ? window.AssetBus.snapshot()
                    : null;

            if (_hasAnyAssets(retryData)) {
              clearInterval(_retryTimer);
              console.log('[SafeCode] Retry #' + _retries + ' — real data arrived:', (retryData.codes||[]).length, 'codes', (retryData.silver||[]).length, 'silver');
              renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont, retryData);
              return;
            }

            // Also try localStorage on subsequent retries
            if (_retries >= 2) {
              try {
                const raw = localStorage.getItem('codebank_assets');
                if (raw) {
                  const lsData = JSON.parse(raw);
                  if (_hasAnyAssets(lsData)) {
                    clearInterval(_retryTimer);
                    console.log('[SafeCode] Retry #' + _retries + ' — localStorage fallback:', (lsData.codes||[]).length, 'codes', (lsData.silver||[]).length, 'silver');
                    renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont, lsData);
                    return;
                  }
                }
              } catch(_) {}
            }

            if (_retries >= _MAX_RETRIES) {
              clearInterval(_retryTimer);
              // Trigger AssetBus sync as last resort and show empty state gracefully
              if (window.AssetBus && typeof window.AssetBus.sync === 'function') {
                console.log('[SafeCode] Max retries reached — triggering AssetBus sync');
                window.AssetBus.sync();
              }
              // Render empty state (no fake codes)
              renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont, { codes: [], silver: [], gold: [] });
            }
          }, 200);
      }
    }
  }

  // Initialize
  try {
    window.__SQLITE_SYNC_READY__ = false;
    try { if (typeof hydrateSyncedCodesFromSnapshot==='function') hydrateSyncedCodesFromSnapshot(); } catch(_){ }
    try { if (window.sqliteAdapter && typeof window.sqliteAdapter.refreshFromSnapshot==='function') window.sqliteAdapter.refreshFromSnapshot(); } catch(_){ }
    try { if (window.sqliteAdapter && typeof window.sqliteAdapter.syncExistingCodes==='function') window.sqliteAdapter.syncExistingCodes(); } catch(_){ }
    window.__SQLITE_SYNC_READY__=true;
  } catch(_){ }

  /**
   * 🛡️ Step 3: ASSETBUS INTEGRATION (as per actly.md)
   * We wait for the bridge and subscribe to updates.
   */
  // Listen for updates from parent (for iframe mode)
  if (window.parent !== window) {
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'assets:updated') {
        console.log('[SafeAssetList] Received assets updated from parent');
        const cont = document.querySelector(CODEBANK_CONTAINER_SELECTOR);
        if (cont) {
          renderSafeAssets(window.ACTIVE_ASSET_TAB || 'codes', cont);
        }
      }
    });
  }

  // Initialize
  initialRender();

  // 📣 Signal completion for loading screen
  console.log('[SafeAssetList] Initial setup complete, dispatching ready signal');
  window.dispatchEvent(new CustomEvent('safe-assets-rendered'));
  if (window.parent !== window) {
      window.parent.postMessage({ type: 'safe-assets-rendered' }, '*');
  }
  
  // 🐕 Initialize Watch-Dog Guardian (from safe-list-actions.js)
  if (window.SafeActions && typeof window.SafeActions.initWatchDogGuardian === 'function') {
      console.log('[SafeAssetList] Triggering Watch-Dog Guardian init');
      window.SafeActions.initWatchDogGuardian();
  } else if (typeof initWatchDogGuardian === 'function') {
      console.log('[SafeAssetList] Triggering global initWatchDogGuardian');
      initWatchDogGuardian();
  }

  console.log('[SafeAssetList] Ready.');
})();


