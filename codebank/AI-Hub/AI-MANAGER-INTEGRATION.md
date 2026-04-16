# ⚙️ CodeMind v2.0 Integration - AI-Manager Module

This guide explains how to use CodeMind v2.0 from the AI-Manager module for system administration and monitoring.

---

## 📋 Overview

The **AI-Manager** module provides administrative control over CodeMind v2.0:

- **System Monitoring** - Health checks and metrics
- **Action Management** - Approve/reject pending actions
- **Execution History** - Audit and rollback
- **User Profiles** - Behavior tracking
- **Security Events** - Incident logging

---

## 🚀 Quick Setup

### 1. Import CodeMind Manager

```javascript
// ai-manager/controllers/CodeMindManager.js
const { CodeMindV2 } = require('../../core/codemind-server-v2.js');

class CodeMindManager {
  constructor(ownerEmail) {
    this.codemind = new CodeMindV2();
    this.owner = { email: ownerEmail };
  }

  getSystemStatus() {
    return this.codemind.getSystemStatus(this.owner);
  }

  getPendingActions() {
    return this.codemind.actionEngine.getPendingActions(this.owner);
  }

  approveAction(actionId) {
    return this.codemind.actionEngine.approvePendingAction(
      actionId,
      this.owner
    );
  }

  getExecutionHistory(limit) {
    return this.codemind.actionEngine.getExecutionHistory(this.owner, limit);
  }

  getAuditLog(limit) {
    return this.codemind.security.getAuditLog(this.owner, limit);
  }

  getSecurityStatus() {
    return this.codemind.security.getSecurityStatus(this.owner);
  }
}

module.exports = { CodeMindManager };
```

### 2. Create Admin Routes

```javascript
// ai-manager/routes/admin.js
const express = require('express');
const { CodeMindManager } = require('../controllers/CodeMindManager');

const router = express.Router();
const manager = new CodeMindManager('dia201244@gmail.com');

// System status
router.get('/status', (req, res) => {
  const status = manager.getSystemStatus();
  res.json(status);
});

// Pending actions
router.get('/actions/pending', (req, res) => {
  const pending = manager.getPendingActions();
  res.json(pending);
});

// Approve action
router.post('/actions/:id/approve', async (req, res) => {
  const result = await manager.approveAction(req.params.id);
  res.json(result);
});

// Execution history
router.get('/actions/history', (req, res) => {
  const history = manager.getExecutionHistory(50);
  res.json(history);
});

// Audit logs
router.get('/logs/audit', (req, res) => {
  const logs = manager.getAuditLog(100);
  res.json(logs);
});

// Security status
router.get('/security/status', (req, res) => {
  const status = manager.getSecurityStatus();
  res.json(status);
});

module.exports = router;
```

---

## 📊 Dashboard Components

### Component 1: System Status

```jsx
// ai-manager/components/SystemStatus.jsx
import React, { useState, useEffect } from 'react';

const SystemStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    const response = await fetch('/api/admin/status');
    const data = await response.json();
    setStatus(data);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="system-status">
      <h2>System Status</h2>

      <div className="status-grid">
        {/* Overall Status */}
        <div className="card">
          <h3>Overall Status</h3>
          <p className={`status-${status.status}`}>
            {status.status === 'operational' ? '🟢' : '🔴'} {status.status}
          </p>
        </div>

        {/* Components */}
        <div className="card">
          <h3>Components</h3>
          {Object.entries(status.components).map(([name, state]) => (
            <p key={name}>
              <span className={`status-${state}`}>●</span> {name}: {state}
            </p>
          ))}
        </div>

        {/* Memory Usage */}
        <div className="card">
          <h3>Memory</h3>
          <p>
            Conversations: {status.memory.conversations}
            <br />
            User Profiles: {status.memory.userProfiles}
            <br />
            Long-term Memory: {status.memory.longTermMemory}
          </p>
        </div>

        {/* System Health */}
        {status.systemHealth.issues && status.systemHealth.issues.length > 0 && (
          <div className="card alert">
            <h3>⚠️ Issues</h3>
            {status.systemHealth.issues.map((issue, idx) => (
              <p key={idx}>
                [{issue.severity}] {issue.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStatus;
```

### Component 2: Pending Actions Queue

