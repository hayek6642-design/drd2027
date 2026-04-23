/**
 * Matchmaking System
 * 
 * Automatically matches players for multi-player games
 */

import { lobbyManager } from './lobby-manager.js';
import { bettingCore } from './betting-core.js';

class MatchmakingQueue {
    constructor(gameId) {
        this.gameId = gameId;
        this.queue = [];
    }

    add(player) {
        this.queue.push({
            ...player,
            joinedAt: Date.now()
        });
    }

    remove(userId) {
        const index = this.queue.findIndex(p => p.userId === userId);
        if (index !== -1) {
            this.queue.splice(index, 1);
            return true;
        }
        return false;
    }

    findMatch(player, criteria) {
        // Find opponents with similar criteria
        const candidates = this.queue.filter(p => {
            if (p.userId === player.userId) return false;

            // Match bet amount (within 10%)
            if (Math.abs(p.betAmount - criteria.betAmount) > criteria.betAmount * 0.1) {
                return false;
            }

            // Match skill level if provided (within 100 points)
            if (criteria.skillLevel && p.skillLevel) {
                if (Math.abs(p.skillLevel - criteria.skillLevel) > 100) {
                    return false;
                }
            }

            return true;
        });

        return candidates.length > 0 ? candidates[0] : null;
    }
}

class Matchmaker {
    constructor() {
        this.queues = new Map(); // gameId -> MatchmakingQueue
        this.searchingPlayers = new Map(); // userId -> {gameId, criteria}
    }

    /**
     * Quick match - find opponent automatically
     */
    async quickMatch(userId, username, gameId, betAmount = 0, asset = 'code') {
        // Get or create queue for this game
        if (!this.queues.has(gameId)) {
            this.queues.set(gameId, new MatchmakingQueue(gameId));
        }

        const queue = this.queues.get(gameId);

        // Get user's skill level (from leaderboard or stats)
        const skillLevel = await this.getUserSkillLevel(userId, gameId);

        const player = {
            userId,
            username,
            betAmount,
            asset,
            skillLevel
        };

        // Try to find a match
        const match = queue.findMatch(player, {
            betAmount,
            skillLevel
        });

        if (match) {
            // Found a match! Remove from queue
            queue.remove(match.userId);

            // Create lobby
            const lobbyResult = lobbyManager.createLobby({
                gameId,
                hostId: userId,
                hostUsername: username,
                maxPlayers: 2,
                betAmount,
                asset,
                isPrivate: false,
                settings: {
                    matchmade: true
                }
            });

            if (lobbyResult.success) {
                // Add matched player
                await lobbyManager.joinLobby(
                    lobbyResult.lobbyId,
                    match.userId,
                    match.username
                );

                // Auto-ready both players
                await lobbyManager.setPlayerReady(lobbyResult.lobbyId, userId, true);
                await lobbyManager.setPlayerReady(lobbyResult.lobbyId, match.userId, true);

                // Notify both players
                this.notifyMatch(userId, match.userId, lobbyResult.lobbyId);
                this.notifyMatch(match.userId, userId, lobbyResult.lobbyId);

                // Remove from searching
                this.searchingPlayers.delete(userId);
                this.searchingPlayers.delete(match.userId);

                return {
                    success: true,
                    matched: true,
                    lobbyId: lobbyResult.lobbyId,
                    opponent: {
                        userId: match.userId,
                        username: match.username
                    }
                };
            }
        }

        // No match found, add to queue
        queue.add(player);
        this.searchingPlayers.set(userId, {
            gameId,
            criteria: { betAmount, skillLevel }
        });

        return {
            success: true,
            matched: false,
            searching: true,
            queuePosition: queue.queue.length
        };
    }

    /**
     * Cancel matchmaking search
     */
    cancelSearch(userId) {
        const search = this.searchingPlayers.get(userId);
        if (!search) {
            return { success: false, error: 'Not in queue' };
        }

        const queue = this.queues.get(search.gameId);
        if (queue) {
            queue.remove(userId);
        }

        this.searchingPlayers.delete(userId);

        return { success: true };
    }

    /**
     * Create custom lobby
     */
    createCustomLobby(userId, username, config) {
        return lobbyManager.createLobby({
            hostId: userId,
            hostUsername: username,
            ...config
        });
    }

    /**
     * Get matchmaking status
     */
    getStatus(userId) {
        const search = this.searchingPlayers.get(userId);
        if (!search) {
            return { searching: false };
        }

        const queue = this.queues.get(search.gameId);
        const position = queue ? queue.queue.findIndex(p => p.userId === userId) + 1 : 0;

        return {
            searching: true,
            gameId: search.gameId,
            queuePosition: position,
            queueSize: queue ? queue.queue.length : 0,
            estimatedWait: this.estimateWaitTime(queue)
        };
    }

    /**
     * Estimate wait time based on queue activity
     */
    estimateWaitTime(queue) {
        if (!queue || queue.queue.length === 0) {
            return 0;
        }

        // Simple estimation: 30 seconds per person ahead
        return queue.queue.length * 30;
    }

    /**
     * Get user skill level
     */
    async getUserSkillLevel(userId, gameId) {
        // This would integrate with leaderboard/stats system
        // For now, return a default
        return 1000; // ELO-style rating
    }

    /**
     * Notify players of match
     */
    notifyMatch(userId, opponentId, lobbyId) {
        window.dispatchEvent(new CustomEvent('match-found', {
            detail: {
                userId,
                opponentId,
                lobbyId
            }
        }));
    }

    /**
     * Get active  lobbies for a game
     */
    getActiveLobbies(gameId) {
        return lobbyManager.getPublicLobbies(gameId);
    }

    /**
     * Cleanup old queue entries
     */
    cleanup() {
        const now = Date.now();
        const maxWait = 300000; // 5 minutes

        for (const queue of this.queues.values()) {
            queue.queue = queue.queue.filter(p => {
                const age = now - p.joinedAt;
                if (age > maxWait) {
                    // Notify player of timeout
                    this.notifySearchTimeout(p.userId);
                    this.searchingPlayers.delete(p.userId);
                    return false;
                }
                return true;
            });
        }
    }

    notifySearchTimeout(userId) {
        window.dispatchEvent(new CustomEvent('matchmaking-timeout', {
            detail: { userId }
        }));
    }
}

// Export singleton
export const matchmaker = new Matchmaker();

// Cleanup every minute
setInterval(() => matchmaker.cleanup(), 60000);
