class StudioBridge {
  constructor() {
    this.iframe = document.getElementById('studio-frame');
    this.studioUrl = './studio/index.html'; // UPDATED PATH
    this.ready = false;
    this.queue = [];
    this.init();
    this.setupMenuInterception();
  }

  init() {
    window.addEventListener('message', (e) => {
      if (e.data?.source === 'battalooda-studio' || e.data?.type === 'STUDIO_MENU_CLICK') {
        this.handleReactMessage(e.data);
      }
    });
    
    // Wait for iframe to load
    if (this.iframe) {
      this.iframe.addEventListener('load', () => {
        console.log('[Bridge] Studio iframe loaded');
        this.initializeInternalBridge();
      });
    } else {
      console.warn('[Bridge] studio-frame element not found');
    }
  }

  initializeInternalBridge() {
    try {
      const iframeWindow = this.iframe.contentWindow;
      const iframeDoc = this.iframe.contentDocument || iframeWindow.document;

      if (iframeDoc) {
        this.setupIframeMenuInterception(iframeDoc);
      }
    } catch (e) {
      console.warn('[Bridge] Direct iframe access restricted, using postMessage bridge only');
    }
  }

  setupIframeMenuInterception(doc) {
    const menuSelectors = [
      '[data-menu]', '.menu-item', '.menu-file', '.menu-edit', '.menu-add', '.menu-view', '.menu-options', '.menu-help',
      'button:contains("File")', 'button:contains("Edit")', 'button:contains("Add")',
      'button:contains("View")', 'button:contains("Options")', 'button:contains("Help")'
    ];

    doc.addEventListener('click', (e) => {
      const target = e.target;
      const isMenuButton = menuSelectors.some(selector => {
        try { return target.matches(selector) || target.closest(selector); } catch(err) { return false; }
      }) || this.isLikelyMenuButton(target);

      if (isMenuButton) {
        const menuName = target.textContent?.trim() || target.getAttribute('data-menu') || 'unknown';
        console.log('[Bridge] Internal menu click intercepted:', menuName);
        this.handleStudioMenuClick(menuName);
      }
    }, true);
  }

  setupMenuInterception() {
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data && data.type === 'STUDIO_MENU_CLICK') {
        this.handleStudioMenuClick(data.menu);
      }
    });
  }

  isLikelyMenuButton(element) {
    const text = element.textContent?.toLowerCase() || '';
    const menuTexts = ['file', 'edit', 'add', 'patterns', 'view', 'options', 'help', 'tools', 'window'];
    return menuTexts.some(menu => text.includes(menu));
  }

  handleStudioMenuClick(menuName) {
    console.log('[Bridge] Handling studio menu click:', menuName);
    if (window.BattaloodaCore && typeof window.BattaloodaCore.onStudioMenuClick === 'function') {
      window.BattaloodaCore.onStudioMenuClick(menuName);
    }
    window.dispatchEvent(new CustomEvent('studio:menu-click', { detail: { menu: menuName } }));
  }

  sendToReact(action, data) {
    const message = { target: 'battalooda-studio', action, data };
    if (this.ready && this.iframe) {
      this.iframe.contentWindow.postMessage(message, '*');
    } else {
      this.queue.push(message);
    }
  }

  flushQueue() {
    while (this.queue.length) {
      const msg = this.queue.shift();
      if (this.iframe) {
        this.iframe.contentWindow.postMessage(msg, '*');
      }
    }
  }

  handleReactMessage(message) {
    switch(message.action) {
      case 'studio-ready':
        this.ready = true;
        this.flushQueue();
        if (window.BattaloodaCore && typeof window.BattaloodaCore.onStudioReady === 'function') {
          window.BattaloodaCore.onStudioReady();
        } else if (window.BattaloodaCore && typeof window.BattaloodaCore.studioReady === 'function') {
          window.BattaloodaCore.studioReady();
        } else {
          console.warn('[Bridge] BattaloodaCore.onStudioReady not found');
        }
        break;
      case 'save-project':
        if (window.MusicLibrary && typeof window.MusicLibrary.addTrack === 'function') {
          window.MusicLibrary.addTrack(message.data);
        } else {
          console.warn('[Bridge] MusicLibrary.addTrack not found');
        }
        break;
      case 'load-request':
        if (window.MusicLibrary && typeof window.MusicLibrary.getTrack === 'function') {
          const track = window.MusicLibrary.getTrack(message.trackId);
          this.sendToReact('load-track', track);
        } else {
          console.warn('[Bridge] MusicLibrary.getTrack not found');
        }
        break;
      case 'export-audio':
        if (window.AudioEngine && typeof window.AudioEngine.processExport === 'function') {
          window.AudioEngine.processExport(message.blob);
        } else {
          console.warn('[Bridge] AudioEngine.processExport not found');
        }
        break;
      case 'social-share':
        if (window.SocialFeatures && typeof window.SocialFeatures.share === 'function') {
          window.SocialFeatures.share(message.content);
        } else {
          console.warn('[Bridge] SocialFeatures.share not found');
        }
        break;
      case 'security-verify':
        this.verifySecurity(message.data);
        break;
    }
  }

  verifySecurity(data) {
    if (window.SecurityEngine && typeof window.SecurityEngine.verify === 'function') {
      window.SecurityEngine.verify(data).then(result => {
        this.sendToReact('security-result', { verified: result });
      });
    } else {
      const script = document.createElement('script');
      script.src = './security/security-engine.js';
      script.onload = () => {
          if (window.SecurityEngine?.verify) {
              window.SecurityEngine.verify(data).then(result => {
                  this.sendToReact('security-result', { verified: result });
              });
          }
      };
      script.onerror = () => {
          console.warn('Security engine not available');
          this.sendToReact('security-result', { verified: false, error: 'engine-unavailable' });
      };
      document.head.appendChild(script);
    }
  }

  // Public API for battalooda-core.js
  loadTrack(trackId) { this.sendToReact('load-track', { trackId }); }
  startRecording() { this.sendToReact('start-recording'); }
  stopRecording() { this.sendToReact('stop-recording'); }
  applyEffect(effect, params) { this.sendToReact('apply-effect', { effect, params }); }
}

window.studioBridge = new StudioBridge();
