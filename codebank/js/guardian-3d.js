(function() {
  'use strict';

  /**
   * ADAPTER LAYER: GuardianDog3D
   * Acts as the bridge between the system and the 3D watchdog core.
   * Path: /codebank/js/guardian-3d.js
   */
  class GuardianDog3D {
    constructor(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn('[Guardian3D] Container not found:', containerId);
        return;
      }
      
      this.container = container;
      this.dogInstance = null;
      this.state = 'idle';
      this.isDestroyed = false;
      this.tempTimerId = null;

      // Map current system states to 3D states
      this.stateMap = {
        'idle': 'idle',
        'monitoring': 'watching',
        'threat detected': 'alert',
        'healing': 'healing',
        'dead': 'dead'
      };

      this.init();
    }

    /**
     * Initializes the 3D core instance
     */
    async init() {
      if (this.isDestroyed) return;

      try {
        // Dynamic import of the single source of truth core
        const { createWatchDog } = await import('/shared/watchdog-core/watchdog-core.js');
        
        // Ensure no duplicate instance exists in this container
        this.cleanupContainer();

        this.dogInstance = createWatchDog(this.container, {
          initialState: this.stateMap[this.state] || 'idle',
          onDogClick: (info) => {
            window.dispatchEvent(new CustomEvent('guardian:dog-clicked', {
              detail: { isDead: info.isDead, timestamp: Date.now() }
            }));
          }
        });

        console.log('[Guardian3D] Watchdog Core initialized successfully');
      } catch (error) {
        console.error('[Guardian3D] Failed to load Watchdog Core:', error);
        this.fallbackToCSS();
      }
    }

    /**
     * Sets the state of the watchdog
     * @param {string} state - System state
     */
    setState(state) {
      if (this.isDestroyed || !this.stateMap || this.state === state) return;
      
      this.state = state;
      const targetState = (this.stateMap && this.stateMap[state]) || state; // Fallback to literal if not in map
      
      if (this.dogInstance) {
        this.dogInstance.setState(targetState);
      }

      console.log(`[Guardian3D] State change: ${state} -> ${targetState}`);
      
      // Dispatch event for system-wide sync
      window.dispatchEvent(new CustomEvent('guardian:state-changed', { 
        detail: { state, targetState } 
      }));
    }

    /**
     * Cleans up the container before initialization
     */
    cleanupContainer() {
      // Hide fallback if it exists
      const fallback = this.container.querySelector('#guardian-dog-fallback');
      if (fallback) fallback.style.display = 'none';

      // Remove any existing canvas or Three.js elements
      const oldCanvas = this.container.querySelectorAll('canvas');
      oldCanvas.forEach(canvas => canvas.remove());
    }

    /**
     * Fallback to CSS animation if 3D fails
     */
    fallbackToCSS() {
      console.warn('[Guardian3D] Falling back to CSS');
      const fallback = this.container.querySelector('#guardian-dog-fallback');
      if (fallback) {
        fallback.style.display = 'block';
        fallback.className = `watchdog ${this.state}`;
      }
    }

    /**
     * Fully destroys the adapter and the core instance
     */
    destroy() {
      this.isDestroyed = true;
      if (this.tempTimerId && window.TimerManager) {
        window.TimerManager.clearTimeout(this.tempTimerId);
      }
      if (this.dogInstance) {
        this.dogInstance.destroy();
        this.dogInstance = null;
      }
      console.log('[Guardian3D] Adapter and Core destroyed');
    }
  }

  // Lifecycle & Singleton Management
  const initGuardian = () => {
    // 🔒 Rule: Only ONE watchdog instance allowed
    if (window.__GUARDIAN__) {
      console.log('[Guardian3D] Re-initializing existing guardian');
      window.__GUARDIAN__.destroy();
    }

    const containerId = 'guardian-dog-container';
    window.__GUARDIAN__ = new GuardianDog3D(containerId);
    console.log('[GUARDIAN INSTANCE]', window.__GUARDIAN__);

    // 🔗 Connect to SystemBus / Events
    const bindSystemEvents = () => {
      const dog = window.__GUARDIAN__;
      const bus = window.SystemBus;
      const tm = window.TimerManager;

      // Event -> State mapping
      const handlers = [
        { event: 'integrity:ok', state: 'monitoring' },
        { event: 'integrity:mismatch', state: 'threat detected' },
        { event: 'system:idle', state: 'idle' },
        { event: 'codes:updated', state: 'monitoring' },
        { event: 'tx:success', state: 'threat detected', temp: true }
      ];

      handlers.forEach(({ event, state, temp }) => {
        const callback = () => {
          if (dog.isDestroyed) return;
          dog.setState(state);
          if (temp) {
            // Temporary alert state for success, then back to idle
            if (dog.tempTimerId && tm) {
              tm.clearTimeout(dog.tempTimerId);
            }
            
            const timerFn = () => {
              if (!dog.isDestroyed && dog.state === state) {
                dog.setState('idle');
              }
            };

            if (window.TimerManager) {
              dog.tempTimerId = window.TimerManager.setTimeout(timerFn, 2000);
            } else {
              console.error('[Guardian3D] TimerManager missing! Falling back to direct setTimeout.');
              dog.tempTimerId = setTimeout(timerFn, 2000);
            }
          }
        };

        if (bus && typeof bus.on === 'function') {
          bus.on(event, callback);
        } else {
          window.addEventListener(event, callback);
        }
      });
    };

    bindSystemEvents();
  };

  // Entry Point
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuardian);
  } else {
    initGuardian();
  }

  // Export class for manual instantiation if needed (though singleton is preferred)
  window.GuardianDog3D = GuardianDog3D;

})();
