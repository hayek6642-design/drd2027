// Health Check System - Comprehensive system diagnostics and monitoring
export class HealthCheckSystem {
    constructor(options = {}) {
        this.checkInterval = options.checkInterval || 30000; // 30 seconds
        this.enableEndpoints = options.enableEndpoints !== false;
        this.historySize = options.historySize || 100;

        // Health check results
        this.healthHistory = [];
        this.lastCheckTime = null;

        // System components to check
        this.checks = {
            database: this._checkDatabase.bind(this),
            cache: this._checkCache.bind(this),
            queue: this._checkQueue.bind(this),
            errorHandler: this._checkErrorHandler.bind(this),
            monitor: this._checkMonitor.bind(this),
            memory: this._checkMemory.bind(this),
            network: this._checkNetwork.bind(this),
            authentication: this._checkAuthentication.bind(this)
        };

        // Health check interval
        this.intervalId = null;

        // Initialize
        this.start();
    }

    // Start health checking
    start() {
        if (this.intervalId) return;

        console.log('🏥 Health Check System started');

        this.intervalId = setInterval(() => {
            this.performFullCheck();
        }, this.checkInterval);

        // Perform initial check
        this.performFullCheck();
    }

    // Stop health checking
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('🛑 Health Check System stopped');
    }

    // Perform comprehensive health check
    async performFullCheck() {
        const checkId = `check_${Date.now()}`;
        const startTime = Date.now();

        console.log('🔍 Performing comprehensive health check...');

        const results = {
            id: checkId,
            timestamp: startTime,
            duration: 0,
            status: 'healthy',
            checks: {},
            summary: {
                total: 0,
                healthy: 0,
                warning: 0,
                unhealthy: 0
            }
        };

        // Perform all checks
        for (const [name, checkFn] of Object.entries(this.checks)) {
            try {
                const checkResult = await checkFn();
                results.checks[name] = checkResult;

                results.summary.total++;
                results.summary[checkResult.status]++;

                // Overall status is the worst status
                if (this._getStatusPriority(checkResult.status) > this._getStatusPriority(results.status)) {
                    results.status = checkResult.status;
                }

            } catch (error) {
                console.error(`Health check failed for ${name}:`, error);
                results.checks[name] = {
                    status: 'unhealthy',
                    message: `Check failed: ${error.message}`,
                    timestamp: Date.now()
                };
                results.summary.total++;
                results.summary.unhealthy++;
                results.status = 'unhealthy';
            }
        }

        results.duration = Date.now() - startTime;

        // Store in history
        this.healthHistory.unshift(results);
        if (this.healthHistory.length > this.historySize) {
            this.healthHistory = this.healthHistory.slice(0, this.historySize);
        }

        this.lastCheckTime = Date.now();

        // Log results
        console.log(`💊 Health Check ${checkId} completed in ${results.duration}ms: ${results.status}`, results.summary);

        // Emit events if available
        this._emitHealthEvent(results);

        return results;
    }

    // Get current health status
    getCurrentHealth() {
        return this.healthHistory[0] || null;
    }

    // Get health history
    getHealthHistory(limit = 10) {
        return this.healthHistory.slice(0, limit);
    }

    // Get health summary
    getHealthSummary() {
        if (this.healthHistory.length === 0) {
            return null;
        }

        const recent = this.healthHistory.slice(0, 10);
        const summary = {
            current: this.healthHistory[0],
            trends: {
                healthy: recent.filter(h => h.status === 'healthy').length,
                warning: recent.filter(h => h.status === 'warning').length,
                unhealthy: recent.filter(h => h.status === 'unhealthy').length
            },
            averageDuration: recent.reduce((sum, h) => sum + h.duration, 0) / recent.length
        };

        return summary;
    }

    // Individual health checks
    async _checkDatabase() {
        try {
            const firebase = window.__SUPABASE_CLIENT__ || (window.Auth && window.Auth.client);
            if (!firebase) {
                return {
                    status: 'unhealthy',
                    message: 'Supabase client not available',
                    timestamp: Date.now()
                };
            }

            // Test database connection
            const startTime = Date.now();
            const { error } = await firebase.from('balances').select('count').limit(1);
            const responseTime = Date.now() - startTime;

            if (error) {
                return {
                    status: 'unhealthy',
                    message: `Database query failed: ${error.message}`,
                    responseTime,
                    timestamp: Date.now()
                };
            }

            return {
                status: responseTime > 2000 ? 'warning' : 'healthy',
                message: `Database responding (${responseTime}ms)`,
                responseTime,
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Database check error: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    async _checkCache() {
        try {
            if (!window.transactionCache) {
                return {
                    status: 'warning',
                    message: 'Cache system not initialized',
                    timestamp: Date.now()
                };
            }

            const stats = window.transactionCache.getStats();
            const hitRate = stats.hitRate;

            let status = 'healthy';
            if (hitRate < 50) status = 'warning';
            if (hitRate < 20) status = 'unhealthy';

            return {
                status,
                message: `Cache hit rate: ${hitRate.toFixed(1)}%`,
                stats,
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Cache check error: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    async _checkQueue() {
        try {
            if (!window.transactionQueue) {
                return {
                    status: 'warning',
                    message: 'Queue system not initialized',
                    timestamp: Date.now()
                };
            }

            const status = window.transactionQueue.getStatus();
            const queueSize = status.queueSize;
            const processingCount = status.processingCount;

            let queueStatus = 'healthy';
            if (queueSize > 100) queueStatus = 'warning';
            if (queueSize > 500) queueStatus = 'unhealthy';

            return {
                status: queueStatus,
                message: `Queue: ${queueSize} queued, ${processingCount} processing`,
                details: status,
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Queue check error: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    async _checkErrorHandler() {
        try {
            if (!window.errorHandler) {
                return {
                    status: 'warning',
                    message: 'Error handler not initialized',
                    timestamp: Date.now()
                };
            }

            const metrics = window.errorHandler.getMetrics();
            const circuitBreakerTrips = metrics.circuitBreakerTrips;

            let status = 'healthy';
            if (circuitBreakerTrips > 10) status = 'warning';
            if (circuitBreakerTrips > 50) status = 'unhealthy';

            return {
                status,
                message: `Circuit breaker trips: ${circuitBreakerTrips}`,
                metrics,
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Error handler check error: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    async _checkMonitor() {
        try {
            if (!window.transactionMonitor) {
                return {
                    status: 'warning',
                    message: 'Monitor system not initialized',
                    timestamp: Date.now()
                };
            }

            const metrics = window.transactionMonitor.getMetrics();
            const errorRate = metrics.transactions.total > 0 ?
                (metrics.transactions.failed / metrics.transactions.total) * 100 : 0;

            let status = 'healthy';
            if (errorRate > 10) status = 'warning';
            if (errorRate > 25) status = 'unhealthy';

            return {
                status,
                message: `Error rate: ${errorRate.toFixed(1)}%`,
                metrics,
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Monitor check error: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    async _checkMemory() {
        try {
            if (!performance.memory) {
                return {
                    status: 'healthy',
                    message: 'Memory monitoring not available',
                    timestamp: Date.now()
                };
            }

            const memory = performance.memory;
            const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
            const usagePercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

            let status = 'healthy';
            if (usagePercent > 80) status = 'warning';
            if (usagePercent > 95) status = 'unhealthy';

            return {
                status,
                message: `Memory: ${usedMB}MB / ${totalMB}MB (${usagePercent.toFixed(1)}%)`,
                details: {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    usagePercent
                },
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Memory check error: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    async _checkNetwork() {
        try {
            if (!navigator.onLine) {
                return {
                    status: 'unhealthy',
                    message: 'No network connection',
                    timestamp: Date.now()
                };
            }

            // Test network connectivity
            const startTime = Date.now();
            const response = await fetch(window.location.origin + '/favicon.ico', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                return {
                    status: 'warning',
                    message: `Network test failed: ${response.status}`,
                    responseTime,
                    timestamp: Date.now()
                };
            }

            return {
                status: responseTime > 1000 ? 'warning' : 'healthy',
                message: `Network responding (${responseTime}ms)`,
                responseTime,
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Network check error: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    async _checkAuthentication() {
        try {
            if (!window.authHelper) {
                return {
                    status: 'warning',
                    message: 'Auth helper not initialized',
                    timestamp: Date.now()
                };
            }

            // Check if user is authenticated
            const authResult = await window.authHelper.checkTransferAuth();
            const isAuthenticated = authResult.success && authResult.user;

            return {
                status: isAuthenticated ? 'healthy' : 'warning',
                message: isAuthenticated ? 'User authenticated' : 'User not authenticated',
                user: authResult.user ? { id: authResult.user.id, email: authResult.user.email } : null,
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Authentication check error: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    // Utility methods
    _getStatusPriority(status) {
        const priorities = { healthy: 0, warning: 1, unhealthy: 2 };
        return priorities[status] || 0;
    }

    _emitHealthEvent(results) {
        // Emit custom event for other systems to listen to
        try {
            const event = new CustomEvent('transactionSystemHealthCheck', {
                detail: results
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.warn('Failed to emit health check event:', error);
        }
    }

    // Generate health report
    generateReport() {
        const current = this.getCurrentHealth();
        const summary = this.getHealthSummary();

        return {
            timestamp: Date.now(),
            current: current,
            summary: summary,
            history: this.getHealthHistory(20),
            uptime: performance.now(),
            environment: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: Date.now()
            }
        };
    }

    // Export health data
    exportData() {
        return {
            healthHistory: this.healthHistory,
            exportedAt: Date.now(),
            summary: this.getHealthSummary()
        };
    }
}

// Health Check API - REST-like endpoints for external monitoring
export class HealthCheckAPI {
    constructor(healthSystem) {
        this.healthSystem = healthSystem;
        this.endpoints = {
            '/health': this.getHealth.bind(this),
            '/health/detailed': this.getDetailedHealth.bind(this),
            '/health/history': this.getHealthHistory.bind(this),
            '/health/metrics': this.getMetrics.bind(this),
            '/health/report': this.getReport.bind(this)
        };

        // Install API if enabled
        if (this.healthSystem.enableEndpoints) {
            this.install();
        }
    }

    // Install API endpoints
    install() {
        // Add to global object for external access
        window.transactionSystemHealth = {
            getHealth: () => this.getHealth(),
            getDetailedHealth: () => this.getDetailedHealth(),
            getHealthHistory: (limit) => this.getHealthHistory(limit),
            getMetrics: () => this.getMetrics(),
            getReport: () => this.getReport()
        };

        console.log('🔗 Health Check API endpoints installed');
    }

    // API endpoint handlers
    getHealth() {
        const current = this.healthSystem.getCurrentHealth();
        if (!current) {
            return {
                status: 'unknown',
                message: 'No health data available',
                timestamp: Date.now()
            };
        }

        return {
            status: current.status,
            timestamp: current.timestamp,
            duration: current.duration,
            summary: current.summary
        };
    }

    getDetailedHealth() {
        return this.healthSystem.getCurrentHealth();
    }

    getHealthHistory(limit = 10) {
        return this.healthSystem.getHealthHistory(limit);
    }

    getMetrics() {
        const metrics = {
            timestamp: Date.now(),
            uptime: performance.now()
        };

        // Collect metrics from all systems
        try {
            if (window.transactionMonitor) {
                metrics.transactionMonitor = window.transactionMonitor.getMetrics();
            }
            if (window.errorHandler) {
                metrics.errorHandler = window.errorHandler.getMetrics();
            }
            if (window.transactionCache) {
                metrics.cache = window.transactionCache.getStats();
            }
            if (window.transactionQueue) {
                metrics.queue = window.transactionQueue.getStatus();
            }
        } catch (error) {
            console.warn('Failed to collect metrics:', error);
        }

        return metrics;
    }

    getReport() {
        return this.healthSystem.generateReport();
    }

    // Handle API requests (for future HTTP endpoint support)
    handleRequest(endpoint, options = {}) {
        const handler = this.endpoints[endpoint];
        if (!handler) {
            throw new Error(`Unknown endpoint: ${endpoint}`);
        }

        return handler(options);
    }
}

// Create global instances
export const healthCheckSystem = new HealthCheckSystem();
export const healthCheckAPI = new HealthCheckAPI(healthCheckSystem);

// Auto-initialize
if (typeof window !== 'undefined') {
    window.healthCheckSystem = healthCheckSystem;
    window.healthCheckAPI = healthCheckAPI;

    // Make globally available for debugging
    window.getTransactionSystemHealth = () => healthCheckAPI.getHealth();
    window.getTransactionSystemMetrics = () => healthCheckAPI.getMetrics();
    window.getTransactionSystemReport = () => healthCheckAPI.getReport();

    console.log('🏥 Health Check System initialized');
}

export default HealthCheckSystem;