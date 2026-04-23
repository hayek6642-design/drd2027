// server/ai-agent/agent-core.js
// Main AI agent orchestration — detect intent → build context → call Gemma → return

import { generateWithGemma, getQuotaStats } from '../services/ai-service.js';
import { PLATFORM_MANAGER_PROMPT }           from './personality.js';
import { buildUserContext, contextToText }   from './context-builder.js';
import { analyzeIntent }                     from './tools/analyzer.js';
import { generateActions }                   from './tools/actions.js';
import { resolveService }                    from './tools/navigator.js';

// ─── Conversation history (in-memory, per user) ─────────────────
const histories = new Map(); // userId → Message[]

function getHistory(userId) {
  if (!histories.has(userId)) histories.set(userId, []);
  return histories.get(userId);
}

function pushHistory(userId, role, content) {
  const h = getHistory(userId);
  h.push({ role, content });
  if (h.length > 20) h.splice(0, h.length - 20); // keep last 10 exchanges
}

// ─── Fallback (when API fails) ───────────────────────────────────
function buildFallback(ctx, isArabic) {
  const { assets } = ctx;
  const noAssets = assets.codes === 0 && assets.silver === 0 && assets.gold === 0;

  if (isArabic) {
    if (noAssets) return 'محفظتك فارغة حالياً 🌱 ابدأ باللعب في Games Centre أو شاهد فيديوهات في Farragna لتكسب أول كودزك!';
    return `لديك ${assets.codes} كود${assets.gold > 0 ? ` و${assets.gold} ذهب 🥇` : ''}. ${assets.codes >= 10 ? 'يمكنك التسوق في Pebalaash أو تأمين كودزك في SafeCode.' : 'العب في Games Centre لتزيد رصيدك!'} 💡`;
  }

  if (noAssets) return "Your portfolio is empty 🌱 Start by playing Games Centre or watching Farragna to earn your first codes!";
  return `You have ${assets.codes} codes${assets.gold > 0 ? ` and ${assets.gold} gold 🥇` : ''}. ${assets.codes >= 10 ? 'Shop at Pebalaash or secure them in SafeCode.' : 'Play Games Centre to grow your balance.'} 💡`;
}

// ─── Main entry ─────────────────────────────────────────────────
export async function processMessage(userId, userMessage) {
  try {
    const analysis = analyzeIntent(userMessage);
    const ctx      = await buildUserContext(userId);

    // Fast-path: direct navigation command
    if (analysis.primaryIntent === 'navigate' && analysis.mentionedServices.length > 0) {
      const svc = resolveService(analysis.mentionedServices[0]);
      if (svc) {
        const navAction = {
          id:     svc.id,
          label:  analysis.isArabic ? `افتح ${svc.id}` : `Open ${svc.id}`,
          url:    svc.url,
          color:  '#00d4ff',
          reason: analysis.isArabic ? 'انتقال مباشر' : 'Direct navigation',
        };
        return {
          text:    analysis.isArabic
            ? `سأفتح ${svc.id} الآن! 🚀`
            : `Opening ${svc.id} for you now! 🚀`,
          actions: [navAction, ...generateActions(ctx, 'navigate', analysis.isArabic)].slice(0, 4),
          intent:  'navigate',
          model:   'router',
          ctx:     { assets: ctx.assets, tier: ctx.user.tier },
          quota:   getQuotaStats(),
        };
      }
    }

    // Build prompt messages
    const systemContent = PLATFORM_MANAGER_PROMPT + '\n\n' + contextToText(ctx);
    const history       = getHistory(userId);
    const messages      = [
      { role: 'system', content: systemContent },
      ...history.slice(-8),
      { role: 'user',   content: userMessage },
    ];

    // Call Gemma
    let text, model;
    try {
      const result = await generateWithGemma(messages, 'manager', true);
      text  = result.text;
      model = result.model;
    } catch (apiErr) {
      console.warn('[AgentCore] API unavailable, using fallback:', apiErr.message);
      text  = buildFallback(ctx, analysis.isArabic);
      model = 'fallback';
    }

    // Save conversation
    pushHistory(userId, 'user',      userMessage);
    pushHistory(userId, 'assistant', text);

    return {
      text,
      actions: generateActions(ctx, analysis.primaryIntent, analysis.isArabic),
      intent:  analysis.primaryIntent,
      model,
      ctx:     { assets: ctx.assets, tier: ctx.user.tier },
      quota:   getQuotaStats(),
    };

  } catch (err) {
    console.error('[AgentCore] Fatal:', err);
    return {
      text:    'حدث خطأ مؤقت — حاول مرة أخرى / Temporary error — please try again.',
      actions: [],
      error:   true,
      quota:   getQuotaStats(),
    };
  }
}

export function clearHistory(userId) {
  histories.delete(userId);
}
