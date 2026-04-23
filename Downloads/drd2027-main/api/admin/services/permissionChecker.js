/**
 * Permission Checker Service
 * Validates admin permissions for services and actions
 */

class PermissionChecker {
  constructor() {
    this.roleHierarchy = {
      'SUPER_ADMIN': 3,
      'SERVICE_ADMIN': 2,
      'ANALYST': 1,
      'VIEWER': 0
    };
    
    this.servicePermissions = new Map();
    this.initDefaultPermissions();
  }
  
  initDefaultPermissions() {
    // All services accessible by SUPER_ADMIN
    const superAdminPerms = ['*'];
    
    // Service-specific permissions
    const serviceAdminPerms = {
      'safecode': ['view_codes', 'manage_codes', 'view_users', 'view_stats'],
      'cottery': ['view_bets', 'manage_bets', 'view_results', 'view_stats'],
      'farragna': ['view_videos', 'manage_videos', 'view_users', 'view_stats'],
      'pebalaash': ['view_artworks', 'manage_artworks', 'view_artists'],
      'samma3ny': ['view_streams', 'manage_streams', 'view_viewers'],
      'e7ki': ['view_consultants', 'manage_consultants', 'view_consultations'],
      'battalooda': ['view_engagement', 'manage_engagement', 'view_trending']
    };
    
    // Analyst permissions (read-only)
    const analystPerms = [
      'view_dashboard', 'view_audit', 'view_users', 'view_stats'
    ];
    
    // Viewer permissions
    const viewerPerms = ['view_dashboard'];
    
    this.permissions = {
      'SUPER_ADMIN': superAdminPerms,
      'SERVICE_ADMIN': serviceAdminPerms,
      'ANALYST': analystPerms,
      'VIEWER': viewerPerms
    };
  }
  
  /**
   * Check if user has permission for action
   */
  check(user, action, service = null) {
    if (!user) return false;
    
    const role = user.role || 'VIEWER';
    const level = this.roleHierarchy[role] ?? 0;
    
    // SUPER_ADMIN has all permissions
    if (role === 'SUPER_ADMIN') return true;
    
    // Check service-specific permissions
    if (service) {
      const servicePerms = this.permissions[role]?.[service] || [];
      return servicePerms.includes(action) || servicePerms.includes('*');
    }
    
    // Check general permissions
    const generalPerms = this.permissions[role] || [];
    return generalPerms.includes(action);
  }
  
  /**
   * Check role level
   */
  hasRoleLevel(user, minLevel) {
    if (!user) return false;
    
    const userLevel = this.roleHierarchy[user.role] ?? 0;
    return userLevel >= minLevel;
  }
  
  /**
   * Check service access
   */
  canAccessService(user, serviceId) {
    if (!user) return false;
    
    const role = user.role;
    
    // SUPER_ADMIN accesses all
    if (role === 'SUPER_ADMIN') return true;
    
    // SERVICE_ADMIN can access assigned services
    if (role === 'SERVICE_ADMIN') {
      const services = user.services || [];
      return services.includes(serviceId) || services.includes('*');
    }
    
    // ANALYST and VIEWER can view all
    return role === 'ANALYST' || role === 'VIEWER';
  }
  
  /**
   * Get effective permissions for role
   */
  getPermissions(role) {
    return this.permissions[role] || [];
  }
  
  /**
   * Get services accessible by user
   */
  getAccessibleServices(user) {
    if (!user) return [];
    
    const role = user.role;
    
    if (role === 'SUPER_ADMIN') {
      return Array.from(this.servicePermissions.keys());
    }
    
    if (role === 'SERVICE_ADMIN') {
      return user.services || [];
    }
    
    // ANALYST and VIEWER can view all
    return Array.from(this.servicePermissions.keys());
  }
  
  /**
   * Middleware factory for Express
   */
  requirePermission(action, service = null) {
    return (req, res, next) => {
      const user = req.user;
      
      if (!this.check(user, action, service)) {
        return res.status(403).json({
          ok: false,
          error: 'PERMISSION_DENIED',
          required: { action, service }
        });
      }
      
      next();
    };
  }
  
  /**
   * Middleware factory for minimum role level
   */
  requireRoleLevel(minLevel) {
    return (req, res, next) => {
      if (!this.hasRoleLevel(req.user, minLevel)) {
        return res.status(403).json({
          ok: false,
          error: 'INSUFFICIENT_ROLE',
          required: minLevel
        });
      }
      
      next();
    };
  }
}

export default PermissionChecker;
export { PermissionChecker };