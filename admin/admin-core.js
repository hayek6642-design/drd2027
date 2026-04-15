/**
 * Admin Core - Centralized Admin Dashboard
 * Handles API communication, UI updates, and authentication
 */

const API_BASE = '/api/admin';

// ==========================================
// AUTH
// ==========================================

async function login(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await res.json();
  
  if (data.ok) {
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.admin));
  }
  
  return data;
}

async function logout() {
  const token = localStorage.getItem('admin_token');
  
  if (token) {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }
  
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.location.href = '/codebank/bankode/admin-login.html';
}

function getAdminUser() {
  const user = localStorage.getItem('admin_user');
  return user ? JSON.parse(user) : null;
}

function getToken() {
  return localStorage.getItem('admin_token');
}

// ==========================================
// API HELPERS
// ==========================================

async function apiCall(endpoint, options = {}) {
  const token = getToken();
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
  
  const data = await res.json();
  
  if (!data.ok && res.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  
  return data;
}

// ==========================================
// DASHBOARD
// ==========================================

async function loadDashboard() {
  try {
    const data = await apiCall('/dashboard');
    
    if (data.ok) {
      // Update stats
      document.getElementById('total-users').textContent = data.stats.totalUsers || 0;
      document.getElementById('active-sessions').textContent = data.stats.activeSessions || 0;
      document.getElementById('services-active').textContent = Object.keys(data.stats.services || {}).length;
      
      // Update activity feed
      if (data.recentActivity) {
        renderActivityFeed(data.recentActivity);
      }
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

// ==========================================
// USERS
// ==========================================

async function loadUsers(page = 1, search = '') {
  try {
    const data = await apiCall(`/users?page=${page}&search=${search}`);
    
    if (data.ok) {
      renderUsersTable(data.users);
      return data;
    }
  } catch (err) {
    console.error('Users load error:', err);
  }
  return { users: [], total: 0 };
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table');
  
  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;">
            ${(user.name || user.email || 'U')[0].toUpperCase()}
          </span>
          ${user.name || 'Unknown'}
        </div>
      </td>
      <td>${user.email || '-'}</td>
      <td><span class="status-badge status-active">Active</span></td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td>
        <button class="action-btn primary" onclick="openAssetModal('${user.id}')">Send Assets</button>
      </td>
    </tr>
  `).join('');
}

// ==========================================
// SESSIONS
// ==========================================

async function loadSessions() {
  try {
    const data = await apiCall('/sessions');
    
    if (data.ok) {
      renderSessionsTable(data.sessions);
    }
  } catch (err) {
    console.error('Sessions load error:', err);
  }
}

function renderSessionsTable(sessions) {
  const tbody = document.getElementById('sessions-table');
  
  if (!sessions || sessions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No active sessions</td></tr>';
    return;
  }
  
  tbody.innerHTML = sessions.map(session => `
    <tr>
      <td>${session.admin_name || session.admin_email || 'Unknown'}</td>
      <td>${session.ip_address || '-'}</td>
      <td>${new Date(session.created_at).toLocaleString()}</td>
      <td>${new Date(session.expires_at).toLocaleString()}</td>
      <td>
        <button class="action-btn danger" onclick="revokeSession('${session.id}')">Revoke</button>
      </td>
    </tr>
  `).join('');
}

async function revokeSession(sessionId) {
  if (!confirm('Are you sure you want to revoke this session?')) return;
  
  try {
    const data = await apiCall(`/sessions/${sessionId}`, { method: 'DELETE' });
    
    if (data.ok) {
      loadSessions();
    } else {
      alert('Failed to revoke session');
    }
  } catch (err) {
    console.error('Revoke error:', err);
    alert('Error revoking session');
  }
}

// ==========================================
// AUDIT LOG
// ==========================================

async function loadAudit(page = 1, filters = {}) {
  try {
    const params = new URLSearchParams({ page, ...filters });
    const data = await apiCall(`/audit?${params}`);
    
    if (data.ok) {
      renderAuditTable(data.logs);
    }
  } catch (err) {
    console.error('Audit load error:', err);
  }
}

function renderAuditTable(logs) {
  const tbody = document.getElementById('audit-table');
  
  if (!logs || logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No audit logs found</td></tr>';
    return;
  }
  
  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>${new Date(log.created_at).toLocaleString()}</td>
      <td>${log.admin_name || log.admin_email || 'System'}</td>
      <td><span style="font-weight:600">${log.action}</span></td>
      <td style="font-size:0.875rem;color:var(--text-muted)">${JSON.stringify(log.details || {}).substring(0, 50)}</td>
    </tr>
  `).join('');
}

// ==========================================
// ACTIVITY FEED
// ==========================================

function renderActivityFeed(activities) {
  const container = document.getElementById('activity-feed');
  
  if (!activities || activities.length === 0) {
    container.innerHTML = '<div class="text-center" style="padding:2rem;color:var(--text-muted)">No recent activity</div>';
    return;
  }
  
  container.innerHTML = activities.map(activity => `
    <div class="activity-item">
      <div class="activity-icon">${getActivityIcon(activity.action)}</div>
      <div class="activity-content">
        <div><strong>${activity.admin_name || 'System'}</strong> ${activity.action}</div>
        <div class="activity-time">${new Date(activity.created_at).toLocaleString()}</div>
      </div>
    </div>
  `).join('');
}

function getActivityIcon(action) {
  const icons = {
    'ADMIN_LOGIN': '🔑',
    'ADMIN_LOGOUT': '🚪',
    'ASSET_SEND': '💰',
    'USER_UPDATE': '✏️',
    'PERMISSION_CREATE': '🔐',
    'SESSION_REVOKED': '❌',
    'SERVICE_UPDATE': '⚙️'
  };
  return icons[action] || '📝';
}

// ==========================================
// UI HELPERS
// ==========================================

function switchTab(tabName) {
  // Update tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = content.id === `tab-${tabName}` ? 'block' : 'none';
  });
  
  // Load data for tab
  switch (tabName) {
    case 'users':
      loadUsers();
      break;
    case 'sessions':
      loadSessions();
      break;
    case 'audit':
      loadAudit();
      break;
    case 'activity':
      loadDashboard();
      break;
  }
}

function switchPage(pageName) {
  // Update bottom nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });
  
  // Show/hide sections (simplified - in production use proper routing)
  const main = document.getElementById('main-content');
  if (main) {
    main.style.display = 'block';
  }
}

function selectService(serviceId) {
  // Highlight selected service
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.toggle('active', card.dataset.service === serviceId);
  });
  
  console.log('Selected service:', serviceId);
  // In production: load service-specific dashboard
}

