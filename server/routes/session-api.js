const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();

// Generate secure session ID
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

// Hash password with bcrypt (10 salt rounds)
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// Compare password with hash
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// POST /api/auth/login
// Body: { email, password }
// Response: { success, sessionId, expiresAt, message }
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = req.app.locals.db;
        
        if (!db) {
            return res.status(500).json({ success: false, message: 'Database not initialized' });
        }
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }
        
        // Find user
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, email, password_hash FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Verify password
        const passwordValid = await verifyPassword(password, user.password_hash);
        if (!passwordValid) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Generate session
        const sessionId = generateSessionId();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        // Save session to database
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO sessions (id, user_id, expires_at, persistent) VALUES (?, ?, ?, ?)',
                [sessionId, user.id, expiresAt.toISOString(), 1],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        // Set secure httpOnly cookie
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        
        return res.status(200).json({
            success: true,
            sessionId,
            expiresAt: expiresAt.toISOString(),
            email: user.email,
            message: 'Login successful'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// GET /api/auth/validate-session
// Headers: Cookie with sessionId
// Response: { valid, userId, email, expiresAt }
router.get('/auth/validate-session', async (req, res) => {
    try {
        const sessionId = req.cookies.sessionId;
        const db = req.app.locals.db;
        
        if (!db) {
            return res.status(500).json({ valid: false, message: 'Database not initialized' });
        }
        
        if (!sessionId) {
            return res.status(401).json({ valid: false, message: 'No session found' });
        }
        
        // Check session in database
        const session = await new Promise((resolve, reject) => {
            db.get(
                'SELECT s.id, s.user_id, s.expires_at, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ?',
                [sessionId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!session) {
            return res.status(401).json({ valid: false, message: 'Session not found' });
        }
        
        // Check expiry
        const expiresAt = new Date(session.expires_at);
        if (expiresAt < new Date()) {
            // Session expired, delete it
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM sessions WHERE id = ?', [sessionId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            return res.status(401).json({ valid: false, message: 'Session expired' });
        }
        
        // Extend session expiry on each validation (sliding window)
        const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE sessions SET expires_at = ? WHERE id = ?',
                [newExpiresAt.toISOString(), sessionId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        return res.status(200).json({
            valid: true,
            userId: session.user_id,
            email: session.email,
            expiresAt: newExpiresAt.toISOString(),
            message: 'Session valid'
        });
        
    } catch (error) {
        console.error('Validate session error:', error);
        return res.status(500).json({ valid: false, message: 'Server error validating session' });
    }
});

// POST /api/auth/logout
// Body: none
// Response: { success, message }
router.post('/auth/logout', async (req, res) => {
    try {
        const sessionId = req.cookies.sessionId;
        const db = req.app.locals.db;
        
        if (!db) {
            return res.status(500).json({ success: false, message: 'Database not initialized' });
        }
        
        if (sessionId) {
            // Delete session from database
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM sessions WHERE id = ?', [sessionId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        
        // Clear cookie
        res.clearCookie('sessionId', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });
        
        return res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
        
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ success: false, message: 'Server error during logout' });
    }
});

module.exports = router;
