// service-loader.js
// Universal Service Loader for CodeBank Ecosystem
// Include in parent window (yt-new-clear.html, login.html, etc.)

(function() {
  'use strict';

  window.ServiceLoader = {
    // Registry of all services
    services: {
      // Core services
      codebank: {
        name: 'CodeBank',
        path: '/codebank/indexCB.html',
        default: true
      },
      safecode: {
        name: 'SafeCode',
        path: '/codebank/safecode/'
      },
      
      // External services
      e7ki: {
        name: 'E7ki',
        path: '/services/e7ki/index.html'
      },
      farragna: {
        name: 'Farragna',
        path: '/services/farragna/index.html'
      },
      samman: {
        name: 'Samman',
        path: '/services/samman/index.html'
      },
      pebalaash: {
        name: 'Pebalaash',
        path: '/services/pebalaash/index.html'
      },
      eb3at: {
        name: 'Eb3at',
        path: '/services/eb3at/index.html'
      },
      games: {
        name: 'Games',
        path: '/services/games/index.html'
      },
      
      // Add more services here as needed
    },

    // Load a service into a container
    load: function(serviceKey, containerId, options = {}) {
      const service = this.services[serviceKey];
      if (!service) {
        console.error('[ServiceLoader] Unknown service:', serviceKey);
        return null;
      }

      const container = document.getElementById(containerId);
      if (!container) {
        console.error('[ServiceLoader] Container not found:', containerId);
        return null;
      }

      // Build URL with auth context
      const url = this.buildServiceUrl(service.path, options);
      
      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.id = options.id || `iframe-${serviceKey}`;
      iframe.name = options.name || service.name;
      iframe.src = url;
      
      // Styling
      iframe.style.width = options.width || '100%';
      iframe.style.height = options.height || '100%';
      iframe.style.border = options.border || 'none';
      iframe.style.display = options.display || 'block';
      
      // Security attributes
      const sandbox = options.sandbox || 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';
      iframe.setAttribute('sandbox', sandbox);
      
      const allow = options.allow || 'autoplay; encrypted-media; fullscreen; geolocation; microphone; camera';
      iframe.setAttribute('allow', allow);
      
      // Loading indicator
      if (options.loadingText !== false) {
        container.innerHTML = `<div class="service-loading">${options.loadingText || `Loading ${service.name}...`}</div>`;
      }
      
      // Handle load event
      iframe.onload = () => {
        console.log('[ServiceLoader] Service loaded:', serviceKey);
        if (options.onLoad) options.onLoad(iframe);
      };
      
      iframe.onerror = (e) => {
        console.error('[ServiceLoader] Failed to load:', serviceKey, e);
        if (options.onError) options.onError(e);
      };

      // Clear and append
      setTimeout(() => {
        container.innerHTML = '';
        container.appendChild(iframe);
      }, 100);

      return iframe;
    },

    // Build service URL with auth parameters
    buildServiceUrl: function(path, options = {}) {
      const url = new URL(path, window.location.href);
      
      // Add auth origin parameter (CRITICAL for cross-origin auth)
      url.searchParams.set('auth_origin', encodeURIComponent(window.location.origin));
      
      // Add service identification
      url.searchParams.set('service_id', options.serviceId || 'unknown');
      
      // Add timestamp to prevent caching
      url.searchParams.set('_t', Date.now());
      
      // Add any extra params
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }
      
      return url.toString();
    },

    // Preload a service (hidden)
    preload: function(serviceKey) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      
      const service = this.services[serviceKey];
      if (!service) return;
      
      iframe.src = this.buildServiceUrl(service.path, { preload: true });
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      
      document.body.appendChild(iframe);
      
      // Remove after load
      iframe.onload = () => {
        setTimeout(() => iframe.remove(), 5000);
      };
      
      console.log('[ServiceLoader] Preloaded:', serviceKey);
    },

    // Open service in modal/popup
    openModal: function(serviceKey, options = {}) {
      const service = this.services[serviceKey];
      if (!service) return;

      // Create modal container
      const modalId = 'service-modal-' + Date.now();
      const modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'service-modal-overlay';
      modal.innerHTML = `
        <div class="service-modal-container">
          <div class="service-modal-header">
            <h3>${service.name}</h3>
            <button class="service-modal-close" onclick="ServiceLoader.closeModal('${modalId}')">&times;</button>
          </div>
          <div class="service-modal-body" id="${modalId}-body"></div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Load service into modal
      this.load(serviceKey, modalId + '-body', {
        width: '100%',
        height: '100%',
        onLoad: options.onLoad,
        onError: options.onError
      });
      
      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal(modalId);
      });
      
      return modalId;
    },

    closeModal: function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.remove();
    },

    // Batch load multiple services
    loadMultiple: function(servicesConfig) {
      return servicesConfig.map(config => {
        return this.load(config.service, config.container, config.options || {});
      });
    }
  };

  // CSS for modal (injected dynamically)
  const style = document.createElement('style');
  style.textContent = `
    .service-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .service-modal-container {
      width: 90vw;
      height: 90vh;
      background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }
    
    .service-modal-header {
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .service-modal-header h3 {
      margin: 0;
      color: #fff;
      font-size: 1.2rem;
    }
    
    .service-modal-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.2rem;
    }
    
    .service-modal-body {
      flex: 1;
      position: relative;
    }
    
    .service-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.1rem;
    }
  `;
  
  if (document.head) {
    document.head.appendChild(style);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.head.appendChild(style);
    });
  }

  console.log('[ServiceLoader] Initialized');
})();