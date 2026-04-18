// src/components/app-grid.js
import { AuthHeader } from './auth-header.js';

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
    this.authHeader = null;
    
    this.init();
  }

  init() {
    this.setupAuthHeader();
    this.setupGrid();
    this.setupObservers();
    this.loadApps();
  }

  setupAuthHeader() {
    // Initialize authentication header at the top
    this.authHeader = new AuthHeader(this.container);
  }

  setupGrid() {
    this.container.innerHTML += `
      <div class="app-grid-container">
        <div class="app-grid-header">
          <h2 class="app-grid-title">Services Dashboard</h2>
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
      /* Remove any side panel styles */
      body {
        margin: 0;
        padding: 0;
        background: #0f0f0f;
      }

      #app {
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .app-grid-container {
        padding: 24px 20px;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
      }
      
      .app-grid-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        padding-bottom: 20px;
        border-bottom: 2px solid rgba(0, 212, 255, 0.2);
      }
      
      .app-grid-title {
        font-size: 2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #00d4ff, #0099ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        letter-spacing: 1px;
      }
      
      .app-grid-stats {
        display: flex;
        gap: 16px;
        font-size: 0.9rem;
        color: #888;
      }
      
      .stat-item {
        background: rgba(0, 212, 255, 0.05);
        padding: 6px 14px;
        border-radius: 20px;
        border: 1px solid rgba(0, 212, 255, 0.2);
        transition: all 0.3s ease;
      }

      .stat-item:hover {
        background: rgba(0, 212, 255, 0.1);
        border-color: rgba(0, 212, 255, 0.4);
      }
      
      .app-grid-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 20px;
        animation: fadeIn 0.5s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .app-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 14px;
        padding: 18px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 180px;
      }

      .app-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: -1;
      }
      
      .app-card:hover {
        transform: translateY(-6px) scale(1.02);
        border-color: rgba(0, 212, 255, 0.5);
        background: rgba(255, 255, 255, 0.05);
        box-shadow: 0 12px 40px rgba(0, 212, 255, 0.15);
      }

      .app-card:hover::before {
        opacity: 1;
      }
      
      .app-card:active {
        transform: translateY(-2px) scale(0.98);
      }
      
      .app-icon {
        width: 52px;
        height: 52px;
        border-radius: 10px;
        background: linear-gradient(135deg, #00d4ff, #0099ff);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
        font-size: 28px;
        box-shadow: 0 4px 15px rgba(0, 212, 255, 0.25);
      }
      
      .app-name {
        font-weight: 600;
        color: #fff;
        margin-bottom: 6px;
        font-size: 1.05rem;
        letter-spacing: 0.5px;
      }
      
      .app-desc {
        font-size: 0.85rem;
        color: #aaa;
        line-height: 1.5;
        flex-grow: 1;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .app-status {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
      }
      
      .app-status.active {
        background: #00ff88;
        box-shadow: 0 0 12px rgba(0, 255, 136, 0.7);
      }
      
      .app-status.loading {
        background: #ffaa00;
        animation: pulse 1.2s infinite;
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 170, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0); }
      }
      
      /* Responsive design */
      @media (max-width: 1024px) {
        .app-grid-grid {
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        }
      }

      @media (max-width: 768px) {
        .app-grid-container {
          padding: 16px 12px;
        }

        .app-grid-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .app-grid-title {
          font-size: 1.5rem;
        }

        .app-grid-stats {
          width: 100%;
          justify-content: flex-start;
          flex-wrap: wrap;
        }
        
        .app-grid-grid {
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }

        .app-card {
          padding: 12px;
          min-height: 140px;
        }

        .app-icon {
          width: 40px;
          height: 40px;
          font-size: 20px;
        }

        .app-name {
          font-size: 0.9rem;
        }

        .app-desc {
          font-size: 0.75rem;
        }
      }

      @media (max-width: 480px) {
        .app-grid-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }
      }

      /* Remove any scrollbar styling that might come from side panels */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(0, 212, 255, 0.3);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 212, 255, 0.5);
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