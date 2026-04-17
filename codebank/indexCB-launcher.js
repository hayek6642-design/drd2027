/**
 * INDEXCB-LAUNCHER.js — CodeBank Main Launcher
 *
 * Manages the service registry, iframe loading, and auth broadcasting.
 * Include AFTER auth-global.js and unified-storage.js in indexCB.html.
 *
 * USAGE in indexCB.html:
 *   <script src="/shared/auth-global.js"></script>
 *   <script src="/shared/unified-storage.js"></script>
 *   <script src="/codebank/indexCB-launcher.js"></script>
 */

(function () {
  'use strict';

  // ── Service Registry ────────────────────────────────────
  var services = [
    { id: 'yt-clear',       name: 'YT-Clear',       icon: '📺', url: '/yt-new-clear.html',  desc: 'Watch & Earn', isExternal: true },
    { id: 'safecode',       name: 'SafeCode',        icon: '🔐', url: '/safecode.html',      desc: 'Asset Vault' },
    { id: 'cottery',        name: 'Cottery',         icon: '🎯', url: '/codebank/cottery.html',  desc: 'Prediction Game' },
    { id: 'e7ki',           name: 'E7ki',             icon: '💬', url: '/codebank/e7ki.html',   desc: 'Chat' },
    { id: 'samma3ny',       name: 'Samma3ny',        icon: '🤖', url: '/codebank/samma3ny.html', desc: 'AI Assistant' },
    { id: 'farragna',       name: 'Farragna',        icon: '❤️', url: '/farragna.html',      desc: 'Social Likes' },
    { id: 'nostalgia',      name: 'Nostalgia',       icon: '💿', url: '/codebank/nostalgia.html', desc: 'Retro Memories' },
    { id: 'estshara',       name: 'Estshara',        icon: '💼', url: '/codebank/estshara/',  desc: 'Consultations', isFolder: true },
    { id: 'pebalaash',      name: 'Pebalaash',       icon: '🏪', url: '/pebalaash.html',     desc: 'Barter & Trade' },
    { id: 'corsa',          name: 'CoRsA',            icon: '🏎️', url: '/corsa.html',         desc: 'Racing Game' },
    { id: 'eb3at',          name: 'Eb3at',            icon: '📤', url: '/eb3at.html',         desc: 'File Transfer' },
    { id: 'battalooda',     name: 'Battalooda',      icon: '🎵', url: '/battalooda.html',    desc: 'Music Studio' },
    { id: 'games-centre',   name: 'Games Centre',    icon: '🎮', url: '/games-centre.html',  desc: 'Mini Games' },
    { id: 'yahood',         name: 'Yahood!',          icon: '📰', url: '/yahood.html',        desc: 'News & Content' }
  ];

  var activeService = null;
  var $serviceGrid, $iframeContainer, $activeIframe, $backBtn, $balanceDisplay;
  var $userName, $headerTitle;

  // ── Initialize ──────────────────────────────────────────
  function init() {
    // Auth should already be set by auth-global.js
    if (!window.AUTH_GLOBAL) {
      console.log('[Launcher] No auth - staying as guest');
      // Stay on page as guest instead of redirect
      return;
    }

    $serviceGrid = document.getElementById('service-grid');
    $iframeContainer = document.getElementById('iframe-container');
    $activeIframe = document.getElementById('active-iframe');
    $backBtn = document.getElementById('back-btn');
    $balanceDisplay = document.getElementById('global-balance');
    $userName = document.getElementById('user-name');
    $headerTitle = document.getElementById('header-title');

    // Set user info
    if ($userName) $userName.textContent = window.AUTH_GLOBAL.email?.split('@')[0] || 'User';

    // Render service grid
    renderServiceGrid();

    // Load balance
    updateBalance();

    // Subscribe to balance changes
    if (window.UnifiedStorage) {
      UnifiedStorage.ready.then(function () {
        UnifiedStorage.subscribe('codes:new', updateBalance);
        UnifiedStorage.subscribe('assets:updated', function (data) {
          if (data && typeof data.codes === 'number') {
            if ($balanceDisplay) $balanceDisplay.textContent = '🔐 ' + data.codes + ' codes';
          }
        });
        UnifiedStorage.subscribe('storage:refreshed', function (data) {
          if (data.type === 'codes') updateBalance();
        });
      });
    }

    // Back button
    if ($backBtn) {
      $backBtn.addEventListener('click', closeSevice);
    }

    // Handle auth requests from iframes (auth-global.js already does this,
    // but we also forward storage broadcasts)
    window.addEventListener('message', function (e) {
      if (!e.data || typeof e.data.type !== 'string') return;

      // Forward storage broadcasts from one iframe to all others
      if (e.data.type === 'storage:broadcast') {
        var iframes = document.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
          if (iframes[i].contentWindow !== e.source) {
            try {
              iframes[i].contentWindow.postMessage(e.data, '*');
            } catch (err) { /* cross-origin */ }
          }
        }
      }

      // Handle bankode new code notifications
      if (e.data.type === 'bankode:new-code') {
        updateBalance();
        showNotification('🔐 New code earned!', 'success');
      }
    });

    // Check URL hash for direct service launch
    var hash = window.location.hash.replace('#', '');
    if (hash) {
      var target = services.find(function (s) { return s.id === hash; });
      if (target) openService(target.id);
    }

    hideLoading();
  }

  // ── Service Grid ────────────────────────────────────────
  function renderServiceGrid() {
    if (!$serviceGrid) return;

    $serviceGrid.innerHTML = services.map(function (svc) {
      return '<div class="service-card" data-service="' + svc.id + '" onclick="CBLauncher.open(\'' + svc.id + '\')">' +
        '<div class="service-icon">' + svc.icon + '</div>' +
        '<div class="service-name">' + svc.name + '</div>' +
        '<div class="service-desc">' + svc.desc + '</div>' +
      '</div>';
    }).join('');
  }

  // ── Open/Close Service ──────────────────────────────────
  function openService(serviceId) {
    var svc = services.find(function (s) { return s.id === serviceId; });
    if (!svc) return;

    if (svc.isExternal) {
      // YT-Clear opens in new tab (it's a parent window, not iframe)
      window.open(svc.url, '_blank');
      return;
    }

    activeService = svc;
    window.location.hash = serviceId;

    // Show iframe container, hide grid
    if ($serviceGrid) $serviceGrid.style.display = 'none';
    if ($iframeContainer) $iframeContainer.style.display = 'flex';
    if ($backBtn) $backBtn.style.display = 'inline-flex';
    if ($headerTitle) $headerTitle.textContent = svc.icon + ' ' + svc.name;

    // Load iframe
    if ($activeIframe) {
      $activeIframe.src = svc.url;

      // When iframe loads, send auth
      $activeIframe.onload = function () {
        try {
          $activeIframe.contentWindow.postMessage({
            type: 'auth:response',
            auth: window.AUTH_GLOBAL,
            token: window.AuthAPI.getToken()
          }, '*');
        } catch (e) { /* cross-origin */ }
      };
    }
  }

  function closeSevice() {
    activeService = null;
    window.location.hash = '';

    if ($serviceGrid) $serviceGrid.style.display = 'grid';
    if ($iframeContainer) $iframeContainer.style.display = 'none';
    if ($backBtn) $backBtn.style.display = 'none';
    if ($headerTitle) $headerTitle.textContent = '🏦 CodeBank';

    // Clear iframe
    if ($activeIframe) $activeIframe.src = 'about:blank';
  }

  // ── Balance ─────────────────────────────────────────────
  function updateBalance() {
    if (!window.UnifiedStorage) return;
    UnifiedStorage.getAll('codes').then(function (codes) {
      var active = (codes || []).filter(function (c) { return c.status === 'active'; });
      var total = active.reduce(function (s, c) { return s + (c.value || 1); }, 0);
      if ($balanceDisplay) $balanceDisplay.textContent = '🔐 ' + total + ' codes';
    });
  }

  // ── Logout ──────────────────────────────────────────────
  function logout() {
    if (confirm('Log out of CodeBank?')) {
      window.AuthAPI.logout();
    }
  }

  // ── Helpers ─────────────────────────────────────────────
  function showNotification(text, type) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:16px;right:16px;padding:12px 20px;border-radius:10px;z-index:99999;font-size:0.85rem;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:all 0.3s;' +
      (type === 'error' ? 'background:#dc2626;color:#fff;' : 'background:#22c55e;color:#fff;');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, 3000);
  }

  function hideLoading() {
    var el = document.getElementById('loadingOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function () { el.style.display = 'none'; }, 300); }
  }

  // ── Public API ──────────────────────────────────────────
  window.CBLauncher = {
    open: openService,
    close: closeSevice,
    logout: logout,
    getServices: function () { return services; },
    getActive: function () { return activeService; }
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
