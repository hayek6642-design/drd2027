import { SessionStore } from './session-store.js';
import { query } from '../../api/config/db.js';
import { authEvents, AUTH_EVENTS } from './auth-events.js';

export const AuthService = {
    /**
     * Login or Register a user by username/email (Simplified for Core Arch)
     * In a full system, this would verify passwords or OAuth tokens first.
     * @param {string} username 
     * @param {string} email 
     * @returns {Promise<{user: object, session: object}>}
     */
    async loginOrRegister(username, email) {
        // 1. Find or Create User
        let userRes = await query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        let user;
        if (userRes.rows.length === 0) {
            // Create New
            const createRes = await query(
                'INSERT INTO users (id, username, email) VALUES ($1, $2, $3) RETURNING *',
                [crypto.randomUUID(), username, email]
            );
            user = createRes.rows[0];
        } else {
            user = userRes.rows[0];
        }

        // 2. Create Session
        const session = await SessionStore.createSession(user.id);

        // 3. Emit Event
        authEvents.emit(AUTH_EVENTS.LOGIN, { userId: user.id, sessionId: session.sessionId });

        return { user, session };
    },

    /**
     * Logout (Revoke Session)
     * @param {string} sessionId 
     */
    async logout(sessionId) {
        if (!sessionId) return;
        await SessionStore.revokeSession(sessionId);
        authEvents.emit(AUTH_EVENTS.LOGOUT, { sessionId });
    },

    /**
     * Validate a raw token and return user context
     * @param {string} token 
     * @returns {Promise<object|null>} User object or null
     */
    async validateSession(token) {
        const session = await SessionStore.getSession(token);
        if (!session) return null;

        // Fetch partial user info to cache in request
        const userRes = await query(
            'SELECT id, username, email, user_type FROM users WHERE id = $1',
            [session.userId]
        );

        if (userRes.rows.length === 0) return null;

        return {
            ...userRes.rows[0],
            sessionId: session.sessionId,
            expiresAt: session.expiresAt
        };
    }
};
