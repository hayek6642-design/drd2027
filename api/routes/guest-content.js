/**
 * Guest Content API Routes
 * Handles content uploads for: Farragna, Nostalgia, Battalooda
 * 
 * IMPORTANT DESIGN:
 * - Guests CAN upload content (status='active' by default)
 * - Guests CAN like/comment, but these are NOT persisted in DB
 * - Only registered user likes/comments are counted
 * - All guest content is stored with author_type='guest' for admin moderation
 * - Admin can flag/block guest content via content_status
 */

import express from 'express';
import { identifyRequester, requireAuth, guestRateLimit } from '../middleware/guest-auth.js';

const router = express.Router();

// Middleware pipeline for all guest content routes
router.use(identifyRequester);

// ============================================================================
// UPLOAD CONTENT (Farragna, Nostalgia, Battalooda)
// ============================================================================
router.post('/upload/:serviceType', requireAuth, guestRateLimit(5, 86400000), async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { title, description, content, mediaUrl, tags } = req.body;
    const dbAdapter = req.app.locals.dbAdapter;

    if (!dbAdapter?.isConnected) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    // Validate service type
    const validServices = ['farragna', 'nostalgia', 'battalooda'];
    if (!validServices.includes(serviceType)) {
      return res.status(400).json({ success: false, error: 'Invalid service type' });
    }

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content required' });
    }

    const tableName = `${serviceType}_posts`;
    const postId = `${serviceType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Prepare insert statement
    const insertSql = `
      INSERT INTO ${tableName} (
        id, author_id, author_type, title, description, content, media_url, 
        tags, status, guest_session_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      postId,
      req.user.isGuest ? null : req.user.userId,
      req.user.isGuest ? 'guest' : 'registered',
      title,
      description || null,
      content,
      mediaUrl || null,
      JSON.stringify(tags || []),
      'active', // Default to active; admin can change
      req.user.isGuest ? req.user.guestId : null,
      now,
      now
    ];

    await dbAdapter.execute(insertSql, params);

    res.json({
      success: true,
      postId,
      message: req.user.isGuest 
        ? 'Your content has been uploaded and is ready to share!'
        : 'Content uploaded successfully'
    });
  } catch (err) {
    console.error('[Guest Content] Upload error:', err.message);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// ============================================================================
// GET FEED (with pagination, status filtering)
// ============================================================================
router.get('/feed/:serviceType', identifyRequester, async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const dbAdapter = req.app.locals.dbAdapter;

    if (!dbAdapter?.isConnected) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    const validServices = ['farragna', 'nostalgia', 'battalooda'];
    if (!validServices.includes(serviceType)) {
      return res.status(400).json({ success: false, error: 'Invalid service type' });
    }

    const tableName = `${serviceType}_posts`;
    const offset = (page - 1) * limit;

    // Count total
    const countSql = `SELECT COUNT(*) as count FROM ${tableName} WHERE status = ?`;
    const countResult = await dbAdapter.queryOne(countSql, [status]);
    const total = countResult?.count || 0;

    // Fetch posts
    const postsSql = `
      SELECT 
        id, author_id, author_type, title, description, content, media_url, 
        tags, status, created_at, updated_at,
        (SELECT COUNT(*) FROM content_likes WHERE content_id = ${tableName}.id AND like_type = 'registered') as like_count,
        (SELECT COUNT(*) FROM content_comments WHERE content_id = ${tableName}.id AND commenter_type = 'registered') as comment_count
      FROM ${tableName}
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const posts = await dbAdapter.query(postsSql, [status, limit, offset]);

    // Parse tags and counts
    const formattedPosts = posts.map(post => ({
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
      like_count: post.like_count || 0,
      comment_count: post.comment_count || 0,
      isOwnPost: req.user?.userId === post.author_id
    }));

    res.json({
      success: true,
      data: formattedPosts,
      pagination: { page: parseInt(page), limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('[Guest Content] Feed error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch feed' });
  }
});

// ============================================================================
// LIKE CONTENT (registered users only - DB persisted)
// ============================================================================
router.post('/like/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const dbAdapter = req.app.locals.dbAdapter;

    if (!dbAdapter?.isConnected) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    // Guests cannot like (ephemeral only)
    if (req.user.isGuest) {
      return res.status(403).json({ 
        success: false, 
        error: 'Registered users can like content. Guests see live reactions only.' 
      });
    }

    // Check if already liked
    const existingLike = await dbAdapter.queryOne(
      'SELECT * FROM content_likes WHERE content_id = ? AND liker_id = ? AND like_type = "registered"',
      [contentId, req.user.userId]
    );

    if (existingLike) {
      return res.status(400).json({ success: false, error: 'You already liked this content' });
    }

    // Insert like
    await dbAdapter.execute(
      `INSERT INTO content_likes (id, content_id, liker_id, like_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        `like_${Date.now()}_${req.user.userId}`,
        contentId,
        req.user.userId,
        'registered',
        new Date().toISOString()
      ]
    );

    res.json({ success: true, message: 'Liked!' });
  } catch (err) {
    console.error('[Guest Content] Like error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to like content' });
  }
});

