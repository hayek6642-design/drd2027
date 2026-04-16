/**
 * Zagel Pull-to-Refresh Controller
 * Smart gesture detection with 3D animated dove
 */

class PullRefreshController {
  constructor() {
    this.threshold = 80;
    this.startY = 0;
    this.isPulling = false;
    this.lastPullTime = 0;
    this.minDebounce = 500; // 500ms between pulls
    
    this.zagelUI = new ZagelRefreshUI();
    this.bindEvents();
  }
  
  bindEvents() {
    // Only trigger at top of page
    window.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0 && e.touches[0].clientY < 50) {
        this.startY = e.touches[0].clientY;
      }
    }, { passive: true });
    
    window.addEventListener('touchmove', (e) => {
      if (this.startY === 0) return;
      const delta = e.touches[0].clientY - this.startY;
      
      if (delta > 0 && window.scrollY === 0) {
        this.isPulling = true;
        this.zagelUI.updateProgress(Math.min(delta / this.threshold, 1));
      }
    }, { passive: true });
    
    window.addEventListener('touchend', () => {
      if (this.isPulling) {
        const progress = this.zagelUI.getProgress();
        if (progress >= 1) {
          this.triggerRefresh();
        } else {
          this.zagelUI.cancel();
        }
      }
      this.reset();
    });
  }
  
  async triggerRefresh() {
    // Check debounce
    const now = Date.now();
    if (now - this.lastPullTime < this.minDebounce) {
      this.zagelUI.cancel();
      return;
    }
    this.lastPullTime = now;
    
    this.zagelUI.showFullZagel();
    await this.zagelUI.playAnimation('flap');
    
    const type = this.decideRefreshType();
    
    if (type === 'none') {
      this.zagelUI.speak('لا داعي لإعادة التشغيل… كل شيء يعمل بشكل ممتاز');
    } else if (type === 'soft') {
      this.zagelUI.speak('قمت بتحديث كل شيء');
      await this.softRefresh();
    } else {
      this.zagelUI.speak('لحظة واحدة... سأعيد ترتيب كل شيء');
      await this.fullReload();
    }
    
    this.zagelUI.hide();
  }
  
  decideRefreshType() {
    if (!navigator.onLine) return 'none';
    // Check cache age or state
    try {
      const lastUpdate = localStorage.getItem('last_update_check');
      if (lastUpdate && Date.now() - parseInt(lastUpdate) < 60000) {
        return 'none'; // Recently updated
      }
    } catch(e) {}
    return 'soft';
  }
  
  async softRefresh() {
    localStorage.setItem('last_update_check', Date.now().toString());
    // Trigger data refresh events
    window.dispatchEvent(new CustomEvent('app:refresh'));
    await new Promise(r => setTimeout(r, 500));
  }
  
  fullReload() {
    if (window.Android?.reloadApp) {
      window.Android.reloadApp();
    } else {
      location.reload();
    }
  }
  
  reset() {
    this.startY = 0;
    this.isPulling = false;
  }
}

/**
 * Zagel Refresh UI
 * Visual components for pull-to-refresh
 */
class ZagelRefreshUI {
  constructor() {
    this.container = this.createContainer();
    this.progress = 0;
  }
  
  createContainer() {
    const div = document.createElement('div');
    div.id = 'zagel-refresh-container';
    document.body.appendChild(div);
    return div;
  }
  
  updateProgress(ratio) {
    this.progress = ratio;
    const translateY = -100 + (ratio * 100);
    const emoji = ratio < 0.5 ? '🐣' : ratio < 0.8 ? '🕊️' : '🕊️';
    
    this.container.innerHTML = `
      <div style="
        position: fixed;
        top: -60px;
        left: 50%;
        transform: translateX(-50%);
        transition: transform 0.1s ease-out;
        z-index: 9999;
        pointer-events: none;
      ">
        <div style="
          font-size: ${40 + ratio * 20}px;
          text-align: center;
        ">
          ${emoji}
          <div style="
            font-size: 12px;
            color: #666;
            margin-top: 4px;
          ">
            ${Math.round(ratio * 100)}%
          </div>
        </div>
      </div>
    `;
  }
  
  showFullZagel() {
    this.container.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        pointer-events: none;
        text-align: center;
      ">
        <div style="
          font-size: 60px;
          animation: zagel-hover 0.5s ease-in-out infinite;
        ">🕊️</div>
        <div style="
          color: #7C4DFF;
          font-size: 14px;
          margin-top: 8px;
        ">جاري التحميل...</div>
      </div>
      <style>
        @keyframes zagel-hover {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-10px); }
        }
      </style>
    `;
  }
  
  async playAnimation(type) {
    return new Promise(resolve => setTimeout(resolve, 800));
  }
  
  speak(text) {
    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        utterance.pitch = 1.1;
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      } catch(e) {
        console.log('[Zagel] Speech:', text);
      }
    }
  }
  
  getProgress() {
    return this.progress;
  }
  
  cancel() {
    this.container.innerHTML = '';
    this.progress = 0;
  }
  
  hide() {
    this.container.innerHTML = '';
    this.progress = 0;
  }
}

// Export for use
window.PullRefreshController = PullRefreshController;
window.ZagelRefreshUI = ZagelRefreshUI;