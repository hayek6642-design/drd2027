import { query } from '../../api/config/db.js';
import crypto from 'crypto';

// Hash token before storage to prevent leakage if DB is compromised
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export const SessionStore = {
    /**
     * Create a new session for a user
     * @param {string} userId - The user's UUID
     * @param {number} ttlSeconds - Time to live in seconds (default 7 days)
     * @returns {Promise<{sessionId: string, token: string, expiresAt: Date}>}
     */
    async createSession(userId, ttlSeconds = 604800) {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        const sessionId = crypto.randomUUID();

        const sql = `
            INSERT INTO auth_sessions (id, user_id, token, token_hash, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;

        const res = await query(sql, [sessionId, userId, token, tokenHash, expiresAt]);
        const id = res.rows[0].id;

        return {
            sessionId: id,
            token, // Return raw token ONLY here
            expiresAt
        };
    },

    /**
     * Find a valid session by raw token
     * @param {string} token 
     * @returns {Promise<{userId: string, sessionId: string} | null>}
     */
    async getSession(token) {
        const tokenHash = hashToken(token);
        const sql = `
            SELECT id, user_id, expires_at, revoked
            FROM auth_sessions
            WHERE (token = $1 OR token_hash = $2)
            AND revoked = 0
            AND expires_at > CURRENT_TIMESTAMP;
        `;

        const res = await query(sql, [token, tokenHash]);
        if (res.rows.length === 0) return null;

        return {
            userId: res.rows[0].user_id,
            sessionId: res.rows[0].id,
            expiresAt: res.rows[0].expires_at
        };
    },

    /**
     * Revoke a session
     * @param {string} sessionId 
     */
    async revokeSession(sessionId) {
        await query(
            'UPDATE auth_sessions SET revoked = 1 WHERE id = $1',
            [sessionId]
        );
    },

    /**
     * Revoke all sessions for a user
     * @param {string} userId 
     */
    async revokeAllForUser(userId) {
        await query(
            'UPDATE auth_sessions SET revoked = 1 WHERE user_id = $1',
            [userId]
        );
    }
};
