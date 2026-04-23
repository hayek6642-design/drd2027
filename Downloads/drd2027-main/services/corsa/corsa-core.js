/**
 * CORSA-CORE.js — Racing Game Service
 *
 * Entry costs codes. Scores stored via UnifiedStorage.
 * Uses ServiceBase for auth + storage.
 */

(function () {
  'use strict';

  var RACE_COST = 3;
  var highScores = [];
  var currentScore = 0;
  var isRacing = false;

  ServiceBase.init({
    name: 'CoRsA',

    onReady: function (ctx) {
      loadHighScores();
      updateUI(ctx.balance);

      document.getElementById('start-race-btn')
        ?.addEventListener('click', startRace);

      hideLoading();
    },

    onBalanceChange: function (balance) {
      updateUI(balance);
    }
  });

  function updateUI(balance) {
    var el = document.getElementById('corsa-balance');
    if (el) el.textContent = '🔐 ' + balance + ' codes (race costs ' + RACE_COST + ')';
  }

  function startRace() {
    if (isRacing) return;

    if (ServiceBase.balance < RACE_COST) {
      ServiceBase.notify('Not enough codes to race! Need ' + RACE_COST, 'error');
      return;
    }

    ServiceBase.spendCodes(RACE_COST, 'CoRsA race entry').then(function () {
      isRacing = true;
      currentScore = 0;
      ServiceBase.notify('🏁 Race started! Good luck!', 'success');

      var el = document.getElementById('race-status');
      if (el) el.textContent = '🏎️ Racing...';

      // Simulate race (replace with actual game logic)
      simulateRace();
    });
  }

  function simulateRace() {
    var duration = 3000 + Math.random() * 5000;
    setTimeout(function () {
      currentScore = Math.floor(Math.random() * 1000) + 100;
      endRace(currentScore);
    }, duration);
  }

  function endRace(score) {
    isRacing = false;

    var entry = {
      id: 'race_' + Date.now(),
      userId: ServiceBase.userId,
      playerName: ServiceBase.email.split('@')[0],
      score: score,
      timestamp: Date.now()
    };

    UnifiedStorage.set(entry.id, entry, 'scores').then(function () {
      ServiceBase.notify('🏆 Race finished! Score: ' + score, 'success');
      loadHighScores();
    });

    var el = document.getElementById('race-status');
    if (el) el.textContent = '🏆 Finished! Score: ' + score;
  }

  function loadHighScores() {
    UnifiedStorage.getAll('scores').then(function (scores) {
      highScores = (scores || [])
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 10);
      renderLeaderboard();
    });
  }

  function renderLeaderboard() {
    var el = document.getElementById('leaderboard');
    if (!el) return;

    if (highScores.length === 0) {
      el.innerHTML = '<div class="empty">No races yet. Be the first! 🏁</div>';
      return;
    }

    el.innerHTML = '<h3>🏆 Leaderboard</h3>' +
      highScores.map(function (s, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
        var isMe = s.userId === ServiceBase.userId;
        return '<div class="score-row' + (isMe ? ' mine' : '') + '">' +
          '<span class="rank">' + medal + '</span>' +
          '<span class="player">' + escapeHtml(s.playerName || 'Player') + '</span>' +
          '<span class="score">' + s.score + ' pts</span>' +
        '</div>';
      }).join('');
  }

  function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function hideLoading() {
    var el = document.getElementById('loadingOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function () { el.style.display = 'none'; }, 300); }
  }

  window.CoRsA = { startRace: startRace, refresh: loadHighScores };
})();
