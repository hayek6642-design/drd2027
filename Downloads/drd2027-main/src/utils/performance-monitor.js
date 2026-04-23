class PerformanceMonitor {
  constructor() {
    this.overlay = null;
    this.isActive = false;
    this.updateInterval = null;
    this.memoryHistory = [];
    this.maxHistory = 60;
    this.thresholds = {
      normal: 100,
      warning: 200,
      critical: 500
    };
    this.setupHotkey();
  }

  setupHotkey() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    if (this.isActive) {
      this.destroy();
    } else {
      this.create();
    }
  }

  create() {
    this.isActive = true;
    this.overlay = document.createElement('div');
    this.overlay.id = 'performance-monitor';
    this.overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 320px;
      background: rgba(0, 0, 0, 0.95);
      color: #0f0;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
      border: 1px solid #0f0;
      max-height: 500px;
      overflow-y: auto;
    `;

    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      cursor: pointer;
      color: #f00;
      font-weight: bold;
      font-size: 18px;
    `;
    closeBtn.onclick = () => this.destroy();
    this.overlay.appendChild(closeBtn);

    this.content = document.createElement('div');
    this.overlay.appendChild(this.content);
    document.body.appendChild(this.overlay);
    this.updateInterval = setInterval(() => this.update(), 1000);
    this.update();
    console.log('[PerformanceMonitor] 🟢 Activated - press Ctrl+Shift+P to hide');
  }

  destroy() {
    this.isActive = false;
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.overlay) this.overlay.remove();
    console.log('[PerformanceMonitor] Deactivated');
  }

  update() {
    if (!this.overlay || !this.isActive) return;
    const mem = performance.memory;
    const used = Math.round((mem?.usedJSHeapSize || 0) / 1048576);
    const total = Math.round((mem?.totalJSHeapSize || 0) / 1048576);
    const limit = Math.round((mem?.jsHeapSizeLimit || 0) / 1048576);

    this.memoryHistory.push({ used, time: Date.now() });
    if (this.memoryHistory.length > this.maxHistory) this.memoryHistory.shift();

    let color = '#0f0';
    let status = '✓ GOOD';
    if (used > this.thresholds.critical) {
      color = '#f00';
      status = '✗ CRITICAL';
    } else if (used > this.thresholds.warning) {
      color = '#ff0';
      status = '⚠ WARNING';
    }

    const trend = this.getTrend();
    const trendArrow = trend > 5 ? '📈' : trend < -5 ? '📉' : '→';
    const iframeCount = document.querySelectorAll('iframe').length;
    const assetBusStats = window.AssetBus?.getSnapshot?.() || null;
    const smStats = window.serviceManager?.getStatus?.() || null;

    const html = `
      <div style="color: ${color}; margin-bottom: 10px; font-weight: bold;">${status}</div>
      <div style="border-bottom: 1px solid #0f0; padding-bottom: 10px; margin-bottom: 10px;">
        <div>Memory: <span style="color: ${color}; font-weight: bold;">${used}MB</span> / ${total}MB / ${limit}MB</div>
        <div>Heap: ${Math.round((used / limit) * 100)}%</div>
        <div>Trend: ${trendArrow} ${trend > 0 ? '+' : ''}${trend.toFixed(1)}MB/min</div>
      </div>
      <div style="border-bottom: 1px solid #0f0; padding-bottom: 10px; margin-bottom: 10px;">
        <div><strong>DOM Elements</strong></div>
        <div>iframes: ${iframeCount}</div>
        <div>elements: ${document.querySelectorAll('*').length}</div>
      </div>
      ${assetBusStats ? `<div style="border-bottom: 1px solid #0f0; padding-bottom: 10px; margin-bottom: 10px;"><div><strong>AssetBus</strong></div><div>events: ${assetBusStats.eventCount}</div><div>listeners: ${assetBusStats.listenerCount}</div><div>history: ${assetBusStats.historyLength}</div></div>` : ''}
      ${smStats ? `<div style="border-bottom: 1px solid #0f0; padding-bottom: 10px; margin-bottom: 10px;"><div><strong>ServiceManager</strong></div><div>active: ${smStats.activeService || 'none'}</div><div>memory: ${smStats.memoryMB}MB</div><div>iframes: ${smStats.iframeCount}</div></div>` : ''}
      <div style="color: #888; font-size: 10px;"><div>Visible: ${document.hidden ? '🔴 Hidden' : '🟢 Visible'}</div><div>Time: ${new Date().toLocaleTimeString()}</div></div>
    `;
    this.content.innerHTML = html;

    if (used > this.thresholds.critical) {
      console.error(`[PerformanceMonitor] 🚨 CRITICAL MEMORY: ${used}MB`);
    }
  }

  getTrend() {
    if (this.memoryHistory.length < 2) return 0;
    const first = this.memoryHistory[0];
    const last = this.memoryHistory[this.memoryHistory.length - 1];
    const timeDiffMinutes = (last.time - first.time) / 60000;
    if (timeDiffMinutes === 0) return 0;
    return (last.used - first.used) / timeDiffMinutes;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.performanceMonitor) {
    window.performanceMonitor = new PerformanceMonitor();
  }
});

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    if (!window.performanceMonitor) {
      window.performanceMonitor = new PerformanceMonitor();
    }
  });
} else {
  if (!window.performanceMonitor) {
    window.performanceMonitor = new PerformanceMonitor();
  }
}

console.log('[PerformanceMonitor] Loaded. Press Ctrl+Shift+P to activate');