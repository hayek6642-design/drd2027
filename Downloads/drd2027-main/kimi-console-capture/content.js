// This runs in the context of your web app (localhost:3001, etc.)
(function() {
  'use strict';
  
  if (window.__KIMI_LOGGER_INSTALLED__) return;
  window.__KIMI_LOGGER_INSTALLED__ = true;

  const KimiLogger = {
    logs: [],
    maxLogs: 1000,
    sessionStart: Date.now(),
    projectContext: null,

    init() {
      this.detectProject();
      this.patchConsole();
      this.patchNetwork();
      this.patchErrors();
      console.log('🎯 Kimi Logger installed - errors will be captured');
    },

    detectProject() {
      // Auto-detect your specific project structure
      const scripts = Array.from(document.scripts).map(s => s.src);
      const hasSafeAsset = scripts.some(s => s.includes('safe-asset-list'));
      const hasBankode = scripts.some(s => s.includes('bankode'));
      const hasWatchDog = scripts.some(s => s.includes('watch-dog'));
      
      this.projectContext = {
        type: hasSafeAsset ? 'safe-asset-ecosystem' : 'unknown',
        components: {
          safeAssetList: hasSafeAsset,
          bankode: hasBankode,
          watchDog: hasWatchDog
        },
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    },

    patchConsole() {
      const methods = ['log', 'error', 'warn', 'info', 'debug'];
      methods.forEach(method => {
        const original = console[method];
        console[method] = (...args) => {
          this.capture('console', method, args);
          original.apply(console, args);
        };
      });
    },

    patchNetwork() {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const start = Date.now();
        try {
          const response = await originalFetch.apply(window, args);
          const duration = Date.now() - start;
          
          // Capture failed requests
          if (!response.ok) {
            this.capture('network', 'fetch-error', {
              url: args[0],
              status: response.status,
              statusText: response.statusText,
              duration
            });
          }
          
          return response;
        } catch (error) {
          this.capture('network', 'fetch-exception', {
            url: args[0],
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
      };

      // Patch XHR too
      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;
      
      XMLHttpRequest.prototype.open = function(method, url) {
        this._kimiData = { method, url, start: Date.now() };
        return originalXHROpen.apply(this, arguments);
      };
      
      XMLHttpRequest.prototype.send = function() {
        this.addEventListener('loadend', () => {
          if (this.status >= 400) {
            this.capture('network', 'xhr-error', {
              url: this._kimiData.url,
              status: this.status,
              statusText: this.statusText,
              duration: Date.now() - this._kimiData.start
            });
          }
        });
        return originalXHRSend.apply(this, arguments);
      };
    },

    patchErrors() {
      window.onerror = (msg, url, line, col, error) => {
        this.capture('error', 'window-onerror', {
          message: msg,
          url,
          line,
          col,
          stack: error?.stack
        });
        return false;
      };

      window.onunhandledrejection = (event) => {
        this.capture('error', 'unhandled-rejection', {
          reason: event.reason?.message || String(event.reason),
          stack: event.reason?.stack
        });
      };
    },

    capture(source, type, data) {
      const entry = {
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString(),
        source,
        type,
        data: this.serialize(data),
        url: window.location.href
      };

      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) this.logs.shift();

      // Auto-detect critical errors and notify background
      if (this.isCritical(source, type, data)) {
        this.notifyBackground(entry);
      }
    },

    serialize(data) {
      try {
        return JSON.parse(JSON.stringify(data, (key, value) => {
          if (value instanceof Error) {
            return { message: value.message, stack: value.stack };
          }
          if (value instanceof HTMLElement) {
            return `[${value.tagName}]`;
          }
          return value;
        }));
      } catch (e) {
        return String(data);
      }
    },

    isCritical(source, type, data) {
      const criticalPatterns = [
        'REJECTED',
        'Ledger Locked',
        'AssetBus not available',
        'BLOCKED FETCH',
        'Failed to execute',
        'null',
        'undefined',
        'not found',
        'already running'
      ];
      
      const text = JSON.stringify(data).toLowerCase();
      return criticalPatterns.some(p => text.includes(p.toLowerCase()));
    },

    notifyBackground(entry) {
      chrome.runtime?.sendMessage({
        action: 'critical-error',
        data: entry
      }).catch(() => {});
    },

    // Called by popup to get formatted report
    generateReport(options = {}) {
      const { 
        filter = 'all', // 'all', 'errors-only', 'last-5-min'
        includeContext = true,
        includeSummary = true 
      } = options;

      let filtered = this.logs;
      
      if (filter === 'errors-only') {
        filtered = this.logs.filter(l => 
          l.type === 'error' || 
          l.type === 'warn' || 
          l.source === 'error' ||
          (l.data?.message && /error|fail|rejected|blocked|null|undefined/i.test(l.data.message))
        );
      } else if (filter === 'last-5-min') {
        const cutoff = Date.now() - 5 * 60 * 1000;
        filtered = this.logs.filter(l => l.timestamp > cutoff);
      }

      // Group by error type for summary
      const summary = {};
      filtered.forEach(log => {
        const key = `${log.source}:${log.type}`;
        summary[key] = (summary[key] || 0) + 1;
      });

      const report = {
        meta: {
          generated: new Date().toISOString(),
          project: this.projectContext,
          totalLogs: this.logs.length,
          filteredCount: filtered.length,
          sessionDuration: Math.floor((Date.now() - this.sessionStart) / 1000)
        },
        summary,
        logs: filtered,
        // Pre-formatted for Kimi
        formattedForKimi: this.formatForKimi(filtered, summary)
      };

      return report;
    },

    formatForKimi(logs, summary) {
      let text = `## Console Error Report\n`;
      text += `**Generated:** ${new Date().toLocaleString()}\n`;
      text += `**URL:** ${window.location.href}\n`;
      text += `**Project:** ${this.projectContext?.type || 'unknown'}\n\n`;

      // Summary section
      text += `### Error Summary\n`;
      Object.entries(summary)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          text += `- ${type}: ${count} occurrences\n`;
        });
      text += `\n`;

      // Critical errors first
      const critical = logs.filter(l => this.isCritical(l.source, l.type, l.data));
      if (critical.length > 0) {
        text += `### 🚨 Critical Errors\n`;
        critical.forEach(log => {
          text += `\`\`\`\n[${log.time}] ${log.source}:${log.type}\n`;
          text += `${JSON.stringify(log.data, null, 2)}\n\`\`\`\n`;
        });
        text += `\n`;
      }

      // All other logs
      text += `### Full Log Stream\n`;
      logs.forEach(log => {
        text += `[${log.time}] ${log.source}:${log.type} - ${JSON.stringify(log.data).slice(0, 200)}\n`;
      });

      return text;
    },

    clear() {
      this.logs = [];
      this.sessionStart = Date.now();
    }
  };

  // Expose to window for debugging
  window.KimiLogger = KimiLogger;
  KimiLogger.init();

  // Listen for messages from popup
  chrome.runtime?.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getReport') {
      sendResponse(KimiLogger.generateReport(request.options));
    } else if (request.action === 'clearLogs') {
      KimiLogger.clear();
      sendResponse({ cleared: true });
    }
    return true;
  });
})();