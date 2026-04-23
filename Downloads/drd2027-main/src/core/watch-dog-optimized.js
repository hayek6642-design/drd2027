class WatchDogV2 {
  constructor() {
    this.isRunning = false;
    this.fallbackTimer = null;
    this.eventQueue = [];
    this.config = {
      fallbackInterval: 30000,
      alertInterval: 5000,
      maxQueueSize: 100
    };
    this.state = {
      lastCheck: 0,
      errors: 0,
      ledgerHash: null
    };
    this.init();
  }

  init() {
    document.addEventListener('assetbus:publish', (e) => {
      this.onAssetBusEvent(e.detail);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkNow();
      }
    });
    window.addEventListener('focus', () => {
      this.checkNow();
    });
    window.addEventListener('online', () => {
      this.checkNow();
    });
    this.startFallbackTimer();
    this.isRunning = true;
    console.log('[WatchDog] Event-driven monitoring started (30s fallback)');
  }

  startFallbackTimer() {
    this.fallbackTimer = setInterval(async () => {
      if (document.hidden) return;
      if (this.eventQueue.length === 0) return;
      await this.checkQueue();
    }, this.config.fallbackInterval);
  }

  onAssetBusEvent(event) {
    const { type, data } = event;
    if (['transaction', 'ledger', 'code'].includes(type)) {
      this.eventQueue.push({ type, data, time: Date.now() });
      if (type === 'ledger' || type === 'error') {
        this.checkQueue();
      }
      if (this.eventQueue.length > this.config.maxQueueSize) {
        this.eventQueue = this.eventQueue.slice(-this.config.maxQueueSize);
      }
    }
  }

  async checkNow() {
    if (document.hidden) return;
    await this.checkQueue();
  }

  async checkQueue() {
    if (this.eventQueue.length === 0) return;
    this.state.lastCheck = Date.now();
    const events = [...this.eventQueue];
    this.eventQueue = [];
    const grouped = events.reduce((acc, e) => {
      acc[e.type] = acc[e.type] || [];
      acc[e.type].push(e);
      return acc;
    }, {});
    try {
      if (grouped.ledger) {
        await this.validateLedger(grouped.ledger);
      }
      if (grouped.transaction) {
        await this.validateTransactions(grouped.transaction);
      }
      if (grouped.code) {
        await this.validateCode(grouped.code);
      }
      this.state.errors = 0;
    } catch (e) {
      console.error('[WatchDog] Check failed:', e);
      this.state.errors++;
    }
  }

  async validateLedger(events) {
    const latest = events[events.length - 1];
    const newHash = await this.quickHash(latest.data);
    if (this.state.ledgerHash && newHash !== this.state.ledgerHash) {
      console.warn('[WatchDog] Ledger hash mismatch detected');
      const isValid = await this.integrityCheck();
      if (!isValid) {
        this.alertAdmin('ledger-mismatch', latest.data);
      }
    }
    this.state.ledgerHash = newHash;
  }

  async validateTransactions(events) {
    const batch = events.slice(-20);
    for (const event of batch) {
      const { amount, type } = event.data;
      if (amount > 100000 || type === 'suspicious') {
        this.flagTransaction(event.data);
      }
    }
  }

  async validateCode(events) {
    for (const event of events.slice(-10)) {
      if (event.data.status === 'error') {
        console.warn('[WatchDog] Code validation error:', event.data);
      }
    }
  }

  async quickHash(data) {
    const str = JSON.stringify(data);
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async integrityCheck() {
    return new Promise((resolve) => {
      const check = async () => {
        try {
          const isValid = true;
          resolve(isValid);
        } catch (e) {
          console.error('[WatchDog] Integrity check error:', e);
          resolve(false);
        }
      };
      if ('requestIdleCallback' in window) {
        requestIdleCallback(check, { timeout: 5000 });
      } else {
        setTimeout(check, 0);
      }
    });
  }

  alertAdmin(type, data) {
    console.error(`[WatchDog] 🚨 ${type}:`, data);
    window.dispatchEvent(new CustomEvent('watchdog:alert', {
      detail: { type, data, timestamp: Date.now() }
    }));
  }

  flagTransaction(tx) {
    console.warn('[WatchDog] Flagged transaction:', tx);
    window.dispatchEvent(new CustomEvent('watchdog:suspicious-tx', {
      detail: tx
    }));
  }

  stop() {
    this.isRunning = false;
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
    }
    console.log('[WatchDog] Monitoring stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      queueLength: this.eventQueue.length,
      lastCheck: this.state.lastCheck,
      errors: this.state.errors
    };
  }
}

export const watchDog = new WatchDogV2();
window.addEventListener('beforeunload', () => {
  watchDog.stop();
});
window.WatchDog = watchDog;