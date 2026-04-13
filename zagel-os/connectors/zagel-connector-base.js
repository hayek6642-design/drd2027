/**
 * ZAGEL Connector Base v2.0.0
 * Base class for all app connectors (Farghna, E7ki, etc.)
 * Provides standardized interface for cross-app integration
 */

(function () {
  'use strict';

  class ZagelConnectorBase {
    constructor(appId, config = {}) {
      this._appId = appId;
      this._config = {
        name: config.name || appId,
        version: config.version || '1.0.0',
        apiBase: config.apiBase || `/api/${appId}`,
        iframeId: config.iframeId || null,
        ...config
      };
      this._connected = false;
      this._listeners = {};
      this._lastSync = null;
    }

    async connect() {
      try {
        // Register with Zagel core
        if (window.ZagelBus) {
          window.ZagelBus.emit('connector:connect', { appId: this._appId, config: this._config });
        }

        // Register iframe if applicable
        if (this._config.iframeId) {
          const iframe = document.getElementById(this._config.iframeId);
          if (iframe && window.ZagelBus) {
            window.ZagelBus.registerIframe(iframe, this._config.origin || '*');
          }
        }

        this._connected = true;
        console.log(`🔗 [Connector:${this._appId}] Connected`);
        return { success: true };
      } catch (err) {
        console.error(`🔗 [Connector:${this._appId}] Connection failed:`, err);
        return { success: false, error: err.message };
      }
    }

    async disconnect() {
      this._connected = false;
      if (window.ZagelBus) {
        window.ZagelBus.emit('connector:disconnect', { appId: this._appId });
      }
    }

    async sendEvent(event, data) {
      if (!this._connected) throw new Error(`Connector ${this._appId} not connected`);

      if (window.ZagelBus) {
        window.ZagelBus.emit(`app:${this._appId}:${event}`, data);
      }
    }

    onEvent(event, handler) {
      const key = `app:${this._appId}:${event}`;
      if (window.ZagelBus) {
        return window.ZagelBus.on(key, handler);
      }
    }

    async callAPI(endpoint, options = {}) {
      const url = `${this._config.apiBase}${endpoint}`;
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(options.timeout || 10000)
      });

      if (!response.ok) throw new Error(`API ${response.status}`);
      return response.json();
    }

    isConnected() { return this._connected; }
    getAppId() { return this._appId; }
    getConfig() { return { ...this._config }; }
  }

  window.ZagelConnectorBase = ZagelConnectorBase;
})();
