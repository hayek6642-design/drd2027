/*
  Prayer Alert System - Complete Islamic Prayer Time Management
  Features:
  - Real-time prayer time calculations with precise timing
  - Global prayer time synchronization across time zones
  - Auto prayer alerts with customizable notifications
  - Integration with Firebase for cross-device sync
  - Location-based prayer times with offline fallback
  - Islamic calendar integration
*/

class PrayerAlertSystem {
    constructor(options = {}) {
        this.options = {
            autoAlertEnabled: options.autoAlertEnabled !== false,
            alertBeforePrayer: options.alertBeforePrayer || 10, // minutes before
            notificationAudio: options.notificationAudio || true,
            backupLocation: options.backupLocation || { lat: 21.4225, lng: 39.8262 }, // Mecca
            enableOfflineMode: options.enableOfflineMode !== false,
            syncInterval: options.syncInterval || 3600000, // 1 hour
            ...options
        };

        this.prayerTimes = [];
        this.nextPrayerIndex = -1;
        this.isPrayerAlertActive = false;
        this.prayerAudio = null;
        this.alertTimeout = null;
        this.azanTimerInterval = null;
        this.location = null;
        this.syncIntervalId = null;
        
        // Prayer configurations
        this.prayerNames = {
            'Fajr': { icon: '🌅', azanFile: 'fajr.mp3', duration: 3 },
            'Dhuhr': { icon: '☀️', azanFile: 'dhuhr.mp3', duration: 3 },
            'Asr': { icon: '🌇', azanFile: 'asr.mp3', duration: 3 },
            'Maghrib': { icon: '🌆', azanFile: 'maghrib.mp3', duration: 3 },
            'Isha': { icon: '🌙', azanFile: 'isha.mp3', duration: 3 }
        };

        this.apiEndpoints = {
            prayerTimes: 'https://api.aladhan.com/v1/timings',
            hijriDate: 'https://api.aladhan.com/v1/gToH'
        };

        this.init();
    }

