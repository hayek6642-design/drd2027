/**
 * Session Binding - Connects all pieces together
 * 
 * Binds:
 * - User Session
 * - Lobby
 * - Game Instance  
 * - Betting Session
 * - Presence
 */

import { presence, USER_STATUS } from './presence.js';
import { lobbyManager } from './lobby-manager.js';
import { bettingCore } from './betting-core.js';
import { transport } from './transport.js';

export class SessionManager {
    constructor() {
        this.activeSessions = new Map();
        this.userSessions = new Map(); // userId -> sessionId
    }

    /**
     * Create a new session
     */
    createSession(userId, username) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const session = {
            sessionId,
            userId,
            username,
            createdAt: Date.now(),
            status: 'active',

            // References
            lobbyId: null,
            gameInstanceId: null,
            betId: null,

            // State
            presenceStatus: USER_STATUS.ONLINE,
            currentGame: null,

            // Metadata
            lastActivity: Date.now()
        };

        this.activeSessions.set(sessionId, session);
        this.userSessions.set(userId, sessionId);

        // Set user online in presence
        presence.setOnline(userId, username);

        // Connect to transport
        transport.connect(userId).catch(error => {
            console.error('[SessionManager] Transport connection failed:', error);
        });

        console.log('[SessionManager] Session created:', sessionId);

        return session;
    }

    /**
     * Bind lobby to session
     */
    bindLobby(sessionId, lobbyId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.lobbyId = lobbyId;
        session.presenceStatus = USER_STATUS.IN_LOBBY;

        presence.setStatus(session.userId, USER_STATUS.IN_LOBBY, {
            lobbyId
        });

        console.log('[SessionManager] Lobby bound to session:', { sessionId, lobbyId });
    }

    /**
     * Bind game to session
     */
    bindGame(sessionId, gameData, gameInstanceId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.gameInstanceId = gameInstanceId;
        session.currentGame = gameData;
        session.presenceStatus = USER_STATUS.IN_GAME;

        presence.setStatus(session.userId, USER_STATUS.IN_GAME, {
            gameId: gameData.id
        });

        console.log('[SessionManager] Game bound to session:', { sessionId, gameId: gameData.id });
    }

    /**
     * Bind bet to session
     */
    bindBet(sessionId, betId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.betId = betId;

        console.log('[SessionManager] Bet bound to session:', { sessionId, betId });
    }

    /**
     * Unbind lobby
     */
    unbindLobby(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        session.lobbyId = null;

        if (session.presenceStatus === USER_STATUS.IN_LOBBY) {
            session.presenceStatus = USER_STATUS.ONLINE;
            presence.setStatus(session.userId, USER_STATUS.ONLINE);
        }
    }

    /**
     * Unbind game
     */
    unbindGame(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        session.gameInstanceId = null;
        session.currentGame = null;

        if (session.presenceStatus === USER_STATUS.IN_GAME) {
            session.presenceStatus = USER_STATUS.ONLINE;
            presence.setStatus(session.userId, USER_STATUS.ONLINE);
        }
    }

    /**
     * Get session
     */
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }

    /**
     * Get user session
     */
    getUserSession(userId) {
        const sessionId = this.userSessions.get(userId);
        return sessionId ? this.activeSessions.get(sessionId) : null;
    }

    /**
     * Update activity
     */
    updateActivity(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        session.lastActivity = Date.now();
        presence.updateActivity(session.userId);
    }

    /**
     * End session
     */
    endSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        // Cleanup lobby if present
        if (session.lobbyId) {
            lobbyManager.leaveLobby(session.lobbyId, session.userId);
        }

        // Cancel bet if active
        if (session.betId) {
            const bet = bettingCore.activeBets.get(session.betId);
            if (bet && bet.status === 'active') {
                bettingCore.cancelBet(session.betId, 'Session ended');
            }
        }

        // Set user offline
        presence.setOffline(session.userId);

        // Remove session
        this.activeSessions.delete(sessionId);
        this.userSessions.delete(session.userId);

        console.log('[SessionManager] Session ended:', sessionId);
    }

    /**
     * Get all active sessions
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Cleanup inactive sessions
     */
    cleanupInactive(maxAge = 3600000) { // 1 hour
        const now = Date.now();

        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (now - session.lastActivity > maxAge) {
                this.endSession(sessionId);
            }
        }
    }
}

// Export singleton
export const sessionManager = new SessionManager();

// Cleanup every 5 minutes
setInterval(() => sessionManager.cleanupInactive(), 300000);
