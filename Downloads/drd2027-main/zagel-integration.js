/**
 * ============================================================================
 * ZAGEL AVATAR SYSTEM - FULL INTEGRATION WRAPPER
 * ============================================================================
 * 
 * This script provides complete integration of the Zagel 3D Avatar System
 * with the DRD2027 CodeBank application, including:
 * - Avatar management and animations
 * - Audio system (door knock, notifications, TTS)
 * - Trigger listener for updates (messages, videos, products, news, codes)
 * - Voice recognition (Web Speech API)
 * - Toast notifications
 * - Zajel Voice Engine dual-name support (Zagel + Zajel)
 * 
 * Usage:
 * 1. Include this script in yt-new-clear.html
 * 2. Add <div id="zagel-container"></div> to the HTML
 * 3. Call ZagelSystem.initialize() after page load
 * 4. Emit events: window.dispatchEvent(new CustomEvent('zagel:new-message', {...}))
 * ============================================================================
 */

window.ZagelSystem = window.ZagelSystem || (() => {
  'use strict';

  // ============================================================================
  // AUDIO SYSTEM - Door knock, notifications, TTS
  // ============================================================================
  
  class AudioSystem {
    constructor() {
      this.audioContext = null;
      this.masterGain = null;
      this.isInitialized = false;
      this.masterVolume = 0.7;
    }

    initAudioContext() {
      if (this.isInitialized) return;
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioContext = audioContext;
        this.masterGain = audioContext.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(audioContext.destination);
        this.isInitialized = true;
        console.log('[AudioSystem] Initialized');
      } catch (e) {
        console.warn('[AudioSystem] Failed to initialize:', e);
      }
    }

    ensureInitialized() {
      if (!this.isInitialized) this.initAudioContext();
    }

    playTone(frequency, duration, when = 0) {
      this.ensureInitialized();
      if (!this.audioContext) return;
      
      try {
        const now = this.audioContext.currentTime + when;
        const osc = this.audioContext.createOscillator();
        const env = this.audioContext.createGain();
        
        osc.frequency.value = frequency;
        osc.connect(env);
        env.connect(this.masterGain);
        
        env.gain.setValueAtTime(0.3, now);
        env.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.start(now);
        osc.stop(now + duration);
      } catch (e) {
        console.warn('[AudioSystem] Error playing tone:', e);
      }
    }

    playDoorKnock() {
      console.log('[AudioSystem] Playing door knock');
      // 3 knocks pattern: 100ms tone, 150ms silence, repeat 3x
      this.playTone(800, 0.1, 0);
      this.playTone(800, 0.1, 0.25);
      this.playTone(800, 0.1, 0.5);
    }

    playActivationSound() {
      console.log('[AudioSystem] Playing activation sound');
      // Rising melody
      this.playTone(440, 0.15, 0);      // A4
      this.playTone(550, 0.15, 0.17);   // C#5
      this.playTone(660, 0.15, 0.34);   // E5
      this.playTone(880, 0.3, 0.51);    // A5
    }

    playNotificationSound() {
      console.log('[AudioSystem] Playing notification sound');
      this.playTone(600, 0.1, 0);
      this.playTone(800, 0.15, 0.15);
    }

    playSuccessSound() {
      console.log('[AudioSystem] Playing success sound');
      this.playTone(523, 0.1, 0);       // C5
      this.playTone(659, 0.1, 0.12);    // E5
      this.playTone(784, 0.2, 0.24);    // G5
    }

    setVolume(level) {
      this.masterVolume = Math.max(0, Math.min(1, level));
      if (this.masterGain) {
        this.masterGain.gain.value = this.masterVolume;
      }
    }

    cleanup() {
      // Properly close audio context if needed
      if (this.audioContext && this.audioContext.state !== 'closed') {
        // Don't force close - let browser manage lifecycle
      }
    }
  }

  // ============================================================================
  // TRIGGER LISTENER - Event monitoring
  // ============================================================================

  class TriggerListener {
    constructor(onTrigger) {
      this.onTrigger = onTrigger;
      this.processedIds = new Set();
      this.pollingInterval = null;
      this.listeners = {
        message: (e) => this.handleTrigger(e, 'message'),
        video: (e) => this.handleTrigger(e, 'video'),
        product: (e) => this.handleTrigger(e, 'product'),
        news: (e) => this.handleTrigger(e, 'news'),
        code: (e) => this.handleTrigger(e, 'code'),
      };
    }

    start() {
      // Listen for custom events
      Object.entries(this.listeners).forEach(([type, listener]) => {
        window.addEventListener(`zagel:new-${type}`, listener);
      });

      // Listen for visibility changes (app backgrounding)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          console.log('[TriggerListener] App backgrounded - ready to notify');
        }
      });

      // Poll for pending updates in localStorage
      this.pollingInterval = setInterval(() => {
        this.checkForPendingTriggers();
      }, 5000);

      console.log('[TriggerListener] Started');
    }

    handleTrigger(event, type) {
      const { title, description, id = Date.now().toString() } = event.detail || {};
      
      if (!this.processedIds.has(id)) {
        this.processedIds.add(id);
        this.onTrigger({
          type,
          title: title || `New ${type}`,
          description: description || 'New update available',
          timestamp: Date.now()
        });
      }
    }

    checkForPendingTriggers() {
      try {
        const updates = JSON.parse(localStorage.getItem('zagel-pending-updates') || '[]');
        updates.forEach(update => {
          if (!this.processedIds.has(update.id || update.timestamp)) {
            this.processedIds.add(update.id || update.timestamp);
            this.onTrigger(update);
          }
        });
        if (updates.length > 0) {
          localStorage.removeItem('zagel-pending-updates');
        }
      } catch (e) {
        console.warn('[TriggerListener] Error checking pending:', e);
      }
    }

    cleanup() {
      Object.entries(this.listeners).forEach(([type, listener]) => {
        window.removeEventListener(`zagel:new-${type}`, listener);
      });
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
    }
  }

  // ============================================================================
  // VOICE LISTENER - Web Speech API integration with Zajel support
  // ============================================================================

  class VoiceListener {
    constructor(onCommand) {
      this.onCommand = onCommand;
      this.isListening = false;
      this.recognition = null;
      this.transcript = '';
      this.setupRecognition();
    }

    setupRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[VoiceListener] Web Speech API not supported');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.language = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('[VoiceListener] Listening...');
      };

      this.recognition.onresult = (event) => {
        this.transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          this.transcript += event.results[i][0].transcript;
        }
        this.checkForCommand(this.transcript);
      };

      this.recognition.onerror = (event) => {
        console.warn('[VoiceListener] Error:', event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        console.log('[VoiceListener] Stopped listening');
      };
    }

    checkForCommand(text) {
      const lowerText = text.toLowerCase();
      
      // Support both Zagel and Zajel (dual name support)
      const commands = [
        'yes zagel come in',
        'yes zajel come in',
        'zagel come in',
        'zajel come in',
        'come in',
        'open zagel',
        'open zajel',
        'activate zagel',
        'activate zajel'
      ];

      if (commands.some(cmd => lowerText.includes(cmd))) {
        console.log('[VoiceListener] Command detected:', text);
        this.onCommand(text);
      }
    }

    start() {
      if (this.recognition && !this.isListening) {
        this.recognition.start();
      }
    }

    stop() {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
      }
    }

    cleanup() {
      this.stop();
    }
  }

  // ============================================================================
  // TOAST NOTIFICATION MANAGER
  // ============================================================================

  class ToastManager {
    constructor(containerId) {
      this.containerId = containerId;
      this.toasts = [];
      this.setupContainer();
    }

    setupContainer() {
      let container = document.getElementById(this.containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = this.containerId;
        container.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          pointer-events: none;
        `;
        document.body.appendChild(container);
      }
      this.container = container;
    }

    addToast(message, type = 'info', duration = 5000) {
      const id = Date.now().toString();
      const toast = document.createElement('div');
      
      const colors = {
        info: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        automation: '#8b5cf6',
        error: '#ef4444'
      };

      toast.id = `toast-${id}`;
      toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        margin: 12px 0;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: toastSlideIn 0.3s ease-out;
        pointer-events: auto;
        cursor: pointer;
      `;

      toast.textContent = message;
      toast.onclick = () => this.removeToast(id);

      this.container.appendChild(toast);
      this.toasts.push(id);

      // Auto-dismiss
      setTimeout(() => this.removeToast(id), duration);
    }

    removeToast(id) {
      const element = document.getElementById(`toast-${id}`);
      if (element) {
        element.style.animation = 'toastSlideOut 0.3s ease-in';
        setTimeout(() => {
          element.remove();
          this.toasts = this.toasts.filter(t => t !== id);
        }, 300);
      }
    }
  }

  // ============================================================================
  // MAIN ZAGEL SYSTEM
  // ============================================================================

  class ZagelAvatarSystem {
    constructor() {
      this.audioSystem = new AudioSystem();
      this.toastManager = new ToastManager('zagel-toast-container');
      this.triggerListener = null;
      this.voiceListener = null;
      this.state = {
        isInitialized: false,
        isFlying: false,
        hasNotification: false,
        currentPage: 'codebank'
      };
      this.updateCount = 0;
    }

    initialize() {
      console.log('[ZagelSystem] Initializing...');
      
      // Setup trigger listener
      this.triggerListener = new TriggerListener((trigger) => {
        this.handleTrigger(trigger);
      });
      this.triggerListener.start();

      // Setup voice listener
      this.voiceListener = new VoiceListener(() => {
        this.initializeZagel();
      });
      this.voiceListener.start();

      // Add CSS animations
      this.injectStyles();

      // Listen for page transitions
      window.addEventListener('pagechange', (e) => {
        this.state.currentPage = e.detail?.page || 'other';
        console.log('[ZagelSystem] Page changed to:', this.state.currentPage);
      });

      console.log('[ZagelSystem] Ready');
    }

    injectStyles() {
      if (document.getElementById('zagel-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'zagel-styles';
      style.textContent = `
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-20px);
          }
        }

        @keyframes zagel-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
          }
          50% {
            box-shadow: 0 0 0 15px rgba(245, 158, 11, 0);
          }
        }

        @keyframes zagel-fly {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-100px) translateX(20px) scale(0.8);
          }
          100% {
            transform: translateY(-200px) scale(0.5);
            opacity: 0;
          }
        }

        #zagel-avatar {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
        }

        #zagel-avatar.flying {
          animation: zagel-fly 3s ease-in-out forwards;
        }

        .zagel-frame {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid #f59e0b;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
        }

        .zagel-frame:hover {
          transform: scale(1.05);
          box-shadow: 0 10px 30px rgba(245, 158, 11, 0.4);
        }

        .zagel-frame.pulsing {
          animation: zagel-pulse 2s infinite;
        }

        .zagel-pigeon {
          width: 80%;
          height: 80%;
        }

        .zagel-notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 24px;
          height: 24px;
          background: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
          animation: zagel-pulse 1.5s infinite;
        }
      `;
      document.head.appendChild(style);
    }

    initializeZagel() {
      if (this.state.isInitialized) return;
      
      console.log('[ZagelSystem] Activating Zagel...');
      
      this.state.isInitialized = true;
      
      // Show automation toast
      this.toastManager.addToast('🤖 The system is about to be automated...', 'automation', 3000);
      
      // Play activation sound
      this.audioSystem.playActivationSound();
      
      // Update avatar visually
      const avatar = document.getElementById('zagel-avatar');
      if (avatar) {
        const frame = avatar.querySelector('.zagel-frame');
        if (frame) {
          frame.classList.add('pulsing');
          setTimeout(() => {
            frame.classList.remove('pulsing');
          }, 2000);
        }
      }
      
      // Show introduction
      setTimeout(() => {
        this.toastManager.addToast('🕊️ Hello! I\'m Zagel. I have ' + this.updateCount + ' updates for you.', 'info', 5000);
      }, 1500);
    }

    handleTrigger(trigger) {
      console.log('[ZagelSystem] Handling trigger:', trigger.type);
      
      this.updateCount++;
      this.state.hasNotification = true;

      // Show toast with trigger details
      const icons = {
        message: '💬',
        video: '🎬',
        product: '🛍️',
        news: '📰',
        code: '💻',
        other: '📬'
      };
      
      const icon = icons[trigger.type] || '📬';
      this.toastManager.addToast(
        `${icon} ${trigger.title}\n${trigger.description}`,
        'info',
        5000
      );

      // Play notification sound
      this.audioSystem.playNotificationSound();

      // Update notification badge
      this.updateNotificationBadge();

      // If app is backgrounded, play door knock
      if (document.hidden) {
        console.log('[ZagelSystem] App backgrounded - playing door knock');
        this.audioSystem.playDoorKnock();
      }

      // If on main page, show flying animation
      if (this.state.currentPage === 'main' && this.state.isInitialized) {
        this.triggerFlyingAnimation();
      }
    }

    triggerFlyingAnimation() {
      const avatar = document.getElementById('zagel-avatar');
      if (!avatar) return;
      
      console.log('[ZagelSystem] Triggering flying animation');
      this.state.isFlying = true;
      
      avatar.classList.add('flying');
      
      setTimeout(() => {
        avatar.classList.remove('flying');
        this.state.isFlying = false;
      }, 3000);
    }

    updateNotificationBadge() {
      const avatar = document.getElementById('zagel-avatar');
      if (!avatar) return;
      
      let badge = avatar.querySelector('.zagel-notification-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'zagel-notification-badge';
        avatar.querySelector('.zagel-frame').appendChild(badge);
      }
      
      badge.textContent = this.updateCount;
      if (this.updateCount === 0) {
        badge.style.display = 'none';
      } else {
        badge.style.display = 'flex';
      }
    }

    createAvatarElement() {
      const container = document.getElementById('zagel-container');
      if (!container || container.querySelector('#zagel-avatar')) return;

      const avatar = document.createElement('div');
      avatar.id = 'zagel-avatar';
      
      avatar.innerHTML = `
        <div class="zagel-frame" onclick="ZagelSystem.getInstance().initializeZagel()">
          <svg class="zagel-pigeon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Pigeon body -->
            <ellipse cx="50" cy="55" rx="25" ry="30" fill="#white" stroke="#333" stroke-width="1"/>
            
            <!-- Head -->
            <circle cx="50" cy="35" r="15" fill="#f3f4f6" stroke="#333" stroke-width="1"/>
            
            <!-- Eye -->
            <circle cx="56" cy="32" r="3" fill="#333"/>
            
            <!-- Beak -->
            <polygon points="62,33 72,32 62,36" fill="#ff8c00" stroke="#333" stroke-width="0.5"/>
            
            <!-- Wing -->
            <ellipse cx="38" cy="55" rx="12" ry="20" fill="#e5e7eb" stroke="#333" stroke-width="1"/>
            
            <!-- Tail feathers -->
            <path d="M 65 65 Q 80 60 85 75" stroke="#999" stroke-width="3" fill="none"/>
            <path d="M 67 68 Q 82 70 88 85" stroke="#999" stroke-width="3" fill="none"/>
            
            <!-- Feet -->
            <line x1="48" y1="85" x2="48" y2="95" stroke="#ff8c00" stroke-width="2"/>
            <line x1="52" y1="85" x2="52" y2="95" stroke="#ff8c00" stroke-width="2"/>
          </svg>
        </div>
      `;

      container.appendChild(avatar);
      console.log('[ZagelSystem] Avatar element created');
    }

    showUpdates() {
      console.log('[ZagelSystem] Showing ' + this.updateCount + ' updates');
      this.state.currentPage = 'main';
      window.dispatchEvent(new CustomEvent('pagechange', { detail: { page: 'main' } }));
      
      if (this.state.isInitialized && this.updateCount > 0) {
        this.triggerFlyingAnimation();
      }
    }

    cleanup() {
      if (this.triggerListener) this.triggerListener.cleanup();
      if (this.voiceListener) this.voiceListener.cleanup();
      if (this.audioSystem) this.audioSystem.cleanup();
    }

    // Singleton pattern
    static instance = null;
    static getInstance() {
      if (!this.instance) {
        this.instance = new ZagelAvatarSystem();
      }
      return this.instance;
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    getInstance: () => ZagelAvatarSystem.getInstance(),
    
    initialize() {
      const system = ZagelAvatarSystem.getInstance();
      system.createAvatarElement();
      system.initialize();
    },

    // Emit trigger events
    emitMessage(title, description, id) {
      window.dispatchEvent(new CustomEvent('zagel:new-message', {
        detail: { title, description, id: id || Date.now().toString() }
      }));
    },

    emitVideo(title, description, id) {
      window.dispatchEvent(new CustomEvent('zagel:new-video', {
        detail: { title, description, id: id || Date.now().toString() }
      }));
    },

    emitProduct(title, description, id) {
      window.dispatchEvent(new CustomEvent('zagel:new-product', {
        detail: { title, description, id: id || Date.now().toString() }
      }));
    },

    emitNews(title, description, id) {
      window.dispatchEvent(new CustomEvent('zagel:new-news', {
        detail: { title, description, id: id || Date.now().toString() }
      }));
    },

    emitCode(title, description, id) {
      window.dispatchEvent(new CustomEvent('zagel:new-code', {
        detail: { title, description, id: id || Date.now().toString() }
      }));
    },

    // Manual control
    showUpdates() {
      ZagelAvatarSystem.getInstance().showUpdates();
    },

    setVolume(level) {
      ZagelAvatarSystem.getInstance().audioSystem.setVolume(level);
    },

    cleanup() {
      ZagelAvatarSystem.getInstance().cleanup();
    }
  };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[ZagelSystem] DOM ready - initializing...');
  setTimeout(() => {
    ZagelSystem.initialize();
  }, 500);
});
