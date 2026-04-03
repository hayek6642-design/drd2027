/**
 * AI Brain - Behavior Analyzer & Decision Engine
 * Transforms simple rules into intelligent system management.
 */

class AIBrain {
  constructor() {
    if (window.__AI_BRAIN__) return window.__AI_BRAIN__

    this.history = []
    this.state = {}
    this.thresholds = {
      apiFlood: 5,
      ytFailures: 3,
      authFlaps: 3
    }

    // [FIX] Cooldown tracking to prevent decision loops
    this._cooldowns = {
      RESET_API:      { lastAt: 0, count: 0, windowMs: 30000, maxPerWindow: 3 },
      RESTART_YT:     { lastAt: 0, count: 0, windowMs: 30000, maxPerWindow: 3 },
      STABILIZE_AUTH: { lastAt: 0, count: 0, windowMs: 30000, maxPerWindow: 3 }
    }

    // [FIX] Error-record throttle (per source)
    this._recordThrottle = {}

    window.__AI_BRAIN__ = this
  }

  /**
   * Record a system event for analysis
   * @param {string} event - Event name (e.g., 'api:error', 'yt:fail')
   * @param {object} data - Metadata about the event
   */
  record(event, data = {}) {
    // [FIX] Throttle: skip if same event recorded within 5 s
    const now = Date.now()
    const key = event + (data.source || '')
    if (this._recordThrottle[key] && now - this._recordThrottle[key] < 5000) {
      return
    }
    this._recordThrottle[key] = now

    this.history.push({ event, data, ts: now })

    // Keep history focused on recent patterns
    if (this.history.length > 100) {
      this.history.shift()
    }

    console.log(`🧠 [AI-Brain] Recorded: ${event}`, data)
  }

  /**
   * Analyze recent behavior patterns
   */
  analyze() {
    const recent = this.history.slice(-20)

    const stats = {
      apiErrors: 0,
      ytFailures: 0,
      authChanges: 0
    }

    for (const e of recent) {
      if (e.event === "api:error") stats.apiErrors++
      if (e.event === "yt:fail")   stats.ytFailures++
      if (e.event === "auth:change") stats.authChanges++
    }

    return stats
  }

  /**
   * Make a decision based on analyzed stats
   * @param {object} stats
   */
  decide(stats) {
    if (stats.apiErrors > this.thresholds.apiFlood) {
      return "RESET_API"
    }

    if (stats.ytFailures > this.thresholds.ytFailures) {
      return "RESTART_YT"
    }

    if (stats.authChanges > this.thresholds.authFlaps) {
      return "STABILIZE_AUTH"
    }

    return "STABLE"
  }

  /**
   * [FIX] Check cooldown - returns true if decision is allowed to execute
   */
  _checkCooldown(decision) {
    const cd = this._cooldowns[decision]
    if (!cd) return true

    const now = Date.now()

    // Reset counter if outside the window
    if (now - cd.lastAt > cd.windowMs) {
      cd.count = 0
    }

    if (cd.count >= cd.maxPerWindow) {
      console.warn(`🧠 [AI-Brain] ${decision} blocked — ${cd.count}/${cd.maxPerWindow} in ${cd.windowMs / 1000}s window`)
      return false
    }

    cd.count++
    cd.lastAt = now
    return true
  }

  /**
   * [FIX] Flush history entries matching a given event type after acting on them
   */
  _flushHistoryEvent(eventName) {
    const before = this.history.length
    this.history = this.history.filter(e => e.event !== eventName)
    console.log(`🧠 [AI-Brain] Flushed ${before - this.history.length} "${eventName}" entries from history`)
  }

  /**
   * Execute the decided action
   * @param {string} decision
   */
  async act(decision) {
    if (decision === "STABLE") return

    // [FIX] Guard with cooldown before executing anything
    if (!this._checkCooldown(decision)) return

    console.log("🧠 [AI-Brain] Executing Decision:", decision)

    switch (decision) {
      case "RESET_API":
        window.__API_ERRORS__ = 0
        console.warn("🧠 [AI-Brain] API errors reset due to flooding pattern")
        // [FIX] Clear api:error history so next run() starts fresh
        this._flushHistoryEvent("api:error")
        break

      case "RESTART_YT":
        window.__YT_STARTED__ = false
        if (window.__APP_LIFECYCLE__) {
          console.warn("🧠 [AI-Brain] Restarting YouTube module due to repeated failures")
          await window.__APP_LIFECYCLE__.modules.get("yt")?.start()
        }
        // [FIX] Clear yt:fail history after acting
        this._flushHistoryEvent("yt:fail")
        break

      case "STABILIZE_AUTH":
        console.warn("🔐 [AI-Brain] Auth instability detected. Stabilizing auth state...")
        // [FIX] Clear auth:change history after acting
        this._flushHistoryEvent("auth:change")
        break
    }
  }

  /**
   * Run the brain cycle
   */
  async run() {
    const stats    = this.analyze()
    const decision = this.decide(stats)

    await this.act(decision)
  }
}

export const AIBrainEngine = new AIBrain()
