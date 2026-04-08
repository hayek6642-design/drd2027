/**
 * Games Dashboard UI Component
 * Main interface for game selection and management
 */

class GamesDashboard {
  constructor() {
    this.element = null;
    this.gameEngine = null;
    this.gameRegistry = null;
    this.modeRegistry = null;
    this.competitionEngine = null;
    this.currentGame = null;
    this.currentMode = null;
    this.eventListeners = new Map();
  }

  /**
   * Initialize the dashboard
   */
  init(elementId, gameEngine) {
    this.element = document.getElementById(elementId);
    if (!this.element) {
      throw new Error(`Dashboard element not found: ${elementId}`);
    }

    this.gameEngine = gameEngine;
    this.gameRegistry = gameEngine.gameRegistry;
    this.modeRegistry = gameEngine.modeRegistry;
    this.competitionEngine = gameEngine.competitionEngine;

    this.render();
    this.setupEventListeners();

    console.log('[GamesDashboard] Initialized');
    this.emit('dashboard:ready');
  }

  /**
   * Render the dashboard UI
   */
  render() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="games-dashboard">
        <div class="dashboard-header">
          <h1>Games Centre</h1>
          <div class="dashboard-controls">
            <button id="refreshGames" class="btn">Refresh Games</button>
            <button id="createChallenge" class="btn btn-primary">Create Challenge</button>
          </div>
        </div>

        <div class="dashboard-content">
          <div class="games-grid" id="gamesGrid">
            <!-- Games will be loaded here -->
          </div>

          <div class="game-details-panel" id="gameDetailsPanel" style="display: none;">
            <div class="game-details-header">
              <h2 id="gameDetailsTitle">Game Details</h2>
              <button id="closeGameDetails" class="btn-close">×</button>
            </div>
            <div class="game-details-content">
              <div class="game-modes" id="gameModes">
                <h3>Select Game Mode</h3>
                <div class="mode-options" id="modeOptions">
                  <!-- Modes will be loaded here -->
                </div>
              </div>

              <div class="game-services" id="gameServices" style="display: none;">
                <h3>Communication Services</h3>
                <div class="service-options">
                  <label>
                    <input type="checkbox" id="enableTextChat" checked> Text Chat
                  </label>
                  <label>
                    <input type="checkbox" id="enableAudio" checked> Audio Call
                  </label>
                  <label>
                    <input type="checkbox" id="enableVideo"> Video Call
                  </label>
                </div>
              </div>

              <button id="startGame" class="btn btn-primary">Start Game</button>
            </div>
          </div>
        </div>

        <div class="challenges-panel" id="challengesPanel">
          <h2>Active Challenges</h2>
          <div class="challenges-list" id="challengesList">
            <!-- Challenges will be loaded here -->
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh games
    this.element.querySelector('#refreshGames')?.addEventListener('click', () => {
      this.loadGames();
    });

    // Create challenge
    this.element.querySelector('#createChallenge')?.addEventListener('click', () => {
      this.showChallengeCreation();
    });

    // Close game details
    this.element.querySelector('#closeGameDetails')?.addEventListener('click', () => {
      this.hideGameDetails();
    });

    // Start game
    this.element.querySelector('#startGame')?.addEventListener('click', () => {
      this.startSelectedGame();
    });

    // Game engine events
    this.gameEngine.on('game:registered', () => this.loadGames());
    this.gameEngine.on('game:started', (session) => this.onGameStarted(session));
    this.gameEngine.on('game:ended', (session) => this.onGameEnded(session));

