const jwt = require('jsonwebtoken');
const path = require('path');
const Database = require('better-sqlite3');

// Use the SAME secret as your main CodeBank server
const JWT_SECRET = process.env.JWT_SECRET || 'your-codebank-secret';

const dbPath = path.join(__dirname, '../../../data.sqlite');

/**
 * Validate JWT token against CodeBank's user database
 */
const validateToken = (token) => {
  try {
    // Verify token signature
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists in database
    const db = new Database(dbPath);
    const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(decoded.userId || decoded.sub);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      iat: decoded.iat,
      exp: decoded.exp
    };
    
  } catch (err) {
    console.error('[E7ki Auth] Token validation failed:', err.message);
    return null;
  }
};

/**
 * Express middleware for HTTP routes
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied',
      code: 'NO_TOKEN'
    });
  }
  
  const user = validateToken(token);
  
  if (!user) {
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
  
  // Attach user to request
  req.user = user;
  next();
};

/**
 * WebSocket authentication for Socket.io
 */
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  const user = validateToken(token);
  
  if (!user) {
    return next(new Error('Invalid token'));
  }
  
  socket.userId = user.id;
  socket.username = user.username;
  next();
};

module.exports = { authenticateToken, authenticateSocket, JWT_SECRET };
