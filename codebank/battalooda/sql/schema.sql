-- Battalooda Database Schema
-- Add to existing CodeBank database

-- Recordings table
CREATE TABLE IF NOT EXISTS battalooda_recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT CHECK(category IN ('quran', 'singing', 'christian')),
    audio_path TEXT NOT NULL,
    has_music BOOLEAN DEFAULT 0,
    music_track_id TEXT, -- Reference to Jamendo ID or local ID
    music_track_info TEXT, -- JSON: {title, artist, source, url}
    duration INTEGER, -- seconds
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Likes table
CREATE TABLE IF NOT EXISTS battalooda_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recording_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recording_id, user_id),
    FOREIGN KEY (recording_id) REFERENCES battalooda_recordings(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS battalooda_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recording_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recording_id) REFERENCES battalooda_recordings(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User favorites for music tracks
CREATE TABLE IF NOT EXISTS battalooda_favorite_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    track_id TEXT NOT NULL, -- Jamendo or local ID
    track_info TEXT, -- JSON snapshot
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_battalooda_recordings_category ON battalooda_recordings(category);
CREATE INDEX IF NOT EXISTS idx_battalooda_recordings_user_id ON battalooda_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_battalooda_recordings_created_at ON battalooda_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_battalooda_likes_recording_id ON battalooda_likes(recording_id);
CREATE INDEX IF NOT EXISTS idx_battalooda_likes_user_id ON battalooda_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_battalooda_comments_recording_id ON battalooda_comments(recording_id);
CREATE INDEX IF NOT EXISTS idx_battalooda_favorite_tracks_user_id ON battalooda_favorite_tracks(user_id);

-- Triggers for automatic comment count updates
CREATE TRIGGER IF NOT EXISTS update_comment_count_after_insert
AFTER INSERT ON battalooda_comments
FOR EACH ROW
BEGIN
    UPDATE battalooda_recordings 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.recording_id;
END;

CREATE TRIGGER IF NOT EXISTS update_comment_count_after_delete
AFTER DELETE ON battalooda_comments
FOR EACH ROW
BEGIN
    UPDATE battalooda_recordings 
    SET comments_count = comments_count - 1 
    WHERE id = OLD.recording_id;
END;

-- Views for easier querying
CREATE VIEW IF NOT EXISTS battalooda_feed AS
SELECT 
    r.id,
    r.user_id,
    u.name as user_name,
    u.avatar as user_avatar,
    r.category,
    r.audio_path,
    r.has_music,
    r.music_track_id,
    r.music_track_info,
    r.duration,
    r.likes,
    r.dislikes,
    r.comments_count,
    r.created_at,
    -- Check if current user liked this recording (would need current user ID passed)
    0 as user_liked
FROM battalooda_recordings r
JOIN users u ON r.user_id = u.id
ORDER BY r.created_at DESC;

-- Function to get user's liked recordings (would need to be called with user ID)
-- This would typically be handled in the application layer, but provided for reference
CREATE VIEW IF NOT EXISTS battalooda_user_likes AS
SELECT 
    l.user_id,
    l.recording_id,
    1 as liked
FROM battalooda_likes l;