/**
 * Dashboard Integration for Games Centre
 * 
 * ARCHITECTURE COMPLIANCE:
 * ✅ All balance reads are display-only
 * ✅ No calculations based on balances
 * ✅ All modifications go through Assets Bus
 * ✅ No direct Neon DB access
 * ✅ UI only triggers actions, never executes them
 */

import { GameWrapper } from './core/js/game-wrapper.js';
import { leaderboard } from './core/js/leaderboard.js';
import { VoiceChat, TextChat } from './core/js/communication.js';
import { bettingCore, GAME_MODES } from './core/js/betting-core.js';
import { lobbyManager, LOBBY_STATUS } from './core/js/lobby-manager.js';
import { matchmaker } from './core/js/matchmaking.js';
import { presence, USER_STATUS } from './core/js/presence.js';
import { fairPlay } from './core/js/fair-play.js';
import { assetsBus } from './core/js/assets-bus-adapter.js';

// User context
let userContext;
try {
    const module = await import('../context/user-context.js');
    userContext = module.userContext;
} catch (e) {
    userContext = null;
}

const currentUserId = (userContext && userContext.userId)
    ? userContext.userId
    : `guest_${Math.floor(Math.random() * 10000)}`;
const currentUsername = (userContext && userContext.username)
    ? userContext.username
    : `Guest${Math.floor(Math.random() * 1000)}`;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize presence
    presence.setOnline(currentUserId, currentUsername);

    // DOM Elements - Dashboard
    const dashboardView = document.getElementById('dashboardView');
    const gamesGrid = document.getElementById('gamesGrid');
    const searchInput = document.getElementById('searchGames');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const template = document.getElementById('gameCardTemplate').content;

    // DOM Elements - Game Container
    const gameContainer = document.getElementById('gameContainer');
    const gameFrame = document.getElementById('gameFrame');
    const backToGames = document.getElementById('backToGames');
    const currentGameTitle = document.getElementById('currentGameTitle');
    const gameLoading = document.getElementById('gameLoading');
    const gameError = document.getElementById('gameError');
    const errorMessage = document.getElementById('errorMessage');
    const retryGame = document.getElementById('retryGame');

    // DOM Elements - Overlays
    const chatOverlay = document.getElementById('chatOverlay');
    const leaderboardOverlay = document.getElementById('leaderboardOverlay');
    const toggleChatBtn = document.getElementById('toggleChatBtn');
    const toggleLeaderboardBtn = document.getElementById('toggleLeaderboardBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    // DOM Elements - Chat
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendMessage');
    const closeChat = document.getElementById('closeChat');

    // DOM Elements - Leaderboard
    const leaderboardList = document.getElementById('leaderboardList');
    const closeLeaderboard = document.getElementById('closeLeaderboard');
    const leaderboardTabs = document.querySelectorAll('.tab-btn');

    // DOM Elements - Lobby (will be created)
    let lobbyView = document.getElementById('lobbyView');
    let betSelectionModal = document.getElementById('betSelectionModal');

    // State
    let allGames = [];
    let filteredGames = [];
    let currentFilter = 'all';
    let currentGameWrapper = null;
    let textChat = null;
    let voiceChat = null;
    let currentGameData = null;
    let currentLobby = null;
    let userBalance = { code: 0, bars: 0 }; // ✅ READ-ONLY display

    // Category mapping
    const categoryByName = {
        'american-roulette': 'casino', 'spinner': 'casino', 'billiard': 'arcade',
        'car-race': 'action', 'river-raid': 'action', 'chess': 'board',
        'chess-nexus': 'board', 'dominos': 'board', 'tic-tac-toe': 'board',
        'snake-ladder': 'board', 'solitaire': 'classic', 'tetris': 'classic',
        'snake': 'classic', 'pubgy-kids': 'action', 'cards': 'classic'
    };

    // ===== INITIALIZATION =====

    async function init() {
        await loadManifest();
        await updateBalanceDisplay(); // ✅ Read-only for display
        createLobbyUI();
        createBetSelectionUI();
        setupEventListeners();
        startPresenceHeartbeat();
    }

    // ===== BALANCE DISPLAY (READ-ONLY) =====

    async function updateBalanceDisplay() {
        try {
            // ✅ CORRECT: Only reading for display, not for calculations
            const codeBalance = await assetsBus.getBalance(currentUserId, 'code');
            const barsBalance = await assetsBus.getBalance(currentUserId, 'bars');

            userBalance = { code: codeBalance, bars: barsBalance };

            // Update UI
            const balanceDisplay = document.getElementById('balanceDisplay');
            if (balanceDisplay) {
                balanceDisplay.innerHTML = `
                    <div class="balance-item">
                        <span class="balance-icon">💰</span>
                        <span class="balance-amount">${codeBalance.toLocaleString()}</span>
                        <span class="balance-label">Codes</span>
                    </div>
                    <div class="balance-item">
                        <span class="balance-icon">📊</span>
                        <span class="balance-amount">${barsBalance.toLocaleString()}</span>
                        <span class="balance-label">Bars</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        }
    }

    // ===== GAME LOADING =====

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
                    thumbnail: generateThumbnail(title),
                    playersOnline: 0 // Will be updated from presence
                };
            });

            filteredGames = [...allGames];
            loadingState.classList.add('hidden');
            renderGames();
            updateOnlinePlayerCounts();
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

            // Add player count badge
            const badge = document.createElement('div');
            badge.className = 'player-count-badge';
            badge.textContent = `${game.playersOnline} online`;
            card.querySelector('.game-card-content').prepend(badge);

            const playBtn = card.querySelector('.play-btn');

            // Show bet selection on click
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showBetSelection(game);
            });

            gameCard.addEventListener('click', () => showBetSelection(game));
            gameCard.style.animationDelay = `${index * 0.05}s`;

            gamesGrid.appendChild(card);
        });
    }

    // ===== BET SELECTION UI =====

    function createBetSelectionUI() {
        const modal = document.createElement('div');
        modal.id = 'betSelectionModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content bet-selection">
                <div class="modal-header">
                    <h2 id="betGameTitle"></h2>
                    <button class="close-btn" id="closeBetModal">×</button>
                </div>
                <div class="modal-body">
                    <div class="balance-display-section">
                        <h3>Your Balance</h3>
                        <div id="modalBalanceDisplay"></div>
                    </div>
                    
                    <div class="game-mode-selection">
                        <h3>Choose Game Mode</h3>
                        <div class="mode-buttons">
                            <button class="mode-btn" data-mode="practice">
                                <span class="mode-icon">🎮</span>
                                <span class="mode-name">Practice</span>
                                <span class="mode-desc">No betting, just play</span>
                            </button>
                            <button class="mode-btn" data-mode="solo_ai">
                                <span class="mode-icon">🤖</span>
                                <span class="mode-name">vs AI</span>
                                <span class="mode-desc">Play against computer</span>
                            </button>
                            <button class="mode-btn" data-mode="pvp">
                                <span class="mode-icon">⚔️</span>
                                <span class="mode-name">vs Player</span>
                                <span class="mode-desc">Challenge real players</span>
                            </button>
                            <button class="mode-btn" data-mode="quick_match">
                                <span class="mode-icon">⚡</span>
                                <span class="mode-name">Quick Match</span>
                                <span class="mode-desc">Find opponent automatically</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="bet-amount-section hidden" id="betAmountSection">
                        <h3>Bet Amount</h3>
                        <div class="bet-input-group">
                            <input type="number" id="betAmountInput" min="10" max="10000" value="100" step="10">
                            <select id="betAssetSelect">
                                <option value="code">Codes</option>
                                <option value="bars">Bars</option>
                            </select>
                        </div>
                        <div class="bet-presets">
                            <button class="preset-btn" data-amount="10">10</button>
                            <button class="preset-btn" data-amount="50">50</button>
                            <button class="preset-btn" data-amount="100">100</button>
                            <button class="preset-btn" data-amount="500">500</button>
                            <button class="preset-btn" data-amount="1000">1000</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelBet">Cancel</button>
                    <button class="btn btn-primary" id="confirmBet" disabled>Start Game</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        betSelectionModal = modal;

        setupBetSelectionListeners();
    }

    function setupBetSelectionListeners() {
        const modal = betSelectionModal;
        const modeButtons = modal.querySelectorAll('.mode-btn');
        const betAmountSection = modal.querySelector('#betAmountSection');
        const betInput = modal.querySelector('#betAmountInput');
        const confirmBtn = modal.querySelector('#confirmBet');
        const cancelBtn = modal.querySelector('#cancelBet');
        const closeBtn = modal.querySelector('#closeBetModal');
        const presetBtns = modal.querySelectorAll('.preset-btn');

        let selectedMode = null;
        let selectedGame = null;

        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedMode = btn.dataset.mode;

                // Show bet section for modes that require betting
                if (selectedMode === 'practice') {
                    betAmountSection.classList.add('hidden');
                    confirmBtn.disabled = false;
                } else {
                    betAmountSection.classList.remove('hidden');
                    confirmBtn.disabled = false;
                }
            });
        });

        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                betInput.value = btn.dataset.amount;
            });
        });

        confirmBtn.addEventListener('click', async () => {
            const betAmount = selectedMode === 'practice' ? 0 : parseInt(betInput.value);
            const asset = modal.querySelector('#betAssetSelect').value;

            modal.classList.add('hidden');

            if (selectedMode === 'quick_match') {
                await startQuickMatch(selectedGame, betAmount, asset);
            } else if (selectedMode === 'pvp') {
                await createCustomLobby(selectedGame, betAmount, asset);
            } else {
                await launchGame(selectedGame, betAmount, selectedMode, asset);
            }
        });

        cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

        // Store references for showBetSelection
        modal._selectGame = (game) => {
            selectedGame = game;
            modal.querySelector('#betGameTitle').textContent = game.title;
            updateModalBalance();
        };
    }

    function showBetSelection(game) {
        betSelectionModal._selectGame(game);
        betSelectionModal.classList.remove('hidden');
    }

    async function updateModalBalance() {
        // ✅ READ-ONLY balance display
        const codeBalance = await assetsBus.getBalance(currentUserId, 'code');
        const barsBalance = await assetsBus.getBalance(currentUserId, 'bars');

        const display = betSelectionModal.querySelector('#modalBalanceDisplay');
        display.innerHTML = `
            <span>💰 ${codeBalance.toLocaleString()} Codes</span>
            <span>📊 ${barsBalance.toLocaleString()} Bars</span>
        `;
    }

    // ===== GAME LAUNCHING =====

    async function launchGame(game, betAmount = 0, gameMode = GAME_MODES.PRACTICE, asset = 'code', opponents = []) {
        currentGameData = game;
        let gameSrc = game.url;

        if (game.url.includes('/client/index.html')) {
            gameSrc = game.url.replace('/client/index.html', '/client/dist/index.html');
        }

        dashboardView.style.display = 'none';
        gameContainer.classList.remove('hidden');
        currentGameTitle.textContent = game.title;
        gameError.classList.add('hidden');
        gameLoading.style.display = 'flex';

        gameFrame.src = gameSrc;

        // Initialize game wrapper with config
        currentGameWrapper = new GameWrapper(gameFrame, game, currentUserId, {
            betAmount,
            gameMode,
            asset,
            opponents
        });

        gameFrame.onload = async () => {
            console.log('Game frame loaded:', game.title);

            setTimeout(async () => {
                try {
                    const res = await currentGameWrapper.startGame(betAmount, opponents);

                    if (!res.success) {
                        showGameError(`Failed to start game: ${res.error}`);
                    } else {
                        gameLoading.style.display = 'none';

                        // Update balance display after bet is placed
                        await updateBalanceDisplay();
                    }
                } catch (e) {
                    console.error('Game start error:', e);
                    gameLoading.style.display = 'none';
                }
            }, 500);
        };

        gameFrame.onerror = () => {
            showGameError('Failed to load game. Please try again.');
        };

        initChat(game.id);
        showLeaderboard(game.id);

        // Update presence
        presence.setStatus(currentUserId, USER_STATUS.IN_GAME, { gameId: game.id });
    }

    // ===== QUICK MATCH =====

    async function startQuickMatch(game, betAmount, asset) {
        // Show matchmaking UI
        showMatchmakingStatus('Searching for opponent...');

        try {
            const result = await matchmaker.quickMatch(
                currentUserId,
                currentUsername,
                game.id,
                betAmount,
                asset
            );

            if (result.matched) {
                hideMatchmakingStatus();
                // Join the created lobby
                currentLobby = lobbyManager.getLobby(result.lobbyId);
                showLobby(currentLobby);
            } else {
                // Still searching
                updateMatchmakingStatus(`Position in queue: ${result.queuePosition}`);

                // Listen for match found
                window.addEventListener('match-found', (e) => {
                    if (e.detail.userId === currentUserId) {
                        hideMatchmakingStatus();
                        currentLobby = lobbyManager.getLobby(e.detail.lobbyId);
                        showLobby(currentLobby);
                    }
                }, { once: true });
            }
        } catch (error) {
            hideMatchmakingStatus();
            alert('Matchmaking failed: ' + error.message);
        }
    }

    // Continue in next part...

    function showMatchmakingStatus(message) {
        // Create matchmaking overlay
        const overlay = document.createElement('div');
        overlay.id = 'matchmakingOverlay';
        overlay.className = 'modal';
        overlay.innerHTML = `
            <div class="modal-content">
                <div class="matchmaking-status">
                    <div class="spinner"></div>
                    <p id="matchmakingMessage">${message}</p>
                    <button class="btn btn-secondary" id="cancelMatchmaking">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#cancelMatchmaking').addEventListener('click', () => {
            matchmaker.cancelSearch(currentUserId);
            hideMatchmakingStatus();
        });
    }

    function updateMatchmakingStatus(message) {
        const msgEl = document.getElementById('matchmakingMessage');
        if (msgEl) msgEl.textContent = message;
    }

    function hideMatchmakingStatus() {
        const overlay = document.getElementById('matchmakingOverlay');
        if (overlay) overlay.remove();
    }

    // ===== TO BE CONTINUED WITH LOBBY UI, CHAT, ETC =====

    // Initialize
    await init();
});