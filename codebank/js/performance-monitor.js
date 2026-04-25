/**
 * PERFORMANCE MONITOR (Phase 3)
 * Real-time CPU/Memory monitoring for CodeBank
 */
(function() {
    'use strict';

    class PerformanceMonitor {
        constructor() {
            this.container = null;
            this.stats = {
                fps: 0,
                memory: 0,
                nodes: 0,
                iframes: 0
            };
            this.lastFrameTime = performance.now();
            this.frameCount = 0;
            this.isVisible = true;
            this.init();
        }

        init() {
            this.createUI();
            this.startLoop();
            this.observeIframes();
            console.log('[PerfMonitor] Initialized');
        }

        createUI() {
            const div = document.createElement('div');
            div.id = 'perf-monitor-ui';
            div.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                padding: 10px;
                border-radius: 8px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                z-index: 9999;
                pointer-events: none;
                border: 1px solid #333;
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 120px;
                backdrop-filter: blur(4px);
            `;
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between;"><span>FPS:</span> <span id="perf-fps">--</span></div>
                <div style="display: flex; justify-content: space-between;"><span>MEM:</span> <span id="perf-mem">--</span></div>
                <div style="display: flex; justify-content: space-between;"><span>DOM:</span> <span id="perf-nodes">--</span></div>
                <div style="display: flex; justify-content: space-between;"><span>IFRAMES:</span> <span id="perf-iframes">--</span></div>
            `;
            
            document.body.appendChild(div);
            this.container = div;
        }

        startLoop() {
            const update = () => {
                if (!this.isVisible) return;

                // FPS Calculation
                this.frameCount++;
                const now = performance.now();
                if (now >= this.lastFrameTime + 1000) {
                    this.stats.fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
                    this.frameCount = 0;
                    this.lastFrameTime = now;
                    this.updateUI();
                }

                requestAnimationFrame(update);
            };
            requestAnimationFrame(update);

            // Memory & DOM stats every 2 seconds
            setInterval(() => {
                if (window.performance && window.performance.memory) {
                    this.stats.memory = Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024));
                    
                    // Alert if memory too high
                    if (this.stats.memory > 150) {
                        console.warn(`[PERF ALERT] High Memory Usage: ${this.stats.memory}MB`);
                        this.container.style.borderColor = '#ff0000';
                    } else {
                        this.container.style.borderColor = '#333';
                    }
                }
                this.stats.nodes = document.querySelectorAll('*').length;
                this.stats.iframes = document.querySelectorAll('iframe').length;
            }, 2000);
        }

        updateUI() {
            const fpsEl = document.getElementById('perf-fps');
            const memEl = document.getElementById('perf-mem');
            const nodesEl = document.getElementById('perf-nodes');
            const iframeEl = document.getElementById('perf-iframes');

            if (fpsEl) fpsEl.textContent = this.stats.fps;
            if (memEl) memEl.textContent = this.stats.memory ? `${this.stats.memory}MB` : 'N/A';
            if (nodesEl) nodesEl.textContent = this.stats.nodes;
            if (iframeEl) {
                iframeEl.textContent = this.stats.iframes;
                if (this.stats.iframes > 2) iframeEl.style.color = '#ffaa00';
                else iframeEl.style.color = '#00ff00';
            }
        }

        observeIframes() {
            // Monitor iframe leaks - with debounce
            let lastCheck = 0;
            let alertShown = false;
            const observer = new MutationObserver((mutations) => {
                const now = Date.now();
                if (now - lastCheck < 30000) return; // Only check once per 30 seconds
                lastCheck = now;
                
                const iframes = document.querySelectorAll('iframe').length;
                if (iframes > 2 && !alertShown) {
                    console.warn(`[PERF ALERT] Excessive iframes detected (${iframes}). Leak suspected!`);
                    alertShown = true;
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Initialize on load — disabled on native (production) platform
    const _isNativeApp = () => {
        try { return window.Capacitor && window.Capacitor.isNativePlatform(); } catch(_) { return false; }
    };
    if (!_isNativeApp()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new PerformanceMonitor());
        } else {
            new PerformanceMonitor();
        }
    }
})();
