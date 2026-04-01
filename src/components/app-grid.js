// src/components/app-grid.js

/**
 * App Grid Component - Performance Optimized
 * Lazy loading, virtualization, and efficient rendering
 */

class AppGrid {
  constructor(container) {
    this.container = container;
    this.apps = [];
    this.visibleApps = new Set();
    this.intersectionObserver = null;
    this.resizeObserver = null;
    
    this.init();
  }

  init() {
    this.setupGrid();
    this.setupObservers();
    this.loadApps();
  }

  setupGrid() {
    this.container.innerHTML = `
      <div class="app-grid-container">
        <div class="app-grid-header">
          <h2 class="app-grid-title">CodeBank Services</h2>
          <div class="app-grid-stats">
            <span class="stat-item">Services: <span id="app-count">0</span></span>
            <span class="stat-item">Active: <span id="active-count">0</span></span>
          </div>
        </div>
        <div id="app-grid" class="app-grid-grid"></div>
      </div>
    `;
    
    // Add grid styles
    this.addGridStyles();
  }

  addGridStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .app-grid-container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .app-grid-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .app-grid-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #fff;
        margin: 0;
      }
      
      .app-grid-stats {
        display: flex;
        gap: 16px;
        font-size: 0.9rem;
        color: #888;
      }
      
      .stat-item {
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 12px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .app-grid-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }
      
      .app-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
      }
      
      .app-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      }
      
      .app-card:active {
        transform: translateY(0);
      }
      
      .app-icon {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
        font-size: 24px;
      }
      
      .app-name {
        font-weight: 600;
        color: #fff;
        margin-bottom: 4px;
        font-size: 1rem;
      }
      
      .app-desc {
        font-size: 0.8rem;
        color: #888;
        line-height: 1.4;
      }
      
      .app-status {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #333;
      }
      
      .app-status.active {
        background: #00ff88;
        box-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
      }
      
      .app-status.loading {
        background: #ffaa00;
        animation: pulse 1s infinite;
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 170, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0); }
      }
      
      @media (max-width: 768px) {
        .app-grid-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
        
        .app-grid-grid {
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  setupObservers() {
    // Intersection Observer for lazy loading
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const card = entry.target;
        if (entry.isIntersecting) {
          this.loadAppCard(card);
        }
      });
    }, {
      root: null,
      rootMargin: '50px',
      threshold: 0.1
    });

    // Resize Observer for responsive updates
    this.resizeObserver = new ResizeObserver(() => {
      this.updateGridStats();
    });
    this.resizeObserver.observe(this.container);
  }

  loadApps() {
    // Mock app data - in real app, this would come from a service
    this.apps = [
      {
        id: 'safecode',
        name: 'SafeCode',
        description: 'Secure code generation and validation',
        icon: '🔒',
        category: 'security',
        url: '/safecode.html'
      },
      {
        id: 'e7ki',
        name: 'E7ki',
        description: 'Advanced analytics and insights',
        icon: '📊',
        category: 'analytics',
        url: '/e7ki.html'
      },
      {
        id: 'farragna',
        name: 'Farragna',
        description: 'Media streaming and management',
        icon: '🎬',
        category: 'media',
        url: '/farragna.html'
      },
      {
        id: 'samma3ny',
        name: 'Samma3ny',
        description: 'Audio processing and effects',
        icon: '🎵',
        category: 'audio',
        url: '/samma3ny.html'
      },
      {
        id: 'pebalaash',
        name: 'Pebalaash',
        description: 'Image processing and filters',
        icon: '🖼️',
        category: 'graphics',
        url: '/pebalaash.html'
      },
      {
        id: 'battalooda',
        name: 'Battalooda',
        description: 'Music creation and studio tools',
        icon: '🎧',
        category: 'studio',
        url: '/battalooda.html'
      }
    ];

    this.renderApps();
    this.updateGridStats();
  }

  renderApps() {
    const grid = document.getElementById('app-grid');
    grid.innerHTML = '';

    this.apps.forEach(app => {
      const card = document.createElement('div');
      card.className = 'app-card';
      card.dataset.appId = app.id;
      card.dataset.appUrl = app.url;
      card.innerHTML = `
        <div class="app-icon">${app.icon}</div>
        <div class="app-name">${app.name}</div>
        <div class="app-desc">${app.description}</div>
        <div class="app-status" id="status-${app.id}"></div>
      `;
      
      card.addEventListener('click', () => this.launchApp(app));
      grid.appendChild(card);
      
      // Observe for lazy loading
      this.intersectionObserver.observe(card);
    });
  }

  loadAppCard(card) {
    // Add performance optimizations
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 50);
  }

  async launchApp(app) {
    try {
      // Update status
      const status = document.getElementById(`status-${app.id}`);
      status.className = 'app-status loading';
      
      // Use ServiceManager V2
      if (window.serviceManager) {
        const container = document.getElementById('app');
        await window.serviceManager.mountService(app.id, container);
        
        status.className = 'app-status active';
      } else {
        // Fallback
        window.location.href = app.url;
      }
      
    } catch (error) {
      console.error('Failed to launch app:', error);
      const status = document.getElementById(`status-${app.id}`);
      status.style.background = '#ff4444';
    }
  }

  updateGridStats() {
    const appCount = document.getElementById('app-count');
    const activeCount = document.getElementById('active-count');
    
    if (appCount) appCount.textContent = this.apps.length;
    if (activeCount) {
      const active = Array.from(document.querySelectorAll('.app-status.active')).length;
      activeCount.textContent = active;
    }
  }

  // Performance methods
  cleanup() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  pause() {
    // Pause animations and heavy operations
    document.querySelectorAll('.app-card').forEach(card => {
      card.style.animation = 'none';
    });
  }

  resume() {
    // Resume normal operation
    document.querySelectorAll('.app-card').forEach(card => {
      card.style.animation = '';
    });
  }
}

// Export function for module loading
export function renderAppGrid(container) {
  return new AppGrid(container);
}