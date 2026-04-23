# Complete Persistence & Watching Time Integration Guide

## Overview

This guide shows how to integrate **universal persistent storage** into all CodeBank services, with special focus on:
- **Watching time tracking** (video/audio services)
- **Resume positions** (continue from where user left off)
- **User actions** (likes, comments, downloads, etc.)
- **Multi-device sync** (restore data on new device)
- **Offline support** (queue actions, sync when online)

## Server-Side Setup

### 1. Database Tables

All persistent data is stored in Turso/PostgreSQL. The schema includes:

```sql
-- Universal actions (likes, comments, watching, etc.)
CREATE TABLE universal_actions (
  universal_key TEXT UNIQUE,    -- service_action_itemId_userId
  service TEXT,                 -- 'farragna', 'samma3ny', etc.
  action TEXT,                  -- 'like', 'comment', 'watched', etc.
  item_id TEXT,                 -- videoId, songId, gameId, etc.
  user_id TEXT,
  timestamp INTEGER,
  data JSON,                    -- action-specific data
  sync_status TEXT              -- 'synced', 'pending'
);

-- Media watching/listening progress
CREATE TABLE media_progress (
  progress_key TEXT UNIQUE,     -- service_contentId_userId
  service TEXT,
  content_id TEXT,
  current_time REAL,            -- seconds watched/listened
  duration REAL,
  percentage REAL,              -- completion percentage
  completed BOOLEAN,
  timestamp INTEGER,
  metadata JSON                 -- quality, bitrate, playback_rate
);

-- Conflicts (for multi-device sync)
CREATE TABLE conflict_log (
  universal_key TEXT,
  existing_device_id TEXT,
  incoming_device_id TEXT,
  resolution_strategy TEXT,     -- 'lww', 'merge', 'max-value'
  winner TEXT                   -- 'existing' or 'incoming'
);
```

### 2. API Endpoints

All endpoints are at `/api/persistence`:

#### Sync Data
```bash
POST /api/persistence/sync
Body: {
  "actions": [
    {
      "service": "farragna",
      "action": "watched",
      "itemId": "video_123",
      "timestamp": 1234567890,
      "data": {
        "currentTime": 120.5,
        "duration": 600,
        "quality": "1080p",
        "watchedAt": 1234567890
      }
    }
  ],
  "mediaProgress": [
    {
      "service": "farragna",
      "contentId": "video_123",
      "currentTime": 120.5,
      "duration": 600,
      "timestamp": 1234567890,
      "metadata": { "quality": "1080p" }
    }
  ],
  "userFingerprint": "abc123def456",
  "deviceId": "device_789"
}
```

#### Retrieve Actions
```bash
GET /api/persistence/actions?service=farragna&userFingerprint=abc123&limit=100
Response: {
  "success": true,
  "actions": [
    {
      "universal_key": "farragna_watched_video_123_user1",
      "service": "farragna",
      "action": "watched",
      "item_id": "video_123",
      "timestamp": 1234567890,
      "data": {...}
    }
  ]
}
```

#### Get Resume Position
```bash
GET /api/persistence/resume/farragna/video_123?userFingerprint=abc123
Response: {
  "success": true,
  "found": true,
  "resume": {
    "currentTime": 120.5,
    "duration": 600,
    "percentage": 20.08,
    "completed": false,
    "lastUpdated": 1234567890
  }
}
```

#### Get Statistics
```bash
GET /api/persistence/stats/abc123
Response: {
  "success": true,
  "stats": {
    "totalActions": 245,
    "actionTypes": [
      { "action": "watched", "count": 50 },
      { "action": "like", "count": 30 },
      { "action": "comment", "count": 15 }
    ],
    "mediaStats": {
      "totalItems": 50,
      "avgProgress": 45.2,
      "completedItems": 15
    }
  }
}
```

## Client-Side Integration

### 1. Include Scripts in HTML

```html
<!-- Add to your index.html or service HTML -->
<script src="/shared/persistent-storage-v3.js"></script>
<script src="/shared/service-helper.js"></script>
```

### 2. For Video Services (farragna, nostalgia, etc.)

