/**
 * Karaoke Audio Engine
 * Handles audio recording, mixing, and playback for Battalooda
 */

class KaraokeAudioEngine {
    constructor() {
        this.audioContext = null;
        this.vocalGain = null;
        this.musicGain = null;
        this.destination = null;
        this.mediaRecorder = null;
        this.recordingChunks = [];
        this.vocalStream = null;
        this.musicElement = null;
        this.musicSource = null;
        this.vocalSource = null;
        this.isRecording = false;
        
        this.initAudioContext();
    }

    async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Web Audio API not supported:', error);
            throw new Error('Web Audio API not supported');
        }
    }

    async startRecording(vocalStream) {
        if (!this.audioContext) {
            await this.initAudioContext();
        }

        // Create media stream destination for recording
        this.destination = this.audioContext.createMediaStreamDestination();
        
        // Connect microphone
        this.vocalSource = this.audioContext.createMediaStreamSource(vocalStream);
        this.vocalGain = this.audioContext.createGain();
        this.vocalGain.gain.value = 0.8; // Default vocal level
        this.vocalSource.connect(this.vocalGain).connect(this.destination);
        
        // Create MediaRecorder
        this.mediaRecorder = new MediaRecorder(this.destination.stream);
        this.setupMediaRecorder();
        
        // Start recording
        this.mediaRecorder.start();
        this.isRecording = true;
        
        return this.mediaRecorder;
    }

    async startMixedRecording(vocalStream, musicUrl) {
        if (!this.audioContext) {
            await this.initAudioContext();
        }

        // Create media stream destination for recording
        this.destination = this.audioContext.createMediaStreamDestination();
        
        // Connect microphone
        this.vocalSource = this.audioContext.createMediaStreamSource(vocalStream);
        this.vocalGain = this.audioContext.createGain();
        this.vocalGain.gain.value = 0.8; // Default vocal level
        this.vocalSource.connect(this.vocalGain).connect(this.destination);
        
        // Connect music
        this.musicElement = new Audio(musicUrl);
        this.musicElement.crossOrigin = 'anonymous';
        this.musicElement.loop = true; // Loop music during recording
        
        this.musicSource = this.audioContext.createMediaElementSource(this.musicElement);
        this.musicGain = this.audioContext.createGain();
        this.musicGain.gain.value = 0.3; // Default music level
        
        // Connect music to destination (for recording)
        this.musicSource.connect(this.musicGain).connect(this.destination);
        
        // Connect music to audio context destination (for monitoring)
        this.musicSource.connect(this.audioContext.destination);
        
        // Start music playback
        try {
            await this.musicElement.play();
        } catch (error) {
            console.warn('Music playback failed:', error);
        }
        
        // Create MediaRecorder
        this.mediaRecorder = new MediaRecorder(this.destination.stream);
        this.setupMediaRecorder();
        
        // Start recording
        this.mediaRecorder.start();
        this.isRecording = true;
        
        return this.mediaRecorder;
    }

    setupMediaRecorder() {
        this.recordingChunks = [];
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.recordingChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.isRecording = false;
        };
    }

    adjustMix(vocalLevel, musicLevel) {
        if (this.vocalGain) {
            this.vocalGain.gain.value = vocalLevel;
        }
        
        if (this.musicGain) {
            this.musicGain.gain.value = musicLevel;
        }
    }

    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return null;
        }

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordingChunks, { type: 'audio/webm' });
                this.cleanup();
                resolve(blob);
            };
            
            this.mediaRecorder.stop();
        });
    }

    // Store last recording for studio use
    async stopRecordingWithStorage() {
        const blob = await this.stopRecording();
        if (blob && window.battaloodaApp) {
            window.battaloodaApp.lastRecording = blob;
        }
        return blob;
    }

    cleanup() {
        // Stop music playback
        if (this.musicElement) {
            this.musicElement.pause();
            this.musicElement.src = '';
        }
        
        // Disconnect audio nodes
        if (this.vocalSource) {
            this.vocalSource.disconnect();
        }
        
        if (this.musicSource) {
            this.musicSource.disconnect();
        }
        
        if (this.vocalGain) {
            this.vocalGain.disconnect();
        }
        
        if (this.musicGain) {
            this.musicGain.disconnect();
        }
        
        if (this.destination) {
            this.destination.disconnect();
        }
        
        // Close audio context if no longer needed
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.mediaRecorder = null;
        this.isRecording = false;
    }

    // Audio visualization utilities
    createVisualizer(canvas, stream) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvasCtx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const draw = () => {
            requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i];

                canvasCtx.fillStyle = `rgb(${barHeight + 100},50,50)`;
                canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

                x += barWidth + 1;
            }
        };

        draw();
        
        return {
            stop: () => {
                source.disconnect();
                analyser.disconnect();
            }
        };
    }

    // Preview functionality
    async createPreviewPlayer(blob) {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        return {
            play: () => audio.play(),
            pause: () => audio.pause(),
            stop: () => {
                audio.pause();
                audio.currentTime = 0;
            },
            setVolume: (volume) => {
                audio.volume = Math.max(0, Math.min(1, volume));
            },
            onEnded: (callback) => {
                audio.onended = callback;
            },
            destroy: () => {
                audio.pause();
                audio.src = '';
                URL.revokeObjectURL(audioUrl);
            }
        };
    }

    // Audio level detection
    async getAudioLevel(stream) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        return () => {
            analyser.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            
            return sum / bufferLength;
        };
    }

    // Silence detection
    async detectSilence(stream, threshold = 0.1, callback) {
        const getLevel = await this.getAudioLevel(stream);
        
        const checkSilence = () => {
            const level = getLevel();
            const isSilent = level < threshold * 255;
            
            if (callback) {
                callback(isSilent, level);
            }
            
            if (this.isRecording) {
                requestAnimationFrame(checkSilence);
            }
        };
        
        checkSilence();
    }

    // Audio effects
    applyReverb(stream, reverbTime = 0.5) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const source = this.audioContext.createMediaStreamSource(stream);
        const convolver = this.audioContext.createConvolver();
        const gainNode = this.audioContext.createGain();
        
        // Create impulse response for reverb
        const impulseLength = this.audioContext.sampleRate * reverbTime;
        const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate);
        
        const leftChannel = impulse.getChannelData(0);
        const rightChannel = impulse.getChannelData(1);
        
        for (let i = 0; i < impulseLength; i++) {
            leftChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
            rightChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
        }
        
        convolver.buffer = impulse;
        
        source.connect(convolver);
        convolver.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        return {
            setWetLevel: (wet) => {
                gainNode.gain.value = wet;
            },
            disconnect: () => {
                source.disconnect();
                convolver.disconnect();
                gainNode.disconnect();
            }
        };
    }

    // Audio normalization
    normalizeAudio(stream) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const source = this.audioContext.createMediaStreamSource(stream);
        const compressor = this.audioContext.createDynamicsCompressor();
        
        // Compressor settings for normalization
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        
        source.connect(compressor);
        compressor.connect(this.audioContext.destination);
        
        return {
            disconnect: () => {
                source.disconnect();
                compressor.disconnect();
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KaraokeAudioEngine };
}