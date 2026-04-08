/**
 * Battalooda Studio - Lightweight Web Audio DAW
 * Simplified Fruity Loops / CapCut style sequencer
 */

class BattaloodaStudio {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.8; // Master volume
        this.masterGain.connect(this.audioContext.destination);
        
        this.tracks = [
            { id: 'vocal', type: 'audio', buffer: null, muted: false, volume: 0.8, pan: 0 }, // User voice
            { id: 'drum1', type: 'sampler', steps: new Array(16).fill(false), sample: 'kick', volume: 0.6, pan: -0.5 },
            { id: 'drum2', type: 'sampler', steps: new Array(16).fill(false), sample: 'snare', volume: 0.6, pan: 0.5 },
            { id: 'bass', type: 'loop', buffer: null, muted: false, volume: 0.5, pan: 0 }
        ];
        
        this.bpm = 120;
        this.isPlaying = false;
        this.currentStep = 0;
        this.stepInterval = null;
        this.loopDuration = 8; // seconds
        
        this.samples = {}; // Loaded audio buffers
        this.effects = {
            reverb: false,
            delay: false,
            compressor: true // Always on for consistency
        };
        
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        this.compressor.connect(this.masterGain);
        
        this.reverbConvolver = null;
        this.delayNode = null;
        
        this.onExport = null;
        this.vocalBlob = null;
    }

    // Initialize with user's recorded voice
    async loadVocalTrack(blob) {
        this.vocalBlob = blob;
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.tracks[0].buffer = audioBuffer;
        this.drawWaveform('vocal', audioBuffer);
    }

    // Simple 16-step sequencer (like TR-808)
    async playStep() {
        const stepTime = 60 / this.bpm / 4; // 16th notes
        
        this.tracks.forEach((track, index) => {
            if (track.muted) return;
            
            if (track.type === 'sampler' && track.steps[this.currentStep]) {
                this.playSample(track.sample, track.volume, track.pan);
            }
            
            if (track.type === 'loop' && this.currentStep === 0 && track.buffer) {
                this.playLoop(track);
            }
        });
        
        // Play vocal track continuously
        if (this.tracks[0].buffer && !this.tracks[0].muted) {
            this.playVocal();
        }
        
        this.currentStep = (this.currentStep + 1) % 16;
        this.highlightStep(this.currentStep);
    }

    playSample(sampleName, volume, pan = 0) {
        if (!this.samples[sampleName]) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.samples[sampleName];
        
        const gain = this.audioContext.createGain();
        gain.gain.value = volume;
        
        // Panning
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;
        
        // Effects chain
        let currentNode = source;
        
        if (this.effects.reverb && this.reverbConvolver) {
            currentNode.connect(this.reverbConvolver);
            currentNode = this.reverbConvolver;
        }
        
        if (this.effects.delay && this.delayNode) {
            currentNode.connect(this.delayNode);
            currentNode = this.delayNode;
        }
        
        currentNode.connect(panner).connect(gain).connect(this.compressor);
        
        source.start();
    }

    playLoop(track) {
        if (!track.buffer) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = track.buffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = this.loopDuration;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = track.volume;
        
        source.connect(gain).connect(this.compressor);
        source.start();
    }

    playVocal() {
        if (!this.tracks[0].buffer) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.tracks[0].buffer;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = this.tracks[0].volume;
        
        source.connect(gain).connect(this.compressor);
        source.start();
    }

    // Transport controls
    async play() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        if (!this.isPlaying) {
            this.isPlaying = true;
            const stepTime = 60 / this.bpm / 4;
            
            this.stepInterval = setInterval(() => {
                this.playStep();
            }, stepTime * 1000);
        }
    }

    stop() {
        if (this.isPlaying) {
            this.isPlaying = false;
            if (this.stepInterval) {
                clearInterval(this.stepInterval);
                this.stepInterval = null;
            }
            this.currentStep = 0;
            this.clearHighlights();
        }
    }

    // Effects management
    setReverb(enabled) {
        this.effects.reverb = enabled;
        if (enabled && !this.reverbConvolver) {
            this.createReverb();
        }
    }

    setDelay(enabled) {
        this.effects.delay = enabled;
        if (enabled && !this.delayNode) {
            this.createDelay();
        }
    }

    createReverb() {
        this.reverbConvolver = this.audioContext.createConvolver();
        
        // Create simple impulse response
        const impulseLength = this.audioContext.sampleRate * 0.5; // 0.5 second reverb
        const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate);
        
        const leftChannel = impulse.getChannelData(0);
        const rightChannel = impulse.getChannelData(1);
        
        for (let i = 0; i < impulseLength; i++) {
            leftChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
            rightChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
        }
        
        this.reverbConvolver.buffer = impulse;
    }

    createDelay() {
        this.delayNode = this.audioContext.createDelay(1.0); // 1 second max delay
        this.delayNode.delayTime.value = 0.25; // 250ms delay
        
        const feedback = this.audioContext.createGain();
        feedback.gain.value = 0.3; // 30% feedback
        
        this.delayNode.connect(feedback);
        feedback.connect(this.delayNode);
        this.delayNode.connect(this.compressor);
    }

    // Export final mix
    async exportMix() {
        if (!this.vocalBlob) return null;
        
        // For now, just return the vocal with basic processing
        // In a full implementation, this would mix all tracks
        return this.vocalBlob;
    }

    // UI helpers
    drawWaveform(trackId, buffer) {
        const canvas = document.getElementById(`waveform-${trackId}`);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;
        
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.moveTo(0, amp);
        
        for (let i = 0; i < canvas.width; i++) {
            const x = i;
            const val = data[i * step] || 0;
            const y = amp + (val * amp);
            ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    highlightStep(step) {
        // Visual feedback for current step
        const steps = document.querySelectorAll('.step');
        steps.forEach((el, index) => {
            el.classList.remove('current');
            if (index === step) {
                el.classList.add('current');
            }
        });
    }

    clearHighlights() {
        const steps = document.querySelectorAll('.step');
        steps.forEach(el => el.classList.remove('current'));
    }

    // Load samples
    async loadSamples() {
        const sampleUrls = {
            'kick': '/codebank/battalooda/assets/samples/drums/kick.wav',
            'snare': '/codebank/battalooda/assets/samples/drums/snare.wav',
            'hihat': '/codebank/battalooda/assets/samples/drums/hihat.wav'
        };

        for (const [name, url] of Object.entries(sampleUrls)) {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.samples[name] = audioBuffer;
            } catch (error) {
                console.warn(`Failed to load sample: ${name}`, error);
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BattaloodaStudio };
}