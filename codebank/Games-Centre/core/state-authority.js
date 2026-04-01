/**
 * State Authority
 * Central State Machine for game lifecycle management
 */

class StateAuthority {
  constructor() {
    this.states = {
      IDLE: 'IDLE',
      LOADING: 'LOADING',
      READY: 'READY',
      RUNNING: 'RUNNING',
      PAUSED: 'PAUSED',
      COMPLETED: 'COMPLETED',
      ERROR: 'ERROR'
    };

    this.currentState = this.states.IDLE;
    this.previousState = null;
    this.stateHistory = [];
    this.transitionListeners = new Map();
  }

  /**
   * Transition to a new state
   */
  transitionTo(newState, context = {}) {
    if (!this.states[newState]) {
      throw new Error(`Invalid state: ${newState}`);
    }

    console.log(`[StateAuthority] Transitioning from ${this.currentState} to ${newState}`);

    // Store previous state
    this.previousState = this.currentState;

    // Update current state
    this.currentState = newState;

    // Record in history
    this.stateHistory.push({
      from: this.previousState,
      to: newState,
      timestamp: Date.now(),
      context
    });

    // Emit transition event
    this.emit('state:transition', {
      from: this.previousState,
      to: newState,
      context
    });

    // Emit specific state event
    this.emit(`state:${newState}`, context);
  }

  /**
   * Get current state
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Get previous state
   */
  getPreviousState() {
    return this.previousState;
  }

  /**
   * Get state history
   */
  getStateHistory() {
    return [...this.stateHistory];
  }

  /**
   * Check if in specific state
   */
  isInState(state) {
    return this.currentState === state;
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.transitionTo(this.states.IDLE, { reason: 'reset' });
  }

  /**
   * Event system
   */
  on(event, handler) {
    if (!this.transitionListeners.has(event)) {
      this.transitionListeners.set(event, []);
    }
    this.transitionListeners.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.transitionListeners.get(event) || [];
    handlers.forEach(handler => handler(data));

    // Also emit as DOM event
    window.dispatchEvent(new CustomEvent(`state-authority:${event}`, {
      detail: data
    }));
  }

  /**
   * Handle error state
   */
  handleError(error, context = {}) {
    console.error(`[StateAuthority] Error occurred:`, error);

    this.transitionTo(this.states.ERROR, {
      error: error.message || String(error),
      ...context
    });

    // Attempt recovery after error
    setTimeout(() => {
      if (this.currentState === this.states.ERROR) {
        this.emit('state:recovery-attempt', { error });
      }
    }, 5000);
  }
}

// Singleton instance
const stateAuthority = new StateAuthority();
export default stateAuthority;