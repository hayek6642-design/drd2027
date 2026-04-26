class AIChatService {
  constructor() {
    this.chats = [];
    this.currentChat = null;
    this.init();
  }
  async init() {
    if (!AuthClient?.isAuth?.()) window.location.href = '/login.html';
    this.setupEventListeners();
    await this.loadChats();
  }
  setupEventListeners() {
    document.getElementById('newChatBtn')?.addEventListener('click', () => this.newChat());
    document.getElementById('chatForm')?.addEventListener('submit', (e) => this.sendMessage(e));
  }
  async loadChats() {
    try {
      const res = await fetch('/api/ai/chat/threads', { credentials: 'include' });
      if (res.ok) this.chats = await res.json();
    } catch (e) { console.error('Error:', e); }
    this.displayChats();
  }
  displayChats() {
    const container = document.getElementById('chatList');
    if (!container) return;
    container.innerHTML = this.chats.map(c => `
      <div class="chat-item" onclick="aiChat.openChat('${c.id}')">
        <strong>${c.title || 'New Chat'}</strong>
        <small>${new Date(c.created_at).toLocaleDateString()}</small>
      </div>
    `).join('');
  }
  async newChat() {
    this.currentChat = { id: Date.now(), title: 'New Chat', messages: [] };
    document.getElementById('noChat').style.display = 'none';
    document.getElementById('chatView').style.display = 'flex';
    document.getElementById('messages').innerHTML = '';
  }
  openChat(chatId) {
    this.currentChat = this.chats.find(c => c.id === chatId);
    document.getElementById('noChat').style.display = 'none';
    document.getElementById('chatView').style.display = 'flex';
    const container = document.getElementById('messages');
    container.innerHTML = (this.currentChat.messages || []).map(m => `
      <div class="msg ${m.role}"><p>${m.content}</p></div>
    `).join('');
  }
  async sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    const container = document.getElementById('messages');
    container.innerHTML += `<div class="msg user"><p>${message}</p></div>`;
    input.value = '';
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: this.currentChat.id, message }),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        container.innerHTML += `<div class="msg ai"><p>${data.reply}</p></div>`;
        container.scrollTop = container.scrollHeight;
      }
    } catch (e) { console.error('Error:', e); }
  }
}
const aiChat = new AIChatService();
