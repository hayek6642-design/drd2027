/**
 * Estshara Components - Chat Interface
 * Real-time messaging between user and consultant
 */

class ChatInterface extends HTMLElement {
  constructor() {
    super();
    this.consultant = null;
    this.messages = [];
    this.pollingInterval = null;
  }
  
  connectedCallback() {
    this.render();
  }
  
  disconnectedCallback() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }
  
  open(consultant) {
    this.consultant = consultant;
    this.style.display = 'flex';
    this.loadMessages();
    this.startPolling();
  }
  
  close() {
    this.style.display = 'none';
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }
  
  render() {
    this.innerHTML = `
      <div class="chat-header">
        <button class="chat-back">&larr;</button>
        <div class="consultant-info">
          <span class="consultant-avatar">${this.consultant?.avatar || '👨‍⚕️'}</span>
          <div>
            <h3 class="consultant-name">${this.consultant?.name || 'Consultant'}</h3>
            <span class="consultant-status online">Online</span>
          </div>
        </div>
        <button class="chat-menu">&middot;&middot;&middot;</button>
      </div>
      
      <div class="chat-messages" id="messages">
        <div class="messages-content">
          <!-- Dynamic messages -->
        </div>
      </div>
      
      <div class="chat-input-area">
        <button class="attach-btn" title="Attach file">📎</button>
        <input 
          type="text" 
          id="message-input" 
          placeholder="اكتب رسالتك..."
          autocomplete="off"
        />
        <button class="send-btn" id="send-btn">إرسال</button>
      </div>
      
      <div class="typing-indicator" style="display: none;">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
    
    this.setupEvents();
  }
  
  setupEvents() {
    // Back button
    this.querySelector('.chat-back')?.addEventListener('click', () => this.close());
    
    // Send button
    this.querySelector('#send-btn')?.addEventListener('click', () => this.sendMessage());
    
    // Enter key
    this.querySelector('#message-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }
  
  async loadMessages() {
    if (!this.consultant) return;
    
    try {
      const response = await fetch(`/api/estshara/messages?consultantId=${this.consultant.id}`);
      const data = await response.json();
      
      this.messages = data.messages || [];
      this.renderMessages();
      
    } catch (err) {
      console.error('[Chat] Failed to load messages:', err);
    }
  }
  
  renderMessages() {
    const container = this.querySelector('.messages-content');
    if (!container) return;
    
    if (this.messages.length === 0) {
      container.innerHTML = `
        <div class="welcome-message">
          <h3>مرحباً!</h3>
          <p>ابدأconversation مع ${this.consultant?.name}</p>
          <p class="hint">اكتب رسالتك الأولى.describe مشكلتك</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.messages.map(msg => this.renderMessage(msg)).join('');
    
    // Scroll to bottom
    const messagesEl = this.querySelector('.chat-messages');
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }
  
  renderMessage(msg) {
    const isOwn = msg.sender === 'user';
    const time = new Date(msg.timestamp).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <div class="message ${isOwn ? 'own' : 'other'}">
        <div class="message-content">
          <p>${this.escapeHtml(msg.content)}</p>
        </div>
        <span class="message-time">${time}</span>
      </div>
    `;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  async sendMessage() {
    const input = this.querySelector('#message-input');
    const content = input?.value.trim();
    
    if (!content || !this.consultant) return;
    
    // Add to UI immediately
    const tempMsg = {
      id: 'temp_' + Date.now(),
      content,
      sender: 'user',
      timestamp: Date.now(),
      status: 'sending'
    };
    
    this.messages.push(tempMsg);
    this.renderMessages();
    
    // Clear input
    if (input) input.value = '';
    
    try {
      const response = await fetch('/api/estshara/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId: this.consultant.id,
          content
        })
      });
      
      const result = await response.json();
      
      // Update message status
      const idx = this.messages.findIndex(m => m.id === tempMsg.id);
      if (idx >= 0) {
        this.messages[idx] = result.message;
        this.renderMessages();
      }
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('estshara:message:sent', {
        detail: { message: result.message }
      }));
      
    } catch (err) {
      console.error('[Chat] Send failed:', err);
      
      // Mark as failed
      const idx = this.messages.findIndex(m => m.id === tempMsg.id);
      if (idx >= 0) {
        this.messages[idx].status = 'failed';
        this.renderMessages();
      }
    }
  }
  
  startPolling() {
    this.pollingInterval = setInterval(() => {
      this.loadMessages();
    }, 5000); // Poll every 5 seconds
  }
  
  showTyping() {
    const indicator = this.querySelector('.typing-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
    }
  }
  
  hideTyping() {
    const indicator = this.querySelector('.typing-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }
}

customElements.define('chat-interface', ChatInterface);
window.ChatInterface = ChatInterface;