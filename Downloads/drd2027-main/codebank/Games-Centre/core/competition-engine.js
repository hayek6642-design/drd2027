/**
 * Competition Engine
 * Handles challenges, matches, and competitive gameplay
 */

class CompetitionEngine {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.challenges = new Map();
    this.activeMatches = new Map();
    this.competitionState = 'IDLE';
    this.eventListeners = new Map();
  }

  /**
   * Create a new challenge
   */
  createChallenge(config) {
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const challenge = {
      id: challengeId,
      gameId: config.gameId,
      mode: config.mode || 'multiplayer',
      creator: config.creator,
      players: config.players || [],
      services: config.services || {},
      valueMode: config.valueMode || 'zero-value',
      status: 'CREATED',
      createdAt: Date.now(),
      expiresAt: config.expiresAt || Date.now() + 3600000, // 1 hour default
      metadata: config.metadata || {}
    };

    console.log(`[CompetitionEngine] Created challenge: ${challengeId}`);
    this.challenges.set(challengeId, challenge);
    this.emit('challenge:created', challenge);
    return challenge;
  }

  /**
   * Accept a challenge
   */
  acceptChallenge(challengeId, playerId) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    if (challenge.status !== 'CREATED' && challenge.status !== 'WAITING') {
      throw new Error(`Cannot accept challenge in status: ${challenge.status}`);
    }

    if (challenge.players.includes(playerId)) {
      throw new Error(`Player already in challenge: ${playerId}`);
    }

    challenge.players.push(playerId);
    challenge.status = 'WAITING';

    // Check if all players have joined
    if (challenge.players.length >= 2) {
      challenge.status = 'ACCEPTED';
      this.startMatch(challenge);
    }

    this.emit('challenge:accepted', { challengeId, playerId, challenge });
    return challenge;
  }

  /**
   * Start a match from a challenge
   */
  async startMatch(challenge) {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const match = {
      id: matchId,
      challengeId: challenge.id,
      gameId: challenge.gameId,
      mode: challenge.mode,
      players: challenge.players,
      services: challenge.services,
      valueMode: challenge.valueMode,
      status: 'RUNNING',
      startedAt: Date.now(),
      results: {}
    };

    console.log(`[CompetitionEngine] Starting match: ${matchId}`);
    this.activeMatches.set(matchId, match);
    this.challenges.set(challenge.id, { ...challenge, status: 'RUNNING' });

    // Start the game
    try {
      await this.gameEngine.startGame(challenge.gameId, challenge.mode, {
        matchId,
        players: challenge.players,
        services: challenge.services
      });

      this.emit('match:started', match);
    } catch (error) {
      console.error(`[CompetitionEngine] Failed to start match: ${error.message}`);
      this.endMatch(matchId, { status: 'FAILED', error: error.message });
    }

    return match;
  }

  /**
   * End a match
   */
  endMatch(matchId, result) {
    const match = this.activeMatches.get(matchId);
    if (!match) {
      throw new Error(`Match not found: ${matchId}`);
    }

    console.log(`[CompetitionEngine] Ending match: ${matchId}`);

    // Update match state
    match.status = 'COMPLETED';
    match.endedAt = Date.now();
    match.results = result;

    // Update challenge state
    const challenge = this.challenges.get(match.challengeId);
    if (challenge) {
      challenge.status = 'COMPLETED';
      challenge.result = result;
    }

    this.emit('match:ended', match);
    return match;
  }

  /**
   * Cancel a challenge
   */
  cancelChallenge(challengeId, reason = 'User cancelled') {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    if (challenge.status === 'COMPLETED' || challenge.status === 'CANCELLED') {
      throw new Error(`Cannot cancel challenge in status: ${challenge.status}`);
    }

    challenge.status = 'CANCELLED';
    challenge.cancelledAt = Date.now();
    challenge.cancelReason = reason;

    this.emit('challenge:cancelled', challenge);
    return challenge;
  }

  /**
   * Get challenge by ID
   */
  getChallenge(challengeId) {
    return this.challenges.get(challengeId);
  }

  /**
   * Get match by ID
   */
  getMatch(matchId) {
    return this.activeMatches.get(matchId);
  }

  /**
   * Get all active challenges
   */
  getActiveChallenges() {
    return Array.from(this.challenges.values())
      .filter(c => c.status === 'CREATED' || c.status === 'WAITING');
  }

  /**
   * Get all active matches
   */
  getActiveMatches() {
    return Array.from(this.activeMatches.values())
      .filter(m => m.status === 'RUNNING');
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
    window.dispatchEvent(new CustomEvent(`competition-engine:${event}`, {
      detail: data
    }));
  }
}

export default CompetitionEngine;