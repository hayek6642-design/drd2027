const navigationCommands = {
  open_pebalaash: {
    service: 'pebalaash',
    url: './pebalaash.html',
    description: 'Barter and trade system',
    descriptionAr: 'نظام المقايضة والتبادل',
    requiresAuth: true,
    minAssets: 0,
    category: 'trade'
  },
  open_games: {
    service: 'games',
    url: './games-centre.html',
    description: 'Risk/reward gaming center',
    descriptionAr: 'مركز الألعاب (مخاطرة/مكافأة)',
    requiresAuth: true,
    minAssets: 1,
    category: 'entertainment'
  },
  open_safecode: {
    service: 'safecode',
    url: './safecode.html',
    description: 'Secure asset vault',
    descriptionAr: 'خزنة الأصول الآمنة',
    requiresAuth: true,
    minAssets: 0,
    category: 'security'
  },
  open_farragna: {
    service: 'farragna',
    url: './farragna.html',
    description: 'Social likes and engagement',
    descriptionAr: 'الإعجابات والتفاعل الاجتماعي',
    requiresAuth: false,
    minAssets: 0,
    category: 'social'
  },
  open_samma3ny: {
    service: 'samma3ny',
    url: './samma3ny.html',
    description: 'Social hub and connections',
    descriptionAr: 'مركز التواصل الاجتماعي',
    requiresAuth: true,
    minAssets: 0,
    category: 'social'
  },
  open_e7ki: {
    service: 'e7ki',
    url: './e7ki.html',
    description: 'Communication platform',
    descriptionAr: 'منصة التواصل',
    requiresAuth: true,
    minAssets: 0,
    category: 'communication'
  },
  open_eb3at: {
    service: 'eb3at',
    url: './eb3at.html',
    description: 'Asset transfer service',
    descriptionAr: 'خدمة تحويل الأصول',
    requiresAuth: true,
    minAssets: 1,
    category: 'transfer'
  },
  open_battalooda: {
    service: 'battalooda',
    url: './battalooda.html',
    description: 'Advanced gaming ecosystem',
    descriptionAr: 'نظام الألعاب المتقدم',
    requiresAuth: true,
    minAssets: 0,
    category: 'gaming'
  },
  open_ytplayer: {
    service: 'ytplayer',
    url: './yt-new-clear.html',
    description: 'Earn codes by watching videos',
    descriptionAr: 'اكسب أكواد بمشاهدة الفيديو',
    requiresAuth: false,
    minAssets: 0,
    category: 'earning'
  },
  show_tutorial: {
    service: 'tutorial',
    url: null,
    action: 'show_modal',
    description: 'Platform tutorial',
    descriptionAr: 'دليل استخدام المنصة',
    requiresAuth: false,
    minAssets: 0,
    category: 'help'
  },
  show_analytics: {
    service: 'analytics',
    url: null,
    action: 'show_modal',
    description: 'Portfolio analytics dashboard',
    descriptionAr: 'لوحة تحليلات المحفظة',
    requiresAuth: true,
    minAssets: 0,
    category: 'analytics'
  }
};

function validateCommand(action, userPermissions, userAssets = {}) {
  const cmd = navigationCommands[action];
  
  if (!cmd) {
    return {
      valid: false,
      error: 'Unknown command: ' + action,
      errorAr: 'أمر غير معروف: ' + action
    };
  }
  
  // Check authentication
  if (cmd.requiresAuth && !userPermissions.authenticated) {
    return {
      valid: false,
      error: 'Authentication required for ' + cmd.service,
      errorAr: 'يتطلب تسجيل الدخول للوصول إلى ' + cmd.service,
      redirect: 'login',
      command: cmd
    };
  }
  
  // Check minimum assets
  const totalAssets = (userAssets.codes?.length || 0) + 
                      (userAssets.silver?.length || 0) + 
                      (userAssets.gold?.length || 0);
  
  if (cmd.minAssets > 0 && totalAssets < cmd.minAssets) {
    return {
      valid: false,
      error: `Minimum ${cmd.minAssets} assets required`,
      errorAr: `يتطلب الحد الأدنى ${cmd.minAssets} أصول`,
      redirect: 'ytplayer',
      command: cmd
    };
  }
  
  return {
    valid: true,
    command: cmd,
    canExecute: true
  };
}

function getServiceInfo(serviceName) {
  for (const [key, cmd] of Object.entries(navigationCommands)) {
    if (cmd.service === serviceName) {
      return cmd;
    }
  }
  return null;
}

function getServicesByCategory(category) {
  return Object.entries(navigationCommands)
    .filter(([_, cmd]) => cmd.category === category)
    .map(([key, cmd]) => ({ key, ...cmd }));
}

module.exports = {
  navigationCommands,
  validateCommand,
  getServiceInfo,
  getServicesByCategory
};