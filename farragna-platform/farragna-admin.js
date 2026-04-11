// ===============================
// 👑 FARRAGNA ADMIN DASHBOARD
// ===============================
// Complete moderation, analytics, and user management system
// Access: Click title 7 times → Enter password: doitasap2025

const AdminAuth = {
  ADMIN_PASSWORD: 'doitasap2025',
  CLICK_THRESHOLD: 7,
  clickResetTimeout: 5000,
  clickCount: 0,
  clickTimer: null,
  authenticated: false
}

// ===============================
// 📊 Admin Statistics System
// ===============================

const AdminStats = {
  async getStats() {
    try {
      const response = await fetch('/api/farragna/admin/analytics')
      const data = await response.json()
      return data.stats || this._getLocalStats()
    } catch {
      return this._getLocalStats()
    }
  },

  _getLocalStats() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const users = new Map()
    
    // Aggregate stats
    let totalViews = 0
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0
    let restricted = 0
    
    videos.forEach(v => {
      if (!v.userId) return
      
      if (!users.has(v.userId)) {
        users.set(v.userId, { videos: 0, likes: 0, followers: 0 })
      }
      
      const user = users.get(v.userId)
      user.videos++
      user.likes += v.likes || 0
      
      totalViews += v.views || 0
      totalLikes += v.likes || 0
      totalComments += v.comments || 0
      totalShares += v.shares || 0
      
      if (v.restricted) restricted++
    })
    
    return {
      total_videos: videos.length,
      total_users: users.size,
      total_views: totalViews,
      total_likes: totalLikes,
      total_comments: totalComments,
      total_shares: totalShares,
      total_restricted: restricted,
      ready: videos.filter(v => v.status === 'ready').length,
      processing: videos.filter(v => v.status === 'processing').length,
      restricted_content: restricted
    }
  },

  async getTrendingVideos(limit = 10) {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return videos
      .filter(v => !v.restricted && v.status === 'ready')
      .sort((a, b) => (b.likes + b.views) - (a.likes + a.views))
      .slice(0, limit)
  },

  async getTopCreators(limit = 5) {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const creators = new Map()
    
    videos.forEach(v => {
      if (!v.userId) return
      if (!creators.has(v.userId)) {
        creators.set(v.userId, { userId: v.userId, totalLikes: 0, videoCount: 0 })
      }
      const creator = creators.get(v.userId)
      creator.totalLikes += v.likes || 0
      creator.videoCount++
    })
    
    return Array.from(creators.values())
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, limit)
  }
}

// ===============================
// 👥 User Management System
// ===============================

const UserManagement = {
  async getAllUsers() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const users = new Map()
    
    videos.forEach(v => {
      if (v.userId && !users.has(v.userId)) {
        users.set(v.userId, {
          id: v.userId,
          name: `User ${v.userId.slice(0, 8)}`,
          videos: 0,
          likes: 0,
          followers: 0,
          restricted: false,
          joinedAt: v.createdAt
        })
      }
    })
    
    // Count per user
    videos.forEach(v => {
      const user = users.get(v.userId)
      if (user) {
        user.videos++
        user.likes += v.likes || 0
      }
    })
    
    return Array.from(users.values())
  },

  async restrictUser(userId) {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    videos.forEach(v => {
      if (v.userId === userId) {
        v.restricted = true
        v.status = 'restricted'
      }
    })
    localStorage.setItem('farragna:videos', JSON.stringify(videos))
    
    // Notify API
    try {
      await fetch(`/api/farragna/admin/videos/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('farragna:token')}` },
        body: JSON.stringify({
          ids: videos.filter(v => v.userId === userId).map(v => v.id),
          action: 'restrict'
        })
      })
    } catch {}
    
    return true
  },

  async unrestrictUser(userId) {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    videos.forEach(v => {
      if (v.userId === userId && v.restricted) {
        v.restricted = false
        v.status = 'ready'
      }
    })
    localStorage.setItem('farragna:videos', JSON.stringify(videos))
    return true
  },

  async getRestrictedUsers() {
    const allUsers = await this.getAllUsers()
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const restrictedUserIds = new Set()
    
    videos.forEach(v => {
      if (v.restricted && v.userId) restrictedUserIds.add(v.userId)
    })
    
    return allUsers.filter(u => restrictedUserIds.has(u.id))
  }
}

