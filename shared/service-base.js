// service-base.js
// Base functionality for all CodeBank services
// Include as FIRST script in every service HTML

(function() {
  'use strict';

  const ServiceBase = {
    serviceId: null,
    parentOrigin: null,
    authState: null,
    isReady: false,

    init(serviceName) {
      this.serviceId = serviceName;
      this.detectParentOrigin();
      this.setupMessageBridge();
      this.setupAuth();
      this.signalReady();
      
      console.log(`[${serviceName}] Service base initialized`);
    },

    // ============================================
    // PARENT COMMUNICATION
    // ============================================

    detectParentOrigin() {
      const params = new URLSearchParams(location.search);
      const origin = params.get('auth_origin');
      this.parentOrigin = origin ? decodeURIComponent(origin) : document.referrer || '*';
    },

    setupMessageBridge() {
      window.addEventListener('message', (e) => {
        if (this.parentOrigin !== '*' && e.origin !== this.parentOrigin) return;
        
        switch(e.data.type) {
          case 'auth:response':
          case 'auth:updated':
            this.authState = e.data.payload;
            this.onAuthUpdate(this.authState);
            break;
            
          case 'service:activated':
            this.onActivate();
            break;
            
          case 'service:deactivated':
            this.onDeactivate();
            break;
            
          case 'service:pause':
            this.onPause();
            break;
            
          case 'service:resume':
            this.onResume();
            break;
            
          case 'service:destroy':
            this.onDestroy();
            break;
        }
      });
    },

    sendToParent(type, payload = {}) {
      if (window.parent === window) return;
      
      window.parent.postMessage({
        type: type,
        service: this.serviceId,
        payload: payload,
        timestamp: Date.now()
      }, this.parentOrigin);
    },

    // ============================================
    // AUTHENTICATION
    // ============================================

    setupAuth() {
      // Request auth from parent
      this.sendToParent('service:request-auth');
      
      // Also check URL params for initial auth
      const params = new URLSearchParams(location.search);
      const authToken = params.get('auth_token');
      if (authToken) {
        this.authState = { token: authToken };
      }
    },

    requireAuth() {
      return new Promise((resolve) => {
        if (this.authState) {
          resolve(this.authState);
          return;
        }
        
        const check = setInterval(() => {
          if (this.authState) {
            clearInterval(check);
            resolve(this.authState);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(check);
          resolve(null);
        }, 5000);
      });
    },

    // ============================================
    // LIFECYCLE HOOKS (Override in service)
    // ============================================

    onAuthUpdate(auth) {
      // Override in service
      console.log(`[${this.serviceId}] Auth updated:`, auth?.isAuthenticated);
    },

    onActivate() {
      // Override in service
      document.body.style.display = 'block';
    },

    onDeactivate() {
      // Override in service
      document.body.style.display = 'none';
    },

    onPause() {
      // Override in service - pause heavy operations
      console.log(`[${this.serviceId}] Paused`);
    },

    onResume() {
      // Override in service - resume operations
      console.log(`[${this.serviceId}] Resumed`);
    },

    onDestroy() {
      // Override in service - cleanup
      console.log(`[${this.serviceId}] Destroying...`);
      // Cleanup event listeners, intervals, etc.
    },

    signalReady() {
      this.isReady = true;
      this.sendToParent('service:ready', { serviceId: this.serviceId });
      
      // Dispatch DOM event for internal use
      window.dispatchEvent(new CustomEvent('service:ready', { 
        detail: { serviceId: this.serviceId } 
      }));
    },

    // ============================================
    // PERFORMANCE UTILITIES
    // ============================================

    debounce(fn, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    },

    throttle(fn, limit) {
      let inThrottle;
      return (...args) => {
        if (!inThrottle) {
          fn(...args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    // Lazy load images/components
    lazyLoad(selector, callback) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            callback(entry.target);
            observer.unobserve(entry.target);
          }
        });
      });
      
      document.querySelectorAll(selector).forEach(el => observer.observe(el));
    }
  };

  window.ServiceBase = ServiceBase;
})();