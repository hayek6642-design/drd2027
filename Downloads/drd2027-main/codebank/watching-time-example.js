/**
 * Video/Audio Service Watching Time Persistence Example
 * Works for: farragna, nostalgia, eb3at, corsa, yahood (video)
 *           samma3ny, battalooda (audio)
 */

class VideoServiceWithPersistence {
  constructor(serviceName = 'farragna') {
    this.serviceName = serviceName;
    this.persistence = new ServicePersistenceHelper(serviceName);
    
    // Player state
    this.currentVideoId = null;
    this.videoMetadata = new Map(); // videoId -> { duration, title, quality }
    
    this.initPromise = this.init();
  }

  async init() {
    // Wait for persistence to be ready
    await new Promise(r => {
      const check = () => {
        if (this.persistence?.isRestored) {
          r();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });

    this.setupVideoPlayer();
    console.log(`[${this.serviceName}] Persistence initialized`);
    return this;
  }

  // ==================== WATCHING TIME TRACKING ====================

  /**
   * Start tracking video playback
   * Call this when user clicks play on a video
   */
  async startWatchingVideo(videoId, videoTitle, duration = 0) {
    await this.initPromise;

    this.currentVideoId = videoId;
    this.videoMetadata.set(videoId, {
      title: videoTitle,
      duration: duration,
      startedAt: Date.now(),
      quality: 'auto',
      playbackRate: 1.0
    });

    console.log(`[${this.serviceName}] Started watching: ${videoTitle} (${videoId})`);
  }

  /**
   * Update watching progress periodically
   * Call this every 5-10 seconds while video is playing
   * 
   * Usage: 
   *   setInterval(() => {
   *     service.updateWatchingProgress(currentTime);
   *   }, 5000);
   */
  async updateWatchingProgress(currentTime) {
    if (!this.currentVideoId) return;

    const meta = this.videoMetadata.get(this.currentVideoId) || {};
    
    await this.persistence.saveProgress(
      this.currentVideoId,
      currentTime,
      meta.duration || 0,
      {
        title: meta.title,
        quality: meta.quality,
        playbackRate: meta.playbackRate,
        timestamp: Date.now()
      }
    );

    // Calculate percentage
    const percentage = meta.duration ? (currentTime / meta.duration) * 100 : 0;
    
    // Update UI
    this.updateProgressBar(this.currentVideoId, percentage);
  }

  /**
   * Stop watching and finalize progress
   * Call when user closes video or playback ends
   */
  async stopWatchingVideo(currentTime = 0, completed = false) {
    if (!this.currentVideoId) return;

    const meta = this.videoMetadata.get(this.currentVideoId) || {};
    const videoId = this.currentVideoId;

    // Save final position
    await this.persistence.saveProgress(
      videoId,
      currentTime,
      meta.duration || 0,
      {
        completed,
        watchedAt: Date.now(),
        totalDuration: meta.duration,
        percentageWatched: meta.duration ? (currentTime / meta.duration) * 100 : 0
      }
    );

    // Log action (watched, completed, skipped)
    if (completed) {
      await this.persistence.autoSave('watched', videoId, {
        completedAt: Date.now(),
        duration: meta.duration,
        quality: meta.quality
      }, { priority: 'normal' });
    } else if (currentTime > 30) { // Only log if watched more than 30 seconds
      await this.persistence.autoSave('partially_watched', videoId, {
        watchedUntil: currentTime,
        duration: meta.duration,
        percentage: (currentTime / (meta.duration || 1)) * 100
      }, { priority: 'low' });
    }

    console.log(`[${this.serviceName}] Stopped watching: ${videoId}`);
    this.currentVideoId = null;
  }

  // ==================== RESUME PLAYBACK ====================

  /**
   * Get resume position for a video
   * Call when loading a video to resume from where user left off
   * 
   * Usage:
   *   const resume = await service.getResumePosition(videoId);
   *   if (resume) {
   *     player.currentTime = resume.currentTime;
   *   }
   */
  async getResumePosition(videoId) {
    await this.initPromise;

    // Try local first (faster)
    const local = await this.persistence.getResumePosition(videoId);
    if (local) {
      console.log(`[${this.serviceName}] Resume from local: ${videoId} @ ${local.currentTime}s`);
      return local;
    }

    // Try server (for multi-device sync)
    const serverResume = await this.persistence.getProgressFromServer(videoId);
    if (serverResume) {
      // Save locally for next time
      await this.persistence.saveProgress(
        videoId,
        serverResume.currentTime,
        serverResume.duration,
        serverResume.metadata
      );
      console.log(`[${this.serviceName}] Resume from server: ${videoId} @ ${serverResume.currentTime}s`);
      return serverResume;
    }

    return null;
  }

  /**
   * Mark video as completed
   */
  async markAsCompleted(videoId, duration) {
    await this.initPromise;

    await this.persistence.saveProgress(
      videoId,
      duration,
      duration,
      { completed: true, completedAt: Date.now() }
    );

    await this.persistence.autoSave('completed', videoId, {
      completedAt: Date.now(),
      duration
    }, { priority: 'high' });

    console.log(`[${this.serviceName}] Marked completed: ${videoId}`);
  }

  // ==================== LIKES / FAVORITES ====================

  async toggleLike(videoId, videoTitle = '') {
    await this.initPromise;

    const isLiked = await this.persistence.has('like', videoId);

    if (isLiked) {
      // Unlike
      await this.persistence.autoSave('unlike', videoId, {
        unlinkedAt: Date.now()
      }, { priority: 'high' });
      this.updateLikeUI(videoId, false);
    } else {
      // Like
      await this.persistence.autoSave('like', videoId, {
        likedAt: Date.now(),
        videoTitle,
        timestamp: Date.now()
      }, { priority: 'high' });
      this.updateLikeUI(videoId, true);
    }

    return !isLiked;
  }

  async isVideoLiked(videoId) {
    await this.initPromise;
    return this.persistence.has('like', videoId);
  }

  // ==================== COMMENTS / INTERACTIONS ====================

  async addComment(videoId, commentText) {
    await this.initPromise;

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.persistence.autoSave('comment', videoId, {
      commentId,
      text: commentText,
      createdAt: Date.now(),
      likes: 0
    }, { priority: 'normal' });

    console.log(`[${this.serviceName}] Comment added: ${videoId}`);
    return commentId;
  }

  async getComments(videoId) {
    await this.initPromise;

    const allComments = await this.persistence.storage.getActions({
      service: this.serviceName,
      action: 'comment',
      itemId: videoId
    });

    return allComments;
  }

  // ==================== ANALYTICS / STATS ====================

  /**
   * Get watching statistics
   */
  async getWatchingStats() {
    await this.initPromise;

    const stats = await this.persistence.getStatsFromServer();
    if (stats) {
      return {
        totalVideosWatched: stats.mediaStats?.totalItems || 0,
        averageProgress: stats.mediaStats?.avgProgress || 0,
        completedVideos: stats.mediaStats?.completedItems || 0,
        totalLikes: stats.actionTypes?.find(a => a.action === 'like')?.count || 0
      };
    }

    return null;
  }

  /**
   * Get all watching history
   */
  async getWatchingHistory(limit = 50) {
    await this.initPromise;

    // Get from persistence storage
    const actions = await this.persistence.getAll();
    
    // Filter for watch-related actions
    const watchActions = actions.filter(a => 
      ['watched', 'partially_watched', 'completed'].includes(a.action)
    );

    return watchActions.slice(0, limit);
  }

  // ==================== UI HELPERS ====================

  updateProgressBar(videoId, percentage) {
    const progressBar = document.querySelector(`[data-video-id="${videoId}"] .progress-bar`);
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.textContent = `${Math.round(percentage)}%`;
    }
  }

  updateLikeUI(videoId, isLiked) {
    const likeBtn = document.querySelector(`[data-video-id="${videoId}"] .like-btn`);
    if (likeBtn) {
      likeBtn.classList.toggle('liked', isLiked);
      likeBtn.innerHTML = isLiked ? '❤️ Liked' : '🤍 Like';
    }
  }

  setupVideoPlayer() {
    // Attach progress tracking to video player
    const videoPlayer = document.querySelector('video');
    if (!videoPlayer) return;

    // Track time updates
    videoPlayer.addEventListener('timeupdate', () => {
      const currentTime = videoPlayer.currentTime;
      this.updateWatchingProgress(currentTime);
    });

    // Stop watching when paused/ended
    videoPlayer.addEventListener('pause', () => {
      this.stopWatchingVideo(videoPlayer.currentTime);
    });

    videoPlayer.addEventListener('ended', () => {
      this.stopWatchingVideo(videoPlayer.duration, true);
      this.markAsCompleted(this.currentVideoId, videoPlayer.duration);
    });
  }
}

// ==================== USAGE EXAMPLE ====================

/*
// Initialize
const videoService = new VideoServiceWithPersistence('farragna');
await videoService.init();

// When video starts
videoService.startWatchingVideo('video_123', 'Cool Video', 600);

// Watching progress is auto-tracked via timeupdate event

// When loading video page
const resume = await videoService.getResumePosition('video_123');
if (resume) {
  player.currentTime = resume.currentTime;
}

// Like/unlike
await videoService.toggleLike('video_123', 'Cool Video');

// Add comment
await videoService.addComment('video_123', 'Great video!');

// Get stats
const stats = await videoService.getWatchingStats();
console.log('Watched:', stats.completedVideos, 'videos');

// Get history
const history = await videoService.getWatchingHistory();
*/

// Export for use
window.VideoServiceWithPersistence = VideoServiceWithPersistence;
