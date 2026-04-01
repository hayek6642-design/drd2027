// Security Manager - Rate limiting, audit trails, and security enhancements
export class SecurityManager {
    constructor(options = {}) {
        this.enableRateLimiting = options.enableRateLimiting !== false;
        this.enableAuditTrail = options.enableAuditTrail !== false;
        this.maxAuditEntries = options.maxAuditEntries || 10000;

        // Rate limiting configuration
        this.rateLimits = {
            transaction: {
                windowMs: 60000, // 1 minute
                maxRequests: 10, // 10 transactions per minute
                blockDuration: 300000 // 5 minutes block
            },
            balanceCheck: {
                windowMs: 30000, // 30 seconds
                maxRequests: 30, // 30 balance checks per 30 seconds
                blockDuration: 60000 // 1 minute block
            },
            authCheck: {
                windowMs: 60000, // 1 minute
                maxRequests: 20, // 20 auth checks per minute
                blockDuration: 300000 // 5 minutes block
            }
        };

        // Request tracking
        this.requestTracker = new Map();

        // Blocked IPs/Users
        this.blocked = new Map();

        // Audit trail
        this.auditTrail = [];

        // Security events
        this.securityEvents = [];

        // Initialize cleanup intervals
        this._startCleanupTasks();
    }

    // Rate limiting check
    checkRateLimit(identifier, operation = 'transaction') {
        if (!this.enableRateLimiting) return { allowed: true };

        const limit = this.rateLimits[operation];
        if (!limit) {
            return { allowed: true };
        }

        const now = Date.now();
        const key = `${identifier}_${operation}`;
        const tracker = this.requestTracker.get(key) || [];

        // Remove old requests outside the window
        const validRequests = tracker.filter(time => now - time < limit.windowMs);

        // Check if limit exceeded
        if (validRequests.length >= limit.maxRequests) {
            // Add to blocked list
            this._blockIdentifier(identifier, operation, limit.blockDuration);

            // Record security event
            this._recordSecurityEvent('rate_limit_exceeded', {
                identifier,
                operation,
                requestCount: validRequests.length,
                limit: limit.maxRequests
            });

            return {
                allowed: false,
                reason: 'Rate limit exceeded',
                retryAfter: Math.ceil((validRequests[0] + limit.windowMs - now) / 1000)
            };
        }

        // Record this request
        validRequests.push(now);
        this.requestTracker.set(key, validRequests);

        return {
            allowed: true,
            remaining: limit.maxRequests - validRequests.length,
            resetTime: validRequests[0] + limit.windowMs
        };
    }

    // Check if identifier is blocked
    isBlocked(identifier, operation = null) {
        const blockKey = operation ? `${identifier}_${operation}` : identifier;
        const blockInfo = this.blocked.get(blockKey);

        if (!blockInfo) return false;

        if (Date.now() > blockInfo.until) {
            // Block expired, remove it
            this.blocked.delete(blockKey);
            return false;
        }

        return true;
    }

    // Record audit trail entry
    recordAuditEntry(action, details = {}) {
        if (!this.enableAuditTrail) return;

        const entry = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            timestamp: Date.now(),
            action,
            details: {
                ...details,
                userAgent: navigator.userAgent,
                url: window.location.href,
                ip: this._getClientIP()
            },
            userId: details.userId || this._getCurrentUserId(),
            sessionId: this._getSessionId()
        };

        this.auditTrail.unshift(entry);

        // Keep only recent entries
        if (this.auditTrail.length > this.maxAuditEntries) {
            this.auditTrail = this.auditTrail.slice(0, this.maxAuditEntries);
        }

        // Persist to storage
        this._persistAuditTrail();