    // Competition engine events
    this.competitionEngine.on('challenge:created', () => this.loadChallenges());
    this.competitionEngine.on('challenge:accepted', () => this.loadChallenges());
    this.competitionEngine.on('match:started', () => this.loadChallenges());
  }

  /**
   * Load all registered games
   */
  loadGames() {
    const gamesGrid = this.element.querySelector('#gamesGrid');
    if (!gamesGrid) return;

    const games = this.gameRegistry.getAllGames();

    if (games.length === 0) {
      gamesGrid.innerHTML = '<p class="no-games">No games available</p>';
      return;
    }

    gamesGrid.innerHTML = games.map(game => `
      <div class="game-card" data-game-id="${game.gameId}">
        <div class="game-card-header">
          <h3>${game.metadata.title}</h3>
          <span class="game-category">${game.metadata.category}</span>
        </div>
        <div class="game-card-body">
          <p>${game.metadata.description}</p>
        </div>
        <div class="game-card-footer">
          <button class="btn btn-play" data-game-id="${game.gameId}">Play</button>
          <button class="btn btn-details" data-game-id="${game.gameId}">Details</button>
        </div>
      </div>
    `).join('');

    // Add event listeners to game cards
    gamesGrid.querySelectorAll('.btn-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gameId = e.target.getAttribute('data-game-id');
        this.showGameDetails(gameId);
      });
    });

    gamesGrid.querySelectorAll('.btn-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gameId = e.target.getAttribute('data-game-id');
        this.showGameDetails(gameId);
      });
    });
  }

  /**
   * Show game details panel
   */
  showGameDetails(gameId) {
    this.currentGame = gameId;
    const gameDetailsPanel = this.element.querySelector('#gameDetailsPanel');
    const gameDetailsTitle = this.element.querySelector('#gameDetailsTitle');

    if (!gameDetailsPanel) return;

    const game = this.gameRegistry.getGame(gameId);
    const metadata = this.gameRegistry.getMetadata(gameId);

    gameDetailsTitle.textContent = metadata.title;
    gameDetailsPanel.style.display = 'block';

    // Load available modes
    this.loadGameModes();
  }

  /**
   * Hide game details panel
   */
  hideGameDetails() {
    const gameDetailsPanel = this.element.querySelector('#gameDetailsPanel');
    if (gameDetailsPanel) {
      gameDetailsPanel.style.display = 'none';
    }
    this.currentGame = null;
    this.currentMode = null;
  }

  /**
   * Load available game modes
   */
  loadGameModes() {
    const modeOptions = this.element.querySelector('#modeOptions');
    if (!modeOptions) return;

    const modes = this.modeRegistry.getAllModes();

    modeOptions.innerHTML = modes.map(mode => `
      <div class="mode-option">
        <label>
          <input type="radio" name="gameMode" value="${mode.modeId}"
                 data-mode-id="${mode.modeId}">
          ${mode.metadata.title} - ${mode.metadata.description}
        </label>
      </div>
    `).join('');

    // Show services section for multiplayer mode
    const gameServices = this.element.querySelector('#gameServices');
    if (gameServices) {
      modeOptions.querySelectorAll('input[name="gameMode"]').forEach(input => {
        input.addEventListener('change', (e) => {
          const selectedMode = e.target.getAttribute('data-mode-id');
          this.currentMode = selectedMode;

          // Show services for multiplayer, hide for others
          if (selectedMode === 'multiplayer') {
            gameServices.style.display = 'block';
          } else {
            gameServices.style.display = 'none';
          }
        });
      });
    }
  }

  /**
   * Start the selected game
   */
  async startSelectedGame() {
    if (!this.currentGame || !this.currentMode) {
      alert('Please select a game and mode first');
      return;
    }

    const gameServices = this.element.querySelector('#gameServices');
    const servicesConfig = {};

    if (gameServices && gameServices.style.display !== 'none') {
      servicesConfig.text = this.element.querySelector('#enableTextChat')?.checked || false;
      servicesConfig.audio = this.element.querySelector('#enableAudio')?.checked || false;
      servicesConfig.video = this.element.querySelector('#enableVideo')?.checked || false;
    }

    try {
      // Start the game
      const session = await this.gameEngine.startGame(
        this.currentGame,
        this.currentMode,
        { services: servicesConfig }
      );

      console.log('[GamesDashboard] Game started:', session);
      this.emit('game:started', session);
    } catch (error) {
      console.error('[GamesDashboard] Failed to start game:', error);
      alert(`Failed to start game: ${error.message}`);
    }
  }

  /**
   * Show challenge creation UI
   */
  showChallengeCreation() {
    // This would open a modal or separate UI for challenge creation
    console.log('[GamesDashboard] Show challenge creation UI');
    this.emit('show-challenge-creation');
  }

  /**
   * Load active challenges
   */
  loadChallenges() {
    const challengesList = this.element.querySelector('#challengesList');
    if (!challengesList) return;

    const challenges = this.competitionEngine.getActiveChallenges();

    if (challenges.length === 0) {
      challengesList.innerHTML = '<p class="no-challenges">No active challenges</p>';
      return;
    }

    challengesList.innerHTML = challenges.map(challenge => `
      <div class="challenge-card">
        <div class="challenge-header">
          <h4>${challenge.gameId} Challenge</h4>
          <span class="challenge-status">${challenge.status}</span>
        </div>
        <div class="challenge-body">
          <p>Created by: ${challenge.creator}</p>
          <p>Players: ${challenge.players.length}/2</p>
          <p>Mode: ${challenge.mode}</p>
          <p>Value: ${challenge.valueMode}</p>
        </div>
        <div class="challenge-footer">
          <button class="btn btn-accept" data-challenge-id="${challenge.id}">Accept</button>
          <button class="btn btn-reject" data-challenge-id="${challenge.id}">Reject</button>
        </div>
      </div>
    `).join('');

    // Add event listeners to challenge buttons
    challengesList.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const challengeId = e.target.getAttribute('data-challenge-id');
        this.acceptChallenge(challengeId);
      });
    });

    challengesList.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const challengeId = e.target.getAttribute('data-challenge-id');
        this.rejectChallenge(challengeId);
      });
    });
  }

  /**
   * Accept a challenge
   */
  acceptChallenge(challengeId) {
    const playerId = `player_${Math.floor(Math.random() * 10000)}`;

    try {
      this.competitionEngine.acceptChallenge(challengeId, playerId);
      console.log(`[GamesDashboard] Challenge accepted: ${challengeId}`);
    } catch (error) {
      console.error(`[GamesDashboard] Failed to accept challenge:`, error);
      alert(`Failed to accept challenge: ${error.message}`);
    }
  }

  /**
   * Reject a challenge
   */
  rejectChallenge(challengeId) {
    // In a real implementation, this would notify the creator
    console.log(`[GamesDashboard] Challenge rejected: ${challengeId}`);
    alert('Challenge rejected');
  }

  /**
   * Handle game started event
   */
  onGameStarted(session) {
    console.log('[GamesDashboard] Game started event:', session);
    // Hide dashboard and show game interface
    this.element.style.display = 'none';
  }

  /**
   * Handle game ended event
   */
  onGameEnded(session) {
    console.log('[GamesDashboard] Game ended event:', session);
    // Show dashboard again
    this.element.style.display = 'block';
    this.loadGames();
    this.loadChallenges();
  }

  /**
   * Event system
   */
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.eventListeners.get(event) || [];
    handlers.forEach(handler => handler(data));

    // Also emit as DOM event
    window.dispatchEvent(new CustomEvent(`games-dashboard:${event}`, {
      detail: data
    }));
  }
}

// Singleton instance
const gamesDashboard = new GamesDashboard();
export default gamesDashboard;