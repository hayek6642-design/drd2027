import express from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { db } from '../config/db.js';

const router = express.Router();

// Multer configuration for audio uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/battalooda');
        fs.mkdir(uploadDir, { recursive: true }).then(() => {
            cb(null, uploadDir);
        }).catch(cb);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'recording-' + uniqueSuffix + '.webm');
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    }
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// GET /api/battalooda/feed?category=&page=
router.get('/feed', async (req, res) => {
    try {
        const category = req.query.category || 'all';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        let query = `
            SELECT r.*, u.name as user_name, u.avatar as user_avatar,
                   CASE WHEN l.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked
            FROM battalooda_recordings r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN battalooda_likes l ON r.id = l.recording_id AND l.user_id = ?
            WHERE 1=1
        `;
        
        const params = [req.session?.userId || 0];

        if (category !== 'all') {
            query += ' AND r.category = ?';
            params.push(category);
        }

        query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const recordings = await db.all(query, params);

        // Format music track info
        recordings.forEach(recording => {
            if (recording.music_track_info) {
                try {
                    recording.music_track_info = JSON.parse(recording.music_track_info);
                } catch (e) {
                    recording.music_track_info = null;
                }
            }
        });

        res.json({ recordings });
    } catch (error) {
        console.error('Error loading feed:', error);
        res.status(500).json({ error: 'Failed to load recordings' });
    }
});

