// ===============================
// 🔐 SESSION MANAGER - Guest to User Flow
// ===============================

class SessionManager {
  constructor() {
    this.session = null
    this.listeners = new Map()
    this.initSession()
  }

  initSession() {
    const stored = localStorage.getItem('zagel_session')
    
    if (!stored) {
      // Create guest session
      this.session = {
        id: 'guest_' + Date.now(),
        type: 'guest',
        userId: null,
        createdAt: Date.now(),
        lastActivity: Date.now()
      }
      this.saveSession()
      console.log('[SessionManager] Created guest session:', this.session.id)
    } else {
      this.session = JSON.parse(stored)
      this.session.lastActivity = Date.now()
      this.saveSession()
      console.log('[SessionManager] Restored session:', this.session.id)
    }
  }

  saveSession() {
    localStorage.setItem('zagel_session', JSON.stringify(this.session))
    this.emit('session:updated', this.session)
  }

  upgradeToUser(userId, userData = {}) {
    console.log('[SessionManager] Upgrading to user:', userId)
    
    this.session = {
      ...this.session,
      type: 'user',
      userId,
      userData,
      upgradedAt: Date.now()
    }
    
    this.saveSession()
    this.emit('session:upgraded', this.session)
    
    return this.session
  }

  getSession() {
    return { ...this.session }
  }

  isGuest() {
    return this.session.type === 'guest'
  }

  isAuthenticated() {
    return this.session.type === 'user' && this.session.userId
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
    
    return () => {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) callbacks.splice(index, 1)
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data))
    }
  }

  logout() {
    localStorage.removeItem('zagel_session')
    this.initSession()
    this.emit('session:logout', null)
  }
}

export const sessionManager = new SessionManager()
