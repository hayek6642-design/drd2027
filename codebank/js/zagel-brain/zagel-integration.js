/**
 * Zagel Brain v3 - Integration Layer
 */
(function() {
  'use strict';
  const API_ENDPOINT = '/api/ai/chat';
  const DEFAULT_MODEL = 'gemini-1.5-flash';
  class ZagelBrainIntegration {
    constructor() {
      this._initialized = false;
      this._interceptInstalled = false;
      this._chatHistory = [];
      console.log('🧠🕊️ [ZagelBrain-Integration] Connector loading...');
    }
    async init() {
      if (this._initialized) return;
      const modules = ['Recognition', 'Memory', 'Personality', 'PromptBuilder', 'ResponseEngine'];
      const missing = modules.filter(m => !window.ZagelBrainV3?.[m]);
      if (missing.length > 0) console.warn(`🧠 [Integration] Missing modules: ${missing.join(', ')}`);
      this._installConversationHook();
      this._setupBusListeners();
      this._initialized = true;
      console.log('🧠🕊️ [ZagelBrain-Integration] ✅ All systems connected');
      if (window.ZagelBus) window.ZagelBus.emit('brain:v3:ready', { modules: modules.filter(m => window.ZagelBrainV3?.[m]), version: '3.0.0' });
    }
    async chat(message) {
      const promptBuilder = window.ZagelBrainV3?.PromptBuilder;
      const responseEngine = window.ZagelBrainV3?.ResponseEngine;
      if (!promptBuilder || !responseEngine) {
        console.error('🧠 [Integration] Missing PromptBuilder or ResponseEngine');
        return { error: 'Brain modules not loaded', text: 'عندي مشكلة تقنية... استنى شوية 🕊️' };
      }
      try {
        const promptContext = await promptBuilder.build(message);
        const rawResponse = await this._callAPI(promptContext);
        const processed = responseEngine.process(rawResponse, promptContext);
        this._chatHistory.push({
          user: message,
          assistant: processed.text,
          sentiment: promptContext.sentiment,
          animation: processed.animation,
          ts: Date.now()
        });
        if (this._chatHistory.length > 50) this._chatHistory = this._chatHistory.slice(-30);
        return processed;
      } catch (error) {
        console.error('🧠 [Integration] Chat error:', error);
        const personality = window.ZagelBrainV3?.Personality;
        const fallback = personality ? personality.getDoveMetaphor('thinking') : 'أنا تايه شوية... جرب تاني كمان شوية 🕊️';
        return { text: fallback, animation: 'gentle-bob', error: error.message };
      }
    }
    async _callAPI(promptContext) {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptContext.userMessage,
          model: DEFAULT_MODEL,
          systemPrompt: promptContext.systemPrompt
        })
      });
      if (!response.ok) throw new Error(`API ${response.status}: ${await response.text().catch(() => 'unknown')}`);
      const data = await response.json();
      return data.reply || data.response || data.message || data.text || '';
    }
    _installConversationHook() {
      if (this._interceptInstalled) return;
      const originalSend = window.ZagelConversation?.send?.bind(window.ZagelConversation);
      if (originalSend) {
        window.ZagelConversation.send = async (message, options = {}) => {
          if (options.bypassBrain) return originalSend(message, options);
          const result = await this.chat(message);
          if (window.ZagelBus) window.ZagelBus.emit('conversation:response', { user: message, assistant: result.text, brainV3: true });
          return { success: !result.error, response: result.text };
        };
        this._interceptInstalled = true;
        console.log('🧠 [Integration] Conversation hook installed');
      }
    }
    _setupBusListeners() {
      if (!window.ZagelBus) return;
      window.ZagelBus.on('user:reaction', (data) => {
        const personality = window.ZagelBrainV3?.Personality;
        if (!personality) return;
        if (['😂', '🤣', '😆'].includes(data?.emoji)) personality.learnHumorPreference(true);
      });
      window.ZagelBus.on('conversation:user_message', async (data) => {
        if (data?.message) {
          const recognition = window.ZagelBrainV3?.Recognition;
          if (recognition) recognition.analyze(data.message);
        }
      });
    }
    getChatHistory() { return [...this._chatHistory]; }
    getSystemStatus() {
      return {
        initialized: this._initialized,
        interceptInstalled: this._interceptInstalled,
        modules: {
          recognition: !!window.ZagelBrainV3?.Recognition,
          memory: !!window.ZagelBrainV3?.Memory,
          personality: !!window.ZagelBrainV3?.Personality,
          promptBuilder: !!window.ZagelBrainV3?.PromptBuilder,
          responseEngine: !!window.ZagelBrainV3?.ResponseEngine
        },
        chatHistoryLength: this._chatHistory.length,
        memoryStats: window.ZagelBrainV3?.Memory?.getStats(),
        personalitySummary: window.ZagelBrainV3?.Personality?.getPersonalitySummary(),
        responseStats: window.ZagelBrainV3?.ResponseEngine?.getStats()
      };
    }
    reset() {
      this._chatHistory = [];
      window.ZagelBrainV3?.Memory?.clearShortTerm();
      console.log('🧠 [Integration] Brain reset');
    }
  }
  if (!window.ZagelBrainV3) window.ZagelBrainV3 = {};
  const integration = new ZagelBrainIntegration();
  window.ZagelBrainV3.Integration = integration;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => integration.init());
  } else {
    setTimeout(() => integration.init(), 100);
  }
})();
