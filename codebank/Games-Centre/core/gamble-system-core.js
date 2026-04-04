/**
 * Gamble System Core — Client API
 * Connects to /api/gamble/* endpoints
 * Integrated with ACC (users/balances), Turso DB, Ledger, and Safecode
 */
(function (window) {
  'use strict';

  const BASE = '/api/gamble';

  async function _fetch(path, opts = {}) {
    const res = await fetch(BASE + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts
    });
    return res.json();
  }

  const GambleSystem = {
    ENTRY_FEE: 100,

    /** Prize formula — matches spec:
     *  2 players → 210  (pot 200 + bonus 10)
     *  4 players → 440  (pot 400 + bonus 40)
     *  N ≥ 3    → N × 110
     */
    calculatePrize(numPlayers) {
      const n = parseInt(numPlayers, 10);
      const pot = n * this.ENTRY_FEE;
      const bonus = n === 2 ? 5 * n : 10 * n;
      return pot + bonus;
    },

    /** Create a new gamble room */
    async createRoom(gameId, gameName, numPlayers) {
      return _fetch('/room', {
        method: 'POST',
        body: JSON.stringify({ gameId, gameName, numPlayers })
      });
    },

    /** Join a room (deducts 100 codes from ACC/Turso/Ledger) */
    async joinRoom(roomId, username) {
      return _fetch(`/room/${roomId}/join`, {
        method: 'POST',
        body: JSON.stringify({ username: username || window.__currentUsername || 'Player' })
      });
    },

    /** Submit this player's score for their turn */
    async submitScore(roomId, score) {
      return _fetch(`/room/${roomId}/score`, {
        method: 'POST',
        body: JSON.stringify({ score })
      });
    },

    /** Declare winner — prizes deposited to winner's ACC balance + Ledger entry */
    async declareWinner(roomId, winnerId, winnerScore) {
      return _fetch(`/room/${roomId}/declare-winner`, {
        method: 'POST',
        body: JSON.stringify({ winnerId, winnerScore })
      });
    },

    /** Cancel room — full refund to all players */
    async cancelRoom(roomId) {
      return _fetch(`/room/${roomId}/cancel`, { method: 'POST' });
    },

    /** Get room status + player list */
    async getRoom(roomId) {
      return _fetch(`/room/${roomId}`);
    },

    /** Get open rooms waiting for players */
    async getActiveRooms(gameId) {
      const qs = gameId ? `?gameId=${encodeURIComponent(gameId)}` : '';
      return _fetch(`/rooms/active${qs}`);
    },

    /** Player's gamble history */
    async getHistory() {
      return _fetch('/history');
    },

    /** Platform + player stats */
    async getStats() {
      return _fetch('/stats');
    },

    /** Check current user's codes balance */
    async getBalance() {
      try {
        const res = await fetch('/api/rewards/balance', { credentials: 'include' });
        const data = await res.json();
        return { codes: data.codes || 0, silver: data.silver || 0, gold: data.gold || 0 };
      } catch (_) {
        return { codes: 0, silver: 0, gold: 0 };
      }
    },

    /** Check if user can afford entry */
    async canAfford() {
      const bal = await this.getBalance();
      return bal.codes >= this.ENTRY_FEE;
    }
  };

  window.GambleSystem = GambleSystem;

})(window);