        console.log(`📋 Audit: ${action}`, details);
    }

    // Record security event
    recordSecurityEvent(type, details = {}) {
        const event = {
            id: `security_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            timestamp: Date.now(),
            type,
            details,
            severity: this._classifySecurityEvent(type),
            resolved: false
        };

        this.securityEvents.unshift(event);

        // Keep only recent events
        if (this.securityEvents.length > 1000) {
            this.securityEvents = this.securityEvents.slice(0, 1000);
        }

        // Persist to storage
        this._persistSecurityEvents();

        console.warn(`🔒 Security Event: ${type}`, details);
    }

    // Validate transaction security
    validateTransactionSecurity(transaction, user) {
        const issues = [];

        // Check amount limits
        if (transaction.amount <= 0) {
            issues.push('Invalid amount: must be positive');
        }

        if (transaction.amount > 1000000) { // 1M limit
            issues.push('Amount exceeds maximum limit');
        }

        // Check email format
        if (transaction.toEmail && !this._isValidEmail(transaction.toEmail)) {
            issues.push('Invalid recipient email format');
        }

        // Check for suspicious patterns
        if (this._detectSuspiciousActivity(transaction, user)) {
            issues.push('Suspicious activity detected');
            this.recordSecurityEvent('suspicious_activity', {
                transaction,
                user,
                reason: 'Automated detection'
            });
        }

        // Rate limiting check
        const rateLimitResult = this.checkRateLimit(user.id, 'transaction');
        if (!rateLimitResult.allowed) {
            issues.push(`Rate limit exceeded: ${rateLimitResult.reason}`);
        }

        return {
            valid: issues.length === 0,
            issues,
            rateLimit: rateLimitResult
        };
    }

    // Get audit trail
    getAuditTrail(filters = {}) {
        let entries = [...this.auditTrail];

        if (filters.userId) {
            entries = entries.filter(entry => entry.userId === filters.userId);
        }

        if (filters.action) {
            entries = entries.filter(entry => entry.action === filters.action);
        }

        if (filters.fromDate) {
            entries = entries.filter(entry => entry.timestamp >= filters.fromDate);
        }

        if (filters.toDate) {
            entries = entries.filter(entry => entry.timestamp <= filters.toDate);
        }

        if (filters.limit) {
            entries = entries.slice(0, filters.limit);
        }

        return entries;
    }

    // Get security events
    getSecurityEvents(filters = {}) {
        let events = [...this.securityEvents];

        if (filters.type) {
            events = events.filter(event => event.type === filters.type);
        }

        if (filters.severity) {
            events = events.filter(event => event.severity === filters.severity);
        }

        if (filters.unresolvedOnly) {
            events = events.filter(event => !event.resolved);
        }

        if (filters.limit) {
            events = events.slice(0, filters.limit);
        }

        return events;
    }

    // Get rate limiting status
    getRateLimitStatus(identifier, operation = 'transaction') {
        const key = `${identifier}_${operation}`;
        const tracker = this.requestTracker.get(key) || [];
        const limit = this.rateLimits[operation];

        if (!limit) return null;

        const now = Date.now();
        const validRequests = tracker.filter(time => now - time < limit.windowMs);

        return {
            current: validRequests.length,
            limit: limit.maxRequests,
            remaining: Math.max(0, limit.maxRequests - validRequests.length),
            resetTime: validRequests.length > 0 ? validRequests[0] + limit.windowMs : now,
            blocked: this.isBlocked(identifier, operation)
        };
    }

    // Manual block/unblock
    blockIdentifier(identifier, operation = null, duration = 300000) {
        const blockKey = operation ? `${identifier}_${operation}` : identifier;
        this._blockIdentifier(identifier, operation, duration);
        this.recordSecurityEvent('manual_block', { identifier, operation, duration });
    }

    unblockIdentifier(identifier, operation = null) {
        const blockKey = operation ? `${identifier}_${operation}` : identifier;
        this.blocked.delete(blockKey);
        this.recordSecurityEvent('manual_unblock', { identifier, operation });
    }

    // Internal methods
    _blockIdentifier(identifier, operation, duration) {
        const blockKey = operation ? `${identifier}_${operation}` : identifier;
        this.blocked.set(blockKey, {
            identifier,
            operation,
            blockedAt: Date.now(),
            until: Date.now() + duration
        });
    }

    _recordSecurityEvent(type, details) {
        const event = {
            id: `security_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            timestamp: Date.now(),
            type,
            details,
            severity: this._classifySecurityEvent(type),
            resolved: false
        };

        this.securityEvents.unshift(event);

        if (this.securityEvents.length > 1000) {
            this.securityEvents = this.securityEvents.slice(0, 1000);
        }

        this._persistSecurityEvents();
    }

    _classifySecurityEvent(type) {
        const classifications = {
            'suspicious_activity': 'high',
            'rate_limit_exceeded': 'medium',
            'authentication_failure': 'high',
            'unauthorized_access': 'critical',
            'data_breach': 'critical',
            'manual_block': 'low',
            'manual_unblock': 'low'
        };

        return classifications[type] || 'medium';
    }

    _detectSuspiciousActivity(transaction, user) {
        // Simple heuristics for detecting suspicious activity
        const suspicious = [];

        // Large amount transfer
        if (transaction.amount > 100000) {
            suspicious.push('large_amount');
        }

        // Rapid successive transactions (would need more context)
        // Unusual timing (outside business hours)
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            suspicious.push('unusual_timing');
        }

        // New recipient pattern
        // This would require more sophisticated analysis

        return suspicious.length > 0;
    }

    _isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    _getClientIP() {
        // In a real implementation, this would get the actual client IP
        // For now, return a placeholder
        return 'client_ip_placeholder';
    }

    _getCurrentUserId() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            return userData.id || userData.uid || null;
        } catch (error) {
            return null;
        }
    }

    _getSessionId() {
        // Generate or retrieve session ID
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    _startCleanupTasks() {
        // Clean up old request tracking data every 5 minutes
        setInterval(() => {
            this._cleanupRequestTracker();
        }, 300000);

        // Clean up expired blocks every minute
        setInterval(() => {
            this._cleanupExpiredBlocks();
        }, 60000);
    }

    _cleanupRequestTracker() {
        const now = Date.now();
        const limit = this.rateLimits.transaction.windowMs;

        for (const [key, requests] of this.requestTracker.entries()) {
            const validRequests = requests.filter(time => now - time < limit);
            if (validRequests.length === 0) {
                this.requestTracker.delete(key);
            } else {
                this.requestTracker.set(key, validRequests);
            }
        }
    }

    _cleanupExpiredBlocks() {
        const now = Date.now();

        for (const [key, blockInfo] of this.blocked.entries()) {
            if (now > blockInfo.until) {
                this.blocked.delete(key);
            }
        }
    }

    _persistAuditTrail() {
        try {
            localStorage.setItem('transaction_audit_trail', JSON.stringify(this.auditTrail.slice(0, 1000)));
        } catch (error) {
            console.warn('Failed to persist audit trail:', error);
        }
    }

    _persistSecurityEvents() {
        try {
            localStorage.setItem('transaction_security_events', JSON.stringify(this.securityEvents.slice(0, 500)));
        } catch (error) {
            console.warn('Failed to persist security events:', error);
        }
    }

    // Get security statistics
    getSecurityStats() {
        const now = Date.now();
        const last24Hours = now - 24 * 60 * 60 * 1000;

        const recentSecurityEvents = this.securityEvents.filter(event => event.timestamp > last24Hours);
        const recentAuditEntries = this.auditTrail.filter(entry => entry.timestamp > last24Hours);

        const stats = {
            totalSecurityEvents: this.securityEvents.length,
            recentSecurityEvents: recentSecurityEvents.length,
            totalAuditEntries: this.auditTrail.length,
            recentAuditEntries: recentAuditEntries.length,
            blockedIdentifiers: this.blocked.size,
            activeRateLimits: this.requestTracker.size,
            eventsByType: {},
            eventsBySeverity: {}
        };

        // Count by type and severity
        recentSecurityEvents.forEach(event => {
            stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
            stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
        });

        return stats;
    }

    // Export security data
    exportSecurityData() {
        return {
            auditTrail: this.auditTrail,
            securityEvents: this.securityEvents,
            blockedIdentifiers: Array.from(this.blocked.entries()),
            rateLimitStatus: Array.from(this.requestTracker.entries()),
            exportedAt: Date.now()
        };
    }

    // Reset security data
    reset() {
        this.requestTracker.clear();
        this.blocked.clear();
        this.auditTrail = [];
        this.securityEvents = [];

        // Clear storage
        try {
            localStorage.removeItem('transaction_audit_trail');
            localStorage.removeItem('transaction_security_events');
        } catch (error) {
            console.warn('Failed to clear security storage:', error);
        }

        console.log('🔒 Security data reset');
    }
}

