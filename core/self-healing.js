/**
 * Self-Healing Engine - Proactive System Repair
 * Monitors system health and automatically fixes broken states.
 */

class SelfHealingEngine {
  constructor() {
    if (window.__SELF_HEALING__) {
      return window.__SELF_HEALING__
    }

    this.rules = []
    this.cooldowns = new Map()
    window.__HEALTH_LOG__ = []

    window.__SELF_HEALING__ = this
    this._setupGlobalDebug()
  }

  /**
   * Register a healing rule
   * @param {string} name - Unique name of the rule
   * @param {function} check - Async function that returns true if system is broken
   * @param {function} fix - Async function to repair the system
   * @param {number} cooldown - Minimum time between repairs (ms)
   */
  registerRule(name, check, fix, cooldown = 10000) {
    this.rules.push({ name, check, fix, cooldown })
  }

  /**
   * Log health issues to a global list
   * @param {string} issue 
   * @param {string} ruleName 
   */
  logHealth(issue, ruleName) {
    window.__HEALTH_LOG__.push({
      rule: ruleName,
      issue,
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now()
    })
    
    // Keep log manageable
    if (window.__HEALTH_LOG__.length > 100) {
      window.__HEALTH_LOG__.shift()
    }
  }

  /**
   * Run all registered checks and fixes
   */
  async run() {
    for (const rule of this.rules) {
      const now = Date.now()
      const lastRun = this.cooldowns.get(rule.name) || 0

      if (now - lastRun < rule.cooldown) continue

      try {
        const isBroken = await rule.check()

        if (isBroken) {
          console.warn(`🛠️ [SelfHealing] Fixing: ${rule.name}`)
          this.logHealth("Broken state detected", rule.name)
          
          await rule.fix()
          
          this.cooldowns.set(rule.name, now)
        }

      } catch (e) {
        console.error(`❌ [SelfHealing] Rule failed: ${rule.name}`, e)
        this.logHealth(`Error in rule: ${e.message}`, rule.name)
      }
    }
  }

  /**
   * Setup global debug helper
   */
  _setupGlobalDebug() {
    window.__HEALTH_REPORT__ = () => {
      console.table(window.__HEALTH_LOG__)
    }
  }
}

export const SelfHealing = new SelfHealingEngine()
