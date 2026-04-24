/**
 * CORS & Headers Middleware
 * Add to server.js BEFORE other middleware
 */

export function setupCORSHeaders(app) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Guest-Mode, X-Session-Token');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Number, X-Auth-Status');
    
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });
}

export function setupAuthHeaders(app) {
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'];
    
    req.auth = {
      token: null,
      sessionToken: sessionToken,
      guestMode: req.headers['x-guest-mode'] === 'true',
      type: null
    };
    
    if (authHeader?.startsWith('Bearer ')) {
      req.auth.token = authHeader.substring(7);
      req.auth.type = 'jwt';
    }
    
    next();
  });
}

export default { setupCORSHeaders, setupAuthHeaders };
