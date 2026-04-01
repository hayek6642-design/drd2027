/**
 * Centralized Logger Configuration
 * Supports: Console, File, Sentry logging
 * Used across all services
 */

const winston = require('winston');
const Sentry = require('@sentry/node');

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  ignoreErrors: [
    // Network errors
    'NetworkError',
    'TimeoutError',
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'chrome-extension://',
    'moz-extension://',
  ],
});

// Define log levels
const LOG_LEVELS = {
  FATAL: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5,
};

// Custom format for structured logging
const customFormat = winston.format.printf(({ level, message, timestamp, service, userId, requestId, ...meta }) => {
  return JSON.stringify({
    timestamp,
    level: level.toUpperCase(),
    service: service || 'web-v1',
    message,
    userId,
    requestId,
    metadata: Object.keys(meta).length > 0 ? meta : undefined,
  });
});

// Create logger instance
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    customFormat
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'web-v1',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // File transports
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
    }),
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
    }),
  ],
});

/**
 * Log helper functions
 */
const log = {
  // Fatal error - application may not recover
  fatal: (message, meta = {}) => {
    logger.log('fatal', message, meta);
    Sentry.captureException(new Error(message), { level: 'fatal' });
  },

  // Error - something went wrong
  error: (message, error = null, meta = {}) => {
    logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
    Sentry.captureException(error || new Error(message));
  },

  // Warning - something unexpected happened
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },

  // Info - general information
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },

  // Debug - detailed information for debugging
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },

  // Trace - very detailed information
  trace: (message, meta = {}) => {
    logger.log('trace', message, meta);
  },

  // API request logging
  request: (method, path, statusCode, duration, meta = {}) => {
    logger.info(`${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      duration,
      ...meta,
    });
  },

  // Performance metrics
  performance: (operation, duration, meta = {}) => {
    logger.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...meta,
    });
  },

  // Database operations
  database: (operation, query, duration, meta = {}) => {
    logger.debug(`Database: ${operation}`, {
      operation,
      query: query.substring(0, 100), // First 100 chars
      duration: `${duration}ms`,
      ...meta,
    });
  },

  // Authentication events
  auth: (event, userId, meta = {}) => {
    logger.info(`Auth: ${event}`, {
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  },

  // Transaction logging
  transaction: (action, userId, amount, status, meta = {}) => {
    logger.info(`Transaction: ${action}`, {
      action,
      userId,
      amount,
      status,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  },

  // Security events
  security: (event, severity, details = {}) => {
    logger.warn(`Security: ${event}`, {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    });
    Sentry.captureMessage(`Security Event: ${event}`, 'warning');
  },
};

/**
 * Express middleware for request logging
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info(`Incoming ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    requestId: req.id,
  });

  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function() {
    const duration = Date.now() - startTime;
    logger.info(`Response ${res.statusCode} ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      requestId: req.id,
    });

    originalEnd.apply(res, arguments);
  };

  next();
};

/**
 * Express error handling middleware
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled error', err, {
    method: req.method,
    path: req.path,
    statusCode: err.statusCode || 500,
    userId: req.user?.id,
    requestId: req.id,
  });

  Sentry.captureException(err, {
    req,
    tags: {
      route: req.path,
      method: req.method,
    },
  });

  // Don't send sensitive data in response
  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message,
    requestId: req.id,
  });
};

module.exports = {
  logger,
  log,
  requestLogger,
  errorLogger,
  Sentry,
};
