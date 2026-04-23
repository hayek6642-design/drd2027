/**
 * SAFECODE-CORE.js — Asset Vault Manager
 *
 * Manages codes, silver, gold tabs with real-time updates via UnifiedStorage.
 * Uses ServiceBase for auth + storage bootstrap.
 */

(function () {
  'use strict';

  var currentTab = 'codes';
  var assets = { codes: [], silver: [], gold: [] };
  var selectedAssets = new Set();

  // ── DOM refs ────────────────────────────────────────────
  var $tabs, $container, $balanceDisplay, $totalCount, $searchInput, $bulkActions;

  function bindDOM() {
    $container = document.getElementById('asset-container');
    $balanceDisplay = document.getElementById('balance-display');
    $totalCount = document.getElementById('total-count');
    $searchInput = document.getElementById('asset-search');
    $bulkActions = document.getElementById('bulk-actions');

    // Tab clicks
    document.querySelectorAll('[data-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchTab(this.getAttribute('data-tab'));
      });
    });

    if ($searchInput) {
      $searchInput.addEventListener('input', function () {
        renderCurrentTab(this.value);
      });
    }
  }

  // ── Initialize ──────────────────────────────────────────
  ServiceBase.init({
    name: 'SafeCode',

    onReady: function (ctx) {
      bindDOM();
      loadAllAssets();

      // Subscribe to real-time changes
      UnifiedStorage.subscribe('storage:change', function (data) {
        if (['codes', 'silver', 'gold'].indexOf(data.type) !== -1) {
          refreshAssetType(data.type);
        }
      });

      UnifiedStorage.subscribe('codes:new', function (codeData) {
        assets.codes.unshift(codeData);
        if (currentTab === 'codes') renderCurrentTab();
        updateSummary();
      });

      UnifiedStorage.subscribe('storage:refreshed', function (data) {
        if (['codes', 'silver', 'gold'].indexOf(data.type) !== -1) {
          refreshAssetType(data.type);
        }
      });

      hideLoading();
    },

    onBalanceChange: function (balance) {
      if ($balanceDisplay) {
        $balanceDisplay.textContent = balance + ' pts';
      }
    }
  });

  // ── Load assets ─────────────────────────────────────────
  function loadAllAssets() {
    Promise.all([
      UnifiedStorage.getAll('codes'),
      UnifiedStorage.getAll('silver'),
      UnifiedStorage.getAll('gold')
    ]).then(function (results) {
      assets.codes = sortByDate(results[0] || []);
      assets.silver = sortByDate(results[1] || []);
      assets.gold = sortByDate(results[2] || []);
      renderCurrentTab();
      updateSummary();
    });
  }

  function refreshAssetType(type) {
    UnifiedStorage.getAll(type).then(function (data) {
      assets[type] = sortByDate(data || []);
      if (currentTab === type) renderCurrentTab();
      updateSummary();
    });
  }

  function sortByDate(arr) {
    return arr.sort(function (a, b) { return (b.generatedAt || b.timestamp || 0) - (a.generatedAt || a.timestamp || 0); });
  }

  // ── Tabs ────────────────────────────────────────────────
  function switchTab(tab) {
    currentTab = tab;
    selectedAssets.clear();

    document.querySelectorAll('[data-tab]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-tab') === tab);
    });

    renderCurrentTab();
    if ($bulkActions) $bulkActions.style.display = 'none';
  }

  // ── Render ──────────────────────────────────────────────
  function renderCurrentTab(filter) {
    var items = assets[currentTab] || [];

    if (filter) {
      var q = filter.toLowerCase();
      items = items.filter(function (item) {
        return (item.code || item.id || '').toLowerCase().indexOf(q) !== -1 ||
               (item.source || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    if (items.length === 0) {
      $container.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-icon">' + getIcon(currentTab) + '</div>' +
          '<h3>No ' + currentTab + ' found</h3>' +
          '<p>' + getEmptyMessage(currentTab) + '</p>' +
        '</div>';
      return;
    }

    $container.innerHTML = items.map(function (item, i) {
      var isSelected = selectedAssets.has(item.id);
      var statusClass = item.status === 'active' ? 'status-active' : 'status-spent';

      return '<div class="asset-card ' + (isSelected ? 'selected' : '') + '" data-id="' + item.id + '">' +
        '<div class="asset-checkbox">' +
          '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="SafeCode.toggleSelect(\'' + item.id + '\')">' +
        '</div>' +
        '<div class="asset-icon">' + getIcon(currentTab) + '</div>' +
        '<div class="asset-details">' +
          '<div class="asset-code">' + escapeHtml(item.code || item.id) + '</div>' +
          '<div class="asset-meta">' +
            '<span class="asset-value">' + (item.value || item.amount || 0) + ' pts</span>' +
            '<span class="asset-source">' + escapeHtml(item.source || currentTab) + '</span>' +
            '<span class="asset-date">' + formatDate(item.generatedAt || item.timestamp) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="asset-status ' + statusClass + '">' + (item.status || 'active') + '</div>' +
        '<div class="asset-actions">' +
          '<button onclick="SafeCode.transferAsset(\'' + item.id + '\')" title="Transfer">↗️</button>' +
          '<button onclick="SafeCode.copyCode(\'' + item.id + '\')" title="Copy">📋</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ── Summary ─────────────────────────────────────────────
  function updateSummary() {
    var activeCodes = assets.codes.filter(function (c) { return c.status === 'active'; });
    var totalValue = activeCodes.reduce(function (s, c) { return s + (c.value || 1); }, 0);

    if ($balanceDisplay) $balanceDisplay.textContent = totalValue + ' pts';
    if ($totalCount) {
      $totalCount.textContent =
        activeCodes.length + ' codes · ' +
        assets.silver.length + ' silver · ' +
        assets.gold.length + ' gold';
    }
  }

  // ── Actions ─────────────────────────────────────────────
  function transferAsset(assetId) {
    var item = findAsset(assetId);
    if (!item) return;

    var recipient = prompt('Transfer ' + (item.code || assetId) + ' to (email or user ID):');
    if (!recipient) return;

    var tx = {
      id: 'tx_transfer_' + Date.now(),
      type: 'transfer',
      assetId: assetId,
      assetType: currentTab,
      fromUserId: ServiceBase.userId,
      toUserId: recipient,
      status: 'pending',
      timestamp: Date.now(),
      userId: ServiceBase.userId
    };

    UnifiedStorage.set(tx.id, tx, 'transactions').then(function () {
      // Mark asset as transferred
      item.status = 'transferred';
      return UnifiedStorage.set(item.id, item, currentTab);
    }).then(function () {
      ServiceBase.notify('Transfer submitted for ' + (item.code || assetId), 'success');
      renderCurrentTab();
      updateSummary();
    });
  }

  function copyCode(assetId) {
    var item = findAsset(assetId);
    if (!item) return;
    var text = item.code || item.id;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () {
        ServiceBase.notify('Copied: ' + text, 'success');
      });
    } else {
      prompt('Copy this code:', text);
    }
  }

  function toggleSelect(assetId) {
    if (selectedAssets.has(assetId)) {
      selectedAssets.delete(assetId);
    } else {
      selectedAssets.add(assetId);
    }
    if ($bulkActions) $bulkActions.style.display = selectedAssets.size > 0 ? 'flex' : 'none';
    renderCurrentTab();
  }

  function bulkTransfer() {
    if (selectedAssets.size === 0) return;
    var recipient = prompt('Transfer ' + selectedAssets.size + ' assets to:');
    if (!recipient) return;

    var promises = [];
    selectedAssets.forEach(function (id) {
      var item = findAsset(id);
      if (item) {
        item.status = 'transferred';
        promises.push(UnifiedStorage.set(item.id, item, currentTab));
        promises.push(UnifiedStorage.set('tx_bulk_' + Date.now() + '_' + id, {
          id: 'tx_bulk_' + Date.now() + '_' + id,
          type: 'transfer', assetId: id, assetType: currentTab,
          fromUserId: ServiceBase.userId, toUserId: recipient,
          status: 'pending', timestamp: Date.now(), userId: ServiceBase.userId
        }, 'transactions'));
      }
    });

    Promise.all(promises).then(function () {
      ServiceBase.notify(selectedAssets.size + ' assets transferred!', 'success');
      selectedAssets.clear();
      renderCurrentTab();
      updateSummary();
    });
  }

  // ── Helpers ─────────────────────────────────────────────
  function findAsset(id) {
    return assets[currentTab].find(function (a) { return a.id === id; });
  }

  function getIcon(type) {
    return { codes: '🔐', silver: '🥈', gold: '🥇' }[type] || '💎';
  }

  function getEmptyMessage(type) {
    return {
      codes: 'Watch videos in YT-Clear to earn codes!',
      silver: 'Convert codes to silver in the exchange.',
      gold: 'Upgrade silver to gold for premium features.'
    }[type] || 'No assets yet.';
  }

  function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div'); d.textContent = str; return d.innerHTML;
  }

  function formatDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function hideLoading() {
    var el = document.getElementById('loadingOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function () { el.style.display = 'none'; }, 300); }
  }

  // ── Public API ──────────────────────────────────────────
  window.SafeCode = {
    switchTab: switchTab,
    transferAsset: transferAsset,
    copyCode: copyCode,
    toggleSelect: toggleSelect,
    bulkTransfer: bulkTransfer,
    refresh: loadAllAssets
  };

})();
