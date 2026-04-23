/**
 * ServiceManager - Lazy Loading Service Architecture
 * Manages the lifecycle of iframe-based services in Codebank.
 */
class ServiceManager {
  constructor() {
    this.activeService = null;
    this.serviceRegistry = {
      samma3ny: { url: './samma3ny/index.html', preload: false },
      farragna: { url: './farragna/index.html', preload: false },
      e7ki: { url: './e7ki/index.html', preload: false },
      safecode: { url: './safecode/index.html', preload: true },
      games: { url: './Games-Centre/index.html', preload: false },
      eb3at: { url: './eb3at/index.html', preload: false },
      oneworld: { url: './oneworld/index.html', preload: false },
      corsa: { url: './corsa/index.html', preload: false },
      qarsan: { url: './qarsan/index.html', preload: false }
    };
    this.mountedIframes = new Map();
    this.init();
  }

  init() {
    console.log('[ServiceManager] Initialized');
    // Listen for messages from iframes to maintain the bridge
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  /**
   * Mount a service into a container
   * @param {string} serviceId 
   * @param {HTMLElement} container 
   */
  async mount(serviceId, container) {
    if (!this.serviceRegistry[serviceId]) {
      console.error(`[ServiceManager] Service ${serviceId} not found in registry`);
      return;
    }

    // Unmount current service if it's different
    if (this.activeService && this.activeService !== serviceId) {
      this.unmount(this.activeService);
    }

    console.log(`[ServiceManager] Mounting ${serviceId}...`);
    
    let iframe;
    if (this.mountedIframes.has(serviceId)) {
      iframe = this.mountedIframes.get(serviceId);
      iframe.style.display = 'block';
    } else {
      iframe = this.createIframe(serviceId);
      this.mountedIframes.set(serviceId, iframe);
    }

    // Ensure container is empty or manage child properly
    // For now, we'll append to the container if not already there
    if (!container.contains(iframe)) {
      container.appendChild(iframe);
    }

    this.activeService = serviceId;
    
    // Notify system of service change
    window.dispatchEvent(new CustomEvent('service:mounted', { detail: { serviceId } }));
  }

  /**
   * Unmount a service
   * @param {string} serviceId 
   */
  unmount(serviceId) {
    if (this.activeService === serviceId) {
      this.activeService = null;
    }

    const iframe = this.mountedIframes.get(serviceId);
    if (iframe) {
      console.log(`[ServiceManager] Unmounting ${serviceId}...`);
      // We hide it instead of destroying to preserve state if needed, 
      // but Phase 1 says "Allow unmounting services". 
      // To really reduce memory, we should probably remove from DOM.
      iframe.style.display = 'none';
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      
      // If we want to fully purge memory, we'd delete the iframe object too.
      // For Phase 1, we'll remove from DOM but keep in map for quick remount
      // unless we explicitly want to destroy state.
    }
  }

  createIframe(serviceId) {
    const config = this.serviceRegistry[serviceId];
    const iframe = document.createElement('iframe');
    iframe.id = `${serviceId}-service-iframe`;
    iframe.src = config.url;
    iframe.className = 'w-full h-full border-0';
    iframe.style.display = 'block';
    iframe.setAttribute('loading', 'lazy');
    
    // Standard service permissions
    iframe.setAttribute('allow', 'camera; microphone; clipboard-read; clipboard-write; geolocation');
    
    iframe.onload = () => {
      console.log(`[ServiceManager] ${serviceId} iframe loaded`);
      // Trigger handshake or initial sync if needed
    };

    return iframe;
  }

  handleMessage(event) {
    // Preserve postMessage bridge
    // Validation of origin should be handled here if possible, 
    // but we'll maintain existing behavior for now.
    
    const data = event.data;
    if (!data) return;

    // Relay messages to safe-asset-list.js or other core components
    // Existing logic in indexCB.html handles many of these.
    
    if (data.type === 'SERVICE_READY') {
      console.log(`[ServiceManager] Service ${data.serviceId} reports ready`);
    }
  }

  getServiceConfig(serviceId) {
    return this.serviceRegistry[serviceId];
  }
}

// Export as a singleton for the browser
window.serviceManager = new ServiceManager();
window.openService = (id) => {
  const container = document.getElementById('service-container');
  if (container) {
    window.serviceManager.mount(id, container);
  } else {
    console.error('Service container not found');
  }
};
