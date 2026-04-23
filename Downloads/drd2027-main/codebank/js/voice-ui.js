/**
 * VoiceUI - Visual feedback for voice interactions
 */

class VoiceUI {
  constructor(engine) {
    this.engine = engine;
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.id = 'voice-ui-container';
    this.container.style.cssText = `
      position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
      z-index: 10000; display: none; flex-direction: column; align-items: center;
      gap: 10px; background: rgba(0,0,0,0.9); padding: 20px; border-radius: 20px;
      backdrop-filter: blur(10px);
    `;
    
    this.container.innerHTML = `
      <div style="display: flex; gap: 4px; height: 50px; align-items: center;">
        <div style="width: 6px; height: 50px; background: linear-gradient(to top, #00d4ff, #7c4dff); border-radius: 3px;"></div>
        <div style="width: 6px; height: 50px; background: linear-gradient(to top, #7c4dff, #00d4ff); border-radius: 3px;"></div>
        <div style="width: 6px; height: 50px; background: linear-gradient(to top, #00d4ff, #7c4dff); border-radius: 3px;"></div>
        <div style="width: 6px; height: 50px; background: linear-gradient(to top, #7c4dff, #00d4ff); border-radius: 3px;"></div>
        <div style="width: 6px; height: 50px; background: linear-gradient(to top, #00d4ff, #7c4dff); border-radius: 3px;"></div>
      </div>
      <div id="voice-text" style="color: #fff; font-size: 14px; text-align: center; max-width: 300px;"></div>
    `;
    
    document.body.appendChild(this.container);
  }

  bindEvents() {
    this.engine.onListeningStart = () => {
      this.show();
      this.setText('🎤 أستمع...');
    };
    
    this.engine.onFinalResult = (text) => {
      this.setText(`✓ ${text}`);
    };
    
    this.engine.onSpeakStart = () => {
      this.show();
      this.setText('🗣️ جاري الرد...');
    };
    
    this.engine.onSpeakEnd = () => {
      setTimeout(() => this.hide(), 1500);
    };
  }

  show() { this.container.style.display = 'flex'; }
  hide() { this.container.style.display = 'none'; }
  setText(text) {
    const el = this.container.querySelector('#voice-text');
    if (el) el.textContent = text;
  }
}

window.VoiceUI = VoiceUI;
