// src/admin/admin-dashboard.js
/**
 * Admin Pulse Dashboard
 * Real-time system monitoring and health checks
 */

class AdminDashboard {
  constructor() {
    this.charts = {};
    this.metrics = {
      codesGenerated: 0,
      codesRedeemed: 0,
      activeUsers: 0,
      systemHealth: 'good'
    };
    
    this.init();
  }

  init() {
    this.createUI();
    this.startDataCollection();
    this.setupCharts();
  }

  createUI() {
    const style = document.createElement('style');
    style.textContent = `
      .admin-dashboard {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #0a0a0a;
        color: #fff;
        font-family: 'Inter', system-ui;
        z-index: 100000;
        display: none;
        overflow-y: auto;
      }
      
      .admin-dashboard.active {
        display: block;
      }
      
      .admin-header {
        background: #111;
        padding: 20px 40px;
        border-bottom: 1px solid #222;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .admin-title {
        font-size: 24px;
        font-weight: 600;
        color: #00d4ff;
      }
      
      .admin-close {
        background: #333;
        border: none;
        color: #fff;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
      }
      
      .admin-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        padding: 40px;
      }
      
      .admin-card {
        background: #111;
        border: 1px solid #222;
        border-radius: 16px;
        padding: 24px;
      }
      
      .admin-card h3 {
        margin: 0 0 16px;
        color: #888;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .admin-metric {
        font-size: 48px;
        font-weight: 700;
        color: #fff;
      }
      
      .admin-metric.positive { color: #4caf50; }
      .admin-metric.negative { color: #f44336; }
      .admin-metric.warning { color: #ff9800; }
      
      .admin-chart {
        height: 200px;
        margin-top: 16px;
      }
      
      .admin-health {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }
      
      .health-indicator {
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .health-good { background: #4caf50; color: #000; }
      .health-warning { background: #ff9800; color: #000; }
      .health-critical { background: #f44336; color: #fff; }
      
      .admin-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }
      
      .admin-btn {
        background: #00d4ff;
        color: #000;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
      }
      
      .admin-btn.danger {
        background: #f44336;
        color: #fff;
      }
    `;
    document.head.appendChild(style);

    this.container = document.createElement('div');
    this.container.className = 'admin-dashboard';
    this.container.innerHTML = `
      <header class="admin-header">
        <h1 class="admin-title">🔧 Admin Pulse Dashboard</h1>
        <button class="admin-close" onclick="adminDashboard.toggle()">إغلاق</button>
      </header>
      
      <div class="admin-grid">
        <div class="admin-card">
          <h3>الرموز المُنشأة</h3>
          <div class="admin-metric" id="metric-codes-gen">0</div>
          <div class="admin-chart" id="chart-codes"></div>
        </div>
        
        <div class="admin-card">
          <h3>الرموز المُستبدلة</h3>
          <div class="admin-metric" id="metric-codes-redeemed">0</div>
          <div class="admin-chart" id="chart-redeemed"></div>
        </div>
        
        <div class="admin-card">
          <h3>المستخدمون النشطون</h3>
          <div class="admin-metric" id="metric-active-users">0</div>
          <div class="admin-health" id="health-users"></div>
        </div>
        
        <div class="admin-card">
          <h3>صحة النظام</h3>
          <div class="health-indicator health-good" id="system-health">جيدة</div>
          <div class="admin-actions">
            <button class="admin-btn" onclick="adminDashboard.runDiagnostics()">تشغيل الفحص</button>
            <button class="admin-btn danger" onclick="adminDashboard.emergencyMode()">الوضع الطوارئ</button>
          </div>
        </div>
        
        <div class="admin-card" style="grid-column: 1 / -1;">
          <h3>سجل العمليات (آخر 50)</h3>
          <div id="audit-log" style="font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto;"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.container);
    
    // Keyboard shortcut: Ctrl+Shift+A
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        this.toggle();
      }
    });
  }

  setupCharts() {
    // Simple canvas-based charts (no heavy library)
    this.drawSparkline('chart-codes', [10, 25, 40, 35, 50, 45, 60]);
    this.drawSparkline('chart-redeemed', [5, 15, 20, 30, 25, 35, 40]);
  }

  drawSparkline(containerId, data) {
    const container = document.getElementById(containerId);
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * canvas.width;
      const y = canvas.height - ((val - min) / range) * canvas.height;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    
    // Fill gradient
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.fill();
  }

  startDataCollection() {
    // Collect metrics every 5 seconds
    setInterval(() => this.collectMetrics(), 5000);
    
    // Initial collection
    this.collectMetrics();
  }

  async collectMetrics() {
    // Get from database manager
    const dbStatus = window.DatabaseManager?.getStatus();
    const apiMetrics = window.ExternalAPI?.getMetrics();
    
    // Update UI
    this.updateMetric('metric-codes-gen', dbStatus?.metrics?.processed || 0);
    this.updateMetric('metric-codes-redeemed', this.metrics.codesRedeemed);
    this.updateMetric('metric-active-users', this.estimateActiveUsers());
    
    // Update health
    const health = this.calculateHealth(dbStatus, apiMetrics);
    this.updateHealth(health);
    
    // Update audit log
    this.updateAuditLog();
  }

  updateMetric(id, value) {
    const el = document.getElementById(id);
    if (el) {
      // Animate number change
      const current = parseInt(el.textContent) || 0;
      const diff = value - current;
      
      if (diff !== 0) {
        el.style.color = diff > 0 ? '#4caf50' : '#f44336';
        setTimeout(() => el.style.color = '', 500);
      }
      
      el.textContent = value.toLocaleString();
    }
  }

  estimateActiveUsers() {
    // Estimate based on recent API calls and websocket connections
    return Math.floor(Math.random() * 50) + 100; // Placeholder
  }

  calculateHealth(dbStatus, apiMetrics) {
    let score = 100;
    
    if (dbStatus?.queueLength > 100) score -= 20;
    if (dbStatus?.isProcessing) score -= 10;
    if (apiMetrics?.auditLogSize > 900) score -= 10;
    
    if (score >= 90) return 'good';
    if (score >= 70) return 'warning';
    return 'critical';
  }

  updateHealth(health) {
    const el = document.getElementById('system-health');
    el.className = `health-indicator health-${health}`;
    el.textContent = health === 'good' ? 'جيدة' : health === 'warning' ? 'تحذير' : 'حرجة';
  }

  updateAuditLog() {
    const log = window.ExternalAPI?.getAuditLog({ limit: 50 }) || [];
    const container = document.getElementById('audit-log');
    
    container.innerHTML = log.map(entry => `
      <div style="padding: 8px; border-bottom: 1px solid #222; ${entry.status === 'error' ? 'color: #f44336;' : ''}">
        [${new Date(entry.timestamp).toLocaleTimeString('ar-SA')}] 
        ${entry.endpoint} - ${entry.status} 
        (${entry.duration}ms)
      </div>
    `).join('');
  }

  runDiagnostics() {
    const results = [];
    
    // Check database
    const dbStatus = window.DatabaseManager?.getStatus();
    results.push({
      component: 'Database',
      status: dbStatus?.walMode ? 'pass' : 'fail',
      message: dbStatus?.walMode ? 'WAL mode enabled' : 'WAL mode disabled'
    });
    
    // Check service manager
    const smStatus = window.serviceManager?.getMetrics?.();
    results.push({
      component: 'Service Manager',
      status: smStatus ? 'pass' : 'warning',
      message: smStatus ? `${smStatus.activeCount} active services` : 'Metrics unavailable'
    });
    
    // Display results
    alert(results.map(r => `${r.component}: ${r.status.toUpperCase()} - ${r.message}`).join('\n'));
  }

  emergencyMode() {
    if (confirm('تفعيل وضع الطوارئ؟ سيؤدي إلى:\n- إيقاف جميع الخدمات\n- تفريغ قاعدة البيانات من الذاكرة\n- إعادة تشغيل النظام')) {
      window.serviceManager?.emergencyCleanup?.();
      window.DatabaseManager?.emergencyFlush?.();
      location.reload();
    }
  }

  toggle() {
    this.container.classList.toggle('active');
    if (this.container.classList.contains('active')) {
      this.collectMetrics();
    }
  }
}

// Initialize
window.adminDashboard = new AdminDashboard();