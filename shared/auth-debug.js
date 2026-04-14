// ===============================
// 🔍 AUTH DEBUG LOGGING
// ===============================

const authEvents = []

export class AuthDebugger {
  static log(event, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent.substring(0, 50)
    }
    
    authEvents.push(entry)
    console.log('[AuthDebug]', event, details)
    
    // Keep last 100 events
    if (authEvents.length > 100) {
      authEvents.shift()
    }
    
    // Store in sessionStorage for debugging
    sessionStorage.setItem('auth_debug_log', JSON.stringify(authEvents))
  }

  static getLog() {
    return [...authEvents]
  }

  static clearLog() {
    authEvents.length = 0
    sessionStorage.removeItem('auth_debug_log')
  }

  static exportLog() {
    return JSON.stringify(authEvents, null, 2)
  }
}

// Global error handler for auth issues
window.addEventListener('error', (event) => {
  if (event.message.includes('auth') || event.message.includes('Auth')) {
    AuthDebugger.log('error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno
    })
  }
})

// Monitor unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.includes?.('auth') || event.reason?.message?.includes?.('auth')) {
    AuthDebugger.log('unhandled_rejection', {
      reason: String(event.reason)
    })
  }
})

export default AuthDebugger
