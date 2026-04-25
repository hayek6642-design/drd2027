// Transaction Monitoring System - Comprehensive logging, metrics, and health checks
export class TransactionMonitor {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.metricsInterval = options.metricsInterval || 30000; // 30 seconds
        this.retentionPeriod = options.retentionPeriod || 24 * 60 * 60 * 1000; // 24 hours
        this.maxLogEntries = options.maxLogEntries || 1000;

        // Metrics storage
        this.metrics = {
            transactions: {
                total: 0,
                successful: 0,
                failed: 0,
                pending: 0,
                averageProcessingTime: 0,
                lastTransactionTime: null
            },
            performance: {
                averageResponseTime: 0,
                p95ResponseTime: 0,
                p99ResponseTime: 0,
                throughput: 0
            },
            errors: {
                total: 0,
                byType: {},
                byOperation: {}
            },
            system: {
                memoryUsage: 0,
                activeConnections: 0,
                queueSize: 0,
                lastHealthCheck: null
            }
        };

        // Transaction log storage
        this.transactionLogs = [];
        this.performanceLogs = [];
        this.errorLogs = [];

        // Monitoring intervals
        this.intervals = {
            metrics: null,
            health: null,
            cleanup: null
        };

        // Initialize if enabled
        if (this.enabled) {
            this.start();
        }
    }

    // Start monitoring
    start() {
        if (!this.enabled) return;
        console.log('🚀 Transaction Monitor started');
    }

    // Stop monitoring
    stop() {
        Object.values(this.intervals).forEach(interval => {
            if (interval) ;
        });
        console.log('🛑 Transaction Monitor stopped');
    }

    // Record transaction start
    recordTransactionStart(transactionId, operation, metadata = {}) {
        const record = {
            id: transactionId,
            operation,
            startTime: Date.now(),
            status: 'pending',
            metadata,
            steps: []
        };

        this.transactionLogs.unshift(record);
        this._trimLogs();

        return transactionId;
    }

    // Record transaction step
    recordTransactionStep(transactionId, step, data = {}) {
        const record = this.transactionLogs.find(log => log.id === transactionId);
        if (record) {
            record.steps.push({
                step,
                timestamp: Date.now(),
                data
            });
        }
    }

    // Record transaction completion
    recordTransactionComplete(transactionId, success, error = null, result = null) {
        const record = this.transactionLogs.find(log => log.id === transactionId);
        if (!record) return;

        record.endTime = Date.now();
        record.duration = record.endTime - record.startTime;
        record.status = success ? 'completed' : 'failed';
        record.error = error;
        record.result = result;

        // Update metrics
        this.metrics.transactions.total++;
        if (success) {
            this.metrics.transactions.successful++;
        } else {
            this.metrics.transactions.failed++;
            this._recordError(error, 'transaction', transactionId);
        }

        this.metrics.transactions.lastTransactionTime = Date.now();

        // Update performance metrics
        this._updatePerformanceMetrics(record.duration);

        console.log(`📊 Transaction ${transactionId} ${success ? 'completed' : 'failed'} in ${record.duration}ms`);
    }

    // Record performance metric
    recordPerformanceMetric(operation, duration, metadata = {}) {
        const record = {
            operation,
            duration,
            timestamp: Date.now(),
            metadata
        };

        this.performanceLogs.unshift(record);
        this._trimLogs();

        // Update rolling averages
        this._updatePerformanceMetrics(duration);
    }

    // Record error
    recordError(error, operation, context = {}) {
        this._recordError(error, operation, context);
    }

    // Internal error recording
    _recordError(error, operation, context) {
        const errorRecord = {
            message: error.message || error.toString(),
            stack: error.stack,
            operation,
            context,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errorLogs.unshift(errorRecord);
        this._trimLogs();

        // Update error metrics
        this.metrics.errors.total++;
        this.metrics.errors.byType[errorRecord.message] = (this.metrics.errors.byType[errorRecord.message] || 0) + 1;
        this.metrics.errors.byOperation[operation] = (this.metrics.errors.byOperation[operation] || 0) + 1;

        this._persistErrorLogs();
    }

    // Update performance metrics
    _updatePerformanceMetrics(duration) {
        const recentLogs = this.performanceLogs.slice(0, 100);
        if (recentLogs.length === 0) return;

        const durations = recentLogs.map(log => log.duration);
        durations.push(duration);

        this.metrics.performance.averageResponseTime =
            durations.reduce((sum, d) => sum + d, 0) / durations.length;

        durations.sort((a, b) => a - b);
        const p95Index = Math.floor(durations.length * 0.95);
        const p99Index = Math.floor(durations.length * 0.99);

        this.metrics.performance.p95ResponseTime = durations[p95Index] || 0;
        this.metrics.performance.p99ResponseTime = durations[p99Index] || 0;
        this.metrics.performance.throughput = (recentLogs.length / this.metricsInterval) * 1000;
    }

    // Collect system metrics
    _collectMetrics() {
        try {
            // Memory usage (if available)
            if (performance.memory) {
                this.metrics.system.memoryUsage = performance.memory.usedJSHeapSize;
            }

            // Active connections (approximate)
            this.metrics.system.activeConnections = this._estimateActiveConnections();

            // Queue size
            this.metrics.system.queueSize = this.transactionLogs.filter(log => log.status === 'pending').length;

            this._persistMetrics();

        } catch (error) {
            console.warn('Failed to collect system metrics:', error);
        }
    }

    // Perform health check
    _performHealthCheck() {
        const health = {
            timestamp: Date.now(),
            status: 'healthy',
            checks: {}
        };

        // Check transaction system health
        health.checks.transactions = this._checkTransactionHealth();
        health.checks.performance = this._checkPerformanceHealth();
        health.checks.errors = this._checkErrorHealth();
        health.checks.system = this._checkSystemHealth();

        // Overall status
        if (Object.values(health.checks).some(check => check.status === 'unhealthy')) {
            health.status = 'unhealthy';
        } else if (Object.values(health.checks).some(check => check.status === 'warning')) {
            health.status = 'warning';
        }

        this.metrics.system.lastHealthCheck = health;

        // Log health status
        console.log(`💊 Health Check: ${health.status}`, health.checks);

        this._persistHealthCheck(health);
        
        return health;
    }

    // Individual health checks
    _checkTransactionHealth() {
        const recentFailures = this.metrics.transactions.failed;
        const totalTransactions = this.metrics.transactions.total;
        const failureRate = totalTransactions > 0 ? recentFailures / totalTransactions : 0;

        if (failureRate > 0.1) return { status: 'unhealthy', message: 'High failure rate' };
        if (failureRate > 0.05) return { status: 'warning', message: 'Elevated failure rate' };
        return { status: 'healthy', message: 'Normal failure rate' };
    }

    _checkPerformanceHealth() {
        const avgTime = this.metrics.performance.averageResponseTime;
        if (avgTime > 5000) return { status: 'unhealthy', message: 'Slow response times' };
        if (avgTime > 2000) return { status: 'warning', message: 'Elevated response times' };
        return { status: 'healthy', message: 'Good performance' };
    }

    _checkErrorHealth() {
        const recentErrors = this.metrics.errors.total;
        if (recentErrors > 50) return { status: 'unhealthy', message: 'High error count' };
        if (recentErrors > 20) return { status: 'warning', message: 'Elevated error count' };
        return { status: 'healthy', message: 'Low error count' };
    }

    _checkSystemHealth() {
        const memoryUsage = this.metrics.system.memoryUsage;
        const memoryLimit = 50 * 1024 * 1024; // 50MB

        if (memoryUsage > memoryLimit) return { status: 'warning', message: 'High memory usage' };
        return { status: 'healthy', message: 'Normal memory usage' };
    }

    // Estimate active connections
    _estimateActiveConnections() {
        // This is a rough estimate based on active transactions
        return this.transactionLogs.filter(log =>
            log.status === 'pending' &&
            Date.now() - log.startTime < 300000 // Last 5 minutes
        ).length;
    }

    // Cleanup old logs
    _cleanupOldLogs() { }

    // Trim logs to maximum size
    _trimLogs() {
        if (this.transactionLogs.length > this.maxLogEntries) {
            this.transactionLogs = this.transactionLogs.slice(0, this.maxLogEntries);
        }
        if (this.performanceLogs.length > this.maxLogEntries) {
            this.performanceLogs = this.performanceLogs.slice(0, this.maxLogEntries);
        }
        if (this.errorLogs.length > this.maxLogEntries) {
            this.errorLogs = this.errorLogs.slice(0, this.maxLogEntries);
        }
    }

    // Persist data to localStorage
    _persistMetrics() { }

    _persistErrorLogs() { }

    _persistHealthCheck(health) { }

    // Get current metrics
    getMetrics() {
        return { ...this.metrics };
    }

    // Get recent transaction logs
    getTransactionLogs(limit = 50) {
        return this.transactionLogs.slice(0, limit);
    }

    // Get recent error logs
    getErrorLogs(limit = 50) {
        return this.errorLogs.slice(0, limit);
    }

    // Get health history
    getHealthHistory(limit = 20) { return []; }

    // Generate monitoring report
    generateReport() {
        return {
            timestamp: Date.now(),
            metrics: this.getMetrics(),
            recentTransactions: this.getTransactionLogs(10),
            recentErrors: this.getErrorLogs(10),
            healthHistory: this.getHealthHistory(10),
            systemInfo: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: Date.now(),
                memoryUsage: this.metrics.system.memoryUsage,
                uptime: performance.now()
            }
        };
    }

    // Export data for analysis
    exportData() {
        return {
            metrics: this.metrics,
            transactionLogs: this.transactionLogs,
            performanceLogs: this.performanceLogs,
            errorLogs: this.errorLogs,
            exportedAt: Date.now()
        };
    }
}

