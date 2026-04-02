// Global touch shield: blocks interactions across the screen except counter container
const SHIELD_ID = 'global-touch-shield';
let PROTECTION_ACTIVE = false;
let INIT_OVERLAY_ACTIVE = false;
let originalFetch = null;

function ensureInitOverlay() {
  let overlay = document.getElementById('system-protection-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'system-protection-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483646;display:none;align-items:center;justify-content:center;pointer-events:auto;';

    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:absolute;inset:0;background:rgba(10,20,30,0.6);backdrop-filter:blur(6px) saturate(1.1);-webkit-backdrop-filter:blur(6px) saturate(1.1);';

    const box = document.createElement('div');
    box.style.cssText = 'position:relative;z-index:1;max-width:480px;width:90%;padding:28px 22px;border-radius:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);color:#eaf6ff;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.45);pointer-events:none;';

    const title = document.createElement('div');
    title.id = 'system-protection-title';
    title.style.cssText = 'font-size:1.2rem;font-weight:700;margin-bottom:10px;';
    title.textContent = 'وضع الحماية مفعّل';

    const message = document.createElement('div');
    message.id = 'system-protection-message';
    message.style.cssText = 'font-size:1rem;opacity:0.9;';
    message.textContent = 'الاتصال بالإنترنت مفقود. يرجى إعادة الاتصال للمتابعة';

    const progress = document.createElement('div');
    progress.id = 'system-protection-progress';
    progress.style.cssText = 'margin-top:12px;font-size:0.95rem;opacity:0.85;';
    progress.textContent = '';

    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'margin-top:8px;height:8px;border-radius:10px;background:rgba(255,255,255,0.1);overflow:hidden;';
    const barFill = document.createElement('div');
    barFill.id = 'system-protection-progress-bar';
    barFill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#00d4ff,#0080ff);transition:width 0.4s ease;';
    barWrap.appendChild(barFill);

    box.appendChild(title);
    box.appendChild(message);
    box.appendChild(progress);
    box.appendChild(barWrap);
    overlay.appendChild(backdrop);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
  return overlay;
}

function setInitProgress(text) {
  const el = document.getElementById('system-protection-progress');
  if (el) el.textContent = text || '';
  const bf = document.getElementById('system-protection-progress-bar');
  if (bf && typeof text === 'string') {
    const m = text.match(/(\d+)%/);
    const pct = m ? parseInt(m[1],10) : 0;
    bf.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }
}

function activateProtection(titleText, messageText) {
  const overlay = ensureInitOverlay();
  const t = document.getElementById('system-protection-title');
  const m = document.getElementById('system-protection-message');
  if (t) t.textContent = titleText || 'وضع الحماية مفعّل';
  if (m) m.textContent = messageText || 'الاتصال بالإنترنت مفقود. يرجى إعادة الاتصال للمتابعة';
  overlay.style.display = 'flex';
  PROTECTION_ACTIVE = true;
  window.__EXTRA_MODE_LOCKED__ = true;
  document.body.style.pointerEvents = 'none';
  document.body.style.userSelect = 'none';
  try { if (window.pauseCounter) window.pauseCounter(); } catch(_){}
}

function deactivateProtection() {
  const overlay = ensureInitOverlay();
  overlay.style.display = 'none';
  PROTECTION_ACTIVE = false;
  
  // 🔹 Also hide the green loading overlay from yt-new-clear.html if it exists
  const greenOverlay = document.getElementById('loading-overlay');
  if (greenOverlay) {
      greenOverlay.classList.add('hidden');
  }

  if (!INIT_OVERLAY_ACTIVE) {
    document.body.style.pointerEvents = '';
    document.body.style.userSelect = '';
    window.__EXTRA_MODE_LOCKED__ = false;
    try { if (window.startCounter) window.startCounter(); } catch(_){}
  }
}

function verifyBackendReachable() {
  return Promise.resolve(!!navigator.onLine);
}

function isSevereBackendFailureStatus(status) {
  return status === 0 || (status >= 500 && status < 600);
}

function getAuthContext() {
  if (window.Auth && typeof window.Auth.isAuthenticated === 'function') return window.Auth;

  try {
    if (window.top && window.top.Auth && typeof window.top.Auth.isAuthenticated === 'function') {
      return window.top.Auth;
    }
  } catch (e) {}

  return null;
}

const AuthGate = { 
   authReady: false, 
   pendingRequests: [], 
   _ready: false,
   
   patchFetch() { 
     const originalFetch = window.fetch; 
     
     window.fetch = async (...args) => { 
       // 🛡️ OFFLINE DETECTION: Prevent failed fetch spam
       if (typeof navigator !== 'undefined' && !navigator.onLine) {
         const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
         console.warn('[Network] Offline, skipping fetch to:', url);
         // Return a rejected promise to simulate network failure without hitting the wire
         return Promise.reject(new TypeError('Failed to fetch (offline)'));
       }

       let [url, options] = args; 
       options = options || {};
       options.headers = options.headers || {};
       
       // Phase 2: Sync Auth to Fetch
       const auth = getAuthContext();
       if (auth && auth.isAuthenticated && auth.isAuthenticated()) {
         this.authReady = true; // 🛡️ Proactive: if auth is already authenticated, mark as ready
         const token = auth.getToken();
         if (token) {
           options.headers['Authorization'] = `Bearer ${token}`;
           // Also sync to cookie if needed for server-side
           if (typeof document !== 'undefined') {
             document.cookie = `session_token=${token}; path=/; SameSite=Lax`;
           }
         }
       }
       
       // Check if this needs auth 
       if (this._requiresAuth(url)) { 
         if (!this.authReady) { 
           console.log(`[AuthGate] Queuing fetch to ${url} until auth ready`); 
           return new Promise((resolve, reject) => { 
             this.pendingRequests.push({ args: [url, options], resolve, reject, timestamp: Date.now() }); 
             
             // Timeout after 10s to prevent hanging 
             setTimeout(() => { 
               const idx = this.pendingRequests.findIndex(r => r.args[0] === url); 
               if (idx > -1) { 
                 this.pendingRequests.splice(idx, 1); 
                 reject(new Error('Auth timeout')); 
               } 
             }, 10000); 
           }); 
         } 
       } 
       
       return originalFetch.apply(window, [url, options]); 
     };

     // In AuthGate init, add: 
     setTimeout(()=>{
       if(!this._ready){
         const auth = getAuthContext();
         if (auth && auth.isAuthenticated && auth.isAuthenticated()) {
           this.onAuthReady();
         } else {
           console.warn('[AG] Timeout flush');
           this._flush(null);
         }
       }
     }, 10000);
   }, 
 
   onAuthReady() { 
     this._ready = true;
     this.authReady = true; 
     console.log(`[AuthGate] Auth ready, flushing ${this.pendingRequests.length} pending requests`); 
     
     this._flush();
   },

   _flush(user = null) {
     // Flush pending requests 
     this.pendingRequests.forEach(({ args, resolve, reject }) => { 
       window.fetch(...args).then(resolve).catch(reject); 
     }); 
     this.pendingRequests = []; 
   },
 
   _requiresAuth(url) { 
     const authEndpoints = ['/api/me', '/api/rewards', '/api/user']; 
     return authEndpoints.some(endpoint => url.includes(endpoint)); 
   } 
 }; 
 
 // Initialize 
 AuthGate.patchFetch(); 
 
 // Listen for auth ready 
 window.addEventListener('auth:ready', () => AuthGate.onAuthReady()); 

function blockEvent(e) {
  if (window.shieldDisabled) return;
  if (PROTECTION_ACTIVE || INIT_OVERLAY_ACTIVE) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }
  const counterContainer = document.getElementById('counter-container');
  if (!counterContainer) {
    // If no counter container, we don't block anything globally unless protection is active
    return;
  }

  // 🔹 ALLOW clicks to counter container and all its children
  if (e.target === counterContainer || counterContainer.contains(e.target)) return;

  // 🔹 ALLOW clicks to any buttons, inputs, or interactive elements (fallback)
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('button')) return;

  const shield = document.getElementById(SHIELD_ID);
  if (shield) {
    const prev = shield.style.pointerEvents;
    shield.style.pointerEvents = 'none';
    const underlying = document.elementFromPoint(e.clientX, e.clientY);
    shield.style.pointerEvents = prev;
    if (underlying && (underlying === counterContainer || counterContainer.contains(underlying))) {
      return;
    }
  }

  // Only block if it's truly background/shield area
  // e.preventDefault();
  // e.stopImmediatePropagation();
}

