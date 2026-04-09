const fetch = require('node-fetch');
const crypto = require('crypto');

class AIService {
  constructor() {
    this.config = {
      apiKey: process.env.GOOGLE_AI_API_KEY || 'AIzaSyBvLFqeRRRaO8woNTlOgLxOFYrGExcKqtA',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      models: {
        manager: 'gemma-4-27b-it',
        code: 'gemma-4-26b',
        fast: 'gemma-4-4b'
      },
      dailyQuota: 1500,
      requestCount: 0,
      lastReset: Date.now()
    };
    
    this.cache = new Map();
    this.initQuotaReset();
    
    console.log('[AI-Service] Initialized with quota:', this.config.dailyQuota);
  }

  initQuotaReset() {
    setInterval(() => {
      this.config.requestCount = 0;
      this.config.lastReset = Date.now();
      console.log('[AI-Service] Daily quota reset');
    }, 24 * 60 * 60 * 1000);
  }

  async generateResponse(userId, prompt, options = {}) {
    try {
      if (this.config.requestCount >= this.config.dailyQuota) {
        return {
          success: false,
          error: 'Daily AI quota exceeded (1500 requests). Try again tomorrow.',
          fallback: true
        };
      }

      const cacheKey = this.hashPrompt(userId, prompt);
      
      if (this.cache.has(cacheKey) && !options.skipCache) {
        return {
          success: true,
          text: this.cache.get(cacheKey),
          cached: true,
          quotaRemaining: this.config.dailyQuota - this.config.requestCount
        };
      }

      const model = options.model || this.config.models.manager;
      console.log('[AI-Service] Calling Gemma API, model:', model);
      
      const response = await this.callGemmaAPI(model, prompt, options);
      
      this.cache.set(cacheKey, response);
      setTimeout(() => this.cache.delete(cacheKey), 60 * 60 * 1000);
      this.config.requestCount++;

      return {
        success: true,
        text: response,
        quotaRemaining: this.config.dailyQuota - this.config.requestCount,
        cached: false
      };

    } catch (error) {
      console.error('[AI-Service] Error:', error);
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }

  async callGemmaAPI(model, prompt, options = {}) {
    const url = `${this.config.endpoint}/${model}:generateContent?key=${this.config.apiKey}`;
    
    const body = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.8,
        maxOutputTokens: options.maxTokens || 2048,
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemma API ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Unknown API error');
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
      
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  hashPrompt(userId, prompt) {
    return crypto.createHash('md5').update(`${userId}:${prompt}`).digest('hex');
  }

  getStats() {
    return {
      quotaUsed: this.config.requestCount,
      quotaTotal: this.config.dailyQuota,
      quotaRemaining: this.config.dailyQuota - this.config.requestCount,
      cacheSize: this.cache.size,
      lastReset: new Date(this.config.lastReset).toISOString(),
      resetIn: Math.floor((this.config.lastReset + 24 * 60 * 60 * 1000 - Date.now()) / 1000 / 60)
    };
  }
}

module.exports = new AIService();