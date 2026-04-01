export function requireFarragnaAuth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const parts = h.split(' ');
    if (parts[0] !== 'Bearer' || !parts[1]) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'secret-demo';
    const decoded = jwt.verify(parts[1], JWT_SECRET);
    if (!decoded.userId) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}