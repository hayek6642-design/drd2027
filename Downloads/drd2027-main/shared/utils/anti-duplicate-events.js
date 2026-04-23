// Anti-Duplicate Event System
// Prevents duplicate event bindings and callbacks
window.SafeEvent = {
  once(key, fn) {
    if (window[`__EVENT_${key}`]) return;
    window[`__EVENT_${key}`] = true;
    fn();
  },

  // Additional helper to check if event has been bound
  has(key) {
    return !!window[`__EVENT_${key}`];
  },

  // Helper to reset event state (for debugging purposes)
  reset(key) {
    window[`__EVENT_${key}`] = false;
  }
};

console.log('[SafeEvent] Anti-Duplicate Event System initialized');
