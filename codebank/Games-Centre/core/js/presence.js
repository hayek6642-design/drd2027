/**
 * User Presence System
 * 
 * Tracks online users and their current activity
 */

const USER_STATUS = {
    ONLINE: 'online',
    IN_GAME: 'in_game',
    IN_LOBBY: 'in_lobby',
    SEARCHING: 'searching',
    AWAY: 'away',
    OFFLINE: 'offline'
};

class PresenceManager {
    constructor() {
        this.users = new Map();
        this.heartbeatInterval = null;
        this.activityTimeout = 180000; // 3 minutes for AFK detection

        this.initHeartbeat();
    }

    /**
     * Set user online
     */
    setOnline(userId, username, metadata = {}) {
        this.users.set(userId, {
            userId,
            username,
            status: USER_STATUS.ONLINE,
            lastActivity: Date.now(),
            metadata,
            currentGame: null,
            currentLobby: null
        });

        this.broadcast('user-online', { userId, username });
    }

    /**
     * Set user status
     */
    setStatus(userId, status, context = {}) {
        const user = this.users.get(userId);
        if (!user) return;

        user.status = status;
        user.lastActivity = Date.now();

        if (status === USER_STATUS.IN_GAME) {
            user.currentGame = context.gameId;
        } else if (status === USER_STATUS.IN_LOBBY) {
            user.currentLobby = context.lobbyId;
        }

        this.broadcast('user-status-changed', {
            userId,
            status,
            context
        });
    }

    /**
     * Update user activity
     */
    updateActivity(userId) {
        const user = this.users.get(userId);
        if (!user) return;

        user.lastActivity = Date.now();

        // If was away, set back to online
        if (user.status === USER_STATUS.AWAY) {
            this.setStatus(userId, USER_STATUS.ONLINE);
        }
    }

    /**
     * Set user offline
     */
    setOffline(userId) {
        const user = this.users.get(userId);
        if (!user) return;

        user.status = USER_STATUS.OFFLINE;
        this.broadcast('user-offline', { userId });

        // Remove after 5 minutes
        setTimeout(() => {
            this.users.delete(userId);
        }, 300000);
    }

    /**
     * Get online users
     */
    getOnlineUsers() {
        const online = [];
        for (const user of this.users.values()) {
            if (user.status !== USER_STATUS.OFFLINE) {
                online.push({
                    userId: user.userId,
                    username: user.username,
                    status: user.status,
                    currentGame: user.currentGame,
                    currentLobby: user.currentLobby
                });
            }
        }
        return online;
    }

    /**
     * Get user status
     */
    getUserStatus(userId) {
        const user = this.users.get(userId);
        return user ? user.status : USER_STATUS.OFFLINE;
    }

    /**
     * Check if user is available for challenges
     */
    isAvailable(userId) {
        const status = this.getUserStatus(userId);
        return status === USER_STATUS.ONLINE || status === USER_STATUS.SEARCHING;
    }

    /**
     * Initialize heartbeat system
     */
    initHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.checkActivity();
        }, 30000); // Every 30 seconds
    }

    /**
     * Check for inactive users
     */
    checkActivity() {
        const now = Date.now();

        for (const user of this.users.values()) {
            if (user.status === USER_STATUS.OFFLINE) continue;

            const inactive = now - user.lastActivity;

            if (inactive > this.activityTimeout) {
                // Mark as away
                if (user.status !== USER_STATUS.AWAY) {
                    this.setStatus(user.userId, USER_STATUS.AWAY);
                }
            }
        }
    }

    /**
     * Broadcast presence update
     */
    broadcast(event, data) {
        window.dispatchEvent(new CustomEvent(`presence-${event}`, {
            detail: data
        }));
    }

    /**
     * Get users by status
     */
    getUsersByStatus(status) {
        const filtered = [];
        for (const user of this.users.values()) {
            if (user.status === status) {
                filtered.push({
                    userId: user.userId,
                    username: user.username
                });
            }
        }
        return filtered;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
}

// Export singleton
export const presence = new PresenceManager();
export { USER_STATUS };
