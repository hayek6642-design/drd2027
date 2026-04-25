// SERVICE MANAGER - Phase 1 Fixes for Iframe Stability
// This script implements the ServiceManager and Bridge fixes from actly.md

class ServiceManager {
  constructor() {
    this.activeService = null;
    this.serviceCache = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.messageQueue = [];
    this.pendingResponses = new Map();
    
    // CRITICAL: Don't unload immediately on errors - give grace period
    this.gracePeriod = 10000; // 🔧 Increased to 10 seconds to account for database initialization
    this.loadTimers = new Map();
    
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Global message listener
    window.addEventListener('message', (event) => {
      if (this.activeService) {
        this.handleIframeMessage(event, this.activeService);
      }
    });

    // CSS for spinner
    if (!document.getElementById('service-manager-styles')) {
      const style = document.createElement('style');
      style.id = 'service-manager-styles';
      style.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .service-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #94a3b8;
          background: #0f172a;
        }
        .loading-spinner-core {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
      `;
      document.head.appendChild(style);
    }
  }

  async mountService(serviceId, url) {
    console.log(`[ServiceManager] Mounting ${serviceId}...`);
    
    // Phase 1: Enforce single active service
    if (this.activeService && this.activeService !== serviceId) {
      console.log(`[ServiceManager] Closing existing service ${this.activeService} before mounting ${serviceId}`);
      this.closeService();
    }

    // Prevent double-mounting
    const runner = document.getElementById('app-runner');
    const iframe = document.getElementById('runner-iframe');
    
    if (this.activeService === serviceId && runner.classList.contains('active')) {
      console.log(`[ServiceManager] ${serviceId} already mounted`);
      return;
    }

    this.activeService = serviceId;
    if (runner) runner.classList.add('active');
    this.showLoadingState(serviceId);

    try {
      // Reset iframe properly for GC
      if (iframe) {
        // 🔧 FIX: Comment out about:blank to preserve state
        // iframe.src = 'about:blank';
        // Remove and re-add to clear memory more effectively
        const container = iframe.parentNode;
        if (container) {
          const newIframe = iframe.cloneNode(true);
          container.replaceChild(newIframe, iframe);
        }
      }
      
      const newIframe = document.getElementById('runner-iframe');
      if (newIframe) {
        newIframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation';
        
        // Load timeout handling
        const loadPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Iframe load timeout'));
          }, 15000);

          const onLoad = () => {
            clearTimeout(timeout);
            newIframe.removeEventListener('load', onLoad);
            console.log(`[ServiceManager] ${serviceId} iframe loaded`);
            
            // Send init message with retry
            this.sendInitMessage(newIframe, serviceId, 0);
            resolve();
          };

          newIframe.addEventListener('load', onLoad);
        });

        // Set actual URL with small delay
        setTimeout(() => {
          newIframe.src = url;
        }, 100);
        
        await loadPromise;
        this.hideLoadingState();
      }
      
      // Mark as successfully mounted
      this.serviceCache.set(serviceId, {
        url,
        mountedAt: Date.now(),
        status: 'active'
      });

    } catch (error) {
      console.error(`[ServiceManager] Failed to mount ${serviceId}:`, error);
      this.handleMountFailure(serviceId, error);
    }
  }

  sendInitMessage(iframe, serviceId, attempt) {
    if (attempt > 10) {
      console.warn(`[ServiceManager] Max init attempts for ${serviceId}, continuing anyway`);
      return;
    }

    try {
      iframe.contentWindow.postMessage({
        type: 'codebank:init',
        serviceId: serviceId,
        parentOrigin: window.location.origin,
        timestamp: Date.now(),
        auth: this.getAuthState()
      }, "*");
      
      console.log(`[ServiceManager] Init message sent to ${serviceId} (attempt ${attempt + 1})`);
      
    } catch (e) {
      console.warn(`[ServiceManager] PostMessage failed, retrying...`, e);
      setTimeout(() => this.sendInitMessage(iframe, serviceId, attempt + 1), 500);
    }
  }

  getAuthState() {
    try {
      return {
        user: JSON.parse(localStorage.getItem('user') || '{}'),
        codes: JSON.parse(localStorage.getItem('safeCodes') || '[]'),
        timestamp: Date.now()
      };
    } catch(e) {
      return null;
    }
  }

  handleIframeMessage(event, serviceId) {
    const data = event.data;
    if (!data) return;

    switch(data.type) {
      case 'service:ready':
      case 'safe-code-ready':
      case 'iframe-ready':
        console.log(`[ServiceManager] ${serviceId} reports ready`);
        this.hideLoadingState();
        break;
        
      case 'service:error':
        console.error(`[ServiceManager] ${serviceId} reported error:`, data.error);
        break;
        
      case 'bridge:partial':
        console.warn(`[ServiceManager] ${serviceId} in partial bridge mode, allowing operation`);
        break;
        
      case 'request:auth':
        this.sendInitMessage(document.getElementById('runner-iframe'), serviceId, 0);
        break;
        
      case 'close-runner':
        if (data.force === true) {
          this.closeService();
        } else {
          console.log('[ServiceManager] Ignoring non-forced close request');
        }
        break;
    }
  }

  showLoadingState(serviceId) {
    const loader = document.getElementById('runner-loading');
    if (loader) loader.style.display = 'flex';
  }

  hideLoadingState() {
    const loader = document.getElementById('runner-loading');
    if (loader) loader.style.display = 'none';
  }

  handleMountFailure(serviceId, error) {
    const loader = document.getElementById('runner-loading');
    if (loader) {
      loader.innerHTML = `
        <div style="text-align: center; color: white; padding: 20px;">
          <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
          <div style="margin-bottom: 20px;">Failed to load ${serviceId}</div>
          <button id="retry-service-btn" style="padding: 8px 16px; background: #3b82f6; border: none; border-radius: 6px; color: white; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
      
      const retryBtn = document.getElementById('retry-service-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.mountService(serviceId, this.serviceCache.get(serviceId)?.url || '');
        });
      }
    }
  }

  closeService() {
    console.log(`[ServiceManager] Closing service: ${this.activeService}`);
    const runner = document.getElementById('app-runner');
    const iframe = document.getElementById('runner-iframe');
    
    if (runner) runner.classList.remove('active');
    
    if (iframe) {
      // 🛡️ EMERGENCY CLEANUP
      try {
        // 1. Send destroy signal to iframe
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'service:destroy' }, "*");
        }
        
        // 2. Stop network/scripts
        // 🔧 FIX: Comment out the src = about:blank assignment to avoid erasing state
        // iframe.src = 'about:blank';
        
        // 3. Remove and replace to trigger GC
        const container = iframe.parentNode;
        if (container) {
          const freshIframe = document.createElement('iframe');
          freshIframe.id = 'runner-iframe';
          freshIframe.sandbox = iframe.sandbox;
          freshIframe.style.cssText = iframe.style.cssText;
          // 🔧 FIX: Avoid src = about:blank unless explicitly needed
          // freshIframe.src = 'about:blank';
          container.replaceChild(freshIframe, iframe);
        }
      } catch (e) {
        console.warn('[ServiceManager] Cleanup error:', e);
        // 🔧 FIX: Only set to about:blank if absolutely necessary during error recovery
        // if (iframe) iframe.src = 'about:blank';
      }
    }
    
    this.activeService = null;
    
    // Hint to GC
    if (window.gc) {
      try { window.gc(); } catch(_) {}
    }
  }
}

// Global instance
window.serviceManager = new ServiceManager();
