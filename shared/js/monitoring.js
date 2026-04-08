/**
 * Monitoring & Performance Tracking System
 * Tracks metrics, health checks, and system performance
 */

const { log } = require('../logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageTime: 0,
      },
      database: {
        queries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
      },
      errors: {
        total: 0,
        byType: {},
      },
      services: {
        codebank: { status: 'unknown', responseTime: 0 },
        'yt-coder': { status: 'unknown', responseTime: 0 },
      },
      memory: {
        usage: 0,
        limit: 0,
      },
      uptime: 0,
    };

    this.requestTimes = [];
    this.queryTimes = [];
    this.startTime = Date.now();
  }

  /**
   * Track API request
   */
  trackRequest(duration, statusCode) {
    this.metrics.requests.total++;
    this.requestTimes.push(duration);

    if (statusCode >= 200 && statusCode < 300) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    this.updateAverageRequestTime();
  }

  /**
   * Track database query
   */
  trackQuery(duration, isSlowQuery = false) {
    this.metrics.database.queries++;
    this.queryTimes.push(duration);

    if (isSlowQuery) {
      this.metrics.database.slowQueries++;
    }

    this.updateAveragQueryTime();
  }

  /**
   * Track error
   */
  trackError(errorType) {
    this.metrics.errors.total++;
    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0;
    }
    this.metrics.errors.byType[errorType]++;
  }

  /**
   * Update average request time
   */
  updateAverageRequestTime() {
    if (this.requestTimes.length > 100) {
      this.requestTimes.shift(); // Keep only last 100
    }
    this.metrics.requests.averageTime =
      this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
  }

  /**
   * Update average query time
   */
  updateAveragQueryTime() {
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift();
    }
    this.metrics.database.averageQueryTime =
      this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
  }

  /**
   * Check service health
   */
  async checkServiceHealth(serviceName, checkFn) {
    const startTime = Date.now();
    try {
      await checkFn();
      const duration = Date.now() - startTime;
      this.metrics.services[serviceName] = {
        status: 'healthy',
        responseTime: duration,
      };
    } catch (error) {
      this.metrics.services[serviceName] = {
        status: 'unhealthy',
        error: error.message,
      };
      this.trackError('ServiceHealthCheckFailed');
    }
  }

  /**
   * Update memory metrics
   */
  updateMemoryMetrics() {
    const usage = process.memoryUsage();
    this.metrics.memory = {
      usage: Math.round(usage.heapUsed / 1024 / 1024), // MB
      limit: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
    };
  }

  /**
   * Get metrics snapshot
   */
  getMetrics() {
    this.updateMemoryMetrics();
    this.metrics.uptime = Math.round((Date.now() - this.startTime) / 1000); // seconds

    return this.metrics;
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics.requests = {
      total: 0,
      successful: 0,
      failed: 0,
      averageTime: 0,
    };
    this.metrics.errors = {
      total: 0,
      byType: {},
    };
    this.requestTimes = [];
  }
}

/**
 * Health Check System
 */
class HealthChecker {
  constructor() {
    this.checks = {};
  }

  /**
   * Register health check
   */
  register(name, checkFn) {
    this.checks[name] = checkFn;
  }

  /**
   * Run all health checks
   */
  async runAll() {
    const results = {};
    for (const [name, checkFn] of Object.entries(this.checks)) {
      try {
        results[name] = {
          status: 'pass',
          timestamp: new Date().toISOString(),
        };
        await checkFn();
      } catch (error) {
        results[name] = {
          status: 'fail',
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        log.warn(`Health check failed: ${name}`, { error: error.message });
      }
    }
    return results;
  }

  /**
   * Get overall health status
   */
  async getStatus() {
    const checks = await this.runAll();
    const allPass = Object.values(checks).every((check) => check.status === 'pass');

    return {
      status: allPass ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Prometheus-compatible metrics exporter
 */
class MetricsExporter {
  constructor(monitor, healthChecker) {
    this.monitor = monitor;
    this.healthChecker = healthChecker;
  }

  /**
   * Generate Prometheus metrics
   */
  async generatePrometheusMetrics() {
    const metrics = this.monitor.getMetrics();
    const health = await this.healthChecker.getStatus();

    let output = '# HELP web_v1_metrics Application metrics\n';
    output += '# TYPE web_v1_metrics gauge\n\n';

    // Request metrics
    output += `web_v1_requests_total{status="all"} ${metrics.requests.total}\n`;
    output += `web_v1_requests_total{status="successful"} ${metrics.requests.successful}\n`;
    output += `web_v1_requests_total{status="failed"} ${metrics.requests.failed}\n`;
    output += `web_v1_requests_average_time_ms ${metrics.requests.averageTime.toFixed(2)}\n`;

    // Database metrics
    output += `web_v1_database_queries_total ${metrics.database.queries}\n`;
    output += `web_v1_database_average_query_time_ms ${metrics.database.averageQueryTime.toFixed(2)}\n`;
    output += `web_v1_database_slow_queries_total ${metrics.database.slowQueries}\n`;

    // Error metrics
    output += `web_v1_errors_total ${metrics.errors.total}\n`;
    for (const [type, count] of Object.entries(metrics.errors.byType)) {
      output += `web_v1_errors{type="${type}"} ${count}\n`;
    }

    // Memory metrics
    output += `web_v1_memory_usage_mb ${metrics.memory.usage}\n`;
    output += `web_v1_memory_limit_mb ${metrics.memory.limit}\n`;

    // Uptime
    output += `web_v1_uptime_seconds ${metrics.uptime}\n`;

    // Health status
    for (const [name, result] of Object.entries(health.checks)) {
      const statusValue = result.status === 'pass' ? 1 : 0;
      output += `web_v1_health_check{check="${name}"} ${statusValue}\n`;
    }

    return output;
  }
}

/**
 * Express middleware for performance tracking
 */
const performanceMiddleware = (monitor) => {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      monitor.trackRequest(duration, res.statusCode);

      if (duration > 1000) {
        log.warn('Slow request detected', {
          path: req.path,
          method: req.method,
          duration: `${duration}ms`,
        });
      }
    });

    next();
  };
};

const performanceMonitor = globalThis.performanceMonitor || new PerformanceMonitor();
globalThis.performanceMonitor = performanceMonitor;
const healthChecker = globalThis.healthChecker || new HealthChecker();
globalThis.healthChecker = healthChecker;
const metricsExporter = new MetricsExporter(performanceMonitor, healthChecker);

module.exports = {
  performanceMonitor,
  healthChecker,
  metricsExporter,
  performanceMiddleware,
  PerformanceMonitor,
  HealthChecker,
  MetricsExporter,
};
