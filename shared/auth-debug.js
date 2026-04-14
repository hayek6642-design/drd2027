/**
 * Auth Debug Logger
 * Temporary for refactor verification
 */

function logAuthEvent(event, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    data,
    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
  };
  
  console.log(`[AuthDebug] ${event}:`, data);
  
  // Store last 50 events
  if (typeof localStorage !== 'undefined') {
    const logs = JSON.parse(localStorage.getItem('auth_debug_logs') || '[]');
    logs.push(logEntry);
    if (logs.length > 50) logs.shift();
    localStorage.setItem('auth_debug_logs', JSON.stringify(logs));
  }
}

function getAuthLogs() {
  if (typeof localStorage === 'undefined') return [];
  return JSON.parse(localStorage.getItem('auth_debug_logs') || '[]');
}

function clearAuthLogs() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('auth_debug_logs');
  }
}

function printAuthLogs() {
  const logs = getAuthLogs();
  console.table(logs);
}

// Auto-log session changes
if (typeof window !== 'undefined' && typeof addEventListener !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'zagelsession') {
      logAuthEvent('session_changed', {
        oldValue: e.oldValue ? JSON.parse(e.oldValue) : null,
        newValue: e.newValue ? JSON.parse(e.newValue) : null
      });
    }
  });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { logAuthEvent, getAuthLogs, clearAuthLogs, printAuthLogs };
} else if (typeof window !== 'undefined') {
  window.authDebug = { logAuthEvent, getAuthLogs, clearAuthLogs, printAuthLogs };
}
