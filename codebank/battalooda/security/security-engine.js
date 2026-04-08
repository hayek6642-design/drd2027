/**
 * Battalooda Security Engine
 * Comprehensive liveness detection system combining passive and active analysis
 * 
 * Architecture:
 * 1. Passive Analysis (FREE) - Always running during recording
 * 2. Active Challenges (FREE) - Interactive verification
 * 3. Server Analysis (FUTURE) - Deep learning models
 * 4. Mobile Sensors (FUTURE) - Device-specific signals
 */

class BattaloodaSecurityEngine {
    constructor() {
        this.passiveAnalyzer = null;
        this.challengeSystem = null;
        this.mobileAnalyzer = null;
        this.isInitialized = false;
        
        this.securityConfig = {
            thresholds: {
                lowRisk: 0.7,      // Allow recording
                mediumRisk: 0.5,   // Require challenge
                highRisk: 0.3,     // Block recording
                criticalRisk: 0.1  // Flag account
            },
            modes: {
                standard: {
                    passiveOnly: false,
                    challengeProbability: 0.3,
                    serverAnalysis: false
                },
                highSecurity: {
                    passiveOnly: false,
                    challengeProbability: 0.8,
                    serverAnalysis: true
                },
                challengeOnly: {
                    passiveOnly: true,
                    challengeProbability: 1.0,
                    serverAnalysis: false
                }
            }
        };
        
        this.currentSession = null;
        this.analysisResults = [];
    }

    async initialize() {
        try {
            // Initialize passive analyzer
            this.passiveAnalyzer = new PassiveAudioAnalyzer();
            await this.passiveAnalyzer.initialize();
            
            // Initialize challenge system
            this.challengeSystem = new ActiveChallengeSystem();
            
            // Initialize mobile sensor analyzer
            this.mobileAnalyzer = new MobileSensorAnalyzer();
            await this.mobileAnalyzer.initializeSensors();
            
            this.isInitialized = true;
            console.log('Battalooda Security Engine initialized');
            
            return this;
        } catch (error) {
            console.error('Failed to initialize security engine:', error);
            throw error;
        }
    }

    async startSecureRecording(mode = 'standard') {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Create security session
        this.currentSession = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            mode: mode,
            config: this.securityConfig.modes[mode],
            results: [],
            challenges: [],
            flags: []
        };

        console.log(`Starting secure recording session: ${this.currentSession.sessionId}`);

