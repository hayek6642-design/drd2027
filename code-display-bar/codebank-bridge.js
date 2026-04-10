let __LAST_LATEST_CODE__ = null;
try { if (typeof window !== 'undefined') { if (typeof window.CODEBANK_DEBUG === 'undefined') window.CODEBANK_DEBUG = false } } catch(_){ }

// Compatibility function for bankode-assetbus-bridge.js
window.updateCodeDisplay = function(latest) {
  // Validate before applying
  const validCode = latest ? __validateCodeFormat__(latest) : null;
  if (validCode) {
    __LAST_LATEST_CODE__ = validCode;
    __applyLatest__(validCode);
  }
};

function __applyLatest__(latest){
  try {
    const nodes = document.querySelectorAll('#code-display');
    const visible = Array.from(nodes).find(n => !!n && n.offsetParent !== null) || nodes[0] || null;
    try { if (window.CODEBANK_DEBUG) console.log('[UI TARGET]', visible, visible ? visible.offsetParent : null); } catch(_){}
    if (visible && latest) {
      visible.textContent = latest;
      try { if (window.CODEBANK_DEBUG) console.log('[UI CODE UPDATE]', latest); } catch(_){}
    }
    const codeCounter = document.getElementById('asset-codes');
    if (codeCounter) {
      try {
        const countNode = document.querySelectorAll('#asset-codes');
        if (countNode.length > 1) { console.warn('[UI COUNT WARN] multiple #asset-codes elements:', countNode.length); }
      } catch(_){}
    }
  } catch (_) {}
}

