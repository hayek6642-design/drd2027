/**
 * native-phone-actions.js — Native Phone Integration for AI-Hub / CodeBank
 *
 * Leverages Capacitor plugins + URL-scheme fallbacks
 * to provide Phone, SMS, Email, WhatsApp, Camera & Contacts.
 *
 * Works hand-in-hand with NativeBridge (src/native-bridge.js).
 *
 * Usage:
 *   import { PhoneActions } from './native-phone-actions.js';
 *   PhoneActions.call('+201234567890');
 *   PhoneActions.sms('+201234567890', 'Hello!');
 */

const PhoneActions = (() => {
  'use strict';

  // ───────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────

  const isNative = () => {
    try {
      return window.Capacitor && window.Capacitor.isNativePlatform();
    } catch (_) {
      return false;
    }
  };

  const getPlugin = (name) => {
    try {
      if (window.Capacitor && window.Capacitor.Plugins) {
        return window.Capacitor.Plugins[name] || null;
      }
    } catch (_) {}
    return null;
  };

  /**
   * Validate a phone number (loose — allows + prefix, digits, spaces, dashes).
   */
  const isValidPhone = (num) => /^[\d\s+\-()]{7,}$/.test(num);

  /**
   * Clean phone number to digits only (keeps leading +).
   */
  const cleanNumber = (num) => {
    if (!num) return '';
    const cleaned = num.replace(/[^\d+]/g, '');
    return cleaned;
  };

  /**
   * Format a number for WhatsApp (wa.me expects digits only, no +).
   * Auto-adds Egypt country code (20) when the number starts with 0.
   */
  const formatForWhatsApp = (num) => {
    let digits = num.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = '20' + digits.substring(1); // Egypt default
    }
    return digits;
  };

  // ───────────────────────────────────────────────
  // Phone Call
  // ───────────────────────────────────────────────

  /**
   * Open the device dialer (or directly call if Capacitor + permissions allow).
   * @param {string} [number] — Pre-filled number. If omitted, opens empty dialer.
   */
  async function call(number) {
    const phone = number ? cleanNumber(number) : '';
    const telUrl = phone ? `tel:${phone}` : 'tel:';

    if (isNative()) {
      try {
        const AppLauncher = getPlugin('AppLauncher');
        if (AppLauncher) {
          await AppLauncher.openUrl({ url: telUrl });
          return { success: true, method: 'AppLauncher' };
        }
      } catch (err) {
        console.warn('[PhoneActions] AppLauncher.call failed:', err.message);
      }
    }

    // Web / fallback — tel: URL scheme
    window.location.href = telUrl;
    return { success: true, method: 'tel-scheme' };
  }

  // ───────────────────────────────────────────────
  // SMS
  // ───────────────────────────────────────────────

  /**
   * Open the device SMS composer pre-filled with number & body.
   * @param {string} number
   * @param {string} [body]
   */
  async function sms(number, body = '') {
    const phone = cleanNumber(number);
    if (!phone) throw new Error('Phone number is required');

    // Try Capacitor SMS plugin first (if it's registered)
    if (isNative()) {
      try {
        const SMS = getPlugin('SMS');
        if (SMS && typeof SMS.send === 'function') {
          await SMS.send({ numbers: [phone], text: body });
          return { success: true, method: 'Capacitor-SMS' };
        }
      } catch (err) {
        console.warn('[PhoneActions] Capacitor SMS fallback:', err.message);
      }
    }

    // Universal fallback — sms: URL scheme
    const smsUrl = body
      ? `sms:${phone}?body=${encodeURIComponent(body)}`
      : `sms:${phone}`;
    window.location.href = smsUrl;
    return { success: true, method: 'sms-scheme' };
  }

  // ───────────────────────────────────────────────
  // Email
  // ───────────────────────────────────────────────

  /**
   * Open the device email client with a pre-filled compose window.
   * @param {{ to: string, subject?: string, body?: string, cc?: string, bcc?: string }} opts
   */
  async function email(opts = {}) {
    const { to = '', subject = '', body = '', cc = '', bcc = '' } = opts;
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body)    params.push(`body=${encodeURIComponent(body)}`);
    if (cc)      params.push(`cc=${encodeURIComponent(cc)}`);
    if (bcc)     params.push(`bcc=${encodeURIComponent(bcc)}`);

    const mailtoUrl = `mailto:${to}${params.length ? '?' + params.join('&') : ''}`;
    window.location.href = mailtoUrl;
    return { success: true, method: 'mailto-scheme' };
  }

  // ───────────────────────────────────────────────
  // WhatsApp
  // ───────────────────────────────────────────────

  /**
   * Open WhatsApp chat with a specific number.
   * @param {string} number
   * @param {string} [text] — Optional pre-filled message
   */
  async function whatsapp(number, text = '') {
    const digits = formatForWhatsApp(number);
    const waUrl  = text
      ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${digits}`;

    if (isNative()) {
      try {
        const AppLauncher = getPlugin('AppLauncher');
        if (AppLauncher) {
          await AppLauncher.openUrl({ url: waUrl });
          return { success: true, method: 'AppLauncher' };
        }
      } catch (err) {
        console.warn('[PhoneActions] WhatsApp AppLauncher failed:', err.message);
      }
    }

    // Fallback
    window.open(waUrl, '_blank', 'noopener');
    return { success: true, method: 'window-open' };
  }

  // ───────────────────────────────────────────────
  // Camera
  // ───────────────────────────────────────────────

  /**
   * Open the device camera or photo gallery.
   * @param {{ source?: 'CAMERA'|'PHOTOS'|'PROMPT', quality?: number, allowEditing?: boolean }} opts
   * @returns {Promise<{ success: boolean, image?: object }>}
   */
  async function camera(opts = {}) {
    const { source = 'PROMPT', quality = 90, allowEditing = false } = opts;

    if (isNative()) {
      try {
        const Camera = getPlugin('Camera');
        if (Camera) {
          const image = await Camera.getPhoto({
            quality,
            allowEditing,
            resultType: 'uri',
            source: source === 'CAMERA' ? 'CAMERA'
                  : source === 'PHOTOS' ? 'PHOTOS'
                  : 'PROMPT', // Lets user choose
            saveToGallery: true,
          });
          return { success: true, method: 'Capacitor-Camera', image };
        }
      } catch (err) {
        console.warn('[PhoneActions] Camera error:', err.message);
        throw err;
      }
    }

    // Web fallback — HTML file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'CAMERA') {
        input.setAttribute('capture', 'environment');
      }
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          resolve({ success: true, method: 'file-input', image: { file, path: URL.createObjectURL(file) } });
        } else {
          resolve({ success: false, method: 'file-input' });
        }
      };
      input.click();
    });
  }

  // ───────────────────────────────────────────────
  // Contacts
  // ───────────────────────────────────────────────

  /**
   * Request contact permissions and retrieve the device contact list.
   * @param {{ projection?: object }} opts
   * @returns {Promise<{ success: boolean, contacts?: Array }>}
   */
  async function getContacts(opts = {}) {
    const projection = opts.projection || { name: true, phones: true, emails: true };

    if (isNative()) {
      try {
        const Contacts = getPlugin('Contacts');
        if (Contacts) {
          const perm = await Contacts.requestPermissions();
          if (perm.contacts === 'granted') {
            const result = await Contacts.getContacts({ projection });
            return { success: true, contacts: result.contacts || [], method: 'Capacitor-Contacts' };
          } else {
            return { success: false, reason: 'permission-denied', method: 'Capacitor-Contacts' };
          }
        }
      } catch (err) {
        console.warn('[PhoneActions] Contacts error:', err.message);
        throw err;
      }
    }

    // Web — no contacts API, open native contacts via intent
    if (isNative()) {
      try {
        const AppLauncher = getPlugin('AppLauncher');
        if (AppLauncher) {
          await AppLauncher.openUrl({ url: 'content://com.android.contacts/contacts' });
          return { success: true, method: 'intent' };
        }
      } catch (_) {}
    }

    return { success: false, reason: 'not-supported-on-web' };
  }

  /**
   * Open the native contacts app directly.
   */
  async function openContactsApp() {
    if (isNative()) {
      try {
        const AppLauncher = getPlugin('AppLauncher');
        if (AppLauncher) {
          await AppLauncher.openUrl({ url: 'content://com.android.contacts/contacts' });
          return { success: true };
        }
      } catch (err) {
        console.warn('[PhoneActions] openContactsApp error:', err.message);
      }
    }
    return { success: false, reason: 'not-supported' };
  }

  // ───────────────────────────────────────────────
  // In-App Dialer UI (fallback)
  // ───────────────────────────────────────────────

  /**
   * Show a full-screen in-app dialer overlay.
   * Used when native tel: scheme isn't reliable.
   */
  function showInAppDialer() {
    // Remove any existing dialer
    const existing = document.querySelector('.phone-actions-dialer');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'phone-actions-dialer';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);">
        <div style="background:#1a1a2e;padding:28px;border-radius:24px;width:320px;max-width:90vw;border:1px solid rgba(0,212,255,0.2);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="color:#00d4ff;margin:0;font-size:20px;">📞 Dialer</h3>
            <button class="dialer-close" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;padding:4px 8px;">✕</button>
          </div>
          <input type="tel" class="dialer-input" placeholder="Enter number" style="width:100%;padding:14px;font-size:20px;border-radius:12px;border:1px solid #333;background:#0d0d22;color:#fff;margin-bottom:16px;text-align:center;letter-spacing:1px;outline:none;">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
            ${[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(n => `
              <button class="dialer-key" data-key="${n}" style="padding:18px;font-size:22px;background:#1e1e3a;border:1px solid #333;border-radius:12px;color:#fff;cursor:pointer;transition:all 0.15s;font-weight:600;">${n}</button>
            `).join('')}
          </div>
          <div style="display:flex;gap:10px;">
            <button class="dialer-call" style="flex:1;padding:14px;background:linear-gradient(135deg,#00d4ff,#0099cc);border:none;border-radius:12px;color:#000;font-weight:800;font-size:16px;cursor:pointer;">📞 Call</button>
            <button class="dialer-sms" style="flex:1;padding:14px;background:linear-gradient(135deg,#25d366,#128c7e);border:none;border-radius:12px;color:#fff;font-weight:800;font-size:16px;cursor:pointer;">💬 SMS</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Attach listeners
    const input = overlay.querySelector('.dialer-input');
    overlay.querySelectorAll('.dialer-key').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value += btn.dataset.key;
        // Haptic feedback
        if (window.NativeBridge && window.NativeBridge.isNative()) {
          const Haptics = getPlugin('Haptics');
          if (Haptics) Haptics.impact({ style: 'LIGHT' });
        }
      });
    });

    overlay.querySelector('.dialer-call').addEventListener('click', () => {
      const num = input.value.trim();
      if (num) {
        call(num);
        overlay.remove();
      }
    });

    overlay.querySelector('.dialer-sms').addEventListener('click', () => {
      const num = input.value.trim();
      if (num) {
        sms(num);
        overlay.remove();
      }
    });

    overlay.querySelector('.dialer-close').addEventListener('click', () => overlay.remove());
  }

  // ───────────────────────────────────────────────
  // Contact Picker UI
  // ───────────────────────────────────────────────

  /**
   * Show a contact picker overlay from device contacts.
   * @param {Function} onSelect — Called with the selected contact object.
   */
  async function showContactPicker(onSelect) {
    const result = await getContacts();
    if (!result.success || !result.contacts?.length) {
      // Show a message
      alert(result.reason === 'permission-denied'
        ? 'Please grant contacts permission in Settings.'
        : 'No contacts available.');
      return;
    }

    const contacts = result.contacts;

    const overlay = document.createElement('div');
    overlay.className = 'phone-actions-contacts';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;flex-direction:column;backdrop-filter:blur(8px);">
        <div style="padding:16px 20px;background:#0d0d22;border-bottom:1px solid rgba(0,212,255,0.2);display:flex;align-items:center;gap:12px;">
          <h3 style="color:#00d4ff;margin:0;flex:1;">👥 Contacts (${contacts.length})</h3>
          <button class="contacts-close" style="background:none;border:none;color:#888;font-size:22px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:12px 20px;">
          <input type="text" class="contacts-search" placeholder="Search contacts…" style="width:100%;padding:10px 16px;border-radius:10px;border:1px solid #333;background:#1a1a2e;color:#fff;font-size:14px;outline:none;">
        </div>
        <div class="contacts-list" style="flex:1;overflow-y:auto;padding:0 20px 20px;"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const listEl = overlay.querySelector('.contacts-list');
    const searchEl = overlay.querySelector('.contacts-search');

    function renderList(filter = '') {
      const q = filter.toLowerCase();
      const filtered = q
        ? contacts.filter(c => {
            const name = c.name?.display || '';
            return name.toLowerCase().includes(q);
          })
        : contacts;

      listEl.innerHTML = filtered.map((c, i) => {
        const name = c.name?.display || 'Unknown';
        const phone = c.phones?.[0]?.number || '';
        return `
          <div class="contact-item" data-idx="${i}" style="padding:12px 16px;background:#1a1a2e;border-radius:10px;margin-bottom:8px;cursor:pointer;border:1px solid #333;transition:border-color 0.2s;">
            <div style="font-weight:600;color:#fff;font-size:14px;">${name}</div>
            <div style="font-size:12px;color:#888;margin-top:2px;">${phone}</div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.contact-item').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.idx);
          if (onSelect) onSelect(filtered[idx]);
          overlay.remove();
        });
      });
    }

    renderList();
    searchEl.addEventListener('input', () => renderList(searchEl.value));
    overlay.querySelector('.contacts-close').addEventListener('click', () => overlay.remove());
  }

  // ───────────────────────────────────────────────
  // Image Preview UI
  // ───────────────────────────────────────────────

  /**
   * Show a quick preview of a captured/selected image.
   * @param {{ path: string }|{ file: File, path: string }} image
   */
  function showImagePreview(image) {
    const src = image.webPath || image.path;
    const overlay = document.createElement('div');
    overlay.className = 'phone-actions-preview';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);">
        <img src="${src}" style="max-width:100%;max-height:70vh;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,0.5);">
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="preview-close" style="padding:12px 28px;background:#333;border:none;border-radius:12px;color:#fff;font-weight:700;cursor:pointer;">Close</button>
          <button class="preview-share" style="padding:12px 28px;background:linear-gradient(135deg,#00d4ff,#0099cc);border:none;border-radius:12px;color:#000;font-weight:700;cursor:pointer;">Share</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.preview-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.preview-share').addEventListener('click', async () => {
      if (window.NativeBridge) {
        await window.NativeBridge.share('Photo', 'Captured with AI-Hub', src);
      } else if (navigator.share) {
        navigator.share({ title: 'Photo', url: src });
      }
    });
  }

  // ───────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────

  return {
    // Core actions
    call,
    sms,
    email,
    whatsapp,
    camera,
    getContacts,
    openContactsApp,

    // UI helpers
    showInAppDialer,
    showContactPicker,
    showImagePreview,

    // Utilities
    isValidPhone,
    cleanNumber,
    formatForWhatsApp,
    isNative,
  };
})();

// Make globally available
window.PhoneActions = PhoneActions;
