// src/api/external-api.js
/**
 * External API Gateway
 * Secure, rate-limited, audited API for external consumers
 */

import { dbManager } from '../core/database-manager.js';

class ExternalAPI {
  constructor() {
    this.rateLimits = new Map(); // IP -> { count, resetTime }
    this.apiKeys = new Map(); // key -> { permissions, quotas }
    this.auditLog = [];
    
    this.config = {
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 1000,
      keyExpiryHours: 24
    };
  }

  // Initialize API key from admin
  async generateApiKey(clientId, permissions = ['read']) {
    const key = this.generateSecureKey();
    const expiry = Date.now() + (this.config.keyExpiryHours * 3600000);
    
    this.apiKeys.set(key, {
      clientId,
      permissions,
      created: Date.now(),
      expiry,
      usage: { count: 0, lastUsed: null }
    });
    
    // Store in database
    await dbManager.queueWrite({
      type: 'INSERT',
      table: 'api_keys',
      data: { key, clientId, permissions, expiry }
    });
    
    return { key, expiry };
  }

  generateSecureKey() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return 'cb_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  // Main API handler
  async handleRequest(request) {
    const { endpoint, method, headers, body, clientIp } = request;
    
    // 1. Authentication
    const apiKey = headers['x-api-key'];
    if (!apiKey || !this.validateKey(apiKey)) {
      return this.errorResponse(401, 'Invalid or missing API key');
    }
    
    const keyData = this.apiKeys.get(apiKey);
    
    // 2. Rate limiting
    const rateCheck = this.checkRateLimit(clientIp, keyData);
    if (!rateCheck.allowed) {
      return this.errorResponse(429, `Rate limit exceeded. Retry after ${rateCheck.retryAfter}s`);
    }
    
    // 3. Permission check
    const requiredPerm = this.getRequiredPermission(endpoint);
    if (!keyData.permissions.includes(requiredPerm) && !keyData.permissions.includes('admin')) {
      return this.errorResponse(403, 'Insufficient permissions');
    }
    
    // 4. Process request
    const startTime = performance.now();
    let result;
    
    try {
      result = await this.executeEndpoint(endpoint, method, body, keyData);
    } catch (error) {
      this.logAudit(apiKey, endpoint, 'error', error.message, performance.now() - startTime);
      return this.errorResponse(500, 'Internal error');
    }
    
    // 5. Audit logging
    const duration = performance.now() - startTime;
    this.logAudit(apiKey, endpoint, 'success', null, duration);
    
    // 6. Update usage
    keyData.usage.count++;
    keyData.usage.lastUsed = Date.now();
    
    return this.successResponse(result, {
      'X-RateLimit-Remaining': rateCheck.remaining,
      'X-RateLimit-Reset': rateCheck.resetTime
    });
  }

  validateKey(key) {
    const data = this.apiKeys.get(key);
    if (!data) return false;
    if (Date.now() > data.expiry) {
      this.apiKeys.delete(key);
      return false;
    }
    return true;
  }

  checkRateLimit(ip, keyData) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // Per-key limit
    if (!this.rateLimits.has(keyData.clientId)) {
      this.rateLimits.set(keyData.clientId, { count: 0, resetTime: now + 60000 });
    }
    
    const limit = this.rateLimits.get(keyData.clientId);
    
    if (now > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = now + 60000;
    }
    
    if (limit.count >= this.config.maxRequestsPerMinute) {
      return {
        allowed: false,
        retryAfter: Math.ceil((limit.resetTime - now) / 1000),
        remaining: 0
      };
    }
    
    limit.count++;
    
