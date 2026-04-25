// service-manager-v3.js
// Ultra-optimized service manager for CodeBank ecosystem
// Features: Lazy loading, memory pooling, auth bridge, performance monitoring

(function() {
  'use strict';

  const ServiceManager = {
    // Configuration
    config: {
      maxActiveServices: 2,        // Keep only 2 services in memory
      preloadCritical: ['eb3at'],    // Preload critical services
      cacheTimeout: 5 * 60 * 1000, // 5 minutes cache
      enablePooling: true,
      debug: false
    },

    // State
    activeServices: new Map(),       // Currently mounted services
    servicePool: new Map(),          // Pooled service instances
    serviceRegistry: {
      // Core services
      codebank: { 
        name: 'CodeBank', 
        path: '/codebank/indexCB/',
        priority: 'high',
        preload: true 
      },
      safecode: { 
        name: 'SafeCode', 
        path: '/codebank/safecode/',
        priority: 'medium' 
      },
      
      // External services
      e7ki: { 
        name: 'E7ki', 
        path: '/services/e7ki/dist/index.html',
        priority: 'high',
        features: ['realtime', 'chat']
      },
      farragna: { 
        name: 'Farragna', 
        path: '/services/farragna/index.html',
        priority: 'medium' 
      },
      samma3ny: { 
        name: 'Samma3ny', 
        path: '/services/samma3ny/index.html',
        priority: 'medium' 
      },
      pebalaash: { 
        name: 'Pebalaash', 
        path: '/services/pebalaash/index.html',
        priority: 'low' 
      },
      eb3at: { 
        name: 'Eb3at', 
        path: '/services/eb3at/index.html',
        priority: 'high',
        preload: true 
      },
      games: { 
        name: 'Games', 
        path: '/services/games/index.html',
        priority: 'low' 
      }
    },

    // Performance metrics
    metrics: {
      loadTimes: new Map(),
      memoryUsage: [],
      errors: []
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
      this.setupAuthBridge();
      this.setupMemoryManagement();
      this.preloadCriticalServices();
      this.setupPerformanceObserver();
      
      console.log('[ServiceManager] V3 initialized');
    },

    // ============================================
    // AUTH BRIDGE (Universal)
    // ============================================

    setupAuthBridge() {
      // Listen for auth ready
      window.addEventListener('auth:ready', (e) => {
        this.broadcastToServices('auth:updated', e.detail);
      });

      // Listen for auth changes
      window.addEventListener('auth:changed', (e) => {
        this.broadcastToServices('auth:changed', e.detail);
      });

      // Expose auth to all services via postMessage
      this.authProxy = {
        isAuthenticated: () => window.Auth?.isAuthenticated?.() || false,
        getUser: () => window.Auth?.getUser?.() || null,
        getToken: () => window.Auth?.getToken?.() || null
      };
    },

    broadcastToServices(type, data) {
      this.activeServices.forEach((service, id) => {
        if (service.iframe && service.iframe.contentWindow) {
          service.iframe.contentWindow.postMessage({
            type: type,
            payload: data,
            timestamp: Date.now()
          }, '*');
        }
      });
    },

    // ============================================
    // SERVICE LOADING (Lazy + Pooling)
    // ============================================

    async loadService(serviceId, containerId, options = {}) {
      const registry = this.serviceRegistry[serviceId];
      if (!registry) {
        throw new Error(`Unknown service: ${serviceId}`);
      }

      // Check if already active
      if (this.activeServices.has(serviceId)) {
        this.activateService(serviceId);
        return this.activeServices.get(serviceId);
      }

      // Check pool
      if (this.config.enablePooling && this.servicePool.has(serviceId)) {
        const pooled = this.servicePool.get(serviceId);
        this.servicePool.delete(serviceId);
        this.mountService(serviceId, pooled, containerId);
        return pooled;
      }

      // Enforce max active services limit (LRU eviction)
      await this.enforceServiceLimit();

      // Load new service
      const startTime = performance.now();
      const service = await this.createService(serviceId, registry, containerId);
      
      // Record metrics
      this.metrics.loadTimes.set(serviceId, performance.now() - startTime);
      
      return service;
    },

    async createService(serviceId, registry, containerId) {
      const container = document.getElementById(containerId);
      if (!container) throw new Error(`Container not found: ${containerId}`);

      // Create iframe with optimizations
      const iframe = document.createElement('iframe');
      iframe.src = this.buildServiceUrl(registry.path);
      iframe.id = `service-${serviceId}`;
      iframe.className = 'service-frame';
      
      // Performance attributes
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
      iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; geolocation; microphone; camera');
      
      // CSS optimizations
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        display: none;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;

      // Wrap in container
      const wrapper = document.createElement('div');
      wrapper.id = `wrapper-${serviceId}`;
      wrapper.className = 'service-wrapper';
      wrapper.style.cssText = 'width:100%;height:100%;display:none;';
      
      wrapper.appendChild(iframe);
      container.appendChild(wrapper);

      // Wait for load
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Load timeout')), 30000);
        
        iframe.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        iframe.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load'));
        };
      });

      const service = {
        id: serviceId,
        iframe: iframe,
        wrapper: wrapper,
        registry: registry,
        loadedAt: Date.now(),
        lastActive: Date.now(),
        isActive: false
      };

      this.activeServices.set(serviceId, service);
      this.setupServiceBridge(service);
      
      return service;
    },

    buildServiceUrl(path) {
      const url = new URL(path, window.location.href);
      url.searchParams.set('auth_origin', window.location.origin);
      url.searchParams.set('v', '3'); // Version flag
      url.searchParams.set('_t', Date.now()); // Cache bust
      return url.toString();
    },

    // ============================================
    // SERVICE LIFECYCLE
    // ============================================

    activateService(serviceId) {
      const service = this.activeServices.get(serviceId);
      if (!service) return;

      // Deactivate others
      this.activeServices.forEach((s, id) => {
        if (id !== serviceId) this.deactivateService(id);
      });

      // Activate this one
      service.wrapper.style.display = 'block';
      service.iframe.style.display = 'block';
      
      // Trigger reflow then fade in
      requestAnimationFrame(() => {
        service.iframe.style.opacity = '1';
      });

      service.isActive = true;
      service.lastActive = Date.now();

      // Notify service
      this.sendToService(serviceId, 'service:activated');
      
      console.log('[ServiceManager] Activated:', serviceId);
    },

    deactivateService(serviceId) {
      const service = this.activeServices.get(serviceId);
      if (!service || !service.isActive) return;

      service.iframe.style.opacity = '0';
      
      setTimeout(() => {
        service.wrapper.style.display = 'none';
        service.iframe.style.display = 'none';
      }, 300);

      service.isActive = false;
      this.sendToService(serviceId, 'service:deactivated');
    },

    async destroyService(serviceId) {
      const service = this.activeServices.get(serviceId);
      if (!service) return;

      // Send cleanup message
      this.sendToService(serviceId, 'service:destroy');

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Remove from DOM
      service.wrapper.remove();
      
      // Remove from active
      this.activeServices.delete(serviceId);

      console.log('[ServiceManager] Destroyed:', serviceId);
    },

    async enforceServiceLimit() {
      if (this.activeServices.size < this.config.maxActiveServices) return;

      // Find oldest inactive service
      let oldest = null;
      let oldestTime = Infinity;

      this.activeServices.forEach((service, id) => {
        if (!service.isActive && service.lastActive < oldestTime) {
          oldest = id;
          oldestTime = service.lastActive;
        }
      });

      if (oldest) {
        // Move to pool instead of destroying
        if (this.config.enablePooling) {
          const service = this.activeServices.get(oldest);
          this.servicePool.set(oldest, service);
          this.activeServices.delete(oldest);
          
          // Hide but keep in DOM
          service.wrapper.style.display = 'none';
        } else {
          await this.destroyService(oldest);
        }
      }
    },

    // ============================================
    // SERVICE COMMUNICATION
    // ============================================

    setupServiceBridge(service) {
      // Listen for messages from service
      window.addEventListener('message', (e) => {
        if (e.source !== service.iframe.contentWindow) return;
        
        this.handleServiceMessage(service.id, e.data);
      });
    },

    handleServiceMessage(serviceId, data) {
      switch(data.type) {
        case 'service:ready':
          console.log('[ServiceManager] Service ready:', serviceId);
          break;
          
        case 'service:request-auth':
          // Send auth data
          this.sendToService(serviceId, 'auth:response', this.authProxy);
          break;
          
        case 'service:error':
          console.error('[ServiceManager] Service error:', serviceId, data.error);
          this.metrics.errors.push({ service: serviceId, error: data.error, time: Date.now() });
          break;
          
        case 'service:navigate':
          // Handle internal navigation
          if (data.url) {
            this.loadService(data.url, 'main-container');
          }
          break;
      }
    },

    sendToService(serviceId, type, payload = {}) {
      const service = this.activeServices.get(serviceId);
      if (!service || !service.iframe.contentWindow) return;

      service.iframe.contentWindow.postMessage({
        type: type,
        payload: payload,
        timestamp: Date.now()
      }, '*');
    },

    // ============================================
    // PRELOADING & OPTIMIZATION
    // ============================================

    preloadCriticalServices() {
      this.config.preloadCritical.forEach(serviceId => {
        if (this.serviceRegistry[serviceId]) {
          // Preload in hidden iframe
          this.preloadService(serviceId);
        }
      });
    },

    async preloadService(serviceId) {
      const registry = this.serviceRegistry[serviceId];
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = registry.path;
      document.head.appendChild(link);
      
      console.log('[ServiceManager] Preloaded:', serviceId);
    },

    // ============================================
    // MEMORY MANAGEMENT
    // ============================================

    setupMemoryManagement() {
      // Cleanup on visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseInactiveServices();
        } else {
          this.resumeServices();
        }
      });

      // Periodic cleanup
      setInterval(() => this.cleanup(), 60000);
    },

    pauseInactiveServices() {
      this.activeServices.forEach((service, id) => {
        if (!service.isActive) {
          this.sendToService(id, 'service:pause');
        }
      });
    },

    resumeServices() {
      this.activeServices.forEach((service, id) => {
        this.sendToService(id, 'service:resume');
      });
    },

    cleanup() {
      // Clear old pool entries
      const now = Date.now();
      this.servicePool.forEach((service, id) => {
        if (now - service.lastActive > this.config.cacheTimeout) {
          this.destroyService(id);
          this.servicePool.delete(id);
        }
      });

      // Report metrics
      if (this.config.debug) {
        console.log('[ServiceManager] Metrics:', {
          active: this.activeServices.size,
          pooled: this.servicePool.size,
          loadTimes: Object.fromEntries(this.metrics.loadTimes)
        });
      }
    },

    // ============================================
    // PERFORMANCE MONITORING
    // ============================================

    setupPerformanceObserver() {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              console.log('[ServiceManager] LCP:', entry.startTime);
            }
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      }
    },

    // ============================================
    // PUBLIC API
    // ============================================

    open(serviceId, containerId = 'main-container') {
      return this.loadService(serviceId, containerId);
    },

    close(serviceId) {
      return this.destroyService(serviceId);
    },

    getMetrics() {
      return {
        activeServices: this.activeServices.size,
        pooledServices: this.servicePool.size,
        loadTimes: Object.fromEntries(this.metrics.loadTimes),
        errors: this.metrics.errors
      };
    }
  };

  // Expose globally
  window.ServiceManager = ServiceManager;
  
  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ServiceManager.init());
  } else {
    ServiceManager.init();
  }

})();
