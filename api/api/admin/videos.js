// Admin Videos API - Serverless Function
// Handles admin operations for video management

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // AUTH REMOVED — CLEAN RESET

    switch (req.method) {
      case 'GET':
        return await handleGetVideos(req, res);
      case 'POST':
        return await handleCreateVideo(req, res);
      case 'PUT':
        return await handleUpdateVideo(req, res);
      case 'DELETE':
        return await handleDeleteVideo(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Admin videos API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Verify admin token (simplified - use proper auth in production)
async function verifyAdminToken(token) {
  // In production, verify JWT token or API key
  // For now, accept a simple admin password hash
  const adminPassword = process.env.ADMIN_PASSWORD || 'doitasap2025';
  const crypto = await import('crypto');

  const expectedHash = crypto.default
    .createHash('sha256')
    .update(adminPassword)
    .digest('hex');

  return token === expectedHash;
}

// GET /api/admin/videos - List all videos with admin details
async function handleGetVideos(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      moderation_status,
      source,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    // Fetch videos from Cloudinary with admin metadata
    const videos = await fetchVideosFromCloudinary({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      moderation_status,
      source,
      sort,
      order
    });

    // Add admin-specific metadata
    const enrichedVideos = await Promise.all(
      videos.map(async (video) => await enrichVideoWithAdminData(video))
    );

    res.json({
      videos: enrichedVideos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await getTotalVideoCount(),
        hasMore: enrichedVideos.length === parseInt(limit)
      },
      stats: await getVideoStats()
    });

  } catch (error) {
    console.error('Error fetching admin videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
}

// POST /api/admin/videos - Create/update video metadata
async function handleCreateVideo(req, res) {
  try {
    const {
      public_id,
      title,
      description,
      tags,
      category,
      is_featured,
      is_private,
      moderation_status
    } = req.body;

    if (!public_id) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    // Update video metadata in database/cache
    const updatedVideo = await updateVideoMetadata(public_id, {
      title,
      description,
      tags,
      category,
      is_featured: Boolean(is_featured),
      is_private: Boolean(is_private),
      moderation_status,
      updated_by: 'admin',
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      video: updatedVideo
    });

  } catch (error) {
    console.error('Error creating/updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
}

// PUT /api/admin/videos - Bulk update videos
async function handleUpdateVideo(req, res) {
  try {
    const { video_ids, updates } = req.body;

    if (!Array.isArray(video_ids) || video_ids.length === 0) {
      return res.status(400).json({ error: 'Video IDs array is required' });
    }

    // Bulk update videos
    const results = await bulkUpdateVideos(video_ids, updates);

    res.json({
      success: true,
      updated: results.updated,
      failed: results.failed,
      results: results.details
    });

  } catch (error) {
    console.error('Error bulk updating videos:', error);
    res.status(500).json({ error: 'Failed to update videos' });
  }
}

// DELETE /api/admin/videos - Delete videos
async function handleDeleteVideo(req, res) {
  try {
    const { public_ids } = req.body;

    if (!Array.isArray(public_ids) || public_ids.length === 0) {
      return res.status(400).json({ error: 'Public IDs array is required' });
    }

    // Delete videos from Cloudinary and database
    const results = await bulkDeleteVideos(public_ids);

    res.json({
      success: true,
      deleted: results.deleted,
      failed: results.failed,
      results: results.details
    });

  } catch (error) {
    console.error('Error deleting videos:', error);
    res.status(500).json({ error: 'Failed to delete videos' });
  }
}

// Helper functions

async function fetchVideosFromCloudinary(options) {
  // In production, this would query your database or Cloudinary API
  // For now, return mock data structure
  return [
    {
      public_id: 'farragna/sample_1',
      title: 'Sample Video 1',
      created_at: new Date().toISOString(),
      bytes: 10485760,
      moderation_status: 'approved',
      source: 'cloudinary'
    }
  ];
}

async function enrichVideoWithAdminData(video) {
  // Add admin-specific data like view counts, engagement metrics, etc.
  return {
    ...video,
    admin_data: {
      view_count: Math.floor(Math.random() * 1000),
      like_count: Math.floor(Math.random() * 100),
      comment_count: Math.floor(Math.random() * 50),
      share_count: Math.floor(Math.random() * 20),
      last_viewed: new Date().toISOString(),
      moderation_history: []
    }
  };
}

async function getTotalVideoCount() {
  // Return total count from database
  return 150; // Mock
}

async function getVideoStats() {
  return {
    total_videos: 150,
    approved_videos: 140,
    pending_moderation: 8,
    rejected_videos: 2,
    total_views: 12500,
    total_likes: 2100,
    storage_used: '2.5 GB'
  };
}

async function updateVideoMetadata(publicId, metadata) {
  // Update in database
  console.log(`Updating metadata for ${publicId}:`, metadata);
  return { public_id: publicId, ...metadata };
}

async function bulkUpdateVideos(videoIds, updates) {
  // Bulk update in database
  console.log(`Bulk updating ${videoIds.length} videos:`, updates);
  return {
    updated: videoIds.length,
    failed: 0,
    details: videoIds.map(id => ({ id, success: true }))
  };
}

async function bulkDeleteVideos(publicIds) {
  // Delete from Cloudinary and database
  console.log(`Deleting ${publicIds.length} videos:`, publicIds);
  return {
    deleted: publicIds.length,
    failed: 0,
    details: publicIds.map(id => ({ id, success: true }))
  };
}

// Export for testing
export {
  verifyAdminToken,
  handleGetVideos,
  handleCreateVideo,
  handleUpdateVideo,
  handleDeleteVideo
};