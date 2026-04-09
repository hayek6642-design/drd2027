const { personality } = require('./personality');
const { buildContext } = require('./context-builder');
const { detectIntent, extractEntities } = require('./tools/analyzer');
const { suggestActions, getQuickReplies } = require('./tools/actions');
const { validateCommand } = require('./tools/navigator');
const aiService = require('../services/ai-service');

async function runAgent(message, user, assets, services) {
  try {
    console.log('[Agent] Processing message for user:', user.id);
    
    // Step 1: Detect intent and extract entities
    const intent = detectIntent(message);
    const entities = extractEntities(message);
    
    console.log('[Agent] Intent detected:', intent.type, 'Confidence:', intent.confidence);
    
    // Step 2: Build comprehensive context
    const context = buildContext(user, assets, services);
    
    // Step 3: Generate smart actions
    const suggestedActions = suggestActions(user, intent, assets);
    const quickReplies = getQuickReplies(intent);
    
    // Step 4: Construct the prompt for Gemma
    const systemPrompt = constructPrompt(personality, context, message, intent, suggestedActions);
    
    // Step 5: Call Gemma API
    console.log('[Agent] Calling Gemma API...');
    const aiResponse = await aiService.generateResponse(user.id, systemPrompt, {
      model: 'gemma-4-27b-it',
      temperature: 0.8,
      maxTokens: 2048
    });
    
    // Step 6: Handle response
    if (!aiResponse.success) {
      console.warn('[Agent] Gemma API failed, using fallback');
      return generateFallbackResponse(intent, assets, suggestedActions, quickReplies);
    }
    
    // Step 7: Validate any navigation commands in actions
    const validatedActions = suggestedActions.map(action => {
      if (action.action && action.action.startsWith('open_')) {
        const validation = validateCommand(action.action, 
          { authenticated: user.authenticated }, 
          assets
        );
        return {
          ...action,
          disabled: !validation.valid,
          disabledReason: validation.error
        };
      }
      return action;
    });
    
    return {
      success: true,
      reply: aiResponse.text,
      actions: validatedActions,
      quickReplies: quickReplies.slice(0, 3),
      intent: intent,
      entities: entities,
      quotaRemaining: aiResponse.quotaRemaining,
      cached: aiResponse.cached,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[Agent] Critical error:', error);
    return {
      success: false,
      reply: 'عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.\nSorry, a technical error occurred. Please try again.',
      actions: [],
      quickReplies: [],
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

function constructPrompt(personality, context, message, intent, actions) {
  const actionsText = actions.map((a, i) => 
    `${i + 1}. ${a.label} (${a.action}) - ${a.reason}`
  ).join('\n');
  
  return `
${personality}

========================================
${context}
========================================

CURRENT USER MESSAGE:
"${message}"

DETECTED INTENT: ${intent.type}
${intent.target ? `TARGET: ${intent.target}` : ''}
${intent.confidence ? `CONFIDENCE: ${Math.round(intent.confidence * 100)}%` : ''}

SUGGESTED ACTIONS:
${actionsText}

INSTRUCTIONS:
1. Respond naturally as the Platform Manager
2. Reference their specific asset counts
3. Be warm, strategic, and helpful
4. If suggesting actions, explain WHY each benefits them
5. Keep response under 150 words
6. Use Arabic if the user message is in Arabic, English if English
7. Make them feel their portfolio has potential

RESPOND NOW:
`;
}

function generateFallbackResponse(intent, assets, actions, quickReplies) {
  const codes = assets?.codes?.length || 0;
  const silver = assets?.silver?.length || 0;
  const gold = assets?.gold?.length || 0;
  
  let reply = '';
  
  // Asset inquiry fallback
  if (intent.type === 'asset_inquiry') {
    if (codes === 0 && silver === 0 && gold === 0) {
      reply = `مرحباً! محفظتك فارغة حالياً. ابدأ بمشاهدة فيديو في YT-Player لجمع أول أكوادك.\nHello! Your portfolio is empty. Start by watching a video in YT-Player to earn your first codes.`;
    } else {
      reply = `لديك ${codes} كود، ${silver} فضة، و ${gold} ذهب. ${actions.length > 0 ? actions[0].reasonAr : 'استكشف خدماتنا لتحقيق أقصى استفادة.'}\nYou have ${codes} codes, ${silver} silver, and ${gold} gold. ${actions.length > 0 ? actions[0].reason : 'Explore our services to maximize value.'}`;
    }
  }
  // Navigation fallback
  else if (intent.type === 'navigate') {
    reply = `سأفتح ${intent.target} لك الآن.\nOpening ${intent.target} for you now.`;
  }
  // Help fallback
  else if (intent.type === 'help') {
    reply = `أنا هنا للمساعدة! يمكنني مساعدتك في إدارة أصولك والتنقل بين الخدمات.\nI'm here to help! I can assist with managing your assets and navigating services.`;
  }
  // Greeting fallback
  else if (intent.type === 'greeting') {
    reply = `أهلاً وسهلاً! أنا مدير منصتك الذكي. كيف يمكنني مساعدتك اليوم؟\nWelcome! I'm your AI Platform Manager. How can I help you today?`;
  }
  // General fallback
  else {
    reply = `أنا أفهم أنك تسأل عن "${intent.type}". يمكنني مساعدتك في إدارة أصولك أو التنقل إلى أي خدمة.\nI understand you're asking about "${intent.type}". I can help manage your assets or navigate to any service.`;
  }
  
  return {
    success: true,
    reply: reply,
    actions: actions,
    quickReplies: quickReplies.slice(0, 3),
    intent: intent,
    fallback: true,
    quotaRemaining: 0,
    cached: false,
    timestamp: new Date().toISOString()
  };
}

module.exports = { runAgent };