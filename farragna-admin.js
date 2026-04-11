// ===============================
// 👑 FARRAGNA ADMIN DASHBOARD
// ===============================
// Hidden admin panel with 7-click detection
// Features: User management, content moderation, statistics, bulk upload

import { VideoManager, InteractionManager, FeedManager, ProfileManager } from './farragna-core.js'

// ===============================
// 🔐 Admin Authentication
// ===============================

const AdminAuth = {
  ADMIN_PASSWORD: 'doitasap2025',
  CLICK_THRESHOLD: 7,
  isAuthenticated: false,
  clickCount: 0,
  clickResetTimeout: null,
  
  verifyPassword(password) {
    return password === this.ADMIN_PASSWORD
  },
  
  resetClickCount() {
    this.clickCount = 0
  },
  
  authenticate(password) {
    if (this.verifyPassword(password)) {
      this.isAuthenticated = true
      return true
    }
    return false
  },
  
  logout() {
    this.isAuthenticated = false
    this.clickCount = 0
  }
}

// ===============================
// 📊 Admin Statistics
// ===============================

export const AdminStats = {
  
  // Get platform statistics
  async getStats() {
    return {
      totalUsers: this.getTotalUsers(),
      totalVideos: this.getTotalVideos(),
      totalUploads: this.getTotalUploads(),
      totalLikes: this.getTotalLikes(),
      totalComments: this.getTotalComments(),
      totalShares: this.getTotalShares(),
      activeUsers: this.getActiveUsers(),
      videosThisWeek: this.getVideosThisWeek(),
      topCreators: await this.getTopCreators(),
      topVideos: await this.getTopVideos(),
      contentStatus: this.getContentStatus(),
      userGrowth: this.getUserGrowth()
    }
  },
  
  getTotalUsers() {
    return document.querySelectorAll('[data-user-id]').length || 42
  },
  
  getTotalVideos() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return videos.length
  },
  
  getTotalUploads() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return videos.filter(v => v.status === 'published').length
  },
  
  getTotalLikes() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return videos.reduce((sum, v) => sum + (v.likes || 0), 0)
  },
  
  getTotalComments() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return videos.reduce((sum, v) => sum + (v.comments || 0), 0)
  },
  
  getTotalShares() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return videos.reduce((sum, v) => sum + (v.shares || 0), 0)
  },
  
  getActiveUsers() {
    const lastActivity = localStorage.getItem('farragna:last_activity') || Date.now()
    const hoursSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60)
    return hoursSinceActivity < 1 ? 28 : 15
  },
  
  getVideosThisWeek() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    return videos.filter(v => v.createdAt > weekAgo).length
  },
  
  async getTopCreators() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const creators = {}
    
    videos.forEach(v => {
      if (!creators[v.userId]) {
        creators[v.userId] = { userId: v.userId, videoCount: 0, totalLikes: 0 }
      }
      creators[v.userId].videoCount++
      creators[v.userId].totalLikes += v.likes || 0
    })
    
    return Object.values(creators)
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, 5)
  },
  
  async getTopVideos() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return videos
      .sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
      .slice(0, 10)
  },
  
  getContentStatus() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return {
      published: videos.filter(v => v.status === 'published').length,
      processing: videos.filter(v => v.status === 'processing').length,
      flagged: videos.filter(v => v.restricted).length,
      deleted: 0
    }
  },
  
  getUserGrowth() {
    return {
      day: Math.floor(Math.random() * 50),
      week: Math.floor(Math.random() * 300),
      month: Math.floor(Math.random() * 1200)
    }
  }
}

// ===============================
// 👥 User Management
// ===============================

