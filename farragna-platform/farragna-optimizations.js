// ===============================
// 🚀 FARRAGNA PERFORMANCE OPTIMIZATIONS
// ===============================
// Add to farragna.js for better performance & caching

// 1. RESPONSE CACHING MIDDLEWARE
export function cachingMiddleware(ttlSeconds = 300) {
  const cache = new Map()
  
  return (req, res, next) => {
    if (req.method !== 'GET') return next()
    
    const key = `${req.method}:${req.originalUrl}`
    
    // Check cache
    const cached = cache.get(key)
    if (cached && Date.now() < cached.expires) {
      return res.json(cached.data)
    }
    
    // Intercept res.json
    const originalJson = res.json.bind(res)
    res.json = (data) => {
      cache.set(key, {
        data,
        expires: Date.now() + ttlSeconds * 1000
      })
      return originalJson(data)
    }
    
    next()
  }
}

// 2. QUERY OPTIMIZATION - Add indexes & pagination defaults
export const queryOptimizations = `
-- Performance indexes (run in DB)
CREATE INDEX IF NOT EXISTS idx_farragna_videos_owner_status ON farragna_videos(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_farragna_videos_category_created ON farragna_videos(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farragna_like_transactions_giver_created ON farragna_like_transactions(giver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farragna_comments_video_created ON farragna_comments(video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farragna_views_created ON farragna_views(created_at DESC);

-- Add MATERIALIZED VIEW for trending videos (cache expensive computation)
CREATE MATERIALIZED VIEW IF NOT EXISTS farragna_trending AS
SELECT 
  id, owner_id, caption, views_count, likes, comments_count,
  (views_count * 1.5 + likes * 3 + EXTRACT(EPOCH FROM (NOW() - created_at)) * -0.001) as trend_score
FROM farragna_videos
WHERE status = 'ready'
ORDER BY trend_score DESC;

CREATE INDEX IF NOT EXISTS idx_farragna_trending_score ON farragna_trending(trend_score DESC);
`

// 3. BATCH OPERATIONS HELPER
export async function batchInsert(tableName, records, batchSize = 100) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const placeholders = batch.map((_, i) => {
      const cols = Object.keys(batch[0])
      return `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(',')})`
    }).join(',')
    
    const cols = Object.keys(batch[0])
    const values = batch.flatMap(r => cols.map(c => r[c]))
    
    await query(
      `INSERT INTO ${tableName} (${cols.join(',')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      values
    )
  }
}

// 4. RATE LIMIT MIDDLEWARE (memory-based)
export function rateLimitMiddleware(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 100,
    keyGenerator = (req) => req.ip
  } = options
  
  const requests = new Map()
  
  setInterval(() => {
    const now = Date.now()
    for (const [key, data] of requests) {
      data.requests = data.requests.filter(t => now - t < windowMs)
      if (data.requests.length === 0) requests.delete(key)
    }
  }, windowMs)
  
  return (req, res, next) => {
    const key = keyGenerator(req)
    const now = Date.now()
    
    if (!requests.has(key)) {
      requests.set(key, { requests: [] })
    }
    
    const data = requests.get(key)
    data.requests.push(now)
    
    if (data.requests.length > maxRequests) {
      return res.status(429).json({ ok: false, error: 'Too many requests' })
    }
    
    next()
  }
}

// 5. COMPRESSION MIDDLEWARE (for large responses)
export function compressionMiddleware() {
  return (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || ''
    
    if (acceptEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip')
      // Note: In production use compression library
    }
    
    next()
  }
}

// 6. DATABASE CONNECTION POOLING CONFIG
export const dbPoolConfig = {
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  max_lifetime: 60 * 60, // 1 hour
}

// 7. LAZY LOADING HELPERS
export const lazyLoadConfig = {
  feeds: { pageSize: 20, maxPages: 5 }, // Cache 100 videos
  trending: { pageSize: 50, ttl: 3600 }, // Cache 1 hour
  search: { pageSize: 50, ttl: 600 }, // Cache 10 minutes
  profiles: { ttl: 1800 } // Cache 30 minutes
}

// 8. MONITORING & HEALTH CHECKS
export async function healthCheck() {
  try {
    const dbCheck = await query('SELECT 1')
    const cfCheck = fetch('https://api.cloudflare.com/client/v4/accounts/me', {
      headers: { 'Authorization': `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}` }
    })
    
    return {
      ok: true,
      database: 'connected',
      cloudflare: cfCheck ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// 9. SCHEMA OPTIMIZATION SQL
export const schemaOptimizations = `
-- Convert TEXT to JSONB for likes_breakdown (better performance)
ALTER TABLE farragna_videos ALTER COLUMN likes_breakdown TYPE jsonb USING likes_breakdown::jsonb;

-- Add GENERATED COLUMN for engagement score (auto-calculated)
ALTER TABLE farragna_videos ADD COLUMN IF NOT EXISTS engagement_score 
GENERATED ALWAYS AS (views_count + likes * 2 + comments_count * 3) STORED;

-- Add creation/modification timestamps with defaults
ALTER TABLE farragna_videos ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE farragna_videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Partition large tables by date for better performance (optional)
-- CREATE TABLE farragna_videos_2026 PARTITION OF farragna_videos FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
`

// 10. EXPORT OPTIMIZATIONS to main API
export default {
  cachingMiddleware,
  queryOptimizations,
  batchInsert,
  rateLimitMiddleware,
  compressionMiddleware,
  dbPoolConfig,
  lazyLoadConfig,
  healthCheck,
  schemaOptimizations
}
