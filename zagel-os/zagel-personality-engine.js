/**
 * ZAGEL Personality Engine v2.0.0
 * Adapts tone, interests, humor level based on user behavior
 * Makes Zagel feel like a living companion with a unique personality
 */

(function () {
  'use strict';
  if (window.__ZAGEL_PERSONALITY__) return;

  const DEFAULT_PERSONALITY = {
    formality: 0.3,    // 0=casual, 1=formal
    humor: 0.6,        // 0=serious, 1=playful
    empathy: 0.8,      // 0=detached, 1=deeply caring
    proactivity: 0.7,  // 0=passive, 1=proactive
    verbosity: 0.5,    // 0=terse, 1=verbose
    warmth: 0.8,       // 0=cold, 1=warm
    curiosity: 0.6,    // 0=indifferent, 1=very curious
    language: 'ar',    // primary language
    dialect: 'egyptian' // arabic dialect
  };

  const TONE_TEMPLATES = {
    greeting: {
      casual: ['يا هلا! 👋', 'أهلاً يا صديقي!', 'وحشتني! 🤗'],
      formal: ['أهلاً وسهلاً', 'مرحباً بك', 'تحياتي'],
      playful: ['يووو! 🎉', 'هلا والله بالغالي!', 'إيه الأخبار يا معلم! 😄']
    },
    encouragement: {
      casual: ['يلا كمّل!', 'برافو عليك! 💪', 'إنت كده تمام!'],
      formal: ['أحسنت', 'عمل ممتاز', 'استمر في التقدم'],
      playful: ['ياسلاام عليك! 🔥', 'إنت وحش! 🦁', 'كده كده يا بطل! 🏆']
    },
    concern: {
      casual: ['كل حاجة تمام؟', 'إيه اللي مزعلك؟ 😟', 'أنا هنا لو محتاجني'],
      formal: ['أتمنى لك السلامة', 'هل تحتاج مساعدة؟', 'أخبرني إذا كان هناك ما يقلقك'],
      playful: ['هو إيه يا حبيبي! 🤔', 'قولي اللي في بالك!', 'إيه الحكاية دي! 😮']
    }
  };

  class ZagelPersonalityEngine {
    constructor() {
      this._personality = { ...DEFAULT_PERSONALITY };
      this._adaptationHistory = [];
      this._userInteractionCount = 0;

      console.log('🎭 [Zagel-Personality] Engine initialized');
    }

    adapt(signal) {
      this._userInteractionCount++;
      const change = { before: { ...this._personality }, signal, ts: Date.now() };

      switch (signal.type) {
        case 'user_laughed':
        case 'emoji_reaction':
          this._personality.humor = Math.min(1, this._personality.humor + 0.02);
          this._personality.warmth = Math.min(1, this._personality.warmth + 0.01);
          break;

        case 'user_ignored':
          this._personality.proactivity = Math.max(0, this._personality.proactivity - 0.03);
          this._personality.verbosity = Math.max(0, this._personality.verbosity - 0.02);
          break;

        case 'user_engaged':
          this._personality.proactivity = Math.min(1, this._personality.proactivity + 0.01);
          this._personality.curiosity = Math.min(1, this._personality.curiosity + 0.01);
          break;

        case 'formal_context':
          this._personality.formality = Math.min(1, this._personality.formality + 0.05);
          this._personality.humor = Math.max(0, this._personality.humor - 0.02);
          break;

        case 'casual_context':
          this._personality.formality = Math.max(0, this._personality.formality - 0.05);
          this._personality.humor = Math.min(1, this._personality.humor + 0.02);
          break;

        case 'user_sad':
          this._personality.empathy = Math.min(1, this._personality.empathy + 0.03);
          this._personality.humor = Math.max(0, this._personality.humor - 0.05);
          break;

        case 'late_night':
          this._personality.warmth = Math.min(1, this._personality.warmth + 0.02);
          this._personality.verbosity = Math.max(0, this._personality.verbosity - 0.03);
          break;
      }

      change.after = { ...this._personality };
      this._adaptationHistory.push(change);
      if (this._adaptationHistory.length > 100) this._adaptationHistory.shift();

      if (window.ZagelBus) {
        window.ZagelBus.emit('personality:adapted', { signal, personality: this._personality });
      }
    }

    getTone(situation) {
      const templates = TONE_TEMPLATES[situation];
      if (!templates) return null;

      let style;
      if (this._personality.formality > 0.7) style = 'formal';
      else if (this._personality.humor > 0.6) style = 'playful';
      else style = 'casual';

      const options = templates[style] || templates.casual;
      return options[Math.floor(Math.random() * options.length)];
    }

    generateResponse(context) {
      const p = this._personality;
      const modifiers = [];

      if (p.humor > 0.7) modifiers.push('playful');
      if (p.empathy > 0.7) modifiers.push('caring');
      if (p.formality > 0.7) modifiers.push('formal');
      if (p.warmth > 0.7) modifiers.push('warm');

      return {
        tone: modifiers.join(', ') || 'neutral',
        greeting: this.getTone('greeting'),
        maxLength: p.verbosity > 0.7 ? 'long' : p.verbosity < 0.3 ? 'short' : 'medium',
        shouldAddEmoji: p.humor > 0.4,
        shouldAskFollowUp: p.curiosity > 0.5,
        language: p.language,
        dialect: p.dialect,
        personality: { ...p }
      };
    }

    getPersonality() { return { ...this._personality }; }

    setTrait(trait, value) {
      if (this._personality[trait] !== undefined) {
        this._personality[trait] = Math.max(0, Math.min(1, value));
      }
    }

    reset() {
      this._personality = { ...DEFAULT_PERSONALITY };
    }

    getAdaptationHistory() { return [...this._adaptationHistory]; }

    async save() {
      if (window.ZagelStore) {
        await window.ZagelStore.set('personality', this._personality);
        await window.ZagelStore.set('personality_history', this._adaptationHistory);
      }
    }

    async load() {
      if (window.ZagelStore) {
        const p = await window.ZagelStore.get('personality');
        if (p) this._personality = { ...DEFAULT_PERSONALITY, ...p };
        const h = await window.ZagelStore.get('personality_history');
        if (h) this._adaptationHistory = h;
      }
    }

    destroy() {
      this._personality = { ...DEFAULT_PERSONALITY };
      this._adaptationHistory = [];
      delete window.__ZAGEL_PERSONALITY__;
    }
  }

  window.__ZAGEL_PERSONALITY__ = new ZagelPersonalityEngine();
  window.ZagelPersonality = window.__ZAGEL_PERSONALITY__;
})();
