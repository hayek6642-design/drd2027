/**
 * Database Migration: Guest Content Tables
 * 
 * Creates tables for:
 * 1. farragna_posts, nostalgia_posts, battalooda_posts (content with author_type tracking)
 * 2. content_likes (registered users only - DB persisted)
 * 3. content_comments (registered users only - DB persisted)
 * 4. admin_audit_log (track admin moderation actions)
 */

export async function up(dbAdapter) {
  const tables = [
    // Farragna posts
    `CREATE TABLE IF NOT EXISTS farragna_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      author_type TEXT CHECK(author_type IN ('registered', 'guest')) DEFAULT 'registered',
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      media_url TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT CHECK(status IN ('active', 'review', 'blocked')) DEFAULT 'active',
      guest_session_id TEXT,
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // Nostalgia posts
    `CREATE TABLE IF NOT EXISTS nostalgia_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      author_type TEXT CHECK(author_type IN ('registered', 'guest')) DEFAULT 'registered',
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      media_url TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT CHECK(status IN ('active', 'review', 'blocked')) DEFAULT 'active',
      guest_session_id TEXT,
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // Battalooda posts
    `CREATE TABLE IF NOT EXISTS battalooda_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      author_type TEXT CHECK(author_type IN ('registered', 'guest')) DEFAULT 'registered',
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      media_url TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT CHECK(status IN ('active', 'review', 'blocked')) DEFAULT 'active',
      guest_session_id TEXT,
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // Content likes (registered users only - DB persisted)
    `CREATE TABLE IF NOT EXISTS content_likes (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      liker_id TEXT NOT NULL,
      like_type TEXT CHECK(like_type = 'registered') DEFAULT 'registered',
      created_at TEXT NOT NULL
    )`,

    // Content comments (registered users only - DB persisted)
    `CREATE TABLE IF NOT EXISTS content_comments (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      commenter_id TEXT NOT NULL,
      commenter_type TEXT CHECK(commenter_type = 'registered') DEFAULT 'registered',
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,

    // Admin audit log
    `CREATE TABLE IF NOT EXISTS admin_audit_log (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      content_id TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    )`
  ];

  // Create indexes for performance
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_farragna_posts_status ON farragna_posts(status)`,
    `CREATE INDEX IF NOT EXISTS idx_farragna_posts_author ON farragna_posts(author_id)`,
    `CREATE INDEX IF NOT EXISTS idx_farragna_posts_guest ON farragna_posts(guest_session_id)`,
    
    `CREATE INDEX IF NOT EXISTS idx_nostalgia_posts_status ON nostalgia_posts(status)`,
    `CREATE INDEX IF NOT EXISTS idx_nostalgia_posts_author ON nostalgia_posts(author_id)`,
    `CREATE INDEX IF NOT EXISTS idx_nostalgia_posts_guest ON nostalgia_posts(guest_session_id)`,
    
    `CREATE INDEX IF NOT EXISTS idx_battalooda_posts_status ON battalooda_posts(status)`,
    `CREATE INDEX IF NOT EXISTS idx_battalooda_posts_author ON battalooda_posts(author_id)`,
    `CREATE INDEX IF NOT EXISTS idx_battalooda_posts_guest ON battalooda_posts(guest_session_id)`,
    
    `CREATE INDEX IF NOT EXISTS idx_content_likes_content ON content_likes(content_id)`,
    `CREATE INDEX IF NOT EXISTS idx_content_likes_liker ON content_likes(liker_id)`,
    
    `CREATE INDEX IF NOT EXISTS idx_content_comments_content ON content_comments(content_id)`,
    `CREATE INDEX IF NOT EXISTS idx_content_comments_commenter ON content_comments(commenter_id)`,
    
    `CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_id)`,
    `CREATE INDEX IF NOT EXISTS idx_admin_audit_log_content ON admin_audit_log(content_id)`
  ];

  try {
    for (const sql of tables) {
      await dbAdapter.execute(sql);
    }
    for (const sql of indexes) {
      await dbAdapter.execute(sql);
    }
    console.log('[Migration] Guest content tables created successfully');
    return true;
  } catch (err) {
    console.error('[Migration] Error creating guest content tables:', err.message);
    throw err;
  }
}

export async function down(dbAdapter) {
  const tables = [
    'admin_audit_log',
    'content_comments',
    'content_likes',
    'farragna_posts',
    'nostalgia_posts',
    'battalooda_posts'
  ];

  try {
    for (const table of tables) {
      await dbAdapter.execute(`DROP TABLE IF EXISTS ${table}`);
    }
    console.log('[Migration] Guest content tables dropped');
    return true;
  } catch (err) {
    console.error('[Migration] Error dropping guest content tables:', err.message);
    throw err;
  }
}
