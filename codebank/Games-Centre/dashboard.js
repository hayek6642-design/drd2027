// Simple dashboard implementation without module imports
// to avoid CORS and module resolution issues

document.addEventListener('DOMContentLoaded', async () => {
  // Simple user context
  const currentUserId = `guest_${Math.floor(Math.random() * 10000)}`;
  const currentUsername = `Guest${Math.floor(Math.random() * 1000)}`;

  // Simple leaderboard mock
  const leaderboard = {
    getTopPlayers: (gameId) => [],
    updateScore: (gameId, userId, score, username) => {}
  };

  // Simple communication mock
  class TextChat {
    constructor(gameId, username) {
      this.gameId = gameId;
      this.username = username;
      this.listeners = [];
    }

    sendMessage(text) {
      const msg = {
        id: Date.now().toString(),
        sender: this.username,
        text,
        timestamp: new Date().toISOString()
      };
      this.notify(msg);
    }

    onMessage(callback) {
      this.listeners.push(callback);
    }

    notify(msg) {
      this.listeners.forEach(cb => cb(msg));
    }

    disconnect() {}
  }

  class VoiceChat {
    constructor(roomId, userId) {
      this.roomId = roomId;
      this.userId = userId;
    }

    async init() {
      return false; // Voice chat disabled for now
    }

    startLocalStream() {
      return Promise.reject('Voice chat not available');
    }

    toggleMute() {
      return false;
    }

    toggleVideo() {
      return true;
    }
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

  // Overlay elements
  const chatOverlay = document.getElementById('chatOverlay');
  const videoOverlay = document.getElementById('videoOverlay');
  const leaderboardOverlay = document.getElementById('leaderboardOverlay');
  const toggleChatBtn = document.getElementById('toggleChatBtn');
  const toggleLeaderboardBtn = document.getElementById('toggleLeaderboardBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  // Chat elements
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendMessage');
  const closeChat = document.getElementById('closeChat');

  // Video elements
  const toggleVideoBtn = document.getElementById('toggleVideo');
  const toggleMuteBtn = document.getElementById('toggleMute');
  const closeVideo = document.getElementById('closeVideo');

  // Leaderboard elements
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

  // Category mapping
  const categoryByName = {
    'american-roulette': 'casino',
    'spinner': 'casino',
    'billiard': 'arcade',
    'car-race': 'action',
    'river-raid': 'action',
    'chess': 'board',
    'chess-nexus': 'board',
    'dominos': 'board',
    'tic-tac-toe': 'board',
    'snake-ladder': 'board',
    'solitaire': 'classic',
    'tetris': 'classic',
    'snake': 'classic',
    'pubgy-kids': 'action'
  };

  // Load manifest
  async function loadManifest() {
    try {
      loadingState.classList.remove('hidden');
      const response = await fetch('./core/dashboard-manifest.json');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Manifest not found`);
      }

      const data = await response.json();
      const entries = Array.isArray(data) ? data : (data.vanilla || []);

      allGames = entries.map(({ name, path }) => {
        const title = (name || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return {
          id: name,
          title,
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

  // Generate SVG thumbnail
  function generateThumbnail(title) {
    const initial = title.charAt(0).toUpperCase();
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[initial.charCodeAt(0) % colors.length];

    return `data:image/svg+xml;base64,${btoa(`
            <svg width="280" height="180" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#0a0e27;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grad)"/>
                <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="64" 
                      fill="white" text-anchor="middle" dy=".3em" opacity="0.9">${initial}</text>
            </svg>
        `)}`;
  }

  // Render games
  function renderGames() {
    gamesGrid.innerHTML = '';

    if (filteredGames.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    filteredGames.forEach((game, index) => {
      const card = template.cloneNode(true);
      const gameCard = card.querySelector('.game-card');
      const img = card.querySelector('img');

      img.src = game.thumbnail;
      img.alt = game.title;

      card.querySelector('.game-title').textContent = game.title;
      card.querySelector('.game-category').textContent = game.category;
      card.querySelector('.game-description').textContent = game.description;

      const playBtn = card.querySelector('.play-btn');
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        launchGame(game);
      });

      gameCard.addEventListener('click', () => launchGame(game));

      // Stagger animation
      gameCard.style.animationDelay = `${index * 0.05}s`;

      gamesGrid.appendChild(card);
    });
  }

  // Filter games
  function filterGames() {
    const query = searchInput.value.toLowerCase();

    filteredGames = allGames.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(query) ||
        game.description.toLowerCase().includes(query);
      const matchesCategory = currentFilter === 'all' || game.category === currentFilter;
      return matchesSearch && matchesCategory;
    });

    renderGames();
  }

  // Launch game
  async function launchGame(game) {
    currentGameData = game;
    let gameSrc = game.url;

    // React path fix
    if (game.url.includes('/client/index.html')) {
      gameSrc = game.url.replace('/client/index.html', '/client/dist/index.html');
    }

    // Show game container
    dashboardView.style.display = 'none';
    gameContainer.classList.remove('hidden');
    currentGameTitle.textContent = game.title;
    gameError.classList.add('hidden');
    gameLoading.style.display = 'flex';

    // Set iframe source
    gameFrame.src = gameSrc;

    // Handle iframe load
    gameFrame.onload = () => {
      console.log('Game frame loaded:', game.title);

      // Inject game loader into the iframe
      try {
        const gameDoc = gameFrame.contentDocument || gameFrame.contentWindow.document;
        const loaderScript = gameDoc.createElement('script');
        loaderScript.src = './core/js/game-loader.js';
        loaderScript.onload = () => {
          console.log('Game loader injected successfully');
          gameLoading.style.display = 'none';
        };
        loaderScript.onerror = () => {
          console.error('Failed to inject game loader');
          gameLoading.style.display = 'none';
        };
        gameDoc.head.appendChild(loaderScript);
      } catch (e) {
        console.error('Error injecting game loader:', e);
        gameLoading.style.display = 'none';
      }
    };

    gameFrame.onerror = () => {
      showGameError('Failed to load game. Please try again.');
    };

    // Initialize chat
    initChat(game.id);

    // Show leaderboard
    showLeaderboard(game.id);
  }

  // Show game error
  function showGameError(message) {
    gameLoading.style.display = 'none';
    gameError.classList.remove('hidden');
    errorMessage.textContent = message;
  }

  // Show general error
  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'loading-state';
    errorDiv.innerHTML = `
            <div class="error-icon" style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <p style="color: var(--danger);">${message}</p>
        `;
    gamesGrid.appendChild(errorDiv);
  }

  // Initialize chat
  function initChat(gameId) {
    if (textChat) textChat.disconnect();

    textChat = new TextChat(gameId, currentUsername);
    chatMessages.innerHTML = '';

    textChat.onMessage((msg) => {
      const div = document.createElement('div');
      div.className = 'chat-message';
      div.innerHTML = `<span class="sender">${msg.sender}:</span> ${escapeHtml(msg.text)}`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    // Initialize voice chat
    initVoiceChat(gameId);
  }

  // Initialize voice chat
  function initVoiceChat(gameId) {
    if (voiceChat) {
      voiceChat.disconnect();
    }

    voiceChat = new VoiceChat(gameId, currentUserId);

    // Initialize voice chat
    voiceChat.init().then(success => {
      if (success) {
        console.log('Voice chat initialized');

        // Set up event listeners for voice streams
        window.addEventListener('voice-stream-added', (e) => {
          const { peerId, stream } = e.detail;
          addVideoStream(peerId, stream);
        });

        window.addEventListener('voice-stream-removed', (e) => {
          const { peerId } = e.detail;
          removeVideoStream(peerId);
        });
      }
    });

    // Set up video overlay controls
    toggleVideoBtn.addEventListener('click', async () => {
      if (!voiceChat) return;

      if (!voiceChat.localStream) {
        try {
          await voiceChat.startLocalStream(true);
          addVideoStream('local', voiceChat.localStream);
          videoOverlay.classList.remove('hidden');
        } catch (e) {
          console.error('Failed to start video:', e);
        }
      } else {
        const off = voiceChat.toggleVideo();
        toggleVideoBtn.style.opacity = off ? '0.5' : '1';
      }
    });

    toggleMuteBtn.addEventListener('click', () => {
      if (voiceChat && voiceChat.localStream) {
        const muted = voiceChat.toggleMute();
        toggleMuteBtn.style.opacity = muted ? '0.5' : '1';
      }
    });
  }

  // Add video stream to UI
  function addVideoStream(peerId, stream) {
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    videoContainer.id = `video-${peerId}`;

    const videoElement = document.createElement('video');
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.muted = peerId === 'local';
    videoElement.srcObject = stream;

    const label = document.createElement('div');
    label.className = 'video-label';
    label.textContent = peerId === 'local' ? 'You' : `Player ${peerId.substring(0, 6)}`;

    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(label);

    if (peerId === 'local') {
      const localVideoContainer = document.getElementById('localVideoContainer');
      localVideoContainer.innerHTML = '';
      localVideoContainer.appendChild(videoContainer);
    } else {
      const remoteVideoContainer = document.getElementById('remoteVideoContainer');
      remoteVideoContainer.appendChild(videoContainer);
    }

    videoOverlay.classList.remove('hidden');
  }

  // Remove video stream from UI
  function removeVideoStream(peerId) {
    const videoElement = document.getElementById(`video-${peerId}`);
    if (videoElement) {
      videoElement.remove();
    }

    // If no more streams, hide overlay
    if (document.getElementById('remoteVideoContainer').children.length === 0 &&
        document.getElementById('localVideoContainer').children.length === 0) {
      videoOverlay.classList.add('hidden');
    }
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show leaderboard
  function showLeaderboard(gameId, period = 'all') {
    const scores = leaderboard.getTopPlayers(gameId);

    if (scores.length === 0) {
      leaderboardList.innerHTML = '<div class="leaderboard-empty">No scores yet. Be the first!</div>';
    } else {
      leaderboardList.innerHTML = scores.slice(0, 10).map((s, i) => `
                <div class="entry">
                    <span>
                        <strong>${i + 1}.</strong> ${s.username}
                    </span>
                    <span style="color: var(--primary); font-weight: 600;">${s.score}</span>
                </div>
            `).join('');
    }
  }

  // Event Listeners

  // Search
  searchInput.addEventListener('input', filterGames);

  // Category filters
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.category;
      filterGames();
    });
  });

  // Back to games
  backToGames.addEventListener('click', () => {
    gameContainer.classList.add('hidden');
    dashboardView.style.display = 'block';
    gameFrame.src = '';

    if (textChat) {
      textChat.disconnect();
      textChat = null;
    }

    chatOverlay.classList.add('hidden');
    leaderboardOverlay.classList.add('hidden');
    videoOverlay.classList.add('hidden');

    currentGameData = null;
  });

  // Retry game
  retryGame.addEventListener('click', () => {
    if (currentGameData) {
      launchGame(currentGameData);
    }
  });

  // Chat controls
  sendBtn.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (text && textChat) {
      textChat.sendMessage(text);
      chatInput.value = '';
    }
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendBtn.click();
    }
  });

  toggleChatBtn.addEventListener('click', () => {
    chatOverlay.classList.toggle('hidden');
  });

  closeChat.addEventListener('click', () => {
    chatOverlay.classList.add('hidden');
  });

  // Leaderboard controls
  toggleLeaderboardBtn.addEventListener('click', () => {
    leaderboardOverlay.classList.toggle('hidden');
  });

  closeLeaderboard.addEventListener('click', () => {
    leaderboardOverlay.classList.add('hidden');
  });

  leaderboardTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      leaderboardTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (currentGameData) {
        showLeaderboard(currentGameData.id, tab.dataset.period);
      }
    });
  });

  // Video controls (placeholder for now)
  toggleMuteBtn.addEventListener('click', () => {
    if (voiceChat) {
      const muted = voiceChat.toggleMute();
      toggleMuteBtn.style.opacity = muted ? '0.5' : '1';
    }
  });

  toggleVideoBtn.addEventListener('click', () => {
    if (voiceChat) {
      const off = voiceChat.toggleVideo();
      toggleVideoBtn.style.opacity = off ? '0.5' : '1';
    }
  });

  closeVideo.addEventListener('click', () => {
    videoOverlay.classList.add('hidden');
  });

  // Fullscreen
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      gameContainer.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // ESC to close game
    if (e.key === 'Escape' && !gameContainer.classList.contains('hidden')) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        backToGames.click();
      }
    }

    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Listen for leaderboard updates
  window.addEventListener('leaderboard-updated', (e) => {
    if (currentGameData && e.detail.gameId === currentGameData.id) {
      showLeaderboard(currentGameData.id);
    }
  });

  // Initialize
  await loadManifest();
});