```javascript
// Initialize service
const videoService = new VideoServiceWithPersistence('farragna');
await videoService.init();

// When user clicks play
videoService.startWatchingVideo('video_123', 'Video Title', 600);

// Resume from where user left off
const resume = await videoService.getResumePosition('video_123');
if (resume && !resume.completed) {
  player.currentTime = resume.currentTime;
  console.log(`Resuming from ${resume.percentage.toFixed(1)}%`);
}

// Auto-tracking via video player events (timeupdate, pause, ended)
// No additional code needed - it's automatic!

// Like/unlike
await videoService.toggleLike('video_123', 'Video Title');

// Add comment
await videoService.addComment('video_123', 'Great video!');

// Get stats
const stats = await videoService.getWatchingStats();
console.log(`Watched: ${stats.completedVideos} videos`);
```

### 3. For Audio Services (samma3ny, battalooda)

Same as video:

```javascript
const audioService = new VideoServiceWithPersistence('samma3ny');
await audioService.init();

audioService.startWatchingVideo('song_456', 'Song Title', 240);
const resume = await audioService.getResumePosition('song_456');
if (resume) {
  player.currentTime = resume.currentTime;
}
```

### 4. For Game Services (games_centre, settaXtes3a)

```javascript
const helper = new ServicePersistenceHelper('games_centre');

// Save score
await helper.autoSave('score', 'game_1', {
  score: 5000,
  level: 3,
  playTime: 120,
  completedAt: Date.now()
}, { priority: 'high' });

// Save achievement
await helper.autoSave('achievement', 'game_1', {
  achievementId: 'first_win',
  unlockedAt: Date.now()
}, { priority: 'normal' });

// Get all scores
const scores = await helper.getAll('score');
console.log('Best score:', Math.max(...scores.map(s => s.data.score)));
```

### 5. For Chat Services (e7ki, zagel)

```javascript
const chatHelper = new ServicePersistenceHelper('e7ki');

// Save message
await chatHelper.autoSave('message_sent', 'chat_123', {
  text: 'Hello!',
  sentAt: Date.now(),
  recipientId: 'user_456'
}, { priority: 'high' });

// Save reaction
await chatHelper.autoSave('reaction', 'message_789', {
  emoji: '👍',
  reactedAt: Date.now()
}, { priority: 'normal' });
```

### 6. For Other Services (generic)

```javascript
const helper = new ServicePersistenceHelper('pebalaash');

// Auto-save any action
await helper.autoSave('action_type', 'item_id', {
  // Your custom data here
}, { priority: 'normal' });

// Retrieve all saved actions
const actions = await helper.getAll();

// Batch save (for performance)
await helper.batchSave([
  { action: 'like', itemId: 'item1', data: {} },
  { action: 'like', itemId: 'item2', data: {} },
  { action: 'like', itemId: 'item3', data: {} }
]);
```

## How It Works

### 1. Local Storage (IndexedDB)

When user performs actions:
1. Action is saved to IndexedDB immediately
2. Added to sync queue
3. UI is updated instantly (offline-first)

### 2. Server Sync

When device is online:
1. Client calls `POST /api/persistence/sync` with all queued actions
2. Server receives, checks for conflicts, saves to database
3. Conflict resolution: Last Write Wins (LWW) by default
4. Client deletes synced items from queue
5. All devices can now see the action

### 3. Multi-Device Sync

When user logs in on new device:
1. New device retrieves actions: `GET /api/persistence/actions`
2. Each service calls `restoreFromServer()` to populate IndexedDB
3. UI applies restored state to show all previous actions
4. Seamless experience - no data loss!

### 4. Resume Positions

For videos/audio:
1. Progress is saved to `media_progress` table every 5-10 seconds
2. When video loads, call `getResumePosition(videoId)`
3. Player seeks to `resume.currentTime`
4. Works across devices - watch on phone, continue on tablet!

## Watching Time Specifics

### Tracking Video Watching

```javascript
// When video starts
startedAt = Date.now();
videoService.startWatchingVideo(videoId, title, duration);

// Every second while playing
videoService.updateWatchingProgress(player.currentTime);

// Server receives updates to media_progress table:
{
  "progress_key": "farragna_video_123_user1",
  "service": "farragna",
  "content_id": "video_123",
  "current_time": 45.5,        // seconds
  "duration": 600,              // total length
  "percentage": 7.58,           // calculated
  "timestamp": 1234567890
}
```