function __rehydrateFromSnapshot__(){
  try {
    // 🛡️ REHYDRATION FIX: Use authoritative snapshot from AssetBus first
    if (window.AssetBus && typeof window.AssetBus.snapshot === 'function') {
      const snap = window.AssetBus.snapshot();
      if (snap && snap.latest) {
        const validCode = __validateCodeFormat__(snap.latest);
        if (validCode) {
          __LAST_LATEST_CODE__ = validCode;
          __applyLatest__(validCode);
          return;
        }
      }
    }
    
    // Fallback to IndexedDB snapshot
    const openDB = function(){ return new Promise(function(resolve,reject){ try{ var req=indexedDB.open('CodeBankSnapshotDB',1); req.onupgradeneeded=function(){ try{ var db=req.result; if(!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots'); }catch(_){ } }; req.onsuccess=function(){ resolve(req.result) }; req.onerror=function(){ reject(req.error) }; }catch(e){ reject(e) } }); };
    const readSnap = function(){ return openDB().then(function(db){ return new Promise(function(resolve,reject){ try{ var tx=db.transaction('snapshots','readonly'); var store=tx.objectStore('snapshots'); var req=store.get('latest'); req.onsuccess=function(){ resolve(req.result||null) }; req.onerror=function(){ reject(req.error) }; }catch(e){ reject(e) } }); }); };
    readSnap().then(function(snap){ 
      try{ 
        if(snap && snap.latestCode){ 
          const validCode = __validateCodeFormat__(snap.latestCode);
          if (validCode) {
            __LAST_LATEST_CODE__ = validCode;
            __applyLatest__(validCode);
          }
        } 
      }catch(_){ } 
    });
  } catch(_) {}
}

// Validate code format - reject invalid/test codes
function __validateCodeFormat__(code) {
  if (!code || typeof code !== 'string') return null;
  // Reject short codes
  if (code.length < 20) return null;
  // Reject plain text or numbers only
  if (/^[a-zA-Z]+$/.test(code)) return null;
  if (/^[0-9]+$/.test(code)) return null;
  // Accept proper format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-P#
  if (/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-P[0-9]$/.test(code)) {
    return code;
  }
  // Accept reasonably long mixed codes
  if (code.length >= 30 && /[A-Z]/.test(code) && /[0-9]/.test(code)) {
    return code;
  }
  return null;
}

export const CodeBankBridge = {
  init() {
    try {
      if (typeof window.initCodeBankPanel === 'function') {
        window.initCodeBankPanel();
      }
  window.addEventListener('sqlite:snapshot', (e) => {
    try {
      const d = e && e.detail || {};
      const latest = d.latest || '';
      if (!latest && __LAST_LATEST_CODE__) return;
      // Validate before applying
      const validCode = latest ? __validateCodeFormat__(latest) : null;
      if (validCode) { __LAST_LATEST_CODE__ = validCode; __applyLatest__(validCode); }
    } catch(_){ }
  });
  window.addEventListener('bridge:snapshot-applied', (e) => {
    try {
      const d = e && e.detail || {};
      const latest = d.latestCode || d.latest;
      // Validate before applying
      const validCode = latest ? __validateCodeFormat__(latest) : null;
      if (validCode) { __LAST_LATEST_CODE__ = validCode; __applyLatest__(validCode); }
    } catch(_){ }
  });
  window.addEventListener('assets:updated', (e) => {
    const d = e && e.detail || {};
    const latest = d.latest;
    const count = d.count;
    const type = d.type || 'unknown';
    // Validate before applying
    const validCode = latest ? __validateCodeFormat__(latest) : null;
    if (validCode) {
      __LAST_LATEST_CODE__ = validCode;
      if (type === (window.AssetType ? window.AssetType.Codes : 'codes')) {
        __applyLatest__(validCode);
        const codeCounter = document.getElementById('asset-codes');
        if (codeCounter && typeof count === 'number') codeCounter.textContent = String(count);
        try { if (window.CODEBANK_DEBUG) console.log('[UI UPDATE]', 'codes', validCode); } catch(_){}
      }
    }
    if (type === (window.AssetType ? window.AssetType.Likes : 'likes')) {
      const likeCount = typeof d.likes === 'number' ? d.likes : null;
      const likeEl = document.getElementById('like-count');
      if (likeEl && likeCount !== null) likeEl.textContent = String(likeCount);
      try { if (window.CODEBANK_DEBUG) console.log('[UI UPDATE]', 'likes', likeCount); } catch(_){}
    }
    if (type === (window.AssetType ? window.AssetType.Superlikes : 'superlikes')) {
      const slCount = typeof d.superlikes === 'number' ? d.superlikes : null;
      const safeEl = document.getElementById('asset-safe');
      if (safeEl && slCount !== null) { try { safeEl.textContent = `Superlikes: ${slCount}`; } catch(_){} }
      try { if (window.CODEBANK_DEBUG) console.log('[UI UPDATE]', 'superlikes', slCount); } catch(_){}
    }
    if (type === (window.AssetType ? window.AssetType.Games : 'games')) {
      const gCount = typeof d.games === 'number' ? d.games : null;
      const safeEl = document.getElementById('asset-safe');
      if (safeEl && gCount !== null) { try { safeEl.textContent = `Games: ${gCount}`; } catch(_){} }
      try { if (window.CODEBANK_DEBUG) console.log('[UI UPDATE]', 'games', gCount); } catch(_){}
    }
    if (type === (window.AssetType ? window.AssetType.Transactions : 'transactions')) {
      const tCount = typeof d.transactions === 'number' ? d.transactions : null;
      const safeEl = document.getElementById('asset-safe');
      if (safeEl && tCount !== null) { try { safeEl.textContent = `Transactions: ${tCount}`; } catch(_){} }
      try { if (window.CODEBANK_DEBUG) console.log('[UI UPDATE]', 'transactions', tCount); } catch(_){}
    }
    try {
      const safeEl = document.getElementById('asset-safe');
      if (safeEl) {
        const likes = typeof d.likes === 'number' ? d.likes : '';
        const sl = typeof d.superlikes === 'number' ? d.superlikes : '';
        const g = typeof d.games === 'number' ? d.games : '';
        const t = typeof d.transactions === 'number' ? d.transactions : '';
        safeEl.dataset.likes = String(likes);
        safeEl.dataset.superlikes = String(sl);
        safeEl.dataset.games = String(g);
        safeEl.dataset.transactions = String(t);
      }
    } catch(_){}
  });
      __rehydrateFromSnapshot__();
      // [FIX] Check for code already fetched before this module loaded (timing fix)
      try {
        if (!__LAST_LATEST_CODE__ && window.__PENDING_LATEST_CODE__) {
          __LAST_LATEST_CODE__ = window.__PENDING_LATEST_CODE__;
          __applyLatest__(window.__PENDING_LATEST_CODE__);
        }
      } catch(_) {}
      // Also retry after a short delay to catch codes that arrive just after module init
      setTimeout(function() {
        try {
          if (!__LAST_LATEST_CODE__ && window.__PENDING_LATEST_CODE__) {
            __LAST_LATEST_CODE__ = window.__PENDING_LATEST_CODE__;
            __applyLatest__(window.__PENDING_LATEST_CODE__);
          }
        } catch(_) {}
      }, 1000);
      try {
        const targetContainer = document.getElementById('counter-container') || document.body;
        const mo = new MutationObserver(() => {
          try {
            const el = document.getElementById('code-display');
            if (el && typeof __LAST_LATEST_CODE__ === 'string' && el.textContent !== __LAST_LATEST_CODE__) {
              __applyLatest__(__LAST_LATEST_CODE__);
            }
          } catch(_){}
        });
        mo.observe(targetContainer, { childList: true, subtree: true, attributes: true });
      } catch(_){}
      const codeEl = document.getElementById('code-display');
      const container = document.getElementById('counter-container');
      if (codeEl && container) {
        let pressTimer = null;
        let compact = false;
        const start = () => {
          try { codeEl.classList.add('long-press'); } catch(_) {}
          pressTimer = setTimeout(() => {
            compact = !compact;
            try { container.classList.toggle('compact-mode', compact); } catch(_) {}
            try { codeEl.classList.remove('long-press'); } catch(_) {}
          }, 500);
        };
        const end = () => {
          try { codeEl.classList.remove('long-press'); } catch(_) {}
          if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        };
        try { codeEl.addEventListener('touchstart', start, { passive: true }); } catch(_) {}
        try { codeEl.addEventListener('touchend', end); } catch(_) {}
        try { codeEl.addEventListener('touchcancel', end); } catch(_) {}
        window.teardownCodeDisplayLongPress = function(){
          try { codeEl.removeEventListener('touchstart', start); } catch(_) {}
          try { codeEl.removeEventListener('touchend', end); } catch(_) {}
          try { codeEl.removeEventListener('touchcancel', end); } catch(_) {}
        };
      }
    } catch (_) {}
  }
}

try { CodeBankBridge.init(); } catch (_) {}
