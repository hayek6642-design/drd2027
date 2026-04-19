const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE DIAGNOSTICS - Render.com Compatible
// ════════════════════════════════════════════════════════════════
(function logEnvironment() {
  console.log('[🔍 ENV CHECK] Starting with environment:');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
  console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓' : '✗ MISSING');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓' : '✗ MISSING');
  console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓' : '✗ MISSING');
  
  const required = ['GOOGLE_CLIENT_ID', 'DATABASE_URL', 'CLOUDINARY_CLOUD_NAME'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.warn('[⚠️  WARN] Missing environment variables:', missing.join(', '));
    console.warn('[⚠️  WARN] These must be set in Render Dashboard → Environment');
  } else {
    console.log('[✅ OK] All required environment variables are set');
  }
})();

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/env', (req, res) => {
  res.json({
    status: 'ok',
    environment: {
      nodeEnv: process.env.NODE_ENV || 'not-set',
      envVarsLoaded: {
        google_client_id: !!process.env.GOOGLE_CLIENT_ID,
        database_url: !!process.env.DATABASE_URL,
        cloudinary_cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
        jwt_secret: !!process.env.JWT_SECRET,
        session_secret: !!process.env.SESSION_SECRET
      }
    },
    timestamp: new Date().toISOString()
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ───────────────────────────────────────────────────────────────────────────────
// CRITICAL: Force correct Content-Type headers
// ───────────────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  // Force HTML content type for all .html files and root
  if (req.url === '/' || req.url.endsWith('.html') || req.url.endsWith('index')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  
  // Force JS content type
  if (req.url.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }
  
  // Force CSS content type
  if (req.url.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  }
  
  // Prevent caching of HTML files
  if (req.url.endsWith('.html') || req.url === '/') {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE (for demo - use DB in production)
// ═══════════════════════════════════════════════════════════════════════════════
const sessions = new Map();
const demoUsers = [
  { id: '1', email: 'demo@example.com', password: 'demo123456', name: 'Demo User' },
  { id: '2', email: 'test@example.com', password: 'test123456', name: 'Test User' }
];

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// Login endpoint
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = demoUsers.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const sessionId = Math.random().toString(36).substr(2, 9);
  sessions.set(sessionId, {
    userId: user.id,
    email: user.email,
    token: token,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
  });

  res.json({
    success: true,
    sessionId: sessionId,
    token: token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

// Client configuration endpoint - returns env vars safely to client
app.get('/api/config/client', (req, res) => {
  console.log('[API /config/client] Request received');

  const clientConfig = {
    google: { clientId: process.env.GOOGLE_CLIENT_ID || '' },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dhpyneqgk',
      apiKey: process.env.CLOUDINARY_API_KEY || ''
    },
    database: {
      isConfigured: !!process.env.DATABASE_URL
    },
    debug: {
      hasGoogle: !!process.env.GOOGLE_CLIENT_ID,
      hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
      hasDatabase: !!process.env.DATABASE_URL
    }
  };

  console.log('[API /config/client] Sending:', {
    google: !!clientConfig.google.clientId,
    cloudinary: clientConfig.cloudinary.cloudName,
    database: clientConfig.database.isConfigured ? 'configured' : 'MISSING'
  });

  res.json(clientConfig);
});

// Get current user (verify token)
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = demoUsers.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      authenticated: true
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid token", details: error.message });
  }
});

// Get auth status
app.get("/api/auth/status", (req, res) => {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.json({
      authenticated: false,
      guest: true
    });
  }

  const session = sessions.get(sessionId);
  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return res.json({
      authenticated: false,
      guest: true
    });
  }

  res.json({
    authenticated: true,
    sessionId: sessionId,
    userId: session.userId
  });
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  const sessionId = req.body.sessionId;
  
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }

  res.json({ success: true });
});

// Register endpoint
app.post("/api/auth/register", (req, res) => {
  res.json({ 
    success: true, 
    message: "Register endpoint - feature coming soon",
    status: "demo"
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI CHAT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// Proxy AI requests (optional - for handling CORS)
app.post("/api/chat", (req, res) => {
  const { message, model } = req.body;
  
  if (!message || !model) {
    return res.status(400).json({ error: "Message and model required" });
  }

  // This endpoint can be used to proxy requests to AI providers
  // Implement your own logic here
  res.json({
    success: true,
    message: "Chat endpoint ready",
    model: model,
    echo: message
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING (MUST BE BEFORE STATIC MIDDLEWARE)
// ═══════════════════════════════════════════════════════════════════════════════

// 🚀 ROOT PATH MUST SERVE YT-NEW-CLEAR.HTML (NOT index.html!)
app.get("/", (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, "yt-new-clear.html"));
});

// Login page
app.get("/login.html", (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, "login.html"));
});

// AI Chat page
app.get("/ai-chat.html", (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, "codebank", "ai-chat.html"));
});

// Index fallback (CodeBank) - for explicit access only
app.get("/index.html", (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, "index.html"));
});

// ───────────────────────────────────────────────────────────────────────────────
// STATIC FILE SERVING (AFTER route handlers so they take precedence)
// ───────────────────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  },
  maxAge: '1h'
}));

app.use(express.static(path.join(__dirname, 'codebank'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  },
  maxAge: '1h'
}));

app.use(express.static(__dirname, {
  maxAge: '1h'
}));

// Fallback for undefined routes
app.get("*", (req, res) => {
  // Serve static files if they exist, otherwise serve main app
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, "yt-new-clear.html"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🎯 Entry Point: http://localhost:${PORT}/ → yt-new-clear.html`);
  console.log(`🔐 Auth API: /api/auth/*`);
  console.log(`💬 Chat API: /api/chat`);
  console.log(`📄 Demo Users: demo@example.com / test@example.com`);
});

module.exports = app;