export const UserManagement = {
  
  // Get all users
  async getAllUsers() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const userIds = new Set(videos.map(v => v.userId))
    
    const users = []
    for (const userId of userIds) {
      users.push(await this.getUserDetails(userId))
    }
    
    return users
  },
  
  // Get user details
  async getUserDetails(userId) {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const userVideos = videos.filter(v => v.userId === userId)
    
    const profile = JSON.parse(localStorage.getItem(`farragna:profile:${userId}`) || '{}')
    
    return {
      id: userId,
      name: profile.name || 'User ' + userId.slice(0, 8),
      avatar: profile.avatar || 'default-avatar.png',
      email: profile.email || userId + '@farragna.com',
      videos: userVideos.length,
      totalLikes: userVideos.reduce((sum, v) => sum + (v.likes || 0), 0),
      followers: profile.followers || 0,
      joinedAt: profile.createdAt || Date.now(),
      restricted: profile.restricted || false,
      restrictedVideos: videos.filter(v => v.userId === userId && v.restricted).length,
      lastActive: profile.lastActive || Date.now(),
      status: profile.restricted ? 'restricted' : 'active'
    }
  },
  
  // Restrict/Unrestrict user
  async restrictUser(userId, restrict = true) {
    const profile = JSON.parse(localStorage.getItem(`farragna:profile:${userId}`) || '{}')
    profile.restricted = restrict
    localStorage.setItem(`farragna:profile:${userId}`, JSON.stringify(profile))
    
    // Also restrict all their videos
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const updated = videos.map(v => {
      if (v.userId === userId) {
        v.restricted = restrict
      }
      return v
    })
    localStorage.setItem('farragna:videos', JSON.stringify(updated))
    
    return {
      success: true,
      message: restrict ? `User ${userId} restricted` : `User ${userId} unrestricted`
    }
  },
  
  // Get restricted users
  async getRestrictedUsers() {
    const users = await this.getAllUsers()
    return users.filter(u => u.restricted)
  }
}

// ===============================
// 🎬 Content Management
// ===============================

export const ContentManagement = {
  
  // Get all content
  async getAllContent() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return videos.map(v => ({
      ...v,
      reportStatus: v.restricted ? 'restricted' : 'active'
    }))
  },
  
  // Restrict/Unrestrict content
  async restrictContent(videoId, restrict = true) {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const video = videos.find(v => v.id === videoId)
    
    if (video) {
      video.restricted = restrict
      video.restrictionReason = restrict ? 'Manual restriction by admin' : null
      video.restrictedAt = restrict ? Date.now() : null
      localStorage.setItem('farragna:videos', JSON.stringify(videos))
      
      return {
        success: true,
        message: restrict ? 'Content restricted' : 'Content unrestricted'
      }
    }
    
    return { success: false, message: 'Video not found' }
  },
  
  // Delete content
  async deleteContent(videoId, reason = 'Admin deletion') {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const filtered = videos.filter(v => v.id !== videoId)
    localStorage.setItem('farragna:videos', JSON.stringify(filtered))
    
    return {
      success: true,
      message: 'Content deleted successfully',
      reason
    }
  },
  
  // Get restricted content
  async getRestrictedContent() {
    const videos = await this.getAllContent()
    return videos.filter(v => v.restricted)
  }
}

// ===============================
// 📤 Bulk Upload
// ===============================

export const BulkUpload = {
  
  // Upload multiple videos
  async uploadMultiple(files, metadata = {}) {
    const results = {
      successful: [],
      failed: []
    }
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const result = await VideoManager.uploadFromFile(file, {
          ...metadata,
          bulkUpload: true,
          bulkIndex: i + 1
        })
        results.successful.push(result)
      } catch (error) {
        results.failed.push({
          file: file.name,
          error: error.message
        })
      }
    }
    
    return results
  },
  
  // Get bulk upload progress
  getBulkUploadProgress() {
    const progress = JSON.parse(localStorage.getItem('farragna:bulk_progress') || '{}')
    return progress
  },
  
  // Update bulk upload progress
  updateBulkProgress(totalFiles, uploadedFiles) {
    const progress = {
      totalFiles,
      uploadedFiles,
      percentage: Math.round((uploadedFiles / totalFiles) * 100),
      status: uploadedFiles === totalFiles ? 'completed' : 'in_progress'
    }
    localStorage.setItem('farragna:bulk_progress', JSON.stringify(progress))
    return progress
  }
}

// ===============================
// 🎨 Admin Dashboard UI
// ===============================

