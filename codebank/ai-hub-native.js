/**
 * ai-hub-native.js — AI-Hub with Native Phone Integration
 * Plain JavaScript version (no framework dependency)
 *
 * Renders an additional "📱 Phone Actions" section inside AI Hub
 * and wires each card to PhoneActions (src/native-phone-actions.js).
 *
 * Drop-in usage:
 *   <script src="../src/native-phone-actions.js"></script>
 *   <script src="ai-hub-native.js"></script>
 *   → automatically attaches to #phone-actions-grid (or creates one)
 */

class AIHubNative {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector) || null;
    this.init();
  }

  // ════════════════════════════════════════════════
  // Lifecycle
  // ════════════════════════════════════════════════

  init() {
    if (!this.container) {
      // Auto-create a section inside .content or body
      const content = document.getElementById('mainContent') || document.body;
      this.container = document.createElement('div');
      this.container.id = 'phone-actions-section';
      content.prepend(this.container);
    }
    this.render();
    this.attachListeners();
  }

  // ════════════════════════════════════════════════
  // Actions Registry
  // ════════════════════════════════════════════════

  getPhoneActions() {
    return [
      {
        id: 'call',
        name: 'Phone',
        desc: 'Make Calls',
        emoji: '📞',
        gradient: 'linear-gradient(135deg, #00d4ff, #0099cc)',
      },
      {
        id: 'sms',
        name: 'Messages',
        desc: 'Send SMS',
        emoji: '💬',
        gradient: 'linear-gradient(135deg, #25d366, #128c7e)',
      },
      {
        id: 'email',
        name: 'Email',
        desc: 'Send Mail',
        emoji: '📧',
        gradient: 'linear-gradient(135deg, #ea4335, #c5221f)',
      },
      {
        id: 'contacts',
        name: 'Contacts',
        desc: 'View All',
        emoji: '👥',
        gradient: 'linear-gradient(135deg, #fbbc05, #f57f17)',
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        desc: 'Quick Chat',
        emoji: '💚',
        gradient: 'linear-gradient(135deg, #25d366, #075e54)',
      },
      {
        id: 'camera',
        name: 'Camera',
        desc: 'Take Photo',
        emoji: '📷',
        gradient: 'linear-gradient(135deg, #9c27b0, #7b1fa2)',
      },
    ];
  }

  // ════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════

  render() {
    const actions = this.getPhoneActions();

    this.container.innerHTML = `
      <div class="cat-section" id="phone-actions-cat">
        <div class="cat-title">
          <span class="cat-icon">📱</span>
          Phone Actions
          <span class="cat-count">${actions.length}</span>
          <span style="margin-left:auto;font-size:9px;background:rgba(0,212,255,0.15);color:#00d4ff;padding:3px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:800;">NATIVE</span>
        </div>
        <div class="services-grid" id="phone-actions-grid">
          ${actions.map(a => this._cardHTML(a)).join('')}
        </div>
      </div>
    `;
  }

  _cardHTML(action) {
    return `
      <div class="service-card native-phone-card" data-action="${action.id}" style="--c:${action.gradient.match(/#\w+/)?.[0] || '#00d4ff'}">
        <span class="svc-badge" style="background:rgba(0,212,255,0.15);color:#00d4ff;border:1px solid rgba(0,212,255,0.3);font-size:8px;padding:2px 6px;border-radius:10px;position:absolute;top:7px;right:7px;font-weight:800;text-transform:uppercase;">NATIVE</span>
        <div class="svc-logo" style="background:${action.gradient};border:none;">
          <span style="font-size:26px;">${action.emoji}</span>
        </div>
        <div class="svc-name">${action.name}</div>
        <div class="svc-desc">${action.desc}</div>
      </div>
    `;
  }

  // ════════════════════════════════════════════════
  // Event Handlers
  // ════════════════════════════════════════════════

  attachListeners() {
    this.container.querySelectorAll('[data-action]').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleAction(card.dataset.action);
      });
    });
  }

  async handleAction(action) {
    const PA = window.PhoneActions;
    if (!PA) {
      console.error('[AIHubNative] PhoneActions not loaded. Include src/native-phone-actions.js first.');
      alert('Native actions module not loaded.');
      return;
    }

    switch (action) {
      case 'call':
        await this._handleCall(PA);
        break;
      case 'sms':
        await this._handleSMS(PA);
        break;
      case 'email':
        await this._handleEmail(PA);
        break;
      case 'contacts':
        await this._handleContacts(PA);
        break;
      case 'whatsapp':
        await this._handleWhatsApp(PA);
        break;
      case 'camera':
        await this._handleCamera(PA);
        break;
    }
  }

  // ── Individual handlers ────────────────────────

  async _handleCall(PA) {
    // If native, show the built-in dialer; else show in-app dialer
    if (PA.isNative()) {
      const number = prompt('Enter phone number to call:');
      if (!number) return;
      if (!PA.isValidPhone(number)) { alert('Please enter a valid phone number.'); return; }
      await PA.call(number);
    } else {
      PA.showInAppDialer();
    }
  }

  async _handleSMS(PA) {
    const number = prompt('Enter phone number for SMS:');
    if (!number) return;
    if (!PA.isValidPhone(number)) { alert('Please enter a valid phone number.'); return; }
    const message = prompt('Enter message (optional):') || '';
    await PA.sms(number, message);
  }

  async _handleEmail(PA) {
    const to = prompt('To (email address):');
    if (!to) return;
    const subject = prompt('Subject:') || '';
    const body = prompt('Body:') || '';
    await PA.email({ to, subject, body });
  }

  async _handleContacts(PA) {
    if (PA.isNative()) {
      // Show contact picker with callback
      await PA.showContactPicker((contact) => {
        const name = contact.name?.display || 'Unknown';
        const phone = contact.phones?.[0]?.number || '';
        const action = prompt(`${name}\n${phone}\n\nChoose: (1) Call  (2) SMS  (3) WhatsApp`);
        if (action === '1' && phone) PA.call(phone);
        else if (action === '2' && phone) PA.sms(phone);
        else if (action === '3' && phone) PA.whatsapp(phone);
      });
    } else {
      alert('Contacts require the mobile app. Install CodeBank on your phone!');
    }
  }

  async _handleWhatsApp(PA) {
    const number = prompt('Enter WhatsApp number (e.g. 01012345678):');
    if (!number) return;
    const text = prompt('Pre-filled message (optional):') || '';
    await PA.whatsapp(number, text);
  }

  async _handleCamera(PA) {
    try {
      const result = await PA.camera({ source: 'PROMPT' });
      if (result.success && result.image) {
        PA.showImagePreview(result.image);
      }
    } catch (err) {
      console.error('[AIHubNative] Camera error:', err);
      if (!PA.isNative()) {
        alert('Camera requires the mobile app for the best experience.');
      }
    }
  }
}

// ════════════════════════════════════════════════════
// Auto-initialize when DOM is ready
// ════════════════════════════════════════════════════
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.__aiHubNative = new AIHubNative('#phone-actions-section');
  });
} else {
  window.__aiHubNative = new AIHubNative('#phone-actions-section');
}
