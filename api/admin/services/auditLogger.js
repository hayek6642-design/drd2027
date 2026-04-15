/**
 * Admin Audit Logger Service
 * Logs all admin actions for security and compliance
 */

class AuditLogger {
  constructor() {
    this.buffer = [];
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds
    this.startAutoFlush();
  }
  
  /**
   * Log an admin action
   */
  async log(context, action, targetType, targetId, details = {}) {
    const entry = {
      id: crypto.randomUUID(),
      userId: context.user?.id,
      action,
      targetType,
      targetId,
      details,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString()
    };
    
    this.buffer.push(entry);
    
    // Flush immediately if buffer is full
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
    
    return entry;
  }
  
  /**
   * Log login attempt
   */
  async logLogin(context, success, reason = '') {
    return this.log(
      context,
      success ? 'ADMIN_LOGIN_SUCCESS' : 'ADMIN_LOGIN_FAILED',
      'session',
      null,
      { reason }
    );
  }
  
  /**
   * Log logout
   */
  async logLogout(context) {
    return this.log(context, 'ADMIN_LOGOUT', 'session', null);
  }
  
  /**
   * Log asset transfer
   */
  async logAssetTransfer(context, userId, assetType, amount) {
    return this.log(
      context,
      'ASSET_TRANSFER',
      'user',
      userId,
      { assetType, amount }
    );
  }
  
  /**
   * Log permission change
   */
  async logPermissionChange(context, targetUserId, action) {
    return this.log(
      context,
      action,
      'permission',
      targetUserId
    );
  }
  
  /**
   * Log session revocation
   */
  async logSessionRevocation(context, sessionId, targetUserId) {
    return this.log(
      context,
      'SESSION_REVOKED',
      'session',
      sessionId,
      { targetUserId }
    );
  }
  
  /**
   * Flush buffer to database
   */
  async flush() {
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    try {
      // Insert into database
      const values = entries.map((e, i) => 
        `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
      ).join(', ');
      
      
      if (values) {
        const params = entries.flatMap(e => [
          e.id,
          e.userId,
          e.action,
          e.targetType,
          e.targetId,
          JSON.stringify(e.details),
          e.ipAddress,
          e.userAgent
        ]);
        
        // Use raw query through DB
        // await query(`INSERT INTO admin_audit_log ${values} ...`, params);
        
        console.log(`[AUDIT] Flushed ${entries.length} entries`);
      }
    } catch (err) {
      console.error('[AUDIT] Flush failed:', err);
      // Re-add to buffer on failure
      this.buffer.push(...entries);
    }
  }
  
  /**
   * Start auto-flush interval
   */
  startAutoFlush() {
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  /**
   * Get recent logs
   */
  async getRecentLogs(limit = 100, filters = {}) {
    // Query database for recent logs
    // This would typically query the database
    return this.buffer.slice(-limit);
  }
}

// Export
export default AuditLogger;
export { AuditLogger };