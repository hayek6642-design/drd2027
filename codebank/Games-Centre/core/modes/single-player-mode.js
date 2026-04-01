/**
 * Single Player Mode
 * Game mode for solo gameplay
 */

class SinglePlayerMode {
  constructor() {
    this.modeId = 'single-player';
    this.title = 'Single Player';
    this.description = 'Play alone without opponents';
  }

  /**
   * Start single player mode
   */
  async start(gameModule, config = {}) {
    console.log(`[SinglePlayerMode] Starting game: ${gameModule.constructor.name}`);

    // Initialize game with single player config
    await gameModule.init({
      mode: this.modeId,
      players: [{ id: 'player_1', type: 'human' }],
      ...config
    });

    // Start the game
    if (typeof gameModule.start === 'function') {
      await gameModule.start();
    }

    console.log(`[SinglePlayerMode] Game started successfully`);
    return { success: true, mode: this.modeId };
  }

  /**
   * Handle game actions
   */
  handleAction(gameModule, action) {
    if (gameModule && typeof gameModule.onAction === 'function') {
      gameModule.onAction(action);
    }
  }

  /**
   * End single player game
   */
  end(gameModule, result) {
    if (gameModule && typeof gameModule.onFinish === 'function') {
      gameModule.onFinish(result);
    }
  }
}

// Singleton instance
const singlePlayerMode = new SinglePlayerMode();
export default singlePlayerMode;