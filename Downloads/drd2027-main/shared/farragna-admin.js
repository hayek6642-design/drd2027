/**
 * Farragna Admin Dashboard Module
 * Secret Access: 7 consecutive clicks on title → password → dashboard
 * Password: doitasap2025
 */

class FarragnaAdmin {
  constructor() {
    this.clickCount = 0;
    this.clickTimer = null;
    this.isAdminMode = false;
    this.adminPassword = 'doitasap2025';
    this.clickResetDelay = 2000;
    this.pendingUploads = new Map();
    this.blockedUsers = new Set();
    this.flaggedContent = new Map();
    this.init();
  }

  init() {
    this.setupSecretTrigger();
    this.loadAdminState();
    console.log('[FarragnaAdmin] Initialized - 7-click trigger active');
  }

  setupSecretTrigger() {
    const title = document.querySelector('.logo-title, .farragna-title, #logoTitle');
    if (!title) {
      setTimeout(() => this.setupSecretTrigger(), 1000);
      return;
    }

    title.style.cursor = 'pointer';
    title.style.userSelect = 'none';
    title.style.webkitUserSelect = 'none';

    title.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleTitleClick();
    });
  }

  handleTitleClick() {
    this.clickCount++;
    clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => {
      this.clickCount = 0;
      this.hideClickIndicator();
    }, this.clickResetDelay);

    this.showClickProgress();

    if (this.clickCount >= 7) {
      this.clickCount = 0;
      this.hideClickIndicator();
      this.showPasswordModal();
    }
  }

  showClickProgress() {
    let indicator = document.getElementById('admin-click-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'admin-click-indicator';
      indicator.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(0, 212, 255, 0.2); border: 1px solid rgba(0, 212, 255, 0.5);
        color: #00d4ff; padding: 8px 16px; border-radius: 20px; font-size: 12px;
        font-family: monospace; z-index: 10000; backdrop-filter: blur(10px);
        transition: all 0.3s;
      `;
      document.body.appendChild(indicator);
    }
    indicator.textContent = '●'.repeat(this.clickCount) + '○'.repeat(7 - this.clickCount);
    indicator.style.opacity = '1';

    if (this.clickCount >= 7) {
      indicator.style.background = 'rgba(0, 255, 136, 0.3)';
      indicator.style.borderColor = '#00ff88';
      indicator.style.color = '#00ff88';
    }
  }

  hideClickIndicator() {
    const indicator = document.getElementById('admin-click-indicator');
    if (indicator) {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }
  }

  showPasswordModal() {
    const existing = document.getElementById('admin-password-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'admin-password-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px); display: flex; align-items: center;
      justify-content: center; z-index: 10001; animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 20px;
        padding: 40px; width: 90%; max-width: 400px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #00d4ff, #7b2cbf);
            border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center;
            justify-content: center; font-size: 24px;">🔐</div>
          <h2 style="color: #fff; margin: 0; font-size: 20px;">Admin Access</h2>
          <p style="color: rgba(255,255,255,0.6); margin: 8px 0 0; font-size: 13px;">
            Farragna Management Console</p>
        </div>
        <div style="position: relative; margin-bottom: 20px;">
          <input type="password" id="admin-password-input" placeholder="Enter admin password" style="
            width: 100%; padding: 14px 16px; background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; color: #fff;
            font-size: 16px; outline: none; box-sizing: border-box;">
          <button id="toggle-password" style="position: absolute; right: 12px; top: 50%;
            transform: translateY(-50%); background: none; border: none;
            color: rgba(255,255,255,0.5); cursor: pointer; font-size: 18px;">👁️</button>
        </div>
        <div id="password-error" style="color: #ff4444; font-size: 13px; margin-bottom: 16px;
          text-align: center; opacity: 0; transition: opacity 0.3s;"></div>
        <button id="admin-login-btn" style="width: 100%; padding: 14px;
          background: linear-gradient(135deg, #00d4ff, #7b2cbf); border: none;
          border-radius: 12px; color: #fff; font-size: 16px; font-weight: 600;
          cursor: pointer;">Access Dashboard</button>
        <button id="admin-cancel-btn" style="width: 100%; padding: 12px; background: none;
          border: none; color: rgba(255,255,255,0.5); font-size: 14px;
          cursor: pointer; margin-top: 12px;">Cancel</button>
      </div>
      <style>
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        #admin-password-input:focus { border-color: #00d4ff; }
      </style>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#admin-password-input');
    const toggleBtn = modal.querySelector('#toggle-password');
    const loginBtn = modal.querySelector('#admin-login-btn');
    const cancelBtn = modal.querySelector('#admin-cancel-btn');
    const errorDiv = modal.querySelector('#password-error');

    input.focus();

    toggleBtn.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    const attemptLogin = () => {
      if (input.value.trim() === this.adminPassword) {
        this.isAdminMode = true;
        this.saveAdminState();
        modal.remove();
        this.showAdminDashboard();
      } else {
        errorDiv.textContent = 'Invalid password. Access denied.';
        errorDiv.style.opacity = '1';
        input.style.borderColor = '#ff4444';
        setTimeout(() => {
          input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          errorDiv.style.opacity = '0';
        }, 2000);
      }
    };

    loginBtn.addEventListener('click', attemptLogin);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptLogin(); });
    cancelBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  renderStatCard(label, icon, value, color) {
    return `
      <div style="background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        border: 1px solid ${color}30; border-radius: 16px; padding: 24px; text-align: center;">
        <div style="font-size: 28px; margin-bottom: 8px;">${icon}</div>
        <div style="color: ${color}; font-size: 32px; font-weight: 700;">${value}</div>
        <div style="color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 8px;">${label}</div>
      </div>
    `;
  }

  showAdminDashboard() {
    const existing = document.getElementById('farragna-admin-dashboard');
    if (existing) existing.remove();

    document.body.style.overflow = 'hidden';

    const dashboard = document.createElement('div');
    dashboard.id = 'farragna-admin-dashboard';
    dashboard.style.cssText = `
      position: fixed; inset: 0; background: #0a0a1a; z-index: 9999;
      overflow-y: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    dashboard.innerHTML = `
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
        border-bottom: 1px solid rgba(0, 212, 255, 0.2); padding: 20px 40px;
        display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #ff006e, #8338ec);
            border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📊</div>
          <div>
            <h1 style="color: #fff; margin: 0; font-size: 22px;">Farragna Admin</h1>
            <p style="color: rgba(255,255,255,0.5); margin: 4px 0 0; font-size: 13px;">Management Dashboard</p>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 20px;">
          <div style="text-align: right;">
            <div style="color: #00ff88; font-size: 12px; font-weight: 600;">● ONLINE</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 11px;">${new Date().toLocaleString()}</div>
          </div>
          <button onclick="farragnaAdmin.closeDashboard()" style="background: rgba(255, 68, 68, 0.2);
            border: 1px solid rgba(255, 68, 68, 0.5); color: #ff4444; padding: 10px 20px;
            border-radius: 8px; cursor: pointer; font-weight: 600;">Exit Admin</button>
        </div>
      </div>
      <div style="padding: 30px 40px; max-width: 1400px; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
          ${this.renderStatCard('Total Users', '👥', '2,847', '#00d4ff')}
          ${this.renderStatCard('Pending Approvals', '⏳', '12', '#ffaa00')}
          ${this.renderStatCard('Blocked Users', '🚫', '8', '#ff4444')}
          ${this.renderStatCard('Flagged Content', '⚠️', '23', '#ff006e')}
          ${this.renderStatCard('Total Videos', '🎬', '15,420', '#00ff88')}
          ${this.renderStatCard('Storage Used', '💾', '1.2 TB', '#8338ec')}
        </div>
        <div style="background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 30px;">
          <h2 style="color: #fff; margin: 0 0 20px; font-size: 18px;">📤 Video Upload Center</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="border: 2px dashed rgba(0, 212, 255, 0.3); border-radius: 12px; padding: 30px;
              text-align: center; cursor: pointer;" onmouseover="this.style.borderColor='#00d4ff'"
               onmouseout="this.style.borderColor='rgba(0,212,255,0.3)'"
               onclick="document.getElementById('farragna-single-upload').click()">
              <div style="font-size: 40px;">📁</div>
              <h3 style="color: #fff; margin: 12px 0 8px;">Single Upload</h3>
              <p style="color: rgba(255,255,255,0.5); margin: 0;">Upload one video file</p>
            </div>
            <div style="border: 2px dashed rgba(131, 56, 236, 0.3); border-radius: 12px; padding: 30px;
              text-align: center; cursor: pointer;" onmouseover="this.style.borderColor='#8338ec'"
               onmouseout="this.style.borderColor='rgba(131,56,236,0.3)'"
               onclick="document.getElementById('farragna-bulk-upload').click()">
              <div style="font-size: 40px;">📂</div>
              <h3 style="color: #fff; margin: 12px 0 8px;">Bulk Upload</h3>
              <p style="color: rgba(255,255,255,0.5); margin: 0;">Upload multiple videos</p>
            </div>
          </div>
          <input type="file" id="farragna-single-upload" accept="video/*" style="display:none;"
            onchange="farragnaAdmin.handleSingleUpload(this)">
          <input type="file" id="farragna-bulk-upload" accept="video/*" multiple style="display:none;"
            onchange="farragnaAdmin.handleBulkUpload(this)">
          <div id="farragna-upload-progress" style="margin-top: 20px;"></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
            border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px;">
            <h2 style="color: #fff; margin: 0 0 20px; font-size: 18px;">⏳ Pending Approvals</h2>
            <div id="farragna-pending-list">
              <div style="color: rgba(255,255,255,0.4); text-align: center; padding: 40px;">No pending uploads</div>
            </div>
          </div>
          <div style="background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
            border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px;">
            <h2 style="color: #fff; margin: 0 0 20px; font-size: 18px;">⚠️ Flagged Content</h2>
            <div id="farragna-flagged-list">
              <div style="color: rgba(255,255,255,0.4); text-align: center; padding: 40px;">No flagged content</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dashboard);
  }

  handleSingleUpload(input) {
    const file = input.files[0];
    if (!file) return;
    this.processUpload([file]);
  }

  handleBulkUpload(input) {
    const files = Array.from(input.files);
    if (files.length === 0) return;
    this.processUpload(files);
  }

  processUpload(files) {
    const progressArea = document.getElementById('farragna-upload-progress');
    progressArea.innerHTML = '';

    files.forEach((file, index) => {
      const uploadId = `farragna-upload-${Date.now()}-${index}`;
      const div = document.createElement('div');
      div.style.cssText = 'background: rgba(255,255,255,0.05); border-radius: 10px; padding: 16px; margin-bottom: 12px;';
      div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
          <span style="font-size: 20px;">🎬</span>
          <div style="flex: 1;">
            <div style="color: #fff; font-size: 14px;">${file.name}</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 12px;">${(file.size/1024/1024).toFixed(2)} MB</div>
          </div>
          <span class="status" style="color: #ffaa00; font-size: 12px; font-weight: 600;">Uploading...</span>
        </div>
        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
          <div class="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #00d4ff, #7b2cbf);"></div>
        </div>
      `;
      progressArea.appendChild(div);

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          div.querySelector('.status').textContent = '✓ Complete';
          div.querySelector('.status').style.color = '#00ff88';
          this.addPendingUpload({ id: uploadId, title: file.name, user: 'Admin', size: (file.size/1024/1024).toFixed(2) + ' MB' });
        }
        div.querySelector('.progress-bar').style.width = progress + '%';
      }, 200);
    });
  }

  addPendingUpload(upload) {
    this.pendingUploads.set(upload.id, upload);
    this.updatePendingList();
  }

  updatePendingList() {
    const list = document.getElementById('farragna-pending-list');
    if (!list) return;

    if (this.pendingUploads.size === 0) {
      list.innerHTML = '<div style="color: rgba(255,255,255,0.4); text-align: center; padding: 40px;">No pending uploads</div>';
      return;
    }

    list.innerHTML = '';
    this.pendingUploads.forEach((upload, id) => {
      const item = document.createElement('div');
      item.style.cssText = 'background: rgba(255,255,255,0.03); border-radius: 10px; padding: 14px; margin-bottom: 10px;';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">🎬</span>
          <div style="flex: 1;">
            <div style="color: #fff; font-size: 14px;">${upload.title}</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 12px;">${upload.user} • ${upload.size}</div>
          </div>
          <button onclick="farragnaAdmin.approveUpload('${id}')" style="background: rgba(0,255,136,0.2); border: 1px solid rgba(0,255,136,0.5);
            color: #00ff88; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">✓ Approve</button>
          <button onclick="farragnaAdmin.rejectUpload('${id}')" style="background: rgba(255,68,68,0.2); border: 1px solid rgba(255,68,68,0.5);
            color: #ff4444; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">✗ Reject</button>
        </div>
      `;
      list.appendChild(item);
    });
  }

  approveUpload(id) {
    this.pendingUploads.delete(id);
    this.updatePendingList();
    this.showToast('Video approved', 'success');
  }

  rejectUpload(id) {
    this.pendingUploads.delete(id);
    this.updatePendingList();
    this.showToast('Video rejected', 'error');
  }

  showToast(message, type = 'info') {
    const colors = { success: '#00ff88', error: '#ff4444', warning: '#ffaa00', info: '#00d4ff' };
    const toast = document.createElement('div');
    toast.style.cssText = `position: fixed; bottom: 30px; right: 30px; background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 1px solid ${colors[type]}40; color: ${colors[type]}; padding: 16px 24px; border-radius: 12px;
      font-size: 14px; font-weight: 600; z-index: 10002;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  closeDashboard() {
    const dashboard = document.getElementById('farragna-admin-dashboard');
    if (dashboard) {
      dashboard.remove();
      document.body.style.overflow = '';
      this.isAdminMode = false;
    }
  }

  saveAdminState() {
    sessionStorage.setItem('farragna_admin_active', 'true');
  }

  loadAdminState() {
    if (sessionStorage.getItem('farragna_admin_active') === 'true') {
      this.isAdminMode = true;
    }
  }
}

const farragnaAdmin = new FarragnaAdmin();