```jsx
// ai-manager/components/PendingActions.jsx
import React, { useState, useEffect } from 'react';

const PendingActions = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState({});

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchPending = async () => {
    const response = await fetch('/api/admin/actions/pending');
    const data = await response.json();
    setPending(data.actions || []);
    setLoading(false);
  };

  const approveAction = async (actionId) => {
    setApproving({ ...approving, [actionId]: true });

    const response = await fetch(`/api/admin/actions/${actionId}/approve`, {
      method: 'POST'
    });

    const result = await response.json();

    if (result.status === 'approved_and_executed') {
      // Remove from list
      setPending(p => p.filter(a => a.id !== actionId));
    }

    setApproving({ ...approving, [actionId]: false });
  };

  if (loading) return <div>Loading pending actions...</div>;

  if (pending.length === 0) {
    return (
      <div className="pending-actions">
        <h2>Pending Actions</h2>
        <p className="status-ok">✅ No pending actions</p>
      </div>
    );
  }

  return (
    <div className="pending-actions">
      <h2>Pending Actions ({pending.length})</h2>

      {pending.map(action => (
        <div key={action.id} className="action-card">
          <div className="action-header">
            <h3>{action.type}</h3>
            <span className="confidence">
              {action.confidence} confidence
            </span>
          </div>

          <p className="reason">{action.reason}</p>

          <div className="action-meta">
            <span>{new Date(action.submittedAt).toLocaleString()}</span>
          </div>

          <div className="action-buttons">
            <button
              className="btn-approve"
              onClick={() => approveAction(action.id)}
              disabled={approving[action.id]}
            >
              {approving[action.id] ? '⏳ Approving...' : '✅ Approve'}
            </button>

            <button className="btn-reject">
              ❌ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PendingActions;
```

### Component 3: Execution History

```jsx
// ai-manager/components/ExecutionHistory.jsx
import React, { useState, useEffect } from 'react';

const ExecutionHistory = () => {
  const [history, setHistory] = useState([]);
  const [selectedExecution, setSelectedExecution] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const response = await fetch('/api/admin/actions/history');
    const data = await response.json();
    setHistory(data.recent || []);
  };

  return (
    <div className="execution-history">
      <h2>Execution History</h2>

      {selectedExecution ? (
        <div className="execution-detail">
          <button onClick={() => setSelectedExecution(null)}>← Back</button>

          <h3>{selectedExecution.action}</h3>

          <div className="details">
            <p>ID: {selectedExecution.id}</p>
            <p>Status: {selectedExecution.status}</p>
            <p>Duration: {selectedExecution.duration}ms</p>
            <p>Executed: {selectedExecution.executedAt}</p>

            {selectedExecution.rollbackAvailable && (
              <button className="btn-rollback">🔄 Rollback</button>
            )}
          </div>
        </div>
      ) : (
        <div className="history-table">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Executed</th>
                <th>Rollback</th>
              </tr>
            </thead>
            <tbody>
              {history.map(exec => (
                <tr
                  key={exec.id}
                  onClick={() => setSelectedExecution(exec)}
                  className="clickable"
                >
                  <td>{exec.action}</td>
                  <td>
                    <span className={`status-${exec.status}`}>
                      {exec.status === 'success' ? '✅' : '❌'} {exec.status}
                    </span>
                  </td>
                  <td>{exec.duration}ms</td>
                  <td>{new Date(exec.executedAt).toLocaleString()}</td>
                  <td>
                    {exec.rollbackAvailable ? '✅' : '❌'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExecutionHistory;
```

### Component 4: Security Events

```jsx
// ai-manager/components/SecurityEvents.jsx
import React, { useState, useEffect } from 'react';

const SecurityEvents = () => {
  const [security, setSecurity] = useState(null);
  const [filterLevel, setFilterLevel] = useState('all');

  useEffect(() => {
    fetchSecurity();
    const interval = setInterval(fetchSecurity, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSecurity = async () => {
    const response = await fetch('/api/admin/security/status');
    const data = await response.json();
    setSecurity(data);
  };

  if (!security) return <div>Loading security status...</div>;

  const isSecure = security.recentIncidents === 0;

  return (
    <div className="security-status">
      <h2>Security Status</h2>

      <div className="security-overview">
        <p className={`status-${isSecure ? 'ok' : 'alert'}`}>
          {isSecure ? '🟢' : '🔴'} {security.recentIncidents} incidents in last hour
        </p>

        <p>Owner Verified: {security.ownerVerified ? '✅' : '❌'}</p>
        <p>Logs Stored: {security.totalLogsStored}</p>

        {security.suspiciousUsers && security.suspiciousUsers.length > 0 && (
          <div className="alert">
            <h3>⚠️ Suspicious Users</h3>
            <ul>
              {security.suspiciousUsers.map(user => (
                <li key={user}>{user}</li>
              ))}
            </ul>
          </div>
        )}

        {security.lastSecurityEvent && (
          <div className="last-event">
            <h3>Last Event</h3>
            <pre>{JSON.stringify(security.lastSecurityEvent, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityEvents;
```

