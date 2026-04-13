/**
 * ZAGEL Notification Engine v2.0.0
 * Knock/Call/Urgent notification levels with anti-spam
 * Integrates with Flow Engine for intelligent delivery
 */

(function () {
  'use strict';
  if (window.__ZAGEL_NOTIFICATION__) return;

  const LEVELS = {
    whisper: { sound: false, vibrate: false, visual: 'subtle', priority: 1 },
    knock:   { sound: true, vibrate: [100], visual: 'normal', priority: 2 },
    call:    { sound: true, vibrate: [200, 100, 200], visual: 'prominent', priority: 3 },
    urgent:  { sound: true, vibrate: [300, 100, 300, 100, 300], visual: 'fullscreen', priority: 4 }
  };

  const ANTI_SPAM = {
    maxPerMinute: 10,
    maxPerHour: 60,
    cooldownMs: 2000,
    duplicateWindowMs: 30000
  };

  class ZagelNotificationEngine {
    constructor() {
      this._queue = [];
      this._history = [];
      this._stats = { sent: 0, blocked: 0, dismissed: 0 };
      this._recentHashes = [];
      this._lastNotifyTs = 0;
      this._minuteCount = 0;
      this._minuteReset = Date.now();
      this._listeners = [];
      this._permission = 'default';

      this._requestPermission();
      console.log('🔔 [Zagel-Notification] Engine initialized');
    }

    async _requestPermission() {
      if ('Notification' in window) {
        this._permission = await Notification.requestPermission().catch(() => 'denied');
      }
    }

    async notify(options) {
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: options.title || 'زاجل',
        body: options.body || '',
        level: options.level || 'knock',
        icon: options.icon || '🦅',
        category: options.category || 'general',
        data: options.data || {},
        actions: options.actions || [],
        ts: Date.now()
      };

      // Anti-spam checks
      if (!this._passesAntiSpam(notification)) {
        this._stats.blocked++;
        return { delivered: false, reason: 'spam_blocked' };
      }

      const levelConfig = LEVELS[notification.level] || LEVELS.knock;

      // Route through flow engine if available
      if (window.ZagelFlow && notification.level !== 'urgent') {
        window.ZagelFlow.push({
          ...notification,
          type: 'notification',
          urgent: notification.level === 'urgent',
          priority: levelConfig.priority === 4 ? 'critical' : 'normal'
        });
        return { delivered: true, method: 'batched' };
      }

      // Direct delivery
      return this._deliver(notification, levelConfig);
    }

    _passesAntiSpam(notification) {
      const now = Date.now();

      // Cooldown check
      if (now - this._lastNotifyTs < ANTI_SPAM.cooldownMs) {
        return false;
      }

      // Rate limit per minute
      if (now - this._minuteReset > 60000) {
        this._minuteCount = 0;
        this._minuteReset = now;
      }
      if (this._minuteCount >= ANTI_SPAM.maxPerMinute) {
        return false;
      }

      // Duplicate check
      const hash = `${notification.title}:${notification.body}`;
      if (this._recentHashes.some(h => h.hash === hash && now - h.ts < ANTI_SPAM.duplicateWindowMs)) {
        return false;
      }

      // Pass
      this._recentHashes.push({ hash, ts: now });
      if (this._recentHashes.length > 50) this._recentHashes.shift();
      this._lastNotifyTs = now;
      this._minuteCount++;

      return true;
    }

    _deliver(notification, levelConfig) {
      // Vibration
      if (levelConfig.vibrate && navigator.vibrate) {
        try { navigator.vibrate(levelConfig.vibrate); } catch (e) { /* */ }
      }

      // Browser notification
      if (this._permission === 'granted' && levelConfig.priority >= 2) {
        try {
          new Notification(notification.title, {
            body: notification.body,
            icon: '/icons/zagel-icon.png',
            tag: notification.id,
            requireInteraction: notification.level === 'urgent'
          });
        } catch (e) { /* */ }
      }

      // Voice announcement for urgent
      if (notification.level === 'urgent' && window.ZagelVoice) {
        window.ZagelVoice.speak(notification.body, { interrupt: true });
      }

      // Emit to listeners
      for (const listener of this._listeners) {
        try { listener(notification, levelConfig); } catch (e) { /* */ }
      }

      if (window.ZagelBus) {
        window.ZagelBus.emit('notification:delivered', notification);
      }

      this._history.push(notification);
      if (this._history.length > 200) this._history.shift();
      this._stats.sent++;

      return { delivered: true, method: 'direct', id: notification.id };
    }

    dismiss(notificationId) {
      this._stats.dismissed++;
      if (window.ZagelBus) {
        window.ZagelBus.emit('notification:dismissed', { id: notificationId });
      }
    }

    onNotify(callback) {
      this._listeners.push(callback);
      return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    }

    getHistory(limit = 20) { return this._history.slice(-limit); }
    getStats() { return { ...this._stats }; }
    getLevels() { return Object.keys(LEVELS); }

    destroy() {
      this._queue = [];
      this._history = [];
      this._listeners = [];
      delete window.__ZAGEL_NOTIFICATION__;
    }
  }

  window.__ZAGEL_NOTIFICATION__ = new ZagelNotificationEngine();
  window.ZagelNotification = window.__ZAGEL_NOTIFICATION__;
})();