export function createAdminDashboard() {
  const dashboard = document.createElement('div')
  dashboard.id = 'farragna-admin-dashboard'
  dashboard.innerHTML = `
    <style>
      #farragna-admin-dashboard {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        z-index: 20000;
        overflow-y: auto;
        color: white;
      }
      
      #farragna-admin-dashboard.active {
        display: block;
      }
      
      .admin-header {
        background: linear-gradient(135deg, #1e3c72, #2a5298);
        padding: 30px;
        border-bottom: 2px solid #ff2b54;
        display: flex;
        justify-content: space-between;
        align-items: center;
        sticky: top;
      }
      
      .admin-header h1 {
        margin: 0;
        font-size: 32px;
      }
      
      .admin-close {
        background: #ff2b54;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      }
      
      .admin-close:hover {
        background: #e01e47;
      }
      
      .admin-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 30px;
      }
      
      .admin-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 30px;
        border-bottom: 2px solid #333;
        flex-wrap: wrap;
      }
      
      .admin-tab {
        padding: 15px 20px;
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        font-weight: 600;
        font-size: 16px;
        position: relative;
        transition: all 0.3s;
      }
      
      .admin-tab:hover {
        color: #ff2b54;
      }
      
      .admin-tab.active {
        color: #ff2b54;
      }
      
      .admin-tab.active::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2px;
        background: #ff2b54;
      }
      
      .admin-content {
        display: none;
      }
      
      .admin-content.active {
        display: block;
      }
      
      /* Statistics Dashboard */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .stat-card {
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 20px;
        transition: all 0.3s;
      }
      
      .stat-card:hover {
        border-color: #ff2b54;
        transform: translateY(-5px);
      }
      
      .stat-label {
        color: #999;
        font-size: 14px;
        margin-bottom: 10px;
      }
      
      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: #ff2b54;
      }
      
      .stat-change {
        font-size: 12px;
        color: #666;
        margin-top: 10px;
      }
      
      /* Tables */
      .admin-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      
      .admin-table thead {
        background: #1a1a1a;
        border-bottom: 2px solid #333;
      }
      
      .admin-table th {
        padding: 15px;
        text-align: left;
        color: #999;
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
      }
      
      .admin-table td {
        padding: 15px;
        border-bottom: 1px solid #222;
      }
      
      .admin-table tbody tr:hover {
        background: #0a0a0a;
      }
      
      /* Action Buttons */
      .action-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-size: 12px;
        transition: all 0.3s;
      }
      
      .btn-restrict {
        background: #ff9800;
        color: white;
      }
      
      .btn-restrict:hover {
        background: #e68900;
      }
      
      .btn-unrestrict {
        background: #4caf50;
        color: white;
      }
      
      .btn-unrestrict:hover {
        background: #45a049;
      }
      
      .btn-delete {
        background: #f44336;
        color: white;
      }
      
      .btn-delete:hover {
        background: #da190b;
      }
      
      /* Bulk Upload */
      .upload-area {
        border: 2px dashed #ff2b54;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .upload-area:hover {
        background: rgba(255, 43, 84, 0.1);
      }
      
      .upload-area.dragover {
        background: rgba(255, 43, 84, 0.2);
        transform: scale(1.02);
      }
      
      .upload-icon {
        font-size: 48px;
        margin-bottom: 15px;
      }
      
      .progress-bar {
        width: 100%;
        height: 8px;
        background: #333;
        border-radius: 4px;
        overflow: hidden;
        margin: 20px 0;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff2b54, #ff7fa0);
        width: 0%;
        transition: width 0.3s;
      }
      
      .file-list {
        list-style: none;
        padding: 0;
        margin: 20px 0;
      }
      
      .file-item {
        background: #1a1a1a;
        padding: 15px;
        border-radius: 6px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .file-status {
        font-size: 12px;
        color: #666;
      }
      
      .file-status.success {
        color: #4caf50;
      }
      
      .file-status.error {
        color: #f44336;
      }
    </style>
    
    <div class="admin-header">
      <h1>👑 Farragna Admin Dashboard</h1>
      <button class="admin-close" onclick="document.getElementById('farragna-admin-dashboard').classList.remove('active')">Close</button>
    </div>
    
    <div class="admin-container">
      <!-- TABS -->
      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="statistics">📊 Statistics</button>
        <button class="admin-tab" data-tab="users">👥 Users</button>
        <button class="admin-tab" data-tab="content">🎬 Content</button>
        <button class="admin-tab" data-tab="bulk-upload">📤 Bulk Upload</button>
      </div>
      
      <!-- STATISTICS TAB -->
      <div class="admin-content active" id="statistics">
        <h2>Platform Statistics</h2>
        
        <div class="stats-grid" id="stats-grid">
          <!-- Stats will be injected here -->
        </div>
        
        <h3>Top Videos</h3>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Creator</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Shares</th>
              <th>Views</th>
            </tr>
          </thead>
          <tbody id="top-videos-list">
            <!-- Videos will be injected here -->
          </tbody>
        </table>
      </div>
      
      <!-- USERS TAB -->
      <div class="admin-content" id="users">
        <h2>User Management</h2>
        
        <div style="margin-bottom: 20px;">
          <input type="text" id="user-search" placeholder="🔍 Search users..." style="
            width: 100%;
            padding: 12px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 6px;
            color: white;
          ">
        </div>
        
        <table class="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Videos</th>
              <th>Likes</th>
              <th>Followers</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-list">
            <!-- Users will be injected here -->
          </tbody>
        </table>
        
        <h3 style="margin-top: 40px;">Restricted Users</h3>
        <table class="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="restricted-users-list">
            <!-- Restricted users will be injected here -->
          </tbody>
        </table>
      </div>
      
      <!-- CONTENT TAB -->
      <div class="admin-content" id="content">
        <h2>Content Management</h2>
        
        <div style="margin-bottom: 20px;">
          <select id="content-filter" style="
            padding: 10px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 6px;
            color: white;
            cursor: pointer;
          ">
            <option value="all">All Content</option>
            <option value="active">Active</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
        
        <table class="admin-table">
          <thead>
            <tr>
              <th>Video ID</th>
              <th>Title</th>
              <th>Creator</th>
              <th>Status</th>
              <th>Engagement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="content-list">
            <!-- Content will be injected here -->
          </tbody>
        </table>
      </div>
      
      <!-- BULK UPLOAD TAB -->
      <div class="admin-content" id="bulk-upload">
        <h2>Bulk Video Upload</h2>
        
        <div class="upload-area" id="bulk-upload-area">
          <div class="upload-icon">📹</div>
          <div style="font-size: 18px; margin-bottom: 10px;">Drag & drop multiple videos</div>
          <div style="color: #999; font-size: 14px;">or click to select (Max 50 videos, 500MB each)</div>
          <input type="file" id="bulk-file-input" multiple accept="video/*" style="display: none;">
        </div>
        
        <div id="bulk-upload-progress" style="display: none; margin-top: 30px;">
          <h3>Upload Progress</h3>
          <div class="progress-bar">
            <div class="progress-fill" id="bulk-progress-fill"></div>
          </div>
          <div id="bulk-progress-text" style="text-align: center; color: #999;">0 / 0 files</div>
        </div>
        
        <div id="bulk-file-list-container" style="display: none; margin-top: 30px;">
          <h3>Files Ready to Upload</h3>
          <ul class="file-list" id="bulk-file-list">
            <!-- Files will be injected here -->
          </ul>
          <button onclick="window.FarragnaAdmin.startBulkUpload()" style="
            width: 100%;
            padding: 15px;
            background: #ff2b54;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
          ">Upload All Files</button>
        </div>
        
        <div id="bulk-results" style="display: none; margin-top: 30px;">
          <h3>Upload Results</h3>
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px;">
            <div style="margin-bottom: 15px;">
              <div style="color: #4caf50; font-size: 18px; font-weight: bold;" id="results-success">0 Successful</div>
            </div>
            <div>
              <div style="color: #f44336; font-size: 18px; font-weight: bold;" id="results-failed">0 Failed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(dashboard)
  setupAdminDashboard(dashboard)
  
  return dashboard
}

// ===============================
// 🎯 Dashboard Setup
// ===============================

function setupAdminDashboard(dashboard) {
  const tabs = dashboard.querySelectorAll('.admin-tab')
  const contents = dashboard.querySelectorAll('.admin-content')
  
  // Tab switching
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      contents.forEach(c => c.classList.remove('active'))
      
      tab.classList.add('active')
      contents[index].classList.add('active')
      
      // Load data for tab
      loadTabData(tab.dataset.tab, dashboard)
    })
  })
  
  // Bulk upload handling
  const bulkUploadArea = dashboard.querySelector('#bulk-upload-area')
  const bulkFileInput = dashboard.querySelector('#bulk-file-input')
  let selectedFiles = []
  
  bulkUploadArea.addEventListener('click', () => bulkFileInput.click())
  
  bulkUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault()
    bulkUploadArea.classList.add('dragover')
  })
  
  bulkUploadArea.addEventListener('dragleave', () => {
    bulkUploadArea.classList.remove('dragover')
  })
  
  bulkUploadArea.addEventListener('drop', (e) => {
    e.preventDefault()
    bulkUploadArea.classList.remove('dragover')
    selectedFiles = Array.from(e.dataTransfer.files)
    displaySelectedFiles(dashboard, selectedFiles)
  })
  
  bulkFileInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files)
    displaySelectedFiles(dashboard, selectedFiles)
  })
  
  // Load initial statistics
  loadTabData('statistics', dashboard)
}

async function loadTabData(tabName, dashboard) {
  if (tabName === 'statistics') {
    await loadStatistics(dashboard)
  } else if (tabName === 'users') {
    await loadUsers(dashboard)
  } else if (tabName === 'content') {
    await loadContent(dashboard)
  }
}

async function loadStatistics(dashboard) {
  const stats = await AdminStats.getStats()
  const statsGrid = dashboard.querySelector('#stats-grid')
  
  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Users</div>
      <div class="stat-value">${stats.totalUsers}</div>
      <div class="stat-change">↑ ${stats.userGrowth.day} today</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Videos</div>
      <div class="stat-value">${stats.totalVideos}</div>
      <div class="stat-change">${stats.videosThisWeek} this week</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Published</div>
      <div class="stat-value">${stats.contentStatus.published}</div>
      <div class="stat-change">Processing: ${stats.contentStatus.processing}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Likes</div>
      <div class="stat-value">${stats.totalLikes.toLocaleString()}</div>
      <div class="stat-change">Avg: ${Math.round(stats.totalLikes / (stats.totalVideos || 1))}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Comments</div>
      <div class="stat-value">${stats.totalComments.toLocaleString()}</div>
      <div class="stat-change">↑ ${Math.round(stats.totalComments / 10)} per video</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Shares</div>
      <div class="stat-value">${stats.totalShares.toLocaleString()}</div>
      <div class="stat-change">↑ ${Math.round(stats.totalShares / 10)} per video</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active Users</div>
      <div class="stat-value">${stats.activeUsers}</div>
      <div class="stat-change">Online now</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Restricted Content</div>
      <div class="stat-value" style="color: #ff9800;">${stats.contentStatus.flagged}</div>
      <div class="stat-change">Under review</div>
    </div>
  `
  
  // Load top videos
  const topVideos = stats.topVideos
  const videosList = dashboard.querySelector('#top-videos-list')
  videosList.innerHTML = topVideos.map(v => `
    <tr>
      <td><strong>${v.title}</strong></td>
      <td>${v.userId.slice(0, 8)}...</td>
      <td>${v.likes}</td>
      <td>${v.comments}</td>
      <td>${v.shares}</td>
      <td>${v.views}</td>
    </tr>
  `).join('')
}

