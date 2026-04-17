/**
 * DrD CONTEXT ENGINE - CodeMind v2.0
 * ====================================
 * The "Soul" of the project - understands Dr.D as a living ecosystem
 * Provides rich context for all AI decisions
 */

class DrDContextEngine {
  constructor() {
    // ==================== PROJECT IDENTITY ====================
    this.projectIdentity = {
      name: 'Dr.D / Bankode',
      type: 'Gamified Reward Ecosystem',
      version: '2024.Q2',
      corePhilosophy: 'Watch → Earn → Spend → Play → Connect',
      economyType: 'Closed-loop code-based digital currency',
      userJourney: 'YouTube Videos → Digital Codes → Services → Real Value',
      languages: ['Arabic', 'English'],
      target: 'MENA region youth',
      businessModel: 'Freemium with in-service monetization'
    };

    // ==================== MODULE KNOWLEDGE BASE ====================
    this.moduleBrain = {
      'yt-player': {
        purpose: 'YouTube video watching engine - primary earnings source',
        relations: ['safecode', 'extra-mode', 'watch-dog'],
        economyRole: 'primary_income',
        criticality: 'critical',
        dataFlow: 'generates codes → stores in safecode',
        userValue: 'Watch videos, earn codes passively',
        riskLevel: 'low',
        apiEndpoints: ['/api/video/next', '/api/video/complete', '/api/codes/reward']
      },

      'safecode': {
        purpose: 'Central asset vault and bank - holds all user codes',
        relations: [
          'pebalaash',
          'farragna',
          'gamesCentre',
          'battalooda',
          'corsa',
          'eb3at'
        ],
        economyRole: 'central_storage',
        criticality: 'critical',
        dataFlow: 'receives from yt-player, distributes to all services',
        userValue: 'Safe storage, quick access to assets',
        riskLevel: 'critical_if_breached',
        tables: ['user_balances', 'transactions', 'assets'],
        alertConditions: [
          'balance_anomaly > 1000%',
          'transaction_spike > 100/minute',
          'unauthorized_withdrawal'
        ]
      },

      'pebalaash': {
        purpose: 'Peer-to-peer barter marketplace',
        relations: ['safecode', 'eb3at', 'corsa', 'farragna'],
        economyRole: 'exchange_mechanism',
        criticality: 'high',
        riskLevel: 'medium',
        userValue: 'Convert codes to real goods/services/gigs',
        dataFlow: 'reads from safecode, facilitates transfers',
        features: [
          'listing_creation',
          'offer_system',
          'escrow_handling',
          'dispute_resolution'
        ],
        economicImpact: 'liquidity_provider'
      },

      'farragna': {
        purpose: 'Social engagement and creator economy platform',
        relations: ['safecode', 'e7ki', 'battalooda', 'samma3ny'],
        economyRole: 'social_glue',
        criticality: 'medium',
        userValue: 'Support creators, build reputation, earn from engagement',
        dataFlow: 'likes_economy → rewards → safecode',
        features: ['likes', 'comments', 'shares', 'creator_support', 'reputation'],
        economicImpact: 'engagement_to_value'
      },

      'gamesCentre': {
        purpose: 'Gambling and gaming zone - high risk/reward',
        relations: ['safecode', 'battalooda', 'watch-dog'],
        economyRole: 'risk_reward_mechanism',
        criticality: 'high',
        riskLevel: 'critical_addiction_potential',
        userValue: 'Entertainment, potential high returns',
        warnings: [
          'Users can lose entire balance',
          'Addiction potential - implement limits',
          'Responsible gaming features required'
        ],
        dataFlow: 'wagers from safecode → win/lose → return/void',
        safeguards: [
          'daily_loss_limit',
          'session_time_limit',
          'under_18_restriction',
          'self_exclusion_option'
        ]
      },

      'battalooda': {
        purpose: 'Creative studio and talent development platform',
        relations: ['pebalaash', 'farragna', 'samma3ny', 'eb3at'],
        economyRole: 'creation_economy',
        criticality: 'medium',
        userValue: 'Create content, monetize skills, build audience',
        dataFlow: 'content → audience → rewards → safecode',
        features: ['content_creation', 'portfolio', 'monetization', 'audience_building']
      },

      'corsa': {
        purpose: 'Investment and trading platform',
        relations: ['safecode', 'pebalaash', 'watch-dog'],
        economyRole: 'investment_mechanism',
        criticality: 'high',
        riskLevel: 'critical_financial_risk',
        userValue: 'Trade assets, invest, potentially multiply codes',
        warnings: [
          'High market volatility',
          'Not financial advice - users assume all risk',
          'Potential for total loss'
        ],
        dataFlow: 'portfolio management → trading → profit/loss → safecode',
        regulations: ['risk_disclosure_required', 'terms_acknowledgement']
      },

      'e7ki': {
        purpose: 'Secure messaging and private communication',
        relations: ['zagel', 'farragna', 'drdMail'],
        economyRole: 'communication_backbone',
        criticality: 'medium',
        security: 'E2E_encrypted',
        userValue: 'Private messaging, secure communication',
        dataFlow: 'P2P encrypted messages'
      },

      'zagel': {
        purpose: 'AI companion and intelligent assistant (CodeMind v2.0)',
        relations: ['all-services'],
        economyRole: 'intelligence_layer',
        criticality: 'high',
        personality: 'Witty, empathetic, proactive, bilingual',
        userValue: 'Assistance, recommendations, learning',
        dataFlow: 'observes patterns → provides insights → learns',
        modes: ['runtime', 'learning'],
        capabilities: ['chat', 'analysis', 'recommendations', 'debugging']
      },

      'auth-core': {
        purpose: 'Authentication and session management',
        relations: ['all-services'],
        economyRole: 'security_backbone',
        criticality: 'critical',
        security: 'session_based_with_tokens',
        userValue: 'Secure account access',
        alertConditions: [
          'unauthorized_access_attempt',
          'session_hijacking_detected',
          'token_manipulation'
        ]
      }
    };

    // ==================== ECONOMIC FLOWS ====================
    this.economicFlows = [
      {
        id: 'earn_to_spend',
        name: 'Watch to Spend',
        flow: 'yt-player → safecode → [pebalaash | farragna | gamesCentre]',
        description: 'Primary value loop - users earn from watching, spend across services',
        healthScore: 0,
        volumePerDay: 0
      },
      {
        id: 'creator_monetization',
        name: 'Create to Monetize',
        flow: 'battalooda → [samma3ny | shots] → farragna → safecode',
        description: 'Creator economy loop - content → audience → rewards',
        healthScore: 0,
        volumePerDay: 0
      },
      {
        id: 'risk_reward',
        name: 'Risk to Reward',
        flow: 'safecode → [gamesCentre | corsa] → [win→safecode | lose→void]',
        description: 'High-risk high-reward loop - gambling and trading',
        riskLevel: 'high',
        healthScore: 0,
        volumePerDay: 0
      },
      {
        id: 'social_value',
        name: 'Engage to Earn',
        flow: 'farragna → likes/engagement → rewards → safecode',
        description: 'Social engagement drives value',
        healthScore: 0,
        volumePerDay: 0
      },
      {
        id: 'peer_exchange',
        name: 'Barter to Value',
        flow: 'safecode → pebalaash → peer_transfer → real_value',
        description: 'Peer-to-peer exchange creates real-world value',
        healthScore: 0,
        volumePerDay: 0
      }
    ];

    // ==================== USER ARCHETYPES ====================
    this.userBehaviorPatterns = {
      newUser: {
        description: 'Just joined the platform',
        typicalActions: ['watch_videos', 'explore_interface', 'check_earnings', 'read_faq'],
        commonQuestions: [
          'How do I earn codes?',
          'What can I do with codes?',
          'Is this safe?',
          'Can I make real money?'
        ],
        psychographics: ['curious', 'cautious', 'learning_mode'],
        riskProfile: 'low',
        interventionNeeded: 'onboarding_guidance'
      },

      active_watcher: {
        description: 'Regular video watcher, consistent earner',
        typicalActions: ['daily_watching', 'check_balance', 'occasional_spending', 'refer_friends'],
        commonQuestions: [
          'How can I earn more?',
          'What are premium features?',
          'How does referral work?'
        ],
        psychographics: ['engaged', 'consistent', 'value_seeking'],
        riskProfile: 'low',
        ltvValue: 'high'
      },

      trader: {
        description: 'Active in marketplace and investment',
        typicalActions: [
          'monitor_corsa',
          'arbitrage_pebalaash',
          'portfolio_management',
          'trend_analysis'
        ],
        commonQuestions: [
          'Market trends?',
          'Arbitrage opportunities?',
          'Portfolio advice?',
          'Risk analysis?'
        ],
        psychographics: ['analytical', 'ambitious', 'risk_taker'],
        riskProfile: 'high',
        interventionNeeded: 'risk_warnings'
      },

      creator: {
        description: 'Content creator monetizing through platform',
        typicalActions: [
          'battalooda_production',
          'farragna_engagement',
          'pebalaash_monetization',
          'audience_building'
        ],
        commonQuestions: [
          'How to grow audience?',
          'Best monetization strategy?',
          'Tools available?',
          'Payment timing?'
        ],
        psychographics: ['creative', 'ambitious', 'community_focused'],
        riskProfile: 'medium',
        ltvValue: 'very_high'
      },

      gambler: {
        description: 'Frequent games/trading participation',
        typicalActions: [
          'gamesCentre_frequent',
          'high_bet_amounts',
          'chasing_losses',
          'extended_sessions'
        ],
        psychographics: ['impulsive', 'thrill_seeking', 'potentially_addicted'],
        riskProfile: 'critical',
        interventionNeeded: 'responsible_gaming_features',
        alerts: [
          'daily_loss_limit_approaching',
          'session_duration_warning',
          'self_exclusion_available'
        ]
      },

      social_butterfly: {
        description: 'Primarily uses farragna and social features',
        typicalActions: ['likes', 'comments', 'shares', 'follows', 'reputation_building'],
        commonQuestions: [
          'How to get more likes?',
          'Reputation value?',
          'Community features?'
        ],
        psychographics: ['social', 'extroverted', 'community_driven'],
        riskProfile: 'low',
        ltvValue: 'medium'
      },

      whale: {
        description: 'High spending, early adopter, ecosystem contributor',
        typicalActions: [
          'all_platform_features',
          'large_transactions',
          'trading_heavy',
          'leadership_role'
        ],
        psychographics: ['experienced', 'wealthy', 'influential'],
        riskProfile: 'medium',
        ltvValue: 'critical',
        vipFeatures: 'enabled'
      }
    };

    // ==================== RUNTIME STATE ====================
    this.runtimeState = {
      systemHealth: 'unknown',
      activeUsers: 0,
      transactionsPerSecond: 0,
      memoryUsage: 0,
      failingModules: [],
      recentErrors: [],
      lastUpdate: null,
      economicHealth: {
        totalCodesInCirculation: 0,
        averageUserBalance: 0,
        transactionVolume24h: 0,
        activeFlows: [],
        economyStatus: 'stable'
      }
    };

    // ==================== INTENT PATTERNS ====================
    this.intentPatterns = {
      technical: {
        keywords: [
          'bug',
          'error',
          'crash',
          'broken',
          'not working',
          'مشكلة',
          'خطأ',
          'معطل'
        ],
        priority: 'high',
        requiresDebugger: true
      },
      performance: {
        keywords: [
          'slow',
          'optimize',
          'improve',
          'performance',
          'lag',
          'بطيء',
          'تحسين'
        ],
        priority: 'medium',
        requiresArchitect: true
      },
      economic: {
        keywords: [
          'earn',
          'spend',
          'price',
          'exchange',
          'profit',
          'فلوس',
          'اكسب',
          'استثمار'
        ],
        priority: 'medium',
        requiresProductManager: true
      },
      security: {
        keywords: [
          'hack',
          'breach',
          'compromise',
          'security',
          'اختراق',
          'سرقة',
          'آمان'
        ],
        priority: 'critical',
        requiresSecurityAuditor: true,
        immediateEscalation: true
      },
      learning: {
        keywords: [
          'how to',
          'learn',
          'explain',
          'tutorial',
          'شرح',
          'كيف',
          'تعليم'
        ],
        priority: 'low',
        requiresAllAgents: true
      }
    };
  }

