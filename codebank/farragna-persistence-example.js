/**
 * Farragna Service with Persistent Storage Integration
 * Example showing how to wire any CodeBank service to use persistent storage
 */

class FarragnaService {
  constructor() {
    this.serviceName = 'farragna';
    // Create persistence helper for this service
    this.persistence = new ServicePersistenceHelper(this.serviceName);
    
    this.likedVideos = new Set();
    this.comments = new Map();
    this.playbackProgress = new Map();
    this.initPromise = this.init();
  }

  async init() {
    // Wait for persistence to load
    await new Promise(r => {
      const checkReady = () => {
        if (this.persistence?.isRestored) {
          r();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });

    // Restore liked videos
    const likedRecords = await this.persistence.getAll('like');
    likedRecords.forEach(record => {
      this.likedVideos.add(record.itemId);
    });

    // Restore comments
    const commentRecords = await this.persistence.getAll('comment');
    commentRecords.forEach(record => {
      if (!this.comments.has(record.itemId)) {
        this.comments.set(record.itemId, []);
      }
      this.comments.get(record.itemId).push(record.data);
    });

    // Setup event listeners for external updates
    window.addEventListener('farragna_external_update', (e) => {
      const { action, itemId, record } = e.detail;
      this.onExternalUpdate(action, itemId, record);
    });

    console.log('[Farragna] Persistence initialized');
    return this;
  }

  /**
   * ========== LIKE/UNLIKE ========== 
   */
  async toggleLike(videoId, videoTitle = '') {
    await this.initPromise;

    const isLiked = this.likedVideos.has(videoId);

    if (isLiked) {
      // Remove like
      this.likedVideos.delete(videoId);
      await this.persistence.autoSave('unlike', videoId, {
        unlinkedAt: Date.now(),
        previousState: 'liked'
      }, { priority: 'high' });
    } else {
      // Add like
      this.likedVideos.add(videoId);
      await this.persistence.autoSave('like', videoId, {
        likedAt: Date.now(),
        videoTitle,
        duration: this.getVideoDuration(videoId)
      }, { priority: 'high' });
    }

    // Update UI
    this.updateLikeUI(videoId, !isLiked);
    return !isLiked;
  }

  async isVideoLiked(videoId) {
    await this.initPromise;
    return this.likedVideos.has(videoId);
  }

  updateLikeUI(videoId, isLiked) {
    const likeBtn = document.querySelector(`[data-video-id="${videoId}"] .like-btn`);
    if (!likeBtn) return;

    likeBtn.classList.toggle('liked', isLiked);
    likeBtn.innerHTML = isLiked ? '❤️ Liked' : '🤍 Like';
    likeBtn.setAttribute('data-liked', isLiked);
  }

  /**
   * ========== COMMENTS ==========
   */
  async addComment(videoId, text) {
    await this.initPromise;

    if (!text.trim()) return;

    const comment = {
      text,
      timestamp: Date.now(),
      videoTime: this.getCurrentVideoTime(videoId) || 0
    };

    // Save persistently
    const commentId = `comment_${videoId}_${Date.now()}`;
    await this.persistence.autoSave('comment', commentId, comment, {
      priority: 'high',
      tags: ['user_generated', 'video_comment']
    });

    // Update local map
    if (!this.comments.has(videoId)) {
      this.comments.set(videoId, []);
    }
    this.comments.get(videoId).push(comment);

    // Update UI
    this.renderComment(videoId, comment);

    return comment;
  }

  async getVideoComments(videoId) {
    await this.initPromise;
    
    const commentRecords = await this.persistence.getAll('comment', {
      itemId: videoId
    });

    return commentRecords.map(r => r.data);
  }

  renderComment(videoId, comment) {
    const container = document.querySelector(`[data-video-id="${videoId}"] .comments-list`);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `
      <p class="comment-text">${this.escapeHtml(comment.text)}</p>
      <small class="comment-meta">
        <span class="time">${this.formatTime(comment.videoTime)}</span>
        <span class="posted">قبل قليل</span>
      </small>
    `;

    container.appendChild(div);
  }

  /**
   * ========== VIDEO PLAYBACK & RESUME =========
   */
  async setupVideoPlayer(videoElement, videoId) {
    await this.initPromise;

    // Get resume position
    const resumePosition = await this.persistence.getResumePosition(videoId);

    if (resumePosition && resumePosition > 10) {
      // Show resume dialog
      this.showResumeDialog(videoId, resumePosition, (shouldResume) => {
        if (shouldResume) {
          videoElement.currentTime = resumePosition;
        }
      });
    }

    // Save progress every 10 seconds
    let lastSave = 0;
    videoElement.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - lastSave > 10000) {
        lastSave = now;
        this.persistence.saveProgress(
          videoId,
          videoElement.currentTime,
          videoElement.duration,
          {
            volume: videoElement.volume,
            playbackRate: videoElement.playbackRate || 1
          }
        );
      }
    });

