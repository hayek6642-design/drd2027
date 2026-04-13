/**
 * ZAGEL Flow Engine v2.0.0
 * Anti-noise batch processing, natural flow management
 * Prevents notification fatigue by batching and throttling
 */

(function () {
  'use strict';
  if (window.__ZAGEL_FLOW__) return;

  const DEFAULT_BATCH_INTERVAL = 30000; // 30 seconds
  const MAX_BATCH_SIZE = 20;
  const QUIET_HOURS = { start: 23, end: 7 }; // 11 PM to 7 AM

  class ZagelFlowEngine {
    constructor() {
      this._batch = [];
      this._batchTimer = null;
      this._batchInterval = DEFAULT_BATCH_INTERVAL;
      this._throttleMap = {};
      this._stats = { total: 0, batched: 0, throttled: 0, delivered: 0 };
      this._quietMode = false;
      this._focusMode = false;
      this._listeners = [];

      this._startBatchCycle();
      console.log('🌊 [Zagel-Flow] Engine initialized');
    }

    push(item) {
      this._stats.total++;

      // Quiet hours check
      if (this._isQuietHours() && !item.urgent) {
        this._batch.push({ ...item, deferred: true });
        this._stats.batched++;
        return 'deferred';
      }

      // Focus mode: only urgent items pass through
      if (this._focusMode && !item.urgent) {
        this._batch.push({ ...item, deferred: true });
        this._stats.batched++;
        return 'batched';
      }

      // Throttle check
      const throttleKey = item.type || item.source || 'default';
      if (this._isThrottled(throttleKey)) {
        this._batch.push(item);
        this._stats.throttled++;
        return 'throttled';
      }

      this._markThrottled(throttleKey);

      // Immediate delivery for urgent items
      if (item.urgent || item.priority === 'critical') {
        this._deliver([item]);
        return 'immediate';
      }

      // Add to batch
      this._batch.push(item);
      this._stats.batched++;

      // Force flush if batch is full
      if (this._batch.length >= MAX_BATCH_SIZE) {
        this._flush();
      }

      return 'batched';
    }

    _isThrottled(key) {
      const last = this._throttleMap[key];
      if (!last) return false;
      return Date.now() - last < 5000; // 5 second throttle per type
    }

    _markThrottled(key) {
      this._throttleMap[key] = Date.now();
    }

    _isQuietHours() {
      if (this._quietMode) return true;
      const hour = new Date().getHours();
      return hour >= QUIET_HOURS.start || hour < QUIET_HOURS.end;
    }

    _startBatchCycle() {
      this._batchTimer = setInterval(() => {
        if (this._batch.length > 0) this._flush();
      }, this._batchInterval);
    }

    _flush() {
      if (this._batch.length === 0) return;

      const items = [...this._batch];
      this._batch = [];

      // Group by type for cleaner delivery
      const groups = {};
      for (const item of items) {
        const key = item.type || 'general';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }

      // Score and sort within each group
      const sorted = [];
      for (const [type, groupItems] of Object.entries(groups)) {
        if (window.ZagelPriority) {
          groupItems.forEach(item => {
            item._score = window.ZagelPriority.score(item);
          });
          groupItems.sort((a, b) => (b._score?.total || 0) - (a._score?.total || 0));
        }
        sorted.push({ type, items: groupItems, count: groupItems.length });
      }

      this._deliver(sorted);
    }

    _deliver(payload) {
      this._stats.delivered += Array.isArray(payload) ? payload.length : 1;

      for (const listener of this._listeners) {
        try { listener(payload); } catch (e) { console.error('🌊 [Flow] Listener error:', e); }
      }

      if (window.ZagelBus) {
        window.ZagelBus.emit('flow:delivered', { payload, ts: Date.now() });
      }
    }

    onDeliver(callback) {
      this._listeners.push(callback);
      return () => {
        this._listeners = this._listeners.filter(l => l !== callback);
      };
    }

    setFocusMode(enabled) {
      this._focusMode = enabled;
      if (window.ZagelBus) {
        window.ZagelBus.emit('flow:focus_mode', { enabled });
      }
    }

    setQuietMode(enabled) {
      this._quietMode = enabled;
    }

    setBatchInterval(ms) {
      this._batchInterval = Math.max(5000, ms);
      clearInterval(this._batchTimer);
      this._startBatchCycle();
    }

    forceFlush() { this._flush(); }

    getStats() { return { ...this._stats }; }
    getBatchSize() { return this._batch.length; }
    isFocusMode() { return this._focusMode; }
    isQuietHours() { return this._isQuietHours(); }

    destroy() {
      if (this._batchTimer) clearInterval(this._batchTimer);
      this._batch = [];
      this._listeners = [];
      delete window.__ZAGEL_FLOW__;
    }
  }

  window.__ZAGEL_FLOW__ = new ZagelFlowEngine();
  window.ZagelFlow = window.__ZAGEL_FLOW__;
})();
