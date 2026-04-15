/**
 * Admin Service Gateway
 * Routes admin requests to appropriate service handlers
 */

class ServiceGateway {
  constructor() {
    this.services = new Map();
    this.defaultHandlers = {};
    
    this.initServices();
  }
  
  initServices() {
    // Register service handlers
    this.services.set('safecode', {
      name: 'Safecode',
      routes: [
        '/admin/safecode/codes',
        '/admin/safecode/stats',
        '/admin/safecode/export'
      ],
      handlers: {
        getStats: this.getSafecodeStats.bind(this),
        getCodes: this.getCodes.bind(this)
      }
    });
    
    this.services.set('cottery', {
      name: 'Cottery',
      routes: [
        '/admin/cottery/bets',
        '/admin/cottery/results',
        '/admin/cottery/stats'
      ],
      handlers: {
        getStats: this.getCotteryStats.bind(this)
      }
    });
    
    this.services.set('farragna', {
      name: 'Farragna',
      routes: [
        '/admin/farragna/videos',
        '/admin/farragna/users',
        '/admin/farragna/stats'
      ],
      handlers: {
        getStats: this.getFarragnaStats.bind(this)
      }
    });
    
    this.services.set('pebalaash', {
      name: 'Pebalaash',
      routes: [
        '/admin/pebalaash/artworks',
        '/admin/pebalaash/artists'
      ],
      handlers: {
        getStats: this.getPebalaashStats.bind(this)
      }
    });
    
    this.services.set('samma3ny', {
      name: 'Samma3ny',
      routes: [
        '/admin/samma3ny/streams',
        '/admin/samma3ny/viewers'
      ],
      handlers: {
        getStats: this.getSamma3nyStats.bind(this)
      }
    });
    
    this.services.set('e7ki', {
      name: 'E7ki',
      routes: [
        '/admin/e7ki/consultants',
        '/admin/e7ki/consultations',
        '/admin/e7ki/reviews'
      ],
      handlers: {
        getStats: this.getE7kiStats.bind(this)
      }
    });
    
    this.services.set('battalooda', {
      name: 'Battalooda',
      routes: [
        '/admin/battalooda/engagement',
        '/admin/battalooda/trending'
      ],
      handlers: {
        getStats: this.getBattaloodaStats.bind(this)
      }
    });
  }
  
  /**
   * Get service by ID
   */
  getService(serviceId) {
    return this.services.get(serviceId);
  }
  
  /**
   * Route request to appropriate service
   */
  async route(serviceId, action, params, context) {
    const service = this.services.get(serviceId);
    
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }
    
    // Check permission
    if (!this.hasPermission(context.user, serviceId, action)) {
      throw new Error('PERMISSION_DENIED');
    }
    
    // Execute action
    const handler = service.handlers[action];
    if (!handler) {
      throw new Error(`Action not found: ${action}`);
    }
    
    return await handler(params, context);
  }
  
  /**
   * Check user permission for service action
   */
  hasPermission(user, serviceId, action) {
    if (!user) return false;
    
    // SUPER_ADMIN has all permissions
    if (user.role === 'SUPER_ADMIN') return true;
    
    // SERVICE_ADMIN can only access their assigned service
    if (user.role === 'SERVICE_ADMIN') {
      const userServices = user.permissions || [];
      return userServices.includes(serviceId) || userServices.includes('*');
    }
    
    // ANALYST and VIEWER can only view
    if (action.startsWith('view') || action === 'getStats') {
      return user.role === 'ANALYST' || user.role === 'VIEWER';
    }
    
    return false;
  }
  
  /**
   * Get all services for dashboard
   */
  async getAllServicesStats() {
    const stats = {};
    
    for (const [id, service] of this.services) {
      try {
        stats[id] = await service.handlers.getStats();
      } catch (e) {
        stats[id] = { error: e.message };
      }
    }
    
    return stats;
  }
  
  // Service-specific handlers
  async getSafecodeStats() {
    // Query safecode database
    return { users: 0, codes: 0, storage: 0 };
  }
  
  async getCodes(params) {
    return { codes: [] };
  }
  
  async getCotteryStats() {
    return { activeBets: 0, totalPool: 0 };
  }
  
  async getFarragnaStats() {
    return { videos: 0, views: 0, uploads: 0 };
  }
  
  async getPebalaashStats() {
    return { artworks: 0, artists: 0 };
  }
  
  async getSamma3nyStats() {
    return { streams: 0, viewers: 0 };
  }
  
  async getE7kiStats() {
    return { consultants: 0, consultations: 0 };
  }
  
  async getBattaloodaStats() {
    return { engagement: 0, viral: 0 };
  }
}

export default ServiceGateway;
export { ServiceGateway };