    return {
      allowed: true,
      remaining: this.config.maxRequestsPerMinute - limit.count,
      resetTime: limit.resetTime
    };
  }

  getRequiredPermission(endpoint) {
    const permissions = {
      '/api/v1/codes/generate': 'write',
      '/api/v1/codes/validate': 'read',
      '/api/v1/ledger/query': 'read',
      '/api/v1/services/list': 'read',
      '/api/v1/admin/keys': 'admin'
    };
    return permissions[endpoint] || 'read';
  }

  async executeEndpoint(endpoint, method, body, keyData) {
    switch (endpoint) {
      case '/api/v1/codes/generate':
        if (method !== 'POST') throw new Error('Method not allowed');
        return this.generateCode(body, keyData);
        
      case '/api/v1/codes/validate':
        if (method !== 'POST') throw new Error('Method not allowed');
        return this.validateCode(body.code);
        
      case '/api/v1/ledger/query':
        if (method !== 'GET') throw new Error('Method not allowed');
        return this.queryLedger(body?.filters);
        
      case '/api/v1/services/list':
        return this.listServices();
        
      default:
        throw new Error('Unknown endpoint');
    }
  }

  async generateCode(params, keyData) {
    // Validate through PolicyEngine
    const policyCheck = await this.checkPolicy('code-generation', {
      clientId: keyData.clientId,
      ...params
    });
    
    if (!policyCheck.allowed) {
      throw new Error(`Policy violation: ${policyCheck.reason}`);
    }
    
    // Generate code
    const code = this.generateCodeString(params.format || 'xxxx-xxxx-xxxx');
    
    // Queue for database
    await dbManager.queueCodeGeneration({
      code,
      clientId: keyData.clientId,
      metadata: params,
      critical: true
    });
    
    return {
      code,
      status: 'generated',
      expiresAt: Date.now() + (params.ttlHours || 24) * 3600000
    };
  }

  generateCodeString(format) {
    return format.replace(/x/g, () => 
      Math.floor(Math.random() * 36).toString(36).toUpperCase()
    );
  }

  async validateCode(code) {
    const results = await dbManager.query(
      'SELECT * FROM codes WHERE code = ? AND status = "active"',
      [code]
    );
    
    if (results.length === 0) {
      return { valid: false, reason: 'Code not found or expired' };
    }
    
    // Update status to used
    await dbManager.queueLedgerUpdate({
      code,
      status: 'used',
      usedAt: Date.now()
    });
    
    return { valid: true, code: results[0] };
  }

  async checkPolicy(action, context) {
    // Integrate with existing PolicyEngine
    if (window.PolicyEngine) {
      return window.PolicyEngine.evaluate(action, context);
    }
    
    // Default allow
    return { allowed: true };
  }

  logAudit(apiKey, endpoint, status, error, duration) {
    const entry = {
      timestamp: Date.now(),
      apiKey: apiKey.substring(0, 10) + '...',
      endpoint,
      status,
      error,
      duration: Math.round(duration),
      ip: 'redacted' // Privacy
    };
    
    this.auditLog.push(entry);
    
    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
    
    // Async write to database
    dbManager.queueWrite({
      type: 'INSERT',
      table: 'api_audit_log',
      data: entry,
      priority: 'low'
    });
  }

  successResponse(data, headers = {}) {
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        success: true,
        data,
        timestamp: Date.now()
      })
    };
  }

  errorResponse(status, message) {
    return {
      status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: message,
        timestamp: Date.now()
      })
    };
  }

  // Admin endpoints
  getAuditLog(filters = {}) {
    return this.auditLog.filter(entry => {
      if (filters.startTime && entry.timestamp < filters.startTime) return false;
      if (filters.endTime && entry.timestamp > filters.endTime) return false;
      if (filters.status && entry.status !== filters.status) return false;
      return true;
    });
  }

  getMetrics() {
    return {
      activeKeys: this.apiKeys.size,
      totalRequests: Array.from(this.apiKeys.values())
        .reduce((sum, k) => sum + k.usage.count, 0),
      auditLogSize: this.auditLog.length,
      rateLimitQueues: this.rateLimits.size
    };
  }
}

// Express.js integration (for Node backend)
export function createAPIRouter(externalAPI) {
  return async (req, res) => {
    const request = {
      endpoint: req.path,
      method: req.method,
      headers: req.headers,
      body: req.body,
      clientIp: req.ip
    };
    
    const response = await externalAPI.handleRequest(request);
    
    res.status(response.status);
    Object.entries(response.headers).forEach(([k, v]) => res.set(k, v));
    res.send(response.body);
  };
}

export const externalAPI = new ExternalAPI();