  // ==================== CONTEXT ENRICHMENT ====================

  /**
   * Enrich a user prompt with full DrD context
   */
  enrichPrompt(userQuery, userProfile = {}, currentState = {}) {
    const intent = this.interpretIntent(userQuery);
    const relevantModules = this.findRelevantModules(intent, userQuery);
    const userArchetype = this.classifyUser(userProfile);
    const economicContext = this.getEconomicContext(relevantModules);

    return {
      enrichedPrompt: `
╔═══════════════════════════════════════════════════════════════╗
║  CODEMIND v2.0 CONTEXT ENGINE - Dr.D ECOSYSTEM INTELLIGENCE ║
╚═══════════════════════════════════════════════════════════════╝

PROJECT IDENTITY:
${JSON.stringify(this.projectIdentity, null, 2)}

USER PROFILE:
- Archetype: ${userArchetype}
- Risk Profile: ${this.userBehaviorPatterns[userArchetype]?.riskProfile || 'unknown'}
- Common Needs: ${JSON.stringify(
        this.userBehaviorPatterns[userArchetype]?.commonQuestions || []
      )}

DETECTED INTENT:
${JSON.stringify(intent, null, 2)}

RELEVANT MODULES & THEIR ROLES:
${relevantModules
  .map(
    m => `
MODULE: ${m}
Purpose: ${this.moduleBrain[m]?.purpose || 'unknown'}
Economy Role: ${this.moduleBrain[m]?.economyRole || 'unknown'}
Criticality: ${this.moduleBrain[m]?.criticality || 'unknown'}
Relations: ${JSON.stringify(this.moduleBrain[m]?.relations || [])}
`
  )
  .join('\n')}

ECONOMIC FLOWS AFFECTED:
${economicContext
  .map(
    f => `
Flow: ${f.name} (${f.id})
Description: ${f.description}
Current Health: ${f.healthScore}%
Daily Volume: ${f.volumePerDay} transactions
`
  )
  .join('\n')}

CURRENT SYSTEM STATE:
${JSON.stringify(this.runtimeState, null, 2)}

ETHICAL & SAFETY CONSIDERATIONS:
${this.getEthicalGuidance(intent, userArchetype)}

INSTRUCTION TO CODEMIND:
You are CodeMind v2.0, the technical and strategic brain of Dr.D.
You understand the platform not as isolated features but as a LIVING ECOSYSTEM.

When responding:
1. Consider how this affects the economic balance
2. Assess impact on the user journey
3. Evaluate security and ethical implications
4. Make the best TECHNICAL AND PRODUCT decision
5. Warn about addiction/risk where relevant
6. Be bilingual-aware (Arabic/English context)

User Query: "${userQuery}"
`,
      intent,
      userArchetype,
      relevantModules,
      economicContext
    };
  }

