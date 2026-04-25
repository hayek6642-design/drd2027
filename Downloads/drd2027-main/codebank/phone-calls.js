class PhoneCallsService {
  constructor() {
    this.recentCalls = [];
    this.contacts = [];
    this.missedCalls = [];
    this.init();
  }
  async init() {
    if (!AuthClient?.isAuth?.()) window.location.href = '/login.html';
    this.setupEventListeners();
    await this.loadCallHistory();
    await this.loadContacts();
  }
  setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
  }
  async loadCallHistory() {
    try {
      const res = await fetch('/api/calls/history', { credentials: 'include' });
      if (res.ok) {
        const calls = await res.json();
        this.recentCalls = calls.filter(c => c.type !== 'missed');
        this.missedCalls = calls.filter(c => c.type === 'missed');
      }
    } catch (e) { console.error('Error:', e); }
    this.displayCalls();
  }
  async loadContacts() {
    try {
      const res = await fetch('/api/contacts', { credentials: 'include' });
      if (res.ok) this.contacts = await res.json();
    } catch (e) { console.error('Error:', e); }
    this.displayContacts();
  }
  displayCalls() {
    const recentContainer = document.getElementById('recentCalls');
    if (recentContainer) {
      recentContainer.innerHTML = this.recentCalls.map(c => `
        <div class="call-item">
          <div><strong>${c.contact}</strong><br><small>${c.duration}s - ${new Date(c.timestamp).toLocaleDateString()}</small></div>
          <button onclick="callService.call('${c.contact}')">📞</button>
        </div>
      `).join('');
    }
    const missedContainer = document.getElementById('missedCalls');
    if (missedContainer) {
      missedContainer.innerHTML = this.missedCalls.map(c => `
        <div class="call-item missed"><strong>${c.contact}</strong><small>${new Date(c.timestamp).toLocaleString()}</small></div>
      `).join('');
    }
  }
  displayContacts() {
    const container = document.getElementById('contactsList');
    if (container) {
      container.innerHTML = this.contacts.map(c => `
        <div class="contact-item">
          <strong>${c.name}</strong><br><small>${c.phone}</small>
          <button onclick="callService.call('${c.name}')">📞</button>
        </div>
      `).join('');
    }
  }
  switchTab(tab) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab + '-tab')?.classList.add('active');
    event.target.classList.add('active');
  }
  call(contact) { alert(`Calling ${contact}...`); }
}
const callService = new PhoneCallsService();
