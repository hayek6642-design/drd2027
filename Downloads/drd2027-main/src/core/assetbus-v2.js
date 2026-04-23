class AssetBusV2 {
  constructor() {
    this.listeners = new WeakMap();
    this.strongListeners = new Map();
    this.eventHistory = [];
    this.maxHistory = 50;
    this.state = {};
    console.log('[AssetBus] WeakMap-based listener architecture initialized');
  }

  subscribe(event, callback, context = null) {
    if (!callback || typeof callback !== 'function') {
      console.error('[AssetBus] Invalid callback');
      return () => {};
    }
    const key = context || callback;
    if (!this.strongListeners.has(event)) {
      this.strongListeners.set(event, new Set());
    }
    const listener = {
      id: Math.random().toString(36).slice(2, 9),
      callback,
      context,
      timestamp: Date.now()
    };
    this.strongListeners.get(event).add(listener);
    return () => {
      this.unsubscribe(event, callback);
    };
  }

  unsubscribe(event, callback) {
    const listeners = this.strongListeners.get(event);
    if (!listeners) return;
    for (const listener of listeners) {
      if (listener.callback === callback) {
        listeners.delete(listener);
        console.log(`[AssetBus] Unsubscribed from ${event}`);
        break;
      }
    }
    if (listeners.size === 0) {
      this.strongListeners.delete(event);
    }
  }

  publish(event, data) {
    const listeners = this.strongListeners.get(event);
    if (!listeners || listeners.size === 0) return;
    const listenersArray = Array.from(listeners);
    for (const listener of listenersArray) {
      try {
        listener.callback(data);
      } catch (e) {
        console.error(`[AssetBus] Listener error on ${event}:`, e);
        this.unsubscribe(event, listener.callback);
      }
    }
    this.addToHistory(event, data);
  }

  addToHistory(event, data) {
    this.eventHistory.push({
      event,
      data: typeof data === 'object' ? '[Object]' : String(data).slice(0, 50),
      time: Date.now()
    });
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  setState(newState) {
    if (!newState || typeof newState !== 'object') return;
    for (const key in newState) {
      this.state[key] = newState[key];
    }
    this.publish('state:updated', this.state);
  }

  cleanup() {
    for (const [event, listeners] of this.strongListeners) {
      if (listeners.size === 0) {
        this.strongListeners.delete(event);
      }
    }
    if (this.eventHistory.length > this.maxHistory / 2) {
      this.eventHistory = this.eventHistory.slice(-Math.floor(this.maxHistory / 2));
    }
    const stats = {
      events: this.strongListeners.size,
      totalListeners: Array.from(this.strongListeners.values()).reduce((sum, set) => sum + set.size, 0),
      historySize: this.eventHistory.length
    };
    console.log('[AssetBus] Cleanup:', stats);
    return stats;
  }

  getSnapshot() {
    const listeners = {};
    for (const [event, set] of this.strongListeners) {
      listeners[event] = set.size;
    }
    return {
      listeners,
      historyLength: this.eventHistory.length,
      recentEvents: this.eventHistory.slice(-10)
    };
  }
}

export const assetBus = new AssetBusV2();
setInterval(() => { assetBus.cleanup(); }, 60000);
window.AssetBus = assetBus;
window.AssetBusV2 = assetBus;