/**
 * Auth Session Manager - Handle session lifecycle
 * Manages creation, validation, expiry, and cleanup
 */

class SessionManager {
  constructor(defaultExpiry = 24 * 60 * 60 * 1000) {
    this.sessions = new Map();
    this.defaultExpiry = defaultExpiry; // 24 hours default
  }

  createSession(userId = null, sessionType = 'guest') {
    const sessionId = this.generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.defaultExpiry);

    const session = {
      id: sessionId,
      userId,
      sessionType,
      isActive: true,
      createdAt: now.toISOString(),
      lastActivity: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipAddress: '0.0.0.0',
      userAgent: 'unknown'
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  generateId() {
    return \`sess_\${Date.now()}_\${Math.random().toString(36).substr(2, 16)}\`;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  updateLastActivity(sessionId) {
    const session = this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      return session;
    }
    return null;
  }

  isSessionValid(sessionId) {
    const session = this.getSession(sessionId);
    if (!session || !session.isActive) return false;
    
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    return now < expiresAt;
  }

  terminateSession(sessionId) {
    const session = this.getSession(sessionId);
    if (session) {
      session.isActive = false;
      return true;
    }
    return false;
  }

  upgradeToUser(sessionId, userId, userEmail) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.userId = userId;
    session.userEmail = userEmail;
    session.sessionType = 'user';
    session.lastActivity = new Date().toISOString();

    return session;
  }

  cleanupExpiredSessions() {
    const now = new Date();
    let removed = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const expiresAt = new Date(session.expiresAt);
      if (now > expiresAt) {
        this.sessions.delete(sessionId);
        removed++;
      }
    }

    return { removed, remaining: this.sessions.size };
  }

  getAllSessions(filter = {}) {
    let sessions = Array.from(this.sessions.values());

    if (filter.isActive !== undefined) {
      sessions = sessions.filter(s => s.isActive === filter.isActive);
    }

    if (filter.sessionType) {
      sessions = sessions.filter(s => s.sessionType === filter.sessionType);
    }

    if (filter.userId) {
      sessions = sessions.filter(s => s.userId === filter.userId);
    }

    return sessions;
  }

  getStatistics() {
    const all = Array.from(this.sessions.values());
    const active = all.filter(s => s.isActive && this.isSessionValid(s.id));
    const guests = all.filter(s => s.sessionType === 'guest');
    const users = all.filter(s => s.sessionType === 'user');

    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
      guests: guests.length,
      users: users.length
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}
