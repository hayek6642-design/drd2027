// Admin Views/Analytics API - Serverless Function
// Handles analytics, views tracking, and reporting for Farragna

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // AUTH REMOVED - CLEAN RESET
    // No authentication required

    switch (req.method) {
      case 'GET':
        return await handleGetAnalytics(req, res);
      case 'POST':
        return await handleTrackView(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Admin views API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// AUTH REMOVED — CLEAN RESET

// GET /api/admin/views - Get analytics data
async function handleGetAnalytics(req, res) {
  try {
    const {
      period = '7d', // 1d, 7d, 30d, 90d
      metric = 'all', // views, engagement, performance, demographics
      video_id,
      group_by = 'day' // hour, day, week, month
    } = req.query;

    let analyticsData;

    switch (metric) {
      case 'views':
        analyticsData = await getViewAnalytics(period, video_id, group_by);
        break;
      case 'engagement':
        analyticsData = await getEngagementAnalytics(period, video_id, group_by);
        break;
      case 'performance':
        analyticsData = await getPerformanceAnalytics(period, video_id);
        break;
      case 'demographics':
        analyticsData = await getDemographicsAnalytics(period, video_id);
        break;
      case 'all':
      default:
        analyticsData = await getAllAnalytics(period, video_id, group_by);
        break;
    }

    res.json({
      period,
      metric,
      data: analyticsData,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

// POST /api/admin/views - Track a view event
async function handleTrackView(req, res) {
  try {
    const {
      video_id,
      user_id,
      session_id,
      user_agent,
      ip_address,
      referrer,
      watch_duration,
      completion_rate,
      quality,
      device_type,
      location
    } = req.body;

    if (!video_id) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Track the view event
    const viewData = {
      video_id,
      user_id: user_id || generateAnonymousId(),
      session_id: session_id || generateSessionId(),
      timestamp: new Date().toISOString(),
      user_agent,
      ip_address: hashIpAddress(ip_address), // Privacy: hash IP
      referrer,
      watch_duration: watch_duration || 0,
      completion_rate: completion_rate || 0,
      quality: quality || 'auto',
      device_type: detectDeviceType(user_agent),
      location: sanitizeLocation(location),
      event_type: 'view'
    };

    // Store view event (in production, use analytics service like Mixpanel, GA, etc.)
    await storeViewEvent(viewData);

    // Update video statistics
    await updateVideoStats(video_id, viewData);

    res.json({
      success: true,
      tracked: true,
      view_id: generateViewId(viewData)
    });

  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
}

// Analytics helper functions

async function getViewAnalytics(period, videoId, groupBy) {
  // Mock view analytics data
  const days = getPeriodDays(period);
  const data = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 1000) + 100,
      unique_viewers: Math.floor(Math.random() * 500) + 50,
      avg_watch_time: Math.floor(Math.random() * 180) + 30,
      completion_rate: Math.random() * 0.8 + 0.2
    });
  }

  return {
    summary: {
      total_views: data.reduce((sum, d) => sum + d.views, 0),
      total_unique_viewers: data.reduce((sum, d) => sum + d.unique_viewers, 0),
      avg_watch_time: data.reduce((sum, d) => sum + d.avg_watch_time, 0) / data.length,
      avg_completion_rate: data.reduce((sum, d) => sum + d.completion_rate, 0) / data.length
    },
    timeline: data.reverse()
  };
}

async function getEngagementAnalytics(period, videoId, groupBy) {
  const days = getPeriodDays(period);
  const data = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      likes: Math.floor(Math.random() * 100) + 10,
      comments: Math.floor(Math.random() * 50) + 5,
      shares: Math.floor(Math.random() * 20) + 2,
      saves: Math.floor(Math.random() * 30) + 3,
      engagement_rate: Math.random() * 0.15 + 0.05
    });
  }

  return {
    summary: {
      total_likes: data.reduce((sum, d) => sum + d.likes, 0),
      total_comments: data.reduce((sum, d) => sum + d.comments, 0),
      total_shares: data.reduce((sum, d) => sum + d.shares, 0),
      total_saves: data.reduce((sum, d) => sum + d.saves, 0),
      avg_engagement_rate: data.reduce((sum, d) => sum + d.engagement_rate, 0) / data.length
    },
    timeline: data.reverse()
  };
}

