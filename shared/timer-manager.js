// timer-manager.js
// Centralized timer management to prevent memory leaks and interval drifts
window.TimerManager = {
  timers: new Set(),

  setInterval(fn, t) {
    const id = setInterval(fn, t);
    this.timers.add(id);
    return id;
  },

  setTimeout(fn, t) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, t);
    this.timers.add(id);
    return id;
  },

  clearInterval(id) {
    clearInterval(id);
    this.timers.delete(id);
  },

  clearTimeout(id) {
    clearTimeout(id);
    this.timers.delete(id);
  },

  clearAll() {
    this.timers.forEach(id => {
      clearInterval(id);
      clearTimeout(id);
    });
    this.timers.clear();
    console.log('[TimerManager] All timers cleared.');
  }
};
