/**
 * api/routes/yahood.js
 * REST API routes for the Yahood! Mining World game service.
 *
 * Mount in server.js:
 *   const yahoodRoutes = require('./api/routes/yahood');
 *   app.use('/api/yahood', yahoodRoutes);
 *
 * Endpoints:
 *   POST /api/yahood/home        — claim home position (once per user)
 *   GET  /api/yahood/home        — get home position for current user
 *   GET  /api/yahood/map         — get public map data (zones, treasures, homes)
 *   POST /api/yahood/treasure    — admin: seed a treasure on the map
 *   POST /api/yahood/steal       — report a theft event (PvP)
 */

const express = require('express');
const router  = express.Router();

/* ─────────────────────────────────────────────────
   Middleware: require authenticated user
───────────────────────────────────────────────── */
function requireAuth(req, res, next) {
    const userId = req.user?.id || req.session?.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = userId;
    next();
}

/* ─────────────────────────────────────────────────
   POST /api/yahood/home
   Body: { lat: number, lng: number }
   Claim a home position (one-time, irreversible).
───────────────────────────────────────────────── */
router.post('/home', requireAuth, async (req, res) => {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'lat and lng are required numbers.' });
    }

    try {
        const db = req.app.get('db'); // Turso/SQLite client set on app

        // Check if user already has a home
        const existing = await db.execute(
            'SELECT * FROM yahood_homes WHERE user_id = ?',
            [req.userId]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Home already set.', home: existing.rows[0] });
        }

        // Validate: not too close to a treasure (50m minimum)
        const treasures = await db.execute('SELECT lat, lng FROM yahood_map WHERE type = ?', ['treasure']);
        for (const t of treasures.rows) {
            const dist = haversineMeters(lat, lng, t.lat, t.lng);
            if (dist < 50) {
                return res.status(409).json({ error: 'Home too close to a treasure zone (min 50 m).' });
            }
        }

        await db.execute(
            'INSERT INTO yahood_homes (user_id, lat, lng, created_at) VALUES (?, ?, ?, ?)',
            [req.userId, lat, lng, Date.now()]
        );

        res.json({ success: true, home: { user_id: req.userId, lat, lng } });
    } catch (err) {
        console.error('[Yahood] /home POST error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* ─────────────────────────────────────────────────
   GET /api/yahood/home
   Returns the home position for the current user.
───────────────────────────────────────────────── */
router.get('/home', requireAuth, async (req, res) => {
    try {
        const db = req.app.get('db');
        const result = await db.execute(
            'SELECT lat, lng, created_at FROM yahood_homes WHERE user_id = ?',
            [req.userId]
        );
        if (result.rows.length === 0) {
            return res.json({ home: null });
        }
        res.json({ home: result.rows[0] });
    } catch (err) {
        console.error('[Yahood] /home GET error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* ─────────────────────────────────────────────────
   GET /api/yahood/map
   Returns public map entities (treasures, homes,
   protected zones) — excludes home coords for privacy.
───────────────────────────────────────────────── */
router.get('/map', async (req, res) => {
    try {
        const db = req.app.get('db');
        const mapData = await db.execute('SELECT * FROM yahood_map ORDER BY type');
        res.json({ entities: mapData.rows });
    } catch (err) {
        console.error('[Yahood] /map GET error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* ─────────────────────────────────────────────────
   POST /api/yahood/treasure  [admin only]
   Body: { lat, lng, type: 'codes'|'silver'|'gold', amount }
───────────────────────────────────────────────── */
router.post('/treasure', requireAuth, async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only.' });

    const { lat, lng, type, amount } = req.body;
    if (!lat || !lng || !type || !amount) {
        return res.status(400).json({ error: 'lat, lng, type, and amount required.' });
    }

    try {
        const db = req.app.get('db');
        await db.execute(
            'INSERT INTO yahood_map (lat, lng, type, asset_type, amount, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [lat, lng, 'treasure', type, amount, Date.now()]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[Yahood] /treasure POST error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* ─────────────────────────────────────────────────
   POST /api/yahood/steal
   Body: { victimId, treasureIds: string[] }
   Records a PvP theft event; the winner keeps the
   treasure in their pending until they reach home.
───────────────────────────────────────────────── */
router.post('/steal', requireAuth, async (req, res) => {
    const { victimId, treasureIds } = req.body;
    if (!victimId || !Array.isArray(treasureIds) || treasureIds.length === 0) {
        return res.status(400).json({ error: 'victimId and treasureIds required.' });
    }

    try {
        const db = req.app.get('db');
        const now = Date.now();
        for (const tid of treasureIds) {
            await db.execute(
                'INSERT INTO yahood_thefts (thief_id, victim_id, treasure_id, stolen_at) VALUES (?, ?, ?, ?)',
                [req.userId, victimId, tid, now]
            );
        }
        res.json({ success: true, stolen: treasureIds.length });
    } catch (err) {
        console.error('[Yahood] /steal POST error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* ─────────────────────────────────────────────────
   DB Schema helper (run once on server startup)
───────────────────────────────────────────────── */
router.initSchema = async function(db) {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS yahood_homes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    TEXT    NOT NULL UNIQUE,
            lat        REAL    NOT NULL,
            lng        REAL    NOT NULL,
            created_at INTEGER NOT NULL
        )
    `);
    await db.execute(`
        CREATE TABLE IF NOT EXISTS yahood_map (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            lat        REAL    NOT NULL,
            lng        REAL    NOT NULL,
            type       TEXT    NOT NULL,   -- 'treasure' | 'zone' | 'home_marker'
            asset_type TEXT,               -- 'codes' | 'silver' | 'gold'
            amount     INTEGER DEFAULT 0,
            claimed_by TEXT,
            created_at INTEGER NOT NULL
        )
    `);
    await db.execute(`
        CREATE TABLE IF NOT EXISTS yahood_thefts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            thief_id    TEXT    NOT NULL,
            victim_id   TEXT    NOT NULL,
            treasure_id TEXT    NOT NULL,
            stolen_at   INTEGER NOT NULL
        )
    `);
    console.log('[Yahood] DB schema initialized ✓');
};

/* ─────────────────────────────────────────────────
   Utility: Haversine distance in metres
───────────────────────────────────────────────── */
function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = router;
