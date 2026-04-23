/**
 * Game Registry
 * Central registry for all game modules
 */

class GameRegistry {
  constructor() {
    this.games = new Map();
    this.gameMetadata = new Map();
  }

  /**
   * Register a game module
   */
  register(gameId, gameModule, metadata = {}) {
    if (!gameModule || typeof gameModule.init !== 'function') {
      throw new Error(`Invalid game module: ${gameId}`);
    }

    console.log(`[GameRegistry] Registering game: ${gameId}`);
    this.games.set(gameId, gameModule);
    this.gameMetadata.set(gameId, {
      id: gameId,
      title: metadata.title || gameId.replace(/-/g, ' '),
      category: metadata.category || 'classic',
      description: metadata.description || `Play ${gameId} game`,
      ...metadata
    });

    // Emit registration event
    window.dispatchEvent(new CustomEvent('game-registry:registered', {
      detail: { gameId, metadata: this.gameMetadata.get(gameId) }
    }));
  }

  /**
   * Get a game module by ID
   */
  getGame(gameId) {
    return this.games.get(gameId);
  }

  /**
   * Get game metadata
   */
  getMetadata(gameId) {
    return this.gameMetadata.get(gameId);
  }

  /**
   * Get all registered games
   */
  getAllGames() {
    return Array.from(this.games.entries()).map(([gameId, gameModule]) => ({
      gameId,
      module: gameModule,
      metadata: this.gameMetadata.get(gameId)
    }));
  }

  /**
   * Check if game exists
   */
  hasGame(gameId) {
    return this.games.has(gameId);
  }

  /**
   * Unregister a game
   */
  unregister(gameId) {
    this.games.delete(gameId);
    this.gameMetadata.delete(gameId);
    window.dispatchEvent(new CustomEvent('game-registry:unregistered', {
      detail: { gameId }
    }));
  }

  /**
   * Clear all games
   */
  clear() {
    this.games.clear();
    this.gameMetadata.clear();
    window.dispatchEvent(new CustomEvent('game-registry:cleared'));
  }
}

// Singleton instance
const gameRegistry = new GameRegistry();
export default gameRegistry;