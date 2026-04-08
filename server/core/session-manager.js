/**
 * session-manager.js
 * Tracks live WebSocket connections per user and provides helpers
 * for real-time session notifications (force-logout, conflict, etc.).
 *
 * Works ALONGSIDE the existing devSessions + active_device_sessions system —
 * it does NOT replace the existing auth flow.
 *
 * ES Module — compatible with server.js ("type": "module")
 */

// userId (string) → { ws, sessionToken, deviceType, deviceName, lastActive }
const _connections = new Map();

// ── Registration ────────────────────────────────────────────────────────────

/**
 * Register (or update) the WebSocket connection for a user.
 */
export function registerConnection(userId, ws, sessionToken, deviceType, deviceName) {
    _connections.set(String(userId), {
        ws,
        sessionToken,
        deviceType: deviceType || 'unknown',
        deviceName: deviceName || 'Unknown Device',
        lastActive: Date.now()
    });
}

/**
 * Remove the WebSocket connection for a user (on disconnect).
 */
export function removeConnection(userId) {
    _connections.delete(String(userId));
}

/**
 * Look up connection info for a user.
 */
export function getConnection(userId) {
    return _connections.get(String(userId)) || null;
}

/**
 * Update last-active timestamp (called on heartbeat / pong).
 */
export function touchConnection(userId) {
    const c = _connections.get(String(userId));
    if (c) c.lastActive = Date.now();
}

// ── Notifications ────────────────────────────────────────────────────────────

/**
 * Send a JSON message to a connected user.
 * Returns true if sent successfully.
 */
export function notifyUser(userId, message) {
    const c = _connections.get(String(userId));
    if (!c || !c.ws || c.ws.readyState !== 1 /* OPEN */) return false;
    try {
        c.ws.send(JSON.stringify(message));
        return true;
    } catch (e) {
        console.error('[SessionManager] send error for user', userId, ':', e.message);
        return false;
    }
}

/**
 * Send a FORCE_LOGOUT message to a user's active WebSocket connection.
 * Called when another device takes over the session.
 */
export function forceLogout(userId, reason, newDevice) {
    const reasonMessages = {
        new_login : `Your account was opened on ${newDevice || 'another device'}. You've been signed out here.`,
        timeout   : 'Your session expired due to inactivity.',
        manual    : 'You were signed out manually.',
        security  : 'Your session was terminated for security reasons.'
    };
    return notifyUser(String(userId), {
        type      : 'FORCE_LOGOUT',
        reason,
        newDevice : newDevice || null,
        message   : reasonMessages[reason] || 'Your session was terminated.',
        timestamp : Date.now()
    });
}

/**
 * Send a SESSION_CONFLICT message to a user —
 * prompts their existing device to show the conflict dialog.
 */
export function notifyConflict(existingUserId, newDeviceType) {
    return notifyUser(String(existingUserId), {
        type      : 'SESSION_CONFLICT',
        newDevice : newDeviceType || 'another device',
        message   : 'A new device is trying to open your account.',
        timestamp : Date.now()
    });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function getActiveCount() {
    return _connections.size;
}

export function getAllConnections() {
    const result = [];
    for (const [userId, c] of _connections) {
        result.push({
            userId,
            deviceType : c.deviceType,
            deviceName : c.deviceName,
            lastActive : c.lastActive,
            connected  : c.ws && c.ws.readyState === 1
        });
    }
    return result;
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Remove connections that have not sent a heartbeat for `timeoutMs` ms.
 * Default: 10 minutes.
 */
export function cleanupStale(timeoutMs = 10 * 60 * 1000) {
    const cutoff = Date.now() - timeoutMs;
    for (const [userId, c] of _connections) {
        if (c.lastActive < cutoff) {
            console.log('[SessionManager] Removing stale connection for user', userId);
            _connections.delete(userId);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(() => cleanupStale(), 5 * 60 * 1000);
