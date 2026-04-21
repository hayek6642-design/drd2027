/**
 * Guest Migration Endpoint
 * Handles migration of guest content to registered user account
 * Called when guest signs up and creates an account
 */

import express from 'express';
// Guest auth temporarily disabled
function requireGuest(req, res, next) { next(); }

const router = express.Router();

/**
 * Migrate all guest content to registered user
 * POST /api/auth/migrate-guest
 * 
 * Called by: Frontend when user registers
 * Converts: guest content → registered user content
 */
router.post('/migrate-guest', requireGuest, async (req, res) => {
  try {
    const { guestId } = req.body;
    const userId = req.user.userId;
    const dbAdapter = req.app.locals.dbAdapter;

    if (!dbAdapter?.isConnected) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database unavailable' 
      });
    }

    if (!guestId || !guestId.startsWith('guest_')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid guest ID format' 
      });
    }

    let migratedCount = 0;
    const services = ['farragna', 'nostalgia', 'battalooda'];

    // Migrate posts from all services
    for (const service of services) {
      const tableName = `${service}_posts`;

      // Find all posts by this guest
      const guestPosts = await dbAdapter.query(
        `SELECT id, like_count, comment_count FROM ${tableName} 
         WHERE guest_session_id = ? AND author_type = 'guest'`,
        [guestId]
      );

      if (guestPosts.length === 0) continue;

      // Update each post
      for (const post of guestPosts) {
        await dbAdapter.execute(
          `UPDATE ${tableName} 
           SET author_id = ?, author_type = 'registered', guest_session_id = NULL
           WHERE id = ?`,
          [userId, post.id]
        );
        migratedCount++;
      }

      console.log(`[Migration] ${guestPosts.length} ${service} posts migrated`);
    }

    // Log the migration action
    if (migratedCount > 0) {
      await dbAdapter.execute(
        `INSERT INTO admin_audit_log (id, admin_id, action, content_id, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `migration_${Date.now()}_${userId}`,
          userId,
          'guest_migration',
          'multiple',
          `Migrated ${migratedCount} posts from guest_${guestId}`,
          new Date().toISOString()
        ]
      );
    }

    res.json({
      success: true,
      migratedCount,
      message: migratedCount > 0 
        ? `${migratedCount} posts migrated to your account!`
        : 'No guest posts found to migrate'
    });
  } catch (err) {
    console.error('[Migration] Error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Migration failed: ' + err.message 
    });
  }
});

export default router;
