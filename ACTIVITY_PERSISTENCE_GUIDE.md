# User Activity Persistence System

Complete system for automatically saving and retrieving all user interactions across the application.

## Overview

The system consists of three main components:

1. **UserActivityTracker** (`shared/user-activity-tracker.js`)
   - Central hub for all activity data
   - Manages IndexedDB storage
   - Queues server sync
   - Provides API for saving/retrieving activities

2. **ActivityHooks** (`shared/activity-hooks.js`)
   - Auto-captures all user interactions
   - Hooks into like/comment/share/download buttons
   - Tracks video playback
   - Captures generated code
   - Automatically restores persisted state

3. **ActivityInit** (`shared/activity-init.js`)
   - Initializes system on app load
   - Triggers restoration on startup
   - Sets up auto-sync every 30 seconds

## Tracked Activities

### User Actions
- **Like/Unlike** - Automatically saved when user clicks like button
- **Comments** - Saved when user submits comment form
- **Shares** - Tracked when user shares content
- **Downloads** - Logged when user downloads video

### Watch Time & Progress
- **Video Playback** - Current time, duration, percentage watched
- **Resume Position** - Last watched time for resume functionality
- **Watch Counter** - Global watch time accumulator

### Code Generation
- **Generated Codes** - All code generated in CodeBank/SafeCode
- **Last Code** - Most recent code for quick access
- **Code History** - All codes with timestamps

### Statistics
- **Per-Service Stats** - Likes, comments, shares, downloads per service
- **Activity Aggregates** - Total actions, trends

## Data Storage Hierarchy

1. **Memory Cache** - Instant access to recently used items
2. **IndexedDB** - Local persistent storage in browser
3. **Server** - Turso/SQLite backend for cross-device sync
4. **localStorage** - Auth tokens and simple flags

## Integration Points

### Include in HTML
```html
<!-- Add to <head> or before </body> -->
<script src="/shared/unified-storage.js"></script>
<script src="/shared/user-activity-tracker.js"></script>
<script src="/shared/activity-hooks.js"></script>
<script src="/shared/activity-init.js"></script>
```

### API Usage

#### Save an Action
```javascript
UserActivityTracker.saveAction(
  'farragna',        // service
  'like',            // action type
  'video_123',       // item ID
  { liked: true }    // data
).then(record => console.log('Saved:', record));
```

#### Save Watch Time
```javascript
UserActivityTracker.saveWatchTime(
  'farragna',        // service
  'video_123',       // content ID
  120.5,             // current time
  600,               // duration
  { title: 'Video' } // metadata
);
```

#### Save Generated Code
```javascript
UserActivityTracker.saveCode(
  'safecode',        // service
  'code_123',        // code ID
  {
    language: 'javascript',
    content: 'const x = 1;',
    title: 'My Code'
  }
);
```

#### Get Last Code
```javascript
UserActivityTracker.getLastCode('safecode').then(code => {
  console.log('Last code:', code.content);
});
```

#### Check if User Liked Something
```javascript
if (await UserActivityTracker.hasAction('like', 'video_123')) {
  console.log('Already liked!');
}
```

#### Get All Actions for Item
```javascript
const actions = await UserActivityTracker.getActionsForItem('video_123');
console.log('Likes:', actions.filter(a => a.action === 'like').length);
```

#### Get Service Statistics
```javascript
const stats = await UserActivityTracker.getStats('farragna');
console.log('Likes:', stats.likes, 'Comments:', stats.comments);
```

#### Restore All on App Init
```javascript
UserActivityTracker.restoreAll((results) => {
  console.log('Restored', results.length, 'groups of activities');
  // UI is updated automatically by ActivityHooks
});
```

#### Manual Sync to Server
```javascript
UserActivityTracker.syncWithServer('/api/activity/sync').then(result => {
  console.log('Synced', result.synced, 'items');
});
```

## Auto-Hooked Elements

The system automatically hooks these selectors:

### Buttons/Interactions
- `[data-action="like"]` - Like buttons
- `[data-action="comment"]` - Comment forms
- `[data-action="share"]` - Share buttons
- `[data-action="download"]` - Download buttons
- `.like-btn`, `.comment-form`, `.share-btn`, `.download-btn`
- Any element with `[data-video-id]` or `[data-item-id]`

### Video Players
- All `<video>` elements
- `[data-video-player]` elements
- `.video-player` elements

### Code Elements
- `[data-action="save-code"]` buttons
- `.save-code-btn` elements

### Watch Time
- `#watch-time` element
- `#counter` element

## Data Attributes

Add these to your HTML elements to enable tracking:

```html
<!-- For actions -->
<button data-action="like" data-video-id="vid_123" data-service="farragna">
  Like
</button>

<!-- For videos -->
<video data-video-id="vid_123" data-service="farragna" data-title="My Video">
  <source src="video.mp4">
</video>

<!-- For code blocks -->
<button data-action="save-code" data-language="javascript" data-content="const x = 1;">
  Save Code
</button>
```

## Events Emitted

Listen to these custom events:

```javascript
// When activity is saved
document.addEventListener('activity:saved', (e) => {
  console.log('Saved:', e.detail.action, e.detail.itemId);
});

// When all activities are restored
document.addEventListener('activity:restored', (e) => {
  console.log('Restored', e.detail.count, e.detail.type);
});

// When activity system is ready
document.addEventListener('activity:system:ready', (e) => {
  console.log('Activity system initialized');
});

// When sync completes
document.addEventListener('activity:synced', (e) => {
  console.log('Synced', e.detail.count, 'items');
});
```

## Server API Endpoints

### POST /api/activity/sync
Sync activities to server.

**Request:**
```json
{
  "actions": [
    {
      "id": "action_1234",
      "service": "farragna",
      "action": "like",
      "itemId": "video_123",
      "data": { "liked": true },
      "timestamp": 1234567890
    }
  ],
  "watchTimes": [
    {
      "contentId": "video_123",
      "service": "farragna",
      "currentTime": 120.5,
      "duration": 600,
      "percentageWatched": 20.08
    }
  ],
  "codes": [
    {
      "id": "code_123",
      "service": "safecode",
      "language": "javascript",
      "content": "const x = 1;",
      "title": "My Code",
      "timestamp": 1234567890
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "synced": 3,
  "syncedIds": ["action_1234", "video_123", "code_123"]
}
```

### GET /api/activity/stats
Get user activity statistics (requires authentication).

**Response:**
```json
{
  "userId": "user_123",
  "totalSyncs": 5,
  "totalItems": 45,
  "globalSyncCount": 1234,
  "lastSync": 1234567890
}
```

### GET /api/activity/health
Health check endpoint (public).

**Response:**
```json
{
  "status": "ok",
  "syncCount": 1234,
  "lastSync": 1234567890,
  "userCount": 42
}
```

## Storage Breakdown

### IndexedDB Stores

- **actions** - All like/comment/share/download actions
  - Indexed by: service, action, itemId, timestamp
  
- **watchTime** - Video/audio progress tracking
  - Indexed by: service, lastUpdated
  
- **codes** - Generated code history
  - Indexed by: service, timestamp
  
- **stats** - Aggregated statistics
  - One record per service
  
- **syncLog** - Sync attempt history
  - Auto-incrementing log

### localStorage Keys

- `uact_watch_counter` - Global watch time counter value
- `uact_last_code_{service}` - Most recent code per service

## Synchronization Flow

1. **User Action Triggered**
   - ActivityHooks captures the interaction
   - UserActivityTracker.saveAction() called
   - Data saved to IndexedDB
   - Event emitted

2. **Auto-Save to Memory**
   - Memory cache updated for instant access
   - BroadcastChannel notifies other tabs

3. **Queued for Server Sync**
   - Actions added to sync queue (debounced)
   - Queue flushed every 1-5 seconds based on type

4. **Server Sync (Every 30s)**
   - All unsynced items sent to `/api/activity/sync`
   - Server acknowledges with sync IDs
   - Items marked as synced in IndexedDB

5. **Restoration on App Load**
   - ActivityInit triggers restoreAll()
   - All IndexedDB items loaded into memory
   - UI elements updated with restored state
   - Events emitted for integration

## Performance Considerations

- **Debounced Sync**: Reduces server load by batching requests
- **Memory Cache**: In-memory cache for frequently accessed items
- **Cross-Tab Sync**: BroadcastChannel keeps multiple tabs in sync
- **Lazy Loading**: Data loaded on-demand, not all at startup
- **Automatic Cleanup**: Old sync logs pruned periodically

## Browser Compatibility

- **IndexedDB**: All modern browsers (IE 10+)
- **BroadcastChannel**: Chrome 54+, Firefox 38+, Safari 15.4+
- **Fallback**: Works without BroadcastChannel, uses localStorage messaging

## Troubleshooting

### Activities not persisting
- Check browser console for errors
- Verify IndexedDB is enabled
- Check storage quota not exceeded
- Clear browser cache and retry

### Sync failing
- Check network connectivity
- Verify authentication token is valid
- Check `/api/activity/health` endpoint
- View network tab for failed requests

### Restored data not showing in UI
- Ensure ActivityHooks is initialized
- Verify element selectors match `[data-action]` etc.
- Check that applyActionState() is being called
- Emit custom events if auto-restoration insufficient

## Examples

### Track like button automatically
```html
<button data-action="like" data-video-id="123" data-service="farragna">
  ❤️ Like
</button>
<!-- Automatically tracked when clicked -->
```

### Track video with resume
```html
<video data-video-id="123" data-service="farragna">
  <source src="video.mp4">
</video>

<script>
// On page load, resume from last watched
UserActivityTracker.getWatchTime('123').then(watch => {
  if (watch && watch.currentTime > 0) {
    video.currentTime = watch.currentTime;
    console.log('Resuming from', watch.currentTime, 's');
  }
});
</script>
```

### Display stats
```javascript
UserActivityTracker.getStats('farragna').then(stats => {
  document.getElementById('stats').innerHTML = `
    Likes: ${stats.likes}<br>
    Comments: ${stats.comments}<br>
    Shares: ${stats.shares}<br>
    Downloads: ${stats.downloads}
  `;
});
```

## Future Enhancements

- [ ] Compression for large payloads
- [ ] Conflict resolution for multi-device sync
- [ ] Analytics dashboard
- [ ] Activity replay/timeline
- [ ] Data export/import
- [ ] Scheduled cleanup of old records