  /**
   * Interpret user intent from their query
   */
  interpretIntent(query) {
    const lower = query.toLowerCase();
    const arabic = query;

    // Check each intent pattern
    for (const [intentType, pattern] of Object.entries(this.intentPatterns)) {
      const matches = pattern.keywords.some(
        keyword =>
          lower.includes(keyword.toLowerCase()) ||
          arabic.includes(keyword)
      );

      if (matches) {
        return {
          type: intentType,
          priority: pattern.priority,
          requiresDebugger: pattern.requiresDebugger,
          requiresArchitect: pattern.requiresArchitect,
          requiresProductManager: pattern.requiresProductManager,
          requiresSecurityAuditor: pattern.requiresSecurityAuditor,
          immediateEscalation: pattern.immediateEscalation
        };
      }
    }

    return {
      type: 'general',
      priority: 'low',
      requiresAllAgents: false
    };
  }

  /**
   * Find modules relevant to this query
   */
  findRelevantModules(intent, query = '') {
    const mentioned = [];

    // Check what modules are mentioned in query
    for (const moduleName of Object.keys(this.moduleBrain)) {
      if (query.toLowerCase().includes(moduleName.toLowerCase())) {
        mentioned.push(moduleName);
      }
    }

    if (mentioned.length > 0) return mentioned;

    // Infer from intent type
    const defaultModules = {
      technical: ['auth-core', 'safecode', 'bankode-core'],
      performance: ['assetbus', 'watch-dog', 'service-manager'],
      economic: ['safecode', 'pebalaash', 'corsa', 'farragna'],
      security: ['auth-core', 'safecode', 'e7ki'],
      learning: ['zagel', 'yt-player', 'safecode']
    };

    return defaultModules[intent.type] || ['safecode', 'zagel'];
  }

