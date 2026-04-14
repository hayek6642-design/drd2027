/**
 * ZAGEL OS Core v2.1.0
 * Global orchestrator for all intelligence layers
 * Boot sequence: Storage → EventBus → Engines → Connectors → UI
 * Mode System: runtime (default), learning (owner), locked (emergency)
 */

(function () {
  'use strict';
  if (window.__ZAGEL_CORE__) return;

  const VERSION = '2.1.0';

  class ZagelCore {
    constructor() {
      this._version = VERSION;
      this._modules = new Map();
      this._status = 'idle'; // idle, booting, ready, error
      this._bootLog = [];
      this._apps = new Map();

      console.log(`🦅 ZAGEL OS v${VERSION} — Core initializing...`);
    }

    async boot() {
      if (this._status === 'ready') {
        console.warn('🦅 [Zagel-Core] Already booted');
        return;
      }

      this._status = 'booting';
      this._log('boot_start', `ZAGEL OS v${VERSION} boot sequence started`);

      try {
        // Phase 0: Mode System (must be first!)
        await this._bootPhase('mode', () => {
          this._register('mode', window.ZagelModeManager);
          this._register('developerGate', window.ZagelDeveloperGate);
          this._register('learning', window.ZagelLearningEngine);
          
          // Initialize developer gate
          if (window.ZagelDeveloperGate) {
            window.ZagelDeveloperGate.initDeveloperGate();
          }
        });

        // Phase 1: Infrastructure
        await this._bootPhase('infrastructure', () => {
          this._register('storage', window.ZagelStore);
          this._register('eventBus', window.ZagelBus);
        });

        // Phase 2: Intelligence Layer
        await this._bootPhase('intelligence', () => {
          this._register('intelligence', window.ZagelIntelligence);
          this._register('priority', window.ZagelPriority);
          this._register('brain', window.ZagelBrain);
        });

        // Phase 3: Emotional Layer
        await this._bootPhase('emotional', () => {
          this._register('emotion', window.ZagelEmotion);
          this._register('personality', window.ZagelPersonality);
        });

        // Phase 4: Evolution Layer
        await this._bootPhase('evolution', () => {
          this._register('memory', window.ZagelMemory);
          this._register('evolution', window.ZagelEvolution);
          this._register('flow', window.ZagelFlow);
        });

        // Phase 5: Interaction Layer
        await this._bootPhase('interaction', () => {
          this._register('conversation', window.ZagelConversation);
          this._register('voice', window.ZagelVoice);
          this._register('automation', window.ZagelAutomation);
        });

        // Phase 6: Action Layer
        await this._bootPhase('action', () => {
          this._register('notification', window.ZagelNotification);
          this._register('trigger', window.ZagelTrigger);
        });

        // Phase 7: Connectors
        await this._bootPhase('connectors', () => {
          if (window.ZagelFarghna) { this._register('farghna', window.ZagelFarghna); window.ZagelFarghna.connect(); }
          if (window.ZagelE7ki) { this._register('e7ki', window.ZagelE7ki); window.ZagelE7ki.connect(); }
        });

        // Phase 8: Load persisted state
        await this._bootPhase('restore', async () => {
          const loadable = ['brain', 'emotion', 'personality', 'memory', 'evolution', 'trigger'];
          for (const name of loadable) {
            const mod = this._modules.get(name);
            if (mod && typeof mod.load === 'function') {
              await mod.load().catch(e => console.warn(`🦅 [Core] Failed to restore ${name}:`, e));
            }
          }
        });

        // Phase 9: Start auto-refresh
        await this._bootPhase('autostart', () => {
          if (window.ZagelIntelligence) window.ZagelIntelligence.startAutoRefresh();
        });

        this._status = 'ready';
        this._log('boot_complete', `ZAGEL OS v${VERSION} fully operational`);

        if (window.ZagelBus) {
          window.ZagelBus.emit('zagel:ready', { version: VERSION, modules: this.getModuleList() });
        }

        console.log(`🦅 ZAGEL OS v${VERSION} — ✅ All systems operational (${this._modules.size} modules)`);
      } catch (err) {
        this._status = 'error';
        this._log('boot_error', err.message);
        console.error('🦅 [Zagel-Core] Boot failed:', err);
      }
    }

    async _bootPhase(name, fn) {
      const start = Date.now();
      try {
        await fn();
        this._log(`phase_${name}`, `completed in ${Date.now() - start}ms`);
      } catch (err) {
        this._log(`phase_${name}_error`, err.message);
        console.warn(`🦅 [Core] Phase "${name}" partial failure:`, err.message);
      }
    }

    _register(name, instance) {
      if (instance) {
        this._modules.set(name, instance);
      } else {
        console.warn(`🦅 [Core] Module "${name}" not available`);
      }
    }

    _log(event, message) {
      this._bootLog.push({ event, message, ts: Date.now() });
    }

    // Public API
    get(moduleName) { return this._modules.get(moduleName); }
    getStatus() { return this._status; }
    getVersion() { return this._version; }
    getModuleList() { return Array.from(this._modules.keys()); }
    getBootLog() { return [...this._bootLog]; }

    registerApp(appId, config) {
      this._apps.set(appId, { ...config, registeredAt: Date.now() });
      if (window.ZagelBus) {
        window.ZagelBus.emit('zagel:app_registered', { appId, config });
      }
    }

    getApps() { return Array.from(this._apps.entries()).map(([id, c]) => ({ id, ...c })); }

    async saveAll() {
      const saveable = ['brain', 'emotion', 'personality', 'memory', 'evolution', 'trigger'];
      for (const name of saveable) {
        const mod = this._modules.get(name);
        if (mod && typeof mod.save === 'function') {
          await mod.save().catch(e => console.warn(`🦅 [Core] Failed to save ${name}:`, e));
        }
      }
      this._log('save_all', 'All module state saved');
    }

    async shutdown() {
      console.log('🦅 [Zagel-Core] Shutting down...');
      await this.saveAll();

      for (const [name, mod] of this._modules) {
        if (typeof mod.destroy === 'function') {
          try { mod.destroy(); } catch (e) { /* */ }
        }
      }

      this._modules.clear();
      this._status = 'idle';
      delete window.__ZAGEL_CORE__;
    }

    // Convenience methods
    async chat(message) { return window.ZagelConversation?.send(message); }
    async command(input) { return window.ZagelAutomation?.execute(input); }
    async speak(text) { return window.ZagelVoice?.speak(text); }
    async notify(opts) { return window.ZagelNotification?.notify(opts); }
    async getIntel() { return window.ZagelIntelligence?.getSummary(); }
    
    // Mode System methods
    getMode() { return window.ZagelModeManager?.getMode() || 'runtime'; }
    isLearning() { return window.ZagelModeManager?.isLearning() || false; }
    isRuntime() { return window.ZagelModeManager?.isRuntime() !== false; }
    setMode(mode) { return window.ZagelModeManager?.setMode(mode); }
    
    // Developer Gate
    recordTap() { return window.ZagelDeveloperGate?.recordZagelTap(); }
    
    // Learning Engine
    getLearningEngine() { return window.ZagelLearningEngine; }
  }

  window.__ZAGEL_CORE__ = new ZagelCore();
  window.Zagel = window.__ZAGEL_CORE__;
})();
