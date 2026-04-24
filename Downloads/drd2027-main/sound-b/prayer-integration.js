/**
 * Integration Script for Enhanced Persistent Prayer System
 * Add this to your existing yt-new.html file
 */

(function() {
    'use strict';

    // Configuration
    const PRAYER_CONFIG = {
        enabled: true,
        autoInitialize: true,
        serviceWorkerPath: '/yt-coder/enhanced-persistent-service-worker.js',
        systemScriptPath: '/yt-coder/enhanced-persistent-prayer-system.js'
    };

    class PrayerIntegration {
        constructor() {
            this.isInitialized = false;
            this.prayerSystem = null;
            this.initPromise = null;
        }

        async initialize() {
            if (this.isInitialized || this.initPromise) {
                return this.initPromise;
            }

            this.initPromise = this._doInitialize();
            return this.initPromise;
        }

        async _doInitialize() {
            try {
                console.log('🕌 Initializing Enhanced Persistent Prayer System Integration...');

                // Check if already initialized
                if (window.EnhancedPersistentPrayerSystem) {
                    this.prayerSystem = window.EnhancedPersistentPrayerSystem;
                    await this.prayerSystem.initialize();
                    this.isInitialized = true;
                    console.log('✅ Existing Enhanced Persistent Prayer System initialized');
                    return;
                }

                // Load the prayer system scripts
                await this.loadPrayerScripts();

                // Wait for scripts to be ready
                if (window.EnhancedPersistentPrayerSystem) {
                    this.prayerSystem = window.EnhancedPersistentPrayerSystem;
                    await this.prayerSystem.initialize();
                    this.isInitialized = true;
                    console.log('✅ Enhanced Persistent Prayer System loaded and initialized');
                } else {
                    throw new Error('Prayer system scripts failed to load');
                }

            } catch (error) {
                console.error('❌ Error initializing prayer system integration:', error);
            }
        }

        async loadPrayerScripts() {
            const scripts = [
                { src: PRAYER_CONFIG.systemScriptPath, type: 'module' },
                { src: PRAYER_CONFIG.serviceWorkerPath, type: 'script' }
            ];

            for (const script of scripts) {
                await this.loadScript(script.src, script.type);
            }
        }

        loadScript(src, type = 'script') {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.type = type;
                
                script.onload = () => {
                    console.log(`✅ Loaded script: ${src}`);
                    resolve();
                };
                
                script.onerror = () => {
                    console.warn(`⚠️ Failed to load script: ${src}`);
                    // Don't reject for optional scripts
                    resolve();
                };
                
                document.head.appendChild(script);
            });
        }

        // Public API methods
        async enablePersistentNotifications() {
            await this.initialize();
            if (this.prayerSystem) {
                await this.prayerSystem.setupPushNotifications();
                return true;
            }
            return false;
        }

        async getLocation() {
            await this.initialize();
            if (this.prayerSystem) {
                return await this.prayerSystem.getCurrentLocation();
            }
            return null;
        }

        async loadPrayerTimes() {
            await this.initialize();
            if (this.prayerSystem) {
                return await this.prayerSystem.getPrayerTimes();
            }
            return null;
        }

        async scheduleUpcomingPrayers() {
            await this.initialize();
            if (this.prayerSystem) {
                await this.prayerSystem.scheduleAllUpcomingPrayers();
                return true;
            }
            return false;
        }

        testNotification() {
            // DISABLED - Service workers disabled globally
            return false;
            /*
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'TEST_NOTIFICATION'
                });
                return true;
            }
            return false;
            */
        }

        getSystemStatus() {
            if (this.prayerSystem) {
                return this.prayerSystem.getStatus();
            }
            return {
                initialized: this.isInitialized,
                notificationsEnabled: false,
                pushEnabled: false,
                serviceWorkerActive: false,
                scheduledCount: 0
            };
        }

        // Integration with existing prayer alert system
        integrateWithExistingSystem() {
            // Override existing prayer alert functions if they exist
            if (window.PrayerAlertSystem) {
                const originalShowPrayerAlert = window.PrayerAlertSystem.prototype.showPrayerAlert;
                window.PrayerAlertSystem.prototype.showPrayerAlert = async function(prayer, index) {
                    // Call original function
                    if (originalShowPrayerAlert) {
                        originalShowPrayerAlert.call(this, prayer, index);
                    }
                    
                    // Also trigger persistent notification
                    if (window.PersistentPrayerIntegration) {
                        await window.PersistentPrayerIntegration.triggerPersistentPrayer(prayer, index);
                    }
                };
            }

            // Integrate with global prayer system if it exists
            if (window.GlobalPrayerSystem) {
                const originalShowGlobalPrayerAlert = window.GlobalPrayerSystem.prototype.showGlobalPrayerAlert;
                window.GlobalPrayerSystem.prototype.showGlobalPrayerAlert = async function(prayer, index) {
                    // Call original function
                    if (originalShowGlobalPrayerAlert) {
                        originalShowGlobalPrayerAlert.call(this, prayer, index);
                    }
                    
                    // Also trigger persistent notification
                    if (window.PersistentPrayerIntegration) {
                        await window.PersistentPrayerIntegration.triggerPersistentPrayer(prayer, index);
                    }
                };
            }
        }

        // Method to trigger persistent prayer notification
        async triggerPersistentPrayer(prayer, index) {
            // DISABLED - Service workers disabled globally
            return;
            /*
            try {
                await this.initialize();
                
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    const prayerData = {
                        prayerId: `prayer-${prayer.name.toLowerCase()}-${Date.now()}`,
                        prayerName: prayer.name,
                        prayerKey: prayer.key || prayer.name.toLowerCase(),
                        language: this.getCurrentLanguage(),
                        region: 'mecca',
                        timestamp: Date.now() + 1000 // Trigger in 1 second
                    };

                    navigator.serviceWorker.controller.postMessage({
                        type: 'SCHEDULE_PRAYER_NOTIFICATION',
                        data: prayerData
                    });

                    console.log('🕌 Persistent prayer notification triggered');
                }
            } catch (error) {
                console.error('Error triggering persistent prayer:', error);
            }
            */
        }

        getCurrentLanguage() {
            return localStorage.getItem('prayerLanguage') || 
                   document.documentElement.lang || 
                   'en';
        }
    }

    // Create global instance
    window.PersistentPrayerIntegration = new PrayerIntegration();

    // Auto-initialize if enabled
    if (PRAYER_CONFIG.autoInitialize) {
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.PersistentPrayerIntegration.initialize();
            });
        } else {
            window.PersistentPrayerIntegration.initialize();
        }
    }

    // Integrate with existing systems after a short delay
    setTimeout(() => {
        window.PersistentPrayerIntegration.integrateWithExistingSystem();
    }, 2000);

    // Make it available globally
    console.log('🕌 Enhanced Persistent Prayer System Integration loaded');

})();