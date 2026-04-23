/**
 * SECURITY AUTHORITY LAYER - CodeMind v2.0
 * ============================================
 * Strict owner-only access control (dia201244@gmail.com)
 * All dangerous operations require verification
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SecurityAuthority {
  constructor(options = {}) {
    this.OWNER_EMAIL = 'dia201244@gmail.com';
    this.OWNER_SECRET = process.env.OWNER_SECRET || 'drd-master-key-2024';
    
    this.forbiddenPaths = [
      'auth-core.js',
      'session-store.js',
      'database.sqlite',
      '.env',
      'server.js',
      'bankode-core.js',
      '/ledger',
      '/private-key',
      '/password',
      '/secret',
      'admin',
      'root'
    ];

    this.dangerousActions = [
      'readFile',
      'writeFile',
      'deleteFile',
      'applyChanges',
      'executeCommand',
      'gitCommit',
      'deployToProduction',
      'accessDatabase'
    ];

    this.actionLog = [];
    this.suspiciousActivityCount = {};
    this.alertThreshold = 5;
    this.timeWindow = 60000; // 1 minute
  }

  // ==================== IDENTITY VERIFICATION ====================

  /**
   * Check if user is the owner
   */
  isOwner(user) {
    if (!user || !user.email) return false;
    return user.email === this.OWNER_EMAIL;
  }

  /**
   * Verify owner token is valid
   */
  verifyOwnerToken(token, user) {
    if (!this.isOwner(user)) return false;
    
    const expected = crypto
      .createHash('sha256')
      .update(`${this.OWNER_EMAIL}:${this.OWNER_SECRET}:${user.sessionId}`)
      .digest('hex');
    
    return token === expected;
  }

  /**
   * Generate a secure owner token
   */
  generateOwnerToken(user) {
    if (!this.isOwner(user)) return null;
    
    return crypto
      .createHash('sha256')
      .update(`${this.OWNER_EMAIL}:${this.OWNER_SECRET}:${user.sessionId}`)
      .digest('hex');
  }

  // ==================== FILE ACCESS CONTROL ====================

  /**
   * Check if a file can be accessed
   */
  canAccessFile(filePath, user) {
    // Owner has full access
    if (this.isOwner(user)) {
      return true;
    }

    // Check forbidden paths for non-owners
    if (this.isForbiddenPath(filePath)) {
      this.logSecurityEvent('FILE_ACCESS_BLOCKED', {
        filePath,
        user: user?.email || 'anonymous',
        ip: user?.ip || 'unknown'
      });
      return false;
    }

    // Public files
    const publicPatterns = [
      'README.md',
      'DOCUMENTATION',
      'public/',
      'assets/',
      'api/public',
      'examples/'
    ];

    if (publicPatterns.some(pattern => filePath.includes(pattern))) {
      return true;
    }

    // Default: deny access
    this.logSecurityEvent('FILE_ACCESS_DENIED', {
      filePath,
      user: user?.email || 'anonymous',
      ip: user?.ip || 'unknown'
    });

    return false;
  }

  /**
   * Check if file path is in forbidden list
   */
  isForbiddenPath(filePath) {
    const normalized = filePath.toLowerCase();
    return this.forbiddenPaths.some(forbiddenPath =>
      normalized.includes(forbiddenPath.toLowerCase())
    );
  }

  // ==================== ACTION CONTROL ====================

  /**
   * Check if user can execute an action
   */
  canExecuteAction(actionType, user) {
    // Owner can do everything
    if (this.isOwner(user)) {
      return true;
    }

    // Non-owners cannot execute dangerous actions
    if (this.dangerousActions.includes(actionType)) {
      this.logSecurityEvent('DANGEROUS_ACTION_BLOCKED', {
        action: actionType,
        user: user?.email || 'anonymous',
        ip: user?.ip || 'unknown'
      });
      return false;
    }

    return false;
  }

  /**
   * Require MFA for critical actions
   */
  requiresMFA(actionType) {
    const criticalActions = [
      'deleteFile',
      'deployToProduction',
      'accessDatabase',
      'modifySecurityPolicy',
      'gitCommit',
      'executeCommand'
    ];

    return criticalActions.includes(actionType);
  }

  // ==================== SECURE RESPONSES ====================

  /**
   * Generate safe denial message
   */
  getDenialMessage(user, requestedAction) {
    if (!user?.email) {
      return `🔒 Please sign in to access ${requestedAction}. (Sign in as: ${this.OWNER_EMAIL})`;
    }

    return `⚠️ **Access Denied**\n\nHi ${user.email} 👋\n\nThis feature is reserved for the project owner only.\n\nI can provide general information about the Dr.D platform without accessing internal systems. Would you like an overview instead?`;
  }

  /**
   * Generate public mode response
   */
  getPublicModeResponse(query) {
    return `
🔐 **Public Mode Active** (Limited Access)

I'm CodeMind, the technical brain of Dr.D, but you're currently in **Public Mode** which means I can't access internal systems.

**What I CAN do:**
✅ Explain Dr.D's platform architecture
✅ Help with general technical questions
✅ Provide user-facing documentation
✅ Discuss the gamified reward ecosystem

**What I CAN'T do:**
❌ Read source code or internal files
❌ Execute fixes or changes
❌ Access user data or databases
❌ Deploy updates

**About Dr.D:**
Dr.D is a gamified reward ecosystem where users:
- 📺 Watch YouTube videos → earn codes
- 🛍️ Spend codes in integrated services
- 💰 Participate in peer-to-peer marketplace (Pebalaash)
- 🎮 Play games and contests
- 💬 Connect with creators (Farragna)
- 🏦 Store assets safely (SafeCode)

Would you like me to explain any specific feature?
`;
  }

  /**
   * Generate restricted response for sensitive query
   */
  getRestrictedResponse(query, reason) {
    return `
⛔ **Query Restricted**

This query touches on sensitive areas I can't discuss without proper authorization:
- **Reason:** ${reason}
- **Required:** Owner verification (${this.OWNER_EMAIL})

If you're the owner, please authenticate to unlock full access.
`;
  }

  // ==================== LOGGING & MONITORING ====================

  /**
   * Log security event
   */
  logSecurityEvent(event, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      details: {
        ...details,
        ip: details.ip || 'unknown'
      }
    };

    this.actionLog.push(entry);

    // Check for suspicious activity
    if (this.isSuspicious(entry)) {
      this.alertOwner(entry);
    }

    // Keep log size manageable
    if (this.actionLog.length > 10000) {
      this.actionLog = this.actionLog.slice(-5000);
    }

    console.log(`[SECURITY] ${event}:`, details);
  }

  /**
   * Detect suspicious activity patterns
   */
  isSuspicious(entry) {
    const key = `${entry.details.user}:${entry.details.ip}`;

    if (!this.suspiciousActivityCount[key]) {
      this.suspiciousActivityCount[key] = [];
    }

    // Add current activity
    this.suspiciousActivityCount[key].push({
      timestamp: new Date(entry.timestamp).getTime(),
      event: entry.event
    });

    // Clean old entries (outside time window)
    const cutoff = Date.now() - this.timeWindow;
    this.suspiciousActivityCount[key] = this.suspiciousActivityCount[key].filter(
      a => a.timestamp > cutoff
    );

    // Check if threshold exceeded
    if (this.suspiciousActivityCount[key].length > this.alertThreshold) {
      return true;
    }

    // Multiple failed attempts = suspicious
    const failedAttempts = this.suspiciousActivityCount[key].filter(
      a => a.event.includes('DENIED') || a.event.includes('BLOCKED')
    );

    return failedAttempts.length > 3;
  }

  /**
   * Alert owner of security issues
   */
  alertOwner(entry) {
    console.error(`
╔════════════════════════════════════════╗
║ 🚨 SECURITY ALERT - CodeMind v2.0     ║
╚════════════════════════════════════════╝

EVENT: ${entry.event}
USER: ${entry.details.user}
IP: ${entry.details.ip}
TIME: ${entry.timestamp}

${entry.details.reason ? 'REASON: ' + entry.details.reason : ''}

This activity will be logged for audit purposes.
    `);
  }

  /**
   * Get security audit log
   */
  getAuditLog(user, limit = 100) {
    if (!this.isOwner(user)) {
      return {
        status: 'denied',
        message: 'Audit log access restricted to owner'
      };
    }

    return {
      status: 'success',
      entries: this.actionLog.slice(-limit),
      total: this.actionLog.length
    };
  }

  /**
   * Clear suspicious activity tracking for a user
   */
  clearSuspiciousMarking(user) {
    if (!this.isOwner(user)) {
      return false;
    }

    this.suspiciousActivityCount = {};
    this.logSecurityEvent('SUSPICIOUS_TRACKING_CLEARED', { user: user.email });
    return true;
  }

  /**
   * Get security status report
   */
  getSecurityStatus(user) {
    if (!this.isOwner(user)) {
      return { status: 'unauthorized' };
    }

    const recentEvents = this.actionLog.slice(-50);
    const incidents = recentEvents.filter(
      e => e.event.includes('BLOCKED') || e.event.includes('DENIED')
    );

    return {
      status: 'secure',
      ownerVerified: true,
      recentIncidents: incidents.length,
      totalLogsStored: this.actionLog.length,
      suspiciousUsers: Object.keys(this.suspiciousActivityCount),
      lastSecurityEvent: this.actionLog[this.actionLog.length - 1] || null
    };
  }
}

module.exports = { SecurityAuthority };
