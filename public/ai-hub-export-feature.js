/**
 * AI-Hub Long-Press Export Feature
 * Enables exporting AI-Hub services to CodeBank via:
 * - 800ms long-press (mobile)
 * - Right-click context menu (desktop)
 * - Drag-and-drop alternative
 */

class AIHubExportManager {
  constructor() {
    this.longPressDuration = 800;
    this.pressTimer = null;
    this.exportedServices = new Set();
    this.loadExportedServices();
    this.init();
  }

  init() {
    console.log('[AI-Hub Export] Initializing...');
    this.setupLongPressListeners();
    this.setupContextMenuListeners();
    this.setupDragDropListeners();
    this.renderRecentlyExported();
    window.addEventListener('codebank-service-exported', () => {
      this.renderRecentlyExported();
    });
  }

  // ============= LONG PRESS =============
  setupLongPressListeners() {
    document.addEventListener('touchstart', (e) => {
      const card = e.target.closest('.ai-hub-service-card');
      if (!card) return;

      this.pressTimer = setTimeout(() => {
        this.showActionSheet(card);
      }, this.longPressDuration);
    });

    document.addEventListener('touchend', () => {
      clearTimeout(this.pressTimer);
    });

    document.addEventListener('touchmove', () => {
      clearTimeout(this.pressTimer);
    });

    // Mouse long-press (for desktop)
    document.addEventListener('mousedown', (e) => {
      const card = e.target.closest('.ai-hub-service-card');
      if (!card || e.button !== 0) return;

      this.pressTimer = setTimeout(() => {
        this.showActionSheet(card);
      }, this.longPressDuration);
    });

    document.addEventListener('mouseup', () => {
      clearTimeout(this.pressTimer);
    });

    document.addEventListener('mousemove', () => {
      clearTimeout(this.pressTimer);
    });
  }

  // ============= CONTEXT MENU =============
  setupContextMenuListeners() {
    document.addEventListener('contextmenu', (e) => {
      const card = e.target.closest('.ai-hub-service-card');
      if (!card) return;

      e.preventDefault();
      this.showActionSheet(card);
    });
  }

