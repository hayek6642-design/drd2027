function suggestActions(user, intent, assets) {
  const actions = [];
  const codes = assets?.codes?.length || 0;
  const silver = assets?.silver?.length || 0;
  const gold = assets?.gold?.length || 0;
  const totalAssets = codes + silver + gold;
  
  // Determine user stage
  const isNewUser = totalAssets === 0;
  const hasCodesOnly = codes > 0 && silver === 0 && gold === 0;
  const hasDiversePortfolio = (silver > 0 || gold > 0) && codes > 0;
  const isWealthy = gold > 5 || (codes > 50 && silver > 20);
  
  // NEW USER - Focus on earning
  if (isNewUser) {
    actions.push({
      label: '▶️ شاهد فيديو لجمع الأكواد',
      labelEn: '▶️ Watch Video to Earn Codes',
      action: 'open_ytplayer',
      reason: 'Start your portfolio - earn your first codes',
      reasonAr: 'ابدأ محفظتك - اجمع أول أكوادك',
      priority: 1,
      emoji: '▶️',
      color: '#00d4ff'
    });
    
    actions.push({
      label: '📖 تعرف على المنصة',
      labelEn: '📖 Learn About Platform',
      action: 'show_tutorial',
      reason: 'Understand how CodeBank works',
      reasonAr: 'افهم كيف تعمل منصة CodeBank',
      priority: 2,
      emoji: '📖',
      color: '#888'
    });
    
    return actions;
  }
  
  // CODES ONLY - Convert or gamble
  if (hasCodesOnly) {
    if (codes >= 5) {
      actions.push({
        label: '🔄 افتح Pebalaash للتبادل',
        labelEn: '🔄 Open Pebalaash to Trade',
        action: 'open_pebalaash',
        reason: codes > 20 
          ? 'High code balance - perfect for trading' 
          : 'Convert codes to stable silver/gold',
        reasonAr: codes > 20
          ? 'رصيد عالي - مثالي للتبادل'
          : 'حول الأكواد إلى فضة/ذهب مستقر',
        priority: 1,
        emoji: '🔄',
        color: '#ff6b6b'
      });
    }
    
    if (codes >= 10) {
      actions.push({
        label: '🎮 العب في Games Centre',
        labelEn: '🎮 Play in Games Centre',
        action: 'open_games',
        reason: codes > 20
          ? 'High balance - good for calculated risks'
          : 'Small risk, potential big reward',
        reasonAr: codes > 20
          ? 'رصيد عالي - جيد للمخاطر المحسوبة'
          : 'مخاطرة صغيرة، مكسب كبير محتمل',
        priority: 2,
        emoji: '🎮',
        color: '#51cf66'
      });
    }
    
    actions.push({
      label: '🔐 تأمين الأكواد في SafeCode',
      labelEn: '🔐 Secure Codes in SafeCode',
      action: 'open_safecode',
      reason: 'Protect your liquid assets',
      reasonAr: 'احمِ أصولك السائلة',
      priority: 3,
      emoji: '🔐',
      color: '#ffd43b'
    });
    
    return actions;
  }
  
  // DIVERSE PORTFOLIO - Strategic options
  if (hasDiversePortfolio) {
    if (silver > 0) {
      actions.push({
        label: '💎 تصفح سوق Pebalaash',
        labelEn: '💎 Browse Pebalaash Market',
        action: 'open_pebalaash',
        reason: 'Silver is optimal for bartering',
        reasonAr: 'الفضة مثالية للمقايضة',
        priority: 1,
        emoji: '💎',
        color: '#c0c0c0'
      });
    }
    
    if (gold > 0) {
      actions.push({
        label: '🔐 تأمين الذهب في SafeCode',
        labelEn: '🔐 Secure Gold in SafeCode',
        action: 'open_safecode',
        reason: 'Premium assets need premium protection',
        reasonAr: 'الأصول المتميزة تحتاج حماية متميزة',
        priority: 2,
        emoji: '🔐',
        color: '#ffd700'
      });
    }
    
    if (codes > 10) {
      actions.push({
        label: '🎮 مضاعفة الأكواد في الألعاب',
        labelEn: '🎮 Multiply Codes in Games',
        action: 'open_games',
        reason: 'Use excess codes for growth potential',
        reasonAr: 'استخدم الأكواد الزائدة لإمكانية النمو',
        priority: 3,
        emoji: '🎮',
        color: '#51cf66'
      });
    }
    
    return actions;
  }
  
  // WEALTHY USER - Advanced options
  if (isWealthy) {
    actions.push({
      label: '📊 تحليل المحفظة المتقدم',
      labelEn: '📊 Advanced Portfolio Analysis',
      action: 'show_analytics',
      reason: 'Optimize your large portfolio',
      reasonAr: 'حسّن محفظتك الكبيرة',
      priority: 1,
      emoji: '📊',
      color: '#00d4ff'
    });
    
    actions.push({
      label: '🎯 استثمارات عالية المخاطرة',
      labelEn: '🎯 High-Stake Investments',
      action: 'open_games',
      reason: 'Wealth allows calculated big risks',
      reasonAr: 'الثروة تسمح بمخاطر كبيرة محسوبة',
      priority: 2,
      emoji: '🎯',
      color: '#ff6b6b'
    });
  }
  
  // Intent-specific actions
  if (intent.type === 'navigate' && intent.target) {
    const targetActions = actions.filter(a => a.action.includes(intent.target));
    if (targetActions.length > 0) {
      return targetActions;
    }
  }
  
  // Default: return top 3 by priority
  return actions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

function getQuickReplies(intent) {
  const quickReplies = {
    asset_inquiry: [
      { text: 'ما رصيدي؟', textEn: 'What\'s my balance?' },
      { text: 'كيف أزيد أصولي؟', textEn: 'How to grow assets?' },
      { text: 'أفضل استراتيجية؟', textEn: 'Best strategy?' }
    ],
    navigate: [
      { text: 'افتح الخدمة', textEn: 'Open service' },
      { text: 'شرح الخدمة', textEn: 'Explain service' },
      { text: 'خدمة أخرى', textEn: 'Other service' }
    ],
    help: [
      { text: 'كيف أبدأ؟', textEn: 'How to start?' },
      { text: 'شرح الأكواد', textEn: 'Explain codes' },
      { text: 'الدعم الفني', textEn: 'Support' }
    ],
    general: [
      { text: 'ما رصيدي؟', textEn: 'My balance?' },
      { text: 'الألعاب', textEn: 'Games' },
      { text: 'Pebalaash', textEn: 'Pebalaash' }
    ]
  };
  
  return quickReplies[intent.type] || quickReplies.general;
}

module.exports = { suggestActions, getQuickReplies };