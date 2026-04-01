/**
 * Passive Audio Analyzer
 * Detects synthetic audio characteristics without user interaction
 * 
 * Features:
 * - Spectral analysis for compression artifacts
 * - Harmonic structure analysis
 * - Temporal pattern detection
 * - Noise floor consistency analysis
 * - Natural variation detection
 */

class PassiveAudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.isAnalyzing = false;
        this.analysisInterval = null;
        
        this.features = {
            spectral: [],
            temporal: [],
            harmonic: []
        };
        
        this.analysisConfig = {
            fftSize: 4096,
            sampleInterval: 50, // 20 samples per second
            analysisDuration: 5000, // 5 seconds
            thresholds: {
                variation: 0.3,
                compression: 0.5,
                harmonics: 0.5,
                noise: 0.3,
                rhythm: 0.4
            }
        };
    }

    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.analysisConfig.fftSize;
            this.analyser.smoothingTimeConstant = 0.2;
            
            return this;
        } catch (error) {
            console.error('Failed to initialize audio analyzer:', error);
            throw new Error('Web Audio API not supported');
        }
    }

    async analyzeStream(mediaStream, duration = 5000) {
        if (!this.audioContext || !this.analyser) {
            await this.initialize();
        }

        const source = this.audioContext.createMediaStreamSource(mediaStream);
        source.connect(this.analyser);

        const startTime = Date.now();
        const samples = [];
        const sampleInterval = this.analysisConfig.sampleInterval;

        this.isAnalyzing = true;

        while (Date.now() - startTime < duration && this.isAnalyzing) {
            const sample = this.collectSample();
            samples.push(sample);
            await this.sleep(sampleInterval);
        }

        source.disconnect();
        this.isAnalyzing = false;

        return this.deepAnalysis(samples);
    }

    collectSample() {
        const freqData = new Float32Array(this.analyser.frequencyBinCount);
        const timeData = new Float32Array(this.analyser.fftSize);
        
        this.analyser.getFloatFrequencyData(freqData);
        this.analyser.getFloatTimeDomainData(timeData);

        return {
            timestamp: Date.now(),
            frequency: Array.from(freqData),
            waveform: Array.from(timeData),
            // Calculate instantaneous features
            rms: this.calculateRMS(timeData),
            spectralCentroid: this.calculateSpectralCentroid(freqData),
            zeroCrossingRate: this.calculateZCR(timeData),
            entropy: this.calculateSpectralEntropy(freqData)
        };
    }

    calculateRMS(waveform) {
        const sum = waveform.reduce((acc, val) => acc + val * val, 0);
        return Math.sqrt(sum / waveform.length);
    }

    calculateSpectralCentroid(frequencyData) {
        const nyquist = this.audioContext.sampleRate / 2;
        const binCount = frequencyData.length;
        
        let sum = 0, weightedSum = 0;
        for (let i = 0; i < binCount; i++) {
            const magnitude = Math.pow(10, frequencyData[i] / 20); // Convert from dB
            const frequency = (i / binCount) * nyquist;
            sum += magnitude;
            weightedSum += magnitude * frequency;
        }
        
        return sum > 0 ? weightedSum / sum : 0;
    }

    calculateZCR(waveform) {
        let crossings = 0;
        for (let i = 1; i < waveform.length; i++) {
            if ((waveform[i] >= 0) !== (waveform[i-1] >= 0)) {
                crossings++;
            }
        }
        return crossings / (waveform.length - 1);
    }

    calculateSpectralEntropy(frequencyData) {
        // Convert to linear scale and normalize
        const linear = frequencyData.map(f => Math.pow(10, f / 20));
        const sum = linear.reduce((a, b) => a + b, 0);
        const normalized = linear.map(v => v / sum);
        
        // Calculate Shannon entropy
        let entropy = 0;
        for (const p of normalized) {
            if (p > 0) entropy -= p * Math.log2(p);
        }
        
        return entropy;
    }

    deepAnalysis(samples) {
        const analysis = {
            // 1. Natural Variation Detection (Live voice varies constantly)
            variationScore: this.analyzeVariation(samples),
            
            // 2. Compression Artifacts Detection (MP3/AAC leave signatures)
            compressionArtifacts: this.detectCompressionArtifacts(samples),
            
            // 3. Harmonic Structure Analysis (Human voice has specific harmonics)
            harmonicStructure: this.analyzeHarmonics(samples),
            
            // 4. Noise Floor Consistency (Recorded audio has uniform noise)
            noiseConsistency: this.analyzeNoiseFloor(samples),
            
            // 5. Temporal Patterns (Breathing, pauses, speech rhythm)
            temporalPatterns: this.analyzeTemporalPatterns(samples)
        };

        // Calculate overall liveness score
        const weights = {
            variationScore: 0.25,
            compressionArtifacts: 0.20,
            harmonicStructure: 0.20,
            noiseConsistency: 0.20,
            temporalPatterns: 0.15
        };

        let totalScore = 0;
        let totalWeight = 0;

        for (const [key, weight] of Object.entries(weights)) {
            if (analysis[key] && typeof analysis[key].score === 'number') {
                totalScore += analysis[key].score * weight;
                totalWeight += weight;
            }
        }

        analysis.livenessScore = totalWeight > 0 ? totalScore / totalWeight : 0.5;
        analysis.isLive = analysis.livenessScore > 0.6;
        analysis.confidence = this.calculateConfidence(analysis);

        return analysis;
    }

    analyzeVariation(samples) {
        // Live voice has high variation in pitch, volume, and timbre
        const rmsValues = samples.map(s => s.rms);
        const centroidValues = samples.map(s => s.spectralCentroid);
        const zcrValues = samples.map(s => s.zeroCrossingRate);

        const rmsVariance = this.calculateVariance(rmsValues);
        const centroidVariance = this.calculateVariance(centroidValues);
        const zcrVariance = this.calculateVariance(zcrValues);

        // Synthetic voice tends to be too consistent
        const variationScore = Math.min(
            (rmsVariance * 100) + 
            (centroidVariance / 1000) + 
            (zcrVariance * 1000),
            1.0
        );

        return {
            score: variationScore,
            details: {
                rmsVariance,
                centroidVariance,
                zcrVariance
            },
            flags: variationScore < this.analysisConfig.thresholds.variation ? ['LOW_VARIATION_DETECTED'] : []
        };
    }

    detectCompressionArtifacts(samples) {
        // MP3 compression creates characteristic frequency gaps
        const highFreqEnergy = samples.map(s => {
            const highBins = s.frequency.slice(Math.floor(s.frequency.length * 0.7));
            return highBins.reduce((a, b) => a + b, 0) / highBins.length;
        });

        const midFreqEnergy = samples.map(s => {
            const midStart = Math.floor(s.frequency.length * 0.3);
            const midEnd = Math.floor(s.frequency.length * 0.7);
            const midBins = s.frequency.slice(midStart, midEnd);
            return midBins.reduce((a, b) => a + b, 0) / midBins.length;
        });

        // Compressed audio often has sharp cutoff at 16kHz (MP3) or strange mid-range
        const highFreqRatio = highFreqEnergy.map((h, i) => h / (midFreqEnergy[i] + 0.001));
        const avgRatio = highFreqRatio.reduce((a, b) => a + b, 0) / highFreqRatio.length;

        // Natural audio has gradual rolloff, compressed has sharp cutoff
        const compressionScore = avgRatio < 0.1 ? 0.2 : 0.8; // Low ratio = suspicious

        return {
            score: compressionScore,
            details: {
                highFreqAvg: highFreqEnergy.reduce((a,b) => a+b) / highFreqEnergy.length,
                midFreqAvg: midFreqEnergy.reduce((a,b) => a+b) / midFreqEnergy.length,
                ratio: avgRatio
            },
            flags: compressionScore < this.analysisConfig.thresholds.compression ? ['POSSIBLE_COMPRESSION_ARTIFACTS'] : []
        };
    }

    analyzeHarmonics(samples) {
        // Human voice has specific harmonic structure (F0, 2F0, 3F0, etc.)
        // TTS systems often have irregular harmonics or missing partials
        
        const harmonicScores = samples.map(sample => {
            const peaks = this.findPeaks(sample.frequency);
            if (peaks.length < 2) return 0;

            // Check if peaks are at harmonic intervals
            const fundamental = peaks[0].freq;
            let harmonicCount = 0;
            
            for (let i = 1; i < Math.min(peaks.length, 6); i++) {
                const ratio = peaks[i].freq / fundamental;
                const isHarmonic = Math.abs(ratio - Math.round(ratio)) < 0.05;
                if (isHarmonic) harmonicCount++;
            }

            return harmonicCount / 5; // Normalize to 0-1
        });

        const avgHarmonicScore = harmonicScores.reduce((a, b) => a + b, 0) / harmonicScores.length;
        
        return {
            score: avgHarmonicScore,
            details: {
                sampleCount: harmonicScores.length,
                validHarmonics: harmonicScores.filter(s => s > 0.6).length
            },
            flags: avgHarmonicScore < this.analysisConfig.thresholds.harmonics ? ['IRREGULAR_HARMONIC_STRUCTURE'] : []
        };
    }

    findPeaks(frequencyData) {
        const peaks = [];
        const threshold = -60; // dB threshold
        
        for (let i = 2; i < frequencyData.length - 2; i++) {
            const current = frequencyData[i];
            if (current > threshold && 
                current > frequencyData[i-1] && 
                current > frequencyData[i-2] &&
                current > frequencyData[i+1] && 
                current > frequencyData[i+2]) {
                
                // Interpolate for better frequency accuracy
                const alpha = frequencyData[i-1];
                const beta = frequencyData[i];
                const gamma = frequencyData[i+1];
                const p = 0.5 * (alpha - gamma) / (alpha - 2*beta + gamma);
                
                const binFreq = (this.audioContext.sampleRate / 2) / frequencyData.length;
                const freq = (i + p) * binFreq;
                
                peaks.push({ freq, magnitude: current });
            }
        }

        return peaks.sort((a, b) => b.magnitude - a.magnitude).slice(0, 10);
    }

    analyzeNoiseFloor(samples) {
        // In live recordings, noise varies with environment
        // In studio recordings, noise floor is constant
        
        const silenceWindows = [];
        let currentWindow = [];
        
        for (const sample of samples) {
            if (sample.rms < 0.01) { // Silence threshold
                currentWindow.push(sample.rms);
            } else {
                if (currentWindow.length > 5) {
                    silenceWindows.push([...currentWindow]);
                }
                currentWindow = [];
            }
        }

        if (silenceWindows.length === 0) {
            return { score: 0.5, details: { reason: 'NO_SILENCE_DETECTED' }, flags: [] };
        }

        const windowMeans = silenceWindows.map(w => w.reduce((a,b) => a+b) / w.length);
        const noiseVariance = this.calculateVariance(windowMeans);
        
        // Natural noise varies, synthetic noise is constant
        const naturalNoiseScore = Math.min(noiseVariance * 10000, 1.0);

        return {
            score: naturalNoiseScore,
            details: {
                silenceWindows: silenceWindows.length,
                noiseVariance,
                avgNoiseLevel: windowMeans.reduce((a,b) => a+b) / windowMeans.length
            },
            flags: naturalNoiseScore < this.analysisConfig.thresholds.noise ? ['UNIFORM_NOISE_FLOOR'] : []
        };
    }

    analyzeTemporalPatterns(samples) {
        // Analyze speech rhythm, breathing patterns, pauses
        const energyProfile = samples.map(s => s.rms);
        
        // Find speech segments (energy above threshold)
        const threshold = 0.05;
        const segments = [];
        let inSpeech = false;
        let segmentStart = 0;
        
        for (let i = 0; i < energyProfile.length; i++) {
            if (!inSpeech && energyProfile[i] > threshold) {
                inSpeech = true;
                segmentStart = i;
            } else if (inSpeech && energyProfile[i] < threshold) {
                inSpeech = false;
                segments.push({
                    start: segmentStart,
                    end: i,
                    duration: (i - segmentStart) * 50 // ms
                });
            }
        }

        // Natural speech has irregular segment lengths
        const durations = segments.map(s => s.duration);
        const durationVariance = this.calculateVariance(durations);
        const pausePattern = this.analyzePauses(segments);

        // TTS often has very consistent segment lengths
        const naturalRhythmScore = Math.min(durationVariance / 10000, 1.0);

        return {
            score: naturalRhythmScore,
            details: {
                segmentCount: segments.length,
                avgDuration: durations.reduce((a,b) => a+b) / durations.length,
                durationVariance,
                pausePattern
            },
            flags: naturalRhythmScore < this.analysisConfig.thresholds.rhythm ? ['MECHANICAL_RHYTHM_DETECTED'] : []
        };
    }

    analyzePauses(segments) {
        if (segments.length < 2) return { regularity: 0 };
        
        const pauses = [];
        for (let i = 1; i < segments.length; i++) {
            pauses.push(segments[i].start - segments[i-1].end);
        }

        const variance = this.calculateVariance(pauses);
        return {
            avgPause: pauses.reduce((a,b) => a+b) / pauses.length,
            variance,
            regularity: variance < 100 ? 'HIGH' : 'NORMAL' // ms variance
        };
    }

    calculateConfidence(analysis) {
        // More consistent results across different metrics = higher confidence
        const scores = [
            analysis.variationScore?.score,
            analysis.compressionArtifacts?.score,
            analysis.harmonicStructure?.score,
            analysis.noiseConsistency?.score,
            analysis.temporalPatterns?.score
        ].filter(s => typeof s === 'number');

        if (scores.length < 3) return 0.5;

        const variance = this.calculateVariance(scores);
        // Low variance across different detection methods = high confidence
        return Math.max(0.3, 1 - variance);
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        this.isAnalyzing = false;
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Export for use in Battalooda
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PassiveAudioAnalyzer };
} else {
    window.PassiveAudioAnalyzer = PassiveAudioAnalyzer;
}