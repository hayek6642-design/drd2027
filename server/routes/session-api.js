/**
 * Session Management API
 * Persistent sessions with secure validation
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Generate secure session ID
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

// Hash password (simple - in production use bcrypt)
async function hashPassword(password) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = req.app.locals.db;
        
        if (!db) {
            return res.status(500).json({ error: 'Database not configured' });
        }
        
        // Validate user credentials
        const passwordHash = await hashPassword(password);
        const user = await db.get(
            'SELECT * FROM users WHERE email = ? AND password_hash = ?',
            [email, passwordHash]
        ).catch(() => null);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create persistent session (30 days)
        const sessionId = generateSessionId();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
        
        await db.run(
            'INSERT INTO sessions (id, user_id, expires_at, created_at, persistent) VALUES (?, ?, ?, datetime("now"), 1)',
            [sessionId, user.id, expiresAt.toISOString()]
        ).catch(() => {});
        
        // Set HTTP-only cookie
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        
        // Also return for localStorage backup
        res.json({
            success: true,
            sessionId: sessionId,
            user: {
                id: user.id,
                email: user.email,
                username: user.username || user.email.split('@')[0]
            },
            expiresAt: expiresAt.toISOString()
        });
        
    } catch (err) {
        console.error('[Login Error]', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/validate-session
router.get('/auth/validate-session', async (req, res) => {
    try {
        const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
        
        if (!sessionId) {
            return res.json({ valid: false, reason: 'no_session' });
        }
        
        const db = req.app.locals.db;
        
        if (!db) {
            return res.json({ valid: false, reason: 'db_error' });
        }
        
        const session = await db.get(
            `SELECT s.*, u.email, u.username, u.id as user_id 
             FROM sessions s 
             LEFT JOIN users u ON s.user_id = u.id 
             WHERE s.id = ? AND s.expires_at > datetime("now")`,
            [sessionId]
        ).catch(() => null);
        
        if (!session) {
            // Clear invalid cookie
            res.clearCookie('sessionId');
            return res.json({ valid: false, reason: 'expired' });
        }
        
        // Extend session if persistent
        if (session.persistent) {
            const newExpiry = new Date();
            newExpiry.setDate(newExpiry.getDate() + 30);
            await db.run(
                'UPDATE sessions SET expires_at = ? WHERE id = ?',
                [newExpiry.toISOString(), sessionId]
            ).catch(() => {});
        }
        
        res.json({
            valid: true,
            user: {
                id: session.user_id,
                email: session.email,
                username: session.username || session.email.split('@')[0]
            },
            sessionId: sessionId
        });
        
    } catch (err) {
        console.error('[Session Validation Error]', err);
        res.status(500).json({ error: 'Validation failed' });
    }
});

// POST /api/auth/logout
router.post('/auth/logout', async (req, res) => {
    try {
        const sessionId = req.cookies?.sessionId;
        
        if (sessionId) {
            const db = req.app.locals.db;
            if (db) {
                await db.run('DELETE FROM sessions WHERE id = ?', [sessionId]).catch(() => {});
            }
        }
        
        res.clearCookie('sessionId');
        res.json({ success: true, message: 'Logged out' });
        
    } catch (err) {
        console.error('[Logout Error]', err);
        res.status(500).json({ error: 'Logout failed' });
    }
});

module.exports = router;
