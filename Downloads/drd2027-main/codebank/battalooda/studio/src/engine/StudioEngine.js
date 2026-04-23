/**
 * Battalooda Studio Engine
 * Professional Web Audio DAW engine with precise scheduling
 */

const GENRES = ['Amapiano', 'Afrobeats', 'D&B', 'Drill', 'Dubstep', 'EDM', 'Hip-hop', 'House', 'Techno', 'Trap'];

const GENRE_PRESETS = {
  'Amapiano': {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    clap:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    bass:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    perc:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
  },
  'Trap': {
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    clap:  [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,1,0],
    bass:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
    perc:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  'House': {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    clap:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    bass:  [1,0,0,0, 0,1,0,0, 1,0,0,0, 0,0,1,0],
    perc:  [0,1,0,0, 0,0,0,1, 0,1,0,0, 0,0,0,1],
  },
  'Hip-hop': {
    kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    clap:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
    bass:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    perc:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  },
  'Drill': {
    kick:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    hihat: [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1],
    clap:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    bass:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,1,0,0],
    perc:  [0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0],
  },
  'EDM': {
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    clap:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    bass:  [1,0,0,1, 0,0,0,0, 1,0,0,1, 0,0,0,0],
    perc:  [0,1,0,0, 0,1,0,0, 0,1,0,0, 0,1,0,0],
  },
};

export const DEFAULT_TRACKS = [
  { id: 'kick',  name: '808 Kick',    type: 'sampler', steps: new Array(16).fill(0), sample: 'kick',  volume: 0.85, pan: 0,    muted: false, solo: false, color: '#e74c3c' },
  { id: 'snare', name: 'Trap Snare',  type: 'sampler', steps: new Array(16).fill(0), sample: 'snare', volume: 0.75, pan: 0,    muted: false, solo: false, color: '#2ecc71' },
  { id: 'hihat', name: 'Hi-Hat',      type: 'sampler', steps: new Array(16).fill(0), sample: 'hihat', volume: 0.65, pan: 0.3,  muted: false, solo: false, color: '#f1c40f' },
  { id: 'clap',  name: 'Master Clap', type: 'sampler', steps: new Array(16).fill(0), sample: 'clap',  volume: 0.70, pan: -0.2, muted: false, solo: false, color: '#e91e8c' },
  { id: 'bass',  name: 'Sub Bass',    type: 'sampler', steps: new Array(16).fill(0), sample: 'bass',  volume: 0.80, pan: 0,    muted: false, solo: false, color: '#3498db' },
  { id: 'perc',  name: 'Percussion',  type: 'sampler', steps: new Array(16).fill(0), sample: 'perc',  volume: 0.55, pan: 0.4,  muted: false, solo: false, color: '#ff9800' },
  { id: 'vocal', name: 'Vocal Track', type: 'audio',   steps: new Array(16).fill(0), sample: '',      volume: 0.85, pan: 0,    muted: false, solo: false, color: '#00bcd4' },
];

export class StudioEngine {
  constructor() {
    this.audioCtx = null;
    this.samples = {};
    this.masterGain = null;
    this.compressor = null;
    this.reverbNode = null;
    this.delayNode = null;
    this.delayFeedback = null;
    this.mediaStreamDest = null;
    this.micSource = null;
    this.micStream = null;

    // 🚀 NEW: Audio Asset Manager for streaming
    this.cdnUrl = 'https://cdn.battalooda.com/assets/audio/samples/'; // Placeholder CDN
    this.isCdnEnabled = true; // 🔧 Enabled for production to reduce bundle size

    this.tracks = DEFAULT_TRACKS.map(t => ({ ...t, steps: [...t.steps] }));
    this.bpm = 128;
    this.isPlaying = false;
    this.currentStep = -1;
    this.masterVolume = 0.8;
    this.selectedGenre = 'Amapiano';
    this.effects = { reverb: false, delay: false, compressor: true };
    this.timeElapsed = 0;
    this.genres = GENRES;

    this.isRecording = false;
    this.recordingStartTime = null;
    this._mediaRecorder = null;
    this._recordedChunks = [];

    this._scheduleAheadTime = 0.1;
    this._lookahead = 25;
    this._nextNoteTime = 0;
    this._schedulerTimer = null;
    this._startTime = 0;

    this._listeners = [];
  }

