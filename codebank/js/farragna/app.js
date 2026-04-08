// Farragna App
class FarragnaApp {
  constructor() {
    this.currentView = 'feed';
    this.user = null;
    this.videos = [];
    this.init();
  }

  init() {
    console.log('[Farragna] App initialized');
    this.setupAuth();
    this.setupUI();
    this.loadFeed();
  }

  setupAuth() {
    // Check for JWT token
    const token = localStorage.getItem('farragna_token');
    if (token) {
      this.user = { token };
      // Validate token
    }
  }

  setupUI() {
    const html = `
      <div id="farragna-app" class="farragna-app">
        <header class="app-header">
          <h1>Farragna</h1>
          <nav>
            <button id="feed-btn">Feed</button>
            <button id="upload-btn">Upload</button>
            <button id="profile-btn">Profile</button>
          </nav>
        </header>
        <main id="main-content">
          <div id="feed-view" class="view active">
            <div id="video-feed"></div>
          </div>
          <div id="upload-view" class="view">
            <div id="upload-form"></div>
          </div>
          <div id="profile-view" class="view">
            <div id="user-profile"></div>
          </div>
        </main>
      </div>
    `;
    document.body.innerHTML = html;

    // Event listeners
    document.getElementById('feed-btn').addEventListener('click', () => this.showView('feed'));
    document.getElementById('upload-btn').addEventListener('click', () => this.showView('upload'));
    document.getElementById('profile-btn').addEventListener('click', () => this.showView('profile'));
  }

  showView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${view}-view`).classList.add('active');
    this.currentView = view;
  }

  async loadFeed() {
    try {
      const response = await fetch('/api/farragna/feed');
      const data = await response.json();
      console.log('[Farragna] Feed response:', data);
      if (data.ok && data.videos.length > 0) {
        this.videos = data.videos;
        this.renderFeed();
        console.log('[Farragna] Feed loaded with', this.videos.length, 'videos');
      } else {
        console.log('[Farragna] Feed empty, loading seed videos');
        await this.loadSeedVideos();
      }
    } catch (e) {
      console.error('[Farragna] Failed to load feed', e);
      await this.loadSeedVideos();
    }
  }

  async loadSeedVideos() {
    // Load freemium videos from Pexels or sample
    const seedVideos = [
      {
        id: 'seed_1',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        caption: 'Sample Video 1',
        views_count: 100,
        likes: 10
      },
      {
        id: 'seed_2',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        caption: 'Sample Video 2',
        views_count: 200,
        likes: 20
      },
      {
        id: 'seed_3',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        caption: 'Sample Video 3',
        views_count: 300,
        likes: 30
      }
    ];
    this.videos = seedVideos;
    this.renderFeed();
    console.log('[Farragna] Seed videos loaded');
  }

  renderFeed() {
    const feed = document.getElementById('video-feed');
    feed.innerHTML = this.videos.map(video => `
      <div class="video-card">
        <video autoplay muted loop playsinline>
          <source src="${video.playback_url || video.url}" type="video/mp4">
        </video>
        <div class="video-overlay">
          <div class="caption">${video.caption || 'No caption'}</div>
          <div class="actions">
            <button class="like-btn" data-id="${video.id}">❤️ ${video.likes || 0}</button>
            <button class="share-btn">📤</button>
          </div>
        </div>
      </div>
    `).join('');

    // Add like event listeners
    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.toggleLike(e.target.dataset.id));
    });
  }

  async toggleLike(videoId) {
    if (!this.user) return;
    try {
      const response = await fetch(`/api/farragna/${videoId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.user.token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        // Update UI
        const btn = document.querySelector(`[data-id="${videoId}"]`);
        btn.textContent = data.liked ? 'Unlike' : 'Like';
      }
    } catch (e) {
      console.error('Like failed', e);
    }
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.farragnaApp = new FarragnaApp();
});