### Auto-Actions on Completion

- If `watched > 30 seconds`: Log `'partially_watched'` action
- If `watched 100%`: Log `'watched'` action + `'completed'` action
- All saved to `universal_actions` table

### Offline Watching

If device goes offline while watching:
1. Progress is saved to IndexedDB every 5 seconds
2. When back online, all progress is batched and sent
3. Server merges with any updates from other devices

## Querying Persistence Data

### Get User's Watching History

```sql
SELECT 
  content_id,
  current_time,
  duration,
  percentage,
  updated_at
FROM media_progress
WHERE service = 'farragna' AND user_id = 'user_123'
ORDER BY updated_at DESC
LIMIT 20;
```

### Get Most Watched Videos

```sql
SELECT 
  content_id,
  COUNT(*) as watch_count,
  AVG(percentage) as avg_progress,
  COUNT(CASE WHEN percentage = 100 THEN 1 END) as completed_count
FROM media_progress
WHERE service = 'farragna'
GROUP BY content_id
ORDER BY watch_count DESC
LIMIT 10;
```

### Get User Engagement

```sql
SELECT 
  action,
  COUNT(*) as total,
  COUNT(DISTINCT item_id) as unique_items,
  COUNT(DISTINCT user_id) as users
FROM universal_actions
WHERE service = 'farragna'
GROUP BY action;
```

## Error Handling

### Sync Failures

If sync fails (network error, server error):
```javascript
// Automatically retried up to 5 times with exponential backoff
// If all retries fail:
// 1. Item stays in sync queue (not deleted)
// 2. Next time `processSyncQueue()` runs, it retries
// 3. Logs error in queue item: `lastError`
```

### Conflict Resolution

If same item changed on multiple devices:
```javascript
// Uses Last Write Wins (LWW)
if (incomingTimestamp > existingTimestamp) {
  // Accept incoming
} else {
  // Keep existing
  logConflict(...)  // Logged in conflict_log table
}
```

## Performance Considerations

### Batch Syncing
- Client batches up to 100 actions before sending
- Reduces server load
- Syncs every 30 seconds when online

### Indexing
- Server has indexes on: `user_id`, `service`, `content_id`, `timestamp`
- Queries are fast even with millions of records

### Data Cleanup
- `conflict_log`: Deleted after 90 days
- `activity_stream`: Deleted after 30 days
- `universal_actions`: Kept indefinitely (adjustable)

## Testing

### Test Watching Time

```javascript
// Open console in browser
const service = window.videoService; // or your service instance

// Start watching
await service.startWatchingVideo('test_video', 'Test', 300);

// Simulate progress
for (let i = 0; i <= 300; i += 30) {
  await service.updateWatchingProgress(i);
  await new Promise(r => setTimeout(r, 100));
}

// Stop and complete
await service.stopWatchingVideo(300, true);

// Check IndexedDB
const progress = await service.persistence.getResumePosition('test_video');
console.log(progress);

// Check server
const serverData = await fetch(
  '/api/persistence/resume/farragna/test_video'
).then(r => r.json());
console.log(serverData);
```

### Test Multi-Device Sync

1. Open service on Device A
2. Like a video: `await service.toggleLike('video_1')`
3. Open service on Device B
4. Call: `await service.persistence.restoreFromServer()`
5. Check: `await service.isVideoLiked('video_1')` → should be true!

### Test Offline Mode

1. Open DevTools → Network → Offline
2. Like video, add comment, etc.
3. Check IndexedDB → sync queue has items
4. Go Online
5. Check: items automatically synced!

## Summary

✅ **Watching Time**: Auto-tracked, resumable, multi-device  
✅ **User Actions**: Likes, comments, shares all persisted  
✅ **Offline**: Works without internet, syncs when back online  
✅ **Multi-Device**: Login on phone, see all data on tablet  
✅ **Conflict Resolution**: Intelligent merging of concurrent edits  
✅ **Analytics**: Full query access to user behavior data  

All with **zero additional code** per service (just call `new VideoServiceWithPersistence()`).
