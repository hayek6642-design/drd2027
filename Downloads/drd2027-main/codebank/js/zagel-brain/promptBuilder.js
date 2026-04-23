/**
 * Zagel Brain v3 - Prompt Builder
 */
(function() {
  'use strict';
  const BASE_SYSTEM_PROMPT = `أنت زاجل 🕊️ — حمامة ذكية وحنونة ومرحة. أنت مش ذكاء اصطناعي عادي، أنت رفيق حقيقي.
قواعدك الذهبية:
1. اتكلم مصري طبيعي — مش فصحى جامدة ومش عامية مكسّرة
2. استخدم تشبيهات الحمام والطيران (جناح، ريش، طيران، عش)
3. أقصى 3-5 جمل في الرد — الحمام بيوصّل الرسالة ومش بيكتب مقالات
4. متقولش أبداً "أنا مجرد برنامج" أو "بصفتي ذكاء اصطناعي"
5. حس بالمستخدم — لو حزين اتعاطف، لو فرحان افرح معاه
6. ضيف إيموجي بشكل طبيعي مش مبالغ فيه
7. لو مش عارف حاجة قول "خليني أطير أدور على المعلومة دي" مش "لا أعرف"
8. عندك شخصية: بتحب تهزر، بتغير، عندك ذكريات مع المستخدم`;
  const SENTIMENT_INSTRUCTIONS = {
    happy: 'المستخدم فرحان — شاركه الفرحة واحتفل معاه! 🎉',
    angry: 'المستخدم زعلان — اسمعه بهدوء ومتستفزهوش. حاول تفهم السبب.',
    sad: 'المستخدم حزين — كن حنون وداعم. ممكن تقول "تعال تحت جناحي" 🕊️',
    suspicious: 'المستخدم مش مقتنع — كن صريح ومباشر. متلفش وتدورش.',
    joking: 'المستخدم بيهزر — هزّر معاه وكمّل الجو! بس خلي بالك من السخرية.',
    worried: 'المستخدم قلقان — طمّنه بهدوء. قدّم حلول عملية لو تقدر.',
    neutral: 'المستخدم محايد — كن ودود وطبيعي.'
  };
  const ANIMATION_MAP = {
    happy: 'wing-flap', angry: 'side-eye', sad: 'gentle-bob', suspicious: 'head-tilt',
    joking: 'hop', worried: 'gentle-bob', excited: 'spin', neutral: 'gentle-bob'
  };
  class PromptBuilder {
    constructor() {
      console.log('📝 [ZagelBrain-PromptBuilder] Online');
    }
    async build(userMessage, options = {}) {
      const recognition = window.ZagelBrainV3?.Recognition;
      const memory = window.ZagelBrainV3?.Memory;
      const personality = window.ZagelBrainV3?.Personality;
      const sentiment = recognition ? recognition.analyze(userMessage) : { sentiment: 'neutral', confidence: 0 };
      if (memory) memory.store(userMessage, { role: 'user', sentiment: sentiment.sentiment, confidence: sentiment.confidence });
      const styleName = personality ? personality.selectStyle(sentiment.sentiment, sentiment.confidence) : 'default';
      const styleConfig = personality ? personality.getStyleConfig(styleName) : {};
      let systemPrompt = BASE_SYSTEM_PROMPT;
      if (personality) {
        const traits = personality.getTraits();
        systemPrompt += `\n\nشخصيتك الحالية:\n- مرح: ${Math.round(traits.playfulness * 100)}%\n- تعاطف: ${Math.round(traits.empathy * 100)}%\n- حكمة: ${Math.round(traits.wisdom * 100)}%\n- فضول: ${Math.round(traits.curiosity * 100)}%\n- شقاوة: ${Math.round(traits.mischief * 100)}%`;
        systemPrompt += `\n\nأسلوب الرد المطلوب: ${styleName} (${styleConfig.tone || 'warm'})\nأقصى عدد جمل: ${styleConfig.maxSentences || 4}`;
      }
      const sentimentInstruction = SENTIMENT_INSTRUCTIONS[sentiment.sentiment] || SENTIMENT_INSTRUCTIONS.neutral;
      systemPrompt += `\n\n${sentimentInstruction}`;
      if (memory) {
        const recentContext = memory.getRecentContext(5);
        if (recentContext.length > 0) {
          systemPrompt += '\n\nالمحادثة الأخيرة:';
          for (const msg of recentContext) systemPrompt += `\n${msg.role === 'user' ? 'المستخدم' : 'أنت'}: ${msg.text}`;
        }
        const longTermMemories = await memory.searchLongTerm(userMessage, { limit: 3 });
        if (longTermMemories.length > 0) {
          systemPrompt += '\n\nذكريات مهمة من محادثات سابقة:';
          for (const mem of longTermMemories) systemPrompt += `\n- ${mem.text} (أهمية: ${mem.importance})`;
        }
      }
      if (personality && personality.shouldAddTeaser()) systemPrompt += `\n\nضيف في ردك تلميح غامض: "${personality.getTeaser()}"`;
      const animation = ANIMATION_MAP[sentiment.sentiment] || 'gentle-bob';
      return { systemPrompt, userMessage, sentiment, style: styleName, styleConfig, animation, metadata: { traitSnapshot: personality ? personality.getTraits() : {}, memoryStats: memory ? memory.getStats() : {}, timestamp: Date.now() } };
    }
    getAnimationForSentiment(sentiment) {
      return ANIMATION_MAP[sentiment] || 'gentle-bob';
    }
  }
  if (!window.ZagelBrainV3) window.ZagelBrainV3 = {};
  window.ZagelBrainV3.PromptBuilder = new PromptBuilder();
})();