// ===============================
// 🎬 Content Management System
// ===============================

const ContentManagement = {
  async getAllContent() {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    return videos.map(v => ({
      id: v.id,
      title: v.title || 'Untitled',
      creator: v.userId,
      status: v.restricted ? 'restricted' : v.status || 'ready',
      likes: v.likes || 0,
      comments: v.comments || 0,
      shares: v.shares || 0,
      views: v.views || 0,
      engagement: (v.likes || 0) + (v.comments || 0) + (v.shares || 0),
      createdAt: v.createdAt,
      restricted: v.restricted || false
    }))
  },

  async restrictContent(videoId) {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const video = videos.find(v => v.id === videoId)
    if (video) {
      video.restricted = true
      video.status = 'restricted'
    }
    localStorage.setItem('farragna:videos', JSON.stringify(videos))
    
    // Notify API
    try {
      await fetch(`/api/farragna/admin/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('farragna:token')}` },
        body: JSON.stringify({ action: 'restrict' })
      })
    } catch {}
    
    return true
  },

  async unrestrictContent(videoId) {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const video = videos.find(v => v.id === videoId)
    if (video) {
      video.restricted = false
      video.status = 'ready'
    }
    localStorage.setItem('farragna:videos', JSON.stringify(videos))
    return true
  },

  async deleteContent(videoId) {
    const videos = JSON.parse(localStorage.getItem('farragna:videos') || '[]')
    const filtered = videos.filter(v => v.id !== videoId)
    localStorage.setItem('farragna:videos', JSON.stringify(filtered))
    
    // Notify API
    try {
      await fetch(`/api/farragna/admin/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('farragna:token')}` },
        body: JSON.stringify({ action: 'delete' })
      })
    } catch {}
    
    return true
  },

  async getRestrictedContent() {
    const all = await this.getAllContent()
    return all.filter(v => v.restricted || v.status === 'restricted')
  }
}

// ===============================
// 🎨 Admin Dashboard UI
// ===============================

