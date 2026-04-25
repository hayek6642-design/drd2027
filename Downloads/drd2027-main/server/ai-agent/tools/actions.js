// server/ai-agent/tools/actions.js
// Generate smart action buttons based on user assets + intent

const ACTION_DEFS = {
  pebalaash: { label: '🛍️ Pebalaash',      labelAr: '🛍️ بيبالاش',        url: '/codebank/pebalaash/',       color: '#7c3aed' },
  games:     { label: '🎮 Play Games',      labelAr: '🎮 العب الآن',       url: '/codebank/Games-Centre.html',   color: '#22c55e' },
  safecode:  { label: '🔐 SafeCode',        labelAr: '🔐 تأمن الكودز',     url: '/codebank/safecode/',       color: '#f59e0b' },
  samma3ny:  { label: '🎵 Samma3ny',        labelAr: '🎵 سمعني',           url: '/codebank/samma3ny.html',       color: '#06b6d4' },
  farragna:  { label: '📹 Watch & Earn',    labelAr: '📹 شاهد وأكسب',      url: '/codebank/farragna/',       color: '#ef4444' },
  e7ki:      { label: '📊 Analytics',       labelAr: '📊 التحليلات',       url: '/codebank/e7ki/',           color: '#8b5cf6' },
  ledger:    { label: '📒 Ledger',          labelAr: '📒 السجل',           url: '/codebank/bankode/ledger.html', color: '#64748b' },
  aihub:     { label: '🤖 AI Hub',          labelAr: '🤖 مركز الذكاء',     url: '/codebank/aihub/',          color: '#00d4ff' },
  shots:     { label: '📸 Shots',           labelAr: '📸 شوتس',            url: '/codebank/shots/',          color: '#ec4899' },
};

function makeAction(id, reasonEn, reasonAr, isArabic) {
  const def = ACTION_DEFS[id];
  if (!def) return null;
  return {
    ...def,
    label:  isArabic ? def.labelAr : def.label,
    reason: isArabic ? reasonAr     : reasonEn,
    id,
  };
}

export function generateActions(ctx, intent, isArabic = false) {
  const { assets } = ctx;
  const actions = [];

  const hasAssets = assets.codes > 0 || assets.silver > 0 || assets.gold > 0;

  // Intent-based priority actions
  if (intent === 'earn') {
    actions.push(makeAction('games',    'Fastest code earning',    'أسرع طريقة للكسب',      isArabic));
    actions.push(makeAction('samma3ny', 'Passive earning while listening', 'اكسب بدون جهد', isArabic));
    actions.push(makeAction('farragna', 'Earn by watching videos', 'اكسب بمشاهدة الفيديوهات', isArabic));
  } else if (intent === 'asset_inquiry') {
    actions.push(makeAction('e7ki',   'Full analytics',       'تحليل مفصل',    isArabic));
    actions.push(makeAction('ledger', 'Transaction history',  'سجل المعاملات', isArabic));
  } else if (intent === 'action' || intent === 'navigate') {
    // Will be handled by navigator — just add utility
    actions.push(makeAction('e7ki', 'Track your assets', 'تتبع أصولك', isArabic));
  } else {
    // Default: based on asset level
    if (hasAssets) {
      if (assets.codes >= 10) {
        actions.push(makeAction('pebalaash', 'Spend your codes', 'أنفق كودزك',        isArabic));
        actions.push(makeAction('safecode',  'Protect your codes', 'أمّن كودزك',      isArabic));
      }
      if (assets.gold > 0) {
        actions.push(makeAction('games', 'Gold unlocks premium modes', 'الذهب يفتح مستويات مميزة', isArabic));
      }
      actions.push(makeAction('e7ki', 'View portfolio', 'شاهد محفظتك', isArabic));
    } else {
      // No assets — push earning
      actions.push(makeAction('games',    'Start earning codes', 'ابدأ بكسب الكودز',  isArabic));
      actions.push(makeAction('farragna', 'Watch & earn',        'شاهد وأكسب',        isArabic));
      actions.push(makeAction('samma3ny', 'Listen & earn',       'استمع وأكسب',       isArabic));
    }
  }

  // Deduplicate + limit to 4
  const seen = new Set();
  return actions
    .filter(Boolean)
    .filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; })
    .slice(0, 4);
}
