/**
 * Zagel Brain v3 - Response Engine
 */
(function() {
  'use strict';
  const GENERIC_INDICATORS = [ 'أتمنى أن أكون قد ساعدتك', 'هل هناك شيء آخر', 'I hope this helps', 'Is there anything else', 'Let me know if', 'خليني أعرف لو' ];
  const DOVE_CLOSERS = [ '🕊️✨', 'زاجل دايماً هنا! 🕊️', '... وطار زاجل 🕊️💨', 'بكرة أحلى إن شاء الله 🕊️🌅', 'ريشة ريشة... 🪶' ];
  class ResponseEngine {
    constructor() {
      this._responseCount = 0;
      this._lastAnimation = null;
      console.log('⚡ [ZagelBrain-ResponseEngine] Online');
    }
    process(rawResponse, promptContext) {
      let response = rawResponse || '';
      const personality = window.ZagelBrainV3?.Personality;
      const memory = window.ZagelBrainV3?.Memory;
      if (personality) response = personality.filterBannedPhrases(response);
      const maxSentences = promptContext?.styleConfig?.maxSentences || 5;
      response = this._enforceSentenceLimit(response, maxSentences);
      if (this._isGeneric(response)) response = this._injectPersonality(response, promptContext);
      if (Math.random() < 0.2 && !response.includes('🕊️')) response += ' ' + DOVE_CLOSERS[Math.floor(Math.random() * DOVE_CLOSERS.length)];
      const animation = promptContext?.animation || 'gentle-bob';
      this._triggerAnimation(animation, promptContext?.sentiment);
      if (memory) memory.store(response, { role: 'assistant', sentiment: promptContext?.sentiment?.sentiment || 'neutral', confidence: promptContext?.sentiment?.confidence || 0 });
      this._learn(promptContext);
      this._responseCount++;
      return { text: response, animation, style: promptContext?.style || 'default', responseNumber: this._responseCount };
    }
    _enforceSentenceLimit(text, max) {
      const sentences = text.split(/(?<=[.!?؟。])\s+/).filter(s => s.trim());
      if (sentences.length <= max) return text;
      return sentences.slice(0, max).join(' ');
    }
    _isGeneric(text) {
      return GENERIC_INDICATORS.some(phrase => text.includes(phrase));
    }
    _injectPersonality(response, context) {
      const personality = window.ZagelBrainV3?.Personality;
      if (!personality) return response;
      let cleaned = response;
      for (const generic of GENERIC_INDICATORS) cleaned = cleaned.replace(generic, '');
      cleaned = cleaned.trim();
      const sentiment = context?.sentiment?.sentiment || 'neutral';
      let metaphorCategory = 'thinking';
      if (sentiment === 'happy') metaphorCategory = 'excitement';
      if (sentiment === 'sad') metaphorCategory = 'comfort';
      if (sentiment === 'angry') metaphorCategory = 'comfort';
      if (sentiment === 'suspicious') metaphorCategory = 'disagreement';
      const metaphor = personality.getDoveMetaphor(metaphorCategory);
      if (metaphor) cleaned += '\n' + metaphor;
      return cleaned;
    }
    _triggerAnimation(animationName, sentiment) {
      this._lastAnimation = animationName;
      if (window.ZagelBus) window.ZagelBus.emit('brain:animate', { animation: animationName, sentiment: sentiment?.sentiment || 'neutral', intensity: sentiment?.confidence || 0.5, duration: animationName === 'spin' ? 2000 : 1000 });
      if (window.zagelAvatar?.animate) window.zagelAvatar.animate(animationName);
    }
    _learn(context) {
      const personality = window.ZagelBrainV3?.Personality;
      if (!personality) return;
      if (context?.sentiment?.sentiment === 'joking' && context?.style === 'humorous') personality.learnHumorPreference(true);
      if (context?.sentiment?.questionDetected) personality.adaptTrait('proactivity', 0.01);
    }
    detectExpectation(userMessage) {
      const expectations = [];
      if (/\?|؟/.test(userMessage)) expectations.push('answer');
      if (/ساعدني|help|عايز|أريد|محتاج/i.test(userMessage)) expectations.push('action');
      if (/رأيك|think|إيه رأيك/i.test(userMessage)) expectations.push('opinion');
      if (/اضحكني|joke|نكتة/i.test(userMessage)) expectations.push('humor');
      return expectations;
    }
    getStats() {
      return { totalResponses: this._responseCount, lastAnimation: this._lastAnimation };
    }
  }
  if (!window.ZagelBrainV3) window.ZagelBrainV3 = {};
  window.ZagelBrainV3.ResponseEngine = new ResponseEngine();
})();
