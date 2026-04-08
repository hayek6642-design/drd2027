/**
 * YouTube Runtime Bridge
 * Integration layer between Games-Centre and YouTube runtime
 */

class YTRuntimeBridge {
  constructor() {
    this.gameEngine = null;
    this.initialized = false;
    this.eventListeners = new Map();
  }

  /**
   * Initialize the bridge
   */
  async init() {
    console.log('[YTRuntimeBridge] Initializing...');

    // Import and initialize game engine
    const GameEngine = (await import('../core/game-engine.js')).default;
    const GameRegistry = (await import('../core/game-registry.js')).default;
    const ModeRegistry = (await import('../core/mode-registry.js')).default;

    // Import game modes
    const SinglePlayerMode = (await import('../core/modes/single-player-mode.js')).default;
    const VSComputerMode = (await import('../core/modes/vs-computer-mode.js')).default;
    const MultiplayerMode = (await import('../core/modes/multiplayer-mode.js')).default;

    // Import services
    const ServiceEngine = (await import('../core/service-engine.js')).default;
    const StateAuthority = (await import('../core/state-authority.js')).default;
    const CompetitionEngine = (await import('../core/competition-engine.js')).default;

    // Create game engine instance
    this.gameEngine = new GameEngine();

    // Initialize core components
    this.gameEngine.stateAuthority = new StateAuthority();
    this.gameEngine.competitionEngine = new CompetitionEngine(this.gameEngine);
    this.gameEngine.serviceEngine = new ServiceEngine(this.gameEngine);
    this.gameEngine.gameRegistry = new GameRegistry();
    this.gameEngine.modeRegistry = new ModeRegistry();

    // Register game modes
    this.gameEngine.modeRegistry.register('single-player', SinglePlayerMode, {
      title: 'Single Player',
      description: 'Play alone without opponents'
    });

    this.gameEngine.modeRegistry.register('vs-computer', VSComputerMode, {
      title: 'VS Computer',
      description: 'Play against AI opponent'
    });

    this.gameEngine.modeRegistry.register('multiplayer', MultiplayerMode, {
      title: 'Multiplayer',
      description: 'Play against other human players'
    });

    // Initialize the game engine
    this.gameEngine.init();

    // Register sample games
    await this.registerSampleGames();

    this.initialized = true;
    console.log('[YTRuntimeBridge] Initialized successfully');
    this.emit('bridge:ready');
  }

  /**
   * Register sample games
   */
  async registerSampleGames() {
    try {
      // Import and register Snake game
      const SnakeGame = (await import('../games/snake/game.js')).default;
      this.gameEngine.gameRegistry.register('snake', SnakeGame, {
        title: 'Snake',
        category: 'classic',
        description: 'Classic snake game with modern features'
      });

      console.log('[YTRuntimeBridge] Sample games registered');
    } catch (error) {
      console.error('[YTRuntimeBridge] Error registering sample games:', error);
    }
  }

  /**
   * Get the game engine instance
   */
  getGameEngine() {
    if (!this.initialized) {
      throw new Error('Bridge not initialized');
    }
    return this.gameEngine;
  }

  /**
   * Get game registry
   */
  getGameRegistry() {
    return this.gameEngine.gameRegistry;
  }

  /**
   * Get mode registry
   */
  getModeRegistry() {
    return this.gameEngine.modeRegistry;
  }

  /**
   * Get competition engine
   */
  getCompetitionEngine() {
    return this.gameEngine.competitionEngine;
  }

  /**
   * Get service engine
   */
  getServiceEngine() {
    return this.gameEngine.serviceEngine;
  }

  /**
   * Get state authority
   */
  getStateAuthority() {
    return this.gameEngine.stateAuthority;
  }

  /**
   * Start a game
   */
  async startGame(gameId, modeId, config = {}) {
    if (!this.initialized) {
      throw new Error('Bridge not initialized');
    }

    return this.gameEngine.startGame(gameId, modeId, config);
  }

  /**
   * Handle game actions from YouTube runtime
   */
  handleGameAction(action) {
    if (!this.initialized) {
      throw new Error('Bridge not initialized');
    }

    this.gameEngine.onGameAction(action);
  }

  /**
   * End current game
   */
  endGame(result) {
    if (!this.initialized) {
      throw new Error('Bridge not initialized');
    }

    this.gameEngine.endGame(result);
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

    // Also emit as DOM event for YouTube runtime
    window.dispatchEvent(new CustomEvent(`yt-runtime-bridge:${event}`, {
      detail: data
    }));
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.gameEngine) {
      this.gameEngine.destroy();
    }

    this.initialized = false;
    this.eventListeners.clear();

    console.log('[YTRuntimeBridge] Destroyed');
    this.emit('bridge:destroyed');
  }
}

// Singleton instance
const ytRuntimeBridge = new YTRuntimeBridge();
export default ytRuntimeBridge;