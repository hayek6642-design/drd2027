const api = {
  async feed() {
    try {
      const res = await fetch('/api/farragna/feed', { credentials: 'include' })
      const json = await res.json().catch(() => ({ ok: false }))
      if (!res.ok || !json.ok) return []
      return json.videos || json.items || []
    } catch (e) {
      console.warn('[Farragna] Feed API missing, using mock data');
      return []
    }
  },
  async trending() {
    try {
      const res = await fetch('/api/farragna/trending', { credentials: 'include' })
      const json = await res.json().catch(() => ({ ok: false }))
      if (!res.ok || !json.ok) return []
      return json.videos || []
    } catch (e) {
      console.warn('[Farragna] Trending API missing, using mock data');
      return []
    }
  },
  async view(id) {
    try { await fetch(`/api/farragna/${id}`, { credentials: 'include' }) } catch (_) {}
  },
  async requestUpload() {
    console.log("[Farragna] Requesting upload URL...");
    const res = await fetch('/api/farragna/upload/request', { method: 'POST', credentials: 'include' })
    const json = await res.json().catch(() => ({ ok: false }))
    console.log("[Farragna] Upload response:", json)
    if (!res.ok || !json.ok) throw new Error('UPLOAD_URL_FAILED')
    return json
  },

  async uploadFile(file, caption, category) {
    console.log("[Farragna] Starting file upload...");
    const formData = new FormData();
    formData.append('video', file);
    formData.append('caption', caption || 'Uploaded Video');
    formData.append('category', category || 'entertainment');

    const res = await fetch('/api/videos/upload', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();
    console.log("[Farragna] Upload result:", result);

    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  }
}

function fmtDuration(sec){
  const s = Math.max(0, Math.floor(sec||0))
  const m = Math.floor(s/60), r = s%60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
}

function showStatus(msg){
  const el = document.getElementById('status-bar')
  if (!el) return
  el.textContent = msg
  el.style.display = 'block'
  clearTimeout(showStatus._t)
  showStatus._t = setTimeout(()=>{ el.style.display='none' }, 2500)
}

function createReel(v){
  const reel = document.createElement('div')
  reel.className = 'reel'

  const frame = document.createElement('div')
  frame.className = 'video-frame'
  const video = document.createElement('video')
  // Fix: Use videoUrl instead of playback_url
  video.src = v.videoUrl || v.playback_url || ''
  video.setAttribute('playsinline', 'true')
  video.muted = true
  video.loop = true
  video.preload = 'metadata'
  frame.appendChild(video)

  const overlay = document.createElement('div')
  overlay.className = 'overlay'
  const views = document.createElement('div')
  views.className = 'pill'
  // Fix: Use views instead of views_count
  views.innerHTML = `👁️ ${v.views||v.views_count||0}`
  const rewards = document.createElement('div')
  rewards.className = 'pill'
  // Fix: Use rewards instead of rewards_earned
  rewards.innerHTML = `🪙 ${v.rewards||v.rewards_earned||0}`
  const duration = document.createElement('div')
  duration.className = 'pill'
  duration.innerHTML = `⏱️ ${fmtDuration(v.duration||0)}`
  overlay.append(views, rewards, duration)

  reel.appendChild(frame)
  reel.appendChild(overlay)

  // View counting: call once on first play
  let viewed = false
  video.addEventListener('play', () => {
    if (!viewed) { viewed = true; api.view(v.id) }
  })

  return { reel, video }
}

function setupObserver(items){
  const options = { threshold: 0.6 }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e => {
      const video = e.target.querySelector('video')
      if (!video) return
      if (e.isIntersecting) {
        try { video.play() } catch(_){}
      } else {
        try { video.pause() } catch(_){}
      }
    })
  }, options)
  items.forEach(item => io.observe(item))
}

