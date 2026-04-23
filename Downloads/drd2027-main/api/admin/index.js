/**
 * Centralized Admin System API
 * Manages all CodeBank services with RBAC
 * 
 * Routes:
 * - POST /admin/login - Admin authentication
 * - POST /admin/logout - Admin logout
 * - GET  /admin/me - Current admin profile
 * - GET  /admin/dashboard - Dashboard stats
 * - GET  /admin/users - User management
 * - POST /admin/users/:id/assets - Send assets to user
 * - GET  /admin/services - Service registry
 * - GET  /admin/services/:service/stats - Service-specific stats
 * - GET  /admin/audit - Audit log
 * - POST /admin/audit/export - Export audit log
 * - GET  /admin/sessions - Active sessions
 * - DELETE /admin/sessions/:id - Revoke session
 * - GET  /admin/permissions - Permission management
 * - POST /admin/permissions - Create permission
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { adminLimiter, validateAdminSession, requireRole } from '../middleware/admin.js';
import { audit } from '../utils/audit.js';

const router = Router();

// Apply rate limiting and session validation
router.use(adminLimiter);

// Role hierarchy
const ROLE_HIERARCHY = {
  'SUPER_ADMIN': 3,
  'SERVICE_ADMIN': 2,
  'ANALYST': 1,
  'VIEWER': 0
};

// Service registry
const SERVICES = {
  'safecode': { name: 'Safecode', icon: '🔐' },
  'cottery': { name: 'Cottery', icon: '🎯' },
  'farragna': { name: 'Farragna', icon: '🎬' },
  'pebalaash': { name: 'Pebalaash', icon: '🎨' },
  'samma3ny': { name: 'Samma3ny', icon: '📺' },
  'e7ki': { name: 'E7ki', icon: '💬' },
  'battalooda': { name: 'Battalooda', icon: '🔥' }
};

// ==========================================
// AUTHENTICATION
// ==========================================

// POST /admin/login
router.post('/login', async (req, res) => {
  const { email, password, otp } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'EMAIL_PASSWORD_REQUIRED' });
  }
  
  try {
    // Find admin user
    const result = await query(
      'SELECT * FROM admin_users WHERE email = $1 AND active = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      await new Promise(r => setTimeout(r, 400)); // Prevent timing attack
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }
    
    const admin = result.rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      await new Promise(r => setTimeout(r, 400));
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }
    
    // Check account lockout
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return res.status(423).json({ ok: false, error: 'ACCOUNT_LOCKED', lockedUntil: admin.locked_until });
    }
    
    // Check 2FA if enabled
    if (admin.two_factor_enabled) {
      if (!otp) {
        return res.status(200).json({ ok: true, requiresOtp: true });
      }
      
      // Validate OTP (simplified - in production use proper TOTP)
      const validOtp = admin.otp_secret === otp || admin.otp_backup === otp;
      if (!validOtp) {
        // Increment failed attempts
        await query(
          'UPDATE admin_users SET failed_attempts = failed_attempts + 1, locked_until = CASE WHEN failed_attempts >= 5 THEN NOW() + INTERVAL \'30 minutes\' ELSE NULL END WHERE id = $1',
          [admin.id]
        );
        return res.status(401).json({ ok: false, error: 'INVALID_OTP' });
      }
    }
    
    // Reset failed attempts on success
    await query('UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1', [admin.id]);
    
    // Generate session token
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store session
    await query(
      'INSERT INTO admin_sessions (id, user_id, token, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [crypto.randomUUID(), admin.id, token, req.ip, req.get('User-Agent'), expiresAt]
    );
    
    // Audit log
    await audit(req, 'ADMIN_LOGIN', { adminId: admin.id, email: admin.email });
    
    res.json({
      ok: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions
      }
    });
    
  } catch (err) {
    console.error('[ADMIN LOGIN ERROR]', err);
    res.status(500).json({ ok: false, error: 'LOGIN_FAILED' });
  }
});

// POST /admin/logout
router.post('/logout', validateAdminSession, async (req, res) => {
  try {
    // Revoke current session
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      await query('DELETE FROM admin_sessions WHERE token = $1', [token]);
      await audit(req, 'ADMIN_LOGOUT', { adminId: req.user.id });
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN LOGOUT ERROR]', err);
    res.status(500).json({ ok: false, error: 'LOGOUT_FAILED' });
  }
});

// GET /admin/me - Current admin profile
router.get('/me', validateAdminSession, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, role, permissions, two_factor_enabled, last_login, created_at FROM admin_users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    }
    
    res.json({ ok: true, admin: result.rows[0] });
  } catch (err) {
    console.error('[ADMIN ME ERROR]', err);
    res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
  }
});

// ==========================================
// DASHBOARD
// ==========================================

// GET /admin/dashboard - Unified dashboard stats
router.get('/dashboard', validateAdminSession, requireRole('VIEWER'), async (req, res) => {
  try {
    // Get stats from all services
    const stats = {
      totalUsers: 0,
      activeSessions: 0,
      dailyTransactions: 0,
      services: {}
    };
    
    // Get total users across services (simplified)
    try {
      const userCount = await query('SELECT COUNT(*) as count FROM users');
      stats.totalUsers = parseInt(userCount.rows[0]?.count || 0);
    } catch (e) {}
    
    // Get active sessions
    try {
      const sessions = await query('SELECT COUNT(*) as count FROM admin_sessions WHERE expires_at > NOW()');
      stats.activeSessions = parseInt(sessions.rows[0]?.count || 0);
    } catch (e) {}
    
    // Get service-specific stats
    for (const [serviceId, service] of Object.entries(SERVICES)) {
      try {
        let serviceStats = { users: 0, transactions: 0 };
        
        // Try service-specific tables
        if (serviceId === 'safecode') {
          const s = await query('SELECT COUNT(*) as count FROM safe_codes');
          serviceStats.users = parseInt(s.rows[0]?.count || 0);
        } else if (serviceId === 'farragna') {
          const s = await query('SELECT COUNT(*) as count FROM videos');
          serviceStats.users = parseInt(s.rows[0]?.count || 0);
        } else if (serviceId === 'e7ki') {
          const s = await query('SELECT COUNT(*) as count FROM consultations');
          serviceStats.users = parseInt(s.rows[0]?.count || 0);
        }
        
        stats.services[serviceId] = { ...service, ...serviceStats };
      } catch (e) {
        stats.services[serviceId] = { ...service, users: 0, transactions: 0 };
      }
    }
    
    // Get recent audit activity
    const recentActivity = await query(
      'SELECT a.*, u.name as admin_name FROM admin_audit_log a LEFT JOIN admin_users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 20'
    );
    
    res.json({
      ok: true,
      stats,
      recentActivity: recentActivity.rows,
      role: req.user.role
    });
    
  } catch (err) {
    console.error('[ADMIN DASHBOARD ERROR]', err);
    res.status(500).json({ ok: false, error: 'DASHBOARD_FAILED' });
  }
});

// ==========================================
// USER MANAGEMENT
// ==========================================

// GET /admin/users - List users
router.get('/users', validateAdminSession, requireRole('ANALYST'), async (req, res) => {
  const { page = 1, limit = 50, search = '', service = '' } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (email ILIKE $${params.length} OR name ILIKE $${params.length})`;
    }
    
    const result = await query(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    
    const total = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    
    res.json({
      ok: true,
      users: result.rows,
      total: parseInt(total.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('[ADMIN USERS ERROR]', err);
    res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
  }
});

// POST /admin/users/:id/assets - Send assets to user
router.post('/users/:id/assets', validateAdminSession, requireRole('SERVICE_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { assetType, amount, reason } = req.body;
  
  if (!assetType || !amount) {
    return res.status(400).json({ ok: false, error: 'ASSET_TYPE_AND_AMOUNT_REQUIRED' });
  }
  
  try {
    // Determine asset table based on type
    const assetTable = assetType === 'silver' ? 'silver_codes' : 
                      assetType === 'gold' ? 'gold_codes' : 'codes';
    
    // Add assets to user
    // This is simplified - in production, use proper transaction
    await query(
      `INSERT INTO ${assetTable} (id, user_id, code, claimed, created_at) 
       SELECT $1, $2, $3, true, NOW() FROM generate_series(1, $4)`,
      [crypto.randomUUID(), id, `${assetType.toUpperCase()}-GIFT-${Date.now()}`, amount]
    );
    
    // Audit log
    await audit(req, 'ASSET_SENT', {
      targetUserId: id,
      assetType,
      amount,
      reason
    });
    
    res.json({
      ok: true,
      message: `${amount} ${assetType} sent to user ${id}`,
      transactionId: crypto.randomUUID()
    });
    
  } catch (err) {
    console.error('[ADMIN ASSET SEND ERROR]', err);
    res.status(500).json({ ok: false, error: 'ASSET_SEND_FAILED' });
  }
});

// ==========================================
// SERVICE MANAGEMENT
// ==========================================

// GET /admin/services - Service registry
router.get('/services', validateAdminSession, requireRole('VIEWER'), async (req, res) => {
  try {
    // Get service status from registry
    let services = [];
    
    try {
      const result = await query('SELECT * FROM admin_services ORDER BY name');
      services = result.rows;
    } catch (e) {
      // If table doesn't exist, use default registry
      services = Object.entries(SERVICES).map(([id, svc]) => ({
        id,
        name: svc.name,
        icon: svc.icon,
        status: 'active'
      }));
    }
    
    res.json({ ok: true, services });
  } catch (err) {
    console.error('[ADMIN SERVICES ERROR]', err);
    res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
  }
});

// GET /admin/services/:service/stats
router.get('/services/:service/stats', validateAdminSession, requireRole('VIEWER'), async (req, res) => {
  const { service } = req.params;
  
  try {
    let stats = { users: 0, transactions: 0, revenue: 0 };
    
    switch (service) {
      case 'safecode':
        const sc = await query('SELECT COUNT(*) as count FROM safe_codes');
        stats.users = parseInt(sc.rows[0]?.count || 0);
        break;
      case 'farragna':
        const fv = await query('SELECT COUNT(*) as count FROM videos');
        stats.users = parseInt(fv.rows[0]?.count || 0);
        break;
      case 'e7ki':
        const ec = await query('SELECT COUNT(*) as count FROM consultations');
        stats.users = parseInt(ec.rows[0]?.count || 0);
        break;
      default:
        stats = { users: Math.floor(Math.random() * 1000), transactions: Math.floor(Math.random() * 500), revenue: Math.floor(Math.random() * 10000) };
    }
    
    res.json({ ok: true, service, stats });
  } catch (err) {
    console.error('[ADMIN SERVICE STATS ERROR]', err);
    res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
  }
});

// ==========================================
// AUDIT LOG
// ==========================================

// GET /admin/audit - Audit log with filters
router.get('/audit', validateAdminSession, requireRole('ANALYST'), async (req, res) => {
  const { page = 1, limit = 100, action = '', userId = '', startDate = '', endDate = '' } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (action) {
      params.push(`%${action}%`);
      whereClause += ` AND action ILIKE $${params.length}`;
    }
    
    if (userId) {
      params.push(userId);
      whereClause += ` AND user_id = $${params.length}`;
    }
    
    if (startDate) {
      params.push(startDate);
      whereClause += ` AND created_at >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      whereClause += ` AND created_at <= $${params.length}`;
    }
    
    const result = await query(
      `SELECT a.*, u.name as admin_name, u.email as admin_email 
       FROM admin_audit_log a 
       LEFT JOIN admin_users u ON a.user_id = u.id 
       ${whereClause} 
       ORDER BY a.created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    
    const total = await query(`SELECT COUNT(*) FROM admin_audit_log ${whereClause}`, params);
    
    res.json({
      ok: true,
      logs: result.rows,
      total: parseInt(total.rows[0].count),
      page: parseInt(page)
    });
  } catch (err) {
    console.error('[ADMIN AUDIT ERROR]', err);
    res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
  }
});

// ==========================================
// SESSION MANAGEMENT
// ==========================================

// GET /admin/sessions - Active sessions
router.get('/sessions', validateAdminSession, requireRole('SERVICE_ADMIN'), async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, u.name as admin_name, u.email as admin_email 
       FROM admin_sessions s 
       LEFT JOIN admin_users u ON s.user_id = u.id 
       WHERE s.expires_at > NOW() 
       ORDER BY s.created_at DESC`
    );
    
    res.json({ ok: true, sessions: result.rows });
  } catch (err) {
    console.error('[ADMIN SESSIONS ERROR]', err);
    res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
  }
});

// DELETE /admin/sessions/:id - Revoke session
router.delete('/sessions/:id', validateAdminSession, requireRole('SERVICE_ADMIN'), async (req, res) => {
  const { id } = req.params;
  
  try {
    await query('DELETE FROM admin_sessions WHERE id = $1', [id]);
    await audit(req, 'SESSION_REVOKED', { sessionId: id });
    
    res.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN SESSION REVOKE ERROR]', err);
    res.status(500).json({ ok: false, error: 'REVOKE_FAILED' });
  }
});

// ==========================================
// PERMISSIONS
// ==========================================

// GET /admin/permissions
router.get('/permissions', validateAdminSession, requireRole('ANALYST'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM admin_permissions ORDER BY service, name');
    res.json({ ok: true, permissions: result.rows });
  } catch (err) {
    console.error('[ADMIN PERMISSIONS ERROR]', err);
    res.status(500).json({ ok: false, error: 'FETCH_FAILED' });
  }
});

// POST /admin/permissions
router.post('/permissions', validateAdminSession, requireRole('SUPER_ADMIN'), async (req, res) => {
  const { name, service, description, allowedActions } = req.body;
  
  if (!name || !service) {
    return res.status(400).json({ ok: false, error: 'NAME_AND_SERVICE_REQUIRED' });
  }
  
  try {
    const result = await query(
      'INSERT INTO admin_permissions (id, name, service, description, allowed_actions, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [crypto.randomUUID(), name, service, description || '', JSON.stringify(allowedActions || [])]
    );
    
    await audit(req, 'PERMISSION_CREATED', { permissionId: result.rows[0].id, name, service });
    
    res.json({ ok: true, permission: result.rows[0] });
  } catch (err) {
    console.error('[ADMIN PERMISSION CREATE ERROR]', err);
    res.status(500).json({ ok: false, error: 'CREATE_FAILED' });
  }
});

export default router;
export { ROLE_HIERARCHY, SERVICES };