/**
 * websocket-server.js
 * Enhances the existing raw WebSocket server with session-aware logic.
 *
 * Call setupSessionWebSocket(wss, opts) after creating the raw WebSocketServer.
 *
 * opts = {
 *   devSessions   : Map  — the in-memory session map from auth middleware
 *   query         : fn   — DB query function (Postgres)
 *   sseEmit       : fn   — __sseEmitToSession(userId, token, payload) from server.js
 *   getDeviceLabel: fn   — getDeviceLabel(req) from server.js (optional)
 * }
 *
 * ES Module
 */

import * as sessionManager from './core/session-manager.js';

// Heartbeat interval in ms
const PING_INTERVAL = 30_000;

/**
 * Setup session-aware WebSocket handling on an existing WebSocketServer.
 */
export function setupSessionWebSocket(wss, opts = {}) {
    const { devSessions, query, sseEmit } = opts;

    // Send server PING to all connected clients every 30s
    const pingInterval = setInterval(() => {
        for (const ws of wss.clients) {
            if (ws.readyState === 1 /* OPEN */) {
                try { ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() })); } catch (_) {}
            }
        }
    }, PING_INTERVAL);

    wss.on('close', () => clearInterval(pingInterval));

    wss.on('connection', (ws, req) => {
        console.log('[WS-Session] Client connected');

        ws.on('message', async (raw) => {
            let msg;
            try { msg = JSON.parse(raw.toString()); }
            catch (_) { return; }

            switch (msg.type) {

                // ── AUTH ─────────────────────────────────────────────────
                // Client sends AUTH after page load with their session token.
                // We validate the token, then register the WS connection.
                case 'AUTH': {
                    const token = msg.sessionToken;
                    if (!token) break;

                    // Try in-memory map first
                    let sess = devSessions && devSessions.get(token);

                    // Fall back to DB
                    if (!sess && query) {
                        try {
                            const r = await query(
                                'SELECT user_id, expires_at FROM auth_sessions WHERE token = $1',
                                [token]
                            );
                            if (r.rows.length > 0 && new Date(r.rows[0].expires_at) > new Date()) {
                                sess = { userId: r.rows[0].user_id };
                                if (devSessions) devSessions.set(token, sess);
                            }
                        } catch (_) {}
                    }

                    if (!sess) {
                        // Invalid token — close with policy violation
                        ws.send(JSON.stringify({ type: 'AUTH_FAILED', reason: 'Invalid session' }));
                        ws.close(1008, 'Invalid session');
                        break;
                    }

                    ws.userId       = String(sess.userId);
                    ws.sessionToken = token;
                    ws.deviceType   = msg.deviceType || 'unknown';
                    ws.deviceName   = msg.deviceName || 'Unknown Device';

                    sessionManager.registerConnection(
                        ws.userId,
                        ws,
                        token,
                        ws.deviceType,
                        ws.deviceName
                    );

                    ws.send(JSON.stringify({ type: 'AUTH_OK', userId: ws.userId, timestamp: Date.now() }));
                    console.log('[WS-Session] Authenticated user', ws.userId, 'on', ws.deviceType);
                    break;
                }

                // ── PONG / HEARTBEAT ─────────────────────────────────────
                case 'PONG':
                case 'HEARTBEAT': {
                    if (ws.userId) sessionManager.touchConnection(ws.userId);
                    break;
                }

                // ── CLAIM_SESSION ────────────────────────────────────────
                // User chose "Continue Here" in the conflict dialog —
                // kick the other device.
                case 'CLAIM_SESSION': {
                    if (!ws.userId || !ws.sessionToken) break;

                    const userId      = ws.userId;
                    const token       = ws.sessionToken;
                    const deviceLabel = ws.deviceType || 'this device';

                    try {
                        // Get old session from DB
                        let oldToken = null;
                        if (query) {
                            const r = await query(
                                'SELECT session_token FROM active_device_sessions WHERE user_id = $1',
                                [userId]
                            );
                            if (r.rows.length > 0) oldToken = r.rows[0].session_token;
                        }

                        if (oldToken && oldToken !== token) {
                            // 1. Notify old device via WebSocket (real-time)
                            sessionManager.forceLogout(userId, 'new_login', deviceLabel);

                            // 2. Also notify via SSE (for devices not connected to WS)
                            if (sseEmit) {
                                sseEmit(String(userId), oldToken, {
                                    type      : 'SESSION_TAKEN_OVER',
                                    newDevice : deviceLabel,
                                    message   : `Your session was taken over by ${deviceLabel}.`
                                });
                            }

                            // 3. Revoke old session token
                            if (devSessions) devSessions.delete(oldToken);
                            if (query) {
                                try {
                                    await query('DELETE FROM auth_sessions WHERE token = $1', [oldToken]);
                                } catch (_) {}
                            }
                        }

                        // 4. Register new device as active
                        if (query) {
                            await query(
                                `INSERT INTO active_device_sessions (user_id, session_token, device_label, last_seen_at)
                                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                                 ON CONFLICT (user_id) DO UPDATE
                                   SET session_token = excluded.session_token,
                                       device_label  = excluded.device_label,
                                       last_seen_at  = CURRENT_TIMESTAMP`,
                                [userId, token, deviceLabel]
                            );
                        }

                        ws.send(JSON.stringify({ type: 'SESSION_CLAIMED', timestamp: Date.now() }));
                        console.log('[WS-Session] Session claimed for user', userId, 'on', deviceLabel);

                    } catch (e) {
                        console.error('[WS-Session] CLAIM_SESSION error:', e.message);
                    }
                    break;
                }

                // ── LOGOUT ───────────────────────────────────────────────
                case 'LOGOUT': {
                    if (ws.userId) {
                        sessionManager.removeConnection(ws.userId);
                        ws.userId = null;
                    }
                    ws.close(1000, 'Logout');
                    break;
                }

                default:
                    // Unknown message — ignore
                    break;
            }
        });

        ws.on('close', () => {
            if (ws.userId) {
                sessionManager.removeConnection(ws.userId);
                console.log('[WS-Session] User', ws.userId, 'disconnected');
            }
        });

        ws.on('error', (err) => {
            console.error('[WS-Session] Error:', err.message);
        });
    });

    console.log('[WS-Session] Session WebSocket handler installed');
    return sessionManager; // expose for server.js use
}
