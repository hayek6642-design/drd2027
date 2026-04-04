/**
 * Assets Service Bridge v3
 * ========================
 * Drop this script into ANY CodeBank service loader page.
 * It will:
 *   1. Inject a floating asset-balance bar at the top of the page
 *   2. Sync assets from the parent frame (indexCB.html) via postMessage
 *   3. Forward spend/earn requests from inner service iframes up to the parent
 *   4. Relay asset updates from parent down to inner service iframes
 *   5. Expose window.useAsset(type, amount, serviceId, reason) for service code
 */
(function () {
  if (window.__ACC_BRIDGE_V3__) return;
  window.__ACC_BRIDGE_V3__ = true;

  // ─── Local state ─────────────────────────────────────────────────────────
  let _assets = {
    codes: [], silver: [], gold: [],
    codes_count: 0, silver_count: 0, gold_count: 0,
    likes: 0, superlikes: 0, games: 0
  };

  // ─── Normalise a raw asset snapshot into display-friendly numbers ─────────
  function _normalise(raw) {
    if (!raw) return;
    const count = (v) => Array.isArray(v) ? v.length : (parseInt(v) || 0);
    _assets.codes        = Array.isArray(raw.codes)  ? raw.codes  : [];
    _assets.silver       = Array.isArray(raw.silver) ? raw.silver : [];
    _assets.gold         = Array.isArray(raw.gold)   ? raw.gold   : [];
    _assets.codes_count  = raw.codes_count  !== undefined ? parseInt(raw.codes_count)  : count(raw.codes);
    _assets.silver_count = raw.silver_count !== undefined ? parseInt(raw.silver_count) : count(raw.silver);
    _assets.gold_count   = raw.gold_count   !== undefined ? parseInt(raw.gold_count)   : count(raw.gold);
    _assets.likes        = parseInt(raw.likes)      || 0;
    _assets.superlikes   = parseInt(raw.superlikes) || 0;
    _assets.games        = parseInt(raw.games)      || 0;
  }

  // ─── Create / refresh the balance bar ────────────────────────────────────
  function _ensureBar() {
    if (document.getElementById('acc-bar-v3')) return;

    const style = document.createElement('style');
    style.id = 'acc-bar-v3-styles';
    style.textContent = `
      #acc-bar-v3 {
        position: fixed !important;
        top: 0 !important; left: 0 !important; right: 0 !important;
        z-index: 2147483640 !important;
        background: linear-gradient(90deg,rgba(10,14,27,.97),rgba(20,30,50,.97));
        border-bottom: 1px solid rgba(255,255,255,.1);
        display: flex !important;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 5px 14px;
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        font-size: 12px;
        color: #e2e8f0;
        box-shadow: 0 2px 8px rgba(0,0,0,.4);
        height: 34px;
        box-sizing: border-box;
      }
      .acc-bar-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 700;
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 20px;
        padding: 2px 10px;
        transition: background .25s, transform .15s;
        white-space: nowrap;
        cursor: default;
      }
      .acc-bar-chip.acc-flash {
        background: rgba(0,200,255,.22) !important;
        border-color: rgba(0,200,255,.45) !important;
        transform: scale(1.08);
      }
      .acc-bar-divider {
        color: rgba(255,255,255,.2);
        font-size: 14px;
        user-select: none;
      }
    `;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.id = 'acc-bar-v3';
    bar.innerHTML = `
      <div class="acc-bar-chip" id="acc-chip-codes"   title="Codes">🔐 <span>0</span></div>
      <div class="acc-bar-chip" id="acc-chip-silver"  title="Silver">🥈 <span>0</span></div>
      <div class="acc-bar-chip" id="acc-chip-gold"    title="Gold">🥇 <span>0</span></div>
      <div class="acc-bar-divider">|</div>
      <div class="acc-bar-chip" id="acc-chip-likes"   title="Likes">❤️ <span>0</span></div>
      <div class="acc-bar-chip" id="acc-chip-super"   title="SuperLikes">💙 <span>0</span></div>
      <div class="acc-bar-chip" id="acc-chip-games"   title="Games">🎮 <span>0</span></div>
    `;

    if (document.body) {
      document.body.insertBefore(bar, document.body.firstChild);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.insertBefore(bar, document.body.firstChild);
      });
    }

    const push = document.createElement('style');
    push.id = 'acc-bar-v3-push';
    push.textContent = 'body { padding-top: max(34px, calc(34px + env(safe-area-inset-top))) !important; }';
    document.head.appendChild(push);
  }

  function _flash(chipId) {
    const el = document.getElementById(chipId);
    if (!el) return;
    el.classList.add('acc-flash');
    setTimeout(() => el.classList.remove('acc-flash'), 400);
  }

  function _setChip(chipId, newVal) {
    const chip = document.getElementById(chipId);
    if (!chip) return;
    const span = chip.querySelector('span');
    if (!span) return;
    const old = parseInt(span.textContent.replace(/,/g, '')) || 0;
    const n   = parseInt(newVal) || 0;
    span.textContent = n.toLocaleString();
    if (old !== n) _flash(chipId);
  }

  function _refreshBar() {
    _ensureBar();
    _setChip('acc-chip-codes',  _assets.codes_count);
    _setChip('acc-chip-silver', _assets.silver_count);
    _setChip('acc-chip-gold',   _assets.gold_count);
    _setChip('acc-chip-likes',  _assets.likes);
    _setChip('acc-chip-super',  _assets.superlikes);
    _setChip('acc-chip-games',  _assets.games);
  }

  window.useAsset = function (type, amount, serviceId, reason) {
    return new Promise(function (resolve) {
      const reqId = 'acc-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const handler = function (e) {
        if (e.data && e.data.type === 'assets:spend:result' && e.data.reqId === reqId) {
          window.removeEventListener('message', handler);
          if (e.data.success && e.data.assets) { _normalise(e.data.assets); _refreshBar(); }
          resolve(e.data);
        }
      };
      window.addEventListener('message', handler);
      const target = (window.parent && window.parent !== window) ? window.parent : window;
      target.postMessage({ type: 'assets:spend', reqId, assetType: type, amount, serviceId: serviceId || window.location.pathname, reason: reason || 'user-action' }, '*');
      setTimeout(function () { window.removeEventListener('message', handler); resolve({ success: false, error: 'timeout' }); }, 6000);
    });
  };

  window.earnAsset = function (type, amount, serviceId, reason) {
    return new Promise(function (resolve) {
      const reqId = 'acc-earn-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const handler = function (e) {
        if (e.data && e.data.type === 'assets:earn:result' && e.data.reqId === reqId) {
          window.removeEventListener('message', handler);
          if (e.data.success && e.data.assets) { _normalise(e.data.assets); _refreshBar(); }
          resolve(e.data);
        }
      };
      window.addEventListener('message', handler);
      const target = (window.parent && window.parent !== window) ? window.parent : window;
      target.postMessage({ type: 'assets:earn', reqId, assetType: type, amount, serviceId: serviceId || window.location.pathname, reason: reason || 'reward' }, '*');
      setTimeout(function () { window.removeEventListener('message', handler); resolve({ success: false, error: 'timeout' }); }, 6000);
    });
  };

  window.getAssets = function () { return Object.assign({}, _assets); };

  window.addEventListener('message', function (e) {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'assets:sync' || d.type === 'assets:spend:result' || d.type === 'assets:earn:result') {
      const incoming = d.assets || (d.payload && d.payload.assets);
      if (incoming) { _normalise(incoming); _refreshBar(); }
      _relayToInner(d);
    }
    if (d.type === 'auth:ready') {
      const incoming = (d.payload && d.payload.assets) || d.assets;
      if (incoming) { _normalise(incoming); _refreshBar(); }
    }
    if ((d.type === 'assets:spend' || d.type === 'assets:earn') && e.source !== window.parent) {
      if (window.parent && window.parent !== window) { window.parent.postMessage(d, '*'); }
    }
    if (d.type === 'assets:request') {
      _relayToInner({ type: 'assets:sync', assets: Object.assign({}, _assets) });
      if (window.parent && window.parent !== window) { window.parent.postMessage({ type: 'assets:request' }, '*'); }
    }
  });

  function _relayToInner(msg) {
    const frames = document.querySelectorAll('iframe');
    frames.forEach(function (f) { try { if (f.contentWindow) f.contentWindow.postMessage(msg, '*'); } catch (_) {} });
  }

  function _bootstrapFromAssetBus() {
    if (window.AssetBus && typeof window.AssetBus.snapshot === 'function') {
      _normalise(window.AssetBus.snapshot());
      _refreshBar();
      window.AssetBus.subscribe('assets:updated', function (snap) { _normalise(snap); _refreshBar(); });
    }
  }

  function _init() {
    _ensureBar();
    _bootstrapFromAssetBus();
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'assets:request', source: window.location.pathname }, '*');
    }
    window.addEventListener('assetbus:ready', function (ev) {
      if (ev.detail && ev.detail.snapshot) { _normalise(ev.detail.snapshot); _refreshBar(); }
      _bootstrapFromAssetBus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
