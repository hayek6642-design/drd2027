// src/core/service-manager-v2.js

/**
 * ServiceManager V2 - Optimized for Mobile & Performance
 * Features: True lazy loading, memory cleanup, Capacitor-ready
 */

class ServiceManagerV2 {
  constructor() {
    this.activeServices = new Map();
    this.servicePool = new Map();
    this.maxConcurrentServices = 1; // Only 1 active at a time
    this.memoryLimit = 50 * 1024 * 1024; // 50MB limit
    
    this.observers = new Map();
    this.intersectionObserver = null;
    
    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.setupMemoryPressureHandler();
    this.setupVisibilityHandler();
    
    // Performance monitoring
    this.metrics = {
      loadTimes: new Map(),
      memorySnapshots: [],
      errors: []
    };
  }

  setupIntersectionObserver() {
    // Only render visible elements
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const serviceId = entry.target.dataset.serviceId;
        
        if (entry.isIntersecting) {
          this.preloadService(serviceId);
        } else {
          // Pause non-visible services
          this.pauseService(serviceId);
        }
      });
    }, {
      root: null,
      rootMargin: '50px',
      threshold: 0.1
    });
  }

  setupMemoryPressureHandler() {
    // Listen for memory pressure (Chrome only)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      setInterval(async () => {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || Infinity;
        const percentUsed = (usage / quota) * 100;
        
        if (percentUsed > 80) {
          console.warn('[ServiceManager] Memory pressure detected:', percentUsed + '%');
          this.emergencyCleanup();
        }
      }, 30000); // Check every 30 seconds
    }
  }

  setupVisibilityHandler() {
    // Pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAllServices();
      } else {
        this.resumeActiveService();
      }
    });
  }

  async mountService(serviceId, container) {
    // Check if already at limit
    if (this.activeServices.size >= this.maxConcurrentServices) {
      await this.unmountOldestService();
    }

    // Cleanup any existing iframes in container
    this.cleanupContainer(container);

    const service = await this.loadServiceModule(serviceId);
    
    // Create optimized iframe
    const iframe = this.createOptimizedIframe(serviceId, service);
    container.appendChild(iframe);

    // Track in active services
    this.activeServices.set(serviceId, {
      iframe,
      mountedAt: Date.now(),
      lastActivity: Date.now(),
      memoryCheckpoint: performance.memory?.usedJSHeapSize || 0
    });

    // Setup message bridge for Capacitor compatibility
    this.setupMessageBridge(iframe, serviceId);

    return iframe;
  }

  createOptimizedIframe(serviceId, serviceConfig) {
    const iframe = document.createElement('iframe');
    
    // Optimized attributes for performance
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('importance', 'high');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    
    // Disable expensive features when not needed
    iframe.setAttribute('allow', 'autoplay; encrypted-media;');
    
    // Efficient src setting
    const params = new URLSearchParams({
      service: serviceId,
      standalone: 'true',
      t: Date.now() // Cache bust for development
    });
    
    iframe.src = `${serviceConfig.url}?${params}`;
    
    // Styles for GPU acceleration
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      contain: strict; /* CSS containment for performance */
      content-visibility: auto;
    `;

    // Unload handler
    iframe.addEventListener('load', () => {
      this.optimizeIframeContent(iframe);
    });

    return iframe;
  }

  optimizeIframeContent(iframe) {
    try {
      // Access iframe content and optimize
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Pause animations in background
      const style = doc.createElement('style');
      style.textContent = `
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* Optimize paint operations */
        .service-container {
          contain: layout style paint;
        }
        
        /* GPU acceleration for scroll */
        .scrollable {
          transform: translateZ(0);
          will-change: transform;
        }
      `;
      doc.head.appendChild(style);

    } catch (e) {
      // Cross-origin restriction, ignore
    }
  }

  async unmountService(serviceId) {
    const service = this.activeServices.get(serviceId);
    if (!service) return;

    const { iframe } = service;

    // Step 1: Stop all activity
    iframe.contentWindow?.postMessage({ type: 'service:pause' }, '*');
    
    // Step 2: Clear src to stop loading
    iframe.src = 'about:blank';
    
    // Step 3: Remove from DOM after brief delay (allow cleanup)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 4: Destroy iframe
    iframe.remove();
    
    // Step 5: Force garbage collection hint
    this.activeServices.delete(serviceId);
    
    // Step 6: Clear any cached data for this service
    this.clearServiceCache(serviceId);

    console.log(`[ServiceManager] Unmounted ${serviceId}`);
  }

  async unmountOldestService() {
    if (this.activeServices.size === 0) return;
    
    // Find oldest inactive service
    let oldest = null;
    let oldestTime = Infinity;
    
    for (const [id, service] of this.activeServices) {
      if (service.lastActivity < oldestTime) {
        oldestTime = service.lastActivity;
        oldest = id;
      }
    }
    
    if (oldest) {
      await this.unmountService(oldest);
    }
  }

  cleanupContainer(container) {
    // Aggressive cleanup
    while (container.firstChild) {
      const child = container.firstChild;
      
      if (child.tagName === 'IFRAME') {
        child.src = 'about:blank';
      }
      
      child.remove();
    }
    
    // Force layout recalculation
    container.offsetHeight;
  }

  async loadServiceModule(serviceId) {
    // Dynamic import for code splitting
    const module = await import(`../services/${serviceId}/index.js`);
    return module.default || module;
  }

  pauseService(serviceId) {
    const service = this.activeServices.get(serviceId);
    if (service?.iframe?.contentWindow) {
      service.iframe.contentWindow.postMessage({ type: 'service:pause' }, '*');
      service.iframe.style.visibility = 'hidden';
    }
  }

  resumeService(serviceId) {
    const service = this.activeServices.get(serviceId);
    if (service?.iframe?.contentWindow) {
      service.iframe.style.visibility = 'visible';
      service.iframe.contentWindow.postMessage({ type: 'service:resume' }, '*');
      service.lastActivity = Date.now();
    }
  }

  pauseAllServices() {
    this.activeServices.forEach((service, id) => {
      this.pauseService(id);
    });
  }

  resumeActiveService() {
    // Resume most recent
    let mostRecent = null;
    let recentTime = 0;
    
    for (const [id, service] of this.activeServices) {
      if (service.lastActivity > recentTime) {
        recentTime = service.lastActivity;
        mostRecent = id;
      }
    }
    
    if (mostRecent) {
      this.resumeService(mostRecent);
    }
  }

  emergencyCleanup() {
    console.warn('[ServiceManager] Emergency cleanup initiated');
    
    // Unmount all except current
    const current = Array.from(this.activeServices.keys()).pop();
    
    for (const [id, service] of this.activeServices) {
      if (id !== current) {
        this.unmountService(id);
      }
    }
    
    // Clear image caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('image') || name.includes('media')) {
            caches.delete(name);
          }
        });
      });
    }
  }

  clearServiceCache(serviceId) {
    // Clear IndexedDB caches for service
    const req = indexedDB.open('CodeBankCache', 1);
    req.onsuccess = (event) => {
      const db = event.target.result;
      if (db.objectStoreNames.contains(serviceId)) {
        const tx = db.transaction(serviceId, 'readwrite');
        tx.objectStore(serviceId).clear();
      }
    };
  }

  setupMessageBridge(iframe, serviceId) {
    // Bridge for parent-child communication (Capacitor-ready)
    window.addEventListener('message', (e) => {
      if (e.source !== iframe.contentWindow) return;
      
      switch (e.data.type) {
        case 'service:ready':
          this.resumeService(serviceId);
          break;
          
        case 'service:request-data':
          // Forward to AssetBus or parent
          window.dispatchEvent(new CustomEvent('service-data-request', {
            detail: { serviceId, request: e.data.payload }
          }));
          break;
          
        case 'service:error':
          this.metrics.errors.push({
            service: serviceId,
            error: e.data.error,
            time: Date.now()
          });
          break;
      }
    });
  }

  // Capacitor-specific: Handle app backgrounding
  handleAppStateChange(state) {
    if (state.isActive) {
      this.resumeActiveService();
    } else {
      this.pauseAllServices();
      // Save state
      this.saveState();
    }
  }

  saveState() {
    const state = {
      activeServices: Array.from(this.activeServices.keys()),
      timestamp: Date.now()
    };
    sessionStorage.setItem('serviceManagerState', JSON.stringify(state));
  }

  restoreState() {
    const saved = sessionStorage.getItem('serviceManagerState');
    if (saved) {
      const state = JSON.parse(saved);
      // Don't auto-restore, just log
      console.log('[ServiceManager] Previous state:', state);
    }
  }

  // Performance metrics
  getMetrics() {
    return {
      activeCount: this.activeServices.size,
      memoryUsed: performance.memory?.usedJSHeapSize || 0,
      loadTimes: Object.fromEntries(this.metrics.loadTimes),
      recentErrors: this.metrics.errors.slice(-10)
    };
  }
}

// Singleton export
export const serviceManager = new ServiceManagerV2();

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
  serviceManager.activeServices.forEach((_, id) => {
    serviceManager.unmountService(id);
  });
});

// Capacitor integration
if (window.Capacitor) {
  const { App } = require('@capacitor/app');
  
  App.addListener('appStateChange', (state) => {
    serviceManager.handleAppStateChange(state);
  });
  
  App.addListener('pause', () => {
    serviceManager.pauseAllServices();
  });
  
  App.addListener('resume', () => {
    serviceManager.resumeActiveService();
  });
}