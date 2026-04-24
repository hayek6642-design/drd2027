// 🛡️ CRITICAL POLYFILLS - Ensure core classes exist before app boot
if (!window.AssetMirror) {
  window.AssetMirror = class {
    constructor() {
      this.assets = {
        codes: parseInt(localStorage.getItem('asset_codes') || '0', 10),
        silver: parseInt(localStorage.getItem('asset_silver') || '0', 10),
        gold: parseInt(localStorage.getItem('asset_gold') || '0', 10)
      };
      this.listeners = [];
    }
    async sync() { return this.assets; }
    get() { return { ...this.assets }; }
    add(type, amount) { if (this.assets[type] !== undefined) this.assets[type] += amount; }
    onChange(cb) { this.listeners.push(cb); }
  };
}

if (!window.PerformanceMonitor) {
  window.PerformanceMonitor = class {
    constructor() { this.metrics = { fps: 60 }; }
    getMetrics() { return { ...this.metrics }; }
  };
  window.performanceMonitor = new window.PerformanceMonitor();
}

if (!window.AuthUnified) {
  window.AuthUnified = class {
    constructor() { 
      this.state = { authenticated: false, isGuest: true };
      this.listeners = [];
    }
    getState() { return { ...this.state }; }
    onChange(cb) { this.listeners.push(cb); }
  };
  window.authUnified = new window.AuthUnified();
}

if (!window.Guardian3D) {
  window.Guardian3D = class {
    constructor() { this.isInitialized = true; }
  };
}

console.log('[Polyfills] ✅ All core classes available');
import { AppLifecycleManager, onceEvent, safeFetch } from "./core/app-lifecycle.js";
import { SelfHealing } from "./core/self-healing.js";
import { AIBrainEngine } from "./core/ai-brain.js";
import { BatteryManager } from "./core/battery-manager.js";  // 🔋 Battery optimization

// ==========================================
// 🛡️ 1) Self-Healing Rules Registration
// ==========================================

// Rule 1: Auth Desync Fix
SelfHealing.registerRule(
  "auth-desync",
  async () => {
    // Only desync if we have a session but Auth isn't ready
    const hasSession = !!localStorage.getItem('session_token');
    return hasSession && !window.__AUTH_READY__;
  },
  async () => {
    console.warn("🔄 Re-syncing auth...");
    window.dispatchEvent(new Event("auth:retry"));
    // If AuthCore exists, attempt manual refresh
    if (window.AuthCore && typeof window.AuthCore.refresh === 'function') {
        await window.AuthCore.refresh();
    }
    // Record to AI Brain
    AIBrainEngine.record("auth:change", { reason: "desync" });
  },
  15000
);

// Rule 2: YouTube Player Dead
SelfHealing.registerRule(
  "yt-dead",
  async () => !window.__YT_STARTED__,
  async () => {
    console.warn("🎬 Restarting YT player...");
    window.__YT_STARTED__ = false;
    const lifecycle = window.__APP_LIFECYCLE__;
    const ytMod = lifecycle?.modules.get("yt");
    if (ytMod) {
        ytMod.started = false;
        await lifecycle.start();
        // Record to AI Brain
        AIBrainEngine.record("yt:fail", { status: "restart_triggered" });
    }
  },
  20000
);

// Rule 3: Bankode Stuck
SelfHealing.registerRule(
  "bankode-stuck",
  async () => {
    const lastFetch = window.__LAST_FETCH__ || 0;
    return lastFetch > 0 && (Date.now() - lastFetch > 30000); // 30s timeout
  },
  async () => {
    console.warn("🏦 Restarting Bankode fetch...");
    window.__BANKODE_STARTED__ = false;
    const lifecycle = window.__APP_LIFECYCLE__;
    const bankodeMod = lifecycle?.modules.get("bankode");
    if (bankodeMod) {
        bankodeMod.started = false;
        await lifecycle.start();
        // Record to AI Brain
        AIBrainEngine.record("api:error", { source: "bankode_stuck" });
    }
  },
  15000
);

