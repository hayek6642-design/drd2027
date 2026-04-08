// system-state.js
// Centralized state for the entire Bankode ecosystem
window.SYSTEM_STATE = {
  mode: 'NORMAL', // NORMAL | EXTRA | CHALLENGE | REWARD_READY
  reward: null,
  challenge: null,
  watchdog: 'IDLE', // IDLE | ALERT | ACTIVE
  guardian: 'IDLE', // IDLE | WATCHING | ATTACK
  
  update(patch) {
    Object.assign(this, patch);
    if (window.EventBus) {
      window.EventBus.emit('STATE_CHANGED', this);
    }
  }
};
