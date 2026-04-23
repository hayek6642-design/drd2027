/**
 * Mobile Sensor Integration for Battalooda Security
 * Device-specific signals for enhanced liveness detection
 * 
 * Features:
 * - Accelerometer analysis during recording
 * - Proximity sensor verification
 * - Battery level patterns
 * - Screen state monitoring
 * - Audio route detection
 */

class MobileSensorAnalyzer {
    constructor() {
        this.isMobile = this.detectMobile();
        this.sensors = {
            accelerometer: null,
            proximity: null,
            battery: null,
            screen: null,
            audioRoute: null
        };
        
        this.sensorData = {
            accelerometer: [],
            proximity: [],
            battery: [],
            screen: [],
            timestamp: Date.now()
        };
        
        this.analysisConfig = {
            motionThreshold: 0.01, // Minimum acceleration change to detect movement
            proximityThreshold: 0.1, // Distance threshold for proximity sensor
            batteryPatternWindow: 30000, // 30 seconds for battery pattern analysis
            screenStateTimeout: 5000 // 5 seconds timeout for screen state
        };
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    async initializeSensors() {
        if (!this.isMobile) {
            console.warn('Mobile sensors not available on desktop');
            return false;
        }

        try {
            // Check for DeviceMotionEvent (accelerometer)
            if ('DeviceMotionEvent' in window) {
                this.sensors.accelerometer = true;
                console.log('Accelerometer available');
            }

            // Check for proximity sensor
            if ('ondeviceproximity' in window) {
                this.sensors.proximity = true;
                console.log('Proximity sensor available');
            }

            // Check for Battery API
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                this.sensors.battery = battery;
                console.log('Battery API available');
            }

            // Check for screen state
            if ('onvisibilitychange' in document) {
                this.sensors.screen = true;
                console.log('Screen state monitoring available');
            }

            // Check for audio route (Web Audio API)
            if ('AudioContext' in window || 'webkitAudioContext' in window) {
                this.sensors.audioRoute = true;
                console.log('Audio route detection available');
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize mobile sensors:', error);
            return false;
        }
    }

    startMonitoring() {
        if (!this.isMobile || !this.sensors.accelerometer) {
            return;
        }

        // Start accelerometer monitoring
        if (this.sensors.accelerometer) {
            window.addEventListener('devicemotion', this.handleAccelerometer.bind(this));
        }

        // Start proximity monitoring
        if (this.sensors.proximity) {
            window.addEventListener('deviceproximity', this.handleProximity.bind(this));
        }

        // Start battery monitoring
        if (this.sensors.battery) {
            this.startBatteryMonitoring();
        }

        // Start screen state monitoring
        if (this.sensors.screen) {
            document.addEventListener('visibilitychange', this.handleScreenChange.bind(this));
        }

        console.log('Mobile sensor monitoring started');
    }

    stopMonitoring() {
        // Stop all sensor monitoring
        window.removeEventListener('devicemotion', this.handleAccelerometer);
        window.removeEventListener('deviceproximity', this.handleProximity);
        document.removeEventListener('visibilitychange', this.handleScreenChange);
        
        if (this.batteryInterval) {
            clearInterval(this.batteryInterval);
        }

        console.log('Mobile sensor monitoring stopped');
    }

    handleAccelerometer(event) {
        const acceleration = event.accelerationIncludingGravity;
        const timestamp = Date.now();
        
        this.sensorData.accelerometer.push({
            x: acceleration.x,
            y: acceleration.y,
            z: acceleration.z,
            timestamp: timestamp,
            total: Math.sqrt(acceleration.x**2 + acceleration.y**2 + acceleration.z**2)
        });

        // Keep only last 100 samples
        if (this.sensorData.accelerometer.length > 100) {
            this.sensorData.accelerometer.shift();
        }
    }

    handleProximity(event) {
        this.sensorData.proximity.push({
            value: event.value,
            max: event.max,
            timestamp: Date.now()
        });

        // Keep only last 50 samples
        if (this.sensorData.proximity.length > 50) {
            this.sensorData.proximity.shift();
        }
    }

    handleScreenChange() {
        this.sensorData.screen.push({
            hidden: document.hidden,
            visibilityState: document.visibilityState,
            timestamp: Date.now()
        });

        // Keep only last 20 samples
        if (this.sensorData.screen.length > 20) {
            this.sensorData.screen.shift();
        }
    }

    startBatteryMonitoring() {
        if (!this.sensors.battery) return;

        this.batteryInterval = setInterval(() => {
            const battery = this.sensors.battery;
            this.sensorData.battery.push({
                level: battery.level,
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime,
                timestamp: Date.now()
            });

            // Keep only last 20 samples
            if (this.sensorData.battery.length > 20) {
                this.sensorData.battery.shift();
            }
        }, 1000);
    }

    async analyzeMotionPattern() {
        if (!this.sensorData.accelerometer.length) {
            return { score: 0.5, reason: 'NO_MOTION_DATA' };
        }

        const samples = this.sensorData.accelerometer;
        const variations = [];
        
        // Calculate variation between consecutive samples
        for (let i = 1; i < samples.length; i++) {
            const prev = samples[i-1];
            const curr = samples[i];
            
            const diff = Math.abs(curr.total - prev.total);
            variations.push(diff);
        }

        const avgVariation = variations.reduce((a, b) => a + b, 0) / variations.length;
        
        // Natural hand movement should show some variation
        const motionScore = Math.min(avgVariation * 100, 1.0);
        
        return {
            score: motionScore,
            details: {
                sampleCount: samples.length,
                avgVariation: avgVariation,
                maxVariation: Math.max(...variations),
                minVariation: Math.min(...variations)
            },
            flags: avgVariation < this.analysisConfig.motionThreshold ? ['LOW_MOTION_DETECTED'] : []
        };
    }

    analyzeProximityPattern() {
        if (!this.sensorData.proximity.length) {
            return { score: 0.5, reason: 'NO_PROXIMITY_DATA' };
        }

        const samples = this.sensorData.proximity;
        const nearCount = samples.filter(s => s.value < this.analysisConfig.proximityThreshold).length;
        const nearRatio = nearCount / samples.length;

        // Phone should be near face during voice recording
        const proximityScore = nearRatio > 0.3 ? 0.9 : 0.3;
        
        return {
            score: proximityScore,
            details: {
                sampleCount: samples.length,
                nearCount: nearCount,
                nearRatio: nearRatio,
                avgDistance: samples.reduce((sum, s) => sum + s.value, 0) / samples.length
            },
            flags: nearRatio < 0.1 ? ['PHONE_NOT_NEAR_FACE'] : []
        };
    }

    analyzeBatteryPattern() {
        if (!this.sensorData.battery.length) {
            return { score: 0.5, reason: 'NO_BATTERY_DATA' };
        }

        const samples = this.sensorData.battery;
        const charging = samples[samples.length - 1].charging;
        const level = samples[samples.length - 1].level;
        
        // Emulators often show specific battery patterns
        let batteryScore = 0.7; // Default score
        
        if (level === 1.0 && !charging) {
            batteryScore = 0.3; // Suspicious: always at 100% and not charging
        } else if (level < 0.2 && charging) {
            batteryScore = 0.8; // Normal: low battery and charging
        } else if (level > 0.8 && !charging) {
            batteryScore = 0.6; // Normal: high battery and not charging
        }

        return {
            score: batteryScore,
            details: {
                currentLevel: level,
                isCharging: charging,
                sampleCount: samples.length,
                chargingTime: samples[samples.length - 1].chargingTime,
                dischargingTime: samples[samples.length - 1].dischargingTime
            },
            flags: level === 1.0 && !charging ? ['EMULATOR_BATTERY_PATTERN'] : []
        };
    }

    analyzeScreenState() {
        if (!this.sensorData.screen.length) {
            return { score: 0.5, reason: 'NO_SCREEN_DATA' };
        }

        const samples = this.sensorData.screen;
        const visibleCount = samples.filter(s => !s.hidden).length;
        const visibleRatio = visibleCount / samples.length;

        // Screen should be ON during recording
        const screenScore = visibleRatio > 0.8 ? 0.9 : 0.4;
        
        return {
            score: screenScore,
            details: {
                sampleCount: samples.length,
                visibleCount: visibleCount,
                visibleRatio: visibleRatio,
                lastState: samples[samples.length - 1].visibilityState
            },
            flags: visibleRatio < 0.5 ? ['SCREEN_OFF_DURING_RECORDING'] : []
        };
    }

    async analyzeAudioRoute() {
        if (!this.sensors.audioRoute) {
            return { score: 0.5, reason: 'NO_AUDIO_ROUTE_DATA' };
        }

        try {
            // Create audio context to detect available devices
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Check for available audio devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(d => d.kind === 'audioinput');
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

            let routeScore = 0.7; // Default score
            const flags = [];

            // Check for Bluetooth devices (suspicious for voice recording)
            const bluetoothDevices = audioInputs.filter(d => 
                d.label.toLowerCase().includes('bluetooth') ||
                d.label.toLowerCase().includes('headset')
            );

            if (bluetoothDevices.length > 0) {
                routeScore = 0.4; // Lower score for Bluetooth
                flags.push('BLUETOOTH_DEVICE_DETECTED');
            }

            // Check for multiple audio inputs (could indicate routing)
            if (audioInputs.length > 1) {
                routeScore = 0.6;
                flags.push('MULTIPLE_AUDIO_INPUTS');
            }

            return {
                score: routeScore,
                details: {
                    audioInputs: audioInputs.length,
                    audioOutputs: audioOutputs.length,
                    bluetoothDevices: bluetoothDevices.length,
                    devices: devices.map(d => ({ kind: d.kind, label: d.label }))
                },
                flags: flags
            };

        } catch (error) {
            console.error('Audio route analysis failed:', error);
            return { score: 0.5, error: error.message };
        }
    }

    async analyzeAllSensors() {
        const results = {
            timestamp: Date.now(),
            motion: await this.analyzeMotionPattern(),
            proximity: this.analyzeProximityPattern(),
            battery: this.analyzeBatteryPattern(),
            screen: this.analyzeScreenState(),
            audioRoute: await this.analyzeAudioRoute()
        };

        // Calculate overall sensor score
        const scores = [
            results.motion.score,
            results.proximity.score,
            results.battery.score,
            results.screen.score,
            results.audioRoute.score
        ];

        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // Apply weights based on reliability
        const weightedScore = (
            results.motion.score * 0.3 +
            results.proximity.score * 0.3 +
            results.screen.score * 0.2 +
            results.battery.score * 0.1 +
            results.audioRoute.score * 0.1
        );

        results.overallScore = weightedScore;
        results.isLive = weightedScore > 0.6;

        // Collect all flags
        results.flags = [];
        Object.values(results).forEach(result => {
            if (result.flags && Array.isArray(result.flags)) {
                results.flags.push(...result.flags);
            }
        });

        return results;
    }

    // Utility: Check if device is likely an emulator
    async detectEmulator() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        // Check for emulator indicators in user agent
        const emulatorIndicators = [
            'android.*emulator',
            'android.*sdk',
            'android.*google',
            'android.*x86',
            'android.*armv7',
            'android.*generic'
        ];

        const isEmulatorUA = emulatorIndicators.some(pattern => 
            new RegExp(pattern).test(userAgent)
        );

        // Check for suspicious device properties
        const suspiciousProps = {
            screenResolution: screen.width === 1080 && screen.height === 1920,
            deviceMemory: navigator.deviceMemory && navigator.deviceMemory < 2,
            hardwareConcurrency: navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4,
            touchSupport: navigator.maxTouchPoints === 0 // No touch support on emulator
        };

        let emulatorScore = 0;
        if (isEmulatorUA) emulatorScore += 0.5;
        if (suspiciousProps.screenResolution) emulatorScore += 0.2;
        if (suspiciousProps.deviceMemory) emulatorScore += 0.1;
        if (suspiciousProps.hardwareConcurrency) emulatorScore += 0.1;
        if (suspiciousProps.touchSupport) emulatorScore += 0.1;

        return {
            isEmulator: emulatorScore > 0.5,
            score: emulatorScore,
            indicators: {
                userAgent: isEmulatorUA,
                screenResolution: suspiciousProps.screenResolution,
                deviceMemory: suspiciousProps.deviceMemory,
                hardwareConcurrency: suspiciousProps.hardwareConcurrency,
                touchSupport: suspiciousProps.touchSupport
            }
        };
    }

    // Cleanup
    cleanup() {
        this.stopMonitoring();
        this.sensorData = {
            accelerometer: [],
            proximity: [],
            battery: [],
            screen: [],
            timestamp: Date.now()
        };
    }
}

// Export for use in Battalooda
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MobileSensorAnalyzer };
} else {
    window.MobileSensorAnalyzer = MobileSensorAnalyzer;
}