// ============================================================================
// EMERGENCY RENDER FIX - Missing app.listen() + SSE Functions
// ============================================================================

// Define missing global SSE registry BEFORE any module tries to use it
global.__sseRegistry = global.__sseRegistry || new Map();
global.__sseEmitToSession = function(sessionId, data) {
    try {
        const client = global.__sseRegistry.get(sessionId);
        if (client && !client.destroyed) {
            client.write(`data: ${JSON.stringify(data)}\n\n`);
            return true;
        }
    } catch(e) {
        console.error('[SSE] Emit error:', e.message);
    }
    return false;
};

// Continue with remaining route registrations...

// ============================================================================
// ALL REMAINING ROUTES - Mounted in order
// ============================================================================

// Ballons router
app.use('/api/balloons', battaloodaRouter);

// AI routes
app.use('/api/ai', aiRoutes);

// Zagel routes
app.use('/api/zagel', zagelRouter);

// Shots router
app.use('/api/shots', shotsRouter);

// Biometric router
app.use('/api/biometric', biometricRouter);

// Gamble router
app.use('/api/gamble', gambleRouter);

// Samma3ny auto mode router
app.use('/api/samma3ny-automode', sammAutoRouter);

// Likes router
app.use('/api/likes', likesRouter);

// DrMail router
app.use('/api/drmail', drmailRouter);

// Quota router
app.use('/api/quota', quotaRouter);

// Auth v2 routes (must come after cookie parsing)
app.use('/api/auth', authV2Routes);

// Asset routes
app.use('/api/assets', assetRoutes);

// API module routes
app.use('/api/codes', codesMod.default ? codesMod.default : codesMod);
app.use('/api/sync', syncRouter);
app.use('/api/monetization', monetizationMod.default || monetizationMod);
app.use('/api/samma3ny', samma3nyMod.default || samma3nyMod);
app.use('/api/nostalgia', nostalgiaMod.default || nostalgiaMod);
app.use('/api/pebalaash', pebalaashMod.default || pebalaashMod);
app.use('/api/admin', adminMod.default || adminMod);
app.use('/api/test', testMod.default || testMod);
app.use('/api/rewards', rewardsMod.default || rewardsMod);
app.use('/api/farragna', farragnaDefault || farragnaWebhook);
app.use('/api/e7ki', e7kiDefault || {});
app.use('/api/logicode', logicodeMod.default || logicodeMod);
app.use('/api/corsa', corsaMod.default || corsaMod);
app.use('/api/setta', settaDefault || {});
app.use('/api/balloon', balloonMod.default || balloonMod);

// ============================================================================
// CRITICAL: HEALTH CHECK & PORT BINDING
// ============================================================================

// Health check endpoint (REQUIRED - Render monitoring depends on this)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'production',
        sseClients: global.__sseRegistry.size
    });
});

// Simple root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'Dr.D Backend Server',
        version: '2.0',
        status: 'operational',
        port: PORT
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// ============================================================================
// FINAL: Bind to port with timeout verification
// ============================================================================

const SERVER_STARTUP_TIMEOUT = 15000; // 15 second timeout
let startupTimer = null;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ [CRITICAL] Server bound to 0.0.0.0:${PORT}`);
    console.log(`✅ [BOOT] Dr.D Backend v2.0 is now listening`);
    
    if (startupTimer) clearTimeout(startupTimer);
});

server.on('error', (err) => {
    console.error('❌ [CRITICAL] Port binding FAILED:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    }
    process.exit(1);
});

// Verify binding within timeout
startupTimer = setTimeout(() => {
    if (!server.listening) {
        console.error('❌ [CRITICAL] Server failed to bind within timeout - exiting');
        process.exit(1);
    }
}, SERVER_STARTUP_TIMEOUT);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] SIGTERM received, closing gracefully...');
    server.close(() => {
        console.log('[SHUTDOWN] Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[SHUTDOWN] SIGINT received, closing gracefully...');
    server.close(() => {
        console.log('[SHUTDOWN] Server closed');
        process.exit(0);
    });
});

console.log('[BOOT] Server startup complete - waiting for requests...');

export { app, server, io };
