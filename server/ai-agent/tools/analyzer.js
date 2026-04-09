// server/ai-agent/tools/analyzer.js
// Intent detection — understand what the user wants

const INTENT_PATTERNS = [
  { intent: 'asset_inquiry', priority: 90, patterns: [/رصيد|balance|assets?|كود(ز)?|codes?|silver|فضة|gold|ذهب|portfolio|wallet|محفظة/i] },
  { intent: 'navigate',      priority: 85, patterns: [/افتح|open|go to|navigate|اذهب|تشغيل|launch|pebalaash|بيبالاش|games|safecode|samma3ny|سمعني|farragna|shots|aihub|e7ki|ledger|qarsan/i] },
  { intent: 'earn',          priority: 80, patterns: [/earn|اكسب|ربح|more codes|زيادة|how to get|كيف اكسب|كسب/i] },
  { intent: 'action',        priority: 75, patterns: [/secure|أمن|lock|حماية|spend|صرف|transfer|حول|convert|تحويل/i] },
  { intent: 'help',          priority: 60, patterns: [/help|مساعدة|ساعدني|what can|ماذا|كيف|how|explain|اشرح|guide/i] },
  { intent: 'greeting',      priority: 50, patterns: [/مرحبا|hi\b|hello|hey\b|سلام|أهلا|صباح|مساء|هاي/i] },
];

const SERVICE_PATTERNS = {
  pebalaash: /pebalaash|بيبالاش|store|متجر|shop/i,
  games:     /games?\s*(centre)?|game center|العاب|لعبة|play|العب/i,
  safecode:  /safe\s*code|سيف\s*كود|vault|امان|secure|حماية/i,
  samma3ny:  /samma3ny|سمعني|music|موسيقى|song|أغنية/i,
  farragna:  /farragna|فراغنة|video|فيديو|watch/i,
  shots:     /shots|صورة|photo|camera/i,
  aihub:     /ai\s*hub|ذكاء|artificial|intelligence|hub/i,
  e7ki:      /e7ki|احكي|analytics|تحليل|stats|إحصاء/i,
  ledger:    /ledger|دفتر|history|سجل|transactions|معاملات/i,
  qarsan:    /qarsan|قرسان|dog|كلب/i,
};

export function analyzeIntent(message) {
  const matched = [];
  for (const { intent, priority, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(message))) {
      matched.push({ intent, priority });
    }
  }
  matched.sort((a, b) => b.priority - a.priority);

  const mentionedServices = Object.entries(SERVICE_PATTERNS)
    .filter(([, pat]) => pat.test(message))
    .map(([id]) => id);

  const isArabic = /[\u0600-\u06FF]/.test(message);

  return {
    primaryIntent:    matched[0]?.intent || 'general',
    allIntents:       matched.map(m => m.intent),
    mentionedServices,
    isArabic,
    messageLength:    message.length,
  };
}
