/**
 * Server Session Configuration
 * Add this to your Express server setup:
 * 
 * const sessionRouter = require('./server/routes/session-api.js');
 * const cookieParser = require('cookie-parser');
 * 
 * app.use(cookieParser());
 * app.use('/api', sessionRouter);
 */

module.exports = {
    setup: (app) => {
        const cookieParser = require('cookie-parser');
        const sessionRouter = require('./server/routes/session-api.js');
        
        // Middleware
        app.use(cookieParser());
        app.use(express.json());
        
        // Routes
        app.use('/api', sessionRouter);
        
        console.log('[SessionAPI] Initialized');
    }
};