    // Mark as watched when 95% complete
    videoElement.addEventListener('timeupdate', () => {
      const percentComplete = (videoElement.currentTime / videoElement.duration) * 100;
      if (percentComplete >= 95) {
        this.persistence.autoSave('watched_complete', videoId, {
          completedAt: Date.now(),
          fullDuration: videoElement.duration
        });
      }
    });

    console.log(`[Farragna] Video player setup for ${videoId}, resume from ${resumePosition}s`);
  }

  showResumeDialog(videoId, position, callback) {
    const minutes = Math.floor(position / 60);
    const seconds = Math.floor(position % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const dialog = document.createElement('div');
    dialog.className = 'resume-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <p>استئناف من <strong>${timeStr}</strong>؟</p>
        <button class="btn-resume">استئناف</button>
        <button class="btn-start-over">من البداية</button>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('.btn-resume').addEventListener('click', () => {
      callback(true);
      dialog.remove();
    });

    dialog.querySelector('.btn-start-over').addEventListener('click', () => {
      callback(false);
      dialog.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      dialog.remove();
    }, 10000);
  }

  getCurrentVideoTime(videoId) {
    const video = document.querySelector(`[data-video-id="${videoId}"] video`);
    return video?.currentTime || 0;
  }

  getVideoDuration(videoId) {
    const video = document.querySelector(`[data-video-id="${videoId}"] video`);
    return video?.duration || 0;
  }

  /**
   * ========== DOWNLOADS ==========
   */
  async downloadVideo(videoId) {
    await this.initPromise;

    await this.persistence.autoSave('download', videoId, {
      startedAt: Date.now(),
      quality: '720p',
      format: 'mp4'
    }, { priority: 'high' });

    // Actual download logic here...
    console.log(`[Farragna] Download started for ${videoId}`);
  }

  /**
   * ========== STATS & ANALYTICS =========
   */
  async getServiceStats() {
    await this.initPromise;

    const likes = await this.persistence.count('like');
    const comments = await this.persistence.count('comment');
    const watched = await this.persistence.count('watched_complete');
    const downloads = await this.persistence.count('download');

    return {
      totalLikes: likes,
      totalComments: comments,
      videosWatched: watched,
      videosDownloaded: downloads
    };
  }

  /**
   * ========== EXPORT/IMPORT ==========
   */
  async exportData() {
    await this.initPromise;
    return this.persistence.export();
  }

  async importData(data) {
    await this.initPromise;
    return this.persistence.import(data);
  }

  /**
   * ========== EXTERNAL UPDATES (From Other Tabs/Devices) =========
   */
  onExternalUpdate(action, itemId, record) {
    console.log(`[Farragna] External update: ${action}(${itemId})`, record);

    switch (action) {
      case 'like':
        if (record.userId !== window.universalStorage.getEffectiveUserId()) {
          // Show "someone liked this" animation
          this.showRemoteLikeAnimation(itemId);
        }
        break;

      case 'comment':
        if (record.userId !== window.universalStorage.getEffectiveUserId()) {
          // Show "new comment" notification
          this.showNewCommentNotification(itemId);
        }
        break;
    }
  }

  showRemoteLikeAnimation(videoId) {
    const element = document.querySelector(`[data-video-id="${videoId}"]`);
    if (!element) return;

    element.classList.add('remote-like-animation');
    setTimeout(() => {
      element.classList.remove('remote-like-animation');
    }, 1000);
  }

  showNewCommentNotification(videoId) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = '📝 تعليق جديد';
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  /**
   * ========== UTILITIES =========
   */
  formatTime(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * ========== TEARDOWN =========
   */
  async destroy() {
    // Save any pending data
    await this.persistence.storage.processSyncQueue();
    console.log('[Farragna] Service destroyed');
  }
}

// Initialize globally
window.farragnaService = new FarragnaService();

/**
 * ========== EXAMPLE HTML USAGE =========
 * 
 * <div data-video-id="video123" class="video-card">
 *   <video id="player" style="width: 100%; height: auto;"></video>
 *   
 *   <div class="actions">
 *     <button class="like-btn" onclick="window.farragnaService.toggleLike('video123', 'Video Title')">
 *       🤍 Like
 *     </button>
 *     <button onclick="window.farragnaService.downloadVideo('video123')">⬇️ Download</button>
 *   </div>
 *   
 *   <div class="comments-section">
 *     <div class="comment-input">
 *       <input type="text" placeholder="أضف تعليق..." class="comment-input-field">
 *       <button onclick="
 *         const text = document.querySelector('.comment-input-field').value;
 *         window.farragnaService.addComment('video123', text);
 *         document.querySelector('.comment-input-field').value = '';
 *       ">أضف</button>
 *     </div>
 *     <div class="comments-list"></div>
 *   </div>
 * </div>
 * 
 * <script>
 *   // Wait for service to be ready
 *   window.addEventListener('farragna_ready', async (e) => {
 *     const player = document.querySelector('#player');
 *     await window.farragnaService.setupVideoPlayer(player, 'video123');
 *   });
 * </script>
 */
