/**
 * Mode Registry
 * Central registry for all game modes
 */

class ModeRegistry {
  constructor() {
    this.modes = new Map();
    this.modeMetadata = new Map();
  }

  /**
   * Register a game mode
   */
  register(modeId, modeHandler, metadata = {}) {
    if (!modeHandler || typeof modeHandler.start !== 'function') {
      throw new Error(`Invalid mode handler: ${modeId}`);
    }

    console.log(`[ModeRegistry] Registering mode: ${modeId}`);
    this.modes.set(modeId, modeHandler);
    this.modeMetadata.set(modeId, {
      id: modeId,
      title: metadata.title || modeId.replace(/-/g, ' '),
      description: metadata.description || `Play in ${modeId} mode`,
      ...metadata
    });

    // Emit registration event
    window.dispatchEvent(new CustomEvent('mode-registry:registered', {
      detail: { modeId, metadata: this.modeMetadata.get(modeId) }
    }));
  }

  /**
   * Get a mode handler by ID
   */
  getMode(modeId) {
    return this.modes.get(modeId);
  }

  /**
   * Get mode metadata
   */
  getMetadata(modeId) {
    return this.modeMetadata.get(modeId);
  }

  /**
   * Get all registered modes
   */
  getAllModes() {
    return Array.from(this.modes.entries()).map(([modeId, modeHandler]) => ({
      modeId,
      handler: modeHandler,
      metadata: this.modeMetadata.get(modeId)
    }));
  }

  /**
   * Check if mode exists
   */
  hasMode(modeId) {
    return this.modes.has(modeId);
  }

  /**
   * Unregister a mode
   */
  unregister(modeId) {
    this.modes.delete(modeId);
    this.modeMetadata.delete(modeId);
    window.dispatchEvent(new CustomEvent('mode-registry:unregistered', {
      detail: { modeId }
    }));
  }

  /**
   * Clear all modes
   */
  clear() {
    this.modes.clear();
    this.modeMetadata.clear();
    window.dispatchEvent(new CustomEvent('mode-registry:cleared'));
  }
}

// Singleton instance
const modeRegistry = new ModeRegistry();
export default modeRegistry;