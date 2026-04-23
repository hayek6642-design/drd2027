// src/core/service-manager-v2.js - AGGRESSIVE MEMORY FIX
// KEY CHANGE: Destroy iframes completely, never use display:none or visibility:hidden

class ServiceManagerV2 {
  constructor() {
    this.activeService = null;
    this.container = document.getElementById('service-stage');
    this.config = {
      maxMemoryMB: 50,
      checkInterval: 30000,
      forceCleanupThreshold: 200
    };
  }

  async mount(serviceId) {
    console.log(`[ServiceManager] Mounting ${serviceId}...`);
    if (this.activeService) {
      await this.unmountService(this.activeService);
      await new Promise(r => setTimeout(r, 100));
    }
    this.cleanupContainer(this.container);
    const iframe = document.createElement('iframe');
    iframe.id = `service-${serviceId}`;
    iframe.src = `/service/${serviceId}/index.html`;
    iframe.sandbox.add('allow-scripts', 'allow-same-origin', 'allow-forms');
    iframe.style.cssText = `width:100%;height:100%;border:none;display:block;contain:strict;content-visibility:auto;`;
    this.container.appendChild(iframe);
    this.activeService = serviceId;
    this.startMemoryMonitoring(serviceId);
    console.log(`[ServiceManager] ✅ Mounted ${serviceId}, Memory: ${this.getMemoryMB()}MB`);
    return iframe;
  }

  async unmountService(serviceId) {
    if (!this.activeService || this.activeService !== serviceId) return;
    console.log(`[ServiceManager] Unmounting ${serviceId}...`);
    const iframe = document.querySelector(`[id="service-${serviceId}"]`);
    if (!iframe) {
      this.activeService = null;
      return;
    }
    try {
      iframe.contentWindow?.postMessage({ type: 'service:cleanup', timestamp: Date.now() }, '*');
    } catch (e) {}
    iframe.src = 'about:blank';
    iframe.remove();
    this.activeService = null;
    if (window.gc) window.gc();
    console.log(`[ServiceManager] ✅ Unmounted, Memory: ${this.getMemoryMB()}MB`);
  }

  cleanupContainer(container) {
    while (container.firstChild) {
      const child = container.firstChild;
      if (child.tagName === 'IFRAME') {
        try { child.src = 'about:blank'; } catch (e) {}
      }
      child.remove();
    }
    container.offsetHeight;
  }

  startMemoryMonitoring(serviceId) {
    const monitor = setInterval(() => {
      const memMB = this.getMemoryMB();
      if (memMB > this.config.forceCleanupThreshold) {
        console.warn(`[ServiceManager] MEMORY ALERT: ${memMB}MB`);
        clearInterval(monitor);
        this.emergencyCleanup();
      }
    }, this.config.checkInterval);
  }

  async emergencyCleanup() {
    console.warn('[ServiceManager] 🚨 EMERGENCY CLEANUP');
    if (this.activeService) {
      await this.unmountService(this.activeService);
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.startsWith('service-') || name.startsWith('assets-')) {
          await caches.delete(name);
        }
      }
    }
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('service-')) {
        localStorage.removeItem(key);
      }
    }
    if (window.gc) {
      window.gc();
      console.log(`[ServiceManager] ✅ Cleanup done, Memory: ${this.getMemoryMB()}MB`);
    }
  }

  getMemoryMB() {
    if (!performance.memory) return 0;
    return Math.round(performance.memory.usedJSHeapSize / 1048576);
  }

  getStatus() {
    return {
      activeService: this.activeService,
      memoryMB: this.getMemoryMB(),
      iframeCount: document.querySelectorAll('iframe').length
    };
  }
}

export const serviceManager = new ServiceManagerV2();

if (window.Capacitor) {
  window.addEventListener('pagehide', async () => {
    if (serviceManager.activeService) {
      await serviceManager.unmountService(serviceManager.activeService);
    }
  });
}