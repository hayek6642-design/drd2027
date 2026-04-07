/**
 * automode.js — Samma3ny Auto-Mode Display Module
 * ─────────────────────────────────────────────────
 * Self-contained. Injected via <script src="automode.js"> in index.html.
 * Does NOT modify player.js or fixes.js in any way.
 *
 * What this file does:
 *  1. Injects an "Auto" toggle switcher button next to the Music Library header.
 *  2. When ON: overlays interactive controls to block user interaction
 *     (prev, next, refresh, playlist item clicks, progress bar seek).
 *  3. Sends a heartbeat to /api/samma3ny/automode/heartbeat every 30s.
 *  4. Shows a floating progress panel (elapsed + ring progress toward 2h).
 *  5. On server reward → plays silver animation and updates UI.
 *  6. On toggle OFF → calls /cancel and resets local state.
 *
 * Blocked elements (pointer-events: none overlay, no DOM changes to them):
 *  #prev-btn, #next-btn, #refresh-btn, #progress-bar, #progress-handle,
 *  .playlist (item clicks blocked via capture listener)
 */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────
  const API = '/api/samma3ny';
  const HEARTBEAT_INTERVAL_MS = 30_000;  // 30 seconds
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const STORAGE_KEY = 'samma3ny_automode_session';

  // ── State ────────────────────────────────────────────────────
  let autoModeOn = false;
  let sessionId = null;
  let heartbeatTimer = null;
  let uiTimer = null;
  let localStartTime = null;   // client-side elapsed display anchor
  let localAccumMs = 0;        // duration_ms from server (last known)
  let blockOverlay = null;
  let progressPanel = null;
  let toggleBtn = null;

  // ── IDs for injected elements ────────────────────────────────
  const TOGGLE_BTN_ID   = 'am-toggle-btn';
  const OVERLAY_ID      = 'am-block-overlay';
  const PANEL_ID        = 'am-progress-panel';
  const SILVER_TOAST_ID = 'am-silver-toast';

  // ── Inject styles ────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('am-styles')) return;
    const style = document.createElement('style');
    style.id = 'am-styles';
    style.textContent = `
      /* ── Auto-Mode Toggle Button ── */
      #${TOGGLE_BTN_ID} {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 11px;
        border-radius: 20px;
        border: 1.5px solid rgba(176, 67, 255, 0.5);
        background: transparent;
        color: rgba(255,255,255,0.75);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s ease;
        letter-spacing: 0.04em;
        margin-left: 8px;
        position: relative;
        overflow: hidden;
      }
      #${TOGGLE_BTN_ID}:hover {
        border-color: #B043FF;
        color: #fff;
        background: rgba(176,67,255,0.1);
      }
      #${TOGGLE_BTN_ID}.am-active {
        background: linear-gradient(135deg, #B043FF, #FF77E9);
        border-color: transparent;
        color: #fff;
        box-shadow: 0 0 14px rgba(176,67,255,0.55);
        animation: am-pulse 2.5s infinite;
      }
      @keyframes am-pulse {
        0%, 100% { box-shadow: 0 0 14px rgba(176,67,255,0.55); }
        50%       { box-shadow: 0 0 22px rgba(255,119,233,0.8); }
      }
      #${TOGGLE_BTN_ID} .am-icon {
        width: 14px; height: 14px;
        transition: transform 0.3s ease;
      }
      #${TOGGLE_BTN_ID}.am-active .am-icon {
        transform: rotate(180deg);
      }

      /* ── Block Overlay (sits on top of controls, no pointer-events to them) ── */
      #${OVERLAY_ID} {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        z-index: 800;
        pointer-events: none;  /* global pass-through by default */
      }
      /* Individual blocker regions */
      .am-blocker {
        position: fixed;
        z-index: 801;
        pointer-events: all;
        cursor: not-allowed;
        background: transparent;
      }

      /* ── Progress Panel ── */
      #${PANEL_ID} {
        position: fixed;
        bottom: 70px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 900;
        background: rgba(18, 6, 30, 0.92);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(176,67,255,0.4);
        border-radius: 18px;
        padding: 16px 24px;
        min-width: 280px;
        max-width: 340px;
        text-align: center;
        color: #fff;
        font-family: inherit;
        box-shadow: 0 8px 32px rgba(176,67,255,0.25);
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
        transition: opacity 0.4s ease, transform 0.4s ease;
        pointer-events: none;
      }
      #${PANEL_ID}.am-visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .am-panel-title {
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.5);
        margin-bottom: 10px;
      }
      .am-ring-wrap {
        position: relative;
        width: 100px;
        height: 100px;
        margin: 0 auto 12px;
      }
      .am-ring-svg {
        width: 100px; height: 100px;
        transform: rotate(-90deg);
      }
      .am-ring-bg {
        fill: none;
        stroke: rgba(255,255,255,0.08);
        stroke-width: 6;
      }
      .am-ring-progress {
        fill: none;
        stroke: url(#am-ring-gradient);
        stroke-width: 6;
        stroke-linecap: round;
        stroke-dasharray: 283;
        stroke-dashoffset: 283;
        transition: stroke-dashoffset 1s ease;
      }
      .am-ring-center {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        line-height: 1.2;
      }
      .am-ring-center small {
        display: block;
        font-size: 9px;
        color: rgba(255,255,255,0.5);
        font-weight: 400;
        margin-top: 1px;
      }
      .am-panel-label {
        font-size: 11px;
        color: rgba(255,255,255,0.55);
        margin-top: 4px;
      }
      .am-panel-label strong {
        color: #FF77E9;
        font-size: 13px;
      }
      .am-panel-warn {
        font-size: 10px;
        color: rgba(255,200,100,0.7);
        margin-top: 8px;
        font-style: italic;
      }

      /* ── Silver Toast ── */
      #${SILVER_TOAST_ID} {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        z-index: 9999;
        background: linear-gradient(135deg, #C0A060, #FFD700, #C0A060);
        border-radius: 24px;
        padding: 28px 40px;
        text-align: center;
        color: #2a1800;
        font-family: inherit;
        box-shadow: 0 0 60px rgba(255,215,0,0.6), 0 20px 60px rgba(0,0,0,0.5);
        opacity: 0;
        transition: opacity 0.4s ease, transform 0.4s ease;
        pointer-events: none;
        display: none;
      }
      #${SILVER_TOAST_ID}.am-show {
        display: block;
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        animation: am-celebrate 0.5s ease;
      }
      @keyframes am-celebrate {
        0%   { transform: translate(-50%, -50%) scale(0.6); }
        60%  { transform: translate(-50%, -50%) scale(1.08); }
        100% { transform: translate(-50%, -50%) scale(1); }
      }
      .am-toast-icon { font-size: 48px; margin-bottom: 8px; display: block; }
      .am-toast-title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
      .am-toast-sub   { font-size: 14px; opacity: 0.8; }

      /* ── Playlist blocker label ── */
      .am-playlist-locked {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Inject toggle button next to "Music Library" ─────────────
  function injectToggleButton() {
    if (document.getElementById(TOGGLE_BTN_ID)) return;
    const header = document.querySelector('.playlist-header-main');
    if (!header) return;

    toggleBtn = document.createElement('button');
    toggleBtn.id = TOGGLE_BTN_ID;
    toggleBtn.title = 'Auto-Mode: sit back and listen — earn 1 Silver Bar after 2h!';
    toggleBtn.innerHTML = `
      <svg class="am-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
      Auto
    `;
    toggleBtn.addEventListener('click', onToggleClick);
    header.appendChild(toggleBtn);
  }

  // ── Inject blocking overlay + per-element blockers ───────────
  function injectBlockOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;

    // Transparent full-screen layer (pointer-events:none globally)
    blockOverlay = document.createElement('div');
    blockOverlay.id = OVERLAY_ID;
    document.body.appendChild(blockOverlay);

    // Cover each interactive element we want to block
    const targets = [
      '#prev-btn',
      '#next-btn',
      '#refresh-btn',
      '#progress-bar',
      '#progress-handle',
    ];
    targets.forEach(sel => coverElement(sel));

    // Block playlist item clicks via capture (no DOM change to playlist)
    document.addEventListener('click', capturePlaylistClick, true);
  }

  function coverElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const div = document.createElement('div');
    div.className = 'am-blocker';
    div.dataset.for = selector;
    div.style.top    = `${rect.top + window.scrollY}px`;
    div.style.left   = `${rect.left + window.scrollX}px`;
    div.style.width  = `${rect.width || 40}px`;
    div.style.height = `${rect.height || 40}px`;
    blockOverlay.appendChild(div);
  }

  // Capture-phase click handler — swallow playlist item clicks
  function capturePlaylistClick(e) {
    if (!autoModeOn) return;
    const item = e.target.closest('.playlist-item, .song-item, [data-track-index]');
    if (item) {
      e.stopImmediatePropagation();
      e.preventDefault();
      showLockedHint();
    }
  }

  function showLockedHint() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.classList.add('am-visible');
    // Flash a brief "locked" CSS effect
    panel.style.borderColor = 'rgba(255,150,50,0.8)';
    setTimeout(() => { panel.style.borderColor = ''; }, 600);
  }

  function removeBlockOverlay() {
    if (blockOverlay) { blockOverlay.remove(); blockOverlay = null; }
    document.removeEventListener('click', capturePlaylistClick, true);
  }

  // ── Progress Panel ───────────────────────────────────────────
  function injectProgressPanel() {
    if (document.getElementById(PANEL_ID)) return;
    progressPanel = document.createElement('div');
    progressPanel.id = PANEL_ID;
    progressPanel.innerHTML = `
      <div class="am-panel-title">🎵 Auto-Mode Active</div>
      <div class="am-ring-wrap">
        <svg class="am-ring-svg" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="am-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   style="stop-color:#B043FF"/>
              <stop offset="100%" style="stop-color:#FF77E9"/>
            </linearGradient>
          </defs>
          <circle class="am-ring-bg" cx="50" cy="50" r="45"/>
          <circle class="am-ring-progress" id="am-ring-arc" cx="50" cy="50" r="45"/>
        </svg>
        <div class="am-ring-center">
          <span id="am-pct-text">0%</span>
          <small id="am-elapsed-text">0:00:00</small>
        </div>
      </div>
      <div class="am-panel-label">Remaining: <strong id="am-remaining-text">2:00:00</strong></div>
      <div class="am-panel-warn">Controls locked — keep listening!</div>
    `;
    document.body.appendChild(progressPanel);
    setTimeout(() => progressPanel.classList.add('am-visible'), 50);
  }

  function removeProgressPanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) { p.classList.remove('am-visible'); setTimeout(() => p.remove(), 400); }
    progressPanel = null;
  }

  function updateProgressPanel(durationMs) {
    const arc = document.getElementById('am-ring-arc');
    const pctText = document.getElementById('am-pct-text');
    const elapsedText = document.getElementById('am-elapsed-text');
    const remainText = document.getElementById('am-remaining-text');
    if (!arc) return;

    const pct = Math.min(1, durationMs / TWO_HOURS_MS);
    const circumference = 2 * Math.PI * 45; // ≈ 282.7
    arc.style.strokeDashoffset = circumference * (1 - pct);

    if (pctText) pctText.textContent = `${Math.floor(pct * 100)}%`;
    if (elapsedText) elapsedText.textContent = msToHMS(durationMs);
    if (remainText) remainText.textContent = msToHMS(Math.max(0, TWO_HOURS_MS - durationMs));
  }

  function msToHMS(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // ── Silver reward toast ───────────────────────────────────────
  function showSilverToast() {
    let toast = document.getElementById(SILVER_TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = SILVER_TOAST_ID;
      toast.innerHTML = `
        <span class="am-toast-icon">🥈</span>
        <div class="am-toast-title">1 Silver Bar Earned!</div>
        <div class="am-toast-sub">2 hours of listening — deposited to your account</div>
      `;
      document.body.appendChild(toast);
    }
    toast.classList.add('am-show');
    // Also update panel to 100%
    updateProgressPanel(TWO_HOURS_MS);
    // Auto-dismiss after 6s then turn off auto mode
    setTimeout(() => {
      toast.classList.remove('am-show');
      disableAutoMode(false); // turn off without cancelling (already rewarded)
    }, 6000);
  }

  // ── API calls ────────────────────────────────────────────────
  async function apiCall(path, method = 'GET', body = null) {
    // 🔧 FIX: Use session token from iframe-auth-client.js (window.Auth)
    // instead of relying solely on cookies, which may be blocked in iframes
    // due to third-party cookie restrictions.
    const sessionToken = (window.Auth && typeof window.Auth.getToken === 'function')
      ? window.Auth.getToken()
      : (localStorage.getItem('session_token') || '');
    const csrfToken =
      (document.cookie.match(/XSRF-TOKEN=([^;]*)/) || [])[1] ||
      (document.cookie.match(/csrf_token=([^;]*)/) || [])[1] || '';
    const headers = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    if (csrfToken) {
      headers['X-CSRF-TOKEN'] = csrfToken;
    }
    const opts = {
      method,
      credentials: 'include',  // keep cookies as fallback
      headers
    };
    if (body) opts.body = JSON.stringify(body);
    try {
      const r = await fetch(`${API}${path}`, opts);
      return await r.json();
    } catch (e) {
      console.warn('[AutoMode] API error:', e.message);
      return null;
    }
  }

  async function startSession() {
    const data = await apiCall('/automode/start', 'POST');
    if (data?.sessionId) {
      sessionId = data.sessionId;
      localAccumMs = 0;
      localStartTime = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, startedAt: localStartTime }));
      return true;
    }
    return false;
  }

  async function sendHeartbeat() {
    if (!sessionId) return;
    const data = await apiCall('/automode/heartbeat', 'POST', { sessionId });
    if (!data) return;

    if (data.status === 'rewarded') {
      localAccumMs = TWO_HOURS_MS;
      stopHeartbeat();
      stopUITimer();
      showSilverToast();
      localStorage.removeItem(STORAGE_KEY);
    } else if (data.status === 'alive') {
      localAccumMs = data.duration_ms || localAccumMs;
      localStartTime = Date.now(); // reset local clock anchor to now
      updateProgressPanel(localAccumMs);
    } else if (data.status === 'already_rewarded') {
      stopHeartbeat();
      showSilverToast();
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function cancelSession() {
    if (!sessionId) return;
    await apiCall('/automode/cancel', 'POST', { sessionId });
    sessionId = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  // ── Heartbeat timer ───────────────────────────────────────────
  function startHeartbeat() {
    stopHeartbeat();
    sendHeartbeat(); // immediate first beat
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  }

  // ── UI timer (update ring every second from local clock) ─────
  function startUITimer() {
    stopUITimer();
    uiTimer = setInterval(() => {
      if (!autoModeOn) return;
      // Interpolate between server beats using local clock
      const localElapsed = Date.now() - (localStartTime || Date.now());
      const displayMs = Math.min(TWO_HOURS_MS, localAccumMs + localElapsed);
      updateProgressPanel(displayMs);
    }, 1000);
  }

  function stopUITimer() {
    if (uiTimer) { clearInterval(uiTimer); uiTimer = null; }
  }

  // ── Enable / Disable ─────────────────────────────────────────
  async function enableAutoMode() {
    // 🔧 FIX: Wait for iframe auth to be ready before starting session
    if (window.Auth && typeof window.Auth.waitForAuth === 'function') {
      const authenticated = await window.Auth.waitForAuth(5000);
      if (!authenticated) {
        console.warn('[AutoMode] Auth not ready after 5s, trying anyway...');
      }
    }
    const ok = await startSession();
    if (!ok) {
      alert('Could not start auto-mode. Please make sure you are logged in.');
      return;
    }
    autoModeOn = true;
    toggleBtn?.classList.add('am-active');
    injectBlockOverlay();
    injectProgressPanel();
    startHeartbeat();
    startUITimer();
  }

  async function disableAutoMode(doCancel = true) {
    autoModeOn = false;
    toggleBtn?.classList.remove('am-active');
    if (doCancel) await cancelSession();
    stopHeartbeat();
    stopUITimer();
    removeBlockOverlay();
    removeProgressPanel();
  }

  // ── Toggle click handler ─────────────────────────────────────
  async function onToggleClick() {
    if (autoModeOn) {
      // Confirm before cancelling (timer will reset)
      const yes = confirm(
        '⚠️ Turn off Auto-Mode?\n\nYour progress will reset and you will NOT earn the Silver Bar unless you listened for 2 full hours.'
      );
      if (!yes) return;
      await disableAutoMode(true);
    } else {
      await enableAutoMode();
    }
  }

  // ── Restore session on page reload ───────────────────────────
  async function tryRestoreSession() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved?.sessionId) return;

      // Check with server if session still active
      const data = await apiCall('/automode/status', 'GET');
      if (data?.status === 'active' && data.sessionId === saved.sessionId) {
        sessionId = saved.sessionId;
        localAccumMs = data.duration_ms || 0;
        localStartTime = Date.now();
        autoModeOn = true;
        toggleBtn?.classList.add('am-active');
        injectBlockOverlay();
        injectProgressPanel();
        updateProgressPanel(localAccumMs);
        startHeartbeat();
        startUITimer();
      } else {
        // Session gone/rewarded on server — clean up local storage
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // ── Init (waits for DOM + player.js to finish) ───────────────
  function init() {
    injectStyles();
    injectToggleButton();
    tryRestoreSession();
  }

  // Run after DOMContentLoaded (player.js also fires on DOMContentLoaded;
  // we use setTimeout to ensure we run AFTER player.js sets up its elements)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }

})();
