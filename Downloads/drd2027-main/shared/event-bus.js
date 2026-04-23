// event-bus.js
// Global Event Bus for decoupled communication
window.EventBus = {
  events: {},

  on(event, handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
    return () => this.off(event, handler);
  },

  off(event, handler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(fn => fn !== handler);
  },

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(fn => {
        try {
          fn(data);
        } catch (e) {
          console.error(`[EventBus] Error in handler for ${event}:`, e);
        }
      });
    }
  }
};