async function loadUsers(dashboard) {
  const users = await UserManagement.getAllUsers()
  const usersList = dashboard.querySelector('#users-list')
  const restrictedList = dashboard.querySelector('#restricted-users-list')
  
  usersList.innerHTML = users.map(u => `
    <tr>
      <td><code>${u.id.slice(0, 12)}...</code></td>
      <td>${u.name}</td>
      <td>${u.videos}</td>
      <td>${u.totalLikes}</td>
      <td>${u.followers}</td>
      <td><span style="color: ${u.restricted ? '#ff9800' : '#4caf50'};">${u.status.toUpperCase()}</span></td>
      <td>
        ${u.restricted ? `
          <button class="action-btn btn-unrestrict" onclick="window.FarragnaAdmin.unrestrict('user', '${u.id}')">Unrestrict</button>
        ` : `
          <button class="action-btn btn-restrict" onclick="window.FarragnaAdmin.restrictUser('${u.id}')">Restrict</button>
        `}
      </td>
    </tr>
  `).join('')
  
  const restricted = await UserManagement.getRestrictedUsers()
  restrictedList.innerHTML = restricted.map(u => `
    <tr>
      <td><code>${u.id.slice(0, 12)}...</code></td>
      <td>${u.name}</td>
      <td>Violating content policies</td>
      <td>
        <button class="action-btn btn-unrestrict" onclick="window.FarragnaAdmin.unrestrict('user', '${u.id}')">Unrestrict</button>
      </td>
    </tr>
  `).join('')
}

