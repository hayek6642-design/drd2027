/**
 * Text Chat Service Implementation
 * Web-based text communication for games
 */

class TextChatService {
  constructor() {
    this.connected = false;
    this.gameId = null;
    this.playerId = null;
    this.username = null;
    this.messages = [];
    this.messageListeners = [];
    this.connection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Connect to text chat service
   */
  connect(gameId, playerId, username = 'Player') {
    this.gameId = gameId;
    this.playerId = playerId;
    this.username = username;
    this.connected = true;
    this.reconnectAttempts = 0;

    console.log(`[TextChat] Connected to game: ${gameId} as ${username} (${playerId})`);

    // Emit connection event
    window.dispatchEvent(new CustomEvent('text-chat:connected', {
      detail: { gameId, playerId, username }
    }));
  }

  /**
   * Send a text message
   */
  sendMessage(text) {
    if (!this.connected) {
      throw new Error('Text chat not connected');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Invalid message text');
    }

    const message = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gameId: this.gameId,
      playerId: this.playerId,
      username: this.username,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'player'
    };

    this.messages.push(message);

    // Notify listeners
    this.notifyMessageListeners(message);

    // Emit message event
    window.dispatchEvent(new CustomEvent('text-chat:message', {
      detail: message
    }));

    return message;
  }

  /**
   * Receive a system message
   */
  receiveSystemMessage(text, type = 'info') {
    const message = {
      id: `sys_${Date.now()}`,
      gameId: this.gameId,
      text,
      timestamp: Date.now(),
      type: 'system',
      systemType: type
    };

    this.messages.push(message);
    this.notifyMessageListeners(message);

    window.dispatchEvent(new CustomEvent('text-chat:system-message', {
      detail: message
    }));
  }

  /**
   * Add message listener
   */
  onMessage(callback) {
    if (typeof callback === 'function') {
      this.messageListeners.push(callback);
    }
  }

  /**
   * Remove message listener
   */
  offMessage(callback) {
    this.messageListeners = this.messageListeners.filter(
      listener => listener !== callback
    );
  }

  /**
   * Notify all message listeners
   */
  notifyMessageListeners(message) {
    this.messageListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('[TextChat] Error in message listener:', error);
      }
    });
  }

  /**
   * Get message history
   */
  getMessageHistory(limit = 100) {
    return [...this.messages].slice(-limit);
  }

  /**
   * Clear message history
   */
  clearHistory() {
    this.messages = [];
  }

  /**
   * Disconnect from text chat
   */
  disconnect() {
    this.connected = false;
    this.gameId = null;
    this.playerId = null;
    this.username = null;
    this.messageListeners = [];

    console.log('[TextChat] Disconnected');

    // Emit disconnect event
    window.dispatchEvent(new CustomEvent('text-chat:disconnected'));
  }

  /**
   * Check connection status
   */
  isConnected() {
    return this.connected;
  }
}

// Singleton instance
const textChatService = new TextChatService();
export default textChatService;