const API = {
  toggleExtraMode() {
    try { if (window.__YT_GLOBAL_COUNTER__) { window.__YT_GLOBAL_COUNTER__.extraMode = !window.__YT_GLOBAL_COUNTER__.extraMode } } catch (_) {}
  },
  stop() {
    try { if (window.__YT_GLOBAL_COUNTER__) { window.__YT_GLOBAL_COUNTER__.paused = true } } catch (_) {}
  },
  resume() {
    try {
      if (window.__YT_GLOBAL_COUNTER__) {
        const stored = parseInt(localStorage.getItem('watchTime') || '0') || 0;
        window.__YT_GLOBAL_COUNTER__.startTime = Date.now() - stored;
        window.__YT_GLOBAL_COUNTER__.paused = false;
      }
    } catch (_) {}
  }
}

export default API;
