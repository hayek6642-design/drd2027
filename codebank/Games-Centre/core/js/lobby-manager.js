/**
 * Lobby Manager
 * 
 * Manages game lobbies for multi-player matches
 */

import { bettingCore, GAME_MODES } from './betting-core.js';

const LOBBY_STATUS = {
    WAITING: 'waiting',
    READY: 'ready',
    STARTING: 'starting',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
};

class Lobby {
    constructor(id, config) {
        this.id = id;
        this.gameId = config.gameId;
        this.hostId = config.hostId;
        this.maxPlayers = config.maxPlayers || 2;
        this.betAmount = config.betAmount || 0;
        this.asset = config.asset || 'code';
        this.isPrivate = config.isPrivate || false;
        this.password = config.password || null;

        this.players = [{
            userId: config.hostId,
            username: config.hostUsername || 'Host',
            isReady: false,
            isHost: true,
            joinedAt: Date.now()
        }];

        this.status = LOBBY_STATUS.WAITING;
        this.createdAt = Date.now();
        this.gameStartedAt = null;
        this.settings = config.settings || {};
    }

    addPlayer(userId, username) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: 'Lobby is full' };
        }

        if (this.players.some(p => p.userId === userId)) {
            return { success: false, error: 'Already in lobby' };
        }

        this.players.push({
            userId,
            username,
            isReady: false,
            isHost: false,
            joinedAt: Date.now()
        });

        this.broadcastUpdate('player-joined', { userId, username });
        return { success: true };
    }

    removePlayer(userId) {
        const index = this.players.findIndex(p => p.userId === userId);
        if (index === -1) {
            return { success: false, error: 'Player not in lobby' };
        }

        const player = this.players[index];
        this.players.splice(index, 1);

        // If host left, assign new host
        if (player.isHost && this.players.length > 0) {
            this.players[0].isHost = true;
            this.hostId = this.players[0].userId;
        }

        this.broadcastUpdate('player-left', { userId });
        return { success: true };
    }

    setPlayerReady(userId, ready) {
        const player = this.players.find(p => p.userId === userId);
        if (!player) {
            return { success: false, error: 'Player not found' };
        }

        player.isReady = ready;
        this.broadcastUpdate('player-ready-changed', { userId, ready });

        // Check if all ready
        this.checkAllReady();
        return { success: true };
    }

    checkAllReady() {
        const allReady = this.players.every(p => p.isReady);
        if (allReady && this.players.length >= 2) {
            this.status = LOBBY_STATUS.READY;
            this.broadcastUpdate('lobby-ready', {});
        } else {
            if (this.status === LOBBY_STATUS.READY) {
                this.status = LOBBY_STATUS.WAITING;
            }
        }
    }

    async startGame() {
        if (this.status !== LOBBY_STATUS.READY) {
            return { success: false, error: 'Not all players are ready' };
        }

        if (this.players.length < 2) {
            return { success: false, error: 'Need at least 2 players' };
        }

        this.status = LOBBY_STATUS.STARTING;
        this.gameStartedAt = Date.now();

        // Create bet if applicable
        if (this.betAmount > 0) {
            const betPlayers = this.players.map((p, index) => ({
                userId: p.userId,
                amount: this.betAmount,
                role: `player${index + 1}`
            }));

            const betResult = await bettingCore.createBet({
                players: betPlayers,
                gameId: this.gameId,
                gameMode: GAME_MODES.PVP,
                asset: this.asset,
                metadata: {
                    lobbyId: this.id,
                    players: this.players.map(p => ({ userId: p.userId, username: p.username }))
                }
            });

            if (!betResult.success) {
                this.status = LOBBY_STATUS.WAITING;
                return { success: false, error: betResult.error };
            }

            this.betId = betResult.betId;
        }

        this.broadcastUpdate('game-starting', { betId: this.betId });
        this.status = LOBBY_STATUS.IN_PROGRESS;

        return {
            success: true,
            betId: this.betId,
            players: this.players
        };
    }

    broadcastUpdate(event, data) {
        window.dispatchEvent(new CustomEvent(`lobby-${this.id}-${event}`, {
            detail: {
                lobbyId: this.id,
                ...data
            }
        }));
    }

    getState() {
        return {
            id: this.id,
            gameId: this.gameId,
            hostId: this.hostId,
            players: this.players,
            maxPlayers: this.maxPlayers,
            betAmount: this.betAmount,
            asset: this.asset,
            status: this.status,
            isPrivate: this.isPrivate,
            settings: this.settings,
            createdAt: this.createdAt
        };
    }
}

