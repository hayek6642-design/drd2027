/**
 * ═══════════════════════════════════════════════════════════════
 * SafeCode Asset Transfer API
 * Handles user-to-user and admin-to-user asset transfers
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────
// DEPENDENCY: Replace with your actual database client
// Examples: pool (postgres), db (sqlite), supabase client, etc.
// ─────────────────────────────────────────────────────────────
// const { pool } = require('../db');  // Example
// For this implementation, assume db access via provided module

/**
 * POST /api/assets/transfer
 * User-to-user asset transfer
 *
 * Body:
 * {
 *   "asset_id": "code-123",
 *   "asset_type": "code" | "silver" | "gold",
 *   "to_email": "recipient@example.com",
 *   "message": "Here's my asset"
 * }
 *
 * Returns: { success, transfer_id, transferred_at }
 */
router.post('/transfer', async (req, res) => {
  try {
    const { asset_id, asset_type, to_email, message } = req.body;
    const from_email = req.user?.email; // Requires auth middleware

    // Validation
    if (!asset_id || !asset_type || !to_email || !from_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['code', 'silver', 'gold'].includes(asset_type)) {
      return res.status(400).json({ error: 'Invalid asset type' });
    }

    // Check asset ownership
    const tableName = {
      'code': 'codes',
      'silver': 'silver_assets',
      'gold': 'gold_assets'
    }[asset_type];

    // Get asset
    const assetQuery = `
      SELECT id, owner_email FROM ${tableName}
      WHERE id = $1 AND owner_email = $2
    `;
    const assetResult = await db.query(assetQuery, [asset_id, from_email]);

    if (assetResult.rows.length === 0) {
      return res.status(403).json({ error: 'Asset not found or not owned by you' });
    }

    // Record transfer in history
    const historyInsert = `
      INSERT INTO asset_transfers 
        (asset_id, asset_type, from_email, to_email, transfer_type, message, status, created_ip)
      VALUES ($1, $2, $3, $4, 'user', $5, 'completed', $6)
      RETURNING id, transferred_at
    `;
    const historyResult = await db.query(historyInsert, [
      asset_id,
      asset_type,
      from_email,
      to_email,
      message || '',
      req.ip || req.connection.remoteAddress
    ]);

    const transfer_id = historyResult.rows[0].id;
    const transferred_at = historyResult.rows[0].transferred_at;

    // Update asset with transfer source info
    const updateQuery = `
      UPDATE ${tableName}
      SET 
        source_type = 'user_transfer',
        transferred_from_email = $1,
        transferred_at = CURRENT_TIMESTAMP,
        owner_email = $2
      WHERE id = $3
    `;
    await db.query(updateQuery, [from_email, to_email, asset_id]);

    res.json({
      success: true,
      transfer_id,
      transferred_at,
      message: 'Asset transferred successfully'
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed', details: error.message });
  }
});

/**
 * POST /api/assets/admin-send
 * Admin sends asset to user (requires admin role)
 *
 * Body:
 * {
 *   "asset_id": "code-123",
 *   "asset_type": "code" | "silver" | "gold",
 *   "to_email": "recipient@example.com",
 *   "message": "Admin gift"
 * }
 *
 * Returns: { success, transfer_id }
 */
router.post('/admin-send', async (req, res) => {
  try {
    // Verify admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { asset_id, asset_type, to_email, message } = req.body;
    const admin_email = req.user.email;

    if (!asset_id || !asset_type || !to_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tableName = {
      'code': 'codes',
      'silver': 'silver_assets',
      'gold': 'gold_assets'
    }[asset_type];

    // Record transfer
    const historyInsert = `
      INSERT INTO asset_transfers 
        (asset_id, asset_type, from_email, to_email, transfer_type, message, status, created_ip)
      VALUES ($1, $2, $3, $4, 'admin', $5, 'completed', $6)
      RETURNING id, transferred_at
    `;
    const historyResult = await db.query(historyInsert, [
      asset_id,
      asset_type,
      admin_email,
      to_email,
      message || 'Admin transfer',
      req.ip
    ]);

    const transfer_id = historyResult.rows[0].id;

    // Update asset
    const updateQuery = `
      UPDATE ${tableName}
      SET 
        source_type = 'admin_transfer',
        transferred_from_email = $1,
        transferred_at = CURRENT_TIMESTAMP,
        owner_email = $2
      WHERE id = $3
    `;
    await db.query(updateQuery, [admin_email, to_email, asset_id]);

    res.json({
      success: true,
      transfer_id,
      message: 'Asset sent successfully'
    });
  } catch (error) {
    console.error('Admin send error:', error);
    res.status(500).json({ error: 'Send failed', details: error.message });
  }
});

/**
 * GET /api/assets/history
 * Get transfer history for current user
 *
 * Query params:
 * - filter: "sent" | "received" (default: both)
 * - limit: number (default: 50)
 *
 * Returns: { transfers: [...], total: number }
 */
router.get('/history', async (req, res) => {
  try {
    const email = req.user?.email;
    const { filter = 'all', limit = 50 } = req.query;

    if (!email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let query = 'SELECT * FROM asset_transfers WHERE ';
    const params = [];

    if (filter === 'sent') {
      query += 'from_email = $1';
      params.push(email);
    } else if (filter === 'received') {
      query += 'to_email = $1';
      params.push(email);
    } else {
      query += '(from_email = $1 OR to_email = $1)';
      params.push(email);
    }

    query += ' ORDER BY transferred_at DESC LIMIT $' + (params.length + 1);
    params.push(Math.min(parseInt(limit) || 50, 500));

    const result = await db.query(query, params);

    res.json({
      transfers: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history', details: error.message });
  }
});

/**
 * GET /api/assets/sync
 * Get all assets for current user with source information
 *
 * Returns: {
 *   codes: [{ id, content, source_type, transferred_from_email, transferred_at }, ...],
 *   silver: [...],
 *   gold: [...]
 * }
 */
router.get('/sync', async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const assets = { codes: [], silver: [], gold: [] };

    // Fetch codes with source info
    const codesResult = await db.query(
      'SELECT id, content, source_type, transferred_from_email, transferred_at FROM codes WHERE owner_email = $1',
      [email]
    );
    assets.codes = codesResult.rows;

    // Fetch silver assets
    const silverResult = await db.query(
      'SELECT id, content, source_type, transferred_from_email, transferred_at FROM silver_assets WHERE owner_email = $1',
      [email]
    );
    assets.silver = silverResult.rows;

    // Fetch gold assets
    const goldResult = await db.query(
      'SELECT id, content, source_type, transferred_from_email, transferred_at FROM gold_assets WHERE owner_email = $1',
      [email]
    );
    assets.gold = goldResult.rows;

    res.json(assets);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

/**
 * GET /api/assets/:type/stats
 * Get statistics about asset sources
 */
router.get('/:type/stats', async (req, res) => {
  try {
    const email = req.user?.email;
    const { type } = req.params;

    if (!['code', 'silver', 'gold'].includes(type)) {
      return res.status(400).json({ error: 'Invalid asset type' });
    }

    const tableName = {
      'code': 'codes',
      'silver': 'silver_assets',
      'gold': 'gold_assets'
    }[type];

    const statsQuery = `
      SELECT 
        source_type,
        COUNT(*) as count
      FROM ${tableName}
      WHERE owner_email = $1
      GROUP BY source_type
    `;

    const result = await db.query(statsQuery, [email]);
    const stats = {
      self: 0,
      user_transfer: 0,
      admin_transfer: 0
    };

    result.rows.forEach(row => {
      stats[row.source_type] = parseInt(row.count);
    });

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Stats failed' });
  }
});

module.exports = router;
