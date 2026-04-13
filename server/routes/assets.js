/**
 * Asset Routes - Server-side API for storage sync
 * 
 * Handles CRUD + batch sync for codes, silver, gold, transactions.
 * Connects to Turso (primary) with SQLite fallback.
 * 
 * Mount in your Express app:
 *   const assetRoutes = require('./routes/assets');
 *   app.use('/api/assets', assetRoutes);
 */

const express = require('express');
const router = express.Router();

const VALID_TYPES = ['codes', 'silver', 'gold', 'transactions'];

function validateType(req, res, next) {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid asset type: ' + type });
  }
  next();
}

// ── Auth middleware for assets routes ───────────────────────────
function verifyAuth(req, res, next) {
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';
  
  const token = req.cookies?.cb_token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Apply auth to all routes
router.use(verifyAuth);

// ── GET all assets of a type ──────────────────────────────

router.get('/:type/all', validateType, async (req, res) => {
  const { type } = req.params;
  const userId = req.userId;

  try {
    // Replace with your actual DB adapter (Turso/SQLite)
    const result = await req.app.locals.db.execute({
      sql: `SELECT * FROM ${type} WHERE user_id = ? ORDER BY timestamp DESC`,
      args: [userId]
    });

    const assets = result.rows.map(row => {
      try {
        return Object.assign({}, row, { data: row.data ? JSON.parse(row.data) : null });
      } catch (e) {
        return row;
      }
    });

    res.json(assets);
  } catch (err) {
    console.error(`[Assets] GET /${type}/all failed:`, err.message);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// ── GET single asset ──────────────────────────────────────

router.get('/:type/:id', validateType, async (req, res) => {
  const { type, id } = req.params;
  const userId = req.userId;

  try {
    const result = await req.app.locals.db.execute({
      sql: `SELECT * FROM ${type} WHERE id = ? AND user_id = ?`,
      args: [id, userId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = result.rows[0];
    if (asset.data) {
      try { asset.data = JSON.parse(asset.data); } catch (e) { /* keep as string */ }
    }

    res.json(asset);
  } catch (err) {
    console.error(`[Assets] GET /${type}/${id} failed:`, err.message);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// ── GET all assets for user (combined) ───────────────────────────
router.get('/all', async (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Use db-adapter if available, otherwise fallback to app.locals.db
    let codes = [], silver = [], gold = [];
    
    if (req.app.locals.dbAdapter) {
      const assets = await req.app.locals.dbAdapter.getUserAssets(userId);
      codes = assets.codes || [];
      silver = assets.silver || [];
      gold = assets.gold || [];
    } else if (req.app.locals.db) {
      // Fallback to existing db
      const [codesResult, silverResult, goldResult] = await Promise.all([
        req.app.locals.db.execute({ sql: 'SELECT * FROM codes WHERE user_id = ? ORDER BY created_at DESC', args: [userId] }),
        req.app.locals.db.execute({ sql: 'SELECT * FROM silver WHERE user_id = ? ORDER BY created_at DESC', args: [userId] }),
        req.app.locals.db.execute({ sql: 'SELECT * FROM gold WHERE user_id = ? ORDER BY created_at DESC', args: [userId] })
      ]);
      codes = codesResult.rows || [];
      silver = silverResult.rows || [];
      gold = goldResult.rows || [];
    }

    res.json({
      codes,
      silver,
      gold,
      userId,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('[Assets] GET /all failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// ── POST sync assets to server ───────────────────────────────────

router.post('/sync', async (req, res) => {
  const { type, key, value, timestamp } = req.body;
  const userId = req.userId;

  if (!type || !key || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid sync payload' });
  }

  try {
    await req.app.locals.db.execute({
      sql: `INSERT INTO ${type} (id, user_id, data, timestamp, server_timestamp)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              data = excluded.data,
              timestamp = excluded.timestamp,
              server_timestamp = excluded.server_timestamp`,
      args: [key, userId, JSON.stringify(value), timestamp || Date.now(), Date.now()]
    });

    res.json({ success: true, synced: true });
  } catch (err) {
    console.error('[Assets] Sync failed:', err.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ── POST batch sync ───────────────────────────────────────

router.post('/sync-batch', async (req, res) => {
  const { items } = req.body;
  const userId = req.userId;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items to sync' });
  }

  // Limit batch size
  if (items.length > 100) {
    return res.status(400).json({ error: 'Batch too large (max 100)' });
  }

  const results = { synced: 0, failed: 0, errors: [] };

  for (const item of items) {
    if (!item.type || !item.key || !VALID_TYPES.includes(item.type)) {
      results.failed++;
      results.errors.push('Invalid item: ' + (item.key || 'unknown'));
      continue;
    }

    try {
      await req.app.locals.db.execute({
        sql: `INSERT INTO ${item.type} (id, user_id, data, timestamp, server_timestamp)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                data = excluded.data,
                timestamp = excluded.timestamp,
                server_timestamp = excluded.server_timestamp`,
        args: [item.key, userId, JSON.stringify(item.value), item.timestamp || Date.now(), Date.now()]
      });
      results.synced++;
    } catch (err) {
      results.failed++;
      results.errors.push(item.key + ': ' + err.message);
    }
  }

  res.json(results);
});

// ── DELETE asset ──────────────────────────────────────────

router.delete('/:type/:id', validateType, async (req, res) => {
  const { type, id } = req.params;
  const userId = req.userId;

  try {
    const result = await req.app.locals.db.execute({
      sql: `DELETE FROM ${type} WHERE id = ? AND user_id = ?`,
      args: [id, userId]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error(`[Assets] DELETE /${type}/${id} failed:`, err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