// Rate Limiter - Standalone rate limiting functionality
export class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60000;
        this.maxRequests = options.maxRequests || 100;
        this.message = options.message || 'Too many requests';
        this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
        this.skipFailedRequests = options.skipFailedRequests || false;

        this.requests = new Map();
    }

    // Check if request is allowed
    check(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Get or create request list for this key
        let requests = this.requests.get(key) || [];

        // Remove old requests
        requests = requests.filter(time => time > windowStart);

        // Check limit
        if (requests.length >= this.maxRequests) {
            return {
                success: false,
                limit: this.maxRequests,
                remaining: 0,
                resetTime: requests[0] + this.windowMs
            };
        }

        return {
            success: true,
            limit: this.maxRequests,
            remaining: this.maxRequests - requests.length,
            resetTime: requests[0] + this.windowMs
        };
    }

    // Record successful request
    success(key) {
        if (this.skipSuccessfulRequests) return;

        const now = Date.now();
        let requests = this.requests.get(key) || [];
        requests.push(now);

        this.requests.set(key, requests);
    }

    // Record failed request
    failure(key) {
        if (this.skipFailedRequests) return;

        const now = Date.now();
        let requests = this.requests.get(key) || [];
        requests.push(now);

        this.requests.set(key, requests);
    }

    // Get remaining requests
    getRemaining(key) {
        const result = this.check(key);
        return result.remaining;
    }

    // Reset for key
    reset(key) {
        this.requests.delete(key);
    }

    // Cleanup old entries
    cleanup() {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        for (const [key, requests] of this.requests.entries()) {
            const validRequests = requests.filter(time => time > windowStart);
            if (validRequests.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, validRequests);
            }
        }
    }
}

// Create global instances
export const securityManager = new SecurityManager();
export const rateLimiter = new RateLimiter();

// Auto-initialize cleanup
if (typeof window !== 'undefined') {
    // Cleanup every 5 minutes
    setInterval(() => {
        rateLimiter.cleanup();
    }, 300000);

    window.securityManager = securityManager;
    window.rateLimiter = rateLimiter;

    console.log('🔒 Security Manager initialized');
}

export default SecurityManager;