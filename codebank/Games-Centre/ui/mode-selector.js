/**
 * Mode Selector UI Component
 * Interface for selecting game modes
 */

class ModeSelector {
  constructor() {
    this.element = null;
    this.modeRegistry = null;
    this.currentMode = null;
    this.eventListeners = new Map();
  }

  /**
   * Initialize the mode selector
   */
  init(elementId, modeRegistry) {
    this.element = document.getElementById(elementId);
    if (!this.element) {
      throw new Error(`Mode selector element not found: ${elementId}`);
    }

    this.modeRegistry = modeRegistry;
    this.render();
    this.setupEventListeners();

    console.log('[ModeSelector] Initialized');
    this.emit('mode-selector:ready');
  }

  /**
   * Render the mode selector UI
   */
  render() {
    if (!this.element) return;

    const modes = this.modeRegistry.getAllModes();

    this.element.innerHTML = `
      <div class="mode-selector">
        <h3>Select Game Mode</h3>
        <div class="mode-options">
          ${modes.map(mode => `
            <div class="mode-option" data-mode-id="${mode.modeId}">
              <label>
                <input type="radio" name="gameMode" value="${mode.modeId}">
                <span class="mode-title">${mode.metadata.title}</span>
                <span class="mode-description">${mode.metadata.description}</span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.element.querySelectorAll('input[name="gameMode"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const modeId = e.target.value;
        this.currentMode = modeId;
        console.log(`[ModeSelector] Mode selected: ${modeId}`);
        this.emit('mode:selected', { modeId });
      });
    });
  }

  /**
   * Set current mode programmatically
   */
  setMode(modeId) {
    const input = this.element.querySelector(`input[value="${modeId}"]`);
    if (input) {
      input.checked = true;
      this.currentMode = modeId;
      this.emit('mode:selected', { modeId });
    }
  }

  /**
   * Get current selected mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Event system
   */
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.eventListeners.get(event) || [];
    handlers.forEach(handler => handler(data));

    // Also emit as DOM event
    window.dispatchEvent(new CustomEvent(`mode-selector:${event}`, {
      detail: data
    }));
  }
}

// Singleton instance
const modeSelector = new ModeSelector();
export default modeSelector;