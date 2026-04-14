/**
 * Audio System for Zagel Avatar
 * Handles all sound effects and audio notifications
 */

export class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    try {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.7; // 70% volume
    } catch (error) {
      console.warn('Web Audio API not available:', error);
    }
  }

  /**
   * Play door knock sound (like Yahoo Messenger notification)
   * Three knocks with increasing volume
   */
  playDoorKnock() {
    if (!this.audioContext) return;

    const time = this.audioContext.currentTime;
    const knockTone = 800; // Hz

    // Three knocks
    for (let knock = 0; knock < 3; knock++) {
      const knockTime = time + knock * 0.4;
      this.playTone(knockTone, knockTime, 0.15, 0.1 + knock * 0.05);
    }
  }

  /**
   * Play activation sound for Zagel initialization
   */
  playActivationSound() {
    if (!this.audioContext) return;

    const time = this.audioContext.currentTime;

    // Rising tone sequence
    this.playTone(523, time, 0.2, 0.3); // C5
    this.playTone(659, time + 0.15, 0.2, 0.3); // E5
    this.playTone(784, time + 0.3, 0.3, 0.3); // G5
  }

  /**
   * Play app launch sound
   */
  playAppLaunchSound() {
    if (!this.audioContext) return;

    const time = this.audioContext.currentTime;

    // Ascending melody
    const melody = [
      { freq: 523, time: 0, duration: 0.15 }, // C5
      { freq: 587, time: 0.15, duration: 0.15 }, // D5
      { freq: 659, time: 0.3, duration: 0.15 }, // E5
      { freq: 784, time: 0.45, duration: 0.3 }, // G5
    ];

    melody.forEach(({ freq, time: offset, duration }) => {
      this.playTone(freq, time + offset, duration, 0.2);
    });
  }

  /**
   * Play notification sound (alert)
   */
  playNotificationSound() {
    if (!this.audioContext) return;

    const time = this.audioContext.currentTime;

    // Double beep
    this.playTone(1000, time, 0.1, 0.2);
    this.playTone(1200, time + 0.15, 0.1, 0.2);
  }

  /**
   * Play error sound
   */
  playErrorSound() {
    if (!this.audioContext) return;

    const time = this.audioContext.currentTime;

    // Descending tone
    this.playTone(800, time, 0.2, 0.3);
    this.playTone(600, time + 0.15, 0.2, 0.3);
    this.playTone(400, time + 0.3, 0.3, 0.3);
  }

  /**
   * Play success sound
   */
  playSuccessSound() {
    if (!this.audioContext) return;

    const time = this.audioContext.currentTime;

    // Ascending tones
    this.playTone(600, time, 0.15, 0.2);
    this.playTone(800, time + 0.1, 0.15, 0.2);
    this.playTone(1000, time + 0.2, 0.2, 0.2);
  }

  /**
   * Generic tone generator
   */
  private playTone(
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
  ) {
    if (!this.audioContext || !this.masterGain) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Fade in
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);

      // Fade out
      gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } catch (error) {
      console.warn('Failed to play tone:', error);
    }
  }

  /**
   * Set master volume
   */
  setVolume(level: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, level));
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