  /**
   * Classify user based on profile
   */
  classifyUser(profile) {
    if (!profile || Object.keys(profile).length === 0) {
      return 'newUser';
    }

    // High trading activity
    if (profile.totalTrades > 50) return 'trader';

    // Heavy gambling
    if (profile.gamesPlayed > 100 && profile.avgSessionLength > 2) return 'gambler';

    // Creator activity
    if (profile.contentCreated > 10) return 'creator';

    // High social engagement
    if (profile.likesGiven > 500 && profile.postsCreated > 20) return 'social_butterfly';

    // Very high spending
    if (profile.totalSpent > 100000) return 'whale';

    // Active regular user
    if (profile.daysActive > 30) return 'active_watcher';

    return 'newUser';
  }

  /**
   * Get economic context for relevant modules
   */
  getEconomicContext(modules) {
    return this.economicFlows.filter(
      flow =>
        modules.some(m => flow.flow.includes(m)) ||
        flow.id === 'earn_to_spend' // Always include primary flow
    );
  }

  /**
   * Get ethical guidance for this intent and user type
   */
  getEthicalGuidance(intent, userArchetype) {
    let guidance = '';

    // Security warnings
    if (intent.type === 'security') {
      guidance += '🚨 SECURITY INCIDENT MODE - Follow established incident response protocol\n';
    }

    // Economic warnings
    if (intent.type === 'economic' && userArchetype === 'gambler') {
      guidance += `⚠️  USER RISK PROFILE: Potential gambling addiction detected.
Include responsible gaming messages and self-exclusion information.\n`;
    }

    if (intent.type === 'economic' && intent.requiresSecurityAuditor) {
      guidance += '⚠️ HIGH RISK QUERY - Verify user authenticity before providing detailed response.\n';
    }

    // Addiction prevention
    if (userArchetype === 'gambler') {
      guidance += `📊 This user may be vulnerable to addiction.
Provide balanced information about risks and available help resources.\n`;
    }

    return guidance || '✅ No special ethical constraints for this context.';
  }

