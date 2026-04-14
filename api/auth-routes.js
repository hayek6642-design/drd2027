/**
 * Auth API Routes - Enhanced Authentication System
 * Endpoints for RBAC, audit logs, sessions, and 2FA
 */

const express = require('express');
const router = express.Router();
const AuthRBAC = require('./auth-rbac');
const AuditMiddleware = require('./auth-audit-middleware');
const SessionManager = require('./auth-session-manager');
const TwoFactorAuth = require('./auth-2fa-setup');

// Initialize managers
const rbac = new AuthRBAC();
const audit = new AuditMiddleware();
const sessions = new SessionManager();
const twoFA = new TwoFactorAuth();

// Middleware: Log all auth requests
router.use((req, res, next) => {
  audit.log({
    action: 'api_request',
    resource: 'auth_api',
    ipAddress: req.ip,
    metadata: { method: req.method, path: req.path },
    userEmail: req.user?.email || null
  });
  next();
});

// ============= RBAC Routes =============

// GET /api/auth/roles - Get all roles
router.get('/roles', (req, res) => {
  try {
    const roles = {};
    rbac.getAllRoles().forEach(role => {
      roles[role] = rbac.getRolePermissions(role);
    });
    res.json({ success: true, roles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/check-permission - Check if user has permission
router.post('/check-permission', (req, res) => {
  try {
    const { role, permission } = req.body;
    const result = rbac.checkAccess(role, permission);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/auth/assign-role - Assign role to user
router.post('/assign-role', (req, res) => {
  try {
    const { userId, newRole } = req.body;
    const result = rbac.assignRole(userId, newRole);
    
    audit.logRoleChange(userId, 'user', newRole, req.user?.id);
    
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============= Session Routes =============

// POST /api/auth/session/create - Create new session
router.post('/session/create', (req, res) => {
  try {
    const { userId, sessionType = 'guest', ipAddress, userAgent } = req.body;
    const session = sessions.createSession(userId, sessionType);
    
    session.ipAddress = ipAddress || req.ip;
    session.userAgent = userAgent || req.headers['user-agent'];
    
    audit.logSessionCreation(userId, sessionType, session.ipAddress);
    
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/session/:sessionId - Get session details
router.get('/session/:sessionId', (req, res) => {
  try {
    const session = sessions.getSession(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    if (!sessions.isSessionValid(req.params.sessionId)) {
      return res.status(401).json({ success: false, error: 'Session expired' });
    }
    
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/session/:sessionId/upgrade - Upgrade guest to user
router.put('/session/:sessionId/upgrade', (req, res) => {
  try {
    const { userId, userEmail } = req.body;
    const upgraded = sessions.upgradeToUser(req.params.sessionId, userId, userEmail);
    
    if (!upgraded) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    audit.log({
      action: 'session_upgraded',
      userId,
      userEmail,
      resource: 'session',
      resourceId: req.params.sessionId
    });
    
    res.json({ success: true, session: upgraded });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/auth/session/:sessionId - Terminate session
router.delete('/session/:sessionId', (req, res) => {
  try {
    const terminated = sessions.terminateSession(req.params.sessionId);
    
    if (!terminated) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    audit.logSessionTermination(req.params.sessionId, req.user?.id, 'user_request');
    
    res.json({ success: true, message: 'Session terminated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/sessions - Get all sessions (admin only)
router.get('/sessions', (req, res) => {
  try {
    const sessionsList = sessions.getAllSessions();
    const stats = sessions.getStatistics();
    
    res.json({ success: true, sessions: sessionsList, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/session/cleanup - Cleanup expired sessions
router.post('/session/cleanup', (req, res) => {
  try {
    const result = sessions.cleanupExpiredSessions();
    
    audit.log({
      action: 'session_cleanup',
      resource: 'sessions',
      metadata: result
    });
    
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============= Audit Log Routes =============

// GET /api/auth/audit/logs - Get audit logs (admin only)
router.get('/audit/logs', (req, res) => {
  try {
    const logs = audit.getAllLogs();
    res.json({ success: true, logs, count: logs.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/audit/clear-old - Clear old audit logs
router.post('/audit/clear-old', (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    const result = audit.clearOldLogs(daysOld);
    
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/audit/failed-attempts/:email - Get failed login attempts
router.get('/audit/failed-attempts/:email', (req, res) => {
  try {
    const attempts = audit.getFailedAttempts(req.params.email);
    res.json({ success: true, email: req.params.email, attempts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============= 2FA Routes =============

// POST /api/auth/2fa/generate - Generate 2FA secret
router.post('/2fa/generate', (req, res) => {
  try {
    const { userId } = req.body;
    const setup = twoFA.generateSecret(userId);
    
    res.json({ success: true, ...setup });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/2fa/enable - Enable 2FA for user
router.post('/2fa/enable', (req, res) => {
  try {
    const { userId, secret, backupCodes } = req.body;
    const result = twoFA.enableTwoFactor(userId, secret, backupCodes);
    
    audit.log({
      action: '2fa_enabled',
      userId,
      resource: 'user_2fa'
    });
    
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/2fa/disable - Disable 2FA for user
router.post('/2fa/disable', (req, res) => {
  try {
    const { userId } = req.body;
    const result = twoFA.disableTwoFactor(userId);
    
    audit.log({
      action: '2fa_disabled',
      userId,
      resource: 'user_2fa'
    });
    
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/2fa/verify-backup - Verify 2FA backup code
router.post('/2fa/verify-backup', (req, res) => {
  try {
    const { userId, code } = req.body;
    const valid = twoFA.verifyBackupCode(userId, code);
    
    audit.log({
      action: '2fa_backup_code_used',
      userId,
      resource: 'user_2fa',
      status: valid ? 'success' : 'failure'
    });
    
    res.json({ success: valid, valid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/2fa/status/:userId - Get 2FA status
router.get('/2fa/status/:userId', (req, res) => {
  try {
    const status = twoFA.getStatus(req.params.userId);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============= Health & Status =============

// GET /api/auth/health - Health check
router.get('/health', (req, res) => {
  try {
    const sessionStats = sessions.getStatistics();
    const auditCount = audit.getAllLogs().length;
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      systems: {
        sessions: 'operational',
        rbac: 'operational',
        audit: 'operational',
        twoFA: 'operational'
      },
      stats: {
        activeSessions: sessionStats.active,
        totalLogs: auditCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, status: 'error', error: err.message });
  }
});

module.exports = router;
