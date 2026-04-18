# Universal Persistent Storage Integration Guide

## Overview

The Universal Persistent Storage V3 system provides automatic persistence for ALL CodeBank services:
- **samme3ny, battalooda** (audio)
- **farragna, nostalgia, eb3at, corsa, yahood** (video)
- **games_centre, settaXtes3a** (gaming)
- **e7ki, zagel** (chat)
- **pebalaash, safecode** (financial/barter)
- **coRsA, prayer_system** (utility)

## Features

✅ **Auto-save** - All user actions (likes, comments, downloads, etc.)
✅ **Conflict Resolution** - Handles multi-device conflicts automatically
✅ **Media Resume** - Remembers video/audio position
✅ **Guest Mode** - Works without authentication
✅ **Offline Support** - Queues actions when offline, syncs when back online
✅ **Cross-Tab Sync** - Updates visible across browser tabs

## Implementation (3 Steps)

### Step 1: Include the Libraries

Add these to your HTML `<head>`:

```html
<!-- Persistent Storage Library -->
<script src="/shared/persistent-storage-v3.js"></script>
<script src="/shared/service-helper.js"></script>
```

### Step 2: Initialize Service Helper

In your service's JavaScript:

```javascript
// Create helper for your service
const persistenceHelper = new ServicePersistenceHelper('service_name');

// Wait for ready
window.addEventListener('service_name_ready', (e) => {
  console.log('Persistence ready!');
});
```

### Step 3: Integrate with Your Actions

#### Example: Like Button

**Before:**
```javascript
likeBtn.addEventListener('click', async () => {
  // Only local change, data lost on reload
  likeBtn.classList.toggle('liked');
});
```

**After:**
```javascript
likeBtn.addEventListener('click', async () => {
  const videoId = likeBtn.dataset.videoId;
  const isLiked = await persistenceHelper.has('like', videoId);
  
  if (isLiked) {
    await persistenceHelper.autoSave('like_remove', videoId, {});
  } else {
    await persistenceHelper.autoSave('like', videoId, {
      likedAt: Date.now(),
      videoTitle: document.title
    });
  }
  
  likeBtn.classList.toggle('liked');
});
```

#### Example: Video Player (Resume Position)

**Before:**
```javascript
videoPlayer.addEventListener('play', () => {
  videoPlayer.currentTime = 0; // Always start from beginning
});
```

**After:**
```javascript
videoPlayer.addEventListener('loadedmetadata', async () => {
  const videoId = videoPlayer.dataset.videoId;
  const resumePosition = await persistenceHelper.getResumePosition(videoId);
  
  if (resumePosition > 10) {
    videoPlayer.currentTime = resumePosition;
    showResumeNotification(resumePosition); // "Resume from 2:34?"
  }
});

videoPlayer.addEventListener('timeupdate', () => {
  // Auto-save every 5 seconds
  if (Math.floor(videoPlayer.currentTime) % 5 === 0) {
    persistenceHelper.saveProgress(
      videoPlayer.dataset.videoId,
      videoPlayer.currentTime,
      videoPlayer.duration
    );
  }
});
```

#### Example: Likes Count (Restore on Page Load)

**Before:**
```javascript
// Hardcoded likes, user data disappears on reload
function displayLikes(videoId) {
  return fetch(`/api/likes/${videoId}`)
    .then(r => r.json())
    .then(data => {
      likeCount.textContent = data.count;
    });
}
```

**After:**
```javascript
async function displayLikes(videoId) {
  // Get from persistent storage
  const userLiked = await persistenceHelper.has('like', videoId);
  const allLikes = await persistenceHelper.getAll('like', { itemId: videoId });
  
  // Update UI
  likeBtn.classList.toggle('liked', userLiked);
  likeCount.textContent = allLikes.length;
  
  // Also fetch from server for real count
  const serverData = await fetch(`/api/likes/${videoId}`).then(r => r.json());
  likeCount.textContent = serverData.count;
}
```

#### Example: Gaming (Save High Score)

```javascript
const gameHelper = new ServicePersistenceHelper('games_centre');

async function endGame(score, level) {
  // Save the result
  await gameHelper.autoSave('score', `game_${gameId}`, {
    score,
    level,
    playTime: elapsedSeconds,
    achievedAt: Date.now()
  }, { priority: 'high' }); // High priority for game scores
  
  // Check personal record
  const allScores = await gameHelper.getAll('score');
  const maxScore = Math.max(...allScores.map(s => s.data.score || 0));
  
  if (score > maxScore) {
    showNewHighScoreAnimation(score);
  }
}

// On page load, restore previous scores
window.addEventListener('games_centre_restore_score', (e) => {
  const scores = e.detail.records;
  displayLeaderboard(scores);
});
```

#### Example: Chat (Save Messages)

```javascript
const chatHelper = new ServicePersistenceHelper('e7ki');

chatInput.addEventListener('keypress', async (e) => {
  if (e.key !== 'Enter') return;
  
  const message = chatInput.value;
  chatInput.value = '';
  
  // Save message immediately (persistent)
  await chatHelper.autoSave('message', `chat_${conversationId}`, {
    text: message,
    sentAt: Date.now(),
    from: currentUserId
  }, { priority: 'high' });
  
  // Display in UI
  displayMessage({ text: message, from: 'me' });
  
  // Also send to server (async)
  fetch('/api/chat/send', {
    method: 'POST',
    body: JSON.stringify({ text: message })
  }).catch(err => {
    // Message already saved locally, will sync when online
    console.log('Will retry when online:', err);
  });
});

// Restore chat history
window.addEventListener('e7ki_restore_message', (e) => {
  const messages = e.detail.records;
  messages.forEach(msg => {
    displayMessage(msg.data);
  });
});
```

