/**
 * E7ki Service Monitoring System
 * Comprehensive logging and monitoring for debugging and operational visibility
 */

import fs from 'fs';
import path from 'path';

class E7kiMonitoringSystem {
  constructor() {
    this.logDir = path.join(process.cwd(), 'e7ki-debug', 'logs');
    this.ensureLogDirectory();
    
    this.metrics = {
      requests: 0,
      errors: 0,
      webSocketConnections: 0,
      messagesProcessed: 0,
      databaseQueries: 0,
      authenticationAttempts: 0
    };
    
    this.errorLog = [];
    this.performanceLog = [];
    this.securityLog = [];
    this.businessLog = [];
    
    this.startTime = Date.now();
    this.isMonitoring = false;
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // Enhanced Logging System
  log(level, category, message, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      details,
      uptime: Date.now() - this.startTime
    };

    // Console output
    const logMessage = `[${timestamp}] [${level}] [${category}] ${message}`;
    const detailString = Object.keys(details).length > 0 ? `\nDetails: ${JSON.stringify(details, null, 2)}` : '';
    
    switch (level) {
      case 'ERROR':
        console.error(`❌ ${logMessage}${detailString}`);
        break;
      case 'WARN':
        console.warn(`⚠️ ${logMessage}${detailString}`);
        break;
      case 'INFO':
        console.log(`ℹ️ ${logMessage}${detailString}`);
        break;
      case 'DEBUG':
        console.log(`🔍 ${logMessage}${detailString}`);
        break;
      default:
        console.log(`${logMessage}${detailString}`);
    }

    // File logging
    this.writeToFile(logEntry);

    // Store in memory for analysis
    if (level === 'ERROR') {
      this.errorLog.push(logEntry);
    } else if (category === 'PERFORMANCE') {
      this.performanceLog.push(logEntry);
    } else if (category === 'SECURITY') {
      this.securityLog.push(logEntry);
    } else if (category === 'BUSINESS') {
      this.businessLog.push(logEntry);
    }
  }

  writeToFile(logEntry) {
    const fileName = `${logEntry.category.toLowerCase()}-${new Date().toISOString().split('T')[0]}.log`;
    const filePath = path.join(this.logDir, fileName);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFileSync(filePath, logLine);
  }

