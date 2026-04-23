/**
 * ZAGEL Priority Engine v2.0.0
 * Smart scoring system: urgency, financial, emotional, social weights
 * Decides what deserves user attention and when
 */

(function () {
  'use strict';
  if (window.__ZAGEL_PRIORITY__) return;

  const WEIGHTS = {
    urgency: 0.30,
    financial: 0.25,
    emotional: 0.20,
    social: 0.15,
    freshness: 0.10
  };

  const URGENCY_KEYWORDS_AR = ['عاجل', 'مهم', 'فوري', 'خطير', 'تحذير', 'طوارئ', 'الآن'];
  const FINANCIAL_KEYWORDS_AR = ['سعر', 'ذهب', 'دولار', 'فلوس', 'تحويل', 'رصيد', 'بنك', 'دفع'];

  class ZagelPriorityEngine {
    constructor() {
      this._queue = [];
      this._maxQueue = 100;
      console.log('⚡ [Zagel-Priority] Engine initialized');
    }

    score(item) {
      const scores = {
        urgency: this._scoreUrgency(item),
        financial: this._scoreFinancial(item),
        emotional: this._scoreEmotional(item),
        social: this._scoreSocial(item),
        freshness: this._scoreFreshness(item)
      };

      let total = 0;
      for (const [key, weight] of Object.entries(WEIGHTS)) {
        total += (scores[key] || 0) * weight;
      }

      return {
        total: Math.round(total * 100) / 100,
        breakdown: scores,
        level: total > 0.8 ? 'critical' : total > 0.6 ? 'high' : total > 0.4 ? 'medium' : 'low'
      };
    }

    _scoreUrgency(item) {
      let score = 0;
      const text = (item.text || item.content || '').toLowerCase();

      // Keyword matching
      for (const kw of URGENCY_KEYWORDS_AR) {
        if (text.includes(kw)) { score += 0.3; break; }
      }

      // Explicit urgency flag
      if (item.urgent || item.priority === 'high') score += 0.5;

      // Sender importance
      if (item.senderTrust && item.senderTrust > 0.8) score += 0.2;

      return Math.min(score, 1);
    }

    _scoreFinancial(item) {
      let score = 0;
      const text = (item.text || item.content || '').toLowerCase();

      for (const kw of FINANCIAL_KEYWORDS_AR) {
        if (text.includes(kw)) { score += 0.25; }
      }

      if (item.type === 'financial' || item.category === 'finance') score += 0.5;
      if (item.amount && item.amount > 1000) score += 0.3;

      return Math.min(score, 1);
    }

    _scoreEmotional(item) {
      let score = 0;

      if (item.emotion) {
        const emotionMap = { happy: 0.3, sad: 0.6, angry: 0.7, anxious: 0.8, excited: 0.4, lonely: 0.9 };
        score += emotionMap[item.emotion] || 0.3;
      }

      if (item.socialGap) score += 0.4;
      if (item.missedContact) score += 0.3;

      return Math.min(score, 1);
    }

    _scoreSocial(item) {
      let score = 0;

      if (item.isGroup) score += 0.2;
      if (item.mentions && item.mentions > 0) score += 0.3;
      if (item.replyTo) score += 0.2;
      if (item.isDirectMessage) score += 0.4;
      if (item.contactFrequency && item.contactFrequency < 0.3) score += 0.3; // rare contact

      return Math.min(score, 1);
    }

    _scoreFreshness(item) {
      if (!item.timestamp) return 0.5;
      const ageMs = Date.now() - item.timestamp;
      const ageMinutes = ageMs / 60000;

      if (ageMinutes < 1) return 1;
      if (ageMinutes < 5) return 0.9;
      if (ageMinutes < 30) return 0.7;
      if (ageMinutes < 60) return 0.5;
      if (ageMinutes < 360) return 0.3;
      return 0.1;
    }

    enqueue(item) {
      const scored = { ...item, _priority: this.score(item) };
      this._queue.push(scored);
      this._queue.sort((a, b) => b._priority.total - a._priority.total);
      if (this._queue.length > this._maxQueue) this._queue.pop();

      if (window.ZagelBus) {
        window.ZagelBus.emit('priority:scored', { item: scored, score: scored._priority });
      }

      return scored._priority;
    }

    dequeue() {
      return this._queue.shift() || null;
    }

    peek(count = 5) {
      return this._queue.slice(0, count);
    }

    getQueue() {
      return [...this._queue];
    }

    clear() {
      this._queue = [];
    }

    setWeight(key, value) {
      if (WEIGHTS[key] !== undefined) {
        WEIGHTS[key] = Math.max(0, Math.min(1, value));
        // Re-normalize
        const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
        for (const k of Object.keys(WEIGHTS)) WEIGHTS[k] /= sum;
      }
    }

    destroy() {
      this._queue = [];
      delete window.__ZAGEL_PRIORITY__;
    }
  }

  window.__ZAGEL_PRIORITY__ = new ZagelPriorityEngine();
  window.ZagelPriority = window.__ZAGEL_PRIORITY__;
})();