  // 🚀 NEW: Audio Asset Manager - Load from CDN on demand
  async loadSample(name) {
    if (this.samples[name]) return this.samples[name];
    if (!this.isCdnEnabled) return null; // Fallback to synthesized samples

    try {
      console.log(`[AssetManager] Streaming sample from CDN: ${name}`);
      const response = await fetch(`${this.cdnUrl}${name}.wav`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      this.samples[name] = audioBuffer;
      return audioBuffer;
    } catch (err) {
      console.warn(`[AssetManager] CDN load failed for ${name}, using synthesized fallback`, err);
      return null;
    }
  }

  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  notify() {
    this._listeners.forEach(fn => fn(this.getState()));
  }

  getState() {
    return {
      tracks: this.tracks,
      bpm: this.bpm,
      isPlaying: this.isPlaying,
      currentStep: this.currentStep,
      masterVolume: this.masterVolume,
      effects: { ...this.effects },
      selectedGenre: this.selectedGenre,
      timeElapsed: this.timeElapsed,
      genres: this.genres,
      isRecording: this.isRecording,
      recordingElapsed: this.isRecording ? Date.now() - this.recordingStartTime : 0,
    };
  }

  async initAudio() {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
      return;
    }
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.masterVolume;

    this.compressor = this.audioCtx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 10;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.mediaStreamDest = this.audioCtx.createMediaStreamDestination();

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.audioCtx.destination);
    this.compressor.connect(this.mediaStreamDest);

