/**
 * Active Challenge System
 * Interactive challenges that are hard to spoof with pre-recorded audio
 * 
 * Features:
 * - Random number challenge (speech recognition)
 * - Random phrase challenge (Arabic phrases)
 * - Clap detection (transient analysis)
 * - Hum pattern (pitch detection)
 * - Breathing challenge (amplitude envelope)
 * - Reaction time (delayed response)
 */

class ActiveChallengeSystem {
    constructor() {
        this.challenges = this.initializeChallenges();
        this.currentChallenge = null;
        this.responseWindow = null;
        this.isListening = false;
        
        this.challengeConfig = {
            maxDuration: 10000, // 10 seconds to respond
            speechTimeout: 5000, // 5 seconds for speech challenges
            beepDelay: 2000, // 2 seconds delay for reaction challenge
            animationDuration: 3000 // 3 seconds for visual animations
        };
    }

    initializeChallenges() {
        return [
            {
                id: 'random_number',
                type: 'speech',
                difficulty: 'easy',
                generate: () => {
                    const num = Math.floor(Math.random() * 900) + 100; // 100-999
                    return {
                        prompt: `قل الرقم: ${num.toLocaleString('ar-SA')}`,
                        expected: num.toString(),
                        tolerance: 'fuzzy' // Allow similar sounding numbers
                    };
                },
                validate: (transcript, expected) => {
                    const numbers = transcript.match(/\d+/g);
                    return numbers && numbers.some(n => 
                        parseInt(n) === parseInt(expected) || 
                        Math.abs(parseInt(n) - parseInt(expected)) < 10
                    );
                }
            },
            {
                id: 'random_phrase',
                type: 'speech',
                difficulty: 'medium',
                phrases: [
                    { text: 'بطلودة الفين ستة وعشرين', expected: ['بطلودة', '2026', 'ستة', 'عشرين'] },
                    { text: 'صوتي أمانة', expected: ['صوتي', 'أمانة'] },
                    { text: 'موهبتي حقيقية', expected: ['موهبتي', 'حقيقية'] },
                    { text: 'أغني من قلبي', expected: ['أغني', 'قلبي'] },
                    { text: 'بطلودة وطن المواهب', expected: ['بطلودة', 'وطن', 'مواهب'] },
                    { text: 'تسجيل صوتي حقيقي', expected: ['تسجيل', 'صوتي', 'حقيقي'] },
                    { text: 'أنا أغني بملكي', expected: ['أنا', 'أغني', 'بملكي'] },
                    { text: 'صوتي من القلب', expected: ['صوتي', 'من', 'القلب'] }
                ],
                generate: function() {
                    const phrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];
                    return {
                        prompt: `قل العبارة: "${phrase.text}"`,
                        expected: phrase.expected,
                        displayText: phrase.text
                    };
                },
                validate: (transcript, expectedWords) => {
                    const normalized = transcript.toLowerCase()
                        .replace(/[.,!?]/g, '')
                        .split(/\s+/);
                    
                    const matches = expectedWords.filter(word => 
                        normalized.some(n => 
                            n.includes(word) || 
                            this.levenshteinDistance(n, word) <= 2
                        )
                    );
                    
                    return matches.length >= expectedWords.length * 0.7;
                }
            },
            {
                id: 'clap_detection',
                type: 'action',
                difficulty: 'medium',
                generate: () => ({
                    prompt: 'صفق بيديك مرة واحدة الآن',
                    action: 'clap',
                    detectionMethod: 'transient_detection'
                }),
                validate: async (audioBuffer) => {
                    // Detect sharp transient (clap) in audio
                    const data = audioBuffer.getChannelData(0);
                    const sampleRate = audioBuffer.sampleRate;
                    
                    // Look for sharp amplitude spike (clap signature)
                    const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
                    let clapDetected = false;
                    let clapTime = null;
                    
                    for (let i = 0; i < data.length - windowSize; i += windowSize / 2) {
                        const window = data.slice(i, i + windowSize);
                        const rms = Math.sqrt(window.reduce((sum, val) => sum + val * val, 0) / window.length);
                        
                        // Check for sudden spike
                        if (rms > 0.3) { // Threshold for clap
                            // Verify it's transient (short duration)
                            const attackTime = this.findAttackTime(data, i, sampleRate);
                            if (attackTime < 0.05) { // Less than 50ms attack
                                clapDetected = true;
                                clapTime = i / sampleRate;
                                break;
                            }
                        }
                    }
                    
                    return {
                        success: clapDetected,
                        details: { clapTime, confidence: clapDetected ? 0.9 : 0 }
                    };
                }
            },
            {
                id: 'hum_pattern',
                type: 'musical',
                difficulty: 'hard',
                generate: () => {
                    const notes = ['دو', 'ري', 'مي', 'فا', 'صول', 'لا', 'سي'];
                    const pattern = [];
                    for (let i = 0; i < 3; i++) {
                        pattern.push(notes[Math.floor(Math.random() * notes.length)]);
                    }
                    return {
                        prompt: `غنِّ هذه النغمات بالترتيب: ${pattern.join(' - ')}`,
                        expectedPattern: pattern,
                        tolerance: 'pitch_based'
                    };
                },
                validate: async (audioBuffer, expectedPattern) => {
                    // Use pitch detection (simplified)
                    const pitches = await this.extractPitches(audioBuffer);
                    // Check if detected pitches match expected pattern
                    const matchScore = this.comparePitchPatterns(pitches, expectedPattern);
                    return matchScore > 0.6;
                }
            },
            {
                id: 'breathing_challenge',
                type: 'physiological',
                difficulty: 'medium',
                generate: () => ({
                    prompt: 'خذ نفساً عميقاً وقم بالزفير ببطء لمدة 5 ثوانٍ',
                    action: 'exhale',
                    duration: 5000,
                    detectionMethod: 'amplitude_envelope'
                }),
                validate: async (audioBuffer) => {
                    // Analyze breathing pattern
                    const data = audioBuffer.getChannelData(0);
                    const sampleRate = audioBuffer.sampleRate;
                    
                    // Should see: silence -> inhale (short) -> exhale (long, decreasing)
                    const envelope = this.calculateEnvelope(data, sampleRate);
                    
                    // Check for natural breathing pattern
                    const hasInhale = envelope.some((e, i) => 
                        i < envelope.length * 0.2 && e.amplitude > 0.1
                    );
                    const hasLongExhale = envelope.slice(envelope.length * 0.3)
                        .every(e => e.amplitude > 0.05 && e.amplitude < 0.3);
                    
                    return hasInhale && hasLongExhale;
                }
            },
            {
                id: 'random_delay',
                type: 'reaction',
                difficulty: 'hard',
                generate: () => {
                    const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
                    return {
                        prompt: `انتظر الصفارة، ثم قل "جاهز" فوراً`,
                        beepDelay: delay,
                        expectedResponseTime: { min: 0.3, max: 1.5 }, // seconds after beep
                        detectionMethod: 'reaction_time'
                    };
                },
                validate: async (audioBuffer, beepTime, expectedWindow) => {
                    // Detect when user actually spoke after the beep
                    const data = audioBuffer.getChannelData(0);
                    const sampleRate = audioBuffer.sampleRate;
                    
                    // Find first significant audio after beep
                    const startSample = Math.floor(beepTime * sampleRate);
                    let responseTime = null;
                    
                    for (let i = startSample; i < data.length; i += 1024) {
                        const window = data.slice(i, Math.min(i + 1024, data.length));
                        const rms = Math.sqrt(window.reduce((sum, val) => sum + val * val, 0) / window.length);
                        
                        if (rms > 0.1) {
                            responseTime = (i - startSample) / sampleRate;
                            break;
                        }
                    }
                    
                    if (!responseTime) return false;
                    
                    // Human reaction time is 0.3-1.5 seconds
                    // Too fast = pre-recorded and triggered
                    // Too slow = not paying attention
                    return responseTime >= expectedWindow.min && responseTime <= expectedWindow.max;
                }
            }
        ];
    }

    async issueChallenge(preferredDifficulty = null) {
        // Filter by difficulty if specified
        let available = this.challenges;
        if (preferredDifficulty) {
            available = this.challenges.filter(c => c.difficulty === preferredDifficulty);
        }

        // Weight towards medium difficulty
        const weights = available.map(c => {
            if (c.difficulty === 'medium') return 2;
            if (c.difficulty === 'easy') return 1;
            return 1;
        });

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        let selectedIndex = 0;
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                selectedIndex = i;
                break;
            }
        }

        this.currentChallenge = available[selectedIndex];
        const challengeInstance = this.currentChallenge.generate();

        return {
            challengeId: this.currentChallenge.id,
            type: this.currentChallenge.type,
            difficulty: this.currentChallenge.difficulty,
            prompt: challengeInstance.prompt,
            metadata: challengeInstance,
            maxDuration: this.challengeConfig.maxDuration,
            instructions: this.getVisualInstructions(this.currentChallenge.id)
        };
    }

    getVisualInstructions(challengeId) {
        const instructions = {
            'random_number': {
                icon: '🔢',
                animation: 'pulse',
                text: 'تحدث بوضوح',
                color: '#3498db'
            },
            'random_phrase': {
                icon: '🗣️',
                animation: 'wave',
                text: 'نطق صحيح',
                color: '#2ecc71'
            },
            'clap_detection': {
                icon: '👏',
                animation: 'clap_demo',
                text: 'صفق مرة واحدة',
                color: '#f1c40f'
            },
            'hum_pattern': {
                icon: '🎵',
                animation: 'notes',
                text: 'غنِّ النغمات',
                color: '#9b59b6'
            },
            'breathing_challenge': {
                icon: '🫁',
                animation: 'breathe',
                text: 'تنفس عميق',
                color: '#e74c3c'
            },
            'random_delay': {
                icon: '⏱️',
                animation: 'wait',
                text: 'انتظر ثم رد',
                color: '#f39c12'
            }
        };
        return instructions[challengeId];
    }

    async validateResponse(audioBlob, challengeMetadata) {
        if (!this.currentChallenge) {
            throw new Error('No active challenge');
        }

        // Convert blob to AudioBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        let validationResult;

        // Route to appropriate validator
        switch (this.currentChallenge.type) {
            case 'speech':
                // Use Web Speech API for transcription
                const transcript = await this.transcribeAudio(audioBlob);
                validationResult = this.currentChallenge.validate(
                    transcript, 
                    challengeMetadata.expected
                );
                break;

            case 'action':
            case 'musical':
            case 'physiological':
            case 'reaction':
                // Audio analysis based validation
                validationResult = await this.currentChallenge.validate(
                    audioBuffer,
                    challengeMetadata.beepTime,
                    challengeMetadata.expectedResponseTime
                );
                break;

            default:
                throw new Error('Unknown challenge type');
        }

        return {
            challengeId: this.currentChallenge.id,
            passed: validationResult === true || validationResult.success === true,
            details: typeof validationResult === 'object' ? validationResult : {},
            timestamp: Date.now()
        };
    }

    async transcribeAudio(audioBlob) {
        return new Promise((resolve, reject) => {
            // Use Web Speech API if available
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                // Fallback: send to server for transcription
                resolve(this.serverTranscription(audioBlob));
                return;
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.lang = 'ar-SA';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.maxAlternatives = 3;

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                resolve(transcript);
            };

            recognition.onerror = (event) => {
                reject(new Error(`Speech recognition error: ${event.error}`));
            };

            // Create audio element to play blob
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            // Start recognition and play audio
            recognition.start();
            audio.play();
        });
    }

    async serverTranscription(audioBlob) {
        // Fallback to server-side transcription
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        const response = await fetch('/api/security/transcribe', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        return data.transcript;
    }

    // 🛡️ Security Verification for Talent Studio
    async verify(data) {
        // Simple verification for the demo
        console.log('[Security] Verifying access for:', data.component);
        
        // Return true if authorized
        if (data.component === 'talent-studio' && data.permissions.includes('audio-access')) {
            return true;
        }
        
        return false;
    }

    // Utility: Levenshtein distance for fuzzy matching
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
        for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i-1) === str1.charAt(j-1)) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i-1][j-1] + 1,
                        matrix[i][j-1] + 1,
                        matrix[i-1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    // Utility: Find attack time for transient detection
    findAttackTime(data, startIndex, sampleRate) {
        const threshold = 0.5; // 50% of peak
        let peakValue = 0;
        let peakIndex = startIndex;
        
        // Find peak in next 1000 samples
        for (let i = startIndex; i < Math.min(startIndex + 1000, data.length); i++) {
            if (Math.abs(data[i]) > peakValue) {
                peakValue = Math.abs(data[i]);
                peakIndex = i;
            }
        }
        
        // Find when it crossed threshold before peak
        for (let i = peakIndex; i > startIndex; i--) {
            if (Math.abs(data[i]) < threshold * peakValue) {
                return (peakIndex - i) / sampleRate;
            }
        }
        
        return 0.1; // Default
    }

    // Utility: Calculate amplitude envelope
    calculateEnvelope(data, sampleRate, windowMs = 50) {
        const windowSamples = Math.floor(sampleRate * (windowMs / 1000));
        const envelope = [];
        
        for (let i = 0; i < data.length; i += windowSamples) {
            const window = data.slice(i, Math.min(i + windowSamples, data.length));
            const rms = Math.sqrt(window.reduce((sum, val) => sum + val * val, 0) / window.length);
            envelope.push({
                time: i / sampleRate,
                amplitude: rms
            });
        }
        
        return envelope;
    }

    // Utility: Extract pitches (simplified YIN algorithm)
    async extractPitches(audioBuffer) {
        // Simplified implementation - in production use Pitchfinder.js or similar
        const pitches = [];
        const sampleRate = audioBuffer.sampleRate;
        const buffer = audioBuffer.getChannelData(0);
        
        const frameSize = 2048;
        const hopSize = 512;
        
        for (let i = 0; i < buffer.length - frameSize; i += hopSize) {
            const frame = buffer.slice(i, i + frameSize);
            const pitch = this.yinPitchDetection(frame, sampleRate);
            if (pitch > 0) pitches.push(pitch);
        }
        
        return pitches;
    }

    yinPitchDetection(frame, sampleRate) {
        // Simplified YIN algorithm
        const threshold = 0.1;
        const tauMax = Math.floor(sampleRate / 50); // Min freq 50Hz
        
        let difference = new Array(tauMax).fill(0);
        
        for (let tau = 1; tau < tauMax; tau++) {
            for (let i = 0; i < frame.length - tau; i++) {
                difference[tau] += Math.pow(frame[i] - frame[i + tau], 2);
            }
        }
        
        // Cumulative mean normalized difference
        let cmndf = difference.map((val, idx) => {
            if (idx === 0) return 1;
            const sum = difference.slice(1, idx + 1).reduce((a, b) => a + b, 0);
            return val / (sum / idx);
        });
        
        // Find first minimum below threshold
        for (let tau = 2; tau < tauMax; tau++) {
            if (cmndf[tau] < threshold) {
                // Parabolic interpolation for better accuracy
                const betterTau = tau + (cmndf[tau-1] - cmndf[tau+1]) / 
                    (2 * (2 * cmndf[tau] - cmndf[tau-1] - cmndf[tau+1]));
                return sampleRate / betterTau;
            }
        }
        
        return -1; // No pitch found
    }

    comparePitchPatterns(detected, expected) {
        // Simplified comparison - map detected frequencies to note names
        const noteFrequencies = {
            'دو': 261.63, 'ري': 293.66, 'مي': 329.63,
            'فا': 349.23, 'صول': 392.00, 'لا': 440.00, 'سي': 493.88
        };
        
        // Convert detected to note names
        const detectedNotes = detected.map(freq => {
            // Find closest note
            let closest = null, minDiff = Infinity;
            for (const [note, noteFreq] of Object.entries(noteFrequencies)) {
                const diff = Math.abs(freq - noteFreq);
                if (diff < minDiff && diff < 50) { // Within 50Hz
                    minDiff = diff;
                    closest = note;
                }
            }
            return closest;
        }).filter(n => n !== null);

        // Compare sequences
        let matches = 0;
        for (let i = 0; i < Math.min(expected.length, detectedNotes.length); i++) {
            if (detectedNotes[i] === expected[i]) matches++;
        }

        return matches / expected.length;
    }

    // Display challenge UI
    displayChallenge(challenge) {
        const challengeUI = document.createElement('div');
        challengeUI.className = 'challenge-overlay';
        challengeUI.innerHTML = `
            <div class="challenge-card">
                <div class="challenge-icon">${challenge.instructions.icon}</div>
                <h3>${challenge.prompt}</h3>
                <div class="challenge-timer">
                    <div class="timer-bar"></div>
                    <span>${challenge.maxDuration / 1000} ثوانٍ</span>
                </div>
                <div class="challenge-hint">${challenge.instructions.text}</div>
            </div>
        `;
        
        document.body.appendChild(challengeUI);
        
        // Animate timer
        const timerBar = challengeUI.querySelector('.timer-bar');
        timerBar.style.animation = `shrink ${challenge.maxDuration}ms linear forwards`;
        
        // Auto-remove after duration
        setTimeout(() => {
            challengeUI.remove();
        }, challenge.maxDuration);

        return challengeUI;
    }

    // Play beep sound for reaction challenge
    async playBeep() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ActiveChallengeSystem };
} else {
    window.ActiveChallengeSystem = ActiveChallengeSystem;
}