// Transaction Analytics
export class TransactionAnalytics {
    constructor(monitor) {
        this.monitor = monitor;
        this.analytics = {
            hourly: {},
            daily: {},
            patterns: {},
            trends: {}
        };
    }

    // Analyze transaction patterns
    analyzePatterns() {
        const transactions = this.monitor.getTransactionLogs(500);
        const patterns = {};

        // Analyze by hour
        transactions.forEach(tx => {
            const hour = new Date(tx.startTime).getHours();
            if (!patterns[hour]) patterns[hour] = { count: 0, failures: 0 };

            patterns[hour].count++;
            if (tx.status === 'failed') {
                patterns[hour].failures++;
            }
        });

        // Analyze by operation type
        const operationPatterns = {};
        transactions.forEach(tx => {
            if (!operationPatterns[tx.operation]) {
                operationPatterns[tx.operation] = { count: 0, avgDuration: 0, failures: 0 };
            }

            operationPatterns[tx.operation].count++;
            if (tx.duration) {
                operationPatterns[tx.operation].avgDuration =
                    (operationPatterns[tx.operation].avgDuration + tx.duration) / 2;
            }
            if (tx.status === 'failed') {
                operationPatterns[tx.operation].failures++;
            }
        });

        return {
            hourly: patterns,
            operations: operationPatterns,
            totalAnalyzed: transactions.length
        };
    }

