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
        path: '/codebank/safecode.html'
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

    // ======= FULLSCREEN MOUNT =======
    activeService: null,
    container: null,
    iframe: null,
    
    // Mount a service in fullscreen iframe (replaces old bridge mounting)
    mount: function(serviceName, url) {
      console.log('[ServiceLoader] Fullscreen mount:', serviceName, url);
      
      // Clean up existing
      this._unmount();
      
      // Create container
      this.container = document.createElement('div');
      this.container.id = 'service-stage';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 10000;
        background: #0f0f0f;
        display: flex;
        flex-direction: column;
      `;
      
      // Header with close button
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-bottom: 1px solid #333;
      `;
      
      const title = document.createElement('span');
      title.textContent = serviceName;
      title.style.cssText = `
        color: #00d4ff;
        font-size: 18px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 2px;
      `;
      
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      `;
      closeBtn.onclick = () => this._unmount();
      
      header.appendChild(title);
      header.appendChild(closeBtn);
      this.container.appendChild(header);
      
      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.id = `service-iframe-${serviceName}`;
      this.iframe.src = url;
      this.iframe.style.cssText = 'width: 100%; flex: 1; border: none; background: #0f0f0f;';
      this.iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation';
      
      this.container.appendChild(this.iframe);
      document.body.appendChild(this.container);
      
      this.activeService = serviceName;
      
      // Send assets when iframe loads
      this.iframe.onload = () => {
        console.log('[ServiceLoader] Iframe loaded, sending assets');
        this._sendAssets();
      };
      
      // Listen for asset requests from iframe
      this._assetRequestHandler = (e) => {
        if (e.data?.type === 'request:assets' && e.source === this.iframe?.contentWindow) {
          this._sendAssets();
        }
      };
      window.addEventListener('message', this._assetRequestHandler);
    },
    
    // Send assets to the mounted iframe
    _sendAssets: function() {
      if (!this.iframe?.contentWindow) return;
      
      let assets = window.AppState?.assets;
      
      // Try AssetBus if AppState empty
      if (!assets || (assets.codes?.length === 0 && assets.silver?.length === 0 && assets.gold?.length === 0)) {
        try {
          const bus = window.AssetBus;
          if (bus && typeof bus.snapshot === 'function') {
            const snap = bus.snapshot();
            if (snap) assets = snap;
          }
        } catch(e) {}
      }
      
      // Fallback to localStorage
      if (!assets || (assets.codes?.length === 0 && assets.silver?.length === 0 && assets.gold?.length === 0)) {
        try {
          const raw = localStorage.getItem('codebank_assets');
          if (raw) assets = JSON.parse(raw);
        } catch(e) {}
      }
      
      assets = assets || { codes: [], silver: [], gold: [] };
      console.log('[ServiceLoader] Sending assets to iframe:', assets);
      
      this.iframe.contentWindow.postMessage({
        type: 'assets:update',
        data: assets
      }, '*');
    },
    
    // Internal unmount
    _unmount: function() {
      if (this._assetRequestHandler) {
        window.removeEventListener('message', this._assetRequestHandler);
        this._assetRequestHandler = null;
      }
      
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      
      this.container = null;
      this.iframe = null;
      this.activeService = null;
    },
    
    // ======= LEGACY METHODS =======
    
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
      if (!service) {
        console.error('[ServiceLoader] Unknown service:', serviceKey);
        return;
      }
      // Use fullscreen mount for modal
      this.mount(service.name, service.path);
    },

    closeModal: function(modalId) {
      // For fullscreen mount, just unmount
      this._unmount();
    },

    // Batch load multiple services
    loadMultiple: function(servicesConfig) {
      return servicesConfig.map(config => {
        return this.load(config.service, config.container, config.options || {});
      });
    }
  };

  console.log('[ServiceLoader] Initialized');
})();