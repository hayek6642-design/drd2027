/**
 * Global Prayer System Debug & Logging Module
 * Comprehensive debugging and monitoring for the Global Prayer System
 */

(function() {
    'use strict';
    
    // Debug configuration
    const DEBUG_CONFIG = {
        enabled: false,
        logLevel: 'info', // error, warn, info, debug, trace
        enableConsole: true,
        enableNetworkLog: true,
        enablePerformanceLog: true,
        enableAudioLog: true,
        enableNotificationLog: true,
        saveToStorage: false,
        maxLogEntries: 1000
    };
    
    // Performance monitoring
    const PERFORMANCE_MONITOR = {
        prayerTimesLoadTime: 0,
        azanLoadTime: 0,
        alertTriggerTime: 0,
        systemInitTime: 0
    };
    
    // Log levels
    const LOG_LEVELS = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4
    };
    
    // Initialize debug system
    function initDebugSystem() {
        checkDebugEnabled();
        
        if (DEBUG_CONFIG.enabled) {
            setupDebugListeners();
            startPerformanceMonitoring();
            setupErrorTracking();
            setupNetworkMonitoring();
            
            console.log('🕌 Global Prayer System Debug Mode Enabled');
            log('info', 'Debug system initialized', { timestamp: new Date().toISOString() });
        }
    }
    
    function checkDebugEnabled() {
        // Check multiple sources for debug setting
        const urlParams = new URLSearchParams(window.location.search);
        const hasDebugParam = urlParams.get('debug') === 'true';
        const hasGlobalDebug = window.GLOBAL_PRAYER_DEBUG === true;
        const hasStorageDebug = localStorage.getItem('globalPrayerDebug') === 'true';
        
        DEBUG_CONFIG.enabled = hasDebugParam || hasGlobalDebug || hasStorageDebug;
        
        // If enabled via URL, save to localStorage
        if (hasDebugParam) {
            localStorage.setItem('globalPrayerDebug', 'true');
        }
    }
    
    function setupDebugListeners() {
        // Monitor Global Prayer System events
        if (window.globalPrayerSystem) {
            monitorGlobalPrayerSystem();
        } else {
            // Retry when system becomes available
            setTimeout(() => {
                if (window.globalPrayerSystem) {
                    monitorGlobalPrayerSystem();
                }
            }, 1000);
        }
        
        // Monitor service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data) {
                    log('debug', 'Service Worker message', event.data);
                }
            });
        }
        
        // Monitor notification permissions
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                log('info', 'Notification permission', { permission });
            });
        }
    }
    
    function monitorGlobalPrayerSystem() {
        const system = window.globalPrayerSystem;
        
        // Monitor system initialization
        const initStart = performance.now();
        
        // Monitor prayer time loading
        const originalLoadPrayerTimes = system.loadPrayerTimes;
        system.loadPrayerTimes = async function() {
            const start = performance.now();
            const result = await originalLoadPrayerTimes.call(this);
            const duration = performance.now() - start;
            
            PERFORMANCE_MONITOR.prayerTimesLoadTime = duration;
            log('info', 'Prayer times loaded', { 
                duration: `${duration.toFixed(2)}ms`,
                prayerCount: this.prayerTimes?.length || 0
            });
            
            return result;
        };
        
        // Monitor azan playback
        const originalPlayAzan = system.playGlobalAzan;
        system.playGlobalAzan = function(azanFile, prayerKey) {
            const start = performance.now();
            const result = originalPlayAzan.call(this, azanFile, prayerKey);
            const duration = performance.now() - start;
            
            PERFORMANCE_MONITOR.azanLoadTime = duration;
            log('info', 'Azan playback started', {
                azanFile,
                prayerKey,
                duration: `${duration.toFixed(2)}ms`
            });
            
            return result;
        };
        
        // Monitor prayer alerts
        const originalShowAlert = system.showGlobalPrayerAlert;
        system.showGlobalPrayerAlert = function(prayer, index) {
            const start = performance.now();
            const result = originalShowAlert.call(this, prayer, index);
            const duration = performance.now() - start;
            
            PERFORMANCE_MONITOR.alertTriggerTime = duration;
            log('warn', 'Prayer alert triggered', {
                prayer: prayer.name,
                time: prayer.time,
                index,
                duration: `${duration.toFixed(2)}ms`
            });
            
            return result;
        };
        
        // Monitor settings changes
        const originalUpdateSettings = system.updateSettings;
        system.updateSettings = function(newSettings) {
            const oldSettings = { ...this.currentSettings };
            const result = originalUpdateSettings.call(this, newSettings);
            
            log('info', 'Settings updated', {
                oldSettings,
                newSettings,
                changedKeys: Object.keys(newSettings).filter(key => 
                    oldSettings[key] !== newSettings[key]
                )
            });
            
            return result;
        };
        
        // Monitor communication
        if (window.globalPrayerCommunication) {
            const comm = window.globalPrayerCommunication;
            const originalSendMessage = comm.sendMessage;
            comm.sendMessage = function(target, message) {
                log('debug', 'Communication sent', { target, message });
                const result = originalSendMessage.call(this, target, message);
                return result;
            };
        }
        
        PERFORMANCE_MONITOR.systemInitTime = performance.now() - initStart;
        log('info', 'System monitoring setup complete', {
            initTime: `${PERFORMANCE_MONITOR.systemInitTime.toFixed(2)}ms`
        });
    }
    
    function startPerformanceMonitoring() {
        // Monitor frame rate
        let frames = 0;
        let lastTime = performance.now();
        
        function monitorFrameRate() {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = frames * 1000 / (currentTime - lastTime);
                log('debug', 'Frame rate', { fps: fps.toFixed(1) });
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(monitorFrameRate);
        }
        
        requestAnimationFrame(monitorFrameRate);
        
        // Monitor memory usage
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                log('debug', 'Memory usage', {
                    used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                    total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                    limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
                });
            }, 30000); // Every 30 seconds
        }
    }
    
    function setupErrorTracking() {
        // Global error handler
        window.addEventListener('error', (event) => {
            log('error', 'JavaScript error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error?.stack
            });
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            log('error', 'Unhandled promise rejection', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });
        
        // Audio error tracking
        document.addEventListener('error', (event) => {
            if (event.target.tagName === 'AUDIO') {
                log('error', 'Audio error', {
                    src: event.target.src,
                    error: event.target.error
                });
            }
        }, true);
    }
    
    function setupNetworkMonitoring() {
        // Monitor fetch requests (Disabled to prevent conflicts with global fetch patch)
        /*
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            // ... (rest of the logic)
        };
        */
    }
    
    // Logging function
    function log(level, message, data = {}) {
        if (!DEBUG_CONFIG.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            userAgent: navigator.userAgent,
            url: window.location.href,
            serviceName: detectServiceName()
        };
        
        // Console logging
        if (DEBUG_CONFIG.enableConsole) {
            const logMethods = {
                error: console.error,
                warn: console.warn,
                info: console.info,
                debug: console.debug,
                trace: console.trace
            };
            
            const logMethod = logMethods[level] || console.log;
            const prefix = `🕌 [${level.toUpperCase()}] ${message}`;
            
            if (Object.keys(data).length > 0) {
                logMethod(prefix, data);
            } else {
                logMethod(prefix);
            }
        }
        
        // Storage logging
        if (DEBUG_CONFIG.saveToStorage) {
            saveLogToStorage(logEntry);
        }
        
        // Performance logging
        if (DEBUG_CONFIG.enablePerformanceLog && level === 'info') {
            logPerformanceMetrics();
        }
        
        return logEntry;
    }
    
    function logPerformanceMetrics() {
        const metrics = {
            memory: performance.memory ? {
                used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`
            } : 'Not available',
            navigation: performance.timing ? {
                domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
            } : 'Not available',
            custom: PERFORMANCE_MONITOR
        };
        
        log('debug', 'Performance metrics', metrics);
    }
    
    function saveLogToStorage(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem('globalPrayerDebugLogs') || '[]');
            logs.push(logEntry);
            
            // Keep only the most recent entries
            if (logs.length > DEBUG_CONFIG.maxLogEntries) {
                logs.splice(0, logs.length - DEBUG_CONFIG.maxLogEntries);
            }
            
            localStorage.setItem('globalPrayerDebugLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('Failed to save log to storage:', error);
        }
    }
    
    function detectServiceName() {
        const path = window.location.pathname;
        if (path.includes('index.html') || path.includes('indexCB.html')) return 'CodeBank';
        if (path.includes('yt-new.html')) return 'YouTube App';
        if (path.includes('azan-clock/')) return 'Prayer Clock';
        if (path.includes('youtube-channel.html')) return 'YouTube Channel';
        if (path.includes('login.html')) return 'Login Service';
        return 'Unknown Service';
    }
    
    // Public API
    window.GlobalPrayerDebug = {
        log,
        enable: () => {
            localStorage.setItem('globalPrayerDebug', 'true');
            location.reload();
        },
        disable: () => {
            localStorage.removeItem('globalPrayerDebug');
            location.reload();
        },
        getLogs: () => {
            return JSON.parse(localStorage.getItem('globalPrayerDebugLogs') || '[]');
        },
        clearLogs: () => {
            localStorage.removeItem('globalPrayerDebugLogs');
        },
        getPerformanceMetrics: () => {
            return { ...PERFORMANCE_MONITOR };
        },
        simulatePrayerAlert: (prayerName = 'Fajr') => {
            if (window.globalPrayerSystem) {
                window.globalPrayerSystem.triggerPrayerAlert(prayerName);
                log('info', 'Simulated prayer alert', { prayerName });
            } else {
                log('warn', 'Cannot simulate alert - system not available');
            }
        },
        testNotification: () => {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🕌 Test Notification', {
                    body: 'This is a test of the Global Prayer System notification',
                    icon: '/yt-coder/assets/icons/prayer-icon.png'
                });
                log('info', 'Test notification sent');
            } else {
                log('warn', 'Cannot send test notification - permission not granted');
            }
        }
    };
    
    // Export for external use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { log, DEBUG_CONFIG, PERFORMANCE_MONITOR };
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDebugSystem);
    } else {
        initDebugSystem();
    }
    
    // Also initialize immediately if debug is already enabled
    checkDebugEnabled();
    if (DEBUG_CONFIG.enabled) {
        initDebugSystem();
    }
})();