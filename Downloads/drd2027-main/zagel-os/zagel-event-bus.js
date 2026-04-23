/**
 * ZAGEL Event Bus v2.0.0
 * Cross-app/iframe communication layer for Zagel OS
 * Supports BroadcastChannel, postMessage, and direct event routing
 */

(function () {
  'use strict';
  if (window.__ZAGEL_EVENT_BUS__) return;

  const PREFIX = 'zagel:';
  const DEBUG = false;

  class ZagelEventBus {
    constructor() {
      this._handlers = {};
      this._broadcastChannel = null;
      this._iframeTargets = new Map();
      this._history = [];
      this._maxHistory = 200;

      this._initBroadcastChannel();
      this._initPostMessageListener();

      console.log('📡 [Zagel-EventBus] Initialized');
    }

    _initBroadcastChannel() {
      try {
        this._broadcastChannel = new BroadcastChannel('zagel_os_bus');
        this._broadcastChannel.onmessage = (e) => {
          if (e.data && e.data._zagelEvent) {
            this._dispatch(e.data.event, e.data.payload, 'broadcast');
          }
        };
      } catch (err) {
        console.warn('📡 [Zagel-EventBus] BroadcastChannel unavailable, using postMessage only');
      }
    }

    _initPostMessageListener() {
      window.addEventListener('message', (e) => {
        if (e.data && e.data._zagelEvent) {
          this._dispatch(e.data.event, e.data.payload, 'postMessage');
        }
      });
    }

    on(event, handler, options = {}) {
      const key = PREFIX + event;
      if (!this._handlers[key]) this._handlers[key] = [];
      const entry = { handler, once: !!options.once, priority: options.priority || 0 };
      this._handlers[key].push(entry);
      this._handlers[key].sort((a, b) => b.priority - a.priority);
      return () => this.off(event, handler);
    }

    once(event, handler) {
      return this.on(event, handler, { once: true });
    }

    off(event, handler) {
      const key = PREFIX + event;
      if (!this._handlers[key]) return;
      this._handlers[key] = this._handlers[key].filter(e => e.handler !== handler);
    }

    emit(event, payload = {}, options = {}) {
      const key = PREFIX + event;
      if (DEBUG) console.log(`📡 [Zagel-EventBus] Emit: ${event}`, payload);

      this._history.push({ event, payload, ts: Date.now(), source: 'local' });
      if (this._history.length > this._maxHistory) this._history.shift();

      this._dispatch(event, payload, 'local');

      if (options.broadcast !== false && this._broadcastChannel) {
        try {
          this._broadcastChannel.postMessage({ _zagelEvent: true, event, payload });
        } catch (e) { /* channel closed */ }
      }

      if (options.iframes !== false) {
        this._iframeTargets.forEach((origin, iframe) => {
          try {
            iframe.contentWindow.postMessage({ _zagelEvent: true, event, payload }, origin);
          } catch (e) { /* iframe gone */ }
        });
      }
    }

    _dispatch(event, payload, source) {
      const key = PREFIX + event;
      const handlers = this._handlers[key];
      if (!handlers || handlers.length === 0) return;

      const toRemove = [];
      for (const entry of handlers) {
        try {
          entry.handler(payload, { event, source });
        } catch (err) {
          console.error(`📡 [Zagel-EventBus] Handler error for ${event}:`, err);
        }
        if (entry.once) toRemove.push(entry);
      }
      if (toRemove.length) {
        this._handlers[key] = handlers.filter(e => !toRemove.includes(e));
      }
    }

    registerIframe(iframe, origin = '*') {
      this._iframeTargets.set(iframe, origin);
    }

    unregisterIframe(iframe) {
      this._iframeTargets.delete(iframe);
    }

    getHistory(filter) {
      if (!filter) return [...this._history];
      return this._history.filter(h => h.event.includes(filter));
    }

    clear() {
      this._handlers = {};
      this._history = [];
    }

    destroy() {
      this.clear();
      if (this._broadcastChannel) {
        this._broadcastChannel.close();
        this._broadcastChannel = null;
      }
      this._iframeTargets.clear();
      delete window.__ZAGEL_EVENT_BUS__;
    }
  }

  window.__ZAGEL_EVENT_BUS__ = new ZagelEventBus();
  window.ZagelBus = window.__ZAGEL_EVENT_BUS__;
})();
