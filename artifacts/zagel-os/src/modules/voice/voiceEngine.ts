/**
 * Zagel Voice Engine
 * Handles speech-to-text (Web Speech API) and text-to-speech (Web Speech Synthesis).
 * STT: browser SpeechRecognition
 * TTS: browser SpeechSynthesis (built-in, no API key needed)
 */

type STTCallback = (text: string, isFinal: boolean) => void;
type STTEndCallback = (finalText: string) => void;
type ErrorCallback = (error: string) => void;

class VoiceEngine {
  private recognition: SpeechRecognition | null = null;
  private synth: SpeechSynthesis;
  private isListening = false;
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onSpeakStart?: () => void;
  private onSpeakEnd?: () => void;

  constructor() {
    this.synth = window.speechSynthesis;
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 1;
  }

  isSTTSupported(): boolean {
    const SR =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    return !!SR;
  }

  isTTSSupported(): boolean {
    return "speechSynthesis" in window;
  }

  setLanguage(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  startListening(
    onResult: STTCallback,
    onEnd: STTEndCallback,
    onError?: ErrorCallback
  ): boolean {
    if (!this.recognition) {
      onError?.("Speech recognition not supported");
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    // Stop speaking if active
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    let finalText = "";

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
          onResult(finalText, true);
        } else {
          interimText += result[0].transcript;
          onResult(interimText, false);
        }
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd(finalText);
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      const msg =
        event.error === "no-speech"
          ? "No speech detected"
          : event.error === "not-allowed"
          ? "Microphone access denied"
          : `Recognition error: ${event.error}`;
      onError?.(msg);
      onEnd(finalText);
    };

    try {
      this.recognition.start();
      return true;
    } catch {
      onError?.("Failed to start recognition");
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  setSpeakCallbacks(onStart?: () => void, onEnd?: () => void) {
    this.onSpeakStart = onStart;
    this.onSpeakEnd = onEnd;
  }

  speak(
    text: string,
    options: {
      voice?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      lang?: string;
    } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      // Cancel any current speech
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.1;
      utterance.volume = options.volume ?? 1.0;
      utterance.lang = options.lang ?? "en-US";

      // Try to find a pleasant voice
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        const preferred = voices.find(
          (v) =>
            v.name.toLowerCase().includes("google") ||
            v.name.toLowerCase().includes("natural") ||
            v.name.toLowerCase().includes("female")
        );
        if (preferred) utterance.voice = preferred;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.onSpeakStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.onSpeakEnd?.();
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        resolve();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  stopSpeaking() {
    this.synth.cancel();
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  // Load voices (async in some browsers)
  async loadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      this.synth.onvoiceschanged = () => {
        resolve(this.synth.getVoices());
      };
    });
  }

  // Vibrate (mobile haptic feedback)
  vibrate(pattern: number | number[] = 100) {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }
}

const voiceEngine = new VoiceEngine();
export default voiceEngine;