async function loadReels(){
  const container = document.getElementById('reels-container')
  if (!container) return
  container.innerHTML = ''
  let list = []
  try { list = await api.feed() } catch(_){}
  if (!list || !list.length) {
    try { list = await api.trending() } catch(_){}
  }
  const ready = (list||[]).filter(v => v.status === 'ready' && (v.videoUrl || v.playback_url))
  if (!ready.length) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:80vh;opacity:.7">No ready videos yet</div>'
    return
  }
  const items = []
  for (const v of ready) {
    const { reel } = createReel(v)
    container.appendChild(reel)
    items.push(reel)
  }
  setupObserver(items)
}

async function setupUpload(){
  const btn = document.getElementById('upload-btn')
  const input = document.getElementById('upload-input')
  if (!btn || !input) return
  btn.onclick = ()=> input.click()
  input.onchange = async (e)=>{
    const file = e.target.files?.[0]
    if (!file) return
    showStatus('Uploading video...')
    try {
      const result = await api.uploadFile(file)
      showStatus('Upload successful! Video will appear in feed.')
      
      // Refresh the feed to show the new video
      setTimeout(() => {
        loadReels()
      }, 1000)
    } catch (err) {
      showStatus('Error: '+err.message)
    }
  }
}

// Import compatibility layers
import './iframe-compatibility.js';
import './seed-videos.js';

// Initialize iframe compatibility
const iframeBridge = new FarragnaIframeBridge();
iframeBridge.initialize();

// Update API functions to use bridge
const originalApi = { ...api };

api.feed = async function() {
  try {
    // Try to get feed from bridge first
    const bridgeFeed = await iframeBridge.getFeed();
    if (bridgeFeed && bridgeFeed.length > 0) {
      return bridgeFeed;
    }
    
    // Fall back to original API
    const res = await fetch('/api/farragna/feed', { credentials: 'include' })
    const json = await res.json().catch(() => ({ ok: false }))
    if (!res.ok || !json.ok) return []
    return json.videos || json.items || []
  } catch (e) {
    console.warn('[Farragna] Feed API missing, using mock data');
    return []
  }
};

api.trending = async function() {
  try {
    // Try to get trending from bridge first
    const bridgeFeed = await iframeBridge.getFeed();
    if (bridgeFeed && bridgeFeed.length > 0) {
      return bridgeFeed;
    }
    
    // Fall back to original API
    const res = await fetch('/api/farragna/trending', { credentials: 'include' })
    const json = await res.json().catch(() => ({ ok: false }))
    if (!res.ok || !json.ok) return []
    return json.videos || []
  } catch (e) {
    console.warn('[Farragna] Trending API missing, using mock data');
    return []
  }
};

api.uploadFile = async function(file, caption, category) {
  console.log("[Farragna] Starting file upload...");
  const formData = new FormData();
  formData.append('video', file);
  formData.append('caption', caption || 'Uploaded Video');
  formData.append('category', category || 'entertainment');

  const res = await fetch('/api/videos/upload', {
    method: 'POST',
    body: formData
  });

  const result = await res.json();
  console.log("[Farragna] Upload result:", result);

  if (!res.ok || !result.success) {
    throw new Error(result.error || 'Upload failed');
  }

  // Add video to feed via bridge
  if (result.video) {
    await iframeBridge.addVideoToFeed(result.video);
  }

  return result;
};

window.addEventListener('load', async () => {
  console.log('[Farragna] Feed initialized');
  
  // Check and seed videos if feed is empty
  const videoSeeder = new VideoSeeder();
  await videoSeeder.checkAndSeed();
  
  await loadReels()
  await setupUpload()
  
  const container = document.getElementById('reels-container')
  if (container) {
    container.addEventListener('wheel', (e)=>{
      e.preventDefault()
      container.scrollBy({ top: e.deltaY>0 ? container.clientHeight : -container.clientHeight, behavior: 'smooth' })
    }, { passive: false })
  }
})

// Expose refresh function for bridge
window.refreshFeed = async () => {
  await loadReels();
};

