// src/core/watch-dog-optimized.js

/**
 * Watch-Dog Guardian V2 - Event-Driven Architecture
 * Replaces polling with reactive monitoring
 */

class WatchDogGuardianV2 {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.eventQueue = [];
    this.subscribers = new Map();
    
    // Configurable intervals (longer = less CPU)
    this.config = {
      normalInterval: 30000,    // 30 seconds normal
      alertInterval: 5000,      // 5 seconds if issues detected
      idleInterval: 60000,      // 1 minute when idle
      maxEventsPerBatch: 100
    };
    
    this.state = {
      lastCheck: 0,
      consecutiveErrors: 0,
      isIdle: false,
      ledgerHash: null
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupMutationObserver();
    this.setupIdleDetection();
    
    // Start with normal interval
    this.start(this.config.normalInterval);
    
    console.log('[WatchDog] Event-driven guardian initialized');
  }

  setupEventListeners() {
    // Listen for data changes instead of polling
    window.addEventListener('assetbus:transaction', (e) => {
      this.queueEvent('transaction', e.detail);
    });
    
    window.addEventListener('assetbus:ledger-update', (e) => {
      this.queueEvent('ledger', e.detail);
    });
    
    window.addEventListener('code:generated', (e) => {
      this.queueEvent('code-gen', e.detail);
    });
    
    window.addEventListener('code:redeemed', (e) => {
      this.queueEvent('code-redeem', e.detail);
    });
    
    // Database lock detection
    window.addEventListener('db:lock-error', (e) => {
      this.handleDatabaseLock(e.detail);
    });
  }

