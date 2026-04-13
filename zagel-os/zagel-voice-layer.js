/**
 * ZAGEL Voice Layer v2.0.0
 * Browser TTS with Arabic support
 * Personality-aware speech synthesis
 */

(function () {
  'use strict';
  if (window.__ZAGEL_VOICE__) return;

  const VOICE_PROFILES = {
    soprano: { pitch: 1.5, rate: 1.2, volume: 0.8 },
    alto: { pitch: 1.2, rate: 1.0, volume: 0.8 },
    tenor: { pitch: 0.8, rate: 0.9, volume: 0.8 },
    bass: { pitch: 0.5, rate: 0.8, volume: 0.8 },
    robotic: { pitch: 1.0, rate: 1.5, volume: 0.8 },
    whimsical: { pitch: 1.3, rate: 1.1, volume: 0.8 }
  };

  class ZagelVoiceLayer {
    constructor() {
      this._synth = window.speechSynthesis || null;
      this._currentProfile = 'alto';
      this._enabled = true;
      this._queue = [];
      this._speaking = false;
      this._arabicVoice = null;

      this._findArabicVoice();
      console.log('🔊 [Zagel-Voice] Layer initialized');
    }

    _findArabicVoice() {
      if (!this._synth) return;

      const find = () => {
        const voices = this._synth.getVoices();
        this._arabicVoice = voices.find(v => v.lang.startsWith('ar')) ||
                            voices.find(v => v.lang.includes('ar')) ||
                            voices[0] || null;
      };

      find();
      if (this._synth.onvoiceschanged !== undefined) {
        this._synth.onvoiceschanged = find;
      }
    }

    speak(text, options = {}) {
      if (!this._enabled || !this._synth) {
        console.warn('🔊 [Voice] Speech synthesis unavailable or disabled');
        return Promise.resolve(false);
      }

      return new Promise((resolve) => {
        const profile = VOICE_PROFILES[options.profile || this._currentProfile] || VOICE_PROFILES.alto;
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.pitch = options.pitch ?? profile.pitch;
        utterance.rate = options.rate ?? profile.rate;
        utterance.volume = options.volume ?? profile.volume;
        utterance.lang = options.lang || 'ar-EG';

        if (this._arabicVoice) {
          utterance.voice = this._arabicVoice;
        }

        utterance.onstart = () => {
          this._speaking = true;
          if (window.ZagelBus) window.ZagelBus.emit('voice:speaking', { text });
        };

        utterance.onend = () => {
          this._speaking = false;
          if (window.ZagelBus) window.ZagelBus.emit('voice:done', { text });
          this._processQueue();
          resolve(true);
        };

        utterance.onerror = (e) => {
          this._speaking = false;
          console.error('🔊 [Voice] Error:', e.error);
          this._processQueue();
          resolve(false);
        };

        if (this._speaking && !options.interrupt) {
          this._queue.push({ text, options, resolve });
          return;
        }

        if (options.interrupt) {
          this._synth.cancel();
          this._queue = [];
        }

        this._synth.speak(utterance);
      });
    }

    _processQueue() {
      if (this._queue.length === 0) return;
      const next = this._queue.shift();
      this.speak(next.text, next.options).then(next.resolve);
    }

    announce(senderName, options = {}) {
      const messages = [
        `رسالة من ${senderName}`,
        `${senderName} بعتلك رسالة`,
        `عندك رسالة جديدة من ${senderName}`
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      return this.speak(msg, options);
    }

    setProfile(profileName) {
      if (VOICE_PROFILES[profileName]) {
        this._currentProfile = profileName;
      }
    }

    setEnabled(enabled) { this._enabled = !!enabled; }
    isEnabled() { return this._enabled; }
    isSpeaking() { return this._speaking; }
    getProfiles() { return Object.keys(VOICE_PROFILES); }
    getCurrentProfile() { return this._currentProfile; }

    stop() {
      if (this._synth) this._synth.cancel();
      this._queue = [];
      this._speaking = false;
    }

    testVoice(profileName) {
      const testText = 'أهلاً! أنا زاجل، مساعدك الذكي';
      return this.speak(testText, { profile: profileName || this._currentProfile });
    }

    destroy() {
      this.stop();
      delete window.__ZAGEL_VOICE__;
    }
  }

  window.__ZAGEL_VOICE__ = new ZagelVoiceLayer();
  window.ZagelVoice = window.__ZAGEL_VOICE__;
})();
