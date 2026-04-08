
const riskStore = new Map(); // In-memory risk tracking (volatile, but fast)
// In a production environment with multiple instances, use Redis.

const WATCHDOG_CONFIG = {
  FREEZE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  VELOCITY_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  MAX_TRANSFERS_PER_WINDOW: 20,
  MAX_FAILED_ATTEMPTS: 5,
  RISK_THRESHOLD_CHALLENGE: 0.6,
  RISK_THRESHOLD_FREEZE: 0.8,
  RISK_THRESHOLD_BLOCK: 0.95,
  TRUST_RECOVERY_RATE: 0.05, // Risk reduction per hour of inactivity
};

class WatchdogAI {
  constructor() {}

  /**
   * Evaluates the risk level of a user based on their recent behavior history.
   * @param {string} userId - The ID of the user to analyze.
   * @returns {Object} - Risk evaluation result { score, decision, reason }
   */
  evaluateRisk(userId) {
    const data = this._getUserData(userId);
    let riskScore = 0;
    let reasons = [];

    // 1. Velocity Analysis (Spam/Scripting detection)
    const recentTransfers = data.history.filter(t => (Date.now() - t.timestamp) < WATCHDOG_CONFIG.VELOCITY_WINDOW_MS);
    const velocity = recentTransfers.length / WATCHDOG_CONFIG.MAX_TRANSFERS_PER_WINDOW;
    if (velocity > 0.5) {
      riskScore += velocity * 0.4;
      reasons.push(`High transfer velocity: ${recentTransfers.length} in 1hr`);
    }

    // 2. Failed Attempts Analysis (Brute-force/Probing detection)
    const failedCount = data.failedAttempts || 0;
    if (failedCount > 0) {
      const failureRisk = (failedCount / WATCHDOG_CONFIG.MAX_FAILED_ATTEMPTS) * 0.5;
      riskScore += failureRisk;
      reasons.push(`Recent failed attempts: ${failedCount}`);
    }

    // 3. Temporary Freeze Check
    if (data.frozenUntil && data.frozenUntil > Date.now()) {
      return {
        score: 1.0,
        decision: 'FREEZE',
        reason: 'User is currently in a temporary cool-down period.',
        remainingMs: data.frozenUntil - Date.now()
      };
    }

    // 4. Trust Recovery (Decay risk over time)
    const hoursSinceLastAction = (Date.now() - (data.lastActionAt || Date.now())) / (1000 * 60 * 60);
    const recovery = hoursSinceLastAction * WATCHDOG_CONFIG.TRUST_RECOVERY_RATE;
    riskScore = Math.max(0, riskScore - recovery);

    // 5. Final Decision
    let decision = 'ALLOW';
    if (riskScore >= WATCHDOG_CONFIG.RISK_THRESHOLD_BLOCK) {
      decision = 'BLOCK';
    } else if (riskScore >= WATCHDOG_CONFIG.RISK_THRESHOLD_FREEZE) {
      decision = 'FREEZE';
      this.freezeUser(userId);
    } else if (riskScore >= WATCHDOG_CONFIG.RISK_THRESHOLD_CHALLENGE) {
      decision = 'CHALLENGE';
    }

    return {
      score: Math.min(1.0, riskScore),
      decision,
      reasons: reasons.join('; ') || 'Normal behavior'
    };
  }

  /**
   * Tracks a successful action for the user.
   */
  trackSuccess(userId, actionType) {
    const data = this._getUserData(userId);
    data.history.push({ type: actionType, timestamp: Date.now() });
    data.lastActionAt = Date.now();
    data.failedAttempts = Math.max(0, (data.failedAttempts || 0) - 1); // Slow recovery on success
    
    // Trim history to prevent memory leaks
    if (data.history.length > 100) data.history.shift();
    
    riskStore.set(userId, data);
    console.log(`[WATCHDOG] [TRACK] Success for ${userId}. Action: ${actionType}`);
  }

  /**
   * Tracks a failed attempt for the user.
   */
  trackFailure(userId, errorType) {
    const data = this._getUserData(userId);
    data.failedAttempts = (data.failedAttempts || 0) + 1;
    data.lastActionAt = Date.now();
    
    riskStore.set(userId, data);
    console.warn(`[WATCHDOG] [TRACK] Failure for ${userId}. Error: ${errorType}`);
  }

  /**
   * Temporarily freezes a user for suspicious activity.
   */
  freezeUser(userId) {
    const data = this._getUserData(userId);
    data.frozenUntil = Date.now() + WATCHDOG_CONFIG.FREEZE_DURATION_MS;
    riskStore.set(userId, data);
    console.error(`[WATCHDOG] [ACTION] User ${userId} FROZEN for ${WATCHDOG_CONFIG.FREEZE_DURATION_MS / 60000} minutes.`);
  }

  _getUserData(userId) {
    if (!riskStore.has(userId)) {
      riskStore.set(userId, {
        history: [],
        failedAttempts: 0,
        frozenUntil: null,
        lastActionAt: null
      });
    }
    return riskStore.get(userId);
  }
}

export default new WatchdogAI();