function refreshData() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    switchTab(activeTab.dataset.tab);
  }
  loadDashboard();
}

// ==========================================
// MODALS
// ==========================================

function openAssetModal(userId) {
  document.getElementById('asset-user-id').value = userId;
  document.getElementById('asset-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('asset-modal').classList.remove('open');
}

async function sendAssets() {
  const userId = document.getElementById('asset-user-id').value;
  const assetType = document.getElementById('asset-type').value;
  const amount = parseInt(document.getElementById('asset-amount').value);
  const reason = document.getElementById('asset-reason').value;
  
  if (!userId || !amount) {
    alert('Please fill all required fields');
    return;
  }
  
  try {
    const data = await apiCall(`/users/${userId}/assets`, {
      method: 'POST',
      body: JSON.stringify({ assetType, amount, reason })
    });
    
    if (data.ok) {
      alert('Assets sent successfully!');
      closeModal();
    } else {
      alert('Failed to send assets: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Send assets error:', err);
    alert('Error sending assets');
  }
}

function showSettings() {
  alert('Settings panel - to be implemented');
}

// ==========================================
// ROLE-BASED UI
// ==========================================

function applyRolePermissions() {
  const user = getAdminUser();
  if (!user) return;
  
  const role = user.role;
  
  // Hide elements based on role
  if (role === 'VIEWER') {
    document.querySelectorAll('.action-btn.primary, .action-btn.danger').forEach(btn => {
      btn.classList.add('role-hidden');
    });
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  applyRolePermissions();
});

// Export for global use
window.Admin = {
  login,
  logout,
  getAdminUser,
  loadDashboard,
  loadUsers,
  loadSessions,
  loadAudit,
  switchTab,
  selectService,
  openAssetModal,
  closeModal,
  sendAssets,
  refreshData
};