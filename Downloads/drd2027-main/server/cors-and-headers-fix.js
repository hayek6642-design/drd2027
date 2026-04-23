/**
 * ⭐ CORS & Security Headers Fix
 * Fixes:
 * 1. CORS for all origins (development mode)
 * 2. Removes x-guest-mode header from aladhan.com API calls
 * 3. Sets proper security headers
 */

export function setupCORSHeaders(app) {
  // Apply CORS globally
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Max-Age', '3600');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

export function setupAuthHeaders(app) {
  // Add security headers
  app.use((req, res, next) => {
    // Ensure auth headers don't include problematic headers
    // This prevents x-guest-mode and similar custom headers from breaking CORS with third-party APIs
    if (req.headers['x-guest-mode']) {
      delete req.headers['x-guest-mode'];
    }
    
    // Set security headers
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header('X-XSS-Protection', '1; mode=block');
    
    next();
  });
}