class LobbyManager {
    constructor() {
        this.lobbies = new Map();
        this.userLobbies = new Map(); // userId -> lobbyId
    }

    createLobby(config) {
        const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const lobby = new Lobby(lobbyId, config);

        this.lobbies.set(lobbyId, lobby);
        this.userLobbies.set(config.hostId, lobbyId);

        window.dispatchEvent(new CustomEvent('lobby-created', {
            detail: { lobbyId, lobby: lobby.getState() }
        }));

        return { success: true, lobbyId, lobby: lobby.getState() };
    }

    joinLobby(lobbyId, userId, username, password = null) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) {
            return { success: false, error: 'Lobby not found' };
        }

        if (lobby.isPrivate && lobby.password !== password) {
            return { success: false, error: 'Invalid password' };
        }

        if (lobby.status !== LOBBY_STATUS.WAITING) {
            return { success: false, error: 'Lobby not accepting players' };
        }

        const result = lobby.addPlayer(userId, username);
        if (result.success) {
            this.userLobbies.set(userId, lobbyId);
        }

        return result;
    }

    leaveLobby(lobbyId, userId) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) {
            return { success: false, error: 'Lobby not found' };
        }

        const result = lobby.removePlayer(userId);
        if (result.success) {
            this.userLobbies.delete(userId);

            // Delete lobby if empty
            if (lobby.players.length === 0) {
                this.lobbies.delete(lobbyId);
                window.dispatchEvent(new CustomEvent('lobby-closed', {
                    detail: { lobbyId }
                }));
            }
        }

        return result;
    }

    setPlayerReady(lobbyId, userId, ready) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) {
            return { success: false, error: 'Lobby not found' };
        }

        return lobby.setPlayerReady(userId, ready);
    }

    async startGame(lobbyId) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) {
            return { success: false, error: 'Lobby not found' };
        }

        return await lobby.startGame();
    }

    getLobby(lobbyId) {
        const lobby = this.lobbies.get(lobbyId);
        return lobby ? lobby.getState() : null;
    }

    getUserLobby(userId) {
        const lobbyId = this.userLobbies.get(userId);
        return lobbyId ? this.getLobby(lobbyId) : null;
    }

    getPublicLobbies(gameId = null) {
        const lobbies = [];
        for (const lobby of this.lobbies.values()) {
            if (!lobby.isPrivate && lobby.status === LOBBY_STATUS.WAITING) {
                if (!gameId || lobby.gameId === gameId) {
                    lobbies.push(lobby.getState());
                }
            }
        }
        return lobbies;
    }

    cleanup() {
        const now = Date.now();
        const maxAge = 1800000; // 30 minutes

        for (const [lobbyId, lobby] of this.lobbies.entries()) {
            // Remove old waiting lobbies
            if (lobby.status === LOBBY_STATUS.WAITING && now - lobby.createdAt > maxAge) {
                // Notify players
                lobby.broadcastUpdate('lobby-timeout', {});

                // Remove all players
                lobby.players.forEach(p => this.userLobbies.delete(p.userId));

                this.lobbies.delete(lobbyId);
            }
        }
    }
}

// Export singleton
export const lobbyManager = new LobbyManager();
export { LOBBY_STATUS, Lobby };

// Cleanup old lobbies every 5 minutes
setInterval(() => lobbyManager.cleanup(), 300000);
