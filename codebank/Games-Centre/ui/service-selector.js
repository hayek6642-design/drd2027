/**
 * Service Selector UI Component
 * Interface for selecting communication services
 */

class ServiceSelector {
  constructor() {
    this.element = null;
    this.serviceEngine = null;
    this.currentServices = {
      text: false,
      audio: false,
      video: false
    };
    this.eventListeners = new Map();
  }

  /**
   * Initialize the service selector
   */
  init(elementId, serviceEngine) {
    this.element = document.getElementById(elementId);
    if (!this.element) {
      throw new Error(`Service selector element not found: ${elementId}`);
    }

    this.serviceEngine = serviceEngine;
    this.render();
    this.setupEventListeners();

    console.log('[ServiceSelector] Initialized');
    this.emit('service-selector:ready');
  }

  /**
   * Render the service selector UI
   */
  render() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="service-selector">
        <h3>Communication Services</h3>
        <div class="service-options">
          <div class="service-option">
            <label>
              <input type="checkbox" id="enableTextChat" checked>
              <span class="service-title">Text Chat</span>
              <span class="service-description">Real-time text messaging</span>
            </label>
          </div>

          <div class="service-option">
            <label>
              <input type="checkbox" id="enableAudio">
              <span class="service-title">Audio Call</span>
              <span class="service-description">Voice communication</span>
            </label>
          </div>

          <div class="service-option">
            <label>
              <input type="checkbox" id="enableVideo">
              <span class="service-title">Video Call</span>
              <span class="service-description">Video conferencing</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Text chat toggle
    this.element.querySelector('#enableTextChat')?.addEventListener('change', (e) => {
      this.currentServices.text = e.target.checked;
      this.emit('services:changed', this.currentServices);
    });

    // Audio toggle
    this.element.querySelector('#enableAudio')?.addEventListener('change', (e) => {
      this.currentServices.audio = e.target.checked;
      this.emit('services:changed', this.currentServices);
    });

    // Video toggle
    this.element.querySelector('#enableVideo')?.addEventListener('change', (e) => {
      this.currentServices.video = e.target.checked;
      this.emit('services:changed', this.currentServices);
    });
  }

  /**
   * Get current service configuration
   */
  getCurrentServices() {
    return { ...this.currentServices };
  }

  /**
   * Set service configuration programmatically
   */
  setServices(config) {
    if (config.text !== undefined) {
      this.currentServices.text = config.text;
      const textCheckbox = this.element.querySelector('#enableTextChat');
      if (textCheckbox) textCheckbox.checked = config.text;
    }

    if (config.audio !== undefined) {
      this.currentServices.audio = config.audio;
      const audioCheckbox = this.element.querySelector('#enableAudio');
      if (audioCheckbox) audioCheckbox.checked = config.audio;
    }

    if (config.video !== undefined) {
      this.currentServices.video = config.video;
      const videoCheckbox = this.element.querySelector('#enableVideo');
      if (videoCheckbox) videoCheckbox.checked = config.video;
    }

    this.emit('services:changed', this.currentServices);
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
    window.dispatchEvent(new CustomEvent(`service-selector:${event}`, {
      detail: data
    }));
  }
}

// Singleton instance
const serviceSelector = new ServiceSelector();
export default serviceSelector;