    async init() {
        try {
            console.log('🕌 Initializing Prayer Alert System...');
            
            await this.initializeLocation();
            await this.loadPrayerTimes();
            this.setupAutoPrayerMonitoring();
            this.setupEventListeners();
            this.startPeriodicSync();
            
            // Load saved preferences
            this.loadSavedPreferences();
            
            console.log('✅ Prayer Alert System initialized successfully');
            
            if (typeof window !== 'undefined') {
                window.prayerAlertSystem = this;
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize Prayer Alert System:', error);
        }
    }

    async initializeLocation() {
        try {
            const savedLocation = this.getSavedLocation();
            if (savedLocation) {
                this.location = savedLocation;
                return;
            }

            if (navigator.geolocation) {
                return new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            this.location = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            };
                            this.saveLocation();
                            resolve(this.location);
                        },
                        (error) => {
                            console.warn('Geolocation failed, using backup location:', error);
                            this.location = this.options.backupLocation;
                            this.saveLocation();
                            resolve(this.location);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 300000 // 5 minutes
                        }
                    );
                });
            } else {
                this.location = this.options.backupLocation;
                this.saveLocation();
                return this.location;
            }
        } catch (error) {
            console.error('Location initialization failed:', error);
            this.location = this.options.backupLocation;
            this.saveLocation();
            return this.location;
        }
    }

    async loadPrayerTimes() {
        try {
            if (!this.location) {
                throw new Error('Location not available');
            }

            const url = `${this.apiEndpoints.prayerTimes}?latitude=${this.location.lat}&longitude=${this.location.lng}&method=2`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const timings = data.data.timings;
            const dateInfo = data.data.date;

            // Process prayer times
            this.prayerTimes = Object.keys(this.prayerNames).map(prayerName => ({
                name: prayerName,
                time: timings[prayerName],
                icon: this.prayerNames[prayerName].icon,
                dateInfo: dateInfo
            }));

            // Sort by time
            this.sortPrayerTimesByCurrentTime();
            
            console.log('Prayer times loaded:', this.prayerTimes);
            
            // Save to localStorage for offline access
            this.savePrayerTimesOffline();
            
            // Update UI if available
            this.updatePrayerTimesDisplay();
            
        } catch (error) {
            console.error('Failed to load prayer times:', error);
            await this.loadOfflinePrayerTimes();
        }
    }

    sortPrayerTimesByCurrentTime() {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        this.prayerTimes.sort((a, b) => {
            const [aHours, aMinutes] = a.time.split(':').map(Number);
            const [bHours, bMinutes] = b.time.split(':').map(Number);
            
            const aTotalMinutes = aHours * 60 + aMinutes;
            const bTotalMinutes = bHours * 60 + bMinutes;
            
            // Handle prayer times that have passed today
            const aAdjustment = aTotalMinutes <= currentTime ? 1440 : 0;
            const bAdjustment = bTotalMinutes <= currentTime ? 1440 : 0;
            
            return (aTotalMinutes + aAdjustment) - (bTotalMinutes + bAdjustment);
        });
    }

    setupAutoPrayerMonitoring() {
        // Check every minute for upcoming prayers
        this.monitorIntervalId = setInterval(() => {
            this.checkForUpcomingPrayer();
        }, 60000);

        // Update next prayer every 5 minutes
        this.nextPrayerUpdateId = setInterval(() => {
            this.updateNextPrayerInfo();
        }, 300000);
    }

    checkForUpcomingPrayer() {
        const now = new Date();
        const currentTime = now.getTime();
        const tenMinutesBefore = this.options.alertBeforePrayer * 60 * 1000;

        this.prayerTimes.forEach((prayer, index) => {
            const prayerTime = this.getPrayerDateTime(prayer.time);
            
            if (prayerTime > now) {
                const timeUntilPrayer = prayerTime - now;
                
                if (timeUntilPrayer <= tenMinutesBefore && timeUntilPrayer > 0) {
                    this.showPrayerAlert(prayer.name, prayerTime);
                }
            }
        });
    }

    getPrayerDateTime(prayerTime) {
        const [hours, minutes] = prayerTime.split(':').map(Number);
        const now = new Date();
        const prayerDateTime = new Date(now);
        
        prayerDateTime.setHours(hours, minutes, 0, 0);
        
        // If prayer time has passed today, set for tomorrow
        if (prayerDateTime <= now) {
            prayerDateTime.setDate(prayerDateTime.getDate() + 1);
        }
        
        return prayerDateTime;
    }

    showPrayerAlert(prayerName, prayerTime) {
        if (this.isPrayerAlertActive) return;

        this.isPrayerAlertActive = true;
        
        const overlay = document.getElementById('prayer-alert-overlay');
        const icon = document.getElementById('prayer-icon');
        const name = document.getElementById('prayer-name');

        if (!overlay || !icon || !name) {
            console.warn('Prayer alert UI elements not found');
            return;
        }

        // Set prayer-specific content
        const prayerInfo = this.prayerNames[prayerName];
        icon.textContent = prayerInfo.icon;
        name.textContent = prayerName;

        overlay.style.display = 'flex';

        // Play azan audio if enabled
        if (this.options.notificationAudio) {
            this.playAzanSound(prayerName);
        }

        // Start countdown timer
        this.startAzanCountdown(prayerTime);

        // Show notification
        this.showNotification(`Prayer Time: ${prayerName}`, `It's time for ${prayerName} prayer`, 'info');

        // Auto close after prayer duration or 10 minutes
        setTimeout(() => {
            this.closePrayerAlert();
        }, Math.max(prayerInfo.duration * 60 * 1000, 600000)); // 10 minutes max

        // Store in Firebase for cross-device sync
        this.syncPrayerAlert(prayerName, prayerTime);
    }

    playAzanSound(prayerName) {
        try {
            const prayerInfo = this.prayerNames[prayerName];
            const azanUrl = this.getAzanUrl(prayerInfo.azanFile);
            
            this.prayerAudio = new Audio(azanUrl);
            this.prayerAudio.volume = 0.7;
            
            const playPromise = this.prayerAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Could not play azan:', error);
                });
            }
            
        } catch (error) {
            console.error('Failed to play azan:', error);
        }
    }

    getAzanUrl(prayerFile) {
        // Use online azan files with fallback
        const azanSources = [
            `https://www.islamicfinder.org/audio/azan/${prayerFile}`,
            `https://cdn.islamicfinder.org/azan/${prayerFile}`,
            `https://archive.org/download/azans/${prayerFile}`,
            // Fallback sound
            'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
        ];
        
        return azanSources[0];
    }

    startAzanCountdown(targetTime) {
        const timerElement = document.getElementById('azan-timer');
        if (!timerElement) return;

        const updateTimer = () => {
            const now = new Date();
            const remaining = targetTime - now;
            
            if (remaining <= 0) {
                timerElement.textContent = '00:00';
                return;
            }
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        updateTimer();
        this.azanTimerInterval = setInterval(updateTimer, 1000);
    }

    closePrayerAlert() {
        const overlay = document.getElementById('prayer-alert-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        if (this.prayerAudio) {
            this.prayerAudio.pause();
            this.prayerAudio.currentTime = 0;
            this.prayerAudio = null;
        }
        
        if (this.azanTimerInterval) {
            clearInterval(this.azanTimerInterval);
            this.azanTimerInterval = null;
        }
        
        this.isPrayerAlertActive = false;
    }

    updatePrayerTimesDisplay() {
        const display = document.getElementById('prayer-times-display');
        if (!display) return;

        const now = new Date();
        const currentTime = now.getTime();

        display.innerHTML = this.prayerTimes.map(prayer => {
            const prayerDateTime = this.getPrayerDateTime(prayer.time);
            const isNext = prayerDateTime > now && prayerDateTime.getTime() - currentTime < 3600000; // Next 1 hour
            const activeClass = isNext ? 'active' : '';

            return `
                <div class="prayer-time-item ${activeClass}" data-prayer="${prayer.name}">
                    <span class="prayer-time-name">${prayer.icon} ${prayer.name}</span>
                    <span class="prayer-time-value">${prayer.time}</span>
                </div>
            `;
        }).join('');
    }

    updateNextPrayerInfo() {
        const now = new Date();
        const currentTime = now.getTime();

        const nextPrayer = this.prayerTimes.find(prayer => {
            const prayerDateTime = this.getPrayerDateTime(prayer.time);
            return prayerDateTime > now;
        });

        if (nextPrayer) {
            this.nextPrayerIndex = this.prayerTimes.indexOf(nextPrayer);
            console.log(`Next prayer: ${nextPrayer.name} at ${nextPrayer.time}`);
        }
    }

    async getHijriDate() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${this.apiEndpoints.hijriDate}/${today}`);
            const data = await response.json();
            return data.data.hijri;
        } catch (error) {
            console.error('Failed to get Hijri date:', error);
            return null;
        }
    }

    // AUTH REMOVED — SCOPED RESET
    async syncPrayerAlert(prayerName, prayerTime) {
        // Firebase integration removed - auth cleanup
        console.log('Prayer alert sync skipped (auth removed)');
    }

    // Offline Support
    savePrayerTimesOffline() {
        try {
            const offlineData = {
                prayerTimes: this.prayerTimes,
                location: this.location,
                timestamp: Date.now()
            };
            localStorage.setItem('offline_prayer_times', JSON.stringify(offlineData));
        } catch (error) {
            console.warn('Failed to save offline prayer times:', error);
        }
    }

    async loadOfflinePrayerTimes() {
        try {
            const offlineData = localStorage.getItem('offline_prayer_times');
            if (offlineData) {
                const data = JSON.parse(offlineData);
                
                // Check if data is less than 24 hours old
                if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    this.prayerTimes = data.prayerTimes;
                    this.location = data.location;
                    this.updatePrayerTimesDisplay();
                    console.log('Loaded offline prayer times');
                    return;
                }
            }
        } catch (error) {
            console.warn('Failed to load offline prayer times:', error);
        }
    }

    // Preferences Management
    loadSavedPreferences() {
        try {
            const saved = localStorage.getItem('prayer_alert_preferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                Object.assign(this.options, preferences);
            }
        } catch (error) {
            console.warn('Failed to load saved preferences:', error);
        }
    }

    savePreferences() {
        try {
            const preferences = {
                autoAlertEnabled: this.options.autoAlertEnabled,
                alertBeforePrayer: this.options.alertBeforePrayer,
                notificationAudio: this.options.notificationAudio,
                enableOfflineMode: this.options.enableOfflineMode
            };
            localStorage.setItem('prayer_alert_preferences', JSON.stringify(preferences));
        } catch (error) {
            console.warn('Failed to save preferences:', error);
        }
    }

    // Utility Methods
    getSavedLocation() {
        try {
            const saved = localStorage.getItem('user_location');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            return null;
        }
    }

    saveLocation() {
        try {
            localStorage.setItem('user_location', JSON.stringify(this.location));
            localStorage.setItem('location_saved', 'true');
        } catch (error) {
            console.warn('Failed to save location:', error);
        }
    }

    showNotification(title, message, type = 'info') {
        // Integration with Notification System
        if (window.notificationSystem) {
            window.notificationSystem.showNotification(title, message, type);
        } else {
            console.log(`📢 ${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    startPeriodicSync() {
        this.syncIntervalId = setInterval(() => {
            this.loadPrayerTimes();
        }, this.options.syncInterval);
    }

    setupEventListeners() {
        // Listen for messages from azan-clock popup
        window.addEventListener('message', (event) => {
            if (event.data.type === 'AUTO_PRAYER_ALERT_TOGGLE') {
                this.options.autoAlertEnabled = event.data.enabled;
                this.savePreferences();
                
                if (event.data.enabled) {
                    this.showNotification('Prayer alerts enabled', 'You will receive notifications before prayer times', 'success');
                } else {
                    this.closePrayerAlert();
                    this.showNotification('Prayer alerts disabled', 'Prayer notifications have been turned off', 'info');
                }
            }
        });

        // Listen for prayer alert status requests
        window.addEventListener('message', (event) => {
            if (event.data.type === 'REQUEST_PRAYER_ALERT_STATUS') {
                window.parent.postMessage({
                    type: 'PRAYER_ALERT_STATUS',
                    enabled: this.options.autoAlertEnabled,
                    nextPrayer: this.getNextPrayer()
                }, window.location.origin);
            }
        });
    }

    getNextPrayer() {
        const now = new Date();
        const nextPrayer = this.prayerTimes.find(prayer => {
            const prayerDateTime = this.getPrayerDateTime(prayer.time);
            return prayerDateTime > now;
        });
        
        return nextPrayer ? {
            name: nextPrayer.name,
            time: nextPrayer.time,
            timeUntil: this.getPrayerDateTime(nextPrayer.time) - now
        } : null;
    }

    // Public API
    enableAutoAlerts() {
        this.options.autoAlertEnabled = true;
        this.savePreferences();
        console.log('🕌 Auto prayer alerts enabled');
    }

    disableAutoAlerts() {
        this.options.autoAlertEnabled = false;
        this.savePreferences();
        this.closePrayerAlert();
        console.log('🕌 Auto prayer alerts disabled');
    }

    setAlertBeforePrayer(minutes) {
        this.options.alertBeforePrayer = minutes;
        this.savePreferences();
        console.log(`🕌 Prayer alerts set for ${minutes} minutes before`);
    }

    async refreshPrayerTimes() {
        console.log('🔄 Refreshing prayer times...');
        await this.loadPrayerTimes();
        this.showNotification('Prayer times updated', 'Latest prayer times have been loaded', 'success');
    }

    destroy() {
        if (this.monitorIntervalId) clearInterval(this.monitorIntervalId);
        if (this.nextPrayerUpdateId) clearInterval(this.nextPrayerUpdateId);
        if (this.syncIntervalId) clearInterval(this.syncIntervalId);
        if (this.azanTimerInterval) clearInterval(this.azanTimerInterval);
        this.closePrayerAlert();
        console.log('🕌 Prayer Alert System destroyed');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrayerAlertSystem;
}

// Global initialization
if (typeof window !== 'undefined') {
    window.PrayerAlertSystem = PrayerAlertSystem;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.prayerAlertSystem) {
                window.prayerAlertSystem = new PrayerAlertSystem();
            }
        });
    } else {
        if (!window.prayerAlertSystem) {
            window.prayerAlertSystem = new PrayerAlertSystem();
        }
    }
}

console.log('🕌 Prayer Alert System module loaded');