// ============================================================================
// COMMENT ON CONTENT (registered users only - DB persisted)
// ============================================================================
router.post('/comment/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { text } = req.body;
    const dbAdapter = req.app.locals.dbAdapter;

    if (!dbAdapter?.isConnected) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Comment text required' });
    }

    // Guests cannot comment (ephemeral only)
    if (req.user.isGuest) {
      return res.status(403).json({ 
        success: false, 
        error: 'Registered users can comment. Guests see live chat only.' 
      });
    }

    const commentId = `comment_${Date.now()}_${req.user.userId}`;

    await dbAdapter.execute(
      `INSERT INTO content_comments (id, content_id, commenter_id, commenter_type, text, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        commentId,
        contentId,
        req.user.userId,
        'registered',
        text.substring(0, 500), // Max 500 chars
        new Date().toISOString()
      ]
    );

    res.json({ success: true, commentId, message: 'Comment added!' });
  } catch (err) {
    console.error('[Guest Content] Comment error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

// ============================================================================
// DELETE OWN CONTENT (user/guest)
// ============================================================================
router.delete('/:serviceType/:postId', requireAuth, async (req, res) => {
  try {
    const { serviceType, postId } = req.params;
    const dbAdapter = req.app.locals.dbAdapter;

    if (!dbAdapter?.isConnected) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    const tableName = `${serviceType}_posts`;

    // Verify ownership
    const post = await dbAdapter.queryOne(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [postId]
    );

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Check ownership: registered user by ID, guest by session ID
    const isOwner = req.user.isGuest
      ? post.guest_session_id === req.user.guestId
      : post.author_id === req.user.userId;

    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Cannot delete other user\'s content' });
    }

    // Delete post and associated likes/comments
    await dbAdapter.execute(`DELETE FROM ${tableName} WHERE id = ?`, [postId]);
    await dbAdapter.execute('DELETE FROM content_likes WHERE content_id = ?', [postId]);
    await dbAdapter.execute('DELETE FROM content_comments WHERE content_id = ?', [postId]);

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('[Guest Content] Delete error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// ============================================================================
// ADMIN: FLAG/BLOCK CONTENT (requires registered user with admin role)
// ============================================================================
router.post('/admin/flag/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { reason, status } = req.body;
    const dbAdapter = req.app.locals.dbAdapter;

    if (!dbAdapter?.isConnected) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    // Require registered user (not guest)
    if (req.user.isGuest) {
      return res.status(403).json({ success: false, error: 'Admin action requires registration' });
    }

    // Check if user is admin (you can implement full role checking here)
    const isAdmin = req.user.userId === 'me' || process.env.ADMIN_IDS?.includes(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const validStatuses = ['active', 'review', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    // Update content status (works across all service tables)
    for (const service of ['farragna', 'nostalgia', 'battalooda']) {
      const tableName = `${service}_posts`;
      const result = await dbAdapter.execute(
        `UPDATE ${tableName} SET status = ? WHERE id = ?`,
        [status, contentId]
      );
      
      if (result.changes > 0) {
        // Log moderation action
        await dbAdapter.execute(
          `INSERT INTO admin_audit_log (id, admin_id, action, content_id, reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `audit_${Date.now()}`,
            req.user.userId,
            `flag_${status}`,
            contentId,
            reason || null,
            new Date().toISOString()
          ]
        );

        return res.json({ 
          success: true, 
          message: `Content flagged as ${status}`,
          contentId 
        });
      }
    }

    res.status(404).json({ success: false, error: 'Content not found' });
  } catch (err) {
    console.error('[Guest Content] Admin flag error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to flag content' });
  }
});

export default router;
