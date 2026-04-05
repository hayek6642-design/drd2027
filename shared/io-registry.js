/**
 * 🔌 IO REGISTRY — Singleton for Socket.IO instance
 *
 * Allows route files to emit real-time events without importing server.js.
 *
 * SETUP (add these 2 lines to server.js after creating `io`):
 * ─────────────────────────────────────────────────────────
 *   import { setIO } from './shared/io-registry.js';
 *   setIO(io);   // ← place right after: const io = new Server(server, {...});
 * ─────────────────────────────────────────────────────────
 */

let _io = null;

/**
 * Called once from server.js after Socket.IO is initialized.
 * @param {import('socket.io').Server} io
 */
export function setIO(io) {
  _io = io;
  console.log('[IO-REGISTRY] Socket.IO instance registered ✅');
}

/**
 * Returns the Socket.IO instance, or null if not yet initialized.
 * Routes should check for null before emitting.
 * @returns {import('socket.io').Server|null}
 */
export function getIO() {
  return _io;
}
