// ===============================
// 🌉 ZAGEL E7KI BRIDGE
// ===============================
// Integration layer between Zagel OS and E7ki messaging service
// Connects voice commands to E7ki events and notifications

import { handleZagelCommand, ZagelNotify } from './zagel-core.js'
import { ZagelVoice } from './zagel-voice.js'

export class ZagelE7kiBridge {
  
  constructor(config = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://dr-d-h51l.onrender.com',
      apiKey: config.apiKey || '',
      userId: config.userId || null,
      ...config
    }
    this.isConnected = false
  }

  // Initialize bridge and connect to E7ki
  async connect() {
    try {
      console.log('[Zagel E7ki] Connecting to E7ki service...')
      
      // Verify API connectivity
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders()
      })
      
      if (response.ok) {
        this.isConnected = true
        console.log('[Zagel E7ki] Connected successfully')
        ZagelVoice.speak("تم الاتصال بخدمة الرسائل 😄")
        return true
      } else {
        throw new Error('Health check failed')
      }
    } catch (error) {
      console.error('[Zagel E7ki] Connection failed:', error)
      ZagelVoice.speak("ما قدرت أتصل بخدمة الرسائل 😅")
      return false
    }
  }

  // Send voice command to E7ki API
  async sendCommand(text, userId = null) {
    const commandUserId = userId || this.config.userId
    
    if (!commandUserId) {
      console.error('[Zagel E7ki] No userId provided')
      return { error: 'missing_user_id' }
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/zagel/command`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          userId: commandUserId,
          text,
          timestamp: Date.now(),
          source: 'zagel_voice'
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        console.log('[Zagel E7ki] Command processed:', data)
        return data
      } else {
        throw new Error(data.error || 'Command failed')
      }
    } catch (error) {
      console.error('[Zagel E7ki] Command error:', error)
      return { error: error.message }
    }
  }

  // Listen for incoming E7ki messages
  async startMessageListener(userId = null) {
    const listenerUserId = userId || this.config.userId
    
    if (!listenerUserId) {
      console.error('[Zagel E7ki] No userId for message listener')
      return false
    }

    try {
      console.log('[Zagel E7ki] Starting message listener for user:', listenerUserId)
      
      // Establish WebSocket or polling connection
      if ('WebSocket' in window) {
        this.setupWebSocketListener(listenerUserId)
      } else {
        this.setupPollingListener(listenerUserId)
      }
      
      return true
    } catch (error) {
      console.error('[Zagel E7ki] Listener setup failed:', error)
      return false
    }
  }

  // WebSocket listener for real-time messages
  setupWebSocketListener(userId) {
    const wsUrl = this.config.apiUrl.replace('https://', 'wss://').replace('http://', 'ws://')
    
    try {
      this.ws = new WebSocket(`${wsUrl}/ws/messages/${userId}`)
      
      this.ws.onopen = () => {
        console.log('[Zagel E7ki] WebSocket connected')
      }
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('[Zagel E7ki] Received message:', message)
          
          // Notify via Zagel door system
          ZagelNotify({
            sender: message.sender,
            text: message.text,
            timestamp: message.timestamp
          })
        } catch (e) {
          console.error('[Zagel E7ki] Message parse error:', e)
        }
      }
      
      this.ws.onerror = (error) => {
        console.error('[Zagel E7ki] WebSocket error:', error)
        // Fallback to polling
        this.setupPollingListener(userId)
      }
      
      this.ws.onclose = () => {
        console.log('[Zagel E7ki] WebSocket closed, reconnecting...')
        setTimeout(() => this.setupWebSocketListener(userId), 5000)
      }
    } catch (error) {
      console.error('[Zagel E7ki] WebSocket setup failed:', error)
      this.setupPollingListener(userId)
    }
  }

  // Polling fallback for message listener
  setupPollingListener(userId, interval = 5000) {
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/e7ki/messages/${userId}/unread`,
          { headers: this.getHeaders() }
        )
        
        if (response.ok) {
          const { messages } = await response.json()
          
          if (messages && messages.length > 0) {
            messages.forEach(msg => {
              ZagelNotify({
                sender: msg.sender,
                text: msg.text,
                timestamp: msg.timestamp
              })
            })
          }
        }
      } catch (error) {
        console.error('[Zagel E7ki] Polling error:', error)
      }
    }, interval)
  }

  // Send message through E7ki
  async sendMessage(recipientId, text) {
    if (!this.config.userId) {
      console.error('[Zagel E7ki] No userId configured')
      return { error: 'missing_user_id' }
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/e7ki/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          from: this.config.userId,
          to: recipientId,
          text,
          timestamp: Date.now(),
          source: 'zagel'
        })
      })

      if (response.ok) {
        const data = await response.json()
        ZagelVoice.speak(`تم إرسال الرسالة 😄`)
        return data
      } else {
        throw new Error('Send message failed')
      }
    } catch (error) {
      console.error('[Zagel E7ki] Send message error:', error)
      ZagelVoice.speak("ما قدرت أرسل الرسالة 😅")
      return { error: error.message }
    }
  }

  // Get user's contacts from E7ki
  async getContacts() {
    if (!this.config.userId) {
      console.error('[Zagel E7ki] No userId configured')
      return { error: 'missing_user_id' }
    }

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/e7ki/contacts/${this.config.userId}`,
        { headers: this.getHeaders() }
      )

      if (response.ok) {
        const data = await response.json()
        return data.contacts || []
      } else {
        throw new Error('Get contacts failed')
      }
    } catch (error) {
      console.error('[Zagel E7ki] Get contacts error:', error)
      return { error: error.message }
    }
  }

  // Get conversation history
  async getConversation(contactId, limit = 20) {
    if (!this.config.userId) {
      console.error('[Zagel E7ki] No userId configured')
      return { error: 'missing_user_id' }
    }

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/e7ki/conversations/${this.config.userId}/${contactId}?limit=${limit}`,
        { headers: this.getHeaders() }
      )

      if (response.ok) {
        const data = await response.json()
        return data.messages || []
      } else {
        throw new Error('Get conversation failed')
      }
    } catch (error) {
      console.error('[Zagel E7ki] Get conversation error:', error)
      return { error: error.message }
    }
  }

  // Disconnect bridge
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    
    this.isConnected = false
    console.log('[Zagel E7ki] Disconnected')
  }

  // Helper: Get request headers with API key
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
    
    return headers
  }

  // Status check
  getStatus() {
    return {
      isConnected: this.isConnected,
      userId: this.config.userId,
      apiUrl: this.config.apiUrl
    }
  }
}

// Export singleton instance
export const zagelE7kiBridge = new ZagelE7kiBridge()

export default ZagelE7kiBridge
