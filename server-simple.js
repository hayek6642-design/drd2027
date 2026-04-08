/**
 * Simple Server for Testing - No Native Dependencies
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(__dirname));

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'yt-new-clear.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple Server running on http://localhost:${PORT}`);
  console.log('✅ Server ready for testing');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});