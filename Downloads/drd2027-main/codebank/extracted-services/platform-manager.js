/**
 * Platform Manager - Comprehensive system administration interface
 */

class PlatformManager {
  constructor() {
    this.currentTab = 'overview';
    this.stats = {
      activeUsers: 0,
      serverStatus: 'online',
      uptime: 0,
      dbSize: 0,
      dbQueries: 0,
      securityStatus: 'secure'
    };
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadInitialData();
    this.startAutoRefresh();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Action buttons
    document.getElementById('refreshBtn')?.addEventListener('click', () => this.refresh());
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());

    // User search
    document.getElementById('userSearch')?.addEventListener('input', (e) => this.searchUsers(e.target.value));

    // Log filter
    document.getElementById('logLevel')?.addEventListener('change', () => this.filterLogs());
    document.getElementById('logDate')?.addEventListener('change', () => this.filterLogs());

    // Service action buttons
    document.querySelectorAll('.service-action-btn').forEach(btn => {
      btn.addEventListener('click', () => this.manageService(btn));
    });

    // Maintenance action buttons
    document.querySelectorAll('.action-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => this.performMaintenance(btn));
    });
  }

  async loadInitialData() {
    try {
      const response = await fetch('/api/platform/stats', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      this.updateStats(data);
      this.updateUsersList();
      this.updateServicesList();
    } catch (error) {
      console.error('Error loading platform data:', error);
      this.showNotification('Error loading platform data', 'error');
    }
  }

  updateStats(data) {
    this.stats = { ...this.stats, ...data };

    // Update Overview Tab
    document.getElementById('activeUsers').textContent = this.stats.activeUsers;
    document.getElementById('serverStatus').textContent = this.stats.serverStatus === 'online' ? '🟢 Online' : '🔴 Offline';
    document.getElementById('uptime').textContent = Math.floor(this.stats.uptime / 3600) + 'h';
    document.getElementById('dbSize').textContent = (this.stats.dbSize / 1024 / 1024).toFixed(2) + ' MB';
    document.getElementById('dbQueries').textContent = this.stats.dbQueries;
    document.getElementById('securityStatus').textContent = this.stats.securityStatus === 'secure' ? '✅ Secure' : '⚠️ Warning';
  }

  async updateUsersList() {
    try {
      const response = await fetch('/api/platform/users?limit=10', {
        credentials: 'include'
      });

      if (!response.ok) return;

      const users = await response.json();
      const tbody = document.getElementById('usersList');

      if (!tbody) return;

      tbody.innerHTML = users.map(user => `
        <tr>
          <td>#${user.id.toString().padStart(3, '0')}</td>
          <td>${user.email}</td>
          <td><span class="status-badge ${user.status === 'active' ? 'online' : 'offline'}">${user.status}</span></td>
          <td>${new Date(user.joinedAt).toLocaleDateString()}</td>
          <td>${this.formatTime(user.lastActive)}</td>
          <td><button class="action-link" onclick="pm.viewUser('${user.id}')">View</button></td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error updating users list:', error);
    }
  }

  async updateServicesList() {
    try {
      const response = await fetch('/api/platform/services', {
        credentials: 'include'
      });

      if (!response.ok) return;

      const services = await response.json();
      // Service data would be displayed in services-tab
    } catch (error) {
      console.error('Error updating services list:', error);
    }
  }

  switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });

    // Remove active class from buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Show selected tab
    const tabElement = document.getElementById(tabName + '-tab');
    if (tabElement) {
      tabElement.classList.add('active');
    }

    // Mark button as active
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    this.currentTab = tabName;

    // Load tab-specific data
    if (tabName === 'users') {
      this.updateUsersList();
    } else if (tabName === 'analytics') {
      this.loadAnalytics();
    } else if (tabName === 'logs') {
      this.loadLogs();
    }
  }

  async refresh() {
    document.getElementById('refreshBtn').style.animation = 'spin 0.6s';
    setTimeout(() => {
      document.getElementById('refreshBtn').style.animation = '';
    }, 600);

    await this.loadInitialData();
    this.showNotification('Platform data refreshed', 'success');
  }

  openSettings() {
    const settings = prompt('Platform settings (enter JSON config):');
    if (settings) {
      try {
        JSON.parse(settings);
        this.savePlatformSettings(settings);
      } catch {
        this.showNotification('Invalid JSON format', 'error');
      }
    }
  }

  searchUsers(query) {
    if (!query) {
      this.updateUsersList();
      return;
    }

    const rows = document.querySelectorAll('#usersList tr');
    rows.forEach(row => {
      const email = row.querySelector('td:nth-child(2)').textContent;
      const id = row.querySelector('td:first-child').textContent;
      const matches = email.toLowerCase().includes(query.toLowerCase()) || 
                     id.toLowerCase().includes(query.toLowerCase());
      row.style.display = matches ? '' : 'none';
    });
  }

  filterLogs() {
    const level = document.getElementById('logLevel')?.value || '';
    const date = document.getElementById('logDate')?.value || '';

    const logs = document.querySelectorAll('.log-entry');
    logs.forEach(log => {
      const logLevel = log.classList.toString().split(' ').pop();
      const logTime = log.querySelector('.log-time').textContent;

      const levelMatch = !level || logLevel.includes(level);
      const dateMatch = !date || logTime.includes(date);

      log.style.display = levelMatch && dateMatch ? '' : 'none';
    });
  }

  manageService(btn) {
    const serviceName = btn.parentElement.querySelector('h4').textContent;
    alert(`Managing: ${serviceName}\n\nFeatures:\n- View logs\n- Restart service\n- Configure settings\n- Monitor performance`);
  }

  async performMaintenance(btn) {
    const action = btn.parentElement.querySelector('h4').textContent;
    const confirmed = confirm(`Proceed with: ${action}?`);

    if (confirmed) {
      btn.disabled = true;
      btn.textContent = 'Processing...';

      try {
        const response = await fetch('/api/platform/maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
          credentials: 'include'
        });

        if (response.ok) {
          this.showNotification(`${action} completed successfully`, 'success');
        } else {
          this.showNotification(`Failed to complete ${action}`, 'error');
        }
      } catch (error) {
        this.showNotification(`Error: ${error.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = action.split(' ')[0];
      }
    }
  }

  async loadAnalytics() {
    try {
      const response = await fetch('/api/platform/analytics', {
        credentials: 'include'
      });

      if (!response.ok) return;

      const analytics = await response.json();
      // Render analytics charts
      console.log('Analytics loaded:', analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  async loadLogs() {
    try {
      const response = await fetch('/api/platform/logs', {
        credentials: 'include'
      });

      if (!response.ok) return;

      const logs = await response.json();
      // Logs are already displayed, this would append new entries
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }

  async savePlatformSettings(settings) {
    try {
      await fetch('/api/platform/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: settings,
        credentials: 'include'
      });

      this.showNotification('Platform settings saved', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  viewUser(userId) {
    alert(`Viewing user: ${userId}\n\nFeatures:\n- User profile\n- Activity log\n- Services used\n- Admin actions`);
  }

  startAutoRefresh() {
    // Refresh stats every 30 seconds
    setInterval(() => {
      if (this.currentTab === 'overview') {
        this.loadInitialData();
      }
    }, 30000);
  }

  formatTime(timestamp) {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Global instance
const pm = new PlatformManager();

// Register autosave adapter
if (window.UniversalAutosave) {
  UniversalAutosave.registerAdapter('platform-manager', {
    onAction: (action, data) => {
      console.log('Platform action recorded:', action, data);
    },
    onRestore: () => {
      console.log('Platform state restored');
    }
  });
}