function createPasswordModal() {
  const modal = document.createElement('div')
  modal.id = 'farragna-admin-password-modal'
  modal.innerHTML = `
    <style>
      #farragna-admin-password-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .admin-password-container {
        background: white;
        border-radius: 12px;
        padding: 40px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      
      .admin-password-title {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 10px;
        color: #1a1a1a;
      }
      
      .admin-password-hint {
        font-size: 13px;
        color: #666;
        margin-bottom: 30px;
      }
      
      .admin-password-input {
        width: 100%;
        padding: 12px 15px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        margin-bottom: 15px;
        box-sizing: border-box;
      }
      
      .admin-password-input:focus {
        outline: none;
        border-color: #ff2b54;
        box-shadow: 0 0 0 3px rgba(255, 43, 84, 0.1);
      }
      
      .admin-password-button {
        width: 100%;
        padding: 12px;
        background: #ff2b54;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .admin-password-button:hover {
        background: #e01a42;
      }
      
      .admin-password-button:active {
        transform: scale(0.98);
      }
      
      .admin-password-error {
        color: #f44336;
        font-size: 12px;
        margin-top: 10px;
        display: none;
      }
      
      .admin-password-error.show {
        display: block;
      }
    </style>
    
    <div class="admin-password-container">
      <div class="admin-password-title">👑 Admin Access Required</div>
      <div class="admin-password-hint">Enter admin password to continue</div>
      <input 
        type="password" 
        id="admin-password-input" 
        class="admin-password-input" 
        placeholder="Password"
        autocomplete="off"
      />
      <button id="admin-password-submit" class="admin-password-button">Unlock Admin Panel</button>
      <div id="admin-password-error" class="admin-password-error"></div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  const input = modal.querySelector('#admin-password-input')
  const button = modal.querySelector('#admin-password-submit')
  const error = modal.querySelector('#admin-password-error')
  
  const submit = async () => {
    if (input.value === AdminAuth.ADMIN_PASSWORD) {
      AdminAuth.authenticated = true
      modal.remove()
      createAdminDashboard()
    } else {
      error.textContent = 'Incorrect password'
      error.classList.add('show')
      input.value = ''
      input.focus()
    }
  }
  
  button.addEventListener('click', submit)
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submit()
  })
  
  input.focus()
}

function createAdminDashboard() {
  const dashboard = document.createElement('div')
  dashboard.id = 'farragna-admin-dashboard'
  dashboard.innerHTML = `
    <style>
      #farragna-admin-dashboard {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #f5f5f5;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        overflow: hidden;
      }
      
      .admin-header {
        background: white;
        border-bottom: 1px solid #eee;
        padding: 20px 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .admin-header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: #ff2b54;
      }
      
      .admin-close-btn {
        background: #f0f0f0;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        color: #333;
        transition: all 0.2s;
      }
      
      .admin-close-btn:hover {
        background: #e0e0e0;
      }
      
      .admin-tabs {
        display: flex;
        gap: 0;
        padding: 0 30px;
        background: white;
        border-bottom: 1px solid #eee;
      }
      
      .admin-tab {
        padding: 15px 20px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 15px;
        font-weight: 600;
        color: #999;
        border-bottom: 2px solid transparent;
        transition: all 0.3s;
      }
      
      .admin-tab.active {
        color: #ff2b54;
        border-bottom-color: #ff2b54;
      }
      
      .admin-content {
        flex: 1;
        overflow-y: auto;
        padding: 30px;
      }
      
      .admin-section {
        display: none;
      }
      
      .admin-section.active {
        display: block;
      }
      
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .stat-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      
      .stat-label {
        font-size: 12px;
        color: #999;
        text-transform: uppercase;
        font-weight: 600;
        margin-bottom: 10px;
      }
      
      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #ff2b54;
      }
      
      .admin-table {
        width: 100%;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border-collapse: collapse;
      }
      
      .admin-table thead {
        background: #f9f9f9;
        border-bottom: 1px solid #eee;
      }
      
      .admin-table th {
        padding: 15px;
        text-align: left;
        font-size: 12px;
        font-weight: 700;
        color: #666;
        text-transform: uppercase;
      }
      
      .admin-table td {
        padding: 15px;
        border-bottom: 1px solid #eee;
        font-size: 14px;
      }
      
      .admin-table tr:hover {
        background: #f9f9f9;
      }
      
      .admin-action-btn {
        padding: 6px 12px;
        margin-right: 5px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.2s;
      }
      
      .admin-restrict-btn {
        background: #ff9800;
        color: white;
      }
      
      .admin-restrict-btn:hover {
        background: #e68900;
      }
      
      .admin-delete-btn {
        background: #f44336;
        color: white;
      }
      
      .admin-delete-btn:hover {
        background: #da190b;
      }
      
      .admin-unrestrict-btn {
        background: #4caf50;
        color: white;
      }
      
      .admin-unrestrict-btn:hover {
        background: #388e3c;
      }
    </style>
    
    <div class="admin-header">
      <h1>👑 Farragna Admin Dashboard</h1>
      <button class="admin-close-btn" id="admin-close">Close</button>
    </div>
    
    <div class="admin-tabs">
      <button class="admin-tab active" data-tab="statistics">📊 Statistics</button>
      <button class="admin-tab" data-tab="users">👥 Users</button>
      <button class="admin-tab" data-tab="content">🎬 Content</button>
      <button class="admin-tab" data-tab="upload">📤 Bulk Upload</button>
    </div>
    
    <div class="admin-content">
      <!-- Statistics Tab -->
      <div class="admin-section statistics active">
        <div id="admin-stats"></div>
      </div>
      
      <!-- Users Tab -->
      <div class="admin-section users">
        <h2>User Management</h2>
        <div id="admin-users-list"></div>
      </div>
      
      <!-- Content Tab -->
      <div class="admin-section content">
        <h2>Content Moderation</h2>
        <div id="admin-content-list"></div>
      </div>
      
      <!-- Upload Tab -->
      <div class="admin-section upload">
        <h2>Bulk Upload</h2>
        <div id="admin-upload-area"></div>
      </div>
    </div>
  `
  
  document.body.appendChild(dashboard)
  
  // Tab switching
  dashboard.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      dashboard.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'))
      dashboard.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'))
      
      tab.classList.add('active')
      const tabName = tab.getAttribute('data-tab')
      dashboard.querySelector(`.admin-section.${tabName}`).classList.add('active')
    })
  })
  
  // Close button
  dashboard.querySelector('#admin-close').addEventListener('click', () => {
    dashboard.remove()
    AdminAuth.authenticated = false
  })
  
  // Load data
  loadAdminStats(dashboard)
  loadAdminUsers(dashboard)
  loadAdminContent(dashboard)
  loadAdminUpload(dashboard)
}

async function loadAdminStats(dashboard) {
  const stats = await AdminStats.getStats()
  const trending = await AdminStats.getTrendingVideos(10)
  const topCreators = await AdminStats.getTopCreators(5)
  
  const statsDiv = dashboard.querySelector('#admin-stats')
  statsDiv.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total Videos</div>
        <div class="stat-value">${stats.total_videos || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Users</div>
        <div class="stat-value">${stats.total_users || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Views</div>
        <div class="stat-value">${(stats.total_views || 0).toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Likes</div>
        <div class="stat-value">${(stats.total_likes || 0).toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Published</div>
        <div class="stat-value">${stats.ready || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Processing</div>
        <div class="stat-value">${stats.processing || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Restricted</div>
        <div class="stat-value">${stats.total_restricted || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Comments</div>
        <div class="stat-value">${(stats.total_comments || 0).toLocaleString()}</div>
      </div>
    </div>
    
    <h3>🔥 Trending Videos</h3>
    <table class="admin-table">
      <thead>
        <tr><th>Title</th><th>Views</th><th>Likes</th><th>Engagement</th></tr>
      </thead>
      <tbody>
        ${trending.slice(0, 5).map(v => `
          <tr>
            <td>${v.title || 'Untitled'}</td>
            <td>${(v.views || 0).toLocaleString()}</td>
            <td>${(v.likes || 0).toLocaleString()}</td>
            <td>${((v.likes || 0) + (v.comments || 0) + (v.shares || 0)).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

async function loadAdminUsers(dashboard) {
  const users = await UserManagement.getAllUsers()
  const restricted = await UserManagement.getRestrictedUsers()
  const restrictedIds = new Set(restricted.map(u => u.id))
  
  const usersDiv = dashboard.querySelector('#admin-users-list')
  usersDiv.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>User ID</th><th>Videos</th><th>Likes</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td>${u.id.slice(0, 16)}</td>
            <td>${u.videos}</td>
            <td>${u.likes}</td>
            <td>${restrictedIds.has(u.id) ? '🚫 Restricted' : '✅ Active'}</td>
            <td>
              ${restrictedIds.has(u.id) ? `
                <button class="admin-action-btn admin-unrestrict-btn" onclick="FarragnaAdmin.UserManagement.unrestrictUser('${u.id}').then(() => location.reload())">Unrestrict</button>
              ` : `
                <button class="admin-action-btn admin-restrict-btn" onclick="FarragnaAdmin.UserManagement.restrictUser('${u.id}').then(() => location.reload())">Restrict</button>
              `}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

async function loadAdminContent(dashboard) {
  const content = await ContentManagement.getAllContent()
  const restricted = content.filter(c => c.restricted)
  
  const contentDiv = dashboard.querySelector('#admin-content-list')
  contentDiv.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>Title</th><th>Creator</th><th>Engagement</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${content.slice(0, 20).map(c => `
          <tr>
            <td>${c.title.slice(0, 30)}</td>
            <td>${c.creator.slice(0, 16)}</td>
            <td>${c.engagement}</td>
            <td>${c.restricted ? '🚫 Restricted' : '✅ Active'}</td>
            <td>
              ${c.restricted ? `
                <button class="admin-action-btn admin-unrestrict-btn" onclick="FarragnaAdmin.ContentManagement.unrestrictContent('${c.id}').then(() => location.reload())">Unrestrict</button>
              ` : `
                <button class="admin-action-btn admin-restrict-btn" onclick="FarragnaAdmin.ContentManagement.restrictContent('${c.id}').then(() => location.reload())">Restrict</button>
              `}
              <button class="admin-action-btn admin-delete-btn" onclick="if(confirm('Delete video?')) FarragnaAdmin.ContentManagement.deleteContent('${c.id}').then(() => location.reload())">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

async function loadAdminUpload(dashboard) {
  const uploadDiv = dashboard.querySelector('#admin-upload-area')
  uploadDiv.innerHTML = `
    <style>
      .upload-drop-zone {
        border: 2px dashed #ff2b54;
        border-radius: 12px;
        padding: 60px 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .upload-drop-zone.dragover {
        background: rgba(255, 43, 84, 0.1);
        border-color: #ff2b54;
      }
      
      .upload-drop-zone p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
      
      #bulk-upload-input {
        display: none;
      }
      
      .upload-file-list {
        margin-top: 20px;
      }
      
      .upload-file-item {
        background: white;
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    </style>
    
    <div class="upload-drop-zone" id="drop-zone">
      <p>📹 Drag & drop videos or click to select</p>
      <input type="file" id="bulk-upload-input" multiple accept="video/*">
    </div>
    <div class="upload-file-list" id="file-list"></div>
    <button id="upload-all-btn" class="admin-action-btn" style="background: #4caf50; color: white; margin-top: 20px; padding: 12px 24px; width: auto;">Upload All</button>
  `
  
  const dropZone = uploadDiv.querySelector('#drop-zone')
  const input = uploadDiv.querySelector('#bulk-upload-input')
  let files = []
  
  dropZone.addEventListener('click', () => input.click())
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('dragover')
  })
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover')
  })
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('dragover')
    files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'))
    renderFileList()
  })
  
  input.addEventListener('change', (e) => {
    files = Array.from(e.target.files)
    renderFileList()
  })
  
  function renderFileList() {
    const list = uploadDiv.querySelector('#file-list')
    list.innerHTML = files.map((f, i) => `
      <div class="upload-file-item">
        <span>${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)</span>
        <button onclick="this.parentElement.remove()" style="background: #f44336; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Remove</button>
      </div>
    `).join('')
  }
  
  uploadDiv.querySelector('#upload-all-btn').addEventListener('click', async () => {
    for (const file of files) {
      const formData = new FormData()
      formData.append('video', file)
      
      try {
        await fetch('/api/farragna/upload/simple', {
          method: 'POST',
          body: formData,
          headers: { 'Authorization': `Bearer ${localStorage.getItem('farragna:token')}` }
        })
      } catch (e) {
        console.error('Upload failed:', e)
      }
    }
    alert(`${files.length} videos uploaded!`)
    files = []
    renderFileList()
  })
}

// ===============================
// 🔑 Init Admin System
// ===============================

export function initAdminSystem(headerElement) {
  if (!headerElement) return
  
  const titleEl = headerElement.querySelector('[data-farragna-title]') || headerElement.querySelector('h1')
  if (!titleEl) return
  
  console.log('💡 Tip: Click the Farragna title 7 times for admin access')
  
  titleEl.addEventListener('click', () => {
    AdminAuth.clickCount++
    
    if (AdminAuth.clickCount >= 3) {
      titleEl.style.color = '#ff2b54'
    }
    
    if (AdminAuth.clickCount >= AdminAuth.CLICK_THRESHOLD) {
      AdminAuth.clickCount = 0
      titleEl.style.color = 'inherit'
      createPasswordModal()
    }
    
    clearTimeout(AdminAuth.clickTimer)
    AdminAuth.clickTimer = setTimeout(() => {
      AdminAuth.clickCount = 0
      titleEl.style.color = 'inherit'
    }, AdminAuth.clickResetTimeout)
  })
}

// ===============================
// 📦 Exports
// ===============================

const FarragnaAdmin = {
  AdminAuth,
  AdminStats,
  UserManagement,
  ContentManagement,
  createPasswordModal,
  createAdminDashboard,
  initAdminSystem
}

// Make globally available
window.FarragnaAdmin = FarragnaAdmin

export { FarragnaAdmin, initAdminSystem }