  // ==================== RUNTIME UPDATES ====================

  /**
   * Update system state based on monitoring data
   */
  updateRuntimeState(state) {
    this.runtimeState = {
      ...this.runtimeState,
      ...state,
      lastUpdate: new Date().toISOString()
    };

    console.log('[DrD Context Engine] Runtime state updated');
  }

  /**
   * Get overall system health score
   */
  getSystemHealth() {
    const issues = [];

    if (this.runtimeState.memoryUsage > 1000000000) {
      issues.push({
        severity: 'high',
        message: 'Memory usage critical (>1GB)',
        module: 'system'
      });
    }

    if (this.runtimeState.failingModules.length > 0) {
      issues.push({
        severity: 'critical',
        message: `Modules failing: ${this.runtimeState.failingModules.join(', ')}`,
        module: 'various'
      });
    }

    return {
      healthy: issues.length === 0,
      issues,
      summary:
        issues.length === 0
          ? '🟢 System operating normally'
          : `🔴 ${issues.length} critical issues detected`
    };
  }

  /**
   * Get economic health report
   */
  getEconomicHealthReport() {
    return {
      totalCodesInCirculation: this.runtimeState.economicHealth.totalCodesInCirculation,
      averageUserBalance: this.runtimeState.economicHealth.averageUserBalance,
      transactionVolume24h: this.runtimeState.economicHealth.transactionVolume24h,
      flowStatus: this.economicFlows.map(f => ({
        name: f.name,
        health: f.healthScore,
        volume: f.volumePerDay
      })),
      overallStatus: this.runtimeState.economicHealth.economyStatus
    };
  }
}

module.exports = { DrDContextEngine };