// POST /api/battalooda/upload
router.post('/upload', requireAuth, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const { category, musicTrackId } = req.body;
        
        if (!category || !['quran', 'singing', 'christian'].includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const audioPath = `/uploads/battalooda/${req.file.filename}`;
        const hasMusic = !!musicTrackId;
        const musicTrackInfo = req.body.musicTrackInfo ? JSON.stringify(JSON.parse(req.body.musicTrackInfo)) : null;

        // Get audio duration (would need audio processing library)
        const duration = 0; // TODO: Extract from audio file

        const result = await db.run(`
            INSERT INTO battalooda_recordings (
                user_id, category, audio_path, has_music, music_track_id, 
                music_track_info, duration, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            req.session.userId, category, audioPath, hasMusic, musicTrackId,
            musicTrackInfo, duration
        ]);

        res.json({ 
            success: true, 
            recordingId: result.lastID,
            message: 'Recording uploaded successfully'
        });
    } catch (error) {
        console.error('Error uploading recording:', error);
        res.status(500).json({ error: 'Failed to upload recording' });
    }
});

// POST /api/battalooda/like
router.post('/like', requireAuth, async (req, res) => {
    try {
        const { recordingId } = req.body;

        if (!recordingId) {
            return res.status(400).json({ error: 'Recording ID required' });
        }

        // Check if already liked
        const existing = await db.get(
            'SELECT * FROM battalooda_likes WHERE recording_id = ? AND user_id = ?',
            [recordingId, req.session.userId]
        );

        if (existing) {
            // Unlike
            await db.run(
                'DELETE FROM battalooda_likes WHERE recording_id = ? AND user_id = ?',
                [recordingId, req.session.userId]
            );
        } else {
            // Like
            await db.run(
                'INSERT INTO battalooda_likes (recording_id, user_id) VALUES (?, ?)',
                [recordingId, req.session.userId]
            );
        }

        // Get updated like count
        const likes = await db.get(
            'SELECT COUNT(*) as count FROM battalooda_likes WHERE recording_id = ?',
            [recordingId]
        );

        res.json({ likes: likes.count });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ error: 'Failed to process like' });
    }
});

// GET /api/battalooda/comments?recordingId=
router.get('/comments', async (req, res) => {
    try {
        const { recordingId, page = 1, limit = 10 } = req.query;
        
        if (!recordingId) {
            return res.status(400).json({ error: 'Recording ID required' });
        }

        const offset = (page - 1) * limit;

        const comments = await db.all(`
            SELECT c.*, u.name as user_name, u.avatar as user_avatar
            FROM battalooda_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.recording_id = ?
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `, [recordingId, parseInt(limit), offset]);

        // Get total count
        const count = await db.get(
            'SELECT COUNT(*) as total FROM battalooda_comments WHERE recording_id = ?',
            [recordingId]
        );

        res.json({ 
            comments, 
            total: count.total,
            page: parseInt(page),
            hasMore: comments.length === parseInt(limit)
        });
    } catch (error) {
        console.error('Error loading comments:', error);
        res.status(500).json({ error: 'Failed to load comments' });
    }
});

// POST /api/battalooda/comment
router.post('/comment', requireAuth, async (req, res) => {
    try {
        const { recordingId, text } = req.body;

        if (!recordingId || !text) {
            return res.status(400).json({ error: 'Recording ID and text required' });
        }

        if (text.length > 500) {
            return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
        }

        // Check if recording exists
        const recording = await db.get(
            'SELECT id FROM battalooda_recordings WHERE id = ?',
            [recordingId]
        );

        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        await db.run(`
            INSERT INTO battalooda_comments (recording_id, user_id, text, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `, [recordingId, req.session.userId, text]);

        // Get updated comment count
        const count = await db.get(
            'SELECT COUNT(*) as count FROM battalooda_comments WHERE recording_id = ?',
            [recordingId]
        );

        res.json({ 
            success: true,
            commentCount: count.count,
            message: 'Comment added successfully'
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// GET /api/battalooda/recording/:id
router.get('/recording/:id', async (req, res) => {
    try {
        const recordingId = req.params.id;
        
        const recording = await db.get(`
            SELECT r.*, u.name as user_name, u.avatar as user_avatar,
                   CASE WHEN l.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked
            FROM battalooda_recordings r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN battalooda_likes l ON r.id = l.recording_id AND l.user_id = ?
            WHERE r.id = ?
        `, [req.session?.userId || 0, recordingId]);

        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        if (recording.music_track_info) {
            try {
                recording.music_track_info = JSON.parse(recording.music_track_info);
            } catch (e) {
                recording.music_track_info = null;
            }
        }

        res.json(recording);
    } catch (error) {
        console.error('Error getting recording:', error);
        res.status(500).json({ error: 'Failed to get recording' });
    }
});

// DELETE /api/battalooda/recording/:id
router.delete('/recording/:id', requireAuth, async (req, res) => {
    try {
        const recordingId = req.params.id;
        
        // Check ownership
        const recording = await db.get(
            'SELECT user_id FROM battalooda_recordings WHERE id = ?',
            [recordingId]
        );

        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        if (recording.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        // Delete associated data
        await db.run('DELETE FROM battalooda_likes WHERE recording_id = ?', [recordingId]);
        await db.run('DELETE FROM battalooda_comments WHERE recording_id = ?', [recordingId]);
        await db.run('DELETE FROM battalooda_recordings WHERE id = ?', [recordingId]);

        res.json({ success: true, message: 'Recording deleted successfully' });
    } catch (error) {
        console.error('Error deleting recording:', error);
        res.status(500).json({ error: 'Failed to delete recording' });
    }
});

// POST /api/battalooda/favorite-tracks
router.post('/favorite-tracks', requireAuth, async (req, res) => {
    try {
        const { trackId, trackInfo } = req.body;

        if (!trackId) {
            return res.status(400).json({ error: 'Track ID required' });
        }

        // Check if already favorited
        const existing = await db.get(
            'SELECT * FROM battalooda_favorite_tracks WHERE user_id = ? AND track_id = ?',
            [req.session.userId, trackId]
        );

        if (existing) {
            return res.status(400).json({ error: 'Track already in favorites' });
        }

        await db.run(`
            INSERT INTO battalooda_favorite_tracks (user_id, track_id, track_info, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `, [req.session.userId, trackId, JSON.stringify(trackInfo)]);

        res.json({ success: true, message: 'Track added to favorites' });
    } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).json({ error: 'Failed to add to favorites' });
    }
});

// GET /api/battalooda/favorite-tracks
router.get('/favorite-tracks', requireAuth, async (req, res) => {
    try {
        const tracks = await db.all(
            'SELECT * FROM battalooda_favorite_tracks WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.userId]
        );

        // Parse track info
        tracks.forEach(track => {
            if (track.track_info) {
                try {
                    track.track_info = JSON.parse(track.track_info);
                } catch (e) {
                    track.track_info = null;
                }
            }
        });

        res.json({ tracks });
    } catch (error) {
        console.error('Error loading favorite tracks:', error);
        res.status(500).json({ error: 'Failed to load favorite tracks' });
    }
});

// DELETE /api/battalooda/favorite-tracks/:trackId
router.delete('/favorite-tracks/:trackId', requireAuth, async (req, res) => {
    try {
        const trackId = req.params.trackId;

        await db.run(
            'DELETE FROM battalooda_favorite_tracks WHERE user_id = ? AND track_id = ?',
            [req.session.userId, trackId]
        );

        res.json({ success: true, message: 'Track removed from favorites' });
    } catch (error) {
        console.error('Error removing from favorites:', error);
        res.status(500).json({ error: 'Failed to remove from favorites' });
    }
});

// POST /api/battalooda/follow
router.post('/follow', requireAuth, async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        // Check if already following
        const existing = await db.get(
            'SELECT * FROM user_follows WHERE follower_id = ? AND following_id = ?',
            [req.session.userId, userId]
        );

        if (existing) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        await db.run(`
            INSERT INTO user_follows (follower_id, following_id, created_at)
            VALUES (?, ?, datetime('now'))
        `, [req.session.userId, userId]);

        res.json({ success: true, message: 'Following user' });
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ error: 'Failed to follow user' });
    }
});

// POST /api/battalooda/report
router.post('/report', requireAuth, async (req, res) => {
    try {
        const { recordingId, reason } = req.body;

        if (!recordingId || !reason) {
            return res.status(400).json({ error: 'Recording ID and reason required' });
        }

        await db.run(`
            INSERT INTO battalooda_reports (user_id, recording_id, reason, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `, [req.session.userId, recordingId, reason]);

        res.json({ success: true, message: 'Recording reported' });
    } catch (error) {
        console.error('Error reporting recording:', error);
        res.status(500).json({ error: 'Failed to report recording' });
    }
});

// GET /api/battalooda/music/search?q=&source=
router.get('/music/search', async (req, res) => {
    try {
        const { q: query, source = 'local' } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }

        let tracks = [];

        if (source === 'local') {
            // Import local library
            const { LOCAL_KARAOKE_LIBRARY } = require('../../codebank/battalooda/js/music-library.js');
            
            const lowerQuery = query.toLowerCase();
            tracks = LOCAL_KARAOKE_LIBRARY.filter(track => 
                track.title.toLowerCase().includes(lowerQuery) ||
                track.artist.toLowerCase().includes(lowerQuery) ||
                track.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
            );
        } else if (source === 'jamendo') {
            // Proxy to Jamendo API
            const { JAMENDO_CONFIG } = require('../../codebank/battalooda/js/music-library.js');
            
            const params = new URLSearchParams({
                ...JAMENDO_CONFIG.defaultParams,
                client_id: JAMENDO_CONFIG.clientId,
                search: query,
                vocalinstrumental: 'instrumental'
            });

            const response = await fetch(`${JAMENDO_CONFIG.apiUrl}/tracks/?${params}`);
            const data = await response.json();

            if (data.headers.status === 'success' && data.results) {
                tracks = data.results.map(track => ({
                    id: track.id,
                    title: track.name,
                    artist: track.artist_name,
                    source: 'jamendo',
                    url: track.audio,
                    duration: Math.floor(track.duration || 0),
                    license: track.license || 'Unknown',
                    preview_url: track.audiodownload || track.audio
                }));
            }
        }

        res.json({ tracks, source });
    } catch (error) {
        console.error('Error searching music:', error);
        res.status(500).json({ error: 'Failed to search music' });
    }
});

// GET /api/battalooda/music/popular?category=
router.get('/music/popular', async (req, res) => {
    try {
        const { category = 'singing' } = req.query;

        let tracks = [];

        // Get local popular tracks by category
        const { LOCAL_KARAOKE_LIBRARY } = await import('../../codebank/battalooda/js/music-library.js');
        
        tracks = LOCAL_KARAOKE_LIBRARY.filter(track => 
            track.category.includes(category)
        ).slice(0, 10); // Get top 10

        res.json({ tracks, category });
    } catch (error) {
        console.error('Error getting popular music:', error);
        res.status(500).json({ error: 'Failed to get popular music' });
    }
});

export default router;