// public/ai-hub-client.js
// AIHubClient — Browser client for the Platform Manager

class AIHubClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '/api/ai';
    this.token   = options.token
      || localStorage.getItem('session_token')
      || (document.cookie.match(/session_token=([^;]+)/) || [])[1]
      || '';
    this.history  = [];
    this.onAction = options.onAction || null;
  }

  // ── HTTP ────────────────────────────────────────────────────────
  async _fetch(path, method = 'GET', body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };
    if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (body)       opts.body = JSON.stringify(body);

    const res = await fetch(this.baseUrl + path, opts);

    if (res.status === 401) {
      // Redirect to login
      window.location.href = '/codebank/index.html';
      throw new Error('UNAUTHORIZED');
    }
    return res.json();
  }

  // ── Chat ────────────────────────────────────────────────────────
  async sendMessage(text) {
    const result = await this._fetch('/agent', 'POST', { message: text });
    if (result.ok) {
      this.history.push({ role: 'user',      content: text,        ts: Date.now() });
      this.history.push({ role: 'assistant', content: result.text, ts: Date.now() });
    }
    return result;
  }

  // ── Execute action ───────────────────────────────────────────────
  executeAction(action) {
    if (!action?.url) return;
    if (typeof this.onAction === 'function') {
      this.onAction(action);
    } else {
      window.location.href = action.url;
    }
  }

  // ── Stats ───────────────────────────────────────────────────────
  async getStats() {
    return this._fetch('/stats');
  }

  // ── Clear history ───────────────────────────────────────────────
  async clearHistory() {
    this.history = [];
    return this._fetch('/history', 'DELETE');
  }

  // ── Token ───────────────────────────────────────────────────────
  setToken(token) {
    this.token = token;
  }
}

window.AIHubClient = AIHubClient;
