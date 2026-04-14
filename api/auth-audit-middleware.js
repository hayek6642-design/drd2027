/**
 * Auth Audit Middleware - Track all auth events
 * Logs authentication activities for security monitoring
 */

class AuditMiddleware {
  constructor() {
    this.logs = [];
    this.maxLogs = 10000;
  }

  log(event) {
    const auditEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId: event.userId || null,
      userEmail: event.userEmail || null,
      action: event.action,
      resource: event.resource || 'auth',
      resourceId: event.resourceId || null,
      changes: event.changes || {},
      ipAddress: event.ipAddress || '0.0.0.0',
      status: event.status || 'success',
      errorMessage: event.errorMessage || null,
      metadata: event.metadata || {}
    };

    this.logs.push(auditEntry);

    // Maintain max log size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    return auditEntry;
  }

  generateId() {
    return \`audit_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }

  logLoginAttempt(email, success, ipAddress, userAgent) {
    return this.log({
      action: 'login_attempt',
      userEmail: email,
      status: success ? 'success' : 'failure',
      ipAddress,
      metadata: { userAgent }
    });
  }

  logSessionCreation(userId, sessionType, ipAddress) {
    return this.log({
      action: 'session_created',
      userId,
      resource: 'session',
      metadata: { sessionType },
      ipAddress
    });
  }

  logSessionTermination(sessionId, userId, reason) {
    return this.log({
      action: 'session_terminated',
      userId,
      resource: 'session',
      resourceId: sessionId,
      metadata: { reason }
    });
  }

  logRoleChange(userId, oldRole, newRole, changedBy) {
    return this.log({
      action: 'role_changed',
      userId,
      resource: 'user_role',
      resourceId: userId,
      changes: { oldRole, newRole },
      metadata: { changedBy }
    });
  }

  getFailedAttempts(email, hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs.filter(
      log =>
        log.userEmail === email &&
        log.action === 'login_attempt' &&
        log.status === 'failure' &&
        new Date(log.timestamp) > cutoffTime
    );
  }

  getAllLogs() {
    return [...this.logs];
  }

  clearOldLogs(daysOld = 30) {
    const cutoffTime = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffTime);
    return {
      removed: initialCount - this.logs.length,
      remaining: this.logs.length
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuditMiddleware;
}
