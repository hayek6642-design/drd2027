/**
 * VoiceEngine - Native Web Speech API + Web Audio API
 * FREE, no external APIs, 100% client-side
 */

class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.audioContext = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.wakeWord = 'زاجل';
    this.init();
  }

  init() {
    this.initAudioContext();
    this.setupRecognition();
    this.loadVoices();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[VoiceEngine] Web Audio not available');
    }
  }

  setupRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    
    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ar-SA';
    
    this.recognition.onstart = () => {
      this.isListening = true;
      this.onListeningStart?.();
    };
    
    this.recognition.onresult = (e) => {
      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += txt;
        else interim += txt;
      }
      if (interim) this.onInterimResult?.(interim);
      if (final) {
        this.onFinalResult?.(final);
        this.onCommand?.(final);
      }
    };
    
    this.recognition.onerror = (e) => this.onError?.(e.error);
  }

  startListening() {
    if (this.recognition) {
      try { this.recognition.start(); } catch (e) {}
    }
  }

  stopListening() {
    if (this.recognition) this.recognition.stop();
  }

  loadVoices() {
    this.voices = this.synthesis.getVoices();
    this.arabicVoice = this.voices.find(v => v.lang.includes('ar')) || this.voices[0];
  }

  speak(text, options = {}) {
    return new Promise((resolve) => {
      this.synthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = options.voice || this.arabicVoice;
      u.lang = options.lang || 'ar-SA';
      u.pitch = options.pitch || 1.1;
      u.rate = options.rate || 0.95;
      u.onend = () => { this.isSpeaking = false; resolve(); };
      u.onstart = () => { this.isSpeaking = true; };
      this.synthesis.speak(u);
    });
  }

  playTone(freq, duration) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = freq;
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }
}

window.VoiceEngine = VoiceEngine;
