/**
 * Universal Persistence API Module
 * Handles syncing of all user actions, watching times, preferences across all services
 * Supports multi-device sync, conflict resolution, and offline queue management
 */

import { Router } from 'express';
import { query, pool } from '../config/db.js';
import crypto from 'crypto';

const router = Router();

/**
 * ==================== SYNC ENDPOINTS ====================
 */

/**
 * POST /api/persistence/sync
 * Sync a batch of user actions from client to server
 * Supports: likes, comments, watching positions, game scores, preferences, etc.
 */
router.post('/sync', async (req, res) => {
  try {
    const { 
      actions = [],        // Array of action objects to sync
      mediaProgress = [],  // Array of media progress objects
      userId,              // Optional: authenticated user ID
      userFingerprint,     // Required: device fingerprint
      deviceId             // Required: device ID
    } = req.body;

    // Validate required fields
    if (!userFingerprint || !deviceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userFingerprint and deviceId are required' 
      });
    }

    // Get user ID from auth header or use fingerprint
    const effectiveUserId = userId || userFingerprint;

    // Track results
    const results = {
      actionsSync: [],
      progressSync: [],
      conflicts: [],
      errors: []
    };

    // ========== SYNC UNIVERSAL ACTIONS ==========
    for (const action of actions) {
      try {
        const {
          service,
          action: actionType,
          itemId,
          timestamp,
          vectorClock,
          data = {},
          contentType
        } = action;

        // Validate action
        if (!service || !actionType || !itemId) {
          results.errors.push({ 
            action, 
            error: 'Missing service, action, or itemId' 
          });
          continue;
        }

        // Generate universal key
        const universalKey = `${service}_${actionType}_${itemId}_${effectiveUserId}`;

        // Check for existing record (conflict detection)
        const existing = await query(
          `SELECT * FROM universal_actions WHERE universal_key = $1`,
          [universalKey]
        );

        if (existing.rows.length > 0) {
          // CONFLICT RESOLUTION
          const existingRecord = existing.rows[0];
          
          // Compare vector clocks to determine winner
          const hasConflict = JSON.stringify(vectorClock) !== JSON.stringify(existingRecord.vector_clock);
          
          if (hasConflict) {
            // LWW (Last Write Wins) - compare timestamps
            const shouldUpdate = timestamp > existingRecord.timestamp;
            
            if (!shouldUpdate) {
              // Keep existing, log conflict
              await logConflict(
                universalKey,
                existingRecord.device_id,
                deviceId,
                'lww',
                'existing',
                existingRecord.data,
                data
              );
              
              results.conflicts.push({
                universalKey,
                action: 'conflict_detected_existing_kept',
                resolution: 'lww'
              });
              continue;
            }
          }
        }

        // Upsert action into database
        await query(
          `INSERT INTO universal_actions 
           (universal_key, service, action, item_id, user_id, user_fingerprint, device_id, 
            timestamp, vector_clock, data, content_type, sync_status, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (universal_key) DO UPDATE SET
           timestamp = EXCLUDED.timestamp,
           vector_clock = EXCLUDED.vector_clock,
           data = EXCLUDED.data,
           updated_at = CURRENT_TIMESTAMP`,
          [
            universalKey,
            service,
            actionType,
            itemId,
            effectiveUserId,
            userFingerprint,
            deviceId,
            timestamp,
            JSON.stringify(vectorClock),
            JSON.stringify(data),
            contentType,
            'synced',
            1
          ]
        );

        results.actionsSync.push({
          universalKey,
          status: 'synced',
          action: actionType
        });

      } catch (err) {
        results.errors.push({ 
          action, 
          error: err.message 
        });
      }
    }

    // ========== SYNC MEDIA PROGRESS ==========
    for (const progress of mediaProgress) {
      try {
        const {
          service,
          contentId,
          contentType,
          currentTime,
          duration,
          timestamp,
          metadata = {}
        } = progress;

        if (!service || !contentId) {
          results.errors.push({ 
            progress, 
            error: 'Missing service or contentId' 
          });
          continue;
        }

        const progressKey = `${service}_${contentId}_${effectiveUserId}`;
        const percentage = (currentTime / duration) * 100;

        await query(
          `INSERT INTO media_progress 
           (progress_key, service, content_id, content_type, user_id, user_fingerprint, 
            device_id, current_time, duration, percentage, timestamp, metadata, sync_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (progress_key) DO UPDATE SET
           current_time = EXCLUDED.current_time,
           duration = EXCLUDED.duration,
           percentage = EXCLUDED.percentage,
           timestamp = EXCLUDED.timestamp,
           updated_at = CURRENT_TIMESTAMP`,
          [
            progressKey,
            service,
            contentId,
            contentType,
            effectiveUserId,
            userFingerprint,
            deviceId,
            currentTime,
            duration,
            percentage,
            timestamp,
            JSON.stringify(metadata)
          ]
        );

        results.progressSync.push({
          progressKey,
          status: 'synced',
          service,
          contentId,
          currentTime,
          percentage: percentage.toFixed(2)
        });

      } catch (err) {
        results.errors.push({ 
          progress, 
          error: err.message 
        });
      }
    }

    // Update device last seen
    await updateDeviceLastSeen(deviceId, userFingerprint, effectiveUserId);

    console.log(`[Persistence] Synced ${results.actionsSync.length} actions, ${results.progressSync.length} progress items for user ${effectiveUserId}`);

    res.json({
      success: true,
      synced: results.actionsSync.length + results.progressSync.length,
      details: results
    });

  } catch (err) {
    console.error('[Persistence Sync Error]', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * GET /api/persistence/actions
 * Retrieve user actions from server
 * Query: service, action, limit, offset, userId (optional)
 */
router.get('/actions', async (req, res) => {
  try {
    const { 
      service, 
      action, 
      limit = 100, 
      offset = 0,
      userId,
      userFingerprint
    } = req.query;

    const effectiveUserId = userId || userFingerprint;

    if (!effectiveUserId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId or userFingerprint required' 
      });
    }

    // Build query
    let whereClause = 'user_id = $1';
    let params = [effectiveUserId];
    let paramIndex = 2;

    if (service) {
      whereClause += ` AND service = $${paramIndex}`;
      params.push(service);
      paramIndex++;
    }

    if (action) {
      whereClause += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM universal_actions WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const result = await query(
      `SELECT 
        universal_key, service, action, item_id, user_id, 
        timestamp, data, content_type, version
       FROM universal_actions 
       WHERE ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      total,
      limit,
      offset,
      actions: result.rows.map(row => ({
        ...row,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      }))
    });

  } catch (err) {
    console.error('[Get Actions Error]', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * GET /api/persistence/media-progress
 * Get media watching/listening progress
 * Query: service, contentId, userId
 */
router.get('/media-progress', async (req, res) => {
  try {
    const { 
      service, 
      contentId,
      userId,
      userFingerprint
    } = req.query;

    const effectiveUserId = userId || userFingerprint;

    if (!effectiveUserId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId or userFingerprint required' 
      });
    }

    let whereClause = 'user_id = $1';
    let params = [effectiveUserId];
    let paramIndex = 2;

    if (service) {
      whereClause += ` AND service = $${paramIndex}`;
      params.push(service);
      paramIndex++;
    }

    if (contentId) {
      whereClause += ` AND content_id = $${paramIndex}`;
      params.push(contentId);
      paramIndex++;
    }

    const result = await query(
      `SELECT 
        progress_key, service, content_id, content_type,
        current_time, duration, percentage, completed, 
        metadata, timestamp
       FROM media_progress 
       WHERE ${whereClause}
       ORDER BY timestamp DESC`,
      params
    );

    res.json({
      success: true,
      progress: result.rows.map(row => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      }))
    });

  } catch (err) {
    console.error('[Get Progress Error]', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * GET /api/persistence/resume/:service/:contentId
 * Get resume position for a specific video/audio
 * Returns: currentTime, duration, percentage, lastUpdated
 */
router.get('/resume/:service/:contentId', async (req, res) => {
  try {
    const { service, contentId } = req.params;
    const { userId, userFingerprint } = req.query;

    const effectiveUserId = userId || userFingerprint;

    if (!effectiveUserId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId or userFingerprint required' 
      });
    }

    const progressKey = `${service}_${contentId}_${effectiveUserId}`;

    const result = await query(
      `SELECT 
        current_time, duration, percentage, completed, 
        timestamp, metadata
       FROM media_progress 
       WHERE progress_key = $1`,
      [progressKey]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        found: false,
        resume: null
      });
    }

    const progress = result.rows[0];
    res.json({
      success: true,
      found: true,
      resume: {
        currentTime: progress.current_time,
        duration: progress.duration,
        percentage: progress.percentage,
        completed: progress.completed,
        lastUpdated: progress.timestamp,
        metadata: typeof progress.metadata === 'string' ? JSON.parse(progress.metadata) : progress.metadata
      }
    });

  } catch (err) {
    console.error('[Get Resume Error]', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * GET /api/persistence/stats/:userFingerprint
 * Get user statistics - total actions, services used, etc.
 */
router.get('/stats/:userFingerprint', async (req, res) => {
  try {
    const { userFingerprint } = req.params;

    // Total actions by type
    const actionTypes = await query(
      `SELECT action, COUNT(*) as count 
       FROM universal_actions 
       WHERE user_fingerprint = $1
       GROUP BY action`,
      [userFingerprint]
    );

    // Services used
    const services = await query(
      `SELECT service, COUNT(*) as count 
       FROM universal_actions 
       WHERE user_fingerprint = $1
       GROUP BY service`,
      [userFingerprint]
    );

    // Watching/listening stats
    const progressStats = await query(
      `SELECT 
        COUNT(*) as total_items,
        AVG(percentage) as avg_progress,
        SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_items
       FROM media_progress 
       WHERE user_fingerprint = $1`,
      [userFingerprint]
    );

    const stats = progressStats.rows[0];

    res.json({
      success: true,
      stats: {
        totalActions: actionTypes.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
        actionTypes: actionTypes.rows,
        servicesUsed: services.rows,
        mediaStats: {
          totalItems: parseInt(stats.total_items) || 0,
          avgProgress: parseFloat(stats.avg_progress) || 0,
          completedItems: parseInt(stats.completed_items) || 0
        }
      }
    });

  } catch (err) {
    console.error('[Get Stats Error]', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * DELETE /api/persistence/action/:universalKey
 * Delete a specific action (for user privacy)
 */
router.delete('/action/:universalKey', async (req, res) => {
  try {
    const { universalKey } = req.params;
    const { userFingerprint } = req.query;

    if (!userFingerprint) {
      return res.status(400).json({ 
        success: false, 
        error: 'userFingerprint required' 
      });
    }

    // Verify ownership
    const check = await query(
      `SELECT * FROM universal_actions 
       WHERE universal_key = $1 AND user_fingerprint = $2`,
      [universalKey, userFingerprint]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Action not found or not owned by user' 
      });
    }

    await query(
      `DELETE FROM universal_actions WHERE universal_key = $1`,
      [universalKey]
    );

    res.json({ 
      success: true, 
      message: 'Action deleted' 
    });

  } catch (err) {
    console.error('[Delete Action Error]', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * ==================== HELPER FUNCTIONS ====================
 */

async function logConflict(universalKey, existingDeviceId, incomingDeviceId, strategy, winner, existingData, incomingData) {
  try {
    await query(
      `INSERT INTO conflict_log 
       (timestamp, universal_key, existing_device_id, incoming_device_id, resolution_strategy, winner, existing_data, incoming_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        Date.now(),
        universalKey,
        existingDeviceId,
        incomingDeviceId,
        strategy,
        winner,
        JSON.stringify(existingData),
        JSON.stringify(incomingData)
      ]
    );
  } catch (err) {
    console.error('[Conflict Log Error]', err);
  }
}

async function updateDeviceLastSeen(deviceId, userFingerprint, userId) {
  try {
    // Get user agent and screen info (if available)
    const result = await query(
      `SELECT * FROM user_devices WHERE device_id = $1`,
      [deviceId]
    );

    if (result.rows.length === 0) {
      // Insert new device
      await query(
        `INSERT INTO user_devices 
         (device_id, user_id, user_fingerprint, first_seen, last_seen, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [deviceId, userId, userFingerprint, Date.now(), Date.now(), true]
      );
    } else {
      // Update last seen
      await query(
        `UPDATE user_devices 
         SET last_seen = $1, is_active = true, user_id = $2
         WHERE device_id = $3`,
        [Date.now(), userId, deviceId]
      );
    }
  } catch (err) {
    console.error('[Update Device Error]', err);
  }
}

export default router;