---

## 🎯 Admin Functions

### Function 1: Monitor System Health

```javascript
// ai-manager/services/healthMonitor.js
const { CodeMindManager } = require('../controllers/CodeMindManager');

class HealthMonitor {
  constructor() {
    this.manager = new CodeMindManager('dia201244@gmail.com');
    this.alerts = [];
  }

  async checkHealth() {
    const status = this.manager.getSystemStatus();

    // Check for issues
    if (status.systemHealth.issues.length > 0) {
      this.alerts = status.systemHealth.issues;
      await this.notifyOwner();
    }

    return {
      healthy: status.systemHealth.issues.length === 0,
      issues: this.alerts
    };
  }

  async notifyOwner() {
    // Send email, push notification, etc.
    console.log('Owner notified of issues');
  }

  startMonitoring(interval = 30000) {
    setInterval(() => this.checkHealth(), interval);
  }
}

module.exports = { HealthMonitor };
```

### Function 2: Bulk Action Approval

```javascript
// ai-manager/services/actionManager.js
class ActionManager {
  constructor(manager) {
    this.manager = manager;
  }

  async approvePendingActions(filter = {}) {
    const pending = this.manager.getPendingActions();

    const toApprove = pending.actions.filter(action => {
      // Filter by confidence
      if (filter.minConfidence) {
        const confidence = parseInt(action.confidence);
        if (confidence < filter.minConfidence) return false;
      }

      // Filter by type
      if (filter.type && action.type !== filter.type) {
        return false;
      }

      return true;
    });

    const results = [];

    for (const action of toApprove) {
      const result = await this.manager.approveAction(action.id);
      results.push(result);
    }

    return {
      total: toApprove.length,
      approved: results.filter(r => r.status === 'approved_and_executed').length,
      results
    };
  }
}

module.exports = { ActionManager };
```

### Function 3: Audit Report Generation

```javascript
// ai-manager/services/auditReporter.js
class AuditReporter {
  constructor(manager) {
    this.manager = manager;
  }

  async generateReport(dateRange = '24h') {
    const logs = this.manager.getAuditLog(1000);
    const security = this.manager.getSecurityStatus();
    const history = this.manager.getExecutionHistory(100);

    return {
      generatedAt: new Date().toISOString(),
      period: dateRange,
      summary: {
        totalEvents: logs.entries.length,
        incidents: logs.entries.filter(e => e.event.includes('BLOCKED')).length,
        failedActions: history.recent.filter(e => e.status !== 'success').length
      },
      security: security,
      recommendations: this.generateRecommendations(logs)
    };
  }

  generateRecommendations(logs) {
    const recommendations = [];

    // If too many blocked actions
    if (logs.entries.filter(e => e.event.includes('BLOCKED')).length > 10) {
      recommendations.push('Review file access policies');
    }

    // If suspicious patterns detected
    if (logs.entries.some(e => e.event.includes('SUSPICIOUS'))) {
      recommendations.push('Investigate suspicious activity');
    }

    return recommendations;
  }
}

module.exports = { AuditReporter };
```

---

## 📈 Metrics & Analytics

### Collect Metrics

```javascript
// ai-manager/services/metrics.js
class MetricsCollector {
  constructor(manager) {
    this.manager = manager;
    this.metrics = [];
  }

  async collectMetrics() {
    const status = this.manager.getSystemStatus();
    const pending = this.manager.getPendingActions();
    const history = this.manager.getExecutionHistory(100);

    const metric = {
      timestamp: Date.now(),
      status: status.status,
      conversations: status.memory.conversations,
      pendingActions: pending.count,
      executedToday: history.recent.length,
      successRate: this.calculateSuccessRate(history),
      memoryUsage: status.memory.longTermMemory
    };

    this.metrics.push(metric);

    // Keep last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    return metric;
  }

  calculateSuccessRate(history) {
    const successful = history.recent.filter(h => h.status === 'success').length;
    return ((successful / history.recent.length) * 100).toFixed(1);
  }

  getMetricsSummary(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const relevant = this.metrics.filter(m => m.timestamp > cutoff);

    return {
      averageConversations: (
        relevant.reduce((sum, m) => sum + m.conversations, 0) / relevant.length
      ).toFixed(0),
      averageSuccessRate: (
        relevant.reduce((sum, m) => sum + parseFloat(m.successRate), 0) /
        relevant.length
      ).toFixed(1),
      peakMemoryUsage: Math.max(...relevant.map(m => m.memoryUsage))
    };
  }
}

module.exports = { MetricsCollector };
```

