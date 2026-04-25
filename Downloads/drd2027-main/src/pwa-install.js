/**
 * CodeBank PWA Install Handler
 * Covers: iOS Safari (Add to Home Screen guide), Android Chrome (native prompt),
 * Biometric re-auth after install, Update prompts
 */

(function() {
  'use strict';

  const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const IS_ANDROID = /android/i.test(navigator.userAgent);
  const IS_STANDALONE = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
    || document.referrer.startsWith('android-app://');
  const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  let deferredPrompt = null;

  // ─── Service Worker Registration (DISABLED) ──────────────────────────────
  // Service workers are disabled to prevent caching issues
  // if ('serviceWorker' in navigator) {
  //   window.addEventListener('load', async () => {
  //     try {
  //       const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  //       console.log('[PWA] Service worker registered:', reg.scope);
  //
  //       // Listen for updates
  //       reg.addEventListener('updatefound', () => {
  //         const newWorker = reg.installing;
  //         newWorker.addEventListener('statechange', () => {
  //           if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
  //             showUpdateBanner(newWorker);
  //           }
  //         });
  //       });
  //
  //       // Handle controller change (after update)
  //       navigator.serviceWorker.addEventListener('controllerchange', () => {
  //         if (!window._swReloading) {
  //           window._swReloading = true;
  //           window.location.reload();
  //         }
  //       });
  //     } catch (err) {
  //       console.warn('[PWA] Service worker registration failed:', err);
  //     }
  //   });
  // }

  // ─── Android/Desktop: Capture beforeinstallprompt ─────────────────────────
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Only show if not already installed and not recently dismissed
    if (!IS_STANDALONE && !localStorage.getItem('pwa-install-dismissed')) {
      setTimeout(() => showAndroidInstallBanner(), 2000);
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    removeInstallBanner();
    localStorage.setItem('pwa-installed', '1');
    showToast('✅ CodeBank installed! Open from your home screen.');
  });

  // ─── iOS: Show guide after 3s if not installed ────────────────────────────
  if (IS_IOS && IS_SAFARI && !IS_STANDALONE) {
    const dismissed = parseInt(localStorage.getItem('ios-install-dismissed') || '0');
    const now = Date.now();
    // Show once every 7 days
    if (now - dismissed > 7 * 24 * 60 * 60 * 1000) {
      setTimeout(() => showIOSInstallGuide(), 3000);
    }
  }

  // ─── iOS Install Guide Modal ───────────────────────────────────────────────
  function showIOSInstallGuide() {
    const existing = document.getElementById('ios-install-guide');
    if (existing) return;

    const modal = document.createElement('div');
    modal.id = 'ios-install-guide';
    modal.innerHTML = `
      <style>
        #ios-install-guide {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 999999;
          background: linear-gradient(135deg, #1a0a3e 0%, #0f0f2e 100%);
          border-top: 2px solid #7c3aed;
          border-radius: 20px 20px 0 0;
          padding: 20px 24px 32px;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
          animation: slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        #ios-install-guide .guide-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
        }
        #ios-install-guide .guide-title {
          display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700;
        }
        #ios-install-guide .app-icon {
          width: 44px; height: 44px; border-radius: 10px;
          background: linear-gradient(135deg,#1a0a3e,#0f1a3e);
          border: 2px solid #00d4ff;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 900; color: #00d4ff;
        }
        #ios-install-guide .close-btn {
          background: rgba(255,255,255,0.1); border: none; border-radius: 50%;
          width: 28px; height: 28px; cursor: pointer; color: #aaa; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
        }
        #ios-install-guide .guide-subtitle {
          font-size: 13px; color: #aaa; margin-bottom: 20px; line-height: 1.5;
        }
        #ios-install-guide .steps {
          display: flex; flex-direction: column; gap: 14px;
        }
        #ios-install-guide .step {
          display: flex; align-items: flex-start; gap: 12px;
        }
        #ios-install-guide .step-num {
          min-width: 28px; height: 28px; border-radius: 50%;
          background: #7c3aed; display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; flex-shrink: 0;
        }
        #ios-install-guide .step-text { font-size: 14px; line-height: 1.5; color: #e0e0e0; }
        #ios-install-guide .step-text strong { color: #00d4ff; }
        #ios-install-guide .step-icon { font-size: 18px; margin-right: 4px; }
        #ios-install-guide .dont-show {
          margin-top: 18px; text-align: center; font-size: 12px; color: #666; cursor: pointer;
        }
        #ios-install-guide .dont-show:hover { color: #aaa; }
      </style>
      <div class="guide-header">
        <div class="guide-title">
          <div class="app-icon">CB</div>
          <span>Install CodeBank</span>
        </div>
        <button class="close-btn" onclick="document.getElementById('ios-install-guide').remove()">✕</button>
      </div>
      <p class="guide-subtitle">Install CodeBank on your iPhone for the full native experience — works offline, no App Store needed!</p>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">Tap the <span class="step-icon">⬆️</span><strong>Share button</strong> at the bottom of Safari</div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">Scroll down and tap <strong>"Add to Home Screen"</strong> <span class="step-icon">➕</span></div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">Tap <strong>"Add"</strong> — CodeBank will appear on your home screen like any app!</div>
        </div>
      </div>
      <div class="dont-show" onclick="
        localStorage.setItem('ios-install-dismissed', Date.now());
        document.getElementById('ios-install-guide').remove();
      ">Don't show again</div>
    `;
    document.body.appendChild(modal);
  }

  // ─── Android Install Banner ────────────────────────────────────────────────
  function showAndroidInstallBanner() {
    const existing = document.getElementById('android-install-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'android-install-banner';
    banner.innerHTML = `
      <style>
        #android-install-banner {
          position: fixed; bottom: 20px; left: 16px; right: 16px; z-index: 999999;
          background: linear-gradient(135deg, #1a0a3e 0%, #0f1a3e 100%);
          border: 1px solid #7c3aed;
          border-radius: 16px;
          padding: 14px 16px;
          display: flex; align-items: center; gap: 12px;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: slideUpBanner 0.35s ease;
        }
        @keyframes slideUpBanner { from { transform: translateY(80px); opacity:0 } to { transform: translateY(0); opacity:1 } }
        #android-install-banner .banner-icon {
          width: 44px; height: 44px; border-radius: 10px;
          background: linear-gradient(135deg,#1a0a3e,#0f1a3e);
          border: 2px solid #00d4ff;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 900; color: #00d4ff; flex-shrink: 0;
        }
        #android-install-banner .banner-text { flex: 1; }
        #android-install-banner .banner-title { font-size: 14px; font-weight: 700; }
        #android-install-banner .banner-sub { font-size: 12px; color: #aaa; margin-top: 2px; }
        #android-install-banner .install-btn {
          background: #7c3aed; border: none; border-radius: 8px;
          color: #fff; font-size: 13px; font-weight: 600;
          padding: 8px 14px; cursor: pointer; white-space: nowrap;
        }
        #android-install-banner .dismiss-btn {
          background: none; border: none; color: #666; font-size: 18px; cursor: pointer; padding: 4px;
        }
      </style>
      <div class="banner-icon">CB</div>
      <div class="banner-text">
        <div class="banner-title">Install CodeBank</div>
        <div class="banner-sub">Add to home screen — free, no store</div>
      </div>
      <button class="install-btn" id="pwa-install-btn">Install</button>
      <button class="dismiss-btn" onclick="
        localStorage.setItem('pwa-install-dismissed', Date.now());
        document.getElementById('android-install-banner').remove();
      ">✕</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      deferredPrompt = null;
      removeInstallBanner();
    });
  }

  // ─── Update Banner ─────────────────────────────────────────────────────────
  function showUpdateBanner(worker) {
    const existing = document.getElementById('pwa-update-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.innerHTML = `
      <style>
        #pwa-update-banner {
          position: fixed; top: 0; left: 0; right: 0; z-index: 999998;
          background: #7c3aed; color: #fff;
          padding: 10px 16px;
          display: flex; align-items: center; justify-content: space-between;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
        }
        #pwa-update-banner button {
          background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);
          border-radius: 6px; color: #fff; padding: 4px 12px; cursor: pointer; font-size: 13px;
        }
      </style>
      <span>🔄 New version of CodeBank is ready</span>
      <button id="pwa-reload-btn">Reload</button>
    `;
    document.body.prepend(banner);

    document.getElementById('pwa-reload-btn').addEventListener('click', () => {
      worker.postMessage({ type: 'SKIP_WAITING' });
      banner.remove();
    });
  }

  function removeInstallBanner() {
    document.getElementById('android-install-banner')?.remove();
    document.getElementById('ios-install-guide')?.remove();
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid #7c3aed;color:#fff;padding:10px 20px;border-radius:10px;font-size:14px;z-index:999999;white-space:nowrap;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  // ─── Expose globally ───────────────────────────────────────────────────────
  window.CodeBankPWA = {
    showIOSInstallGuide,
    showAndroidInstallBanner,
    isStandalone: IS_STANDALONE,
    isIOS: IS_IOS,
    isAndroid: IS_ANDROID,
    triggerInstall: async () => {
      if (IS_IOS) return showIOSInstallGuide();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        return outcome;
      }
    }
  };

})();