  // Infrastructure Monitoring
  monitorServerHealth() {
    this.log('INFO', 'INFRASTRUCTURE', 'Starting server health monitoring');
    
    setInterval(() => {
      const uptime = Date.now() - this.startTime;
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.log('INFO', 'PERFORMANCE', 'Server metrics', {
        uptime: `${Math.floor(uptime / 1000)}s`,
        memory: {
          rss: `${Math.floor(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.floor(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.floor(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.floor(memoryUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        metrics: this.metrics
      });
      
      // Alert on high memory usage
      if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        this.log('WARN', 'PERFORMANCE', 'High memory usage detected', {
          heapUsed: `${Math.floor(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          threshold: '500MB'
        });
      }
      
      // Alert on high error rate
      if (this.metrics.errors > 100) {
        this.log('ERROR', 'PERFORMANCE', 'High error rate detected', {
          errorCount: this.metrics.errors,
          threshold: 100
        });
      }
      
    }, 30000); // Every 30 seconds
  }

  // WebSocket Monitoring
  monitorWebSocketConnections() {
    this.log('INFO', 'WEBSOCKET', 'Starting WebSocket connection monitoring');
    
    setInterval(() => {
      this.log('INFO', 'WEBSOCKET', 'Connection status', {
        activeConnections: this.metrics.webSocketConnections,
        totalMessages: this.metrics.messagesProcessed
      });
    }, 10000);
  }

  // Database Monitoring
  monitorDatabasePerformance() {
    this.log('INFO', 'DATABASE', 'Starting database performance monitoring');
    
    setInterval(() => {
      this.log('INFO', 'DATABASE', 'Query performance', {
        totalQueries: this.metrics.databaseQueries,
        averageQueryTime: this.calculateAverageQueryTime()
      });
    }, 20000);
  }

  calculateAverageQueryTime() {
    // This would need to be implemented based on actual query timing
    return 'N/A';
  }

  // Authentication Monitoring
  monitorAuthentication() {
    this.log('INFO', 'AUTHENTICATION', 'Starting authentication monitoring');
    
    setInterval(() => {
      this.log('INFO', 'AUTHENTICATION', 'Auth metrics', {
        totalAttempts: this.metrics.authenticationAttempts,
        successRate: this.calculateAuthSuccessRate()
      });
    }, 15000);
  }

  calculateAuthSuccessRate() {
    // This would need to be implemented based on actual auth tracking
    return 'N/A';
  }

  // Security Monitoring
  monitorSecurity() {
    this.log('INFO', 'SECURITY', 'Starting security monitoring');
    
    setInterval(() => {
      this.log('INFO', 'SECURITY', 'Security status', {
        totalSecurityEvents: this.securityLog.length,
        recentThreats: this.getRecentSecurityThreats()
      });
    }, 60000);
  }

  getRecentSecurityThreats() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.securityLog.filter(entry => new Date(entry.timestamp).getTime() > oneHourAgo);
  }

  // Business Logic Monitoring
  monitorBusinessLogic() {
    this.log('INFO', 'BUSINESS', 'Starting business logic monitoring');
    
    setInterval(() => {
      this.log('INFO', 'BUSINESS', 'Business metrics', {
        totalMessages: this.metrics.messagesProcessed,
        activeUsers: this.getActiveUsers(),
        conversationCount: this.getConversationCount()
      });
    }, 25000);
  }

  getActiveUsers() {
    // This would need to be implemented based on actual user tracking
    return 0;
  }

  getConversationCount() {
    // This would need to be implemented based on actual conversation tracking
    return 0;
  }

  // Error Tracking
  trackError(error, context = {}) {
    this.metrics.errors++;
    
    this.log('ERROR', 'ERROR_TRACKING', 'Error occurred', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    
    // Alert on critical errors
    if (error.message.includes('database') || error.message.includes('connection')) {
      this.log('ERROR', 'CRITICAL', 'Critical infrastructure error', {
        error: error.message,
        context
      });
    }
  }

  // Performance Tracking
  trackPerformance(operation, startTime, endTime, details = {}) {
    const duration = endTime - startTime;
    this.metrics.databaseQueries++;
    
    this.log('INFO', 'PERFORMANCE', `Operation completed: ${operation}`, {
      duration: `${duration}ms`,
      details,
      timestamp: new Date().toISOString()
    });
    
    // Alert on slow operations
    if (duration > 1000) {
      this.log('WARN', 'PERFORMANCE', `Slow operation detected: ${operation}`, {
        duration: `${duration}ms`,
        threshold: '1000ms'
      });
    }
  }

  // Security Event Tracking
  trackSecurityEvent(eventType, details = {}) {
    this.log('INFO', 'SECURITY', `Security event: ${eventType}`, {
      eventType,
      details,
      timestamp: new Date().toISOString()
    });
    
    // Alert on security threats
    if (eventType.includes('attack') || eventType.includes('injection')) {
      this.log('ERROR', 'SECURITY', `Security threat detected: ${eventType}`, details);
    }
  }

  // Business Event Tracking
  trackBusinessEvent(eventType, details = {}) {
    this.log('INFO', 'BUSINESS', `Business event: ${eventType}`, {
      eventType,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Real-time Metrics Updates
  updateMetric(metric, value = 1) {
    if (this.metrics.hasOwnProperty(metric)) {
      this.metrics[metric] += value;
    }
  }

  // Generate Monitoring Report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      metrics: this.metrics,
      errorSummary: this.getErrorSummary(),
      performanceSummary: this.getPerformanceSummary(),
      securitySummary: this.getSecuritySummary(),
      businessSummary: this.getBusinessSummary()
    };

    this.log('INFO', 'REPORTING', 'Generating monitoring report', report);
    
    // Save report to file
    const reportPath = path.join(this.logDir, `monitoring-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  getErrorSummary() {
    const errorTypes = {};
    this.errorLog.forEach(entry => {
      const type = entry.details.error || entry.message;
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    return {
      totalErrors: this.errorLog.length,
      errorTypes,
      recentErrors: this.errorLog.slice(-10)
    };
  }

  getPerformanceSummary() {
    const avgQueryTime = this.calculateAverageQueryTime();
    const errorRate = this.metrics.errors / Math.max(this.metrics.requests, 1);
    
    return {
      averageQueryTime: avgQueryTime,
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
      totalRequests: this.metrics.requests,
      memoryUsage: process.memoryUsage()
    };
  }

  getSecuritySummary() {
    const threatTypes = {};
    this.securityLog.forEach(entry => {
      const type = entry.details.eventType || entry.message;
      threatTypes[type] = (threatTypes[type] || 0) + 1;
    });

    return {
      totalSecurityEvents: this.securityLog.length,
      threatTypes,
      recentThreats: this.securityLog.slice(-5)
    };
  }

  getBusinessSummary() {
    return {
      totalMessages: this.metrics.messagesProcessed,
      activeUsers: this.getActiveUsers(),
      conversationCount: this.getConversationCount(),
      businessEvents: this.businessLog.length
    };
  }

  // Start Monitoring
  startMonitoring() {
    if (this.isMonitoring) {
      this.log('WARN', 'MONITORING', 'Monitoring already started');
      return;
    }

    this.isMonitoring = true;
    this.log('INFO', 'MONITORING', 'Starting comprehensive monitoring system');
    
    this.monitorServerHealth();
    this.monitorWebSocketConnections();
    this.monitorDatabasePerformance();
    this.monitorAuthentication();
    this.monitorSecurity();
    this.monitorBusinessLogic();
    
    // Generate reports every 5 minutes
    setInterval(() => {
      this.generateReport();
    }, 5 * 60 * 1000);
    
    // Graceful shutdown handler
    process.on('SIGTERM', () => {
      this.log('INFO', 'MONITORING', 'Received SIGTERM, generating final report');
      this.generateReport();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      this.log('INFO', 'MONITORING', 'Received SIGINT, generating final report');
      this.generateReport();
      process.exit(0);
    });
  }

  // Stop Monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    this.log('INFO', 'MONITORING', 'Stopping monitoring system');
    this.generateReport();
  }

  // Health Check Endpoint Simulation
  simulateHealthCheck() {
    return {
      status: 'healthy',
      uptime: Date.now() - this.startTime,
      metrics: this.metrics,
      errorCount: this.errorLog.length,
      lastError: this.errorLog.length > 0 ? this.errorLog[this.errorLog.length - 1] : null
    };
  }

  // Diagnostic Tools
  runDiagnostics() {
    this.log('INFO', 'DIAGNOSTICS', 'Running system diagnostics');
    
    const diagnostics = {
      systemHealth: this.simulateHealthCheck(),
      logFiles: this.getLogFiles(),
      memorySnapshot: process.memoryUsage(),
      cpuSnapshot: process.cpuUsage(),
      openHandles: process._getActiveHandles ? process._getActiveHandles().length : 'N/A'
    };

    this.log('INFO', 'DIAGNOSTICS', 'Diagnostics complete', diagnostics);
    return diagnostics;
  }

  getLogFiles() {
    try {
      return fs.readdirSync(this.logDir);
    } catch (error) {
      this.log('ERROR', 'DIAGNOSTICS', 'Failed to read log files', { error: error.message });
      return [];
    }
  }
}

// Export for use in other modules
export default E7kiMonitoringSystem;

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new E7kiMonitoringSystem();
  monitor.startMonitoring();
  
  console.log('🚀 E7ki Monitoring System Started');
  console.log('📊 Monitoring endpoints:');
  console.log('   - /api/monitoring/health (health check)');
  console.log('   - /api/monitoring/metrics (metrics)');
  console.log('   - /api/monitoring/report (generate report)');
  console.log('   - /api/monitoring/diagnostics (diagnostics)');
  
  // Keep the process running
  setInterval(() => {
    // Heartbeat
  }, 60000);
}