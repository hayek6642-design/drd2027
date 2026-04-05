/**
 * shots-capture.js — Samma3ny Shots! Integration
 *
 * Hooks into the Play & Pause buttons.
 * Each time the user clicks Play or Pause, the app silently requests
 * screen capture (native getDisplayMedia, preferCurrentTab) to capture
 * the current page including any sponsor / campaign ad that may be visible,
 * then saves the screenshot automatically to the Shots! service.
 *
 * Because YouTube and other DRM-protected iframes block canvas-based
 * capture (html2canvas), we use the browser's native getDisplayMedia API
 * which captures the real screen pixels — no blank frames.
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const API_BASE    = window.location.origin;
  const SHOTS_API   = API_BASE + '/api/shots';
  const TOAST_DURATION = 3500; // ms

  // Track if a capture is already in progress to avoid stacking dialogs
  let _capturing = false;

  // ── Utility: generate a short unique id ──────────────────────────────────
  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ── Toast notification ────────────────────────────────────────────────────
  function showToast(msg, type) {
    // type: 'success' | 'error' | 'info'
    const colors = { success: '#22c55e', error: '#ef4444', info: '#f59e0b' };
    const bg     = colors[type] || colors.info;

    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed', 'bottom:80px', 'right:20px', 'z-index:99999',
      `background:${bg}`, 'color:#fff',
      'padding:12px 18px', 'border-radius:10px',
      'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'font-size:13px', 'font-weight:600',
      'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
      'animation:shotsToastIn 0.3s ease',
      'max-width:280px', 'line-height:1.4',
      'pointer-events:none'
    ].join(';');
    el.textContent = msg;

    if (!document.getElementById('shots-toast-style')) {
      const s = document.createElement('style');
      s.id = 'shots-toast-style';
      s.textContent = `
        @keyframes shotsToastIn  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes shotsToastOut { from { opacity:1; } to { opacity:0; transform:translateY(8px); } }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'shotsToastOut 0.3s ease forwards';
      setTimeout(() => el.remove(), 350);
    }, TOAST_DURATION);
  }

  // ── Capture the screen and save to Shots! ────────────────────────────────
  async function captureAndSave() {
    if (_capturing) return; // prevent stacking
    _capturing = true;

    // ── Get current track title from DOM ──────────────────────────────────
    const trackTitleEl = document.querySelector('#video-title, #current-track-title, .video-title, .track-title');
    const trackTitle   = (trackTitleEl && trackTitleEl.textContent.trim()) || document.title || 'YT Player';

    // ── Request display capture ───────────────────────────────────────────
    let stream;
    try {
      // preferCurrentTab silently selects the current browser tab in Chrome 107+
      // without showing the full OS screen-picker dialog
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface:       'browser',
          frameRate:            { ideal: 1, max: 1 },
          width:                { ideal: window.screen.width },
          height:               { ideal: window.screen.height },
        },
        audio:                  false,
        selfBrowserSurface:     'include',
        preferCurrentTab:       true,   // Chrome 107+ — auto-selects current tab
        systemAudio:            'exclude',
        surfaceSwitching:       'exclude',
        monitorTypeSurfaces:    'exclude',
      });
    } catch (err) {
      // User denied or browser unsupported — fail silently
      console.warn('[Shots] Screen capture not available or denied:', err.name, err.message);
      _capturing = false;
      if (err.name !== 'NotAllowedError') {
        showToast('📸 Screen capture unavailable on this browser.', 'error');
      }
      return;
    }

    // ── Draw one video frame to canvas ────────────────────────────────────
    let imageData;
    try {
      const video   = document.createElement('video');
      video.muted   = true;
      video.playsInline = true;
      video.srcObject = stream;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => video.play().then(resolve).catch(reject);
        video.onerror = reject;
        setTimeout(resolve, 2000); // safety timeout
      });

      // Give browser one frame to render
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));

      const canvas  = document.createElement('canvas');
      canvas.width  = video.videoWidth  || window.innerWidth;
      canvas.height = video.videoHeight || window.innerHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

      // Compress to JPEG ~60% quality (typically ~150–300 KB)
      imageData = canvas.toDataURL('image/jpeg', 0.6);

      video.pause();
      video.srcObject = null;
    } catch (drawErr) {
      console.error('[Shots] Frame capture error:', drawErr);
      imageData = null;
    } finally {
      // Always stop all tracks immediately
      try { stream.getTracks().forEach(t => t.stop()); } catch (_) {}
    }

    if (!imageData || imageData.length < 100) {
      showToast('📸 Could not capture frame. Try again.', 'error');
      _capturing = false;
      return;
    }

    // ── POST to /api/shots/save ───────────────────────────────────────────
    const shotUid   = uid();
    const pageUrl   = window.location.href;

    // Get a user identifier hint (username if available in DOM/localStorage)
    let userHint = '';
    try {
      const cached = JSON.parse(localStorage.getItem('__cached_user__') || '{}');
      userHint = cached.username || cached.email || cached.name || '';
    } catch (_) {}

    try {
      const resp = await fetch(SHOTS_API + '/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shotUid,
          imageData,
          trackTitle,
          campaignUrl: pageUrl,
          userHint,
        }),
      });

      if (resp.ok) {
        showToast('📸 Shot saved to Shots!', 'success');
        console.log('[Shots] Saved shot:', shotUid, '| Track:', trackTitle);
      } else {
        showToast('📸 Failed to save shot.', 'error');
        console.warn('[Shots] Server rejected save:', resp.status);
      }
    } catch (netErr) {
      console.error('[Shots] Network error saving shot:', netErr);
      showToast('📸 Network error — shot not saved.', 'error');
    }

    _capturing = false;
  }

  // ── Hook into the main play-pause toggle button (yt-new-clear.html) ──────
  function attachCaptureHooks() {
    const ppBtn = document.getElementById('play-pause-button');

    if (!ppBtn) {
      // Player not ready yet — retry
      setTimeout(attachCaptureHooks, 400);
      return;
    }

    // Fire-and-forget alongside normal playback toggle
    ppBtn.addEventListener('click', () => captureAndSave(), false);

    console.log('[Shots] Capture hook attached to #play-pause-button');
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(attachCaptureHooks, 800));
  } else {
    setTimeout(attachCaptureHooks, 800);
  }

})();
