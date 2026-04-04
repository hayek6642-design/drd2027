// Games Centre Dashboard — with Gamble System Core integration
// Gamble API: /api/gamble/* — linked to ACC, Turso DB, Ledger, Bankode

document.addEventListener('DOMContentLoaded', async () => {
  // User context (resolved from session cookie if available)
  let currentUserId = `guest_${Math.floor(Math.random() * 10000)}`;
  let currentUsername = `Guest${Math.floor(Math.random() * 1000)}`;

  // Try to get real user identity from session
  try {
    const meRes = await fetch('/api/me', { credentials: 'include' });
    if (meRes.ok) {
      const me = await meRes.json();
      if (me.id) { currentUserId = me.id; currentUsername = me.username || me.display_name || currentUsername; }
    }
  } catch (_) {}

  // Expose to gamble UI
  window.__currentUserId = currentUserId;
  window.__currentUsername = currentUsername;

  // Simple leaderboard mock
  const leaderboard = {
    getTopPlayers: () => [],
    updateScore: () => {}
  };

  class TextChat {
    constructor(gameId, username) {
      this.gameId = gameId; this.username = username; this.listeners = [];
    }
    sendMessage(text) {
      const msg = { id: Date.now().toString(), sender: this.username, text, timestamp: new Date().toISOString() };
      this.notify(msg);
    }
    onMessage(cb) { this.listeners.push(cb); }
    notify(msg) { this.listeners.forEach(cb => cb(msg)); }
    disconnect() {}
  }

  class VoiceChat {
    constructor(roomId, userId) { this.roomId = roomId; this.userId = userId; }
    async init() { return false; }
    startLocalStream() { return Promise.reject('Voice chat not available'); }
    toggleMute() { return false; }
    toggleVideo() { return true; }
  }

  // DOM Elements
  const dashboardView = document.getElementById('dashboardView');
  const gamesGrid = document.getElementById('gamesGrid');
  const gameContainer = document.getElementById('gameContainer');
  const gameFrame = document.getElementById('gameFrame');
  const backToGames = document.getElementById('backToGames');
  const searchInput = document.getElementById('searchGames');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const gameLoading = document.getElementById('gameLoading');
  const gameError = document.getElementById('gameError');
  const errorMessage = document.getElementById('errorMessage');
  const retryGame = document.getElementById('retryGame');
  const currentGameTitle = document.getElementById('currentGameTitle');
  const template = document.getElementById('gameCardTemplate').content;
  const chatOverlay = document.getElementById('chatOverlay');
  const videoOverlay = document.getElementById('videoOverlay');
  const leaderboardOverlay = document.getElementById('leaderboardOverlay');
  const toggleChatBtn = document.getElementById('toggleChatBtn');
  const toggleLeaderboardBtn = document.getElementById('toggleLeaderboardBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendMessage');
  const closeChat = document.getElementById('closeChat');
  const toggleVideoBtn = document.getElementById('toggleVideo');
  const toggleMuteBtn = document.getElementById('toggleMute');
  const closeVideo = document.getElementById('closeVideo');
  const leaderboardList = document.getElementById('leaderboardList');
  const closeLeaderboard = document.getElementById('closeLeaderboard');
  const leaderboardTabs = document.querySelectorAll('.tab-btn');

  // State
  let allGames = [];
  let filteredGames = [];
  let currentFilter = 'all';
  let textChat = null;
  let voiceChat = null;
  let currentGameData = null;

  // ── Gamble Turn State ──────────────────────────────────────────
  let _gambleState = {
    active: false, roomId: null, prizePool: 0,
    numPlayers: 0, players: [], currentTurn: 0,
    scores: [], gameId: null
  };

  function _resetGamble() {
    _gambleState = { active: false, roomId: null, prizePool: 0, numPlayers: 0, players: [], currentTurn: 0, scores: [], gameId: null };
    const el = document.getElementById('__gamble-turn-panel');
    if (el) el.remove();
    const el2 = document.getElementById('__gamble-winner-panel');
    if (el2) el2.remove();
  }

  // Category mapping
  const categoryByName = {
    'american-roulette': 'casino', 'spinner': 'casino',
    'billiard': 'arcade', 'super-billard': 'arcade',
    'car-race': 'action', 'river-raid': 'action', 'pubgy-kids': 'action',
    'chess': 'board', 'chess-nexus': 'board', 'dominos': 'board',
    'tic-tac-toe': 'board', 'snake-ladder': 'board',
    'solitaire': 'classic', 'tetris': 'classic', 'snake': 'classic',
    'cards': 'casino', 'casino-sim': 'casino'
  };

  // Load manifest
  async function loadManifest() {
    try {
      loadingState.classList.remove('hidden');
      const response = await fetch('./core/dashboard-manifest.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}: Manifest not found`);
      const data = await response.json();
      const entries = Array.isArray(data) ? data : (data.vanilla || []);
      allGames = entries.map(({ name, path }) => {
        const title = (name || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return {
          id: name, title,
          category: categoryByName[name] || 'classic',
          description: `Play ${title} now!`,
          url: `./${path}`,
          thumbnail: generateThumbnail(title)
        };
      });
      filteredGames = [...allGames];
      loadingState.classList.add('hidden');
      renderGames();
    } catch (error) {
      console.error('Manifest load error:', error);
      loadingState.classList.add('hidden');
      showError('Failed to load games. Please refresh the page.');
    }
  }

  function generateThumbnail(title) {
    const initial = title.charAt(0).toUpperCase();
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[initial.charCodeAt(0) % colors.length];
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="280" height="180" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#0a0e27;stop-opacity:1"/>
        </linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="50%" font-family="Arial" font-size="64" fill="white" text-anchor="middle" dy=".3em" opacity="0.9">${initial}</text>
      </svg>
    `)}`;
  }

  function renderGames() {
    gamesGrid.innerHTML = '';
    if (filteredGames.length === 0) { emptyState.classList.remove('hidden'); return; }
    emptyState.classList.add('hidden');
    filteredGames.forEach((game, index) => {
      const card = template.cloneNode(true);
      const gameCard = card.querySelector('.game-card');
      const img = card.querySelector('img');
      img.src = game.thumbnail; img.alt = game.title;
      card.querySelector('.game-title').textContent = game.title;
      card.querySelector('.game-category').textContent = game.category;
      card.querySelector('.game-description').textContent = game.description;
      const playBtn = card.querySelector('.play-btn');
      playBtn.addEventListener('click', e => { e.stopPropagation(); launchGame(game); });
      gameCard.addEventListener('click', () => launchGame(game));
      gameCard.style.animationDelay = `${index * 0.05}s`;
      gamesGrid.appendChild(card);
    });
  }

  function filterGames() {
    const q = searchInput.value.toLowerCase();
    filteredGames = allGames.filter(game => {
      const ms = game.title.toLowerCase().includes(q) || game.description.toLowerCase().includes(q);
      const mc = currentFilter === 'all' || game.category === currentFilter;
      return ms && mc;
    });
    renderGames();
  }

  // ── GAMBLE-AWARE Launch ──────────────────────────────────────────
  async function launchGame(game) {
    currentGameData = game;

    if (window.GambleUI) {
      // Show mode selector first
      GambleUI.show(game.id, game.title,
        (mode, roomId, prizePool) => _actuallyLaunchGame(game, mode, roomId, prizePool),
        () => { /* user cancelled */ }
      );
    } else {
      _actuallyLaunchGame(game, 'computer', null, 0);
    }
  }

  async function _actuallyLaunchGame(game, mode, roomId, prizePool) {
    let gameSrc = game.url;
    if (game.url.includes('/client/index.html')) {
      gameSrc = game.url.replace('/client/index.html', '/client/dist/index.html');
    }

    // Attach gamble params so game iframe can read them
    if (mode !== 'computer' && roomId) {
      const sep = gameSrc.includes('?') ? '&' : '?';
      gameSrc += `${sep}gamble=1&roomId=${encodeURIComponent(roomId)}&prize=${prizePool}`;
    }

    dashboardView.style.display = 'none';
    gameContainer.classList.remove('hidden');
    currentGameTitle.textContent = game.title;
    gameError.classList.add('hidden');
    gameLoading.style.display = 'flex';

    gameFrame.src = gameSrc;

    gameFrame.onload = () => {
      gameLoading.style.display = 'none';
      // Set up gamble turn manager if in gamble mode
      if (mode !== 'computer' && roomId) {
        _setupGambleTurnManager(game, roomId, prizePool, mode);
      }
    };

    gameFrame.onerror = () => showGameError('Failed to load game. Please try again.');

    initChat(game.id);
    showLeaderboard(game.id);
  }

  // ── Gamble Turn Manager ──────────────────────────────────────────
  function _setupGambleTurnManager(game, roomId, prizePool, mode) {
    _resetGamble();
    const numPlayers = mode === '2p' ? 2 : (parseInt(mode) || 3);
    _gambleState = {
      active: true, roomId, prizePool, numPlayers,
      players: [], currentTurn: 1, scores: [],
      gameId: game.id
    };

    // Populate player names
    for (let i = 1; i <= numPlayers; i++) {
      _gambleState.players.push({ name: i === 1 ? (currentUsername || `Player 1`) : `Player ${i}`, score: null });
    }

    _showTurnPanel();
  }

  function _showTurnPanel() {
    const existing = document.getElementById('__gamble-turn-panel');
    if (existing) existing.remove();

    const { currentTurn, numPlayers, prizePool, players } = _gambleState;
    const playerName = players[currentTurn - 1]?.name || `Player ${currentTurn}`;

    const panel = document.createElement('div');
    panel.id = '__gamble-turn-panel';
    panel.style.cssText = `
      position:fixed;top:60px;right:16px;z-index:9000;
      background:#0d1117;border:1px solid #3fb950;border-radius:14px;
      padding:16px 18px;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      min-width:220px;box-shadow:0 4px 24px rgba(0,0,0,.7);
    `;
    panel.innerHTML = `
      <div style="font-size:.7rem;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">🎰 Gamble Mode</div>
      <div style="font-size:1rem;font-weight:700;color:#58a6ff;margin-bottom:4px">Turn ${currentTurn}/${numPlayers}: ${playerName}</div>
      <div style="font-size:.82rem;color:#3fb950;margin-bottom:12px">Prize pool: <strong>${prizePool}</strong> 🪙</div>
      <label style="font-size:.78rem;color:#8b949e;display:block;margin-bottom:4px">Score achieved:</label>
      <input id="__gt-score" type="number" min="0" value="0" style="
        width:100%;background:#161b22;border:1px solid #30363d;border-radius:8px;
        color:#e6edf3;padding:6px 10px;font-size:.9rem;margin-bottom:10px;box-sizing:border-box;
      ">
      <button id="__gt-done" style="
        width:100%;background:linear-gradient(135deg,#238636,#2ea043);
        border:none;border-radius:8px;color:#fff;font-size:.88rem;
        font-weight:700;padding:9px;cursor:pointer;
      ">✓ ${currentTurn < numPlayers ? 'Record & Next Player' : 'Declare Winner'}</button>
      <button id="__gt-cancel" style="
        width:100%;background:none;border:none;color:#6e7681;
        font-size:.75rem;cursor:pointer;margin-top:8px;text-decoration:underline;
      ">Cancel & Refund</button>
    `;
    document.body.appendChild(panel);

    document.getElementById('__gt-done').addEventListener('click', _handleTurnDone);
    document.getElementById('__gt-cancel').addEventListener('click', _handleGambleCancel);
  }

  async function _handleTurnDone() {
    const scoreEl = document.getElementById('__gt-score');
    const score = parseInt(scoreEl?.value || '0', 10) || 0;
    const btn = document.getElementById('__gt-done');
    btn.disabled = true; btn.textContent = '⏳ Saving...';

    const { roomId, currentTurn, numPlayers, players, prizePool } = _gambleState;

    // Submit score for this player
    if (roomId) {
      try { await GambleSystem.submitScore(roomId, score); } catch (_) {}
    }
    _gambleState.players[currentTurn - 1].score = score;

    if (currentTurn >= numPlayers) {
      // All players done — find winner
      const winner = _gambleState.players.reduce((best, p, i) =>
        (p.score || 0) > (best.score || 0) ? { ...p, idx: i } : best,
        { ..._gambleState.players[0], idx: 0 }
      );

      if (roomId) {
        try {
          await GambleSystem.declareWinner(roomId, window.__currentUserId, winner.score || 0);
        } catch (_) {}
      }

      const panel = document.getElementById('__gamble-turn-panel');
      if (panel) panel.remove();
      _showWinnerPanel(winner.name || `Player ${winner.idx + 1}`, winner.score || 0, prizePool);
    } else {
      // Move to next player
      _gambleState.currentTurn++;
      _showTurnPanel();
    }
  }

  async function _handleGambleCancel() {
    const { roomId } = _gambleState;
    if (roomId) {
      try { await GambleSystem.cancelRoom(roomId); } catch (_) {}
    }
    _resetGamble();
    alert('Room cancelled. All entry fees have been refunded.');
  }

  function _showWinnerPanel(winnerName, score, prize) {
    const panel = document.createElement('div');
    panel.id = '__gamble-winner-panel';
    panel.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;
      display:flex;align-items:center;justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    `;
    panel.innerHTML = `
      <div style="background:#0d1117;border:2px solid #3fb950;border-radius:20px;padding:40px 32px;max-width:360px;width:90%;text-align:center;color:#e6edf3;animation:pop .3s ease;">
        <style>@keyframes pop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}</style>
        <div style="font-size:4rem;margin-bottom:12px">🏆</div>
        <div style="font-size:1.6rem;font-weight:800;margin-bottom:8px">Winner!</div>
        <div style="font-size:1.2rem;color:#58a6ff;margin-bottom:4px">${winnerName}</div>
        <div style="font-size:.85rem;color:#8b949e;margin-bottom:16px">Score: ${score}</div>
        <div style="font-size:2.4rem;font-weight:800;color:#3fb950;margin-bottom:8px">+${prize} 🪙</div>
        <p style="color:#8b949e;font-size:.82rem;margin-bottom:24px">${prize} codes deposited to winner's account via Ledger</p>
        <button id="__gw-back" style="background:linear-gradient(135deg,#238636,#2ea043);border:none;border-radius:10px;color:#fff;font-size:1rem;font-weight:700;padding:12px 32px;cursor:pointer;">← Back to Games</button>
      </div>
    `;
    document.body.appendChild(panel);
    document.getElementById('__gw-back').addEventListener('click', () => {
      panel.remove();
      _resetGamble();
      backToGames.click();
    });
  }

  // ── Game Error / Helpers ──────────────────────────────────────────
  function showGameError(message) {
    gameLoading.style.display = 'none';
    gameError.classList.remove('hidden');
    errorMessage.textContent = message;
  }

  function showError(message) {
    const d = document.createElement('div');
    d.className = 'loading-state';
    d.innerHTML = `<div style="font-size:3rem;margin-bottom:1rem">⚠️</div><p style="color:var(--danger)">${message}</p>`;
    gamesGrid.appendChild(d);
  }

  function initChat(gameId) {
    if (textChat) textChat.disconnect();
    textChat = new TextChat(gameId, currentUsername);
    chatMessages.innerHTML = '';
    textChat.onMessage(msg => {
      const div = document.createElement('div');
      div.className = 'chat-message';
      div.innerHTML = `<span class="sender">${msg.sender}:</span> ${escapeHtml(msg.text)}`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    initVoiceChat(gameId);
  }

  function initVoiceChat(gameId) {
    if (voiceChat) voiceChat.disconnect?.();
    voiceChat = new VoiceChat(gameId, currentUserId);
    voiceChat.init().then(ok => {
      if (ok) {
        window.addEventListener('voice-stream-added', e => addVideoStream(e.detail.peerId, e.detail.stream));
        window.addEventListener('voice-stream-removed', e => removeVideoStream(e.detail.peerId));
      }
    });
    toggleVideoBtn.addEventListener('click', async () => {
      if (!voiceChat) return;
      if (!voiceChat.localStream) {
        try { await voiceChat.startLocalStream(true); addVideoStream('local', voiceChat.localStream); videoOverlay.classList.remove('hidden'); }
        catch (e) { console.error('Failed to start video:', e); }
      } else {
        const off = voiceChat.toggleVideo();
        toggleVideoBtn.style.opacity = off ? '0.5' : '1';
      }
    });
    toggleMuteBtn.addEventListener('click', () => {
      if (voiceChat?.localStream) { const m = voiceChat.toggleMute(); toggleMuteBtn.style.opacity = m ? '0.5' : '1'; }
    });
  }

  function addVideoStream(peerId, stream) {
    const vc = document.createElement('div');
    vc.className = 'video-container'; vc.id = `video-${peerId}`;
    const v = document.createElement('video');
    v.autoplay = true; v.playsInline = true; v.muted = peerId === 'local'; v.srcObject = stream;
    const lbl = document.createElement('div');
    lbl.className = 'video-label'; lbl.textContent = peerId === 'local' ? 'You' : `Player ${peerId.substring(0, 6)}`;
    vc.appendChild(v); vc.appendChild(lbl);
    const container = peerId === 'local' ? document.getElementById('localVideoContainer') : document.getElementById('remoteVideoContainer');
    if (peerId === 'local') container.innerHTML = '';
    container.appendChild(vc);
    videoOverlay.classList.remove('hidden');
  }

  function removeVideoStream(peerId) {
    const el = document.getElementById(`video-${peerId}`);
    if (el) el.remove();
    if (!document.getElementById('remoteVideoContainer').children.length && !document.getElementById('localVideoContainer').children.length) {
      videoOverlay.classList.add('hidden');
    }
  }

  function escapeHtml(text) {
    const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
  }

  function showLeaderboard(gameId, period = 'all') {
    const scores = leaderboard.getTopPlayers(gameId);
    if (!scores.length) {
      leaderboardList.innerHTML = '<div class="leaderboard-empty">No scores yet. Be the first!</div>';
    } else {
      leaderboardList.innerHTML = scores.slice(0, 10).map((s, i) =>
        `<div class="entry"><span><strong>${i + 1}.</strong> ${s.username}</span><span style="color:var(--primary);font-weight:600">${s.score}</span></div>`
      ).join('');
    }
  }

  // ── Listen for GAME_OVER postMessage from iframe ──────────────────
  window.addEventListener('message', async (e) => {
    if (!e.data || e.data.type !== 'GAME_OVER') return;
    if (!_gambleState.active || !_gambleState.roomId) return;

    const { score, winner } = e.data;

    if (winner !== undefined) {
      // Game reports direct winner (chess, tic-tac-toe, etc.)
      const winnerPlayer = _gambleState.players[winner - 1] || _gambleState.players[0];
      try {
        await GambleSystem.declareWinner(_gambleState.roomId, window.__currentUserId, score || 0);
      } catch (_) {}
      const p = document.getElementById('__gamble-turn-panel');
      if (p) p.remove();
      _showWinnerPanel(winnerPlayer.name, score || 0, _gambleState.prizePool);
    } else if (score !== undefined) {
      // Score-based game — record and advance turn
      const scoreInput = document.getElementById('__gt-score');
      if (scoreInput) scoreInput.value = score;
    }
  });

  // ── Event Listeners ───────────────────────────────────────────────
  searchInput.addEventListener('input', filterGames);

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.category;
      filterGames();
    });
  });

  backToGames.addEventListener('click', () => {
    _resetGamble();
    gameContainer.classList.add('hidden');
    dashboardView.style.display = 'block';
    gameFrame.src = '';
    if (textChat) { textChat.disconnect(); textChat = null; }
    chatOverlay.classList.add('hidden');
    leaderboardOverlay.classList.add('hidden');
    videoOverlay.classList.add('hidden');
    currentGameData = null;
  });

  retryGame.addEventListener('click', () => { if (currentGameData) launchGame(currentGameData); });

  sendBtn.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (text && textChat) { textChat.sendMessage(text); chatInput.value = ''; }
  });

  chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendBtn.click(); });
  toggleChatBtn.addEventListener('click', () => chatOverlay.classList.toggle('hidden'));
  closeChat.addEventListener('click', () => chatOverlay.classList.add('hidden'));
  toggleLeaderboardBtn.addEventListener('click', () => leaderboardOverlay.classList.toggle('hidden'));
  closeLeaderboard.addEventListener('click', () => leaderboardOverlay.classList.add('hidden'));

  leaderboardTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      leaderboardTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (currentGameData) showLeaderboard(currentGameData.id, tab.dataset.period);
    });
  });

  toggleMuteBtn.addEventListener('click', () => {
    if (voiceChat) { const m = voiceChat.toggleMute(); toggleMuteBtn.style.opacity = m ? '0.5' : '1'; }
  });
  toggleVideoBtn.addEventListener('click', () => {
    if (voiceChat) { const o = voiceChat.toggleVideo(); toggleVideoBtn.style.opacity = o ? '0.5' : '1'; }
  });
  closeVideo.addEventListener('click', () => videoOverlay.classList.add('hidden'));

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) gameContainer.requestFullscreen();
    else document.exitFullscreen();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !gameContainer.classList.contains('hidden')) {
      if (document.fullscreenElement) document.exitFullscreen();
      else backToGames.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchInput.focus(); }
  });

  window.addEventListener('leaderboard-updated', e => {
    if (currentGameData && e.detail.gameId === currentGameData.id) showLeaderboard(currentGameData.id);
  });

  await loadManifest();
});
