/**
 * PerformanceMonitor - Monitors app performance with debounced checks
 * Prevents rapid-fire console spam (e.g., iframe alert firing every frame)
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 60,
      memory: 0,
      iframes: 0,
      lastCheck: Date.now()
    };

    this.debounceTimers = {
      iframe: null,
      memory: null,
      api: null
    };

    this.debounceIntervals = {
      iframe: 30000, // Check iframe count once per 30s
      memory: 30000,
      api: 60000
    };

    this.thresholds = {
      maxIframes: 2,
      maxMemory: 500, // MB
      maxApiErrors: 5
    };

    this.alerts = {
      iframe: false,
      memory: false,
      api: false
    };

    this.startMonitoring();
  }

  /**
   * Start monitoring (non-blocking via RAF)
   */
  startMonitoring() {
    let frameCount = 0;
    let lastTime = Date.now();

    const measure = () => {
      frameCount++;
      const now = Date.now();
      const deltaTime = now - lastTime;

      // Update FPS every 1 second
      if (deltaTime >= 1000) {
        this.metrics.fps = Math.round((frameCount * 1000) / deltaTime);
        frameCount = 0;
        lastTime = now;
      }

      // Debounced checks
      this.checkMemory();
      this.checkIframes();

      requestAnimationFrame(measure);
    };

    requestAnimationFrame(measure);
  }

  /**
   * Check memory usage (debounced)
   */
  checkMemory() {
    if (this.debounceTimers.memory) return;

    this.debounceTimers.memory = setTimeout(() => {
      this.debounceTimers.memory = null;

      if (performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        this.metrics.memory = usedMB;

        if (usedMB > this.thresholds.maxMemory && !this.alerts.memory) {
          console.warn(`[PERF] High memory usage: ${usedMB}MB`);
          this.alerts.memory = true;
        } else if (usedMB <= this.thresholds.maxMemory) {
          this.alerts.memory = false;
        }
      }
    }, this.debounceIntervals.memory);
  }

  /**
   * Check iframe count (debounced) - ONLY alert once per 30s max
   */
  checkIframes() {
    if (this.debounceTimers.iframe) return;

    this.debounceTimers.iframe = setTimeout(() => {
      this.debounceTimers.iframe = null;

      const iframes = document.querySelectorAll('iframe');
      this.metrics.iframes = iframes.length;

      if (iframes.length > this.thresholds.maxIframes && !this.alerts.iframe) {
        console.warn(`[PERF] Excessive iframes detected: ${iframes.length}`);
        this.alerts.iframe = true;
      } else if (iframes.length <= this.thresholds.maxIframes) {
        this.alerts.iframe = false;
      }
    }, this.debounceIntervals.iframe);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Record API error
   */
  recordApiError() {
    if (!window.__API_ERRORS__) window.__API_ERRORS__ = 0;
    window.__API_ERRORS__++;

    if (window.__API_ERRORS__ > this.thresholds.maxApiErrors && !this.alerts.api) {
      console.warn('[PERF] API error flood detected');
      this.alerts.api = true;
    }
  }

  /**
   * Reset API error count
   */
  resetApiErrors() {
    window.__API_ERRORS__ = 0;
    this.alerts.api = false;
  }
}

window.PerformanceMonitor = PerformanceMonitor;
window.performanceMonitor = new PerformanceMonitor();
