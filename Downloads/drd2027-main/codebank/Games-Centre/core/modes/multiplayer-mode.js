/**
 * Multiplayer Mode
 * Game mode for playing against other players
 */

class MultiplayerMode {
  constructor() {
    this.modeId = 'multiplayer';
    this.title = 'Multiplayer';
    this.description = 'Play against other human players';
    this.players = [];
    this.matchId = null;
  }

  /**
   * Start multiplayer mode
   */
  async start(gameModule, config = {}) {
    console.log(`[MultiplayerMode] Starting game: ${gameModule.constructor.name}`);

    // Store match info
    this.matchId = config.matchId;
    this.players = config.players || [];

    if (this.players.length < 2) {
      throw new Error('Multiplayer mode requires at least 2 players');
    }

    // Initialize game with multiplayer config
    await gameModule.init({
      mode: this.modeId,
      players: this.players,
      matchId: this.matchId,
      ...config
    });

    // Start the game
    if (typeof gameModule.start === 'function') {
      await gameModule.start();
    }

    console.log(`[MultiplayerMode] Game started with ${this.players.length} players`);
    return { success: true, mode: this.modeId, players: this.players };
  }

  /**
   * Handle game actions from players
   */
  handleAction(gameModule, action) {
    if (gameModule && typeof gameModule.onAction === 'function') {
      // Validate player is in this match
      if (action.playerId && !this.players.some(p => p.id === action.playerId)) {
        console.warn(`[MultiplayerMode] Invalid player action: ${action.playerId}`);
        return;
      }

      gameModule.onAction(action);
    }
  }

  /**
   * Add player to match
   */
  addPlayer(playerId) {
    if (!this.players.some(p => p.id === playerId)) {
      this.players.push({ id: playerId, type: 'human' });
      console.log(`[MultiplayerMode] Player added: ${playerId}`);
    }
  }

  /**
   * Remove player from match
   */
  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    console.log(`[MultiplayerMode] Player removed: ${playerId}`);
  }

  /**
   * End multiplayer game
   */
  end(gameModule, result) {
    if (gameModule && typeof gameModule.onFinish === 'function') {
      gameModule.onFinish(result);
    }

    // Clean up
    this.players = [];
    this.matchId = null;
  }
}

// Singleton instance
const multiplayerMode = new MultiplayerMode();
export default multiplayerMode;