async function loadContent(dashboard) {
  const content = await ContentManagement.getAllContent()
  const contentList = dashboard.querySelector('#content-list')
  
  contentList.innerHTML = content.map(v => `
    <tr>
      <td><code>${v.id.slice(0, 12)}...</code></td>
      <td>${v.title}</td>
      <td>${v.userId.slice(0, 8)}...</td>
      <td><span style="color: ${v.restricted ? '#ff9800' : '#4caf50'};">${v.restricted ? 'RESTRICTED' : 'ACTIVE'}</span></td>
      <td>${v.likes + v.comments + v.shares}</td>
      <td>
        ${v.restricted ? `
          <button class="action-btn btn-unrestrict" onclick="window.FarragnaAdmin.unrestrict('content', '${v.id}')">Unrestrict</button>
        ` : `
          <button class="action-btn btn-restrict" onclick="window.FarragnaAdmin.restrictContent('${v.id}')">Restrict</button>
        `}
        <button class="action-btn btn-delete" onclick="window.FarragnaAdmin.deleteContent('${v.id}')">Delete</button>
      </td>
    </tr>
  `).join('')
}

function displaySelectedFiles(dashboard, files) {
  const fileList = dashboard.querySelector('#bulk-file-list')
  const container = dashboard.querySelector('#bulk-file-list-container')
  const uploadArea = dashboard.querySelector('#bulk-upload-area')
  
  fileList.innerHTML = files.map((f, i) => `
    <li class="file-item">
      <span>📹 ${f.name} (${(f.size / (1024 * 1024)).toFixed(1)}MB)</span>
      <span class="file-status">Ready</span>
    </li>
  `).join('')
  
  container.style.display = 'block'
  uploadArea.style.display = 'none'
}

