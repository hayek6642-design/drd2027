/**
 * ZAGEL Conversation Engine v2.0.0
 * OpenAI GPT-3.5 integration with Arabic support
 * Personality-aware responses with context management
 */

(function () {
  'use strict';
  if (window.__ZAGEL_CONVERSATION__) return;

  const DEFAULT_CONFIG = {
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.8,
    apiEndpoint: '/api/ai/chat',
    systemPrompt: `أنت زاجل، مساعد ذكي ودود يتحدث العربية بلهجة مصرية. أنت حنون ومرح وذكي.
You are Zagel, a friendly AI companion who speaks Arabic (Egyptian dialect). You are caring, witty, and intelligent.
- Be warm and personal
- Use Egyptian Arabic naturally
- Add relevant emojis
- Be proactive and helpful
- Remember context from the conversation`,
    maxHistory: 20
  };

  class ZagelConversationEngine {
    constructor() {
      this._config = { ...DEFAULT_CONFIG };
      this._history = [];
      this._isProcessing = false;
      this._apiKey = null;
      this._listeners = { response: [], error: [], typing: [] };

      console.log('💬 [Zagel-Conversation] Engine initialized');
    }

    setApiKey(key) {
      this._apiKey = key;
    }

    setConfig(config) {
      this._config = { ...this._config, ...config };
    }

    async send(message, options = {}) {
      if (this._isProcessing) {
        return { error: 'Already processing a message', queued: true };
      }

      this._isProcessing = true;
      this._emit('typing', { isTyping: true });

      // Add user message to history
      this._history.push({ role: 'user', content: message, ts: Date.now() });

      try {
        // Enhance system prompt with personality
        let systemPrompt = this._config.systemPrompt;
        if (window.ZagelPersonality) {
          const personality = window.ZagelPersonality.generateResponse({});
          systemPrompt += `\n\nCurrent personality tone: ${personality.tone}. Max response length: ${personality.maxLength}.`;
          if (personality.shouldAddEmoji) systemPrompt += ' Add emojis.';
        }

        // Add memory context
        if (window.ZagelMemory) {
          const relevantMemories = window.ZagelMemory.recall(message, { limit: 3 });
          if (relevantMemories.length > 0) {
            const memContext = relevantMemories.map(m =>
              typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            ).join('\n');
            systemPrompt += `\n\nRelevant memories about this user:\n${memContext}`;
          }
        }

        // Add emotion context
        if (window.ZagelEmotion) {
          const mood = window.ZagelEmotion.getMood();
          if (mood !== 'neutral') {
            systemPrompt += `\n\nThe user seems to be feeling: ${mood}. Respond accordingly.`;
          }
        }

        const messages = [
          { role: 'system', content: systemPrompt },
          ...this._history.slice(-this._config.maxHistory).map(h => ({ role: h.role, content: h.content }))
        ];

        const response = await this._callAPI(messages, options);

        // Add assistant response to history
        this._history.push({ role: 'assistant', content: response, ts: Date.now() });
        if (this._history.length > this._config.maxHistory * 2) {
          this._history = this._history.slice(-this._config.maxHistory);
        }

        // Store in memory
        if (window.ZagelMemory) {
          window.ZagelMemory.remember(message, { tier: 'short', tags: ['conversation'], source: 'user_message' });
        }

        // Brain observation
        if (window.ZagelBrain) {
          window.ZagelBrain.observe('conversation', { messageLength: message.length });
        }

        this._emit('response', { message: response, userMessage: message });

        if (window.ZagelBus) {
          window.ZagelBus.emit('conversation:response', { user: message, assistant: response });
        }

        return { success: true, response };
      } catch (err) {
        const error = { message: err.message, code: err.code || 'UNKNOWN' };
        this._emit('error', error);
        return { success: false, error };
      } finally {
        this._isProcessing = false;
        this._emit('typing', { isTyping: false });
      }
    }

    async _callAPI(messages, options = {}) {
      const endpoint = options.endpoint || this._config.apiEndpoint;
      const headers = { 'Content-Type': 'application/json' };

      if (this._apiKey) {
        headers['Authorization'] = `Bearer ${this._apiKey}`;
      }

      const body = {
        model: this._config.model,
        messages,
        max_tokens: this._config.maxTokens,
        temperature: this._config.temperature
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${errText}`);
      }

      const data = await response.json();

      // Handle OpenAI format
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }

      // Handle direct response format
      if (data.response || data.message || data.text) {
        return data.response || data.message || data.text;
      }

      throw new Error('Unexpected API response format');
    }

    on(event, callback) {
      if (this._listeners[event]) {
        this._listeners[event].push(callback);
      }
      return () => this.off(event, callback);
    }

    off(event, callback) {
      if (this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
      }
    }

    _emit(event, data) {
      (this._listeners[event] || []).forEach(cb => {
        try { cb(data); } catch (e) { console.error(`💬 [Conversation] Listener error:`, e); }
      });
    }

    getHistory() { return [...this._history]; }
    clearHistory() { this._history = []; }
    isProcessing() { return this._isProcessing; }

    async quickReply(context) {
      const personality = window.ZagelPersonality?.generateResponse(context);
      if (personality?.greeting) return personality.greeting;
      return 'أهلاً! 👋';
    }

    destroy() {
      this._history = [];
      this._listeners = { response: [], error: [], typing: [] };
      delete window.__ZAGEL_CONVERSATION__;
    }
  }

  window.__ZAGEL_CONVERSATION__ = new ZagelConversationEngine();
  window.ZagelConversation = window.__ZAGEL_CONVERSATION__;
})();
