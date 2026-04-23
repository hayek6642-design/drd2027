/**
 * ZAGEL Automation v2.0.0
 * Arabic command parser with auto-execution
 * Natural language commands for controlling Zagel OS
 */

(function () {
  'use strict';
  if (window.__ZAGEL_AUTOMATION__) return;

  const COMMANDS = [
    { pattern: /^(قولي|اخبرني|ابحث عن)\s+سعر\s+(الذهب|ذهب)/i, action: 'fetch_gold', category: 'intelligence' },
    { pattern: /^(قولي|اخبرني|ابحث عن)\s+سعر\s+(الدولار|دولار)/i, action: 'fetch_usd', category: 'intelligence' },
    { pattern: /^(قولي|اخبرني|وريني)\s+(الاخبار|أخبار|اخبار)/i, action: 'fetch_news', category: 'intelligence' },
    { pattern: /^(فكرني|ذكرني)\s+(.+)\s+(بعد|في)\s+(\d+)\s+(دقيقة|دقائق|ساعة|ساعات)/i, action: 'set_reminder', category: 'trigger' },
    { pattern: /^(قولي|اخبرني)\s+لما\s+(.+)/i, action: 'set_trigger', category: 'trigger' },
    { pattern: /^(ابعت|رسالة)\s+(ل|الى)\s+(.+)/i, action: 'send_message', category: 'communication' },
    { pattern: /^(افتح|شغل)\s+(.+)/i, action: 'open_app', category: 'navigation' },
    { pattern: /^(وقف|أوقف|سكوت)\s*(الاشعارات|notifications)?/i, action: 'quiet_mode', category: 'flow' },
    { pattern: /^(شغل|فعل)\s*(التركيز|focus)/i, action: 'focus_mode', category: 'flow' },
    { pattern: /^(ملخص|لخصلي)\s*(اليوم|يومي)?/i, action: 'daily_summary', category: 'summary' },
    { pattern: /^(مين|من)\s*(كلمني|بعتلي|راسلني)/i, action: 'recent_contacts', category: 'social' },
    { pattern: /^(وحشني|اطمن على)\s+(.+)/i, action: 'check_contact', category: 'social' },
    { pattern: /^(ازيك|كيفك|حالك ايه)/i, action: 'zagel_status', category: 'meta' },
    { pattern: /^(ساعدني|مساعدة|help)/i, action: 'show_help', category: 'meta' }
  ];

  class ZagelAutomation {
    constructor() {
      this._customCommands = [];
      this._history = [];
      this._executors = {};

      this._registerDefaultExecutors();
      console.log('⚙️ [Zagel-Automation] Engine initialized');
    }

    _registerDefaultExecutors() {
      this._executors = {
        fetch_gold: async () => {
          if (window.ZagelIntelligence) {
            const data = await window.ZagelIntelligence.getGold();
            return window.ZagelIntelligence.formatForArabic(data);
          }
          return 'خدمة الذهب غير متاحة حالياً';
        },

        fetch_usd: async () => {
          if (window.ZagelIntelligence) {
            const data = await window.ZagelIntelligence.getUSD();
            return window.ZagelIntelligence.formatForArabic(data);
          }
          return 'خدمة العملات غير متاحة حالياً';
        },

        fetch_news: async () => {
          if (window.ZagelIntelligence) {
            const data = await window.ZagelIntelligence.getNews();
            if (data?.articles?.length) {
              return data.articles.slice(0, 3).map((a, i) => `${i + 1}. ${a.title}`).join('\n');
            }
          }
          return 'لا توجد أخبار حالياً';
        },

        set_reminder: async (params) => {
          const text = params.groups?.[1] || 'تذكير';
          const amount = parseInt(params.groups?.[3]) || 5;
          const unit = params.groups?.[4] || 'دقيقة';
          const ms = unit.includes('ساع') ? amount * 3600000 : amount * 60000;

          setTimeout(() => {
            if (window.ZagelBus) window.ZagelBus.emit('automation:reminder', { text });
            if (window.ZagelVoice) window.ZagelVoice.speak(`تذكير: ${text}`);
          }, ms);

          return `تم! هفكرك بعد ${amount} ${unit}: ${text}`;
        },

        quiet_mode: async () => {
          if (window.ZagelFlow) {
            window.ZagelFlow.setQuietMode(true);
            return 'تم تفعيل الوضع الهادي 🤫';
          }
          return 'خدمة التحكم غير متاحة';
        },

        focus_mode: async () => {
          if (window.ZagelFlow) {
            window.ZagelFlow.setFocusMode(true);
            return 'تم تفعيل وضع التركيز 🎯';
          }
          return 'خدمة التحكم غير متاحة';
        },

        daily_summary: async () => {
          const parts = [];
          if (window.ZagelMemory) {
            const stats = window.ZagelMemory.getStats();
            parts.push(`🧠 ذكريات: ${stats.total}`);
          }
          if (window.ZagelEmotion) {
            const mood = window.ZagelEmotion.getMood();
            parts.push(`💖 المزاج: ${mood}`);
            const gaps = window.ZagelEmotion.detectSocialGaps();
            if (gaps.length) parts.push(`👥 أصدقاء محتاجينك: ${gaps.length}`);
          }
          if (window.ZagelFlow) {
            const stats = window.ZagelFlow.getStats();
            parts.push(`📊 إشعارات اليوم: ${stats.delivered}`);
          }
          return parts.length ? `📋 ملخص يومك:\n${parts.join('\n')}` : 'مفيش بيانات كافية لسه';
        },

        zagel_status: async () => {
          return 'أنا تمام الحمد لله! 🦅 جاهز أساعدك في أي حاجة';
        },

        show_help: async () => {
          return `🦅 أوامر زاجل المتاحة:
• "قولي سعر الذهب" - سعر الذهب الحالي
• "قولي سعر الدولار" - سعر الدولار
• "قولي الأخبار" - آخر الأخبار
• "فكرني [حاجة] بعد [وقت]" - تذكير
• "وقف الإشعارات" - الوضع الهادي
• "شغل التركيز" - وضع التركيز
• "ملخص اليوم" - ملخص يومي
• "وحشني [اسم]" - اطمن على صديق`;
        }
      };
    }

    async parse(input) {
      const trimmed = input.trim();

      // Check custom commands first
      for (const cmd of this._customCommands) {
        const match = trimmed.match(cmd.pattern);
        if (match) {
          return { matched: true, action: cmd.action, params: { groups: match }, custom: true };
        }
      }

      // Check built-in commands
      for (const cmd of COMMANDS) {
        const match = trimmed.match(cmd.pattern);
        if (match) {
          return { matched: true, action: cmd.action, category: cmd.category, params: { groups: match } };
        }
      }

      return { matched: false, input: trimmed };
    }

    async execute(input) {
      const parsed = await this.parse(input);

      if (!parsed.matched) {
        // Fallback to conversation engine
        if (window.ZagelConversation) {
          const result = await window.ZagelConversation.send(input);
          return { type: 'conversation', result };
        }
        return { type: 'unknown', message: 'مش فاهم الأمر ده' };
      }

      const executor = this._executors[parsed.action];
      if (!executor) {
        return { type: 'no_executor', action: parsed.action, message: 'الأمر ده مش متنفذ لسه' };
      }

      try {
        const result = await executor(parsed.params);
        this._history.push({ input, action: parsed.action, result, ts: Date.now() });

        if (window.ZagelBus) {
          window.ZagelBus.emit('automation:executed', { action: parsed.action, result });
        }

        if (window.ZagelBrain) {
          window.ZagelBrain.observe('command', { action: parsed.action, category: parsed.category });
        }

        return { type: 'success', action: parsed.action, result };
      } catch (err) {
        return { type: 'error', action: parsed.action, error: err.message };
      }
    }

    addCommand(pattern, action, executor) {
      this._customCommands.push({ pattern, action });
      if (executor) this._executors[action] = executor;
    }

    registerExecutor(action, executor) {
      this._executors[action] = executor;
    }

    getHistory() { return [...this._history]; }
    getCommands() { return COMMANDS.map(c => ({ action: c.action, category: c.category })); }

    destroy() {
      this._customCommands = [];
      this._history = [];
      this._executors = {};
      delete window.__ZAGEL_AUTOMATION__;
    }
  }

  window.__ZAGEL_AUTOMATION__ = new ZagelAutomation();
  window.ZagelAutomation = window.__ZAGEL_AUTOMATION__;
})();