---

## 🚨 Incident Response

### Automated Incident Handler

```javascript
// ai-manager/services/incidentHandler.js
class IncidentHandler {
  constructor(manager) {
    this.manager = manager;
    this.incidents = [];
  }

  async handleSecurityIncident(details) {
    const incident = {
      id: `incident_${Date.now()}`,
      type: 'security',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      details,
      status: 'open'
    };

    this.incidents.push(incident);

    // Immediate actions
    await this.immediateResponse(incident);

    return incident;
  }

  async immediateResponse(incident) {
    console.log(`🚨 Incident ${incident.id}: ${incident.type}`);

    // 1. Notify owner
    await this.notifyOwner(incident);

    // 2. Isolate systems if needed
    // (implement based on severity)

    // 3. Begin investigation
    await this.beginInvestigation(incident);
  }

  async notifyOwner(incident) {
    // Send email, SMS, push notification
    console.log(`Owner notified of incident: ${incident.id}`);
  }

  async beginInvestigation(incident) {
    const audit = this.manager.getAuditLog(200);

    // Analyze recent activity
    const suspicious = audit.entries.filter(
      e => e.timestamp > incident.timestamp - 60000 // Last 60s
    );

    return {
      incidentId: incident.id,
      suspiciousActivities: suspicious,
      investigation: 'ongoing'
    };
  }

  resolveIncident(incidentId, resolution) {
    const incident = this.incidents.find(i => i.id === incidentId);

    if (incident) {
      incident.status = 'resolved';
      incident.resolution = resolution;
      incident.resolvedAt = new Date().toISOString();
    }

    return incident;
  }
}

module.exports = { IncidentHandler };
```

---

## 🔧 Configuration

### Environment Setup

```bash
# .env
OWNER_EMAIL=dia201244@gmail.com
ADMIN_PORT=3001
METRICS_COLLECTION=true
METRICS_INTERVAL=60000
HEALTH_CHECK=true
HEALTH_CHECK_INTERVAL=30000
```

### Load Config

```javascript
// ai-manager/config.js
module.exports = {
  owner: {
    email: process.env.OWNER_EMAIL || 'dia201244@gmail.com'
  },
  server: {
    port: process.env.ADMIN_PORT || 3001
  },
  monitoring: {
    enabled: process.env.HEALTH_CHECK === 'true',
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000')
  },
  metrics: {
    enabled: process.env.METRICS_COLLECTION === 'true',
    interval: parseInt(process.env.METRICS_INTERVAL || '60000')
  }
};
```

---

## 📊 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│                    CodeMind v2.0 - Admin Dashboard      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [System Status]          [Security Status]             │
│  🟢 Operational           🟢 Secure                     │
│  4 Components OK          0 Incidents                   │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  PENDING ACTIONS (3)                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Fix yt-player timeout                    85% ✓  │   │
│  │ Optimize safecode indexes                78%    │   │
│  │ Update corsa trading limits              92% ✓  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  EXECUTION HISTORY                                      │
│  Last 5 actions: 5 successful, 0 failed                 │
│                                                           │
│  AUDIT LOGS                                             │
│  Last 10 events displayed...                            │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 Best Practices

### 1. Regular Health Checks
```javascript
// Run every 30 minutes
const monitor = new HealthMonitor();
monitor.startMonitoring(30 * 60 * 1000);
```

### 2. Approve High-Confidence Actions
```javascript
// Auto-approve 90%+ confidence
const manager = new ActionManager(codeMindManager);
await manager.approvePendingActions({ minConfidence: 90 });
```

### 3. Generate Weekly Reports
```javascript
// Every Monday
const reporter = new AuditReporter(codeMindManager);
const report = await reporter.generateReport('7d');
```

### 4. Monitor Suspicious Activity
```javascript
// Check for patterns
const security = codeMindManager.getSecurityStatus();
if (security.suspiciousUsers.length > 0) {
  // Investigate
}
```

---

**AI-Manager Integration Complete** - Full administrative control! ⚙️