  setupMutationObserver() {
    // Watch for DOM changes that might indicate issues
    const observer = new MutationObserver((mutations) => {
      const significantChanges = mutations.filter(m => 
        m.type === 'childList' && 
        m.addedNodes.length > 10
      );
      
      if (significantChanges.length > 0) {
        this.queueEvent('dom-bulk-change', {
          count: significantChanges.length,
          timestamp: Date.now()
        });
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupIdleDetection() {
    // Use requestIdleCallback for non-urgent checks
    const checkIdle = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.state.lastCheck;
      
      if (timeSinceLastActivity > 60000) {
        this.state.isIdle = true;
        this.adjustInterval(this.config.idleInterval);
      } else {
        this.state.isIdle = false;
      }
      
      requestIdleCallback(checkIdle, { timeout: 60000 });
    };
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(checkIdle);
    }
  }

  queueEvent(type, data) {
    this.eventQueue.push({ type, data, time: Date.now() });
    
    // Process immediately if critical
    if (type === 'ledger' || type === 'db-error') {
      this.processEvents();
    }
    
    // Trim queue if too large
    if (this.eventQueue.length > this.config.maxEventsPerBatch) {
      this.eventQueue = this.eventQueue.slice(-this.config.maxEventsPerBatch);
    }
  }

  start(interval) {
    this.stop();
    this.isRunning = true;
    
    // Use Page Visibility API to pause when hidden
    const tick = () => {
      if (!document.hidden && this.isRunning) {
        this.check();
      }
      this.checkInterval = setTimeout(tick, this.currentInterval || interval);
    };
    
    this.currentInterval = interval;
    tick();
  }

  stop() {
    this.isRunning = false;
    if (this.checkInterval) {
      clearTimeout(this.checkInterval);
      this.checkInterval = null;
    }
  }

  adjustInterval(newInterval) {
    if (this.currentInterval !== newInterval) {
      console.log(`[WatchDog] Adjusting interval: ${this.currentInterval}ms → ${newInterval}ms`);
      this.start(newInterval);
    }
  }

  async check() {
    this.state.lastCheck = Date.now();
    
    // Process queued events
    await this.processEvents();
    
    // Only run heavy checks if needed
    if (this.shouldRunHeavyCheck()) {
      await this.runIntegrityCheck();
    }
  }

  shouldRunHeavyCheck() {
    // Don't run heavy checks if:
    // 1. Recently ran (within 5 seconds)
    // 2. No events in queue
    // 3. Tab is hidden
    // 4. System is idle
    
    if (document.hidden) return false;
    if (this.eventQueue.length === 0 && this.state.consecutiveErrors === 0) {
      return false;
    }
    
    return true;
  }

  async processEvents() {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    // Group by type for efficient processing
    const grouped = events.reduce((acc, event) => {
      acc[event.type] = acc[event.type] || [];
      acc[event.type].push(event);
      return acc;
    }, {});
    
    // Process ledger events (most critical)
    if (grouped.ledger) {
      await this.validateLedger(grouped.ledger);
    }
    
    // Process transaction batch
    if (grouped.transaction) {
      await this.validateTransactions(grouped.transaction);
    }
    
    // Handle errors
    if (grouped['db-error'] || grouped['db-lock-error']) {
      this.handleDatabaseIssues(grouped);
    }
  }

  async validateLedger(ledgerEvents) {
    // Get latest ledger state
    const latest = ledgerEvents[ledgerEvents.length - 1];
    const newHash = await this.computeLedgerHash(latest.data);
    
    if (this.state.ledgerHash && this.state.ledgerHash !== newHash) {
      // Ledger changed, validate integrity
      const isValid = await this.runIntegrityCheck();
      
      if (!isValid) {
        this.triggerAlert('ledger-mismatch', latest);
        this.state.consecutiveErrors++;
        
        // Speed up checks if errors
        if (this.state.consecutiveErrors > 2) {
          this.adjustInterval(this.config.alertInterval);
        }
      } else {
        this.state.consecutiveErrors = 0;
        this.adjustInterval(this.config.normalInterval);
      }
    }
    
    this.state.ledgerHash = newHash;
  }

  async validateTransactions(transactions) {
    // Batch validation for performance
    const batch = transactions.slice(-20); // Last 20 only
    
    for (const tx of batch) {
      if (tx.data.amount > 10000 || tx.data.type === 'suspicious') {
        this.flagTransaction(tx);
      }
    }
  }

  async runIntegrityCheck() {
    // Use requestIdleCallback for non-blocking
    return new Promise((resolve) => {
      const check = async () => {
        try {
          // Quick hash check
          const currentHash = await this.getCurrentLedgerHash();
          const storedHash = localStorage.getItem('ledger-hash');
          
          if (currentHash !== storedHash) {
            // Run full check only if hash mismatch
            const result = await this.fullIntegrityCheck();
            resolve(result);
          } else {
            resolve(true);
          }
        } catch (e) {
          console.error('[WatchDog] Integrity check failed:', e);
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

  async computeLedgerHash(data) {
    // Fast hash using SubtleCrypto
    const str = JSON.stringify(data);
    const buf = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  handleDatabaseLock(error) {
    console.warn('[WatchDog] Database lock detected:', error);
    
    // Notify system to retry with backoff
    window.dispatchEvent(new CustomEvent('watchdog:db-lock', {
      detail: { 
        retryAfter: Math.pow(2, this.state.consecutiveErrors) * 1000,
        error 
      }
    }));
    
    // Increase interval temporarily
    this.adjustInterval(this.config.alertInterval);
  }

  triggerAlert(type, data) {
    window.dispatchEvent(new CustomEvent('watchdog:alert', {
      detail: { type, data, timestamp: Date.now() }
    }));
    
    // Also notify any Capacitor native layer
    if (window.Capacitor?.Plugins?.WatchDog) {
      window.Capacitor.Plugins.WatchDog.notify({ type, severity: 'high' });
    }
  }

  // Public API for manual checks
  async forceCheck() {
    return await this.runIntegrityCheck();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.currentInterval,
      queueLength: this.eventQueue.length,
      lastCheck: this.state.lastCheck,
      consecutiveErrors: this.state.consecutiveErrors
    };
  }
}

// Export singleton
export const watchDog = new WatchDogGuardianV2();

// Legacy compatibility
window.WatchDogGuardian = watchDog;