## API Reference

### `persistenceHelper.autoSave(action, itemId, data, options)`

Save any action persistently.

**Arguments:**
- `action` (string): Type of action (like, comment, download, score, etc.)
- `itemId` (string): Unique identifier for the item (videoId, postId, etc.)
- `data` (object): Additional data to store
- `options` (object, optional):
  - `priority`: 'high' | 'normal' | 'low' (default: 'normal')
  - `tags`: string[] (for categorization)
  - `expiresAt`: number (timestamp, for temporary data)

**Returns:** Promise<record>

**Example:**
```javascript
await persistenceHelper.autoSave('like', 'video123', {
  likedAt: Date.now(),
  title: 'My Video'
});
```

### `persistenceHelper.has(action, itemId)`

Check if user has already done this action.

**Returns:** Promise<boolean>

**Example:**
```javascript
const liked = await persistenceHelper.has('like', 'video123');
if (liked) {
  likeBtn.classList.add('active');
}
```

### `persistenceHelper.getAll(action, options)`

Get all actions of a type.

**Options:**
- `itemId`: Filter by specific item
- `since`: Timestamp filter (milliseconds)
- `limit`: Max results

**Returns:** Promise<record[]>

**Example:**
```javascript
const likes = await persistenceHelper.getAll('like');
const recentLikes = await persistenceHelper.getAll('like', {
  since: Date.now() - 86400000 // Last 24 hours
});
```

### `persistenceHelper.count(action)`

Count actions of a type.

**Returns:** Promise<number>

**Example:**
```javascript
const likeCount = await persistenceHelper.count('like');
```

### `persistenceHelper.saveProgress(contentId, currentTime, duration, metadata)`

Save media playback position.

**Example:**
```javascript
await persistenceHelper.saveProgress('video123', 120.5, 600, {
  quality: '720p',
  volume: 0.8
});
```

### `persistenceHelper.getResumePosition(contentId)`

Get where user left off watching/listening.

**Returns:** Promise<number> (seconds)

**Example:**
```javascript
const resumeFrom = await persistenceHelper.getResumePosition('video123');
video.currentTime = resumeFrom; // Jump to last position
```

## Conflict Resolution

If the same action is made on multiple devices simultaneously, the system automatically resolves conflicts:

- **Last-Write-Wins (LWW)**: For simple actions (like, unlike)
- **Merge**: For counters and aggregates
- **Max-Value**: For scores and high scores
- **Set-Union**: For collections (comments, messages)

No additional code needed—it all happens automatically!

## Offline Support

Actions are queued locally when offline and automatically synced when connection returns:

```javascript
// This works offline too!
await persistenceHelper.autoSave('like', 'video123', {});

// When connection returns, queued actions sync automatically
window.addEventListener('online', () => {
  console.log('Back online! Syncing queued actions...');
});
```

## Service Registry

All supported services are pre-configured:

```javascript
const SERVICES = {
  'samma3ny': { type: 'audio', category: 'music' },
  'farragna': { type: 'video', category: 'video' },
  'games_centre': { type: 'game', category: 'gaming' },
  'e7ki': { type: 'chat', category: 'communication' },
  // ... and more
};
```

## Performance Tips

### 1. Batch Operations

For multiple saves:

```javascript
await persistenceHelper.batchSave([
  { action: 'like', itemId: 'vid1', data: {} },
  { action: 'like', itemId: 'vid2', data: {} },
  { action: 'like', itemId: 'vid3', data: {} }
]);
```

### 2. Debounce Progress Updates

```javascript
let progressTimeout;

video.addEventListener('timeupdate', () => {
  clearTimeout(progressTimeout);
  progressTimeout = setTimeout(() => {
    persistenceHelper.saveProgress(
      videoId,
      video.currentTime,
      video.duration
    );
  }, 1000); // Save every 1 second (debounced)
});
```

### 3. Use Priority Flag

```javascript
// High priority - syncs immediately
await persistenceHelper.autoSave('like', videoId, {}, { priority: 'high' });

// Normal priority - batched sync
await persistenceHelper.autoSave('view', videoId, {}, { priority: 'normal' });

// Low priority - syncs when convenient
await persistenceHelper.autoSave('analytics', videoId, {}, { priority: 'low' });
```

## Debugging

Enable console logs:

```javascript
// View stored data
const storage = window.universalStorage;
const allActions = await storage.getActions({ service: 'farragna' });
console.log('Stored actions:', allActions);

// Check sync queue
const queue = await storage.getAllFromStore('syncQueue');
console.log('Pending syncs:', queue);

// Export service data
const exported = await persistenceHelper.export();
console.log('Service export:', exported);
```

## Migration from Old System

If you have old localStorage data:

```javascript
// Import old data
const oldData = JSON.parse(localStorage.getItem('old_likes'));
await persistenceHelper.import({
  actions: oldData
});
```

---

**Need help?** Check examples in each service's HTML file or create an issue in GitLab.
