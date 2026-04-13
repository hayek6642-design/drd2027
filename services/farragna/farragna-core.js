/**
 * FARRAGNA-CORE.js — Social Likes System
 *
 * Users spend codes to give/receive likes.
 * Likes are tracked in UnifiedStorage.
 * Uses ServiceBase for auth + storage.
 */

(function () {
  'use strict';

  var LIKE_COST = 1; // codes per like given
  var myLikes = { received: 0, given: 0 };
  var likeEntries = [];

  ServiceBase.init({
    name: 'Farragna',

    onReady: function (ctx) {
      loadLikeData();

      UnifiedStorage.subscribe('storage:change', function (data) {
        if (data.type === 'likes') loadLikeData();
      });

      hideLoading();
    },

    onBalanceChange: function (balance) {
      var el = document.getElementById('farragna-balance');
      if (el) el.textContent = '🔐 ' + balance + ' codes';
    }
  });

  function loadLikeData() {
    UnifiedStorage.getAll('likes').then(function (likes) {
      likeEntries = likes || [];
      myLikes.received = likeEntries.filter(function (l) { return l.toUserId === ServiceBase.userId; }).length;
      myLikes.given = likeEntries.filter(function (l) { return l.fromUserId === ServiceBase.userId; }).length;
      renderStats();
      renderFeed();
    });
  }

  function giveLike(targetUserId, targetName) {
    if (targetUserId === ServiceBase.userId) {
      ServiceBase.notify('You cannot like yourself!', 'warning');
      return;
    }

    if (ServiceBase.balance < LIKE_COST) {
      ServiceBase.notify('Not enough codes to give a like!', 'error');
      return;
    }

    var like = {
      id: 'like_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      fromUserId: ServiceBase.userId,
      fromName: ServiceBase.email.split('@')[0],
      toUserId: targetUserId,
      toName: targetName || 'User',
      timestamp: Date.now(),
      userId: ServiceBase.userId
    };

    ServiceBase.spendCodes(LIKE_COST, 'Farragna like to ' + targetName).then(function () {
      return UnifiedStorage.set(like.id, like, 'likes');
    }).then(function () {
      ServiceBase.notify('❤️ Liked ' + (targetName || targetUserId) + '!', 'success');
      loadLikeData();
    });
  }

  function renderStats() {
    var el = document.getElementById('like-stats');
    if (!el) return;
    el.innerHTML =
      '<div class="stat"><span class="stat-num">' + myLikes.received + '</span><span class="stat-label">Received</span></div>' +
      '<div class="stat"><span class="stat-num">' + myLikes.given + '</span><span class="stat-label">Given</span></div>';
  }

  function renderFeed() {
    var el = document.getElementById('like-feed');
    if (!el) return;

    var recent = likeEntries
      .filter(function (l) { return l.toUserId === ServiceBase.userId || l.fromUserId === ServiceBase.userId; })
      .sort(function (a, b) { return b.timestamp - a.timestamp; })
      .slice(0, 20);

    if (recent.length === 0) {
      el.innerHTML = '<div class="empty">No likes yet. Start spreading the love! ❤️</div>';
      return;
    }

    el.innerHTML = recent.map(function (l) {
      var isMine = l.fromUserId === ServiceBase.userId;
      return '<div class="like-item">' +
        '<span class="like-icon">' + (isMine ? '↗️' : '❤️') + '</span>' +
        '<span class="like-text">' +
          (isMine ? 'You liked <b>' + escapeHtml(l.toName) + '</b>' :
                    '<b>' + escapeHtml(l.fromName) + '</b> liked you') +
        '</span>' +
        '<span class="like-time">' + timeAgo(l.timestamp) + '</span>' +
      '</div>';
    }).join('');
  }

  function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function timeAgo(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h';
    return Math.floor(diff/86400000) + 'd';
  }
  function hideLoading() {
    var el = document.getElementById('loadingOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function () { el.style.display = 'none'; }, 300); }
  }

  window.Farragna = { giveLike: giveLike, refresh: loadLikeData };
})();
