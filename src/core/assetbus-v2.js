// src/core/assetbus-v2.js

/**
 * AssetBus V2 - Memory-Optimized Event Bus
 * WeakMap-based listeners, auto-cleanup, Capacitor bridge
 */

class AssetBusV2 {
  constructor() {
    // Use WeakMap for automatic garbage collection
    this.listeners = new WeakMap();
    this.strongRefs = new Map(); // For non-DOM keys
    
    this.eventHistory = [];
    this.maxHistory = 50;
    
    this.batchQueue = [];
    this.batchTimer = null;
    
    // Capacitor bridge
    this.nativeBridge = null;
    this.setupNativeBridge();
  }

  setupNativeBridge() {
    if (window.Capacitor) {
      try {
        const { App } = require('@capacitor/app');
        this.nativeBridge = App;
        
        // Forward critical events to native
        this.subscribe('critical:*', (data) => {
          this.nativeBridge.addListener('appUrlOpen', (data) => {
            console.log('Native event:', data);
          });
        });
      } catch (e) {
        console.log('[AssetBus] Capacitor not available');
      }
    }
  }

  subscribe(event, callback, options = {}) {
    const key = options.context || callback;
    
    // Use WeakRef for DOM elements, strong for functions
    const ref = options.weak && typeof key === 'object' 
      ? new WeakRef(key) 
      : key;
    
    const listener = {
      callback,
      ref,
      once: options.once || false,
      priority: options.priority || 0,
      id: Math.random().toString(36).substr(2, 9)
    };

    if (!this.strongRefs.has(event)) {
      this.strongRefs.set(event, new Set());
    }
    
    this.strongRefs.get(event).add(listener);
    
    // Auto-cleanup after 5 minutes for one-time listeners
    if (options.once) {
      setTimeout(() => this.unsubscribe(event, callback), 300000);
    }

    // Return unsubscribe function
    return () => this.unsubscribe(event, callback);
  }

  subscribeOnce(event, callback) {
    return this.subscribe(event, callback, { once: true });
  }

  unsubscribe(event, callback) {
    const listeners = this.strongRefs.get(event);
    if (!listeners) return;
    
    for (const listener of listeners) {
      if (listener.callback === callback) {
        listeners.delete(listener);
        break;
      }
    }
    
    // Clean up empty sets
    if (listeners.size === 0) {
      this.strongRefs.delete(event);
    }
  }

  publish(event, data, options = {}) {
    // Batch non-critical events
    if (options.batch || event.startsWith('metrics:')) {
      this.batchQueue.push({ event, data, time: Date.now() });
      this.scheduleBatch();
      return;
    }

    // Immediate publish for critical events
    this.dispatch(event, data);
    
    // Add to history
    this.addToHistory(event, data);
  }

  scheduleBatch() {
    if (this.batchTimer) return;
    
    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, 100); // 100ms batching window
  }

  flushBatch() {
    if (this.batchQueue.length === 0) return;
    
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimer = null;
    
    // Group by event type
    const grouped = batch.reduce((acc, item) => {
      acc[item.event] = acc[item.event] || [];
      acc[item.event].push(item.data);
      return acc;
    }, {});
    
    // Dispatch batched events
    for (const [event, datas] of Object.entries(grouped)) {
      this.dispatch(event, datas);
    }
  }

  dispatch(event, data) {
    const listeners = this.strongRefs.get(event);
    if (!listeners || listeners.size === 0) return;
    
    // Sort by priority
    const sorted = Array.from(listeners).sort((a, b) => b.priority - a.priority);
    
    // Use setTimeout for non-blocking
    setTimeout(() => {
      for (const listener of sorted) {
        try {
          // Check if ref is still valid (for WeakRefs)
          if (listener.ref instanceof WeakRef) {
            const target = listener.ref.deref();
            if (!target) {
              listeners.delete(listener);
              continue;
            }
          }
          
          listener.callback(data);
          
          if (listener.once) {
            listeners.delete(listener);
          }
        } catch (e) {
          console.error('[AssetBus] Listener error:', e);
          listeners.delete(listener);
        }
      }
    }, 0);
  }

  addToHistory(event, data) {
    this.eventHistory.push({
      event,
      data: typeof data === 'object' ? '[Object]' : data,
      time: Date.now()
    });
    
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }
  }

  // Memory cleanup
  cleanup() {
    // Remove dead weak refs
    for (const [event, listeners] of this.strongRefs) {
      for (const listener of listeners) {
        if (listener.ref instanceof WeakRef && !listener.ref.deref()) {
          listeners.delete(listener);
        }
      }
    }
    
    // Trim history
    if (this.eventHistory.length > this.maxHistory / 2) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory / 2);
    }
    
    console.log('[AssetBus] Cleanup completed');
  }

  // Snapshot for debugging
  getSnapshot() {
    return {
      eventCount: this.strongRefs.size,
      listenerCount: Array.from(this.strongRefs.values())
        .reduce((sum, set) => sum + set.size, 0),
      history: this.eventHistory.slice(-10),
      memoryEstimate: JSON.stringify(this.eventHistory).length * 2
    };
  }

  // Capacitor integration: Sync with native storage
  async syncToNative() {
    if (!this.nativeBridge) return;
    
    const critical = this.eventHistory.filter(e => 
      e.event.startsWith('critical:') || e.event.startsWith('auth:')
    );
    
    // Store in native secure storage
    const { Storage } = await import('@capacitor/storage');
    await Storage.set({
      key: 'assetbus-critical',
      value: JSON.stringify(critical)
    });
  }
}

// Singleton
export const assetBus = new AssetBusV2();

// Auto-cleanup every 2 minutes
setInterval(() => assetBus.cleanup(), 120000);

// Legacy compatibility
window.AssetBusV2 = assetBus;