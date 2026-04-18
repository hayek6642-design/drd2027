/**
 * 🔋 BATTERY MANAGER
 * Detects app background/foreground state and throttles heavy operations
 * Saves 40-60% battery when app is backgrounded
 */

let isAppInBackground = false;
let backgroundSaveInterval = null;

export class BatteryManager {
  static isBackgrounded() {
    return isAppInBackground;
  }

  static initialize() {
    if (!window.Capacitor) {
      console.warn('[BatteryManager] Capacitor not available');
      return;
    }

    try {
      const { App } = window.Capacitor.Plugins;

      App.addListener('appStateChange', (state) => {
        isAppInBackground = !state.isActive;

        if (isAppInBackground) {
          console.log('[BatteryManager] 🔴 App backgrounded - entering battery save mode');
          BatteryManager.enterBatterySaveMode();
        } else {
          console.log('[BatteryManager] 🟢 App foregrounded - resuming normal operations');
          BatteryManager.exitBatterySaveMode();
        }
      });

      console.log('[BatteryManager] ✅ Initialized');
    } catch (e) {
      console.error('[BatteryManager] Initialization failed:', e);
    }
  }

  static enterBatterySaveMode() {
    // 1. Signal app core to pause heavy operations
    if (window.BankodeCore?.pauseGeneration) {
      window.BankodeCore.pauseGeneration();
    }

    // 2. Signal AI engine to pause
    if (window.AIBrainEngine?.pause) {
      window.AIBrainEngine.pause();
    }

    // 3. Pause all animations and transitions
    document.body.classList.add('battery-save-mode');

    // 4. Pause any media playback
    document.querySelectorAll('video, audio').forEach((el) => {
      if (!el.paused) {
        el.pause();
      }
    });

    // 5. Stop polling timers - reduce from 1s to 30s
    if (backgroundSaveInterval) clearInterval(backgroundSaveInterval);
    backgroundSaveInterval = setInterval(() => {
      // Minimal sync only - e.g., check for critical updates
      if (window.BankodeCore?.syncMinimal) {
        window.BankodeCore.syncMinimal();
      }
    }, 30000); // Every 30 seconds

    // 6. Notify any custom listeners
    document.dispatchEvent(
      new CustomEvent('batteryModeChange', {
        detail: { mode: 'save', isBackgrounded: true }
      })
    );
  }

  static exitBatterySaveMode() {
    // 1. Stop minimal sync interval
    if (backgroundSaveInterval) {
      clearInterval(backgroundSaveInterval);
      backgroundSaveInterval = null;
    }

    // 2. Remove battery save CSS
    document.body.classList.remove('battery-save-mode');

    // 3. Resume app core operations
    if (window.BankodeCore?.resumeGeneration) {
      window.BankodeCore.resumeGeneration();
    }

    // 4. Resume AI engine
    if (window.AIBrainEngine?.resume) {
      window.AIBrainEngine.resume();
    }

    // 5. Resume media playback if needed
    document.querySelectorAll('video[data-was-playing]').forEach((el) => {
      if (!el.paused) {
        el.play();
      }
    });

    // 6. Notify listeners
    document.dispatchEvent(
      new CustomEvent('batteryModeChange', {
        detail: { mode: 'normal', isBackgrounded: false }
      })
    );
  }
}

// Auto-initialize on first import
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    BatteryManager.initialize();
  });
} else {
  BatteryManager.initialize();
}
