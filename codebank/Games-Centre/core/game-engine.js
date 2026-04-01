/**
 * Game Engine - Core Orchestrator
 * Central authority for all game operations
 */

class GameEngine {
  constructor() {
    this.gameRegistry = new Map();
    this.modeRegistry = new Map();
    this.competitionEngine = null;
    this.serviceEngine = null;
    this.stateAuthority = null;
    this.currentGame = null;
    this.currentMode = null;
    this.currentSession = null;
    this.eventListeners = new Map();
  }

  /**
   * Initialize the game engine with all required components
   */
  init(config = {}) {
    console.log('[GameEngine] Initializing...');

    // Initialize core components
    this.stateAuthority = new StateAuthority();
    this.competitionEngine = new CompetitionEngine(this);
    this.serviceEngine = new ServiceEngine(this);

    console.log('[GameEngine] Ready');
    this.emit('engine:ready');
  }

  /**
   * Register a game module
   */
  registerGame(gameId, gameModule) {
    if (!gameModule || typeof gameModule.init !== 'function') {
      throw new Error(`Invalid game module: ${gameId}`);
    }

    console.log(`[GameEngine] Registering game: ${gameId}`);
    this.gameRegistry.set(gameId, gameModule);
    this.emit('game:registered', { gameId });
  }

  /**
   * Register a game mode
   */
  registerMode(modeId, modeHandler) {
    if (!modeHandler || typeof modeHandler.start !== 'function') {
      throw new Error(`Invalid mode handler: ${modeId}`);
    }

    console.log(`[GameEngine] Registering mode: ${modeId}`);
    this.modeRegistry.set(modeId, modeHandler);
    this.emit('mode:registered', { modeId });
  }

  /**
   * Start a game with specific mode and configuration
   */
  async startGame(gameId, modeId, config = {}) {
    // Validate game exists
    const gameModule = this.gameRegistry.get(gameId);
    if (!gameModule) {
      throw new Error(`Game not found: ${gameId}`);
    }

    // Validate mode exists
    const modeHandler = this.modeRegistry.get(modeId);
    if (!modeHandler) {
      throw new Error(`Mode not found: ${modeId}`);
    }

    console.log(`[GameEngine] Starting game: ${gameId} in mode: ${modeId}`);

    // Set current state
    this.currentGame = gameId;
    this.currentMode = modeId;

    // Initialize the game
    await gameModule.init(config);

    // Start the mode
    await modeHandler.start(gameModule, config);

    // Create session
    this.currentSession = {
      gameId,
      modeId,
      startTime: Date.now(),
      state: 'RUNNING'
    };

    this.emit('game:started', this.currentSession);
    return this.currentSession;
  }

  /**
   * Handle game actions
   */
  onGameAction(action) {
    if (!this.currentGame || !this.currentMode) {
      throw new Error('No active game session');
    }

    const gameModule = this.gameRegistry.get(this.currentGame);
    if (gameModule && typeof gameModule.onAction === 'function') {
      gameModule.onAction(action);
    }

    this.emit('game:action', { action, gameId: this.currentGame });
  }

  /**
   * End current game session
   */
  endGame(result) {
    if (!this.currentSession) {
      throw new Error('No active game session');
    }

    console.log(`[GameEngine] Ending game session: ${this.currentSession.gameId}`);

    // Notify game module
    const gameModule = this.gameRegistry.get(this.currentGame);
    if (gameModule && typeof gameModule.onFinish === 'function') {
      gameModule.onFinish(result);
    }

    // Clean up
    const session = this.currentSession;
    this.currentSession.state = 'COMPLETED';
    this.currentSession.endTime = Date.now();

    // Reset current state
    this.currentGame = null;
    this.currentMode = null;
    this.currentSession = null;

    this.emit('game:ended', session);
    return session;
  }

  /**
   * Get competition engine
   */
  getCompetitionEngine() {
    return this.competitionEngine;
  }

  /**
   * Get service engine
   */
  getServiceEngine() {
    return this.serviceEngine;
  }

  /**
   * Get state authority
   */
  getStateAuthority() {
    return this.stateAuthority;
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

    // Also emit as DOM event for UI components
    window.dispatchEvent(new CustomEvent(`game-engine:${event}`, {
      detail: data
    }));
  }

  /**
   * Cleanup
   */
  destroy() {
    this.eventListeners.clear();
    if (this.currentSession) {
      this.endGame({ status: 'ABORTED' });
    }
    this.emit('engine:destroyed');
  }
}

// Singleton instance
const gameEngine = new GameEngine();
export default gameEngine;