function ensureShield() {
  let shield = document.getElementById(SHIELD_ID);
  if (!shield) {
    shield = document.createElement('div');
    shield.id = SHIELD_ID;
    shield.setAttribute('aria-hidden', 'true');
    document.body.appendChild(shield);
  }

  const eventsToBlock = [
    'click','mousedown','mouseup','pointerdown','pointerup',
    'touchstart','touchend','touchmove','dblclick','contextmenu','wheel'
  ];

  shield._shieldCleanup && shield._shieldCleanup();
  const listeners = [];
  eventsToBlock.forEach(evt => {
    const fn = (e) => blockEvent(e);
    shield.addEventListener(evt, fn, { passive: false, capture: true });
    listeners.push({ evt, fn });
  });
  shield._shieldCleanup = () => {
    listeners.forEach(({ evt, fn }) => shield.removeEventListener(evt, fn, { capture: true }));
    shield._shieldCleanup = null;
  };

  if (!document._iframeProtectionInstalled) {
    document._iframeProtectionInstalled = true;
    eventsToBlock.forEach(evt => {
      document.addEventListener(evt, function(e) {
        try {
          const iframe = document.querySelector('#video-container iframe, .theatre-mode iframe, iframe.theatre-mode');
          if (iframe && (e.target === iframe || (iframe.contains && iframe.contains(e.target)))) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        } catch (_) {}
      }, { passive: false, capture: true });
    });
  }

  // Initialization gatekeeper
  INIT_OVERLAY_ACTIVE = false; // 🔹 Disable the blue initialization overlay as requested
  window.__EXTRA_MODE_LOCKED__ = true;
  // const overlay = ensureInitOverlay();
  // overlay.style.display = 'flex';
  // document.body.style.pointerEvents = 'none';
  // document.body.style.userSelect = 'none';
  // const t = document.getElementById('system-protection-title');
  // const m = document.getElementById('system-protection-message');
  // if (t) t.textContent = 'جارٍ التهيئة';
  // if (m) m.textContent = 'يتم تجهيز التطبيق، يرجى الانتظار قليلًا';
  // setInitProgress('التقدم: 0%');

  const flags = {
    dom: true,
    css: false,
    player: false,
    counter: false,
    switches: false,
    backend: false
  };

  // CSS ready
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  if (links.length === 0) {
    flags.css = true;
  } else {
    Promise.all(links.map(link => new Promise(resolve => {
      if (link.sheet) return resolve();
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
    }))).then(() => { flags.css = true; updateInitProgress(); });
  }

  // Player ready
  window.addEventListener('yt:ready', () => { flags.player = true; updateInitProgress(); });

  // Counter ready
  const checkCounter = () => { if (window.__COUNTER_READY__ === true) { flags.counter = true; updateInitProgress(); } else { setTimeout(checkCounter, 100); } };
  checkCounter();

  // Switches ready: set by toggle init when available, else poll
  const checkSwitches = () => { if (window.__SWITCHES_READY__ === true) { flags.switches = true; updateInitProgress(); } else { setTimeout(checkSwitches, 100); } };
  checkSwitches();

  // Backend reachable
  verifyBackendReachable().then(ok => { flags.backend = !!ok; updateInitProgress(); });

  function updateInitProgress() {
    // 🛡️ Shield Protection: prevent re-init side effects if already started
    if (window.__BALLOON_STARTED_AFTER_AUTH__) {
      console.log("🛡️ Shield: preventing re-init side effects (system already active)");
      return;
    }

    const pct = (flags.dom?15:0) + (flags.css?15:0) + (flags.player?25:0) + (flags.counter?20:0) + (flags.switches?15:0) + (flags.backend?10:0);
    setInitProgress(`التقدم: ${pct}%`);

    // 🔹 Update the green progress bar in yt-new-clear.html if it exists
    const greenBar = document.getElementById('loading-progress-bar');
    const greenPct = document.getElementById('loading-percentage');
    if (greenBar) greenBar.style.width = pct + '%';
    if (greenPct) greenPct.textContent = pct + '%';

    if (flags.dom && flags.css && flags.player && flags.counter && flags.switches && flags.backend) {
      INIT_OVERLAY_ACTIVE = false;
      deactivateProtection();

      // 🔹 Hide the green overlay too
      const greenOverlay = document.getElementById('loading-overlay');
      if (greenOverlay) {
          setTimeout(() => greenOverlay.classList.add('hidden'), 500);
      }
    }
  }

  try {
    window.addEventListener('codebank:opened', function(){
      flags.player = true;
      flags.switches = true;
      flags.counter = true;
      updateInitProgress();
    });
  } catch(_) {}

  try {
    window.addEventListener('auth:ready', function(e){
      try { INIT_OVERLAY_ACTIVE = false; } catch(_){}
      try { deactivateProtection(); } catch(_){}
    });
  } catch(_) {}

  // Network listeners
  window.addEventListener('online', async () => {
    window.__EXTRA_MODE_DISABLED__ = false;
    const ok = await verifyBackendReachable();
    if (ok && !INIT_OVERLAY_ACTIVE) deactivateProtection();
  });
  window.addEventListener('offline', () => {
    window.__EXTRA_MODE_DISABLED__ = true;
    // Do not show any overlay; feature-level components should handle disabled state
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureShield);
} else {
  ensureShield();
}

window.addEventListener('codebank:opened', () => { window.shieldDisabled = true; });
window.addEventListener('codebank:closed', () => { window.shieldDisabled = false; });

// Export minimal API
window.SystemProtection = {
  isProtectionActive: () => PROTECTION_ACTIVE || INIT_OVERLAY_ACTIVE,
  activateOffline: (t, m) => activateProtection(t, m),
  deactivate: () => deactivateProtection(),
  verifyBackendReachable
};