    this._buildSamples();
  }

  async startRecording() {
    await this.initAudio();

    let micTrack = null;
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.mediaStreamDest);
      micTrack = this.micStream.getAudioTracks()[0];
    } catch (err) {
      console.warn('Microphone not available, recording audio output only:', err.message);
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

    this._recordedChunks = [];
    this._mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream, { mimeType });
    this._mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this._recordedChunks.push(e.data);
    };
    this._mediaRecorder.start(100);

    this.isRecording = true;
    this.recordingStartTime = Date.now();

    this._recTicker = setInterval(() => this.notify(), 500);

    if (!this.isPlaying) await this.play();

    this.notify();
  }

  async stopRecording() {
    if (!this._mediaRecorder || this._mediaRecorder.state === 'inactive') return null;

    clearInterval(this._recTicker);

    const duration = Date.now() - this.recordingStartTime;
    this.isRecording = false;
    this.recordingStartTime = null;

    const blob = await new Promise((resolve) => {
      this._mediaRecorder.onstop = () => {
        const mimeType = this._mediaRecorder.mimeType;
        resolve(new Blob(this._recordedChunks, { type: mimeType }));
      };
      this._mediaRecorder.stop();
    });

    if (this.micSource) {
      try { this.micSource.disconnect(); } catch {}
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }

    this._recordedChunks = [];
    this.stop();
    this.notify();

    return { blob, duration };
  }

  _buildSamples() {
    const ctx = this.audioCtx;
    const sr = ctx.sampleRate;

    const makeBuffer = (dur, fn) => {
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) fn(d, i, i / sr);
      return buf;
    };

    this.samples.kick = makeBuffer(0.55, (d, i, t) => {
      const freq = 180 * Math.exp(-t * 14);
      const click = t < 0.005 ? (Math.random() * 2 - 1) * 0.4 : 0;
      d[i] = (Math.sin(2 * Math.PI * freq * t) + click) * Math.exp(-t * 9) * 0.9;
    });

    this.samples.snare = makeBuffer(0.35, (d, i, t) => {
      const noise = Math.random() * 2 - 1;
      const tone = Math.sin(2 * Math.PI * 185 * t) * 0.3;
      const tone2 = Math.sin(2 * Math.PI * 280 * t) * 0.15;
      d[i] = (noise * 0.65 + tone + tone2) * Math.exp(-t * 18) * 0.7;
    });

    this.samples.hihat = makeBuffer(0.09, (d, i, t) => {
      const noise = Math.random() * 2 - 1;
      d[i] = noise * Math.exp(-t * 55) * 0.45;
    });

    this.samples.clap = makeBuffer(0.22, (d, i, t) => {
      const burst = t < 0.015 ? Math.exp(-t * 200) : Math.exp(-t * 25);
      d[i] = (Math.random() * 2 - 1) * burst * 0.55;
    });

    this.samples.bass = makeBuffer(0.5, (d, i, t) => {
      const f1 = Math.sin(2 * Math.PI * 55 * t);
      const f2 = Math.sin(2 * Math.PI * 110 * t) * 0.3;
      const dist = Math.tanh((f1 + f2) * 2) / 2;
      d[i] = dist * Math.exp(-t * 6) * 0.8;
    });

    this.samples.perc = makeBuffer(0.18, (d, i, t) => {
      const f = 900 * Math.exp(-t * 8);
      d[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 35) * 0.45;
    });
  }

  _buildReverb() {
    if (this.reverbNode) return;
    const ctx = this.audioCtx;
    const sr = ctx.sampleRate;
    const dur = 2.5;
    const impulse = ctx.createBuffer(2, sr * dur, sr);
    for (let c = 0; c < 2; c++) {
      const d = impulse.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.8);
      }
    }
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = impulse;
    this.reverbNode.connect(this.masterGain);
  }

  _buildDelay() {
    if (this.delayNode) return;
    const ctx = this.audioCtx;
    this.delayNode = ctx.createDelay(1);
    this.delayFeedback = ctx.createGain();
    this.delayNode.delayTime.value = 60 / this.bpm * 0.5;
    this.delayFeedback.gain.value = 0.35;
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);
  }

  playSample(sampleName, volume, pan, time) {
    const ctx = this.audioCtx;
    const buf = this.samples[sampleName];
    if (!ctx || !buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.value = volume * this.masterVolume;

    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    src.connect(panner);
    panner.connect(gain);

    if (this.effects.reverb) {
      this._buildReverb();
      gain.connect(this.reverbNode);
    }
    if (this.effects.delay) {
      this._buildDelay();
      gain.connect(this.delayNode);
    }

    gain.connect(this.masterGain);
    src.start(time || ctx.currentTime);
  }

  playNote(freq, type = 'sine', duration = 0.4, volume = 0.5) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.99, now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  _scheduleNote(step, time) {
    this.tracks.forEach(track => {
      if (track.muted) return;
      const hasSolo = this.tracks.some(t => t.solo);
      if (hasSolo && !track.solo) return;
      if (track.type === 'sampler' && track.steps[step]) {
        this.playSample(track.sample, track.volume, track.pan, time);
      }
    });
  }

  _scheduler() {
    const ctx = this.audioCtx;
    while (this._nextNoteTime < ctx.currentTime + this._scheduleAheadTime) {
      this._scheduleNote(this._scheduledStep, this._nextNoteTime);
      const stepDuration = 60 / this.bpm / 4;
      this._nextNoteTime += stepDuration;
      this._scheduledStep = (this._scheduledStep + 1) % 16;
    }
    this._schedulerTimer = setTimeout(() => this._scheduler(), this._lookahead);
  }

  _uiTicker() {
    if (!this.isPlaying) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const stepDuration = 60 / this.bpm / 4;
    const elapsed = now - this._startTime;
    const step = Math.floor(elapsed / stepDuration) % 16;

    if (step !== this.currentStep) {
      this.currentStep = step;
      this.timeElapsed = Math.floor(elapsed);
      this.notify();
    }

    this._uiFrame = requestAnimationFrame(() => this._uiTicker());
  }

  async play() {
    await this.initAudio();
    if (this.isPlaying) return;

    const ctx = this.audioCtx;
    this._scheduledStep = 0;
    this._nextNoteTime = ctx.currentTime + 0.05;
    this._startTime = ctx.currentTime;
    this.isPlaying = true;
    this.currentStep = -1;

    this._scheduler();
    this._uiTicker();
    this.notify();
  }

  stop() {
    clearTimeout(this._schedulerTimer);
    cancelAnimationFrame(this._uiFrame);
    this.isPlaying = false;
    this.currentStep = -1;
    this.timeElapsed = 0;
    this.notify();
  }

  toggleStep(trackId, stepIndex) {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;
    track.steps[stepIndex] = track.steps[stepIndex] ? 0 : 1;
    if (this.audioCtx && !this.isPlaying) {
      this.playSample(track.sample, track.volume, track.pan);
    }
    this.notify();
  }

  toggleMute(trackId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) track.muted = !track.muted;
    this.notify();
  }

  toggleSolo(trackId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) track.solo = !track.solo;
    this.notify();
  }

  setTrackVolume(trackId, vol) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) track.volume = Math.max(0, Math.min(1, vol));
    this.notify();
  }

  setTrackPan(trackId, pan) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) track.pan = Math.max(-1, Math.min(1, pan));
    this.notify();
  }

  setBpm(bpm) {
    this.bpm = Math.max(40, Math.min(300, parseInt(bpm)));
    if (this.delayNode) {
      this.delayNode.delayTime.value = 60 / this.bpm * 0.5;
    }
    this.notify();
  }

  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
    this.notify();
  }

  toggleEffect(fx) {
    this.effects[fx] = !this.effects[fx];
    this.notify();
  }

  applyGenrePreset(genre) {
    this.selectedGenre = genre;
    const preset = GENRE_PRESETS[genre];
    if (preset) {
      this.tracks.forEach(track => {
        if (preset[track.id]) {
          track.steps = [...preset[track.id]];
        }
      });
    }
    this.notify();
  }

  async previewSample(name) {
    await this.initAudio();
    this.playSample(name, 0.7, 0);
  }

  clearPattern() {
    this.tracks.forEach(track => { track.steps = new Array(16).fill(0); });
    this.notify();
  }

  randomizePattern() {
    this.tracks.forEach(track => {
      if (track.type !== 'sampler') return;
      const density = track.id === 'kick' ? 0.25 : track.id === 'hihat' ? 0.6 : 0.3;
      track.steps = Array.from({ length: 16 }, () => Math.random() < density ? 1 : 0);
    });
    this.notify();
  }
}
