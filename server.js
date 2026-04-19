/**
 * ===============================
 * 🎬 FARRAGNA SERVER - MAIN FILE
 * Express + Feed APIs Integration
 * ===============================
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// ============================================
// DATABASE INITIALIZATION
// ============================================
const db = new sqlite3.Database(
  process.env.DB_PATH || './farragna.db',
  (err) => {
    if (err) console.error('❌ Database connection error:', err);
    else console.log('✅ Database connected');
  }
);

// Initialize database schema
const initDatabase = () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_id TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      duration INTEGER,
      thumbnail_url TEXT,
      video_url TEXT,
      streaming_url TEXT,
      width INTEGER,
      height INTEGER,
      tags TEXT,
      attribution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS url_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER,
      video_url TEXT UNIQUE,
      cached_url TEXT,
      source TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(video_id) REFERENCES videos(id)
    );

    CREATE TABLE IF NOT EXISTS user_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      video_id INTEGER,
      action TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(video_id) REFERENCES videos(id)
    );

    CREATE TABLE IF NOT EXISTS api_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT,
      endpoint TEXT,
      status TEXT,
      response_time INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      user_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_videos_source ON videos(source);
    CREATE INDEX IF NOT EXISTS idx_url_cache_expires ON url_cache(expires_at);
    CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_id ON sessions(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `;

  const statements = schema.split(';').filter(s => s.trim());
  statements.forEach(stmt => {
    db.run(stmt, (err) => {
      if (err) console.error('Schema error:', err);
    });
  });
};

initDatabase();

// ============================================
// FARRAGNA FEED API IMPORTS
// ============================================
// DISABLED: const FeedAPI = require('./farragna-feed/api/feed-api.js');
// DISABLED: const URLCache = require('./farragna-feed/cache/url-cache.js');
// DISABLED: const PexelsClient = require('./farragna-feed/services/pexels-client.js');
// DISABLED: const PixabayClient = require('./farragna-feed/services/pixabay-client.js');
// DISABLED: const MixkitClient = require('./farragna-feed/services/mixkit-client.js');

// Initialize Feed API
// const feedAPI = new FeedAPI(db);
// const urlCache = new URLCache();

// ============================================
// 🎬 FARRAGNA VIDEO FEED ROUTES
// ============================================

// Get video feed with pagination
app.get('/api/videos/feed', async (req, res) => {
  try {
    const { page = 1, limit = 20, query = '' } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM videos';
    const params = [];

    if (query) {
      sql += ' WHERE title LIKE ? OR tags LIKE ? OR description LIKE ?';
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    db.all(sql, params, async (err, videos) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Refresh streaming URLs if expired
      const refreshedVideos = await Promise.all(
        videos.map(async (video) => {
          const cachedUrl = urlCache.get(video.source_id);
          if (cachedUrl) {
            video.streaming_url = cachedUrl;
          } else {
            // Refresh from source
            const freshUrl = await feedAPI.refreshStreamingURL(
              video.source,
              video.source_id
            );
            if (freshUrl) {
              video.streaming_url = freshUrl;
              urlCache.set(video.source_id, freshUrl);
            }
          }
          return video;
        })
      );

      res.json({
        success: true,
        data: refreshedVideos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: videos.length,
        },
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get trending videos
app.get('/api/videos/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const sql = `
      SELECT v.*, COUNT(ui.id) as interaction_count
      FROM videos v
      LEFT JOIN user_interactions ui ON v.id = ui.video_id
      GROUP BY v.id
      ORDER BY interaction_count DESC, v.created_at DESC
      LIMIT ?
    `;

    db.all(sql, [parseInt(limit)], async (err, videos) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        data: videos,
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search videos
app.get('/api/videos/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { source = 'all', limit = 50 } = req.query;

    // Fetch fresh videos from APIs
    const results = await feedAPI.searchVideos(query, {
      source: source !== 'all' ? source : null,
      limit: parseInt(limit),
    });

    if (!results.success) {
      return res.status(500).json({
        error: 'Failed to fetch videos',
        details: results.error,
      });
    }

    // Store results in database
    results.data.forEach((video) => {
      db.run(
        `INSERT OR IGNORE INTO videos 
        (source, source_id, title, description, duration, thumbnail_url, video_url, streaming_url, width, height, tags, attribution)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          video.source,
          video.source_id,
          video.title,
          video.description || '',
          video.duration || 0,
          video.thumbnail_url || '',
          video.video_url || '',
          video.streaming_url || '',
          video.width || 0,
          video.height || 0,
          video.tags || '',
          video.attribution || '',
        ]
      );
    });

    res.json({
      success: true,
      query,
      source,
      data: results.data,
      count: results.data.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get video by ID
app.get('/api/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    db.get('SELECT * FROM videos WHERE id = ?', [id], async (err, video) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Refresh URL if needed
      const cachedUrl = urlCache.get(video.source_id);
      if (cachedUrl) {
        video.streaming_url = cachedUrl;
      } else {
        const freshUrl = await feedAPI.refreshStreamingURL(
          video.source,
          video.source_id
        );
        if (freshUrl) {
          video.streaming_url = freshUrl;
          urlCache.set(video.source_id, freshUrl);
        }
      }

      res.json({
        success: true,
        data: video,
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prefetch next videos (for mobile scrolling)
app.post('/api/videos/prefetch', async (req, res) => {
  try {
    const { current_video_id, query, count = 2 } = req.body;

    const results = await feedAPI.prefetchVideos(query || '', {
      limit: count,
    });

    // Cache the results
    results.data.forEach((video) => {
      urlCache.set(video.source_id, video.streaming_url);
      db.run(
        `INSERT OR IGNORE INTO videos 
        (source, source_id, title, description, duration, thumbnail_url, video_url, streaming_url, width, height, tags, attribution)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          video.source,
          video.source_id,
          video.title,
          video.description || '',
          video.duration || 0,
          video.thumbnail_url || '',
          video.video_url || '',
          video.streaming_url || '',
          video.width || 0,
          video.height || 0,
          video.tags || '',
          video.attribution || '',
        ]
      );
    });

    res.json({
      success: true,
      data: results.data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check for APIs
app.get('/api/videos/health', async (req, res) => {
  try {
    const health = await feedAPI.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get API statistics
app.get('/api/stats', (req, res) => {
  try {
    db.all(
      `SELECT source, endpoint, status, AVG(response_time) as avg_response_time, COUNT(*) as total_requests
       FROM api_stats
       WHERE timestamp > datetime('now', '-1 hour')
       GROUP BY source, endpoint, status`,
      (err, stats) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          success: true,
          data: stats,
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log user interaction
app.post('/api/interactions', (req, res) => {
  try {
    const { user_id, video_id, action } = req.body;

    db.run(
      'INSERT INTO user_interactions (user_id, video_id, action) VALUES (?, ?, ?)',
      [user_id, video_id, action],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({ success: true });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AUTH ENDPOINTS
// ============================================

// Get Google Client ID (GET /api/auth/google-client-id)
app.get('/api/auth/google-client-id', (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || null;
    if (!clientId) {
      return res.status(500).json({
        success: false,
        error: 'GOOGLE_CLIENT_ID not configured'
      });
    }
    res.json({
      success: true,
      clientId: clientId
    });
  } catch (error) {
    console.error('❌ Error getting Google Client ID:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate session (GET /api/auth/me)
// Get auth config (GET /api/auth/config)
app.get('/api/auth/config', (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || null;
    if (!clientId) {
      return res.json({
        success: false,
        message: 'Google auth not configured - using guest mode',
        authenticated: false,
        googleClientId: null
      });
    }
    res.json({
      success: true,
      authenticated: false,
      googleClientId: clientId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const sessionToken = req.headers['x-session-token'] || req.query.sessionToken;

    if (!sessionToken) {
      return res.json({
        success: false,
        authenticated: false,
        message: 'No session token provided',
      });
    }

    db.get(
      `SELECT * FROM sessions WHERE session_id = ? AND expires_at > datetime('now')`,
      [sessionToken],
      (err, session) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!session) {
          return res.json({
            success: false,
            authenticated: false,
            message: 'Session not found or expired',
          });
        }

        // Update last activity
        db.run(
          `UPDATE sessions SET last_activity = datetime('now') WHERE session_id = ?`,
          [sessionToken]
        );

        let userData = {};
        try {
          userData = JSON.parse(session.user_data || '{}');
        } catch (e) {
          // If parsing fails, just use empty object
        }

        res.json({
          success: true,
          authenticated: true,
          user: {
            id: session.user_id,
            ...userData,
          },
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout (POST /api/auth/logout)
app.post('/api/auth/logout', (req, res) => {
  try {
    const sessionToken = req.headers['x-session-token'] || req.body.sessionToken;

    if (!sessionToken) {
      return res.json({ success: false, message: 'No session token' });
    }

    db.run(
      `DELETE FROM sessions WHERE session_id = ?`,
      [sessionToken],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          success: true,
          message: 'Logged out successfully',
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create session (POST /api/auth/login)
app.post('/api/auth/login', (req, res) => {
  try {
    const { userId, userData } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    db.run(
      `INSERT INTO sessions (session_id, user_id, user_data, expires_at) VALUES (?, ?, ?, ?)`,
      [sessionId, userId, JSON.stringify(userData || {}), expiresAt.toISOString()],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          success: true,
          sessionId,
          message: 'Session created',
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ADMIN DASHBOARD ROUTES
// ============================================
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/admin/stats', (req, res) => {
  try {
    db.all(
      `SELECT 
        (SELECT COUNT(*) FROM videos) as total_videos,
        (SELECT COUNT(*) FROM user_interactions) as total_interactions,
        (SELECT COUNT(DISTINCT source) FROM videos) as sources_count,
        (SELECT COUNT(DISTINCT user_id) FROM user_interactions) as unique_users`,
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          success: true,
          data: result[0] || {},
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MAIN ROUTES
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'yt-new-clear.html'));
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Farragna server is running',
    timestamp: new Date(),
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`
    ╔════════════════════════════════╗
    ║  🎬 FARRAGNA SERVER RUNNING    ║
    ║  Port: ${PORT}                    ║
    ║  Feed API: ✅ Connected        ║
    ║  Database: ✅ Connected        ║
    ╚════════════════════════════════╝
  `);
});

module.exports = app;