    // Generate insights
    generateInsights() {
        const metrics = this.monitor.getMetrics();
        const patterns = this.analyzePatterns();
        const insights = [];

        // Performance insights
        if (metrics.performance.averageResponseTime > 2000) {
            insights.push({
                type: 'warning',
                category: 'performance',
                message: `Average response time is ${Math.round(metrics.performance.averageResponseTime)}ms, which is above the recommended threshold of 2000ms`
            });
        }

        // Error rate insights
        const errorRate = metrics.transactions.total > 0 ?
            metrics.transactions.failed / metrics.transactions.total : 0;

        if (errorRate > 0.05) {
            insights.push({
                type: 'critical',
                category: 'reliability',
                message: `Transaction failure rate is ${(errorRate * 100).toFixed(1)}%, which exceeds the recommended threshold of 5%`
            });
        }

        // Pattern insights
        const peakHour = Object.entries(patterns.hourly)
            .sort(([,a], [,b]) => b.count - a.count)[0];

        if (peakHour) {
            insights.push({
                type: 'info',
                category: 'patterns',
                message: `Peak transaction hour is ${peakHour[0]}:00 with ${peakHour[1].count} transactions`
            });
        }

        return insights;
    }
}

// Create global instances
export const transactionMonitor = new TransactionMonitor();
export const transactionAnalytics = new TransactionAnalytics(transactionMonitor);

// Auto-initialize if not in test environment
if (typeof window !== 'undefined' && !window.location.href.includes('test')) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            transactionMonitor.start();
        });
    } else {
        transactionMonitor.start();
    }
}

export default TransactionMonitor;
