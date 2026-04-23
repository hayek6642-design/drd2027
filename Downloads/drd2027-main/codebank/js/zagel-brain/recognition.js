/**
 * Zagel Brain v3 - Recognition Module
 * Advanced sentiment analysis with Arabic + emoji support
 */
(function() {
  'use strict';
  const SENTIMENT_PATTERNS = {
    happy: { ar: ['فرحان', 'سعيد', 'مبسوط', 'تمام', 'حلو', 'ممتاز', 'عظيم', 'الحمد لله', 'يا سلام', 'أحلى'], en: ['happy', 'great', 'awesome', 'love', 'excellent', 'wonderful', 'amazing'], emoji: ['😄', '😊', '🥰', '😁', '🎉', '❤️', '💕', '🤩', '😍', '🥳', '✨'], weight: 1.0 },
    angry: { ar: ['زعلان', 'غاضب', 'عصبي', 'يلعن', 'مش طايق', 'كفاية', 'حرام', 'ظلم', 'قرفان', 'بضان'], en: ['angry', 'furious', 'hate', 'terrible', 'worst', 'annoying', 'frustrated'], emoji: ['😠', '😡', '🤬', '💢', '👊', '😤'], weight: 1.2 },
    sad: { ar: ['حزين', 'تعبان', 'مش كويس', 'وحشني', 'زهقان', 'مكتئب', 'خلاص', 'مفيش فايدة', 'تعب', 'ضايق'], en: ['sad', 'depressed', 'lonely', 'miss', 'tired', 'hopeless', 'crying'], emoji: ['😢', '😭', '💔', '😞', '😔', '🥺', '😿'], weight: 1.1 },
    suspicious: { ar: ['مش مقتنع', 'أشك', 'مستغرب', 'غريب', 'إزاي', 'ليه كده', 'مش فاهم', 'بجد', 'معقول'], en: ['suspicious', 'doubt', 'weird', 'strange', 'really', 'seriously', 'how come'], emoji: ['🤨', '🧐', '🤔', '👀', '😒'], weight: 0.8 },
    joking: { ar: ['هههه', 'ههه', 'لول', 'يا نهار', 'ده كوميديا', 'بضحك', 'نكتة', 'هزار', 'يا عم'], en: ['haha', 'lol', 'lmao', 'joke', 'funny', 'kidding', 'rofl'], emoji: ['😂', '🤣', '😜', '😝', '🤪', '😆', '💀'], weight: 0.9 },
    worried: { ar: ['خايف', 'قلقان', 'مش عارف', 'يا رب', 'إن شاء الله', 'أتمنى', 'مش متأكد', 'محتار', 'مستني'], en: ['worried', 'scared', 'afraid', 'nervous', 'anxious', 'hope', 'uncertain'], emoji: ['😰', '😨', '😱', '🫣', '😬', '🙏'], weight: 0.9 }
  };
  const INTENSIFIERS_AR = ['جداً', 'أوي', 'خالص', 'قوي', 'كتير', 'فشخ'];
  const INTENSIFIERS_EN = ['very', 'so', 'extremely', 'really', 'super'];
  class Recognition {
    constructor() {
      this._lastAnalysis = null;
      this._history = [];
      console.log('🔍 [ZagelBrain-Recognition] Online');
    }
    analyze(text) {
      if (!text || typeof text !== 'string') return { sentiment: 'neutral', confidence: 0, details: {} };
      const normalized = text.toLowerCase().trim();
      const scores = {}; let totalSignals = 0;
      for (const [sentiment, patterns] of Object.entries(SENTIMENT_PATTERNS)) {
        let score = 0; let matches = [];
        for (const keyword of patterns.ar) { if (normalized.includes(keyword)) { score += patterns.weight; matches.push(keyword); totalSignals++; } }
        for (const keyword of patterns.en) { if (normalized.includes(keyword)) { score += patterns.weight * 0.8; matches.push(keyword); totalSignals++; } }
        for (const emoji of patterns.emoji) { const emojiCount = (text.match(new RegExp(emoji, 'g')) || []).length; if (emojiCount > 0) { score += emojiCount * 0.5; matches.push(emoji); totalSignals++; } }
        if (score > 0) scores[sentiment] = { score, matches };
      }
      let intensifierBoost = 1.0;
      for (const i of INTENSIFIERS_AR) { if (normalized.includes(i)) intensifierBoost += 0.2; }
      for (const i of INTENSIFIERS_EN) { if (normalized.includes(i)) intensifierBoost += 0.15; }
      const exclamations = (text.match(/!/g) || []).length;
      const questions = (text.match(/\?/g) || []).length;
      const caps = (text.match(/[A-Z]{2,}/g) || []).length;
      if (exclamations > 2) intensifierBoost += 0.15;
      if (caps > 1) intensifierBoost += 0.1;
      let topSentiment = 'neutral'; let topScore = 0;
      for (const [sentiment, data] of Object.entries(scores)) {
        const adjusted = data.score * intensifierBoost;
        if (adjusted > topScore) { topScore = adjusted; topSentiment = sentiment; }
      }
      const confidence = totalSignals === 0 ? 0 : Math.min(1, topScore / (totalSignals * 0.5 + 1));
      const sarcasmHints = this._detectSarcasm(normalized, topSentiment, scores);
      const result = { sentiment: topSentiment, confidence: Math.round(confidence * 100) / 100, intensifierBoost, scores, sarcasmHints, questionDetected: questions > 0, exclamationLevel: exclamations, timestamp: Date.now() };
      this._history.push({ sentiment: topSentiment, confidence, ts: Date.now() });
      if (this._history.length > 20) this._history.shift();
      this._lastAnalysis = result;
      if (window.ZagelBus) window.ZagelBus.emit('brain:sentiment', result);
      return result;
    }
    _detectSarcasm(text, topSentiment, scores) {
      const hints = [];
      if (scores.happy && scores.angry) hints.push('mixed_signals');
      if (/طبعا.*(مش|لا)|أكيد.*(لا|مش)/.test(text)) hints.push('rhetorical_ar');
      if (/sure.*not|yeah.*right|oh great/i.test(text)) hints.push('rhetorical_en');
      if ((text.match(/[!?]{3,}/g) || []).length > 0 && topSentiment === 'neutral') hints.push('excessive_punctuation');
      return hints;
    }
    getShift() {
      if (this._history.length < 2) return null;
      const prev = this._history[this._history.length - 2];
      const curr = this._history[this._history.length - 1];
      if (prev.sentiment !== curr.sentiment) return { from: prev.sentiment, to: curr.sentiment, confidence: curr.confidence };
      return null;
    }
    getHistory() { return [...this._history]; }
    getLast() { return this._lastAnalysis; }
  }
  if (!window.ZagelBrainV3) window.ZagelBrainV3 = {};
  window.ZagelBrainV3.Recognition = new Recognition();
})();
