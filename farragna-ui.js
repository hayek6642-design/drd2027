// ===============================
// 🎬 FARRAGNA UI - Complete Interface
// ===============================
// Production-ready video-sharing platform UI
// Features: Upload modal, Feed, Video player, Comments, Likes

import {
  VideoManager,
  InteractionManager,
  FeedManager,
  ProfileManager,
  PlayerController,
  FarragnaConfig
} from './farragna-core.js'

import {
  initAdminSystem,
  createAdminDashboard,
  createPasswordModal
} from './farragna-admin.js'

// ===============================
// 📱 Upload Modal (3-in-1)
// ===============================

export function createUploadModal() {
  const modal = document.createElement('div')
  modal.id = 'farragna-upload-modal'
  modal.innerHTML = `
    <style>
      #farragna-upload-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        z-index: 10000;
        padding: 20px;
      }
      
      #farragna-upload-modal.active {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .upload-container {
        background: white;
        border-radius: 20px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 30px;
        animation: slideUp 0.3s ease-out;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .upload-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 30px;
        border-bottom: 1px solid #eee;
      }
      
      .upload-tab {
        padding: 15px 20px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        color: #999;
        transition: all 0.3s;
        position: relative;
      }
      
      .upload-tab.active {
        color: #ff2b54;
      }
      
      .upload-tab.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: #ff2b54;
      }
      
      .upload-section {
        display: none;
      }
      
      .upload-section.active {
        display: block;
      }
      
      /* File Upload Section */
      .file-upload-area {
        border: 2px dashed #ddd;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .file-upload-area:hover {
        border-color: #ff2b54;
        background: #fff0f5;
      }
      
      .file-upload-area.dragover {
        border-color: #ff2b54;
        background: #fff0f5;
        transform: scale(1.02);
      }
      
      .upload-icon {
        font-size: 48px;
        margin-bottom: 15px;
      }
      
      .upload-text {
        font-size: 14px;
        color: #666;
        margin-bottom: 10px;
      }
      
      .upload-hint {
        font-size: 12px;
        color: #999;
      }
      
      #upload-file-input {
        display: none;
      }
      
      /* URL Upload Section */
      .url-input-group {
        margin-bottom: 20px;
      }
      
      .url-input-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #333;
      }
      
      .url-input-group input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
      }
      
      .url-input-group input:focus {
        outline: none;
        border-color: #ff2b54;
        box-shadow: 0 0 0 3px rgba(255, 43, 84, 0.1);
      }
      
      /* Camera Section */
      #camera-preview {
        width: 100%;
        border-radius: 12px;
        background: #000;
        margin-bottom: 20px;
        display: none;
      }
      
      #camera-preview.active {
        display: block;
      }
      
      .camera-controls {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-bottom: 20px;
      }
      
      .camera-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .camera-btn.record {
        background: #ff2b54;
        color: white;
      }
      
      .camera-btn.record:hover {
        background: #e01e47;
      }
      
      .camera-btn.stop {
        background: #ff2b54;
        color: white;
      }
      
      .camera-btn.secondary {
        background: #f0f0f0;
        color: #333;
      }
      
      .recording-timer {
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        color: #ff2b54;
        margin-bottom: 20px;
      }
      
      /* Metadata Section */
      .metadata-section {
        background: #f8f8f8;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
      }
      
      .form-group {
        margin-bottom: 15px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }
      
      .form-group input,
      .form-group textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
      }
      
      .form-group textarea {
        resize: vertical;
        min-height: 80px;
      }
      
      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #ff2b54;
        box-shadow: 0 0 0 3px rgba(255, 43, 84, 0.1);
      }
      
      .visibility-select {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }
      
      .visibility-option {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        cursor: pointer;
        text-align: center;
        transition: all 0.3s;
      }
      
      .visibility-option.active {
        background: #ff2b54;
        color: white;
        border-color: #ff2b54;
      }
      
      /* Buttons */
      .modal-buttons {
        display: flex;
        gap: 10px;
      }
      
      .btn {
        flex: 1;
        padding: 14px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s;
      }
      
      .btn-primary {
        background: #ff2b54;
        color: white;
      }
      
      .btn-primary:hover {
        background: #e01e47;
      }
      
      .btn-primary:disabled {
        background: #ddd;
        cursor: not-allowed;
      }
      
      .btn-secondary {
        background: #f0f0f0;
        color: #333;
      }
      
      .btn-secondary:hover {
        background: #e0e0e0;
      }
      
      /* Progress */
      .upload-progress {
        margin-top: 20px;
        display: none;
      }
      
      .upload-progress.active {
        display: block;
      }
      
      .progress-bar {
        width: 100%;
        height: 6px;
        background: #eee;
        border-radius: 3px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff2b54, #ff7fa0);
        width: 0%;
        transition: width 0.3s;
      }
      
      .progress-text {
        text-align: center;
        font-size: 12px;
        color: #666;
        margin-top: 8px;
      }
      
      /* Close button */
      .modal-close {
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #999;
        transition: all 0.3s;
      }
      
      .modal-close:hover {
        color: #333;
      }
    </style>
    
    <div class="upload-container">
      <button class="modal-close" onclick="document.getElementById('farragna-upload-modal').classList.remove('active')">×</button>
      
      <h2 style="margin: 0 0 20px 0; color: #333;">Upload Video</h2>
      
      <div class="upload-tabs">
        <button class="upload-tab active" data-tab="file">📁 Upload File</button>
        <button class="upload-tab" data-tab="url">🔗 Paste URL</button>
        <button class="upload-tab" data-tab="camera">📹 Record</button>
      </div>
      
      <!-- FILE UPLOAD TAB -->
      <div class="upload-section active" id="upload-file">
        <div class="file-upload-area" id="file-drop-zone">
          <div class="upload-icon">📹</div>
          <div class="upload-text">Drag & drop your video here</div>
          <div class="upload-hint">or click to select (Max 500MB)</div>
          <input type="file" id="upload-file-input" accept="video/*">
        </div>
      </div>
      
      <!-- URL UPLOAD TAB -->
      <div class="upload-section" id="upload-url">
        <div class="url-input-group">
          <label>Video URL</label>
          <input type="url" id="url-input" placeholder="https://example.com/video.mp4" />
        </div>
        <button class="btn btn-primary" id="url-fetch-btn">Fetch & Import</button>
      </div>
      
      <!-- CAMERA TAB -->
      <div class="upload-section" id="upload-camera">
        <video id="camera-preview"></video>
        <div class="recording-timer" id="recording-timer" style="display: none;">00:00</div>
        <div class="camera-controls">
          <button class="camera-btn record" id="camera-start-btn">🔴 Start Recording</button>
          <button class="camera-btn secondary" id="camera-stop-btn" style="display: none;">⏹ Stop</button>
        </div>
      </div>
      
      <!-- METADATA FORM (Shared for all tabs) -->
      <div class="metadata-section" id="metadata-form" style="display: none;">
        <h3 style="margin: 0 0 20px 0;">Video Details</h3>
        
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="video-title" placeholder="Add a title..." maxlength="100" />
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea id="video-description" placeholder="Add a description... (You can use #hashtags)"></textarea>
        </div>
        
        <div class="form-group">
          <label>Visibility</label>
          <div class="visibility-select">
            <div class="visibility-option active" data-visibility="public">
              🌐 Public
            </div>
            <div class="visibility-option" data-visibility="private">
              🔒 Private
            </div>
            <div class="visibility-option" data-visibility="friends">
              👥 Friends
            </div>
          </div>
        </div>
      </div>
      
      <!-- UPLOAD PROGRESS -->
      <div class="upload-progress" id="upload-progress">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="progress-text" id="progress-text">Processing...</div>
      </div>
      
      <!-- ACTION BUTTONS -->
      <div class="modal-buttons" id="modal-buttons" style="margin-top: 20px;">
        <button class="btn btn-secondary" onclick="document.getElementById('farragna-upload-modal').classList.remove('active')">Cancel</button>
        <button class="btn btn-primary" id="upload-submit-btn" style="display: none;">Share Video</button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // ============ EVENT HANDLERS ============
  
  const tabs = modal.querySelectorAll('.upload-tab')
  const sections = modal.querySelectorAll('.upload-section')
  const fileDropZone = modal.querySelector('#file-drop-zone')
  const fileInput = modal.querySelector('#upload-file-input')
  const urlInput = modal.querySelector('#url-input')
  const urlFetchBtn = modal.querySelector('#url-fetch-btn')
  const cameraStartBtn = modal.querySelector('#camera-start-btn')
  const cameraStopBtn = modal.querySelector('#camera-stop-btn')
  const cameraPreview = modal.querySelector('#camera-preview')
  const recordingTimer = modal.querySelector('#recording-timer')
  const metadataForm = modal.querySelector('#metadata-form')
  const submitBtn = modal.querySelector('#upload-submit-btn')
  const progressBar = modal.querySelector('#upload-progress')
  const progressFill = modal.querySelector('#progress-fill')
  const progressText = modal.querySelector('#progress-text')
  const visibilityOptions = modal.querySelectorAll('.visibility-option')
  
  let selectedFile = null
  let selectedVisibility = 'public'
  let recordingStartTime = null
  let recordingInterval = null
  let mediaRecorder = null
  
  // Tab switching
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      sections.forEach(s => s.classList.remove('active'))
      
      tab.classList.add('active')
      sections[index].classList.add('active')
      
      metadataForm.style.display = 'none'
      submitBtn.style.display = 'none'
    })
  })
  
  // File upload handling
  fileDropZone.addEventListener('click', () => fileInput.click())
  
  fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    fileDropZone.classList.add('dragover')
  })
  
  fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('dragover')
  })
  
  fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    fileDropZone.classList.remove('dragover')
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelected(files[0])
    }
  })
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0])
    }
  })
  
  function handleFileSelected(file) {
    selectedFile = file
    fileDropZone.innerHTML = `
      <div class="upload-icon">✅</div>
      <div class="upload-text">${file.name}</div>
      <div class="upload-hint">${(file.size / (1024 * 1024)).toFixed(1)}MB</div>
    `
    
    metadataForm.style.display = 'block'
    submitBtn.style.display = 'block'
  }
  
  // URL upload
  urlFetchBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim()
    if (!url) {
      alert('Please enter a URL')
      return
    }
    
    urlFetchBtn.disabled = true
    urlFetchBtn.textContent = 'Fetching...'
    
    try {
      // Validate URL
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' })
      
      selectedFile = { url, name: 'imported-video.mp4' }
      
      urlInput.value = ''
      urlFetchBtn.textContent = 'Fetch & Import'
      urlFetchBtn.disabled = false
      
      metadataForm.style.display = 'block'
      submitBtn.style.display = 'block'
      
      alert('✅ URL loaded successfully!')
      
    } catch (error) {
      alert('❌ Failed to fetch URL. Make sure it\'s a valid video URL.')
      urlFetchBtn.disabled = false
      urlFetchBtn.textContent = 'Fetch & Import'
    }
  })
  
  // Camera recording
  cameraStartBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: { echoCancellation: true }
      })
      
      cameraPreview.srcObject = stream
      cameraPreview.classList.add('active')
      cameraStartBtn.style.display = 'none'
      cameraStopBtn.style.display = 'block'
      
      mediaRecorder = new MediaRecorder(stream)
      const chunks = []
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        selectedFile = new File([blob], 'camera-video.webm', { type: 'video/webm' })
        
        // Stop stream
        stream.getTracks().forEach(track => track.stop())
        cameraPreview.classList.remove('active')
        cameraStopBtn.style.display = 'none'
        cameraStartBtn.style.display = 'block'
        recordingTimer.style.display = 'none'
        clearInterval(recordingInterval)
        
        metadataForm.style.display = 'block'
        submitBtn.style.display = 'block'
      }
      
      mediaRecorder.start()
      recordingStartTime = Date.now()
      recordingTimer.style.display = 'block'
      
      // Update timer
      recordingInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000)
        const mins = Math.floor(elapsed / 60)
        const secs = elapsed % 60
        recordingTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      }, 100)
      
    } catch (error) {
      alert('❌ Camera access denied or not available')
    }
  })
  
  cameraStopBtn.addEventListener('click', () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
    }
  })
  
  // Visibility selection
  visibilityOptions.forEach(option => {
    option.addEventListener('click', () => {
      visibilityOptions.forEach(o => o.classList.remove('active'))
      option.classList.add('active')
      selectedVisibility = option.dataset.visibility
    })
  })
  
  // Submit upload
  submitBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      alert('Please select a file')
      return
    }
    
    const title = modal.querySelector('#video-title').value || 'Untitled'
    const description = modal.querySelector('#video-description').value || ''
    
    submitBtn.disabled = true
    progressBar.classList.add('active')
    
    try {
      // Choose upload method
      let result
      if (selectedFile.url) {
        result = await VideoManager.uploadFromURL(selectedFile.url, {
          title,
          description,
          visibility: selectedVisibility
        })
      } else if (selectedFile instanceof File) {
        result = await VideoManager.uploadFromFile(selectedFile, {
          title,
          description,
          visibility: selectedVisibility
        })
      }
      
      // Update progress
      progressFill.style.width = '100%'
      progressText.textContent = '✅ Upload complete!'
      
      setTimeout(() => {
        modal.classList.remove('active')
        progressBar.classList.remove('active')
        submitBtn.disabled = false
        submitBtn.textContent = 'Share Video'
        alert('🎉 Video uploaded successfully!')
      }, 2000)
      
    } catch (error) {
      progressText.textContent = `❌ ${error.message}`
      submitBtn.disabled = false
    }
  })
  
  return modal
}

// ===============================
// 📺 Video Feed Display
// ===============================

export function createFeedUI() {
  const feed = document.createElement('div')
  feed.id = 'farragna-feed'
  feed.style.cssText = `
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  `
  
  feed.innerHTML = `
    <div id="feed-videos"></div>
    <div id="feed-loading" style="text-align: center; padding: 20px;">
      Loading videos...
    </div>
  `
  
  return feed
}

// ===============================
// ▶️ Video Player Component
// ===============================

export function createVideoPlayer(video) {
  const player = document.createElement('div')
  player.className = 'video-player'
  player.style.cssText = `
    width: 100%;
    aspect-ratio: 9/16;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  `
  
  player.innerHTML = `
    <video style="width: 100%; height: 100%; object-fit: cover;" controls>
      <source src="${video.url}" type="video/mp4">
    </video>
    
    <!-- Video Info Overlay -->
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(0deg, rgba(0,0,0,0.8), transparent);
      padding: 20px;
      color: white;
    ">
      <div style="font-weight: bold; margin-bottom: 10px;">${video.title}</div>
      <div style="font-size: 12px; opacity: 0.8; margin-bottom: 15px;">${video.description}</div>
      
      <!-- Interaction Buttons -->
      <div style="display: flex; gap: 20px; font-size: 12px;">
        <button onclick="window.Farragna.InteractionManager.toggleLike('${video.id}')" style="
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        ">❤️ ${video.likes}</button>
        
        <button onclick="alert('Comments coming soon')" style="
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        ">💬 ${video.comments}</button>
        
        <button onclick="window.Farragna.InteractionManager.shareVideo('${video.id}')" style="
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        ">🔗 ${video.shares}</button>
      </div>
    </div>
  `
  
  return player
}

// ===============================
// 📊 Initialize Farragna App
// ===============================

export async function initFarragna(container) {
  // Create main UI
  container.innerHTML = `
    <div id="farragna-app" style="width: 100%; height: 100%; display: flex; flex-direction: column;">
      <header style="
        padding: 15px;
        background: white;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🎬 Farragna</h1>
        <button id="upload-btn" style="
          padding: 10px 20px;
          background: #ff2b54;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        ">+ Upload</button>
      </header>
      
      <main style="flex: 1; overflow-y: auto; padding: 20px 0;">
        <div id="farragna-feed"></div>
      </main>
    </div>
  `
  
  // Create upload modal
  const uploadModal = createUploadModal()
  
  // Upload button handler
  document.getElementById('upload-btn').addEventListener('click', () => {
    uploadModal.classList.add('active')
  })
  
  // Load feed
  await loadFeed(container)
  
  // Initialize admin system (7-click detection on title)
  const header = container.querySelector('header')
  if (header) {
    initAdminSystem(header)
  }
  
  console.log('🎬 Farragna initialized!')
  console.log('💡 Tip: Click the Farragna title 7 times for admin access (password: doitasap2025)')
}

// Load videos into feed
async function loadFeed(container) {
  const feedContainer = container.querySelector('#farragna-feed')
  const videos = await FeedManager.getPersonalFeed()
  
  feedContainer.innerHTML = ''
  
  for (const video of videos) {
    const playerDiv = document.createElement('div')
    playerDiv.style.marginBottom = '20px'
    playerDiv.appendChild(createVideoPlayer(video))
    feedContainer.appendChild(playerDiv)
  }
}

// Export initialization
if (typeof window !== 'undefined') {
  window.FarragnaUI = {
    createUploadModal,
    createFeedUI,
    createVideoPlayer,
    initFarragna
  }
}
