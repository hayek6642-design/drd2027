/**
 * ZAGEL E7ki Connector v2.0.0
 * Chat/messaging platform integration
 */

(function () {
  'use strict';
  if (window.__ZAGEL_CONNECTOR_E7KI__) return;

  class ZagelE7kiConnector extends (window.ZagelConnectorBase || class {}) {
    constructor() {
      super('e7ki', { name: 'E7ki Chat', apiBase: '/api/e7ki' });
      console.log('💬 [Connector:E7ki] Ready');
    }

    async onNewMessage(message) {
      // Track contact
      if (window.ZagelEmotion && message.senderId) {
        window.ZagelEmotion.trackContact(message.senderId, {
          name: message.senderName,
          type: 'message',
          sentiment: window.ZagelEmotion.analyzeSentiment(message.text || '').label
        });
      }

      // Store in memory
      if (window.ZagelMemory) {
        window.ZagelMemory.remember({
          type: 'chat_message',
          from: message.senderName,
          preview: (message.text || '').slice(0, 100)
        }, { tags: ['e7ki', 'chat', message.senderId], tier: 'short' });
      }

      // Priority scoring
      if (window.ZagelPriority) {
        const score = window.ZagelPriority.enqueue({
          ...message,
          type: 'chat',
          source: 'e7ki',
          isDirectMessage: true,
          timestamp: Date.now()
        });

        // Notify based on priority
        if (score.level === 'critical' || score.level === 'high') {
          if (window.ZagelNotification) {
            await window.ZagelNotification.notify({
              title: `💬 ${message.senderName || 'رسالة جديدة'}`,
              body: message.text || 'رسالة صوتية',
              level: score.level === 'critical' ? 'urgent' : 'call',
              category: 'chat'
            });
          }
        }
      }

      this.sendEvent('message', message);
    }

    async sendMessage(conversationId, text) {
      return this.callAPI(`/messages`, {
        method: 'POST',
        body: { conversationId, text }
      });
    }

    async getConversations() {
      return this.callAPI('/conversations').catch(() => ({ conversations: [] }));
    }
  }

  window.__ZAGEL_CONNECTOR_E7KI__ = new ZagelE7kiConnector();
  window.ZagelE7ki = window.__ZAGEL_CONNECTOR_E7KI__;
})();