  // ============= DRAG & DROP =============
  setupDragDropListeners() {
    document.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.ai-hub-service-card');
      if (!card) return;

      const serviceId = card.dataset.serviceId;
      const serviceName = card.dataset.serviceName;
      const serviceIcon = card.dataset.serviceIcon;
      const serviceUrl = card.dataset.serviceUrl;

      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: serviceId,
        name: serviceName,
        icon: serviceIcon,
        url: serviceUrl
      }));

      card.classList.add('dragging');
    });

    document.addEventListener('dragend', (e) => {
      const card = e.target.closest('.ai-hub-service-card');
      if (card) card.classList.remove('dragging');
    });
  }

  // ============= ACTION SHEET =============
  showActionSheet(card) {
    const serviceId = card.dataset.serviceId;
    const serviceName = card.dataset.serviceName;
    const serviceIcon = card.dataset.serviceIcon;
    const serviceUrl = card.dataset.serviceUrl;
    const serviceCategory = card.dataset.serviceCategory || 'Tools';

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

    // Scale animation
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
      card.style.transform = 'scale(1)';
    }, 200);

    // Create action sheet
    const sheet = document.createElement('div');
    sheet.className = 'ai-hub-action-sheet';
    sheet.innerHTML = `
      <div class="action-sheet-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">${serviceIcon}</span>
          <div>
            <div style="font-weight: 600; color: #00d4ff;">${serviceName}</div>
            <div style="font-size: 12px; color: #666;">${serviceCategory}</div>
          </div>
        </div>
        <button class="action-close-btn" onclick="this.closest('.ai-hub-action-sheet').remove()">&times;</button>
      </div>
      <div class="action-sheet-content">
        <button class="action-item primary" data-action="add-to-codebank">
          <span>➕</span>
          <span>Add to CodeBank Services</span>
        </button>
        <button class="action-item" data-action="open-new-tab">
          <span>🔗</span>
          <span>Open in New Tab</span>
        </button>
        <button class="action-item" data-action="copy-url">
          <span>📋</span>
          <span>Copy URL</span>
        </button>
        <button class="action-item danger" data-action="remove">
          <span>❌</span>
          <span>Remove from CodeBank</span>
        </button>
      </div>
    `;

    document.body.appendChild(sheet);

    // Slide up animation
    setTimeout(() => sheet.classList.add('show'), 10);

    // Handle actions
    sheet.querySelectorAll('.action-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;

        if (action === 'add-to-codebank') {
          await this.exportService(serviceId, serviceName, serviceIcon, serviceUrl, serviceCategory);
          card.classList.add('exported');
        } else if (action === 'open-new-tab') {
          window.open(serviceUrl, '_blank');
        } else if (action === 'copy-url') {
          navigator.clipboard.writeText(serviceUrl);
          this.showToast('✓ URL copied');
        } else if (action === 'remove') {
          this.removeService(serviceId);
          card.classList.remove('exported');
        }

        sheet.remove();
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.ai-hub-action-sheet') && !e.target.closest('.ai-hub-service-card')) {
        sheet.remove();
      }
    });
  }

  // ============= EXPORT / IMPORT =============
  async exportService(id, name, icon, url, category) {
    console.log('[AI-Hub Export] Exporting service:', name);

    // Add to exported set
    this.exportedServices.add(id);
    this.saveExportedServices();

    // Send to parent CodeBank (if in iframe)
    if (window.parent !== window.self && window.parent.AssetBusBridge) {
      window.parent.AssetBusBridge.exportServiceToCodeBank({
        id, name, icon, url, category
      });
    }

    // Also save to localStorage
    const services = JSON.parse(localStorage.getItem('codebank-external-services') || '[]');
    if (!services.find(s => s.id === id)) {
      services.push({
        id, name, icon, url, category,
        exportedAt: new Date().toISOString()
      });
      localStorage.setItem('codebank-external-services', JSON.stringify(services));
    }

    // Emit event
    window.dispatchEvent(new CustomEvent('ai-hub-service-exported', { detail: { id, name } }));
    this.showToast(`✓ ${name} added to CodeBank`);
  }

  removeService(id) {
    this.exportedServices.delete(id);
    this.saveExportedServices();

    const services = JSON.parse(localStorage.getItem('codebank-external-services') || '[]');
    const filtered = services.filter(s => s.id !== id);
    localStorage.setItem('codebank-external-services', JSON.stringify(filtered));

    window.dispatchEvent(new CustomEvent('ai-hub-service-removed', { detail: { id } }));
    this.showToast('✓ Service removed');
  }

  loadExportedServices() {
    try {
      const services = JSON.parse(localStorage.getItem('codebank-external-services') || '[]');
      services.forEach(s => this.exportedServices.add(s.id));
    } catch (e) {
      console.error('[AI-Hub Export] Failed to load exported services:', e);
    }
  }

  saveExportedServices() {
    const services = Array.from(this.exportedServices);
    localStorage.setItem('ai-hub-exported-services', JSON.stringify(services));
  }

  // ============= UI =============
  renderRecentlyExported() {
    try {
      const services = JSON.parse(localStorage.getItem('codebank-external-services') || '[]');
      const recent = services.slice(-6).reverse();

      if (recent.length === 0) return;

      let container = document.getElementById('ai-hub-recently-exported');
      if (!container) {
        container = document.createElement('div');
        container.id = 'ai-hub-recently-exported';
        container.innerHTML = '<h3 style="color: #00d4ff; margin-bottom: 12px; font-size: 14px;">Recently Exported</h3>';
        document.querySelector('.ai-hub-grid')?.insertAdjacentElement('afterbegin', container);
      }

      const grid = container.querySelector('.recent-grid') || document.createElement('div');
      grid.className = 'recent-grid';
      grid.innerHTML = recent.map(s => `
        <div class="recent-service-card" title="${s.name}">
          <span style="font-size: 28px; margin-bottom: 8px;">${s.icon}</span>
          <div style="font-size: 11px; text-align: center; color: #888;">${s.name}</div>
        </div>
      `).join('');

      container.appendChild(grid);
    } catch (e) {
      console.error('[AI-Hub Export] Failed to render recently exported:', e);
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'ai-hub-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

// ============= STYLES =============
const styles = `
<style>
  .ai-hub-action-sheet {
    position: fixed;
    bottom: -400px;
    left: 0;
    right: 0;
    background: #1a1f3a;
    border-top: 1px solid #2d3561;
    border-radius: 12px 12px 0 0;
    padding: 16px;
    z-index: 3000;
    transition: bottom 0.3s ease;
    max-height: 60vh;
    overflow-y: auto;
  }

  .ai-hub-action-sheet.show {
    bottom: 0;
  }

  .action-sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #2d3561;
  }

  .action-close-btn {
    background: none;
    border: none;
    color: #666;
    font-size: 24px;
    cursor: pointer;
  }

  .action-sheet-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(0, 212, 255, 0.05);
    border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: 6px;
    color: #00d4ff;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .action-item:hover {
    background: rgba(0, 212, 255, 0.1);
    border-color: #00d4ff;
  }

  .action-item.primary {
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 153, 204, 0.1) 100%);
    font-weight: 600;
  }

  .action-item.danger {
    color: #ff6464;
    border-color: rgba(255, 100, 100, 0.2);
    background: rgba(255, 100, 100, 0.05);
  }

  .action-item.danger:hover {
    background: rgba(255, 100, 100, 0.1);
    border-color: #ff6464;
  }

  .ai-hub-service-card.exported::after {
    content: '✓';
    position: absolute;
    top: 8px;
    right: 8px;
    background: #00d4ff;
    color: #000;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
  }

  .ai-hub-toast {
    position: fixed;
    bottom: -100px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    background: #1a1f3a;
    border: 1px solid #2d3561;
    border-radius: 6px;
    color: #00d4ff;
    z-index: 4000;
    transition: bottom 0.3s ease;
    white-space: nowrap;
  }

  .ai-hub-toast.show {
    bottom: 20px;
  }

  .recent-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }

  .recent-service-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: rgba(0, 212, 255, 0.05);
    border: 1px solid rgba(0, 212, 255, 0.2);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .recent-service-card:hover {
    background: rgba(0, 212, 255, 0.1);
    border-color: #00d4ff;
  }
</style>
`;

document.head.insertAdjacentHTML('beforeend', styles);

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.AIHubExportManager = new AIHubExportManager();
  });
} else {
  window.AIHubExportManager = new AIHubExportManager();
}

console.log('[AI-Hub Export] Feature loaded');