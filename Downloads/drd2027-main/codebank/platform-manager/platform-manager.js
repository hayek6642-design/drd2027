/**
 * Platform Manager - CodeBank Service
 * System monitoring, resource management, and service control
 */

class PlatformManager {
    constructor() {
        this.currentTab = 'dashboard';
        this.logs = this.initializeLogs();
        this.metrics = this.initializeMetrics();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.setupAutoRefresh();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Action buttons
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshData());
        document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());

        // Log filtering
        document.getElementById('logFilter')?.addEventListener('input', (e) => this.filterLogs(e.target.value));
        document.getElementById('clearLogsBtn')?.addEventListener('click', () => this.clearLogs());

        // Service action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleServiceAction(e));
        });
    }

    switchTab(tabName) {
        // Update UI
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        if (tabName === 'logs') {
            this.displayLogs();
        } else if (tabName === 'analytics') {
            this.loadAnalytics();
        }
    }

    loadDashboard() {
        this.updateDashboard();
    }

    updateDashboard() {
        // Simulate dynamic data updates
        const activeUsers = Math.floor(Math.random() * 2000) + 800;
        const requests = (Math.random() * 600 + 200).toFixed(1);

        document.getElementById('activeUsers').textContent = activeUsers.toLocaleString();
        document.getElementById('requests').textContent = `${requests}K`;

        // Log the update
        this.addLog('Dashboard data refreshed', 'info');
    }

    refreshData() {
        this.updateDashboard();
        this.updateMetrics();
        this.addLog('Manual refresh triggered', 'info');

        // Visual feedback
        const btn = document.getElementById('refreshBtn');
        btn.style.transform = 'rotate(360deg)';
        setTimeout(() => btn.style.transform = '', 1000);
    }

    updateMetrics() {
        // Update resource metrics
        const cpuUsage = Math.floor(Math.random() * 50) + 20;
        const memoryUsage = Math.floor(Math.random() * 40) + 25;
        const storageUsage = Math.floor(Math.random() * 30) + 15;

        this.metrics = {
            cpu: cpuUsage,
            memory: memoryUsage,
            storage: storageUsage,
            timestamp: new Date()
        };
    }

    openSettings() {
        const settings = {
            notifications: true,
            autoRefresh: true,
            theme: 'light',
            refreshInterval: 60
        };

        alert(`Platform Manager Settings:\n\n${JSON.stringify(settings, null, 2)}\n\nSettings panel would open in full implementation.`);
    }

    handleServiceAction(event) {
        const action = event.target.textContent;
        const serviceItem = event.target.closest('.service-item');
        const serviceName = serviceItem.querySelector('h4').textContent;

        if (action.includes('View Logs')) {
            this.addLog(`Viewing logs for ${serviceName}`, 'info');
            this.switchTab('logs');
        } else if (action.includes('Configure')) {
            this.addLog(`Opening configuration for ${serviceName}`, 'info');
            alert(`Configuring ${serviceName}...`);
        }
    }

    displayLogs() {
        const logsList = document.getElementById('logsList');
        if (logsList) {
            logsList.innerHTML = this.logs.map(log => `
                <div class="log-entry ${log.level.toLowerCase()}">
                    <span class="log-time">${log.time}</span>
                    <span class="log-level">[${log.level}]</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `).join('');
        }
    }

    filterLogs(query) {
        const filtered = this.logs.filter(log =>
            log.message.toLowerCase().includes(query.toLowerCase())
        );

        const logsList = document.getElementById('logsList');
        if (logsList) {
            logsList.innerHTML = filtered.map(log => `
                <div class="log-entry ${log.level.toLowerCase()}">
                    <span class="log-time">${log.time}</span>
                    <span class="log-level">[${log.level}]</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `).join('');
        }
    }

    addLog(message, level = 'info') {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        this.logs.unshift({
            time,
            level: level.toUpperCase(),
            message
        });

        // Keep only last 100 logs
        if (this.logs.length > 100) {
            this.logs.pop();
        }

        // Update display if on logs tab
        if (this.currentTab === 'logs') {
            this.displayLogs();
        }
    }

    clearLogs() {
        if (confirm('Are you sure you want to clear all logs?')) {
            this.logs = [];
            this.addLog('Logs cleared', 'warning');
            this.displayLogs();
        }
    }

    loadAnalytics() {
        this.addLog('Analytics data loaded', 'info');
    }

    setupAutoRefresh() {
        // Refresh metrics every 30 seconds
        setInterval(() => {
            if (this.currentTab === 'dashboard') {
                this.updateMetrics();
            }
        }, 30000);
    }

    initializeLogs() {
        return [
            { time: '14:25:33', level: 'WARNING', message: 'High memory usage detected: 85%' },
            { time: '14:24:12', level: 'INFO', message: 'API routes initialized' },
            { time: '14:23:46', level: 'SUCCESS', message: 'Database connection established' },
            { time: '14:23:45', level: 'INFO', message: 'Server started successfully' }
        ];
    }

    initializeMetrics() {
        return {
            cpu: 34,
            memory: 35,
            storage: 23,
            bandwidth: 42,
            timestamp: new Date()
        };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.platformManager = new PlatformManager();
    console.log('[Platform Manager] Initialized successfully');
});
