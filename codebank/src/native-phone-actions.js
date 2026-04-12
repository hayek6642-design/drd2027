/**
 * native-phone-actions.js
 * Handle phone native actions (call, SMS, email, contacts, WhatsApp, camera)
 * Works on both web (using web APIs) and mobile (using Capacitor plugins)
 */

window.PhoneActions = {
  
  isNative: () => {
    // Check if running in Capacitor native environment
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  },

  /**
   * Validate phone number format
   */
  isValidPhone: (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
  },

  /**
   * Make a phone call
   */
  call: async (phoneNumber) => {
    if (!window.PhoneActions.isValidPhone(phoneNumber)) {
      throw new Error('Invalid phone number');
    }

    if (window.PhoneActions.isNative()) {
      // Native iOS/Android
      try {
        await window.Capacitor.Plugins.Call.makeCall({
          number: phoneNumber
        });
      } catch (err) {
        console.warn('[PhoneActions] Call failed:', err);
        throw err;
      }
    } else {
      // Web - use tel: URI
      window.location.href = `tel:${encodeURIComponent(phoneNumber)}`;
    }
  },

  /**
   * Send SMS message
   */
  sms: async (phoneNumber, message = '') => {
    if (!window.PhoneActions.isValidPhone(phoneNumber)) {
      throw new Error('Invalid phone number');
    }

    if (window.PhoneActions.isNative()) {
      // Native SMS
      try {
        await window.Capacitor.Plugins.SMS.sendSMS({
          phoneNumber,
          message
        });
      } catch (err) {
        console.warn('[PhoneActions] SMS failed:', err);
        throw err;
      }
    } else {
      // Web - use sms: URI
      const body = message ? `body=${encodeURIComponent(message)}` : '';
      window.location.href = `sms:${encodeURIComponent(phoneNumber)}?${body}`;
    }
  },

  /**
   * Send email
   */
  email: async (options = {}) => {
    const { to, subject = '', body = '', cc = '', bcc = '' } = options;
    
    if (!to) throw new Error('Email address required');

    if (window.PhoneActions.isNative()) {
      // Native email
      try {
        await window.Capacitor.Plugins.Email.open({
          to,
          subject,
          body,
          cc,
          bcc
        });
      } catch (err) {
        console.warn('[PhoneActions] Email failed:', err);
        throw err;
      }
    } else {
      // Web - use mailto: URI
      const params = new URLSearchParams();
      if (subject) params.append('subject', subject);
      if (body) params.append('body', body);
      if (cc) params.append('cc', cc);
      if (bcc) params.append('bcc', bcc);
      
      const queryString = params.toString();
      window.location.href = `mailto:${encodeURIComponent(to)}${queryString ? '?' + queryString : ''}`;
    }
  },

  /**
   * Show contact picker
   */
  showContactPicker: async (callback) => {
    if (window.PhoneActions.isNative()) {
      // Native contact picker
      try {
        const result = await window.Capacitor.Plugins.Contacts.getContact();
        if (result && callback) {
          callback(result);
        }
      } catch (err) {
        console.warn('[PhoneActions] Contact picker failed:', err);
      }
    } else {
      // Web - show in-app contact selector
      window.PhoneActions.showInAppContactSelector(callback);
    }
  },

  /**
   * Send WhatsApp message
   */
  whatsapp: async (phoneNumber, message = '') => {
    if (!window.PhoneActions.isValidPhone(phoneNumber)) {
      throw new Error('Invalid phone number');
    }

    if (window.PhoneActions.isNative()) {
      // Try Capacitor WhatsApp plugin
      try {
        const cleaned = phoneNumber.replace(/\D/g, '');
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleaned}`;
        if (message) {
          whatsappUrl += `&text=${encodeURIComponent(message)}`;
        }
        window.open(whatsappUrl, '_blank');
      } catch (err) {
        console.warn('[PhoneActions] WhatsApp failed:', err);
        throw err;
      }
    } else {
      // Web - use WhatsApp web link
      const cleaned = phoneNumber.replace(/\D/g, '');
      let url = `https://wa.me/${cleaned}`;
      if (message) {
        url += `?text=${encodeURIComponent(message)}`;
      }
      window.open(url, '_blank', 'noopener');
    }
  },

  /**
   * Open camera / gallery
   */
  camera: async (options = {}) => {
    const { source = 'PROMPT' } = options;

    if (window.PhoneActions.isNative()) {
      // Native camera
      try {
        const result = await window.Capacitor.Plugins.Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: 'base64',
          source: source === 'PROMPT' ? 'PROMPT' : (source === 'CAMERA' ? 'CAMERA' : 'PHOTOS')
        });
        return { success: true, image: result.base64String };
      } catch (err) {
        console.warn('[PhoneActions] Camera failed:', err);
        return { success: false, error: err.message };
      }
    } else {
      // Web - file input or canvas
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64 = ev.target.result.split(',')[1];
              resolve({ success: true, image: base64 });
            };
            reader.readAsDataURL(file);
          } else {
            resolve({ success: false, error: 'No file selected' });
          }
        };
        input.click();
      });
    }
  },

  /**
   * Show image preview (web overlay)
   */
  showImagePreview: (base64Image) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = `data:image/jpeg;base64,${base64Image}`;
    img.style.cssText = `
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 12px;
      box-shadow: 0 0 40px rgba(0,0,0,0.8);
    `;
    
    overlay.appendChild(img);
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
  },

  /**
   * Web-based in-app dialer UI
   */
  showInAppDialer: () => {
    const overlay = document.createElement('div');
    overlay.className = 'phone-actions-dialer';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const card = document.createElement('div');
    card.style.cssText = `
      background: #1a1a2e;
      border-radius: 16px;
      padding: 24px;
      width: 90%;
      max-width: 400px;
      color: #fff;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;
    
    card.innerHTML = `
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 20px;">📞 Dialer</div>
      <input type="tel" id="dialerInput" placeholder="Enter phone number" 
        style="width:100%;padding:12px;border:1px solid #333;border-radius:8px;background:#0a0a16;color:#fff;font-size:16px;margin-bottom:16px;box-sizing:border-box;">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
        ${[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(n => `
          <button onclick="document.getElementById('dialerInput').value += '${n}'" 
            style="padding:16px;background:#333;border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;font-size:18px;">
            ${n}
          </button>
        `).join('')}
      </div>
      <div style="display: flex; gap: 12px;">
        <button onclick="this.closest('.phone-actions-dialer').remove()" 
          style="flex:1;padding:12px;background:#333;border:none;border-radius:8px;color:#fff;cursor:pointer;">
          Cancel
        </button>
        <button onclick="window.PhoneActions.call(document.getElementById('dialerInput').value).then(() => document.querySelector('.phone-actions-dialer').remove()).catch(e => alert('Error: ' + e.message))"
          style="flex:1;padding:12px;background:#00d4ff;border:none;border-radius:8px;color:#000;font-weight:700;cursor:pointer;">
          Call
        </button>
      </div>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Focus on input
    setTimeout(() => document.getElementById('dialerInput').focus(), 100);
  },

  /**
   * Web-based contact selector
   */
  showInAppContactSelector: (callback) => {
    const overlay = document.createElement('div');
    overlay.className = 'phone-actions-contacts';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const card = document.createElement('div');
    card.style.cssText = `
      background: #1a1a2e;
      border-radius: 16px;
      padding: 24px;
      width: 90%;
      max-width: 400px;
      color: #fff;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;
    
    // Get contacts from localStorage or browser contacts API
    let contacts = JSON.parse(localStorage.getItem('app_contacts') || '[]');
    
    card.innerHTML = `
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 20px;">👥 Contacts</div>
      <div style="max-height: 300px; overflow-y: auto; margin-bottom: 16px;">
        ${contacts.length === 0 ? '<p style="color: #999;">No saved contacts. Use "+" to add.</p>' : 
          contacts.map((c, i) => `
          <div onclick="window.PhoneActions.selectContact(${i})"
            style="padding:12px;background:#333;border-radius:8px;margin-bottom:8px;cursor:pointer;hover:background:#444;">
            <div style="font-weight:700;">${c.name}</div>
            <div style="font-size:12px;color:#999;">${c.phone}</div>
          </div>
        `).join('')}
      </div>
      <button onclick="this.closest('.phone-actions-contacts').remove()" 
        style="width:100%;padding:12px;background:#333;border:none;border-radius:8px;color:#fff;cursor:pointer;">
        Close
      </button>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Store callback
    window.PhoneActions.selectContact = (index) => {
      const contact = contacts[index];
      overlay.remove();
      if (callback) callback(contact);
    };
  },

  /**
   * Request permissions (web)
   */
  requestPermissions: async () => {
    const permissions = [];
    
    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      permissions.push({ camera: result.state });
    } catch (e) {}
    
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      permissions.push({ microphone: result.state });
    } catch (e) {}
    
    return permissions;
  }
};

// Initialize on load
window.addEventListener('load', () => {
  console.log('[PhoneActions] Initialized - Native:', window.PhoneActions.isNative());
});
