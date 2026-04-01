/**
 * leaderboard.js
 * 
 * Manages local high scores and challenge results.
 * Uses localStorage to persist data.
 */

const STORAGE_KEY = 'yt_games_leaderboard';

export class LeaderboardManager {
    constructor() {
        this.cache = this._load();
    }

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    }

    updateScore(gameId, userId, score, username = 'Player') {
        if (!this.cache[gameId]) {
            this.cache[gameId] = [];
        }

        // Check if user already has a score
        const existingIndex = this.cache[gameId].findIndex(e => e.userId === userId);

        if (existingIndex >= 0) {
            // Only update if higher
            if (score > this.cache[gameId][existingIndex].score) {
                this.cache[gameId][existingIndex].score = score;
                this.cache[gameId][existingIndex].timestamp = Date.now();
            }
        } else {
            this.cache[gameId].push({ userId, username, score, timestamp: Date.now() });
        }

        // Sort desc
        this.cache[gameId].sort((a, b) => b.score - a.score);

        // Keep top 50
        if (this.cache[gameId].length > 50) {
            this.cache[gameId] = this.cache[gameId].slice(0, 50);
        }

        this._save();

        // Broadcast update
        const event = new CustomEvent('leaderboard-updated', { detail: { gameId } });
        window.dispatchEvent(event);
    }

    getTopPlayers(gameId) {
        return this.cache[gameId] || [];
    }

    // Challenge Logic
    createChallenge(gameId, challengerId, opponentId, betAmount) {
        // This would typically involve a backend or shared DB.
        // For local simulation, we can emit an event or store pending challenges.
        console.log(`[Leaderboard] Challenge created: ${challengerId} vs ${opponentId} for ${betAmount}`);
        return { challengeId: Date.now() };
    }
}

export const leaderboard = new LeaderboardManager();
