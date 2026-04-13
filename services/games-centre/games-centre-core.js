/**
 * GAMES-CENTRE-CORE.js — Mini Games Hub
 *
 * Entry to each game costs codes. Scores/rewards stored via UnifiedStorage.
 * Uses ServiceBase for auth + storage.
 */

(function () {
  'use strict';

  var GAME_COST = 2;
  var games = [
    { id: 'coin-flip', name: 'Coin Flip', icon: '🪙', desc: 'Double or nothing!', multiplier: 2 },
    { id: 'dice-roll', name: 'Dice Roll', icon: '🎲', desc: 'Roll 4+ to win!', multiplier: 1.5 },
    { id: 'number-guess', name: 'Number Guess', icon: '🔢', desc: 'Guess 1-10', multiplier: 5 },
    { id: 'trivia', name: 'Quick Trivia', icon: '🧠', desc: 'Answer correctly!', multiplier: 3 }
  ];

  var gameHistory = [];

  ServiceBase.init({
    name: 'GamesCentre',

    onReady: function (ctx) {
      renderGameList();
      loadHistory();
      updateBalance(ctx.balance);
      hideLoading();
    },

    onBalanceChange: function (balance) {
      updateBalance(balance);
    }
  });

  function updateBalance(bal) {
    var el = document.getElementById('gc-balance');
    if (el) el.textContent = '🔐 ' + bal + ' codes (games cost ' + GAME_COST + ')';
  }

  function renderGameList() {
    var el = document.getElementById('games-list');
    if (!el) return;

    el.innerHTML = games.map(function (g) {
      return '<div class="game-card" onclick="GamesCentre.play(\'' + g.id + '\')">' +
        '<div class="game-icon">' + g.icon + '</div>' +
        '<div class="game-info">' +
          '<div class="game-name">' + g.name + '</div>' +
          '<div class="game-desc">' + g.desc + '</div>' +
          '<div class="game-multi">Win ' + g.multiplier + 'x codes</div>' +
        '</div>' +
        '<div class="game-play-btn">▶ Play</div>' +
      '</div>';
    }).join('');
  }

  function playGame(gameId) {
    var game = games.find(function (g) { return g.id === gameId; });
    if (!game) return;

    if (ServiceBase.balance < GAME_COST) {
      ServiceBase.notify('Need ' + GAME_COST + ' codes to play!', 'error');
      return;
    }

    ServiceBase.spendCodes(GAME_COST, 'Games Centre: ' + game.name).then(function () {
      var result = runGame(game);
      var entry = {
        id: 'game_' + Date.now(),
        gameId: gameId,
        gameName: game.name,
        won: result.won,
        reward: result.reward,
        userId: ServiceBase.userId,
        timestamp: Date.now()
      };

      UnifiedStorage.set(entry.id, entry, 'transactions');

      if (result.won && result.reward > 0) {
        // Generate reward codes
        var rewardCode = {
          id: 'code_reward_' + Date.now(),
          code: 'GC-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
          value: result.reward,
          generatedAt: Date.now(),
          userId: ServiceBase.userId,
          status: 'active',
          source: 'games-centre-' + gameId
        };
        UnifiedStorage.set(rewardCode.id, rewardCode, 'codes');
        UnifiedStorage.broadcast('codes:new', rewardCode);
      }

      showResult(game, result);
      loadHistory();
    });
  }

  function runGame(game) {
    switch (game.id) {
      case 'coin-flip':
        var flip = Math.random() > 0.5;
        return { won: flip, reward: flip ? GAME_COST * game.multiplier : 0, detail: flip ? 'Heads! 🎉' : 'Tails! 😢' };

      case 'dice-roll':
        var roll = Math.ceil(Math.random() * 6);
        var won = roll >= 4;
        return { won: won, reward: won ? Math.floor(GAME_COST * game.multiplier) : 0, detail: 'Rolled ' + roll + '! ' + (won ? '🎉' : '😢') };

      case 'number-guess':
        var target = Math.ceil(Math.random() * 10);
        var guess = parseInt(prompt('Guess a number 1-10:'));
        var correct = guess === target;
        return { won: correct, reward: correct ? GAME_COST * game.multiplier : 0, detail: 'Number was ' + target + '. ' + (correct ? '🎉 Perfect!' : '😢 Try again!') };

      case 'trivia':
        var correct2 = Math.random() > 0.6; // 40% chance
        return { won: correct2, reward: correct2 ? GAME_COST * game.multiplier : 0, detail: correct2 ? '✅ Correct!' : '❌ Wrong answer!' };

      default:
        return { won: false, reward: 0, detail: 'Unknown game' };
    }
  }

  function showResult(game, result) {
    var msg = game.icon + ' ' + game.name + ': ' + result.detail;
    if (result.won) msg += ' Won ' + result.reward + ' codes!';
    ServiceBase.notify(msg, result.won ? 'success' : 'error');

    var el = document.getElementById('game-result');
    if (el) {
      el.innerHTML = '<div class="result ' + (result.won ? 'win' : 'loss') + '">' +
        '<div class="result-icon">' + (result.won ? '🏆' : '💔') + '</div>' +
        '<div class="result-text">' + result.detail + '</div>' +
        (result.won ? '<div class="result-reward">+' + result.reward + ' codes!</div>' : '') +
      '</div>';
    }
  }

  function loadHistory() {
    UnifiedStorage.getAll('transactions').then(function (txs) {
      gameHistory = (txs || []).filter(function (t) {
        return t.gameId && t.userId === ServiceBase.userId;
      }).sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 20);
      renderHistory();
    });
  }

  function renderHistory() {
    var el = document.getElementById('game-history');
    if (!el) return;
    if (gameHistory.length === 0) { el.innerHTML = '<div class="empty">No games played yet.</div>'; return; }
    el.innerHTML = gameHistory.map(function (g) {
      return '<div class="history-item ' + (g.won ? 'win' : 'loss') + '">' +
        '<span>' + (g.won ? '✅' : '❌') + ' ' + escapeHtml(g.gameName) + '</span>' +
        '<span>' + (g.won ? '+' + g.reward : '-' + GAME_COST) + ' codes</span>' +
      '</div>';
    }).join('');
  }

  function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function hideLoading() {
    var el = document.getElementById('loadingOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function () { el.style.display = 'none'; }, 300); }
  }

  window.GamesCentre = { play: playGame, refresh: loadHistory };
})();