// Rule 4: API Failure Recovery
SelfHealing.registerRule(
  "api-failure",
  async () => (window.__API_ERRORS__ || 0) > 5,
  async () => {
    console.warn("🌐 Resetting API error counter...");
    window.__API_ERRORS__ = 0;
    // Record to AI Brain
    AIBrainEngine.record("api:error", { status: "flood_detected" });
  },
  10000
);

// DISABLED: Rule 5: Reload Loop Detection (causes infinite loops)
/*
SelfHealing.registerRule(
  "reload-loop",
  async () => {
    try {
        const navigation = performance.getEntriesByType("navigation")[0];
        return navigation && navigation.type === 'reload';
    } catch (e) {
        return false;
    }
  },
  async () => {
    console.warn("🚨 Reload detected - system stabilizing");
    // Record to AI Brain
    AIBrainEngine.record("sys:reload");
  },
  30000
);
*/

// ==========================================
// 🧩 2) Module Registrations
// ==========================================

// Auth Module
AppLifecycleManager.register("auth", {
  async init() {
    if (window.DEBUG_MODE) console.log("[Auth] init");
    window.__API_ERRORS__ = 0;
  },

  async start() {
    if (window.DEBUG_MODE) console.log("[Auth] start");

    return new Promise((resolve) => {
      if (window.__AUTH_READY__) {
        if (window.DEBUG_MODE) console.log("[Auth] already ready ✅");
        resolve();
        return;
      }

      onceEvent("auth:ready", () => {
        if (window.DEBUG_MODE) console.log("[Auth] ready handled once ✅");
        // Record auth change to AI Brain
        AIBrainEngine.record("auth:change", { status: "ready" });
        resolve();
      });

      setTimeout(() => {
        if (!window.__AUTH_READY__) {
          console.warn("[Auth] ready timeout - continuing anyway");
          resolve();
        }
      }, 5000);
    });
  }
});

// ACC Module (Assets Central Core)
AppLifecycleManager.register("acc", {
  async init() {
    if (window.DEBUG_MODE) console.log("[ACC] init");
    // Get user from auth or localStorage
    const userId = localStorage.getItem('user_id') || 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user_id', userId);
    
    // Initialize ACC Client
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    window.accClient = ACCClient.init({
        userId: userId,
        serverUrl: isLocal ? 'ws://localhost:3999' : '',
        httpUrl: isLocal ? 'http://localhost:3999/acc' : ''
    });
    
    // Global mirror & gateway
    window.assetMirror = new AssetMirror();
    window.transactionGateway = new TransactionGateway(window.accClient);
  },

  async start() {
    if (window.DEBUG_MODE) console.log("[ACC] start");
    
    // Register bridges
    if (window.PebalaashBridge) window.accClient.registerBridge('pebalaash', new PebalaashBridge());
    if (window.FarragnaBridge) window.accClient.registerBridge('farragna', new FarragnaBridge());
    if (window.BattaloodaBridge) window.accClient.registerBridge('battalooda', new BattaloodaBridge());
    if (window.SafeCodeBridge) window.accClient.registerBridge('safecode', new SafeCodeBridge());
    
    // ACC AssetMirror compact counter removed from yt-new-clear UI
    // window.assetMirror.createMirror('main', 'body', { compact: true });
    
    return new Promise((resolve) => {
        window.accClient.on('connected', () => {
            if (window.DEBUG_MODE) console.log("[ACC] Connected and synchronized");
            resolve();
        });
        
        // Fallback for offline or local dev without server
        setTimeout(() => {
            console.warn("[ACC] Connection timeout - continuing");
            resolve();
        }, 3000);
    });
  }
}, ["auth"]);

