/**
 * ZAGEL Brain v2.0.0
 * AI decision engine: behavior learning, creator tracking, smart suggestions
 * Integrates with intelligence, priority, and emotion engines
 */

(function () {
  'use strict';
  if (window.__ZAGEL_BRAIN__) return;

  class ZagelBrain {
    constructor() {
      this._patterns = [];
      this._decisions = [];
      this._userProfile = { interests: {}, habits: {}, lastActions: [] };
      this._thresholds = {
        suggestionConfidence: 0.6,
        patternMinOccurrences: 3,
        decisionCooldownMs: 30000
      };
      this._lastDecisionTs = {};

      console.log('🧠 [Zagel-Brain] Online');
    }

    observe(action, context = {}) {
      const entry = { action, context, ts: Date.now() };
      this._userProfile.lastActions.push(entry);
      if (this._userProfile.lastActions.length > 200) {
        this._userProfile.lastActions.shift();
      }

      // Track interests
      if (context.category) {
        this._userProfile.interests[context.category] = 
          (this._userProfile.interests[context.category] || 0) + 1;
      }

      // Track habits (time of day patterns)
      const hour = new Date().getHours();
      const timeSlot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      this._userProfile.habits[timeSlot] = (this._userProfile.habits[timeSlot] || 0) + 1;

      // Detect patterns
      this._detectPatterns();

      if (window.ZagelBus) {
        window.ZagelBus.emit('brain:observed', entry);
      }
    }

    _detectPatterns() {
      const actions = this._userProfile.lastActions;
      if (actions.length < 5) return;

      const recent = actions.slice(-20);
      const sequences = {};

      for (let i = 0; i < recent.length - 1; i++) {
        const seq = `${recent[i].action}->${recent[i + 1].action}`;
        sequences[seq] = (sequences[seq] || 0) + 1;
      }

      for (const [seq, count] of Object.entries(sequences)) {
        if (count >= this._thresholds.patternMinOccurrences) {
          const existing = this._patterns.find(p => p.sequence === seq);
          if (existing) {
            existing.count = count;
            existing.lastSeen = Date.now();
          } else {
            this._patterns.push({ sequence: seq, count, firstSeen: Date.now(), lastSeen: Date.now() });
          }
        }
      }
    }

    suggest(currentContext = {}) {
      const suggestions = [];

      // Pattern-based suggestions
      const currentAction = currentContext.action || this._userProfile.lastActions.slice(-1)[0]?.action;
      if (currentAction) {
        for (const pattern of this._patterns) {
          if (pattern.sequence.startsWith(currentAction + '->')) {
            const nextAction = pattern.sequence.split('->')[1];
            const confidence = Math.min(pattern.count / 10, 1);
            if (confidence >= this._thresholds.suggestionConfidence) {
              suggestions.push({
                type: 'pattern',
                action: nextAction,
                confidence,
                reason: `أنت عادةً تفعل "${nextAction}" بعد "${currentAction}"`,
                reasonEn: `You usually do "${nextAction}" after "${currentAction}"`
              });
            }
          }
        }
      }

      // Time-based suggestions
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 9) {
        suggestions.push({ type: 'time', action: 'check_news', confidence: 0.7, reason: 'صباح الخير! تحب تشوف الأخبار الصبح؟' });
      } else if (hour >= 21) {
        suggestions.push({ type: 'time', action: 'daily_summary', confidence: 0.6, reason: 'ملخص يومك جاهز' });
      }

      // Interest-based
      const topInterests = Object.entries(this._userProfile.interests)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      for (const [category, count] of topInterests) {
        if (count > 5) {
          suggestions.push({
            type: 'interest',
            action: `explore_${category}`,
            confidence: Math.min(count / 20, 0.9),
            reason: `عندك اهتمام كبير بـ "${category}"`
          });
        }
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    }

    decide(situation) {
      const now = Date.now();

      // Cooldown check
      if (this._lastDecisionTs[situation.type] && 
          now - this._lastDecisionTs[situation.type] < this._thresholds.decisionCooldownMs) {
        return { action: 'wait', reason: 'Cooldown active' };
      }

      let decision = { action: 'ignore', reason: 'No action needed', confidence: 0 };

      // Get priority score if available
      const priority = window.ZagelPriority ? window.ZagelPriority.score(situation) : null;

      if (priority && priority.level === 'critical') {
        decision = { action: 'notify_urgent', reason: 'Critical priority item', confidence: 0.95 };
      } else if (priority && priority.level === 'high') {
        decision = { action: 'notify', reason: 'High priority item', confidence: 0.8 };
      } else if (situation.type === 'social_gap') {
        decision = { action: 'nudge', reason: 'Social gap detected', confidence: 0.7 };
      } else if (situation.type === 'price_alert') {
        decision = { action: 'alert', reason: 'Price threshold crossed', confidence: 0.85 };
      }

      this._lastDecisionTs[situation.type] = now;
      this._decisions.push({ situation, decision, ts: now });
      if (this._decisions.length > 100) this._decisions.shift();

      if (window.ZagelBus) {
        window.ZagelBus.emit('brain:decision', { situation, decision });
      }

      return decision;
    }

    getProfile() {
      return { ...this._userProfile };
    }

    getPatterns() {
      return [...this._patterns];
    }

    getDecisionHistory() {
      return [...this._decisions];
    }

    async save() {
      if (window.ZagelStore) {
        await window.ZagelStore.set('brain_profile', this._userProfile);
        await window.ZagelStore.set('brain_patterns', this._patterns);
      }
    }

    async load() {
      if (window.ZagelStore) {
        const profile = await window.ZagelStore.get('brain_profile');
        if (profile) this._userProfile = profile;
        const patterns = await window.ZagelStore.get('brain_patterns');
        if (patterns) this._patterns = patterns;
      }
    }

    destroy() {
      this._patterns = [];
      this._decisions = [];
      this._userProfile = { interests: {}, habits: {}, lastActions: [] };
      delete window.__ZAGEL_BRAIN__;
    }
  }

  window.__ZAGEL_BRAIN__ = new ZagelBrain();
  window.ZagelBrain = window.__ZAGEL_BRAIN__;
})();
