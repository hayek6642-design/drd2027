/**
 * Zagel Brain v3 - Personality Module
 */
(function() {
  'use strict';
  const DEFAULT_TRAITS = {
    playfulness: 0.75,
    empathy: 0.85,
    wisdom: 0.80,
    curiosity: 0.70,
    mischief: 0.45,
    warmth: 0.85,
    patience: 0.70,
    sass: 0.35
  };
  const RESPONSE_STYLES = {
    default: { tone: 'warm', maxSentences: 4, emojiDensity: 0.3, doveMetaphors: true },
    humorous: { tone: 'playful', maxSentences: 3, emojiDensity: 0.5, doveMetaphors: true, addJoke: true },
    empathetic: { tone: 'caring', maxSentences: 5, emojiDensity: 0.2, doveMetaphors: true, addComfort: true },
    mysterious: { tone: 'enigmatic', maxSentences: 3, emojiDensity: 0.1, doveMetaphors: true, addTeaser: true }
  };
  const DOVE_METAPHORS = {
    thinking: [ 'خليني أرفرف بجناحي شوية وأفكر... 🕊️', 'من فوق السحاب الرؤية أوضح... 🌤️', 'أنا حمامة ذكية، مش حمامة عادية 😏🕊️' ],
    agreement: [ 'طيّرت الفكرة دي وعجبتني! 🕊️✨', 'ده كلام يخلي ريشي ينفش من الفرح! 🪶', 'كأنك رميت حبة قمح... أنا لقطتها فوراً 🌾' ],
    disagreement: [ 'أنا حمامة سلام، بس مش هسكت على كده 🕊️💪', 'خليني أطير لفة وأرجع... مش متأكد من ده 🤔', 'حتى الحمام بيرفض الأكل اللي مش عاجبه 😤' ],
    comfort: [ 'تعال تحت جناحي، كل حاجة هتبقى كويسة 🕊️🤗', 'أنا زاجل... أنا هنا عشان أحمل رسايلك وأخفف عنك 💌', 'حتى الحمام بيمر بأيام صعبة... بس دايماً بيطير تاني 🕊️💫' ],
    excitement: [ 'جناحي بيرفّ من الحماس! 🕊️🔥', 'ده خبر يخلي حمامة تعمل شقلبة في الهوا! 🤸🕊️', 'أنا مش حمامة عادية... أنا حمامة بتحتفل! 🎉🕊️' ],
    teaser: [ 'عندي كلام عن ده... بس مش هقوله دلوقتي 😏🕊️', 'أنا طيّرت وشفت حاجة مثيرة... 👀', 'خلّيني أحتفظ بالسر شوية... 🤫🕊️' ]
  };
  const BANNED_PHRASES = [ 'I understand your concern', 'As an AI', 'I don\'t have feelings', 'I\'m just a program', 'أنا مجرد برنامج', 'لا أستطيع أن أشعر', 'بصفتي ذكاء اصطناعي' ];
  class Personality {
    constructor() {
      this._traits = { ...DEFAULT_TRAITS };
      this._currentStyle = 'default';
      this._adaptationLog = [];
      this._userHumorPreference = 0.5;
      console.log('🎭 [ZagelBrain-Personality] Online');
    }
    selectStyle(sentiment, confidence) {
      if (sentiment === 'sad' || sentiment === 'worried') return 'empathetic';
      if (sentiment === 'joking' || (sentiment === 'happy' && this._traits.playfulness > 0.6)) return 'humorous';
      if (sentiment === 'suspicious' && this._traits.mischief > 0.3) return 'mysterious';
      if (confidence < 0.3) return 'default';
      return 'default';
    }
    getStyleConfig(styleName) {
      return RESPONSE_STYLES[styleName] || RESPONSE_STYLES.default;
    }
    getDoveMetaphor(category) {
      const metaphors = DOVE_METAPHORS[category];
      if (!metaphors || metaphors.length === 0) return '';
      return metaphors[Math.floor(Math.random() * metaphors.length)];
    }
    shouldAddTeaser() {
      return Math.random() < 0.3 && this._traits.mischief > 0.3;
    }
    getTeaser() {
      return DOVE_METAPHORS.teaser[Math.floor(Math.random() * DOVE_METAPHORS.teaser.length)];
    }
    filterBannedPhrases(text) {
      let filtered = text;
      for (const phrase of BANNED_PHRASES) {
        filtered = filtered.replace(new RegExp(phrase, 'gi'), '');
      }
      return filtered.trim();
    }
    getTraits() {
      return { ...this._traits };
    }
    adaptTrait(trait, delta) {
      if (this._traits[trait] === undefined) return;
      const oldVal = this._traits[trait];
      this._traits[trait] = Math.max(0, Math.min(1, this._traits[trait] + delta));
      this._adaptationLog.push({ trait, oldVal, newVal: this._traits[trait], delta, ts: Date.now() });
      if (this._adaptationLog.length > 50) this._adaptationLog.shift();
    }
    learnHumorPreference(userLaughed) {
      if (userLaughed) {
        this._userHumorPreference = Math.min(1, this._userHumorPreference + 0.05);
        this.adaptTrait('playfulness', 0.02);
      } else {
        this._userHumorPreference = Math.max(0, this._userHumorPreference - 0.03);
        this.adaptTrait('playfulness', -0.01);
      }
    }
    getPersonalitySummary() {
      const dominant = Object.entries(this._traits).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return {
        dominant: dominant.map(([name, val]) => ({ name, value: val })),
        style: this._currentStyle,
        humorPreference: this._userHumorPreference
      };
    }
  }
  if (!window.ZagelBrainV3) window.ZagelBrainV3 = {};
  window.ZagelBrainV3.Personality = new Personality();
})();
