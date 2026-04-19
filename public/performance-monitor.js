/**
 * Performance Monitor
 * Tracks and optimizes page performance
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      resourceCount: 0,
      errorCount: 0,
      iframeCount: 0,
      memoryUsage: 0
    };
    
    // Debounce for iframe alert (30 second cooldown)
    this.lastIframeAlert = 0;
    this.iframeAlertCooldown = 30000; // 30 seconds
    
    // Track errors
    this.errors = [];
    this.maxErrors = 50;
  }
  
  /**
   * Start monitoring
   */
  start() {
    this.setupErrorTracking();
    this.startMetricsCollection();
    this.monitorIframes();
    console.log('[PerformanceMonitor] ✅ Started monitoring');
  }
  
  /**
   * Setup global error tracking
   */
  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now()
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'unhandledRejection',
        message: event.reason?.message || String(event.reason),
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Record an error
   */
  recordError(error) {
    this.errors.push(error);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    
    this.metrics.errorCount = this.errors.length;
    
    // Log errors for debugging
    if (error.type === 'error') {
      console.warn(`[PerformanceMonitor] Error at ${error.filename}:${error.lineno}:${error.colno} - ${error.message}`);
    } else {
      console.warn(`[PerformanceMonitor] ${error.type} - ${error.message}`);
    }
  }
  
  /**
   * Start collecting performance metrics
   */
  startMetricsCollection() {
    // Initial metrics
    const start = performance.now();
    
    // Collect on page load complete
    window.addEventListener('load', () => {
      this.metrics.pageLoadTime = performance.now() - start;
      this.metrics.resourceCount = performance.getEntriesByType('resource').length;
      console.log(`[PerformanceMonitor] Page loaded in ${this.metrics.pageLoadTime.toFixed(0)}ms (${this.metrics.resourceCount} resources)`);
    });
    
    // Periodic memory checks (if available)
    if (performance.memory) {
      setInterval(() => {
        this.metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576);
        if (this.metrics.memoryUsage > 100) {
          console.warn(`[PerformanceMonitor] High memory usage: ${this.metrics.memoryUsage}MB`);
        }
      }, 5000);
    }
  }
  
  /**
   * Monitor iframe usage with debounce
   */
  monitorIframes() {
    setInterval(() => {
      const iframeCount = document.querySelectorAll('iframe').length;
      this.metrics.iframeCount = iframeCount;
      
      // Alert ONLY if:
      // 1. There are many iframes (>= 3)
      // 2. AND enough time has passed since last alert (debounce)
      if (iframeCount >= 3) {
        const now = Date.now();
        if (now - this.lastIframeAlert >= this.iframeAlertCooldown) {
          this.lastIframeAlert = now;
          console.warn(`[PERF ALERT] Excessive iframes detected (${iframeCount}). This may impact performance.`);
        }
      }
    }, 2000); // Check every 2 seconds
  }
  
  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      errors: this.errors.slice(-10), // Return last 10 errors
      timestamp: Date.now()
    };
  }
  
  /**
   * Log metrics to console
   */
  logMetrics() {
    const metrics = this.getMetrics();
    console.table(metrics);
    return metrics;
  }
  
  /**
   * Check for memory leaks
   */
  checkMemoryLeaks() {
    if (!performance.memory) {
      return { status: 'unavailable' };
    }
    
    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;
    
    return {
      status: usagePercent > 80 ? 'warning' : 'ok',
      usedMB: Math.round(usedJSHeapSize / 1048576),
      limitMB: Math.round(jsHeapSizeLimit / 1048576),
      usagePercent: usagePercent.toFixed(1)
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}