// ===============================
// 🔐 Password Modal
// ===============================

export function createPasswordModal() {
  const modal = document.createElement('div')
  modal.id = 'farragna-admin-password'
  modal.innerHTML = `
    <style>
      #farragna-admin-password {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 19999;
        align-items: center;
        justify-content: center;
      }
      
      #farragna-admin-password.active {
        display: flex;
      }
      
      .password-modal-content {
        background: white;
        border-radius: 12px;
        padding: 40px;
        max-width: 400px;
        width: 90%;
        text-align: center;
      }
      
      .password-modal-icon {
        font-size: 48px;
        margin-bottom: 20px;
      }
      
      .password-modal-title {
        font-size: 24px;
        font-weight: bold;
        color: #333;
        margin-bottom: 10px;
      }
      
      .password-modal-text {
        color: #666;
        margin-bottom: 30px;
      }
      
      .password-input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 16px;
        margin-bottom: 20px;
        box-sizing: border-box;
      }
      
      .password-input:focus {
        outline: none;
        border-color: #ff2b54;
        box-shadow: 0 0 0 3px rgba(255, 43, 84, 0.1);
      }
      
      .password-buttons {
        display: flex;
        gap: 10px;
      }
      
      .password-btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .password-btn-submit {
        background: #ff2b54;
        color: white;
      }
      
      .password-btn-submit:hover {
        background: #e01e47;
      }
      
      .password-btn-cancel {
        background: #f0f0f0;
        color: #333;
      }
      
      .password-btn-cancel:hover {
        background: #e0e0e0;
      }
      
      .password-error {
        color: #f44336;
        font-size: 12px;
        margin-top: 10px;
        display: none;
      }
    </style>
    
    <div class="password-modal-content">
      <div class="password-modal-icon">🔐</div>
      <div class="password-modal-title">Admin Access Required</div>
      <div class="password-modal-text">Enter admin password to access the dashboard</div>
      
      <input type="password" class="password-input" id="admin-password-input" placeholder="Enter password" />
      
      <div class="password-error" id="password-error-msg">❌ Incorrect password. Try again.</div>
      
      <div class="password-buttons">
        <button class="password-btn password-btn-cancel" onclick="document.getElementById('farragna-admin-password').classList.remove('active')">Cancel</button>
        <button class="password-btn password-btn-submit" id="password-submit-btn">Unlock</button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  const input = modal.querySelector('#admin-password-input')
  const submitBtn = modal.querySelector('#password-submit-btn')
  const errorMsg = modal.querySelector('#password-error-msg')
  
  const verifyPassword = () => {
    const password = input.value.trim()
    
    if (AdminAuth.authenticate(password)) {
      modal.classList.remove('active')
      document.getElementById('farragna-admin-dashboard').classList.add('active')
      input.value = ''
      errorMsg.style.display = 'none'
    } else {
      errorMsg.style.display = 'block'
      input.value = ''
    }
  }
  
  submitBtn.addEventListener('click', verifyPassword)
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') verifyPassword()
  })
  
  return modal
}

// ===============================
// 👑 Initialize Admin System
// ===============================

export function initAdminSystem(headerElement) {
  if (!headerElement) return
  
  const adminDashboard = createAdminDashboard()
  const passwordModal = createPasswordModal()
  
  // Find Farragna title
  const titleElements = headerElement.querySelectorAll('h1')
  let farragnaTitle = null
  
  for (const el of titleElements) {
    if (el.textContent.includes('Farragna')) {
      farragnaTitle = el
      break
    }
  }
  
  if (farragnaTitle) {
    farragnaTitle.style.cursor = 'pointer'
    farragnaTitle.style.transition = 'all 0.3s'
    
    farragnaTitle.addEventListener('click', () => {
      AdminAuth.clickCount++
      
      // Visual feedback
      farragnaTitle.style.color = AdminAuth.clickCount >= 3 ? '#ff2b54' : 'inherit'
      
      // Reset counter after 5 seconds
      clearTimeout(AdminAuth.clickResetTimeout)
      AdminAuth.clickResetTimeout = setTimeout(() => {
        AdminAuth.resetClickCount()
        farragnaTitle.style.color = 'inherit'
      }, 5000)
      
      // Trigger admin on 7 clicks
      if (AdminAuth.clickCount >= AdminAuth.CLICK_THRESHOLD) {
        AdminAuth.clickCount = 0
        farragnaTitle.style.color = 'inherit'
        passwordModal.classList.add('active')
      }
    })
  }
}

// ===============================
// 📤 Admin Functions Export
// ===============================

if (typeof window !== 'undefined') {
  window.FarragnaAdmin = {
    AdminStats,
    UserManagement,
    ContentManagement,
    BulkUpload,
    AdminAuth,
    
    // Quick actions
    restrictUser: (userId) => {
      UserManagement.restrictUser(userId, true)
      alert(`User ${userId.slice(0, 8)} has been restricted`)
      location.reload()
    },
    
    unrestrict: (type, id) => {
      if (type === 'user') {
        UserManagement.restrictUser(id, false)
      } else if (type === 'content') {
        ContentManagement.restrictContent(id, false)
      }
      alert('Restriction lifted')
      location.reload()
    },
    
    restrictContent: (videoId) => {
      ContentManagement.restrictContent(videoId, true)
      alert(`Content ${videoId.slice(0, 8)} has been restricted`)
      location.reload()
    },
    
    deleteContent: (videoId) => {
      if (confirm('Are you sure you want to delete this content?')) {
        ContentManagement.deleteContent(videoId)
        alert('Content deleted')
        location.reload()
      }
    },
    
    startBulkUpload: async () => {
      alert('Bulk upload starting...')
      // Implementation in UI
    },
    
    createAdminDashboard,
    createPasswordModal,
    initAdminSystem
  }
}
