/**
 * Auth RBAC - Role-Based Access Control
 * Manages permissions and role assignments
 */

class AuthRBAC {
  constructor() {
    this.roles = {
      admin: {
        permissions: [
          'manage_users',
          'view_audit_logs',
          'modify_roles',
          'terminate_sessions',
          'export_data',
          'system_config',
          'view_analytics',
          'manage_api_keys'
        ],
        description: 'Full system access and management'
      },
      moderator: {
        permissions: [
          'view_users',
          'moderate_content',
          'view_audit_logs',
          'terminate_sessions',
          'view_analytics'
        ],
        description: 'Moderate content and manage users'
      },
      user: {
        permissions: [
          'view_own_profile',
          'manage_own_sessions',
          'view_own_activity'
        ],
        description: 'Regular user access'
      }
    };
  }

  hasPermission(role, permission) {
    if (!this.roles[role]) return false;
    return this.roles[role].permissions.includes(permission);
  }

  checkAccess(userRole, requiredPermission) {
    const hasAccess = this.hasPermission(userRole, requiredPermission);
    return {
      allowed: hasAccess,
      role: userRole,
      permission: requiredPermission,
      timestamp: new Date().toISOString()
    };
  }

  getRolePermissions(role) {
    return this.roles[role]?.permissions || [];
  }

  getAllRoles() {
    return Object.keys(this.roles);
  }

  assignRole(userId, newRole) {
    if (!this.roles[newRole]) {
      throw new Error(\`Invalid role: \${newRole}\`);
    }
    return {
      userId,
      previousRole: 'user',
      newRole,
      assignedAt: new Date().toISOString(),
      permissions: this.getRolePermissions(newRole)
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthRBAC;
}