async function getPerformanceAnalytics(period, videoId) {
  return {
    load_times: {
      avg_load_time: Math.random() * 2 + 1,
      median_load_time: Math.random() * 1.5 + 0.8,
      p95_load_time: Math.random() * 3 + 2
    },
    playback: {
      buffering_events: Math.floor(Math.random() * 50),
      avg_buffering_time: Math.random() * 5,
      playback_failures: Math.floor(Math.random() * 10)
    },
    quality: {
      hd_views: Math.floor(Math.random() * 1000),
      sd_views: Math.floor(Math.random() * 2000),
      auto_quality_views: Math.floor(Math.random() * 1500)
    }
  };
}

async function getDemographicsAnalytics(period, videoId) {
  return {
    devices: {
      mobile: Math.random() * 0.6 + 0.3,
      desktop: Math.random() * 0.4 + 0.2,
      tablet: Math.random() * 0.2 + 0.1
    },
    browsers: {
      chrome: Math.random() * 0.5 + 0.3,
      safari: Math.random() * 0.3 + 0.1,
      firefox: Math.random() * 0.2 + 0.1,
      edge: Math.random() * 0.15 + 0.05,
      other: Math.random() * 0.1
    },
    locations: [
      { country: 'United States', percentage: Math.random() * 0.3 + 0.2 },
      { country: 'United Kingdom', percentage: Math.random() * 0.15 + 0.1 },
      { country: 'Germany', percentage: Math.random() * 0.12 + 0.08 },
      { country: 'France', percentage: Math.random() * 0.1 + 0.05 },
      { country: 'Other', percentage: Math.random() * 0.2 + 0.1 }
    ],
    age_groups: {
      '18-24': Math.random() * 0.3 + 0.2,
      '25-34': Math.random() * 0.4 + 0.2,
      '35-44': Math.random() * 0.2 + 0.1,
      '45+': Math.random() * 0.15 + 0.05
    }
  };
}

async function getAllAnalytics(period, videoId, groupBy) {
  const [views, engagement, performance, demographics] = await Promise.all([
    getViewAnalytics(period, videoId, groupBy),
    getEngagementAnalytics(period, videoId, groupBy),
    getPerformanceAnalytics(period, videoId),
    getDemographicsAnalytics(period, videoId)
  ]);

  return {
    views,
    engagement,
    performance,
    demographics
  };
}

// Utility functions

function getPeriodDays(period) {
  switch (period) {
    case '1d': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 7;
  }
}

function generateAnonymousId() {
  return 'anon_' + Math.random().toString(36).substr(2, 9);
}

function generateSessionId() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateViewId(viewData) {
  return 'view_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function hashIpAddress(ip) {
  if (!ip) return null;
  const crypto = await import('crypto');
  return crypto.default.createHash('sha256').update(ip).digest('hex');
}

function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

function sanitizeLocation(location) {
  if (!location) return null;
  // Remove sensitive location data, keep only country/region
  const { country, region } = location;
  return { country, region };
}

async function storeViewEvent(viewData) {
  // In production, store in database or analytics service
  console.log('Storing view event:', viewData);
}

async function updateVideoStats(videoId, viewData) {
  // Update video statistics in database
  console.log(`Updating stats for video ${videoId}:`, viewData);
}

// Export for testing
export {
  verifyAdminToken,
  handleGetAnalytics,
  handleTrackView,
  getViewAnalytics,
  getEngagementAnalytics,
  getPerformanceAnalytics,
  getDemographicsAnalytics
};