        return this.currentSession;
    }

    async analyzeStream(mediaStream, duration = 5000) {
        if (!this.currentSession) {
            throw new Error('No active security session');
        }

        try {
            // Run passive analysis
            const passiveResult = await this.passiveAnalyzer.analyzeStream(mediaStream, duration);
            
            // Run mobile sensor analysis if available
            let mobileResult = null;
            if (this.mobileAnalyzer && this.mobileAnalyzer.isMobile) {
                this.mobileAnalyzer.startMonitoring();
                mobileResult = await this.mobileAnalyzer.analyzeAllSensors();
            }
            
            // Store results
            this.currentSession.results.push({
                type: 'passive',
                timestamp: Date.now(),
                result: passiveResult
            });
            
            if (mobileResult) {
                this.currentSession.results.push({
                    type: 'mobile',
                    timestamp: Date.now(),
                    result: mobileResult
                });
            }

            // Determine risk level
            const riskLevel = this.calculateRiskLevel(passiveResult, mobileResult);
            
            // Decide if challenge is needed
            const shouldChallenge = this.shouldIssueChallenge(riskLevel);
            
            let challengeResult = null;
            if (shouldChallenge) {
                challengeResult = await this.issueChallenge();
            }

            // Compile final security score
            const securityScore = this.compileSecurityScore(passiveResult, challengeResult, mobileResult);
            
            // Make decision
            const decision = this.makeDecision(securityScore, riskLevel);
            
            // Store final result
            const finalResult = {
                sessionId: this.currentSession.sessionId,
                timestamp: Date.now(),
                passiveAnalysis: passiveResult,
                mobileAnalysis: mobileResult,
                challengeResult: challengeResult,
                securityScore: securityScore,
                riskLevel: riskLevel,
                decision: decision,
                flags: this.currentSession.flags
            };

            this.currentSession.finalResult = finalResult;

            return finalResult;

        } catch (error) {
            console.error('Security analysis failed:', error);
            return this.createErrorResult(error);
        }
    }

    async issueChallenge() {
        try {
            // Determine challenge difficulty based on risk
            const riskLevel = this.getCurrentRiskLevel();
            let difficulty = 'medium';
            
            if (riskLevel === 'high') difficulty = 'hard';
            else if (riskLevel === 'low') difficulty = 'easy';

            // Issue challenge
            const challenge = await this.challengeSystem.issueChallenge(difficulty);
            
            // Display challenge UI
            const challengeUI = this.challengeSystem.displayChallenge(challenge);
            
            // Wait for user response (handled by recording system)
            this.currentSession.challenges.push({
                challenge: challenge,
                ui: challengeUI,
                timestamp: Date.now()
            });

            return {
                challenge: challenge,
                ui: challengeUI,
                status: 'issued'
            };

        } catch (error) {
            console.error('Challenge issuance failed:', error);
            return { error: error.message };
        }
    }

    async validateChallengeResponse(audioBlob, challengeMetadata) {
        if (!this.challengeSystem) {
            throw new Error('Challenge system not initialized');
        }

        try {
            const result = await this.challengeSystem.validateResponse(audioBlob, challengeMetadata);
            
            // Update session with challenge result
            const challengeIndex = this.currentSession.challenges.length - 1;
            if (challengeIndex >= 0) {
                this.currentSession.challenges[challengeIndex].result = result;
            }

            return result;

        } catch (error) {
            console.error('Challenge validation failed:', error);
            return { passed: false, error: error.message };
        }
    }

    calculateRiskLevel(passiveResult, mobileResult = null) {
        let score = passiveResult.livenessScore;
        const confidence = passiveResult.confidence;
        
        // Adjust score based on confidence
        let adjustedScore = score * confidence;

        // Apply mobile sensor adjustments if available
        if (mobileResult && mobileResult.overallScore) {
            // Mobile sensors can boost or reduce confidence
            const mobileAdjustment = (mobileResult.overallScore - 0.5) * 0.2;
            adjustedScore += mobileAdjustment;
            adjustedScore = Math.max(0, Math.min(1, adjustedScore)); // Clamp between 0 and 1
        }

        if (adjustedScore >= this.securityConfig.thresholds.lowRisk) {
            return 'low';
        } else if (adjustedScore >= this.securityConfig.thresholds.mediumRisk) {
            return 'medium';
        } else if (adjustedScore >= this.securityConfig.thresholds.highRisk) {
            return 'high';
        } else {
            return 'critical';
        }
    }

    shouldIssueChallenge(riskLevel) {
        if (!this.currentSession || !this.currentSession.config) {
            return false;
        }

        const config = this.currentSession.config;
        
        // If passive-only mode, never challenge
        if (config.passiveOnly) {
            return false;
        }

        // Determine probability based on risk level
        let probability = config.challengeProbability;
        
        switch (riskLevel) {
            case 'critical':
                probability = 1.0;
                break;
            case 'high':
                probability = 0.9;
                break;
            case 'medium':
                probability = 0.5;
                break;
            case 'low':
                probability = 0.1;
                break;
        }

        return Math.random() < probability;
    }

    compileSecurityScore(passiveResult, challengeResult, mobileResult = null) {
        let totalScore = 0;
        let totalWeight = 0;

        // Passive analysis weight: 0.5
        if (passiveResult && typeof passiveResult.livenessScore === 'number') {
            totalScore += passiveResult.livenessScore * 0.5;
            totalWeight += 0.5;
        }

        // Challenge result weight: 0.3
        if (challengeResult && typeof challengeResult.passed === 'boolean') {
            const challengeScore = challengeResult.passed ? 0.9 : 0.2;
            totalScore += challengeScore * 0.3;
            totalWeight += 0.3;
        }

        // Mobile sensor weight: 0.2
        if (mobileResult && typeof mobileResult.overallScore === 'number') {
            totalScore += mobileResult.overallScore * 0.2;
            totalWeight += 0.2;
        }

        // Server analysis weight: 0.2 (future implementation)
        // if (serverResult && typeof serverResult.confidence === 'number') {
        //     totalScore += serverResult.confidence * 0.2;
        //     totalWeight += 0.2;
        // }

        return totalWeight > 0 ? totalScore / totalWeight : 0.5;
    }

    makeDecision(securityScore, riskLevel) {
        const config = this.currentSession?.config || this.securityConfig.modes.standard;
        
        if (securityScore >= this.securityConfig.thresholds.lowRisk) {
            return {
                action: 'allow',
                message: 'تسجيل مقبول',
                allowRecording: true
            };
        } else if (securityScore >= this.securityConfig.thresholds.mediumRisk) {
            return {
                action: 'challenge_required',
                message: 'يُرجى إكمال التحدي للتحقق',
                allowRecording: false,
                requireChallenge: true
            };
        } else if (securityScore >= this.securityConfig.thresholds.highRisk) {
            return {
                action: 'block',
                message: 'تم رفض التسجيل بسبب نشاط مشبوه',
                allowRecording: false,
                flagAccount: true
            };
        } else {
            return {
                action: 'critical_block',
                message: 'تم اكتشاف محاولة تزوير صوتية',
                allowRecording: false,
                flagAccount: true,
                reportSuspicious: true
            };
        }
    }

    getCurrentRiskLevel() {
        if (!this.currentSession || this.currentSession.results.length === 0) {
            return 'medium';
        }

        const latestResult = this.currentSession.results[this.currentSession.results.length - 1];
        return this.calculateRiskLevel(latestResult.result);
    }

    generateSessionId() {
        return 'sec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 🛡️ Access Control for Talent Studio
    async verifyTalentStudioAccess() {
        if (!this.challengeSystem) {
            await this.initialize();
        }
        
        // Use the challenge system to verify permissions
        return this.challengeSystem.verify({
            component: 'talent-studio',
            permissions: ['audio-access', 'storage-write', 'export']
        });
    }

    createErrorResult(error) {
        return {
            sessionId: this.currentSession?.sessionId || 'unknown',
            timestamp: Date.now(),
            error: error.message,
            decision: {
                action: 'error',
                message: 'فشل التحقق الأمني',
                allowRecording: false
            },
            flags: ['ANALYSIS_ERROR']
        };
    }

    // Mobile sensor integration (future)
    async integrateMobileSensors() {
        if (!('DeviceMotionEvent' in window)) {
            console.warn('Device motion sensors not available');
            return null;
        }

        return new Promise((resolve) => {
            const sensorData = {
                accelerometer: [],
                gyroscope: [],
                timestamp: Date.now()
            };

            const handler = (event) => {
                sensorData.accelerometer.push({
                    x: event.acceleration.x,
                    y: event.acceleration.y,
                    z: event.acceleration.z,
                    time: Date.now()
                });

                if (sensorData.accelerometer.length >= 10) {
                    window.removeEventListener('devicemotion', handler);
                    resolve(sensorData);
                }
            };

            window.addEventListener('devicemotion', handler);
            
            // Timeout after 2 seconds
            setTimeout(() => {
                window.removeEventListener('devicemotion', handler);
                resolve(sensorData);
            }, 2000);
        });
    }

    // Server analysis integration (future)
    async sendToServerAnalysis(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('tier', 'free'); // or 'standard'/'premium'

            const response = await fetch('/api/security/analyze', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Server analysis failed');
            }
        } catch (error) {
            console.error('Server analysis error:', error);
            return { error: error.message };
        }
    }

    // Cleanup session
    endSession() {
        if (this.passiveAnalyzer) {
            this.passiveAnalyzer.stop();
        }
        
        // Remove any active challenge UI
        if (this.currentSession && this.currentSession.challenges) {
            this.currentSession.challenges.forEach(challenge => {
                if (challenge.ui && challenge.ui.parentNode) {
                    challenge.ui.parentNode.removeChild(challenge.ui);
                }
            });
        }

        this.currentSession = null;
        console.log('Security session ended');
    }

    // Get session summary
    getSessionSummary() {
        if (!this.currentSession) {
            return { error: 'No active session' };
        }

        return {
            sessionId: this.currentSession.sessionId,
            duration: Date.now() - this.currentSession.startTime,
            mode: this.currentSession.mode,
            totalResults: this.currentSession.results.length,
            totalChallenges: this.currentSession.challenges.length,
            finalResult: this.currentSession.finalResult,
            flags: this.currentSession.flags
        };
    }

    // Utility: Check if user should be flagged
    shouldFlagUser(securityResult) {
        const flags = securityResult.flags || [];
        
        // Check for critical security issues
        const criticalFlags = [
            'LOW_VARIATION_DETECTED',
            'POSSIBLE_COMPRESSION_ARTIFACTS',
            'IRREGULAR_HARMONIC_STRUCTURE',
            'UNIFORM_NOISE_FLOOR',
            'MECHANICAL_RHYTHM_DETECTED'
        ];

        const criticalCount = flags.filter(flag => criticalFlags.includes(flag)).length;
        
        return {
            shouldFlag: criticalCount >= 2,
            severity: criticalCount >= 3 ? 'high' : criticalCount >= 1 ? 'medium' : 'low',
            flags: flags
        };
    }
}

// Export for use in Battalooda
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BattaloodaSecurityEngine };
} else {
    window.BattaloodaSecurityEngine = BattaloodaSecurityEngine;
}