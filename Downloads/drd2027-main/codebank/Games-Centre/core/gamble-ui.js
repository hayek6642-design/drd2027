/**
 * Gamble UI — Pre-game mode selector, turn manager, winner announcement
 * Injects an overlay into the Games Centre when a game is about to launch.
 * Communicates with the game iframe via postMessage.
 * Depends on: gamble-system-core.js
 */
(function (window, document) {
  'use strict';

  const CSS = `
    #gamble-overlay { position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    #gamble-overlay .gc-card { background:#0d1117;border:1px solid #30363d;border-radius:16px;padding:32px 28px;max-width:420px;width:90%;color:#e6edf3;text-align:center; }
    #gamble-overlay h2 { margin:0 0 6px;font-size:1.5rem; }
    #gamble-overlay .sub { color:#8b949e;font-size:.9rem;margin-bottom:24px; }
    #gamble-overlay .modes { display:flex;flex-direction:column;gap:12px;margin-bottom:20px; }
    #gamble-overlay .mode-btn { background:#161b22;border:2px solid #30363d;border-radius:12px;padding:14px 20px;cursor:pointer;color:#e6edf3;display:flex;align-items:center;gap:12px;transition:all .2s; }
    #gamble-overlay .mode-btn:hover { border-color:#58a6ff;background:#1c2128; }
    #gamble-overlay .mode-btn.selected { border-color:#3fb950;background:#0d2019; }
    #gamble-overlay .mode-btn .icon { font-size:1.6rem;line-height:1; }
    #gamble-overlay .mode-btn .info { text-align:left; }
    #gamble-overlay .mode-btn .label { font-weight:600;font-size:1rem; }
    #gamble-overlay .mode-btn .desc { font-size:.78rem;color:#8b949e;margin-top:2px; }
    #gamble-overlay .prize-box { background:#161b22;border:1px solid #3fb950;border-radius:10px;padding:12px;margin-bottom:20px;display:none; }
    #gamble-overlay .prize-box .row { display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:4px; }
    #gamble-overlay .prize-box .big { font-size:1.4rem;font-weight:700;color:#3fb950; }
    #gamble-overlay .bal { color:#58a6ff;font-size:.85rem;margin-bottom:16px; }
    #gamble-overlay .err { color:#f85149;font-size:.82rem;margin-bottom:12px;display:none; }
    #gamble-overlay .play-btn { width:100%;background:linear-gradient(135deg,#238636,#2ea043);border:none;border-radius:10px;color:#fff;font-size:1.1rem;font-weight:700;padding:14px;cursor:pointer;transition:opacity .2s; }
    #gamble-overlay .play-btn:disabled { opacity:.4;cursor:not-allowed; }
    #gamble-overlay .play-btn:hover:not(:disabled) { opacity:.88; }
    #gamble-overlay .cancel-btn { background:none;border:none;color:#8b949e;font-size:.85rem;cursor:pointer;margin-top:12px;text-decoration:underline; }
    /* Turn overlay */
    #gamble-turn { position:fixed;top:12px;right:12px;z-index:9998;background:#0d1117;border:1px solid #30363d;border-radius:12px;padding:14px 18px;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,sans-serif;min-width:200px;box-shadow:0 4px 20px rgba(0,0,0,.6);display:none; }
    #gamble-turn .gt-title { font-size:.75rem;color:#8b949e;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px; }
    #gamble-turn .gt-player { font-size:1.1rem;font-weight:700;color:#58a6ff;margin-bottom:8px; }
    #gamble-turn .gt-prize { font-size:.85rem;color:#3fb950;margin-bottom:12px; }
    #gamble-turn .gt-score-btn { width:100%;background:#238636;border:none;border-radius:8px;color:#fff;font-size:.9rem;font-weight:600;padding:8px;cursor:pointer; }
    #gamble-turn .gt-score-btn:hover { background:#2ea043; }
    /* Winner overlay */
    #gamble-winner { position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;display:none;align-items:center;justify-content:center; }
    #gamble-winner .gw-card { background:#0d1117;border:2px solid #3fb950;border-radius:20px;padding:40px 32px;max-width:380px;width:90%;text-align:center;color:#e6edf3;animation:pop .3s ease; }
    @keyframes pop { from{transform:scale(.85);opacity:0} to{transform:scale(1);opacity:1} }
    #gamble-winner .gw-icon { font-size:4rem;margin-bottom:12px; }
    #gamble-winner .gw-title { font-size:1.6rem;font-weight:800;margin-bottom:8px; }
    #gamble-winner .gw-name { font-size:1.1rem;color:#58a6ff;margin-bottom:16px; }
    #gamble-winner .gw-prize { font-size:2.2rem;font-weight:800;color:#3fb950;margin-bottom:20px; }
    #gamble-winner .gw-btn { background:linear-gradient(135deg,#238636,#2ea043);border:none;border-radius:10px;color:#fff;font-size:1rem;font-weight:700;padding:12px 32px;cursor:pointer;margin:0 6px; }
    #gamble-winner .gw-btn:hover { opacity:.88; }
  `;

  function injectStyles() {
    if (document.getElementById('gamble-ui-css')) return;
    const s = document.createElement('style');
    s.id = 'gamble-ui-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── Gamble UI State ───────────────────────────── */
  let _state = {
    mode: null,           // 'computer' | '2p' | 'mp'
    numPlayers: 2,
    roomId: null,
    prizePool: 0,
    players: [],          // [{userId, username, score, turnOrder}]
    currentTurnIndex: 0,
    gameId: null,
    gameName: null,
    onLaunch: null,       // callback(mode, roomId) → launch game
    onClose: null
  };

  /* ── Pre-game Mode Modal ───────────────────────── */
  function showModeModal(gameId, gameName, onLaunch, onClose) {
    injectStyles();
    _state.gameId = gameId;
    _state.gameName = gameName;
    _state.onLaunch = onLaunch;
    _state.onClose = onClose;
    _state.mode = null;
    _state.roomId = null;

    const el = document.createElement('div');
    el.id = 'gamble-overlay';
    el.innerHTML = `
      <div class="gc-card">
        <h2>🎮 ${gameName}</h2>
        <p class="sub">Choose how you want to play</p>
        <div class="modes">
          <button class="mode-btn" data-mode="computer">
            <span class="icon">🤖</span>
            <div class="info">
              <div class="label">vs Computer</div>
              <div class="desc">Practice mode — free, no coins required</div>
            </div>
          </button>
          <button class="mode-btn" data-mode="2p">
            <span class="icon">👥</span>
            <div class="info">
              <div class="label">2 Players</div>
              <div class="desc">Entry: 100 codes each · Prize: 210 codes 🏆</div>
            </div>
          </button>
          <button class="mode-btn" data-mode="mp">
            <span class="icon">👥➕</span>
            <div class="info">
              <div class="label">Multiplayer</div>
              <div class="desc">3–8 players · 100 codes each · 10% bonus added</div>
            </div>
          </button>
        </div>
        <div id="gc-mp-controls" style="display:none;margin-bottom:16px;">
          <label style="font-size:.85rem;color:#8b949e;">Number of players:</label>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">
            ${[3,4,5,6,7,8].map(n => `<button class="mode-btn" style="padding:8px 14px;flex:none" data-np="${n}"><span style="font-size:1rem">${n}</span></button>`).join('')}
          </div>
        </div>
        <div class="prize-box" id="gc-prize-box">
          <div class="row"><span>Entry fee</span><span>100 codes × <span id="gc-np-display">2</span></span></div>
          <div class="row"><span>Prize pool</span><span class="big" id="gc-prize-display">210</span> 🪙</div>
        </div>
        <div class="bal" id="gc-balance">Balance: checking...</div>
        <div class="err" id="gc-err"></div>
        <button class="play-btn" id="gc-play-btn" disabled>Select a mode to continue</button>
        <button class="cancel-btn" id="gc-cancel-btn">✕ Cancel</button>
      </div>`;
    document.body.appendChild(el);

    // Fetch balance
    GambleSystem.getBalance().then(b => {
      document.getElementById('gc-balance').textContent = `Your balance: ${b.codes} codes 🪙`;
    });

    // Mode buttons
    el.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.mode-btn[data-mode]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        _state.mode = btn.dataset.mode;

        const mpCtrl = document.getElementById('gc-mp-controls');
        const prizeBox = document.getElementById('gc-prize-box');
        const playBtn = document.getElementById('gc-play-btn');

        if (_state.mode === 'computer') {
          mpCtrl.style.display = 'none';
          prizeBox.style.display = 'none';
          playBtn.disabled = false;
          playBtn.textContent = '▶ Play vs Computer (free)';
        } else if (_state.mode === '2p') {
          _state.numPlayers = 2;
          mpCtrl.style.display = 'none';
          prizeBox.style.display = 'block';
          updatePrizeDisplay(2);
          playBtn.disabled = false;
          playBtn.textContent = '▶ Start 2-Player Game (100 codes)';
        } else {
          mpCtrl.style.display = 'block';
          prizeBox.style.display = 'none';
          _state.numPlayers = 3;
          playBtn.disabled = true;
          playBtn.textContent = 'Select number of players';
        }
      });
    });

    // MP player count
    el.querySelectorAll('.mode-btn[data-np]').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.mode-btn[data-np]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        _state.numPlayers = parseInt(btn.dataset.np, 10);
        document.getElementById('gc-prize-box').style.display = 'block';
        updatePrizeDisplay(_state.numPlayers);
        document.getElementById('gc-play-btn').disabled = false;
        document.getElementById('gc-play-btn').textContent = `▶ Start ${_state.numPlayers}-Player Game (100 codes each)`;
      });
    });

    document.getElementById('gc-play-btn').addEventListener('click', () => _handlePlay());
    document.getElementById('gc-cancel-btn').addEventListener('click', () => { el.remove(); if (onClose) onClose(); });
  }

  function updatePrizeDisplay(n) {
    const prize = GambleSystem.calculatePrize(n);
    document.getElementById('gc-np-display').textContent = n;
    document.getElementById('gc-prize-display').textContent = prize;
  }

  async function _handlePlay() {
    const playBtn = document.getElementById('gc-play-btn');
    const errEl = document.getElementById('gc-err');
    errEl.style.display = 'none';

    if (_state.mode === 'computer') {
      document.getElementById('gamble-overlay').remove();
      if (_state.onLaunch) _state.onLaunch('computer', null, 0);
      return;
    }

    // Gamble mode — check balance first
    playBtn.disabled = true;
    playBtn.textContent = '⏳ Creating room...';

    try {
      const bal = await GambleSystem.getBalance();
      if (bal.codes < GambleSystem.ENTRY_FEE) {
        errEl.textContent = `❌ Insufficient balance. You need ${GambleSystem.ENTRY_FEE} codes but only have ${bal.codes}.`;
        errEl.style.display = 'block';
        playBtn.disabled = false;
        playBtn.textContent = '▶ Try Again';
        return;
      }

      // Create room
      const roomRes = await GambleSystem.createRoom(_state.gameId, _state.gameName, _state.numPlayers);
      if (!roomRes.success) throw new Error(roomRes.error || 'Failed to create room');

      _state.roomId = roomRes.roomId;
      _state.prizePool = roomRes.prizePool;

      // Creator joins first
      const joinRes = await GambleSystem.joinRoom(_state.roomId, window.__currentUsername || 'Player 1');
      if (!joinRes.success) throw new Error(joinRes.error || 'Failed to join room');

      document.getElementById('gamble-overlay').remove();
      if (_state.onLaunch) _state.onLaunch(_state.mode, _state.roomId, _state.prizePool);
      _initTurnManager();

    } catch (e) {
      errEl.textContent = `❌ ${e.message}`;
      errEl.style.display = 'block';
      playBtn.disabled = false;
      playBtn.textContent = '▶ Retry';
    }
  }

  /* ── Turn Manager (shown while game is in iframe) ── */
  function _initTurnManager() {
    if (!_state.roomId) return;
    injectStyles();

    const el = document.createElement('div');
    el.id = 'gamble-turn';
    el.innerHTML = `
      <div class="gt-title">🎰 Gamble Mode</div>
      <div class="gt-player" id="gt-player-name">Your turn</div>
      <div class="gt-prize">Prize pool: <strong id="gt-prize-val">${_state.prizePool}</strong> 🪙</div>
      <button class="gt-score-btn" id="gt-done-btn">✓ Record Score / Game Over</button>
    `;
    document.body.appendChild(el);
    el.style.display = 'block';

    document.getElementById('gt-done-btn').addEventListener('click', _handleScoreRecord);
  }

  async function _handleScoreRecord() {
    const btn = document.getElementById('gt-done-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Saving...';

    // Try to get score from game iframe
    const iframe = document.getElementById('gameFrame');
    let score = 0;
    if (iframe) {
      try {
        const scoreEl = iframe.contentDocument?.getElementById('score') ||
                        iframe.contentDocument?.querySelector('[id*="score"]');
        if (scoreEl) score = parseInt(scoreEl.textContent, 10) || 0;
      } catch (_) {}
    }

    if (_state.roomId) {
      await GambleSystem.submitScore(_state.roomId, score);
    }

    // Get updated room to see if all players have played
    const roomRes = await GambleSystem.getRoom(_state.roomId);
    if (!roomRes.success) { btn.disabled = false; btn.textContent = '✓ Record Score'; return; }

    const players = roomRes.players || [];
    const allScored = players.every(p => p.score > 0 || players.length >= _state.numPlayers);

    if (allScored && players.length >= _state.numPlayers) {
      // Find winner (highest score)
      const winner = players.reduce((best, p) => (p.score > (best?.score || -1) ? p : best), null);
      if (winner) {
        await GambleSystem.declareWinner(_state.roomId, winner.user_id, winner.score);
        document.getElementById('gamble-turn').style.display = 'none';
        showWinnerOverlay(winner.username || 'Winner', winner.score, _state.prizePool);
      }
    } else {
      // Next player's turn
      _state.currentTurnIndex++;
      const nextPlayer = `Player ${_state.currentTurnIndex + 1}`;
      document.getElementById('gt-player-name').textContent = `${nextPlayer}'s turn`;
      btn.disabled = false;
      btn.textContent = '✓ Record Score / Game Over';
    }
  }

  /* ── Winner Announcement ──────────────────────── */
  function showWinnerOverlay(winnerName, winnerScore, prize) {
    injectStyles();
    const el = document.createElement('div');
    el.id = 'gamble-winner';
    el.style.display = 'flex';
    el.innerHTML = `
      <div class="gw-card">
        <div class="gw-icon">🏆</div>
        <div class="gw-title">Winner!</div>
        <div class="gw-name">${winnerName}</div>
        <div style="color:#8b949e;font-size:.85rem;margin-bottom:8px">Score: ${winnerScore}</div>
        <div class="gw-prize">+${prize} 🪙</div>
        <p style="color:#8b949e;font-size:.82rem;margin-bottom:20px">${prize} codes have been deposited to the winner's account</p>
        <button class="gw-btn" id="gw-back-btn">← Back to Games</button>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('gw-back-btn').addEventListener('click', () => {
      el.remove();
      const backBtn = document.getElementById('backToGames');
      if (backBtn) backBtn.click();
    });
  }

  /* ── Listen for GAME_OVER messages from iframe ── */
  window.addEventListener('message', async (e) => {
    if (!e.data || e.data.type !== 'GAME_OVER') return;
    if (!_state.roomId) return;

    const { score, winner, playerIndex } = e.data;
    if (score !== undefined) await GambleSystem.submitScore(_state.roomId, score);

    if (winner !== undefined) {
      // Game reports direct winner (e.g. chess declares P1/P2)
      const roomRes = await GambleSystem.getRoom(_state.roomId);
      if (roomRes.success) {
        const players = roomRes.players || [];
        const winnerPlayer = players[winner - 1] || players[0];
        if (winnerPlayer) {
          await GambleSystem.declareWinner(_state.roomId, winnerPlayer.user_id, score || 0);
          const turnEl = document.getElementById('gamble-turn');
          if (turnEl) turnEl.style.display = 'none';
          showWinnerOverlay(winnerPlayer.username || `Player ${winner}`, score || 0, _state.prizePool);
        }
      }
    }
  });

  /* ── Public API ───────────────────────────────── */
  window.GambleUI = {
    show: showModeModal,
    showWinner: showWinnerOverlay,
    getState: () => ({ ..._state })
  };

})(window, document);
