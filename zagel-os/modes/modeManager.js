/**
 * Zagel Mode Manager
 * Handles global system modes: runtime, learning, locked
 */

const MODE_KEY = 'zagel_system_mode';
const DEFAULT_MODE = 'runtime';

const MODES = {
  RUNTIME: 'runtime',
  LEARNING: 'learning',
  LOCKED: 'locked'
};

// Mode change callbacks for UI updates
const modeChangeCallbacks = [];

export const ModeManager = {
  /**
   * Get current system mode
   */
  getMode() {
    const stored = localStorage.getItem(MODE_KEY);
    return stored && Object.values(MODES).includes(stored) ? stored : DEFAULT_MODE;
  },

  /**
   * Set system mode
   */
  setMode(mode) {
    if (!Object.values(MODES).includes(mode)) {
      console.error(`[ModeManager] Invalid mode: ${mode}`);
      return false;
    }
    
    const previousMode = this.getMode();
    localStorage.setItem(MODE_KEY, mode);
    
    // Notify callbacks
    modeChangeCallbacks.forEach(cb => cb(mode, previousMode));
    console.log(`[ModeManager] Mode changed: ${previousMode} -> ${mode}`);
    return true;
  },

  /**
   * Check if in learning mode
   */
  isLearning() {
    return this.getMode() === MODES.LEARNING;
  },

  /**
   * Check if in runtime mode
   */
  isRuntime() {
    return this.getMode() === MODES.RUNTIME;
  },

  /**
   * Check if in locked mode
   */
  isLocked() {
    return this.getMode() === MODES.LOCKED;
  },

  /**
   * Register mode change callback
   */
  onModeChange(callback) {
    if (typeof callback === 'function') {
      modeChangeCallbacks.push(callback);
    }
  },

  /**
   * Remove mode change callback
   */
  offModeChange(callback) {
    const idx = modeChangeCallbacks.indexOf(callback);
    if (idx > -1) {
      modeChangeCallbacks.splice(idx, 1);
    }
  },

  /**
   * Switch to runtime mode (safe fallback)
   */
  toRuntime() {
    return this.setMode(MODES.RUNTIME);
  },

  /**
   * Switch to learning mode (owner only)
   */
  toLearning() {
    return this.setMode(MODES.LEARNING);
  },

  /**
   * Lock system (emergency)
   */
  toLocked() {
    return this.setMode(MODES.LOCKED);
  },

  /**
   * Get mode display info for UI
   */
  getModeInfo() {
    const mode = this.getMode();
    const info = {
      runtime: { label: 'Runtime Mode', icon: '🤖', color: '#00d4ff' },
      learning: { label: 'Developer Mode', icon: '🔧', color: '#9b59b6' },
      locked: { label: 'Locked', icon: '🔒', color: '#e74c3c' }
    };
    return {
      mode,
      ...info[mode],
      isLearning: mode === MODES.LEARNING,
      isRuntime: mode === MODES.RUNTIME,
      isLocked: mode === MODES.LOCKED
    };
  }
};

// Freeze modes to prevent modification
Object.freeze(MODES);

export default ModeManager;
export { MODES };

// Also expose globally for script tag usage
window.ZagelModeManager = ModeManager;
window.ZagelModes = MODES;