/**
 * Game Loader UI Component
 * Handles loading and displaying games
 */

class GameLoader {
  constructor() {
    this.element = null;
    this.gameEngine = null;
    this.currentGame = null;
    this.currentMode = null;
    this.eventListeners = new Map();
    this.gameFrame = null;
  }

  /**
   * Initialize the game loader
   */
  init(elementId, gameEngine) {
    this.element = document.getElementById(elementId);
    if (!this.element) {
      throw new Error(`Game loader element not found: ${elementId}`);
    }

    this.gameEngine = gameEngine;
    this.render();
    this.setupEventListeners();

    console.log('[GameLoader] Initialized');
    this.emit('game-loader:ready');
  }

  /**
   * Render the game loader UI
   */
  render() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="game-loader">
        <div class="game-loader-header">
          <h2 id="gameLoaderTitle">Game Loading...</h2>
          <div class="game-loader-controls">
            <button id="backToDashboard" class="btn">Back to Dashboard</button>
            <button id="fullscreenGame" class="btn">Fullscreen</button>
          </div>
        </div>

        <div class="game-container">
          <div class="game-loading" id="gameLoading">
            <div class="spinner"></div>
            <p>Loading game...</p>
          </div>

          <div class="game-error" id="gameError" style="display: none;">
            <div class="error-icon">⚠️</div>
            <p id="errorMessage">Failed to load game</p>
            <button id="retryGame" class="btn">Retry</button>
          </div>

          <iframe id="gameFrame" class="game-iframe" sandbox="allow-scripts allow-same-origin allow-forms" allow="autoplay; fullscreen"></iframe>
        </div>

        <div class="game-info-panel">
          <div class="game-info">
            <h3>Game Info</h3>
            <p id="gameInfoText">No game loaded</p>
          </div>

          <div class="game-services-status">
            <h3>Services</h3>
            <div class="service-status" id="serviceStatus">
              <!-- Service status will be shown here -->
            </div>
          </div>
        </div>
      </div>
    `;

    this.gameFrame = this.element.querySelector('#gameFrame');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Back to dashboard
    this.element.querySelector('#backToDashboard')?.addEventListener('click', () => {
      this.unloadGame();
      this.emit('back-to-dashboard');
    });

    // Fullscreen
    this.element.querySelector('#fullscreenGame')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Retry game
    this.element.querySelector('#retryGame')?.addEventListener('click', () => {
      if (this.currentGame && this.currentMode) {
        this.loadGame(this.currentGame, this.currentMode);
      }
    });

    // Game engine events
    this.gameEngine.on('game:started', (session) => this.onGameStarted(session));
    this.gameEngine.on('game:ended', (session) => this.onGameEnded(session));
  }

  /**
   * Load a game
   */
  async loadGame(gameId, modeId, config = {}) {
    this.currentGame = gameId;
    this.currentMode = modeId;

    // Show loading state
    this.showLoading();

    try {
      // Start the game through game engine
      const session = await this.gameEngine.startGame(gameId, modeId, config);

      // Update UI
      this.element.querySelector('#gameLoaderTitle').textContent = `Playing: ${gameId}`;
      this.element.querySelector('#gameInfoText').textContent = `Game: ${gameId}, Mode: ${modeId}`;

      // Hide loading, show game
      this.hideLoading();
      this.showGame();

      console.log('[GameLoader] Game loaded successfully:', session);
      this.emit('game:loaded', session);
    } catch (error) {
      console.error('[GameLoader] Failed to load game:', error);
      this.showError(`Failed to load game: ${error.message}`);
      this.emit('game:load-error', { error: error.message });
    }
  }

  /**
   * Unload current game
   */
  unloadGame() {
    if (this.currentGame) {
      try {
        // End the game through game engine
        this.gameEngine.endGame({ status: 'COMPLETED', result: 'User exited' });

        // Reset UI
        this.currentGame = null;
        this.currentMode = null;

        if (this.gameFrame) {
          this.gameFrame.src = 'about:blank';
        }

        console.log('[GameLoader] Game unloaded');
        this.emit('game:unloaded');
      } catch (error) {
        console.error('[GameLoader] Error unloading game:', error);
      }
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    const loadingElement = this.element.querySelector('#gameLoading');
    const errorElement = this.element.querySelector('#gameError');

    if (loadingElement) loadingElement.style.display = 'flex';
    if (errorElement) errorElement.style.display = 'none';
    if (this.gameFrame) this.gameFrame.style.display = 'none';
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loadingElement = this.element.querySelector('#gameLoading');
    if (loadingElement) loadingElement.style.display = 'none';
  }

  /**
   * Show game frame
   */
  showGame() {
    if (this.gameFrame) {
      this.gameFrame.style.display = 'block';
    }
  }

  /**
   * Show error state
   */
  showError(message) {
    const errorElement = this.element.querySelector('#gameError');
    const errorMessage = this.element.querySelector('#errorMessage');

    if (errorElement) errorElement.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;
    if (this.gameFrame) this.gameFrame.style.display = 'none';
  }

  /**
   * Hide error state
   */
  hideError() {
    const errorElement = this.element.querySelector('#gameError');
    if (errorElement) errorElement.style.display = 'none';
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.element.requestFullscreen().catch(err => {
        console.error('[GameLoader] Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Handle game started event
   */
  onGameStarted(session) {
    console.log('[GameLoader] Game started:', session);
    // Update service status
    this.updateServiceStatus(session.config?.services || {});
  }

  /**
   * Handle game ended event
   */
  onGameEnded(session) {
    console.log('[GameLoader] Game ended:', session);
    // Show completion message
    this.element.querySelector('#gameInfoText').textContent = `Game completed: ${session.gameId}`;
  }

  /**
   * Update service status display
   */
  updateServiceStatus(services) {
    const serviceStatus = this.element.querySelector('#serviceStatus');
    if (!serviceStatus) return;

    serviceStatus.innerHTML = `
      ${services.text ? '<div class="service-active">✓ Text Chat</div>' : '<div class="service-inactive">✗ Text Chat</div>'}
      ${services.audio ? '<div class="service-active">✓ Audio Call</div>' : '<div class="service-inactive">✗ Audio Call</div>'}
      ${services.video ? '<div class="service-active">✓ Video Call</div>' : '<div class="service-inactive">✗ Video Call</div>'}
    `;
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
    window.dispatchEvent(new CustomEvent(`game-loader:${event}`, {
      detail: data
    }));
  }
}

// Singleton instance
const gameLoader = new GameLoader();
export default gameLoader;