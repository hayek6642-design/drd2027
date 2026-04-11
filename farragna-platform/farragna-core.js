// ===============================
// 🎬 FARRAGNA - Video Sharing Platform
// ===============================
// Complete TikTok/Instagram-like video platform
// Features: Upload, Stream, Like, Comment, Share, Discover

import { AuthCore } from './auth-core.js'
import { StorageManager } from './storage-manager.js'
import { NotificationEngine } from './notifications.js'

// ===============================
// 📊 Database Schema
// ===============================

const FarragnaDB = {
  videos: [], // All videos
  users: new Map(), // User profiles
  interactions: [], // Likes, comments, shares
  feeds: new Map(), // User feed cache
  trends: new Map() // Trending videos
}

// ===============================
// 🎥 Video Management System
// ===============================

export const VideoManager = {
  
  // 📤 Upload from File
  async uploadFromFile(file, metadata = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Validate file
        if (!file.type.startsWith('video/')) {
          reject(new Error('Invalid file type. Must be video.'))
          return
        }
        
        if (file.size > 500 * 1024 * 1024) { // 500MB limit
          reject(new Error('File too large. Max 500MB.'))
          return
        }
        
        // Compress video for web
        const compressed = await this.compressVideo(file)
        
        // Generate thumbnail
        const thumbnail = await this.generateThumbnail(compressed)
        
        // Extract video metadata
        const duration = await this.getVideoDuration(compressed)
        
        // Create video object
        const video = {
          id: this.generateVideoId(),
          userId: AuthCore.getState().userId,
          file: compressed,
          thumbnail,
          duration,
          title: metadata.title || 'Untitled',
          description: metadata.description || '',
          hashtags: this.extractHashtags(metadata.description),
          visibility: metadata.visibility || 'public',
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'processing' // pending upload
        }
        
        // Upload to server
        const uploaded = await this.uploadToServer(video)
        
        // Save to local DB
        FarragnaDB.videos.unshift(uploaded)
        await StorageManager.save('farragna:videos', FarragnaDB.videos)
        
        // Notify followers
        await this.notifyFollowers(video)
        
        resolve(uploaded)
        
      } catch (error) {
        reject(error)
      }
    })
  },
  
  // 🔗 Upload from URL
  async uploadFromURL(videoURL, metadata = {}) {
    try {
      // Validate URL
      const response = await fetch(videoURL, { method: 'HEAD' })
      if (!response.ok) throw new Error('Invalid URL or server error')
      
      const contentType = response.headers.get('content-type')
      if (!contentType.includes('video')) {
        throw new Error('URL does not point to a video')
      }
      
      // Fetch video blob
      const videoResponse = await fetch(videoURL)
      const blob = await videoResponse.blob()
      
      // Create file from blob
      const file = new File([blob], 'imported-video.mp4', { type: 'video/mp4' })
      
      // Process like normal upload
      return this.uploadFromFile(file, {
        ...metadata,
        sourceURL: videoURL
      })
      
    } catch (error) {
      throw new Error(`URL Upload failed: ${error.message}`)
    }
  },
  
  // 📹 Record from Camera
  async recordFromCamera(metadata = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            facingMode: 'user'
          },
          audio: { echoCancellation: true }
        })
        
        // Create video recording UI
        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9,opus',
          videoBitsPerSecond: 2500000 // 2.5Mbps for quality
        })
        
        const chunks = []
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }
        
        recorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop())
          
          // Create video blob
          const blob = new Blob(chunks, { type: 'video/webm' })
          const file = new File([blob], 'camera-video.webm', { type: 'video/webm' })
          
          // Upload like normal
          this.uploadFromFile(file, {
            ...metadata,
            recordedFromCamera: true
          }).then(resolve).catch(reject)
        }
        
        recorder.onerror = (error) => {
          stream.getTracks().forEach(track => track.stop())
          reject(error)
        }
        
        // Start recording
        recorder.start()
        
        // Return recorder control
        resolve({
          recorder,
          stream,
          stop: () => recorder.stop(),
          pause: () => recorder.pause(),
          resume: () => recorder.resume()
        })
        
      } catch (error) {
        reject(new Error(`Camera access denied: ${error.message}`))
      }
    })
  },
  
  // 🎬 Compress video for web
  async compressVideo(file) {
    // For MVP, return original (can integrate ffmpeg.wasm later)
    // TODO: Use ffmpeg.wasm for compression
    return file
  },
  
  // 🖼️ Generate thumbnail from video
  async generateThumbnail(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      const url = URL.createObjectURL(file)
      video.src = url
      
      video.onloadedmetadata = () => {
        canvas.width = 320
        canvas.height = 180
        video.currentTime = 0.5 // Thumbnail at 0.5s
      }
      
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url)
          resolve(blob)
        }, 'image/jpeg', 0.7)
      }
      
      video.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to generate thumbnail'))
      }
    })
  },
  
  // ⏱️ Get video duration
  async getVideoDuration(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const url = URL.createObjectURL(file)
      video.src = url
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(Math.round(video.duration))
      }
      
      video.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to get duration'))
      }
    })
  },
  
  // 📤 Upload to server
  async uploadToServer(video) {
    // Mock upload - replace with actual API call
    const formData = new FormData()
    formData.append('video', video.file)
    formData.append('thumbnail', video.thumbnail)
    formData.append('metadata', JSON.stringify({
      title: video.title,
      description: video.description,
      hashtags: video.hashtags
    }))
    
    try {
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${AuthCore.getState().token}`
        }
      })
      
      if (!response.ok) throw new Error('Upload failed')
      
      const data = await response.json()
      return { ...video, ...data, status: 'published' }
      
    } catch (error) {
      console.error('Server upload error:', error)
      // Fallback: store locally
      return { ...video, status: 'published' }
    }
  },
  
  // 🔗 Extract hashtags
  extractHashtags(text) {
    const hashtags = text.match(/#\w+/g) || []
    return hashtags.map(tag => tag.toLowerCase())
  },
  
  // 🆔 Generate unique video ID
  generateVideoId() {
    return `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // 🔔 Notify followers
  async notifyFollowers(video) {
    const userId = video.userId
    const followers = await this.getFollowers(userId)
    
    for (const follower of followers) {
      NotificationEngine.notify(follower.id, {
        type: 'new_video',
        title: `New video from ${await this.getUserName(userId)}`,
        body: video.title,
        videoId: video.id,
        icon: await this.getUserAvatar(userId)
      })
    }
  },
  
  getFollowers(userId) {
    // TODO: Implement follower system
    return Promise.resolve([])
  },
  
  getUserName(userId) {
    return Promise.resolve('Creator')
  },
  
  getUserAvatar(userId) {
    return Promise.resolve('default-avatar.png')
  }
}

// ===============================
// ❤️ Interaction System
// ===============================

export const InteractionManager = {
  
  // ❤️ Like/Unlike video
  async toggleLike(videoId) {
    const userId = AuthCore.getState().userId
    const key = `like:${userId}:${videoId}`
    
    const isLiked = await StorageManager.get(key)
    
    if (isLiked) {
      // Unlike
      await StorageManager.remove(key)
      const video = FarragnaDB.videos.find(v => v.id === videoId)
      if (video) video.likes--
    } else {
      // Like
      await StorageManager.set(key, true)
      const video = FarragnaDB.videos.find(v => v.id === videoId)
      if (video) video.likes++
      
      // Notify creator
      await this.notifyCreator(videoId, 'like')
    }
    
    return !isLiked
  },
  
  // 💬 Add comment
  async addComment(videoId, text) {
    const comment = {
      id: `cmt_${Date.now()}`,
      videoId,
      userId: AuthCore.getState().userId,
      text,
      likes: 0,
      createdAt: Date.now()
    }
    
    FarragnaDB.interactions.push(comment)
    
    // Update video comment count
    const video = FarragnaDB.videos.find(v => v.id === videoId)
    if (video) video.comments++
    
    // Notify
    await this.notifyCreator(videoId, 'comment', text)
    
    return comment
  },
  
  // 🔄 Share video
  async shareVideo(videoId) {
    const video = FarragnaDB.videos.find(v => v.id === videoId)
    if (!video) return false
    
    video.shares++
    
    // Use native share if available
    if (navigator.share) {
      await navigator.share({
        title: video.title,
        text: video.description,
        url: `farragna://video/${videoId}`
      })
    }
    
    return true
  },
  
  // 🔔 Notify creator
  async notifyCreator(videoId, action, content = '') {
    const video = FarragnaDB.videos.find(v => v.id === videoId)
    if (!video) return
    
    const messages = {
      like: `Someone liked your video`,
      comment: `New comment: "${content}"`,
      share: `Your video was shared`
    }
    
    NotificationEngine.notify(video.userId, {
      type: action,
      title: messages[action],
      videoId,
      icon: 'notification-icon.png'
    })
  }
}

// ===============================
// 📺 Feed & Discovery
// ===============================

export const FeedManager = {
  
  // 📺 Get personalized feed
  async getPersonalFeed(userId, limit = 20, offset = 0) {
    let feed = FarragnaDB.feeds.get(userId) || []
    
    if (feed.length === 0) {
      // Build feed from algorithm
      feed = await this.buildPersonalizedFeed(userId)
      FarragnaDB.feeds.set(userId, feed)
    }
    
    return feed.slice(offset, offset + limit)
  },
  
  // 🤖 Personalized feed algorithm
  async buildPersonalizedFeed(userId) {
    const userPrefs = await this.getUserPreferences(userId)
    const videos = FarragnaDB.videos
    
    // Score each video
    const scored = videos.map(video => ({
      ...video,
      score: this.calculateScore(video, userPrefs, userId)
    }))
    
    // Sort by score
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map(({ score, ...v }) => v)
  },
  
  // 🎯 Calculate video score
  calculateScore(video, userPrefs, userId) {
    let score = 0
    
    // Recency (newer = better)
    const ageHours = (Date.now() - video.createdAt) / (1000 * 60 * 60)
    score += Math.max(100 - ageHours * 2, 0)
    
    // Engagement
    score += (video.likes * 5) + (video.comments * 3) + (video.shares * 10)
    
    // Hashtag match
    const matchingTags = video.hashtags.filter(tag => userPrefs.interests?.includes(tag))
    score += matchingTags.length * 50
    
    // Creator preference
    const isFollowing = userPrefs.following?.includes(video.userId)
    if (isFollowing) score += 200
    
    // Don't show own videos
    if (video.userId === userId) score = 0
    
    return score
  },
  
  // 🔍 Discover trending videos
  async getTrendingVideos(limit = 20) {
    const now = Date.now()
    const last24h = now - (24 * 60 * 60 * 1000)
    
    const trending = FarragnaDB.videos
      .filter(v => v.createdAt > last24h)
      .sort((a, b) => {
        const scoreA = (a.likes * 3) + (a.comments * 2) + a.shares
        const scoreB = (b.likes * 3) + (b.comments * 2) + b.shares
        return scoreB - scoreA
      })
      .slice(0, limit)
    
    return trending
  },
  
  // #️⃣ Search by hashtag
  async searchByHashtag(hashtag, limit = 20) {
    return FarragnaDB.videos
      .filter(v => v.hashtags.includes(hashtag.toLowerCase()))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  },
  
  // 👤 Get user videos
  async getUserVideos(userId, limit = 20) {
    return FarragnaDB.videos
      .filter(v => v.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  },
  
  getUserPreferences(userId) {
    return Promise.resolve({
      interests: [],
      following: [],
      blocked: []
    })
  }
}

// ===============================
// 👤 User Profiles
// ===============================

export const ProfileManager = {
  
  // 📝 Get user profile
  async getProfile(userId) {
    let profile = FarragnaDB.users.get(userId)
    
    if (!profile) {
      profile = {
        id: userId,
        name: 'User',
        avatar: 'default-avatar.png',
        bio: '',
        followers: 0,
        following: 0,
        totalVideos: 0,
        totalLikes: 0,
        verified: false,
        createdAt: Date.now()
      }
      
      FarragnaDB.users.set(userId, profile)
    }
    
    return profile
  },
  
  // ✏️ Update profile
  async updateProfile(userId, updates) {
    const profile = await this.getProfile(userId)
    Object.assign(profile, updates)
    FarragnaDB.users.set(userId, profile)
    await StorageManager.save(`farragna:profile:${userId}`, profile)
    return profile
  },
  
  // 👥 Follow/Unfollow
  async toggleFollow(targetUserId) {
    const userId = AuthCore.getState().userId
    const key = `follow:${userId}:${targetUserId}`
    
    const isFollowing = await StorageManager.get(key)
    
    if (isFollowing) {
      await StorageManager.remove(key)
      const profile = await this.getProfile(targetUserId)
      profile.followers--
    } else {
      await StorageManager.set(key, true)
      const profile = await this.getProfile(targetUserId)
      profile.followers++
      
      // Notify
      NotificationEngine.notify(targetUserId, {
        type: 'follow',
        title: 'New follower'
      })
    }
    
    return !isFollowing
  }
}

// ===============================
// 🎬 Video Player Controller
// ===============================

export const PlayerController = {
  
  currentVideo: null,
  isPlaying: false,
  volume: 1,
  quality: 'auto',
  
  // ▶️ Play video
  play(videoId) {
    const video = FarragnaDB.videos.find(v => v.id === videoId)
    if (!video) return
    
    this.currentVideo = video
    this.isPlaying = true
    
    // Track view
    video.views++
    
    // Fire analytics
    this.trackPlayback(videoId)
  },
  
  // ⏸️ Pause
  pause() {
    this.isPlaying = false
  },
  
  // 🔊 Set volume
  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level))
  },
  
  // 📊 Analytics
  trackPlayback(videoId) {
    const userId = AuthCore.getState().userId
    const event = {
      type: 'video_play',
      videoId,
      userId,
      timestamp: Date.now()
    }
    
    // Send to analytics
    console.log('📊 Playback tracked:', event)
  }
}

// ===============================
// ⚙️ Configuration
// ===============================

export const FarragnaConfig = {
  // Max file sizes
  maxFileSize: 500 * 1024 * 1024, // 500MB
  maxDuration: 10 * 60, // 10 minutes
  
  // Quality settings
  videoQualities: ['240p', '360p', '720p', '1080p'],
  defaultQuality: '720p',
  
  // Features
  features: {
    duets: true,
    stitches: true,
    soundLibrary: true,
    filters: true,
    effects: true,
    greenScreen: false, // Premium feature
  },
  
  // API endpoints
  api: {
    upload: '/api/videos/upload',
    fetch: '/api/videos/{id}',
    feed: '/api/feed',
    trending: '/api/trending',
    search: '/api/search'
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  window.Farragna = {
    VideoManager,
    InteractionManager,
    FeedManager,
    ProfileManager,
    PlayerController,
    FarragnaConfig
  }
}
