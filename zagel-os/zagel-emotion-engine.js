/**
 * ZAGEL Emotion Engine v2.0.0
 * Social gap detection, relationship tracking, emotional nudges
 * Monitors contact frequency and triggers proactive care
 */

(function () {
  'use strict';
  if (window.__ZAGEL_EMOTION__) return;

  const GAP_THRESHOLD_DAYS = 7; // days without contact = social gap
  const DECAY_RATE = 0.05; // relationship strength decay per day

  class ZagelEmotionEngine {
    constructor() {
      this._contacts = {}; // contactId -> { name, lastContact, strength, history }
      this._currentMood = 'neutral';
      this._moodHistory = [];
      this._nudgeQueue = [];

      console.log('💖 [Zagel-Emotion] Engine initialized');
    }

    trackContact(contactId, data = {}) {
      const now = Date.now();
      if (!this._contacts[contactId]) {
        this._contacts[contactId] = {
          name: data.name || contactId,
          firstContact: now,
          lastContact: now,
          strength: 0.5,
          totalInteractions: 0,
          history: [],
          tags: data.tags || []
        };
      }

      const contact = this._contacts[contactId];
      contact.lastContact = now;
      contact.totalInteractions++;
      contact.history.push({ ts: now, type: data.type || 'message', sentiment: data.sentiment || 'neutral' });
      if (contact.history.length > 100) contact.history.shift();

      // Strengthen relationship
      contact.strength = Math.min(1, contact.strength + 0.05);

      if (window.ZagelBus) {
        window.ZagelBus.emit('emotion:contact', { contactId, contact });
      }
    }

    detectSocialGaps() {
      const gaps = [];
      const now = Date.now();

      for (const [contactId, contact] of Object.entries(this._contacts)) {
        const daysSince = (now - contact.lastContact) / (1000 * 60 * 60 * 24);

        if (daysSince >= GAP_THRESHOLD_DAYS) {
          // Apply decay
          contact.strength = Math.max(0, contact.strength - (daysSince * DECAY_RATE));

          gaps.push({
            contactId,
            name: contact.name,
            daysSince: Math.round(daysSince),
            strength: Math.round(contact.strength * 100) / 100,
            urgency: daysSince > 30 ? 'high' : daysSince > 14 ? 'medium' : 'low',
            suggestion: this._generateNudge(contact, daysSince)
          });
        }
      }

      gaps.sort((a, b) => b.daysSince - a.daysSince);

      if (gaps.length > 0 && window.ZagelBus) {
        window.ZagelBus.emit('emotion:social_gaps', { gaps, count: gaps.length });
      }

      return gaps;
    }

    _generateNudge(contact, daysSince) {
      const name = contact.name;
      if (daysSince > 30) {
        return { ar: `وحشتنا ${name}! مر عليك وقت طويل بدون ما تتواصل`, en: `You haven't talked to ${name} in over a month` };
      }
      if (daysSince > 14) {
        return { ar: `${name} ممكن يكون محتاجك. تحب تبعتله رسالة؟`, en: `${name} might need you. Send a message?` };
      }
      return { ar: `تحب تطمن على ${name}؟`, en: `Want to check on ${name}?` };
    }

    setMood(mood, reason = '') {
      const validMoods = ['happy', 'sad', 'angry', 'anxious', 'excited', 'neutral', 'lonely', 'grateful', 'frustrated'];
      if (!validMoods.includes(mood)) {
        console.warn(`💖 [Zagel-Emotion] Invalid mood: ${mood}`);
        return;
      }

      this._currentMood = mood;
      this._moodHistory.push({ mood, reason, ts: Date.now() });
      if (this._moodHistory.length > 50) this._moodHistory.shift();

      if (window.ZagelBus) {
        window.ZagelBus.emit('emotion:mood_change', { mood, reason });
      }

      // Proactive response to negative moods
      if (['sad', 'lonely', 'anxious'].includes(mood)) {
        this._generateEmotionalSupport(mood);
      }
    }

    _generateEmotionalSupport(mood) {
      const responses = {
        sad: { ar: 'أنا هنا لو محتاج حد يسمعك 💙', en: "I'm here if you need someone to listen 💙" },
        lonely: { ar: 'مش لوحدك. تحب نشوف مين أقرب ناس ليك؟', en: "You're not alone. Want to see who's closest to you?" },
        anxious: { ar: 'خد نفس عميق. كل حاجة هتبقى تمام 🌿', en: 'Take a deep breath. Everything will be okay 🌿' }
      };

      const support = responses[mood];
      if (support) {
        this._nudgeQueue.push({ type: 'emotional_support', mood, message: support, ts: Date.now() });
        if (window.ZagelBus) {
          window.ZagelBus.emit('emotion:support', support);
        }
      }
    }

    getMood() { return this._currentMood; }
    getMoodHistory() { return [...this._moodHistory]; }
    getNudges() { return [...this._nudgeQueue]; }

    getRelationshipReport() {
      const contacts = Object.entries(this._contacts).map(([id, c]) => ({
        id,
        name: c.name,
        strength: c.strength,
        totalInteractions: c.totalInteractions,
        daysSinceContact: Math.round((Date.now() - c.lastContact) / (1000 * 60 * 60 * 24)),
        tags: c.tags
      }));

      return {
        totalContacts: contacts.length,
        strongRelationships: contacts.filter(c => c.strength > 0.7).length,
        atRisk: contacts.filter(c => c.strength < 0.3).length,
        contacts: contacts.sort((a, b) => b.strength - a.strength)
      };
    }

    analyzeSentiment(text) {
      const positiveWords = ['حلو', 'جميل', 'ممتاز', 'شكرا', 'حب', 'سعيد', 'فرح', 'تمام', 'رائع'];
      const negativeWords = ['وحش', 'زعلان', 'تعبان', 'مش كويس', 'زهقت', 'حزين', 'قلقان', 'خايف'];

      let score = 0;
      const lower = text.toLowerCase();

      for (const w of positiveWords) if (lower.includes(w)) score += 0.2;
      for (const w of negativeWords) if (lower.includes(w)) score -= 0.2;

      return {
        score: Math.max(-1, Math.min(1, score)),
        label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'
      };
    }

    async save() {
      if (window.ZagelStore) {
        await window.ZagelStore.set('emotion_contacts', this._contacts);
        await window.ZagelStore.set('emotion_mood_history', this._moodHistory);
      }
    }

    async load() {
      if (window.ZagelStore) {
        const contacts = await window.ZagelStore.get('emotion_contacts');
        if (contacts) this._contacts = contacts;
        const history = await window.ZagelStore.get('emotion_mood_history');
        if (history) this._moodHistory = history;
      }
    }

    destroy() {
      this._contacts = {};
      this._moodHistory = [];
      this._nudgeQueue = [];
      delete window.__ZAGEL_EMOTION__;
    }
  }

  window.__ZAGEL_EMOTION__ = new ZagelEmotionEngine();
  window.ZagelEmotion = window.__ZAGEL_EMOTION__;
})();
