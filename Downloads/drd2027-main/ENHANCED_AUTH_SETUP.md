# Enhanced Auth System Integration Guide

## Overview
The E7ki Authentication System now includes:
- ✅ Role-Based Access Control (RBAC)
- ✅ Session Management with expiry
- ✅ Comprehensive Audit Logging
- ✅ Two-Factor Authentication (2FA)
- ✅ Admin Dashboard for management

## Setup Instructions

### 1. Import Auth Modules
\`\`\`javascript
const AuthRBAC = require('./api/auth-rbac');
const AuditMiddleware = require('./api/auth-audit-middleware');
const SessionManager = require('./api/auth-session-manager');
const TwoFactorAuth = require('./api/auth-2fa-setup');
const authRoutes = require('./api/auth-routes');

// Initialize
const rbac = new AuthRBAC();
const audit = new AuditMiddleware();
const sessions = new SessionManager();
const twoFA = new TwoFactorAuth();

app.use('/api/auth', authRoutes);
\`\`\`

### 2. Create Guest Sessions
\`\`\`javascript
// On first page load
const session = sessions.createSession(null, 'guest');
// Store sessionId in localStorage or cookie
localStorage.setItem('sessionId', session.id);
\`\`\`

### 3. Upgrade to User
\`\`\`javascript
// After user login
const upgraded = sessions.upgradeToUser(sessionId, userId, userEmail);
// Log this action
audit.logLoginAttempt(userEmail, true, req.ip, req.headers['user-agent']);
\`\`\`

### 4. Check Permissions
\`\`\`javascript
// In protected routes
const userRole = req.user.role; // 'admin', 'moderator', 'user'
const access = rbac.checkAccess(userRole, 'manage_users');

if (!access.allowed) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
\`\`\`

### 5. Enable 2FA
\`\`\`javascript
// Generate 2FA secret
const setup = twoFA.generateSecret(userId);
console.log('Scan QR Code:', setup.qrCode);
console.log('Save these backup codes:', setup.backupCodes);

// Enable after user confirms
twoFA.enableTwoFactor(userId, setup.secret, setup.backupCodes);
\`\`\`

## API Endpoints

### RBAC
- \`GET /api/auth/roles\` - Get all roles and permissions
- \`POST /api/auth/check-permission\` - Check user permission
- \`POST /api/auth/assign-role\` - Assign role to user

### Sessions
- \`POST /api/auth/session/create\` - Create new session
- \`GET /api/auth/session/:sessionId\` - Get session details
- \`PUT /api/auth/session/:sessionId/upgrade\` - Upgrade guest to user
- \`DELETE /api/auth/session/:sessionId\` - Terminate session
- \`GET /api/auth/sessions\` - List all sessions
- \`POST /api/auth/session/cleanup\` - Clean expired sessions

### Audit Logs
- \`GET /api/auth/audit/logs\` - Get audit logs
- \`POST /api/auth/audit/clear-old\` - Clear old logs
- \`GET /api/auth/audit/failed-attempts/:email\` - Get failed attempts

### 2FA
- \`POST /api/auth/2fa/generate\` - Generate 2FA secret
- \`POST /api/auth/2fa/enable\` - Enable 2FA
- \`POST /api/auth/2fa/disable\` - Disable 2FA
- \`POST /api/auth/2fa/verify-backup\` - Verify backup code
- \`GET /api/auth/2fa/status/:userId\` - Get 2FA status

### Status
- \`GET /api/auth/health\` - Health check

## Database Schema

### Users Table
\`\`\`sql
id TEXT PRIMARY KEY
email TEXT UNIQUE
fullName TEXT
role TEXT (admin|moderator|user)
permissions TEXT JSON
isActive INTEGER
createdAt TEXT
lastLogin TEXT
twoFactorEnabled INTEGER
\`\`\`

### Sessions Table
\`\`\`sql
id TEXT PRIMARY KEY
userId TEXT
userEmail TEXT
sessionType TEXT (guest|user)
isActive INTEGER
createdAt TEXT
lastActivity TEXT
expiresAt TEXT
ipAddress TEXT
userAgent TEXT
metadata TEXT JSON
\`\`\`

### Audit Logs Table
\`\`\`sql
id TEXT PRIMARY KEY
timestamp TEXT
userId TEXT
userEmail TEXT
action TEXT
resource TEXT
resourceId TEXT
changes TEXT JSON
ipAddress TEXT
status TEXT (success|failure)
errorMessage TEXT
\`\`\`

## Security Best Practices

1. **Always validate sessions** before processing requests
2. **Check permissions** for sensitive operations
3. **Log all authentication events** for audit trails
4. **Enforce 2FA** for admin accounts
5. **Clean up expired sessions** regularly
6. **Monitor failed login attempts** for suspicious activity
7. **Use HTTPS** for all auth endpoints
8. **Rotate backup codes** periodically
9. **Implement rate limiting** on auth endpoints
10. **Review audit logs** regularly for anomalies

## Monitoring & Maintenance

### Check System Health
\`\`\`javascript
GET /api/auth/health
// Returns: active sessions, audit log count, system status
\`\`\`

### Clean Old Logs
\`\`\`javascript
POST /api/auth/audit/clear-old
{ "daysOld": 30 }
\`\`\`

### Monitor Failed Attempts
\`\`\`javascript
GET /api/auth/audit/failed-attempts/user@example.com
// Returns: failed login attempts in last 24 hours
\`\`\`

## Deployment Checklist

- [ ] Import all auth modules in main app
- [ ] Mount auth routes on Express app
- [ ] Create database tables (auth_sessions, auth_users, audit_logs)
- [ ] Set up environment variables for auth config
- [ ] Enable HTTPS on all auth endpoints
- [ ] Configure CORS for your frontend domain
- [ ] Set up log rotation/cleanup schedule
- [ ] Enable 2FA for all admin accounts
- [ ] Test session expiry and cleanup
- [ ] Review and customize audit log retention
- [ ] Deploy admin dashboard
- [ ] Monitor logs and set up alerts

## Support & Troubleshooting

### Session Expires Too Quickly
Adjust default expiry in SessionManager constructor:
\`\`\`javascript
const sessions = new SessionManager(48 * 60 * 60 * 1000); // 48 hours
\`\`\`

### 2FA QR Code Not Scanning
Ensure TOTP library is properly configured. In production, use 'speakeasy' or similar.

### Audit Logs Growing Too Fast
Configure auto-cleanup and retention policies:
\`\`\`javascript
// Clean logs older than 7 days
audit.clearOldLogs(7);
\`\`\`

## Next Steps

1. Deploy to Render after MR merge
2. Set up automated log cleanup (cron job)
3. Configure email alerts for failed auth attempts
4. Train users on 2FA setup
5. Monitor admin dashboard daily
6. Review audit logs weekly
7. Plan for future features (WebAuthn, passkeys)

---

**Admin Dashboard**: Visit `/auth-admin-dashboard` to manage system

**Last Updated**: 2026-04-15
