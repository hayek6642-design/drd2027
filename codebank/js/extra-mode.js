export class ExtraModeManager {
  constructor({ appContainer, floatingApp, premium, unexpectedGraceMs = 120000 }) {
    this.appContainer = appContainer;
    this.floatingApp = floatingApp;
    this.premium = premium;
    this.unexpectedGraceMs = unexpectedGraceMs;
    this._graceTimeout = null;
    this._tick = null;
    this._status = 'idle';
    this._startedAt = 0;
    this._durationMs = 0;
    this._progress = 0;
    this._claimWindowMs = 60000;
    this._claimDeadline = 0;
    this._rewardType = 'silver';
    this._container = null;
    this._claimBtn = null;
    this._progressBar = null;
    this._progressText = null;
    this._watchdogId = null;
    this._lastBeat = 0;
    this._initVisibility();
  }

  _initVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (!this.premium || !this.premium.isPremium()) {
          this._abort('hidden');
        } else if (!this.floatingApp || !this.floatingApp.isFloating) {
          this._startGrace();
        }
      } else {
        this._clearGrace();
      }
    });
  }

  _startGrace() {
    this._clearGrace();
    this._graceTimeout = setTimeout(() => {
      if (!this.floatingApp || !this.floatingApp.isFloating) {
        this._abort('grace_timeout');
      }
    }, this.unexpectedGraceMs);
  }

  _clearGrace() {
    if (this._graceTimeout) {
      clearTimeout(this._graceTimeout);
      this._graceTimeout = null;
    }
  }

  _clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  _registerWatchdog() {
    const id = 'extra-mode';
    if (!window.watchdog) window.watchdog = { _regs: new Map(), register: function(name, cfg){ this._regs.set(name, { cfg, last: Date.now() }); return name; }, beat: function(name){ const r=this._regs.get(name); if(r){ r.last = Date.now(); } }, check: function(name){ const r=this._regs.get(name); if(!r) return false; const online = typeof navigator!=='undefined' ? navigator.onLine : true; if (r.cfg && r.cfg.onlineRequired && !online) return false; const okBeat = Date.now() - r.last < 5000; if (r.cfg && r.cfg.heartbeat && !okBeat) return false; return true; }, unregister: function(name){ this._regs.delete(name); } };
    this._watchdogId = window.watchdog.register(id, { onlineRequired: true, heartbeat: true });
  }

  _unregisterWatchdog() {
    if (this._watchdogId && window.watchdog) window.watchdog.unregister(this._watchdogId);
    this._watchdogId = null;
  }

  _setupDom() {
    if (this._container) {
      this._container.remove();
      this._container = null;
    }
    const c = document.createElement('div');
    c.id = 'extra-mode-container';
    c.style.position = 'relative';
    c.style.padding = '12px';
    c.style.border = '1px solid #1f2533';
    c.style.background = '#0f1420';
    c.style.borderRadius = '8px';
    const barWrap = document.createElement('div');
    barWrap.style.display = 'flex';
    barWrap.style.alignItems = 'center';
    barWrap.style.gap = '8px';
    const bar = document.createElement('div');
    bar.style.flex = '1';
    bar.style.height = '8px';
    bar.style.background = '#1f2533';
    bar.style.borderRadius = '8px';
    const fill = document.createElement('div');
    fill.style.height = '100%';
    fill.style.width = '0%';
    fill.style.background = '#fbbf24';
    fill.style.borderRadius = '8px';
    bar.appendChild(fill);
    const txt = document.createElement('span');
    txt.id = 'extra-mode-progress-text';
    txt.textContent = '0%';
    const claim = document.createElement('button');
    claim.id = 'extra-mode-claim';
    claim.textContent = 'Claim';
    claim.style.display = 'none';
    claim.className = 'btn btn-primary';
    barWrap.appendChild(bar);
    barWrap.appendChild(txt);
    c.appendChild(barWrap);
    c.appendChild(claim);
    const target = this.appContainer || document.body;
    target.appendChild(c);
    this._container = c;
    this._progressBar = fill;
    this._progressText = txt;
    this._claimBtn = claim;
    this._claimBtn.onclick = () => this._handleClaim();
  }

  startRun({ durationMs, rewardType }) {
    // Pause normal code generation
    if (window.Bankode && typeof window.Bankode.pauseNormalGeneration === 'function') {
      window.Bankode.pauseNormalGeneration();
    }

    this._reset();
    this._status = 'running';
    this._rewardType = rewardType || 'silver';
    this._durationMs = durationMs;
    this._startedAt = Date.now();
    this._lastBeat = Date.now();
    this._setupDom();
    this._registerWatchdog();
    this._tick = setInterval(() => {
      this._lastBeat = Date.now();
      const now = Date.now();
      const p = this._clamp(((now - this._startedAt) / this._durationMs) * 100, 0, 100);
      this._progress = p;
      if (this._progressBar) this._progressBar.style.width = `${p}%`;
      if (this._progressText) this._progressText.textContent = `${Math.floor(p)}%`;
      const ok = window.watchdog ? window.watchdog.check(this._watchdogId) : true;
      if (!ok) { this._abort('watchdog'); return; }
      if (p === 100 && this._status === 'running') {
        this._status = 'claimable';
        this._claimDeadline = now + this._claimWindowMs;
        if (this._claimBtn) this._claimBtn.style.display = 'inline-block';
        if (!navigator.onLine) { this._expire('offline'); }
      }
      if (this._status === 'claimable' && now > this._claimDeadline) {
        this._expire('claim_timeout');
      }
    }, 500);
    return true;
  }

  _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    const prefix = this._rewardType === 'gold' ? 'GOLD-' : 'SLVR-';
    let code = `${prefix}${s}`;
    if (!navigator.onLine) code = `${code}-PP`;
    return code;
  }

  _handleClaim() {
    if (this._status !== 'claimable') return false;
    if (!navigator.onLine) { this._expire('offline_claim'); return false; }
    const code = this._generateCode();
    const item = { code, type: this._rewardType, origin: 'extra', status: 'claimed' };
    try {
      // FIX: Guard against AssetBus not being loaded
      if (window.AssetBus && typeof window.AssetBus.addAsset === 'function') {
        window.AssetBus.addAsset(this._rewardType, code);
      } else {
        console.warn('[ExtraModeManager] AssetBus not available, skipping addAsset');
      }
      
      // Also store in local storage for backward compatibility
      const raw = window.safeStorage ? window.safeStorage.get('safe_extras') : localStorage.getItem('safe_extras');
      const list = raw ? JSON.parse(raw) : [];
      list.push(item);
      const payload = JSON.stringify(list);
      if (window.safeStorage) window.safeStorage.set('safe_extras', payload); else localStorage.setItem('safe_extras', payload);
    } catch(_){}
    this._status = 'claimed';
    if (this._claimBtn) this._claimBtn.style.display = 'none';
    this._cleanup();
    return true;
  }

  _expire(reason) {
    if (this._status === 'claimed') return;
    this._status = 'expired';
    this._cleanup();
    return true;
  }

  _abort(reason) {
    if (this._status === 'claimed') return;
    this._status = 'expired';
    this._cleanup();
    return true;
  }

  _cleanup() {
    if (this._tick) { clearInterval(this._tick); this._tick = null; }
    this._unregisterWatchdog();
    // Resume normal code generation
    if (window.Bankode && typeof window.Bankode.resumeNormalGeneration === 'function') {
      window.Bankode.resumeNormalGeneration();
    }
  }

  _reset() {
    this._cleanup();
    this._status = 'idle';
    this._progress = 0;
    this._startedAt = 0;
    this._durationMs = 0;
    this._claimDeadline = 0;
    this._rewardType = 'silver';
    if (this._container) { this._container.remove(); this._container = null; }
    this._claimBtn = null;
    this._progressBar = null;
    this._progressText = null;
  }

  getStatus() { return this._status; }
  getProgress() { return this._progress; }
}

try { window.ExtraModeManager = ExtraModeManager } catch(_){}
