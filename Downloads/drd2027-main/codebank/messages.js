class MessagesService {
  constructor() {
    this.threads = [];
    this.currentThread = null;
    this.init();
  }
  async init() {
    if (!AuthClient?.isAuth?.()) window.location.href = '/login.html';
    this.setupEventListeners();
    await this.loadThreads();
  }
  setupEventListeners() {
    document.getElementById('newMsgBtn')?.addEventListener('click', () => this.newMessage());
    document.getElementById('msgForm')?.addEventListener('submit', (e) => this.sendMessage(e));
  }
  async loadThreads() {
    try {
      const res = await fetch('/api/messages/threads', { credentials: 'include' });
      if (res.ok) this.threads = await res.json();
    } catch (e) { console.error('Error:', e); }
    this.displayThreads();
  }
  displayThreads() {
    const container = document.getElementById('threadsList');
    if (!container) return;
    container.innerHTML = this.threads.map(t => `
      <div class="thread-item" onclick="msgService.openThread(${t.id})">
        <strong>${t.participant}</strong>
        <small>${t.lastMessage}</small>
      </div>
    `).join('');
  }
  openThread(threadId) {
    this.currentThread = this.threads.find(t => t.id === threadId);
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('chatPanel').style.display = 'flex';
    document.getElementById('recipientName').textContent = this.currentThread?.participant;
    this.loadMessages(threadId);
  }
  async loadMessages(threadId) {
    try {
      const res = await fetch(`/api/messages/thread/${threadId}`, { credentials: 'include' });
      if (res.ok) {
        const messages = await res.json();
        const container = document.getElementById('messagesContainer');
        container.innerHTML = messages.map(m => `
          <div class="message ${m.sender === AuthClient.user?.email ? 'sent' : 'received'}">
            <p>${m.content}</p><small>${new Date(m.timestamp).toLocaleTimeString()}</small>
          </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
      }
    } catch (e) { console.error('Error:', e); }
  }
  async sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('msgInput');
    const content = input.value.trim();
    if (!content) return;
    try {
      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: this.currentThread.id, content }),
        credentials: 'include'
      });
      input.value = '';
      await this.loadMessages(this.currentThread.id);
    } catch (e) { console.error('Error:', e); }
  }
  newMessage() { alert('Compose new message feature'); }
}
const msgService = new MessagesService();
