// src/utils/performance-monitor.js

/**
 * Real-time Performance Monitor
 * Displays CPU/Memory usage in UI
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 0,
      memory: 0,
      jsHeap: 0,
      domNodes: 0,
      listeners: 0,
      iframes: 0
    };
    
    this.container = null;
    this.isVisible = false;
    this.frameCount = 0;
    this.lastTime = performance.now();
    
    this.init();
  }

  init() {
    this.createUI();
    this.startTracking();
    
    // Toggle with keyboard shortcut (Ctrl+Shift+P)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        this.toggle();
      }
    });
  }

  createUI() {
    const style = document.createElement('style');
    style.textContent = `
      .perf-monitor {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid #333;
        z-index: 99999;
        min-width: 280px;
        backdrop-filter: blur(10px);
        display: none;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      
      .perf-monitor.visible {
        display: block;
      }
      
      .perf-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #333;
      }
      
      .perf-title {
        font-weight: bold;
        color: #fff;
      }
      
      .perf-close {
        background: #ff4444;
        color: #fff;
        border: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 12px;
      }
      
      .perf-metric {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        padding: 4px 0;
      }
      
      .perf-metric.warning {
        color: #ffaa00;
      }
      
      .perf-metric.critical {
        color: #ff4444;
        font-weight: bold;
      }
      
      .perf-bar {
        width: 100%;
        height: 4px;
        background: #333;
        border-radius: 2px;
        margin-top: 4px;
        overflow: hidden;
      }
      
      .perf-bar-fill {
        height: 100%;
        background: #00ff00;
        transition: width 0.3s, background 0.3s;
      }
      
      .perf-bar-fill.warning {
        background: #ffaa00;
      }
      
      .perf-bar-fill.critical {
        background: #ff4444;
      }
      
      .perf-actions {
        margin-top: 12px;
        display: flex;
        gap: 8px;
      }
      
      .perf-btn {
        background: #333;
        color: #fff;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 11px;
      }
      
      .perf-btn:hover {
        background: #444;
      }
      
      .perf-btn.emergency {
        background: #ff4444;
      }
    `;
    document.head.appendChild(style);

    this.container = document.createElement('div');
    this.container.className = 'perf-monitor';
    this.container.innerHTML = `
      <div class="perf-header">
        <span class="perf-title">🔍 Performance Monitor</span>
        <button class="perf-close" onclick="perfMonitor.toggle()">×</button>
      </div>
      
      <div class="perf-metric" id="metric-fps">
        <span>FPS:</span>
        <span>--</span>
        <div class="perf-bar"><div class="perf-bar-fill" style="width: 0%"></div></div>
      </div>
      
      <div class="perf-metric" id="metric-memory">
        <span>Memory:</span>
        <span>-- MB</span>
        <div class="perf-bar"><div class="perf-bar-fill" style="width: 0%"></div></div>
      </div>
      
      <div class="perf-metric" id="metric-heap">
        <span>JS Heap:</span>
        <span>-- MB</span>
        <div class="perf-bar"><div class="perf-bar-fill" style="width: 0%"></div></div>
      </div>
      
      <div class="perf-metric" id="metric-dom">
        <span>DOM Nodes:</span>
        <span>--</span>
      </div>
      
      <div class="perf-metric" id="metric-iframes">
        <span>Active Iframes:</span>
        <span>--</span>
      </div>
      
      <div class="perf-metric" id="metric-listeners">
        <span>Event Listeners:</span>
        <span>--</span>
      </div>
      
      <div class="perf-actions">
        <button class="perf-btn" onclick="perfMonitor.gc()">Force GC</button>
        <button class="perf-btn" onclick="perfMonitor.cleanup()">Cleanup</button>
        <button class="perf-btn emergency" onclick="perfMonitor.emergency()">🚨 Emergency</button>
      </div>
    `;
    
    document.body.appendChild(this.container);
  }

  startTracking() {
    // FPS Counter
    const measureFPS = () => {
      this.frameCount++;
      const now = performance.now();
      
      if (now >= this.lastTime + 1000) {
        this.metrics.fps = this.frameCount;
        this.frameCount = 0;
        this.lastTime = now;
        this.updateUI();
      }
      
      if (this.isVisible) {
        requestAnimationFrame(measureFPS);
      }
    };
    
    requestAnimationFrame(measureFPS);
    
    // Memory tracking (if available)
    if (performance.memory) {
      setInterval(() => {
        this.metrics.jsHeap = performance.memory.usedJSHeapSize / 1048576;
        this.metrics.memory = performance.memory.totalJSHeapSize / 1048576;
      }, 1000);
    }
    
    // DOM tracking
    setInterval(() => {
      this.metrics.domNodes = document.getElementsByTagName('*').length;
      this.metrics.iframes = document.querySelectorAll('iframe').length;
      this.metrics.listeners = this.estimateEventListeners();
    }, 2000);
  }

  estimateEventListeners() {
    // Approximate count (not exact due to browser limitations)
    let count = 0;
    const elements = document.querySelectorAll('*');
    // This is an estimate
    return elements.length * 2; // Rough estimate
  }

  updateUI() {
    if (!this.isVisible) return;
    
    // FPS
    const fpsEl = document.getElementById('metric-fps');
    const fpsPercent = Math.min((this.metrics.fps / 60) * 100, 100);
    fpsEl.className = 'perf-metric' + (this.metrics.fps < 30 ? ' warning' : '') + (this.metrics.fps < 15 ? ' critical' : '');
    fpsEl.querySelector('span:last-of-type').textContent = this.metrics.fps;
    fpsEl.querySelector('.perf-bar-fill').style.width = fpsPercent + '%';
    fpsEl.querySelector('.perf-bar-fill').className = 'perf-bar-fill' + (this.metrics.fps < 30 ? ' warning' : '') + (this.metrics.fps < 15 ? ' critical' : '');
    
    // Memory
    const memEl = document.getElementById('metric-memory');
    const memPercent = Math.min((this.metrics.memory / 200) * 100, 100); // Assume 200MB limit
    memEl.querySelector('span:last-of-type').textContent = this.metrics.memory.toFixed(1) + ' MB';
    memEl.querySelector('.perf-bar-fill').style.width = memPercent + '%';
    
    // Heap
    const heapEl = document.getElementById('metric-heap');
    heapEl.querySelector('span:last-of-type').textContent = this.metrics.jsHeap.toFixed(1) + ' MB';
    
    // DOM
    document.getElementById('metric-dom').querySelector('span:last-of-type').textContent = this.metrics.domNodes;
    
    // Iframes
    const ifrEl = document.getElementById('metric-iframes');
    ifrEl.querySelector('span:last-of-type').textContent = this.metrics.iframes;
    ifrEl.className = 'perf-metric' + (this.metrics.iframes > 2 ? ' warning' : '');
    
    // Listeners
    document.getElementById('metric-listeners').querySelector('span:last-of-type').textContent = '~' + this.metrics.listeners;
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.container.classList.toggle('visible', this.isVisible);
    
    if (this.isVisible) {
      this.updateUI();
    }
  }

  gc() {
    // Hint for garbage collection (not guaranteed)
    if (window.gc) {
      window.gc();
      this.showToast('Garbage collection triggered');
    } else {
      // Force memory pressure
      const arr = new Array(1000000).fill(0);
      arr.length = 0;
      this.showToast('GC hint sent (not guaranteed)');
    }
  }

  cleanup() {
    // Trigger global cleanup
    if (window.serviceManager?.emergencyCleanup) {
      window.serviceManager.emergencyCleanup();
    }
    if (window.assetBus?.cleanup) {
      window.assetBus.cleanup();
    }
    this.showToast('Cleanup completed');
  }

  emergency() {
    // Emergency measures
    document.body.style.animation = 'none';
    document.querySelectorAll('*').forEach(el => {
      el.style.animation = 'none';
      el.style.transition = 'none';
    });
    
    // Unmount all services
    if (window.serviceManager) {
      for (const [id] of window.serviceManager.activeServices) {
        window.serviceManager.unmountService(id);
      }
    }
    
    this.showToast('🚨 Emergency mode activated');
  }

  showToast(msg) {
    // Simple toast
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      z-index: 100000;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  exportReport() {
    const report = {
      timestamp: Date.now(),
      metrics: this.metrics,
      userAgent: navigator.userAgent,
      url: location.href
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perf-report-${Date.now()}.json`;
    a.click();
  }
}

// Initialize
window.perfMonitor = new PerformanceMonitor();