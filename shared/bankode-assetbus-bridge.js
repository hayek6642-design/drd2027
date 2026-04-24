/**
 * CodeBank AssetBus Bridge
 * Handles iframe communication via postMessage
 * Ensures clean lifecycle: bridge-ready signal + selective message forwarding
 */

window.AssetBusBridge = {
  isParent: window.self === window.top,
  parentWindow: window.parent,
  readyTimeout: 3000,
  listenersMap: new WeakMap(),
  registeredIframes: new Map(),
  messageQueue: [],
  isReady: false,

  // ============= PARENT MODE =============
  initParent() {
    console.log('[Bridge] Parent mode initialized');
    
    // Listen for iframe ready signals
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'bankode-bridge-ready') {
        const iframeId = e.data.iframeId;
        console.log('[Bridge] Iframe ready:', iframeId);
        this.registerIframe(iframeId, e.source);
        
        // Send acknowledgment
        e.source.postMessage({
          type: 'bankode-bridge-ack',
          timestamp: Date.now()
        }, '*');
      }
      
      // Forward auth state to iframes
      if (e.data?.type === 'request-auth-state') {
        const authUser = this.getAuthUser();
        e.source.postMessage({
          type: 'auth-state',
          user: authUser,
          authenticated: !!authUser
        }, '*');
      }
      
      // Handle service export from AI-Hub
      if (e.data?.type === 'export-service') {
        console.log('[Bridge] Service export request:', e.data.service);
        this.handleServiceExport(e.data.service);
      }
    });
    
    console.log('[Bridge] Parent listeners attached');
  },

  // Register an iframe
  registerIframe(iframeId, iframeWindow) {
    this.registeredIframes.set(iframeId, {
      window: iframeWindow,
      readyAt: Date.now(),
      active: true
    });
    console.log('[Bridge] Registered iframe:', iframeId);
  },

  // Get current authenticated user
  getAuthUser() {
    try {
      const sessionDataStr = localStorage.getItem('__cb_user_data__');
      if (!sessionDataStr) return null;
      const sessionData = JSON.parse(sessionDataStr);
      if (Date.now() > sessionData.expiresAt) return null;
      return sessionData;
    } catch (e) {
      return null;
    }
  },

  // Broadcast message to all iframes
  broadcastToIframes(message) {
    console.log('[Bridge] Broadcasting to iframes:', message.type);
    
    this.registeredIframes.forEach((iframe, iframeId) => {
      if (iframe.active) {
        try {
          iframe.window.postMessage(message, '*');
        } catch (e) {
          console.error('[Bridge] Failed to send to', iframeId, e);
          iframe.active = false;
        }
      }
    });
  },

  // Handle service export (add service to CodeBank registry)
  handleServiceExport(serviceData) {
    try {
      const exportedServices = JSON.parse(localStorage.getItem('codebank-external-services')) || [];
      
      // Check if already exported
      const exists = exportedServices.find(s => s.id === serviceData.id);
      if (exists) {
        console.log('[Bridge] Service already exported:', serviceData.id);
        return;
      }
      
      // Add to exported services
      exportedServices.push({
        ...serviceData,
        exportedAt: new Date().toISOString()
      });
      
      localStorage.setItem('codebank-external-services', JSON.stringify(exportedServices));
      console.log('[Bridge] Service exported:', serviceData.name);
      
      // Emit event for UI update
      window.dispatchEvent(new CustomEvent('codebank-service-exported', {
        detail: serviceData
      }));
    } catch (e) {
      console.error('[Bridge] Failed to export service:', e);
    }
  },

  // Get recently exported services
  getRecentlyExported(limit = 5) {
    try {
      const services = JSON.parse(localStorage.getItem('codebank-external-services')) || [];
      return services.slice(-limit).reverse();
    } catch (e) {
      return [];
    }
  },

  // ============= IFRAME MODE =============
  initIframe(iframeId) {
    console.log('[Bridge] Iframe mode initialized:', iframeId);
    
    // Signal parent that bridge is ready
    this.signalParentReady(iframeId);
    
    // Listen for messages from parent
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'auth-state') {
        console.log('[Bridge] Received auth state from parent');
        this.handleAuthStateUpdate(e.data);
      }
      
      if (e.data?.type === 'bankode-bridge-ack') {
        console.log('[Bridge] Parent acknowledged connection');
        this.isReady = true;
        this.flushMessageQueue();
      }
    });
  },

  // Signal parent that iframe is ready
  signalParentReady(iframeId) {
    this.parentWindow.postMessage({
      type: 'bankode-bridge-ready',
      iframeId: iframeId || 'iframe-' + Date.now(),
      timestamp: Date.now()
    }, '*');
    
    console.log('[Bridge] Ready signal sent to parent');
    
    // Timeout safety: mark as ready after timeout
    setTimeout(() => {
      if (!this.isReady) {
        console.warn('[Bridge] Parent ack timeout, assuming ready');
        this.isReady = true;
        this.flushMessageQueue();
      }
    }, this.readyTimeout);
  },

  // Request auth state from parent
  requestAuthState() {
    console.log('[Bridge] Requesting auth state from parent');
    this.parentWindow.postMessage({
      type: 'request-auth-state'
    }, '*');
  },

  // Handle auth state update
  handleAuthStateUpdate(data) {
    const event = new CustomEvent('bankode-auth-state', {
      detail: data
    });
    window.dispatchEvent(event);
  },

  // Queue message until bridge is ready
  queueMessage(message) {
    this.messageQueue.push(message);
    console.log('[Bridge] Message queued (waiting for parent)');
  },

  // Send message to parent (with queuing)
  sendToParent(message) {
    if (!this.isReady) {
      this.queueMessage(message);
      return;
    }
    
    try {
      this.parentWindow.postMessage(message, '*');
      console.log('[Bridge] Message sent to parent:', message.type);
    } catch (e) {
      console.error('[Bridge] Failed to send to parent:', e);
    }
  },

  // Export service to parent CodeBank
  exportServiceToCodeBank(serviceData) {
    console.log('[Bridge] Exporting service:', serviceData.name);
    
    this.sendToParent({
      type: 'export-service',
      service: {
        id: serviceData.id,
        name: serviceData.name,
        icon: serviceData.icon,
        url: serviceData.url,
        category: serviceData.category,
        description: serviceData.description
      }
    });
  },

  // Flush queued messages
  flushMessageQueue() {
    console.log('[Bridge] Flushing', this.messageQueue.length, 'queued messages');
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        this.parentWindow.postMessage(message, '*');
      } catch (e) {
        console.error('[Bridge] Failed to flush message:', e);
      }
    }
  },

  // ============= UTILITY =============
  destroy() {
    console.log('[Bridge] Destroying bridge');
    this.registeredIframes.clear();
    this.messageQueue = [];
    this.isReady = false;
  }
};

// Auto-init based on context
if (window.self === window.top) {
  // Parent
  window.AssetBusBridge.initParent();
} else {
  // Iframe
  const iframeId = document.currentScript?.getAttribute('data-iframe-id') || 
                   'iframe-' + Date.now();
  window.AssetBusBridge.initIframe(iframeId);
}

console.log('[Bridge] Loaded (mode: ' + (window.self === window.top ? 'parent' : 'iframe') + ')');