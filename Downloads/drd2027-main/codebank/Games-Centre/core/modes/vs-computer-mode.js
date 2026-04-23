/**
 * VS Computer Mode
 * Game mode for playing against AI
 */

class VSComputerMode {
  constructor() {
    this.modeId = 'vs-computer';
    this.title = 'VS Computer';
    this.description = 'Play against AI opponent';
    this.aiDifficulty = 'medium';
  }

  /**
   * Start VS Computer mode
   */
  async start(gameModule, config = {}) {
    console.log(`[VSComputerMode] Starting game: ${gameModule.constructor.name}`);

    // Set AI difficulty
    this.aiDifficulty = config.difficulty || 'medium';

    // Initialize game with AI config
    await gameModule.init({
      mode: this.modeId,
      players: [
        { id: 'player_1', type: 'human' },
        { id: 'ai_player', type: 'ai', difficulty: this.aiDifficulty }
      ],
      ...config
    });

    // Start the game
    if (typeof gameModule.start === 'function') {
      await gameModule.start();
    }

    console.log(`[VSComputerMode] Game started with AI difficulty: ${this.aiDifficulty}`);
    return { success: true, mode: this.modeId, difficulty: this.aiDifficulty };
  }

  /**
   * Handle game actions
   */
  handleAction(gameModule, action) {
    if (gameModule && typeof gameModule.onAction === 'function') {
      gameModule.onAction(action);

      // AI will respond automatically through game module
    }
  }

  /**
   * End VS Computer game
   */
  end(gameModule, result) {
    if (gameModule && typeof gameModule.onFinish === 'function') {
      gameModule.onFinish(result);
    }
  }

  /**
   * Set AI difficulty
   */
  setDifficulty(difficulty) {
    this.aiDifficulty = difficulty;
  }
}

// Singleton instance
const vsComputerMode = new VSComputerMode();
export default vsComputerMode;