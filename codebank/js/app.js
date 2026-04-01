import './index.js';

window.__INDEXCB_ASSETS__ = window.__INDEXCB_ASSETS__ || {};
window.__LOCAL_COUNTER__ = {
  get: () => {
    const a = window.__INDEXCB_ASSETS__ || {};
    const c = a.codesCount;
    return typeof c === 'number' ? c : 0;
  }
};

try { window.__DISABLE_ASSET_PERIODIC_SYNC = true; } catch (_) {}
