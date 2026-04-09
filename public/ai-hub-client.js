/**
 * AI-Hub Client
 * Browser-side interface to AI-Hub Platform Manager
 */
(function() {
  'use strict';

  class AIHubClient {
    constructor(options = {}) {
      this.endpoint = options.endpoint || '/api/ai';
      this.conversation = [];
      this.currentAgent = 'manager';
      this.isProcessing = false;
      this.onMessageCallback = null;
      this.onActionCallback = null;
      this.onErrorCallback = null;
      
      this.send = this.send.bind(this);
      this.executeAction = this.executeAction.bind(this);
      this.getStats = this.getStats.bind(this);
    }

    async send(message, options = {}) {
      if (this.isProcessing) {
        throw new Error('Already processing a message');
      }
      
      if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string');
      }
      
      this.isProcessing = true;
      this.addToHistory('user', message);
      
      try {
        const token = this.getAuthToken();
        const assets = options.assets || this.getAssetsFromAppState();
        
        const response = await fetch(`${this.endpoint}/agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            message: message,
            context: {
              assets: assets,
              timestamp: Date.now()
            }
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown error');
        }
        
        this.addToHistory('assistant', data.reply, {
          actions: data.actions,
          intent: data.intent,
          cached: data.cached
        });
        
        if (this.onMessageCallback) {
          this.onMessageCallback(data);
        }
        
        return data;
        
      } catch (error) {
        console.error('[AI-Client] Error:', error);
        
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }
        
        return {
          success: false,
          reply: '❌ خطأ في الاتصال. تحقق من الإنترنت.\nConnection error. Check your internet.',
          actions: [],
          error: error.message
        };
        
      } finally {
        this.isProcessing = false;
      }
    }

    async executeAction(action) {
      try {
        const token = this.getAuthToken();
        
        const response = await fetch(`${this.endpoint}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ action })
        });
        
        const data = await response.json();
        
        if (data.success && data.command) {
          this.navigateToService(data.command);
          
          if (this.onActionCallback) {
            this.onActionCallback(data.command);
          }
        }
        
        return data;
        
      } catch (error) {
        console.error('[AI-Client] Execute error:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    navigateToService(command) {
      if (!command) return;
      
      if (window.ServiceLoader && command.service) {
        window.ServiceLoader.mount(command.service, command.url);
        return;
      }
      
      if (command.url) {
        window.location.href = command.url;
        return;
      }
      
      if (command.action === 'show_modal') {
        window.dispatchEvent(new CustomEvent('ai:show_modal', {
          detail: { service: command.service }
        }));
      }
    }

    async getStats() {
      try {
        const response = await fetch(`${this.endpoint}/stats`);
        return await response.json();
      } catch (error) {
        console.error('[AI-Client] Stats error:', error);
        return null;
      }
    }

    async getQuota() {
      try {
        const response = await fetch(`${this.endpoint}/quota`);
        return await response.json();
      } catch (error) {
        return null;
      }
    }

    onMessage(callback) {
      this.onMessageCallback = callback;
      return this;
    }
    
    onAction(callback) {
      this.onActionCallback = callback;
      return this;
    }
    
    onError(callback) {
      this.onErrorCallback = callback;
      return this;
    }

    getAuthToken() {
      return localStorage.getItem('sessionId') || 
             localStorage.getItem('auth_token') || 
             localStorage.getItem('token') ||
             null;
    }

    getAssetsFromAppState() {
      if (window.AppState && window.AppState.assets) {
        return window.AppState.assets;
      }
      return { codes: [], silver: [], gold: [] };
    }

    addToHistory(role, content, metadata = {}) {
      this.conversation.push({
        role,
        content,
        timestamp: Date.now(),
        ...metadata
      });
      
      if (this.conversation.length > 50) {
        this.conversation = this.conversation.slice(-50);
      }
    }

    getHistory() {
      return [...this.conversation];
    }

    clearHistory() {
      this.conversation = [];
    }

    exportConversation() {
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        messages: this.conversation
      }, null, 2);
    }
  }

  window.AIHubClient = AIHubClient;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.aiHubClient = new AIHubClient();
    });
  } else {
    window.aiHubClient = new AIHubClient();
  }
  
})();