// YouTube Module
AppLifecycleManager.register("yt", {
  async init() {
    if (window.DEBUG_MODE) console.log("[YT] init");
  },

  async start() {
    if (window.__YT_STARTED__) return;
    window.__YT_STARTED__ = true;

    if (window.DEBUG_MODE) console.log("[YT] start");

    if (window.YTPlayerController && typeof window.YTPlayerController.start === 'function') {
        await window.YTPlayerController.start();
    } else {
        console.warn("[YT] YouTube controller not found");
        // Record failure to AI Brain
        AIBrainEngine.record("yt:fail", { reason: "controller_missing" });
    }
  }
}, ["auth"]);

// WatchDog Module (Now with AI Brain integration)
AppLifecycleManager.register("watchdog", {
  async start() {
    if (window.__WATCHDOG_RUNNING__) return;
    window.__WATCHDOG_RUNNING__ = true;

    if (window.DEBUG_MODE) console.log("[WatchDog] start");

    setInterval(async () => {
      // ⚡ Skip entirely when app is in background (screen off or minimized)
      if (document.hidden) return;

      if (window.DEBUG_MODE) console.log("🐶 AI WatchDog scanning...");
      
      // Run AI Brain cycle
      await AIBrainEngine.run();
      
      // Run Self-Healing Engine
      await SelfHealing.run();

      // Additional passive monitoring
      const issues = [];
      if (!window.__APP_STARTED__) issues.push("App not started");
      if (!window.__YT_STARTED__) issues.push("YT not running");
      if (!AppLifecycleManager.started) issues.push("Lifecycle not fully started");

      if (issues.length) {
        console.warn("⚠️ WatchDog passive alerts:", issues);
      }
    }, 30000); // ⚡ Raised from 8s → 30s to reduce CPU wake-ups
  }
});

// Bankode Module
AppLifecycleManager.register("bankode", {
  async start() {
    if (window.__BANKODE_STARTED__) return;
    window.__BANKODE_STARTED__ = true;

    if (window.DEBUG_MODE) console.log("[Bankode] start");

    let isFetching = false;
    setInterval(async () => {
      // ⚡ Skip when tab/app is in background to avoid background network drain
      if (document.hidden || isFetching) return;
      isFetching = true;

      try {
        window.__LAST_FETCH__ = Date.now();
        await safeFetch("/api/sqlite/codes", { credentials: 'include' });
        // Reset API errors on success
        window.__API_ERRORS__ = 0;
      } catch(e) {
        console.warn("[Bankode] fetch error:", e.message);
        window.__API_ERRORS__ = (window.__API_ERRORS__ || 0) + 1;
        // Record error to AI Brain
        AIBrainEngine.record("api:error", { source: "bankode_fetch", message: e.message });
      } finally {
        isFetching = false;
      }
    }, 30000); // ⚡ Raised from 8s → 30s to reduce background network requests
  }
}, ["auth"]);

// ==========================================
// 🚀 3) Entry Point Bootstrap
// ==========================================

if (!window.__APP_STARTED__) {
  window.__APP_STARTED__ = true;

  // Environment detection for Render deployment
  const APP_ENV = {
    isRender: window.location.hostname.includes('onrender.com'),
    isLocal: window.location.hostname === 'localhost',
    host: window.location.host
  };

  if (window.DEBUG_MODE) console.log('[App] Environment:', APP_ENV);

  // Disable WebSocket on Render if it causes issues
  if (APP_ENV.isRender) {
    if (window.DEBUG_MODE) console.log('[App] Render deployment detected - adjusting settings');
    // ACC will auto-detect and use HTTP fallback
  }

  window.safeReload = function () {
    console.warn("🔄 Safe reload triggered.");
    window.location.reload();
  };

  async function boot() {
    try {
        await AppLifecycleManager.init();
        await AppLifecycleManager.start();
        if (window.DEBUG_MODE) console.log("✅ App fully started with AI Brain active");

        if (window.DEBUG_MODE) console.log("🛠️  __APP_DEBUG__() -> System Status");
        if (window.DEBUG_MODE) console.log("📊 __HEALTH_REPORT__() -> Repair Logs");
    } catch (err) {
        console.error("❌ App boot failed:", err);
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
