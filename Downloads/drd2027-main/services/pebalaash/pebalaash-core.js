/**
 * PEBALAASH-CORE.js — Barter/Trading Service
 *
 * Users create trade offers and accept/decline others' offers.
 * All trades stored via UnifiedStorage.
 * Uses ServiceBase for auth + storage.
 */

(function () {
  'use strict';

  var trades = [];
  var myOffers = [];

  ServiceBase.init({
    name: 'Pebalaash',

    onReady: function (ctx) {
      loadTrades();

      UnifiedStorage.subscribe('storage:change', function (data) {
        if (data.type === 'trades') loadTrades();
      });

      document.getElementById('create-trade-btn')
        ?.addEventListener('click', showCreateTradeForm);

      hideLoading();
    },

    onBalanceChange: function (balance) {
      var el = document.getElementById('pebalaash-balance');
      if (el) el.textContent = '🔐 ' + balance + ' codes available to trade';
    }
  });

  function loadTrades() {
    UnifiedStorage.getAll('trades').then(function (data) {
      var all = data || [];
      trades = all.filter(function (t) { return t.status === 'open'; })
                   .sort(function (a, b) { return b.timestamp - a.timestamp; });
      myOffers = all.filter(function (t) { return t.creatorId === ServiceBase.userId; });
      renderMarketplace();
      renderMyOffers();
    });
  }

  function createTrade(offering, requesting, description) {
    if (!offering || !requesting) {
      ServiceBase.notify('Please specify what you offer and what you want.', 'warning');
      return;
    }

    var trade = {
      id: 'trade_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      creatorId: ServiceBase.userId,
      creatorName: ServiceBase.email.split('@')[0],
      offering: offering,       // e.g. { type: 'codes', amount: 50 }
      requesting: requesting,   // e.g. { type: 'silver', amount: 5 }
      description: description || '',
      status: 'open',
      timestamp: Date.now(),
      userId: ServiceBase.userId
    };

    UnifiedStorage.set(trade.id, trade, 'trades').then(function () {
      ServiceBase.notify('Trade offer created! 📢', 'success');
      loadTrades();
    });
  }

  function acceptTrade(tradeId) {
    var trade = trades.find(function (t) { return t.id === tradeId; });
    if (!trade) return;

    if (trade.creatorId === ServiceBase.userId) {
      ServiceBase.notify('You cannot accept your own trade!', 'warning');
      return;
    }

    trade.status = 'accepted';
    trade.acceptedBy = ServiceBase.userId;
    trade.acceptedAt = Date.now();

    UnifiedStorage.set(trade.id, trade, 'trades').then(function () {
      // Create transaction records
      var tx = {
        id: 'tx_trade_' + Date.now(),
        type: 'trade',
        tradeId: tradeId,
        fromUserId: ServiceBase.userId,
        toUserId: trade.creatorId,
        description: 'Trade accepted: ' + JSON.stringify(trade.offering) + ' ↔ ' + JSON.stringify(trade.requesting),
        status: 'completed',
        timestamp: Date.now(),
        userId: ServiceBase.userId
      };
      return UnifiedStorage.set(tx.id, tx, 'transactions');
    }).then(function () {
      ServiceBase.notify('Trade accepted! ✅', 'success');
      loadTrades();
    });
  }

  function cancelTrade(tradeId) {
    var trade = trades.find(function (t) { return t.id === tradeId; }) ||
                myOffers.find(function (t) { return t.id === tradeId; });
    if (!trade || trade.creatorId !== ServiceBase.userId) return;

    trade.status = 'cancelled';
    UnifiedStorage.set(trade.id, trade, 'trades').then(function () {
      ServiceBase.notify('Trade cancelled.', 'warning');
      loadTrades();
    });
  }

  function renderMarketplace() {
    var el = document.getElementById('marketplace');
    if (!el) return;

    var available = trades.filter(function (t) { return t.creatorId !== ServiceBase.userId; });

    if (available.length === 0) {
      el.innerHTML = '<div class="empty">No open trades. Create the first one! 🏪</div>';
      return;
    }

    el.innerHTML = available.map(function (t) {
      return '<div class="trade-card">' +
        '<div class="trade-header">' +
          '<span class="trade-creator">👤 ' + escapeHtml(t.creatorName) + '</span>' +
          '<span class="trade-time">' + timeAgo(t.timestamp) + '</span>' +
        '</div>' +
        '<div class="trade-body">' +
          '<div class="trade-offer">Offering: <b>' + formatAsset(t.offering) + '</b></div>' +
          '<div class="trade-arrow">↕️</div>' +
          '<div class="trade-request">Wants: <b>' + formatAsset(t.requesting) + '</b></div>' +
        '</div>' +
        (t.description ? '<div class="trade-desc">' + escapeHtml(t.description) + '</div>' : '') +
        '<button class="trade-accept-btn" onclick="Pebalaash.acceptTrade(\'' + t.id + '\')">Accept Trade</button>' +
      '</div>';
    }).join('');
  }

  function renderMyOffers() {
    var el = document.getElementById('my-offers');
    if (!el) return;

    if (myOffers.length === 0) {
      el.innerHTML = '<div class="empty">You have no trade offers.</div>';
      return;
    }

    el.innerHTML = myOffers.map(function (t) {
      return '<div class="trade-card mine">' +
        '<div class="trade-status-badge status-' + t.status + '">' + t.status + '</div>' +
        '<div class="trade-body">' +
          '<div class="trade-offer">Offering: <b>' + formatAsset(t.offering) + '</b></div>' +
          '<div class="trade-request">Wants: <b>' + formatAsset(t.requesting) + '</b></div>' +
        '</div>' +
        (t.status === 'open' ?
          '<button class="trade-cancel-btn" onclick="Pebalaash.cancelTrade(\'' + t.id + '\')">Cancel</button>' : '') +
      '</div>';
    }).join('');
  }

  function showCreateTradeForm() {
    var offering = prompt('What are you offering? (e.g. "50 codes")');
    if (!offering) return;
    var requesting = prompt('What do you want in return? (e.g. "5 silver")');
    if (!requesting) return;
    var desc = prompt('Add a description (optional):') || '';

    createTrade(
      { type: 'custom', description: offering },
      { type: 'custom', description: requesting },
      desc
    );
  }

  function formatAsset(asset) {
    if (!asset) return '?';
    if (asset.description) return escapeHtml(asset.description);
    return (asset.amount || '?') + ' ' + (asset.type || 'items');
  }

  function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function timeAgo(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    return Math.floor(diff/86400000) + 'd ago';
  }
  function hideLoading() {
    var el = document.getElementById('loadingOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function () { el.style.display = 'none'; }, 300); }
  }

  window.Pebalaash = { createTrade: createTrade, acceptTrade: acceptTrade, cancelTrade: cancelTrade, refresh: loadTrades };
})();
