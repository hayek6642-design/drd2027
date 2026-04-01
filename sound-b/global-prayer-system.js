// Global Prayer Alert System
// Supports all 11 azan files with multi-regional, multi-language functionality

class GlobalPrayerSystem {
    constructor() {
        this.prayerTimes = [];
        this.nextPrayerIndex = -1;
        this.isPrayerAlertActive = false;
        this.prayerAudio = null;
        this.alertTimeout = null;
        
        // Prayer names in multiple languages
        this.prayerNames = {
            en: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
            ar: ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'],
            ur: ['فجر', 'ظهر', ' عصر', 'مغرب', 'عشاء'],
            tr: ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'],
            id: ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'],
            fa: ['فجر', 'ظهر', 'عصر', 'مغرب', 'عشاء'],
            hi: ['फजर', 'जुहर', 'आसर', 'मगरिब', 'इशा']
        };

        // Global azan configuration - all 11 azan files
        this.azanConfiguration = {
            // Prayer-specific azan files
            prayers: {
                fajr: { primary: 'azan1.mp3', secondary: 'azan6.mp3', special: 'azan11.mp3' },
                dhuhr: { primary: 'azan2.mp3', secondary: 'azan7.mp3', special: 'azan8.mp3' },
                asr: { primary: 'azan3.mp3', secondary: 'azan8.mp3', special: 'azan9.mp3' },
                maghrib: { primary: 'azan4.mp3', secondary: 'azan9.mp3', special: 'azan10.mp3' },
                isha: { primary: 'azan5.mp3', secondary: 'azan10.mp3', special: 'azan11.mp3' }
            },
            
            // Special occasions and regions
            special: {
                friday: { file: 'azan6.mp3', description: 'Friday Special Azan' },
                eid: { file: 'azan7.mp3', description: 'Eid Special Azan' },
                tahajjud: { file: 'azan11.mp3', description: 'Tahajjud Azan' },
                tarawih: { file: 'azan8.mp3', description: 'Tarawih Azan' },
                qiyam: { file: 'azan9.mp3', description: 'Qiyam Al-Layl Azan' }
            },
            
            // Regional variations
            regional: {
                mecca: { fajr: 'azan1.mp3', dhuhr: 'azan2.mp3', asr: 'azan3.mp3', maghrib: 'azan4.mp3', isha: 'azan5.mp3' },
                madinah: { fajr: 'azan6.mp3', dhuhr: 'azan7.mp3', asr: 'azan8.mp3', maghrib: 'azan9.mp3', isha: 'azan10.mp3' },
                cairo: { fajr: 'azan11.mp3', dhuhr: 'azan1.mp3', asr: 'azan2.mp3', maghrib: 'azan3.mp3', isha: 'azan4.mp3' },
                istanbul: { fajr: 'azan5.mp3', dhuhr: 'azan6.mp3', asr: 'azan7.mp3', maghrib: 'azan8.mp3', isha: 'azan9.mp3' },
                jakarta: { fajr: 'azan10.mp3', dhuhr: 'azan11.mp3', asr: 'azan1.mp3', maghrib: 'azan2.mp3', isha: 'azan3.mp3' },
                karachi: { fajr: 'azan4.mp3', dhuhr: 'azan5.mp3', asr: 'azan6.mp3', maghrib: 'azan7.mp3', isha: 'azan8.mp3' }
            }
        };

        // Current settings
        this.currentSettings = {
            language: 'en',
            region: 'mecca',
            prayerMethod: 2, // Islamic Society of North America
            autoAlert: true,
            volume: 0.8,
            azanStyle: 'primary', // primary, secondary, special
            useRegional: false,
            respectAudioMute: true
        };

        this.alertCheckInterval = null;
        this.videoWasMuted = false;
        this.componentMuteStates = {};
        
        this.initializeGlobalPrayerSystem();
    }

    initializeGlobalPrayerSystem() {
        console.log('🕌 Initializing Global Prayer System with 11 Azan files...');
        
        // Load saved settings
        this.loadSettings();
        
        // Create global prayer alert popup
        this.createGlobalPrayerAlertPopup();
        
        // Load prayer times
        this.loadPrayerTimes();
        
        // Start monitoring if enabled
        if (this.currentSettings.autoAlert) {
            this.startPrayerMonitoring();
        }
        
        // Setup cross-platform communication
        this.setupGlobalCommunication();
        
        // Setup audio management
        this.setupGlobalAudioManagement();
        
        console.log('✅ Global Prayer System initialized with all 11 azan files');
    }

    createGlobalPrayerAlertPopup() {
        // Create comprehensive popup overlay
        const overlay = document.createElement('div');
        overlay.id = 'global-prayer-alert-overlay';
        overlay.className = 'global-prayer-alert-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <div class="global-prayer-alert-popup">
                <div class="global-prayer-alert-content">
                    <div class="global-prayer-alert-header">
                        <div class="prayer-region-indicator" id="prayer-region-indicator">🕌</div>
                        <h2 id="global-prayer-title">Prayer Time</h2>
                        <button id="global-prayer-close" class="global-prayer-close-btn">✖</button>
                    </div>
                    <div class="global-prayer-alert-body">
                        <div class="prayer-icon">🕌</div>
                        <div class="prayer-name" id="current-prayer-name">Prayer Name</div>
                        <div class="prayer-time-info">
                            <div class="prayer-time-display" id="prayer-time-display">--:--</div>
                            <div class="prayer-azan-info" id="prayer-azan-info">Using Primary Azan</div>
                        </div>
                        <div class="prayer-status" id="global-prayer-status">Playing Azan...</div>
                        <div class="azan-timer" id="azan-timer">00:00</div>
                        <div class="prayer-location" id="prayer-location">Location: --</div>
                    </div>
                    <div class="global-prayer-alert-footer">
                        <div class="prayer-controls">
                            <button id="azan-previous" class="azan-control-btn">⏮️</button>
                            <button id="azan-play-pause" class="azan-control-btn">⏸️</button>
                            <button id="azan-next" class="azan-control-btn">⏭️</button>
                            <button id="azan-stop" class="azan-control-btn">⏹️</button>
                        </div>
                        <small>Global Prayer Alert - Click outside to close</small>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Add event listeners
        this.setupGlobalPopupEventListeners(overlay);
        
        console.log('✅ Global prayer alert popup created');
    }

    setupGlobalPopupEventListeners(overlay) {
        // Close button
        const closeBtn = overlay.querySelector('#global-prayer-close');
        closeBtn.addEventListener('click', () => {
            this.closeGlobalPrayerAlert();
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeGlobalPrayerAlert();
            }
        });
        
        // Prayer control buttons
        overlay.querySelector('#azan-previous').addEventListener('click', () => this.playPreviousAzan());
        overlay.querySelector('#azan-play-pause').addEventListener('click', () => this.toggleAzanPlayback());
        overlay.querySelector('#azan-next').addEventListener('click', () => this.playNextAzan());
        overlay.querySelector('#azan-stop').addEventListener('click', () => this.stopAzan());
        
        // Prevent click on popup content from closing
        const popup = overlay.querySelector('.global-prayer-alert-popup');
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    async loadPrayerTimes() {
        try {
            const { latitude, longitude } = await this.getCurrentLocation();
            await this.fetchPrayerTimesFromAPI(latitude, longitude);
        } catch (error) {
            console.error('Error loading prayer times:', error);
            // Use Mecca coordinates as fallback
            await this.fetchPrayerTimesFromAPI(21.4225, 39.8262);
        }
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            // Check if location is saved
            const savedLat = localStorage.getItem('userLat');
            const savedLng = localStorage.getItem('userLng');
            
            if (savedLat && savedLng) {
                resolve({ latitude: parseFloat(savedLat), longitude: parseFloat(savedLng) });
                return;
            }

            // Get current location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        localStorage.setItem('userLat', latitude.toString());
                        localStorage.setItem('userLng', longitude.toString());
                        resolve({ latitude, longitude });
                    },
                    (error) => {
                        console.log('Geolocation error, using Mecca as fallback:', error);
                        resolve({ latitude: 21.4225, longitude: 39.8262 });
                    }
                );
            } else {
                resolve({ latitude: 21.4225, longitude: 39.8262 });
            }
        });
    }

    async fetchPrayerTimesFromAPI(lat, lon) {
        try {
            const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${this.currentSettings.prayerMethod}`);
            const data = await response.json();
            const timings = data.data.timings;

            this.prayerTimes = [
                { name: 'Fajr', time: timings.Fajr, fullName: 'Fajr Prayer', key: 'fajr' },
                { name: 'Dhuhr', time: timings.Dhuhr, fullName: 'Dhuhr Prayer', key: 'dhuhr' },
                { name: 'Asr', time: timings.Asr, fullName: 'Asr Prayer', key: 'asr' },
                { name: 'Maghrib', time: timings.Maghrib, fullName: 'Maghrib Prayer', key: 'maghrib' },
                { name: 'Isha', time: timings.Isha, fullName: 'Isha Prayer', key: 'isha' }
            ];

            console.log('🕌 Global prayer times loaded:', this.prayerTimes);
            this.calculateNextPrayer();
            
            // Notify other components
            this.broadcastPrayerTimesUpdate();
        } catch (error) {
            console.error('Error fetching prayer times:', error);
        }
    }

    calculateNextPrayer() {
        const now = new Date();
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

        for (let i = 0; i < this.prayerTimes.length; i++) {
            const prayer = this.prayerTimes[i];
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const prayerTimeMinutes = hours * 60 + minutes;

            if (prayerTimeMinutes > currentTimeMinutes) {
                this.nextPrayerIndex = i;
                return;
            }
        }

        // If no prayer today, next prayer is tomorrow's Fajr
        this.nextPrayerIndex = 0;
    }

    startPrayerMonitoring() {
        // Check every 15 seconds for prayer time (more frequent for accuracy)
        this.alertCheckInterval = setInterval(() => {
            this.checkPrayerTime();
        }, 15000);

        // Also check immediately
        this.checkPrayerTime();
        
        console.log('✅ Global prayer monitoring started');
    }

    checkPrayerTime() {
        if (this.isPrayerAlertActive) return;

        const now = new Date();
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

        for (let i = 0; i < this.prayerTimes.length; i++) {
            const prayer = this.prayerTimes[i];
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const prayerTimeMinutes = hours * 60 + minutes;
            
            // Check if it's prayer time (within 1 minute window)
            const timeDiff = Math.abs(currentTimeMinutes - prayerTimeMinutes);
            
            if (timeDiff <= 1) {
                this.showGlobalPrayerAlert(prayer, i);
                return;
            }
        }
    }

    showGlobalPrayerAlert(prayer, index) {
        console.log(`🕌 Showing global prayer alert for ${prayer.name}`);
        
        this.isPrayerAlertActive = true;
        this.currentPrayerIndex = index;

        // Get the appropriate azan file
        const azanFile = this.getAzanFileForPrayer(prayer.key);
        
        // Update popup content
        document.getElementById('global-prayer-title').textContent = this.getPrayerNameInCurrentLanguage(prayer.name);
        document.getElementById('current-prayer-name').textContent = this.getPrayerNameInCurrentLanguage(prayer.name);
        document.getElementById('prayer-time-display').textContent = prayer.time;
        document.getElementById('prayer-azan-info').textContent = `Using ${this.currentSettings.azanStyle.charAt(0).toUpperCase() + this.currentSettings.azanStyle.slice(1)} Azan`;
        document.getElementById('global-prayer-status').textContent = 'Playing Azan...';
        document.getElementById('prayer-location').textContent = `Location: ${this.getCurrentLocationName()}`;

        // Show popup
        const overlay = document.getElementById('global-prayer-alert-overlay');
        overlay.style.display = 'flex';

        // Update region indicator
        const regionIndicator = document.getElementById('prayer-region-indicator');
        regionIndicator.textContent = this.getRegionEmoji(this.currentSettings.region);

        // Mute all components
        this.muteAllPlatformComponents();

        // Play appropriate azan
        this.playGlobalAzan(azanFile, prayer.key);

        // Start timer
        this.startAzanTimer();

        // Auto close after 4 minutes
        this.alertTimeout = setTimeout(() => {
            this.closeGlobalPrayerAlert();
        }, 240000);
    }

    getAzanFileForPrayer(prayerKey) {
        const config = this.azanConfiguration.prayers[prayerKey];
        if (!config) return 'azan1.mp3';

        // Choose azan based on settings
        if (this.currentSettings.useRegional) {
            const regionalConfig = this.azanConfiguration.regional[this.currentSettings.region];
            if (regionalConfig && regionalConfig[prayerKey]) {
                return regionalConfig[prayerKey];
            }
        }

        return config[this.currentSettings.azanStyle] || config.primary;
    }

    playGlobalAzan(azanFile, prayerKey) {
        try {
            this.stopAzan();

            this.prayerAudio = new Audio(azanFile);
            this.prayerAudio.volume = this.currentSettings.volume;
            this.prayerAudio.loop = false;

            this.prayerAudio.addEventListener('ended', () => {
                document.getElementById('global-prayer-status').textContent = 'Azan completed';
                
                setTimeout(() => {
                    this.closeGlobalPrayerAlert();
                }, 3000);
            });

            this.prayerAudio.addEventListener('error', (error) => {
                console.error('Error playing azan:', error);
                // Try fallback azan
                this.tryFallbackAzan(prayerKey);
            });

            this.prayerAudio.play().catch(error => {
                console.error('Error playing azan:', error);
                this.tryFallbackAzan(prayerKey);
            });

        } catch (error) {
            console.error('Error setting up azan:', error);
            this.tryFallbackAzan(prayerKey);
        }
    }

    tryFallbackAzan(prayerKey) {
        // Try different azan files as fallbacks
        const fallbackFiles = ['azan1.mp3', 'azan2.mp3', 'azan3.mp3', 'azan4.mp3', 'azan5.mp3'];
        let currentIndex = 0;

        const tryNext = () => {
            if (currentIndex < fallbackFiles.length) {
                this.prayerAudio = new Audio(fallbackFiles[currentIndex]);
                this.prayerAudio.volume = this.currentSettings.volume;
                this.prayerAudio.play()
                    .then(() => {
                        document.getElementById('global-prayer-status').textContent = `Playing fallback azan (${currentIndex + 1})`;
                    })
                    .catch(() => {
                        currentIndex++;
                        tryNext();
                    });
            } else {
                document.getElementById('global-prayer-status').textContent = 'All azan files failed to play';
            }
        };

        tryNext();
    }

    playPreviousAzan() {
        if (this.currentPrayerIndex > 0) {
            const previousPrayer = this.prayerTimes[this.currentPrayerIndex - 1];
            this.showGlobalPrayerAlert(previousPrayer, this.currentPrayerIndex - 1);
        }
    }

    playNextAzan() {
        if (this.currentPrayerIndex < this.prayerTimes.length - 1) {
            const nextPrayer = this.prayerTimes[this.currentPrayerIndex + 1];
            this.showGlobalPrayerAlert(nextPrayer, this.currentPrayerIndex + 1);
        }
    }

    toggleAzanPlayback() {
        if (this.prayerAudio) {
            if (this.prayerAudio.paused) {
                this.prayerAudio.play();
                document.getElementById('azan-play-pause').textContent = '⏸️';
            } else {
                this.prayerAudio.pause();
                document.getElementById('azan-play-pause').textContent = '▶️';
            }
        }
    }

    startAzanTimer() {
        let seconds = 0;
        const timerElement = document.getElementById('azan-timer');
        
        const updateTimer = () => {
            if (!this.isPrayerAlertActive) return;
            
            seconds++;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerElement.textContent = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
        };

        this.timerInterval = setInterval(updateTimer, 1000);
    }

    muteAllPlatformComponents() {
        const components = ['games', 'samma3ny', 'farragna', 'oneworld', 'e7ki', 'community', 'youtube', 'music'];
        
        components.forEach(component => {
            try {
                window.postMessage({
                    type: 'MUTE_AUDIO',
                    component: component,
                    source: 'global-prayer',
                    reason: 'prayer-time'
                }, window.location.origin);
                
                this.componentMuteStates[component] = true;
                console.log(`🔇 Muted ${component} for global prayer`);
            } catch (error) {
                console.warn(`Failed to mute ${component}:`, error);
            }
        });
    }

    unmuteAllPlatformComponents() {
        const components = ['games', 'samma3ny', 'farragna', 'oneworld', 'e7ki', 'community', 'youtube', 'music'];
        
        components.forEach(component => {
            try {
                if (this.componentMuteStates[component]) {
                    window.postMessage({
                        type: 'UNMUTE_AUDIO',
                        component: component,
                        source: 'global-prayer',
                        reason: 'prayer-ended'
                    }, window.location.origin);
                    
                    delete this.componentMuteStates[component];
                    console.log(`🔊 Unmuted ${component} after global prayer`);
                }
            } catch (error) {
                console.warn(`Failed to unmute ${component}:`, error);
            }
        });
    }

    stopAzan() {
        if (this.prayerAudio) {
            this.prayerAudio.pause();
            this.prayerAudio.currentTime = 0;
            this.prayerAudio = null;
        }
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    closeGlobalPrayerAlert() {
        console.log('🕌 Closing global prayer alert');
        
        if (this.alertTimeout) {
            clearTimeout(this.alertTimeout);
            this.alertTimeout = null;
        }

        this.stopAzan();
        this.unmuteAllPlatformComponents();

        const overlay = document.getElementById('global-prayer-alert-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }

        this.isPrayerAlertActive = false;
        this.currentPrayerIndex = -1;
        
        // Notify other components
        this.broadcastPrayerAlertClosed();
    }

    setupGlobalCommunication() {
        // Listen for messages from all platform components
        window.addEventListener('message', (event) => {
            const { data } = event;
            
            switch (data.type) {
                case 'REQUEST_PRAYER_TIMES':
                    this.sendPrayerTimesToComponent(event.source);
                    break;
                    
                case 'REQUEST_PRAYER_STATUS':
                    this.sendPrayerStatusToComponent(event.source);
                    break;
                    
                case 'TRIGGER_PRAYER_ALERT':
                    this.triggerPrayerAlertForComponent(data.prayerName, event.source);
                    break;
                    
                case 'UPDATE_PRAYER_SETTINGS':
                    this.updateSettingsFromComponent(data.settings);
                    break;
                    
                case 'GET_ALL_AZAN_FILES':
                    this.sendAzanFileListToComponent(event.source);
                    break;
                    
                default:
                    // Forward to old prayer alert system for compatibility
                    if (window.prayerAlertSystem && window.prayerAlertSystem.handleMessage) {
                        window.prayerAlertSystem.handleMessage(data, event.source);
                    }
            }
        });

        // Broadcast system availability
        setTimeout(() => {
            this.broadcastSystemAvailability();
        }, 1000);
    }

    setupGlobalAudioManagement() {
        // Handle system-wide audio events
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isPrayerAlertActive) {
                // Continue playing azan even when tab is hidden
                console.log('🕌 Tab hidden but continuing azan playback');
            }
        });

        // Handle beforeunload
        window.addEventListener('beforeunload', (e) => {
            if (this.isPrayerAlertActive) {
                e.preventDefault();
                e.returnValue = 'Prayer is currently in progress. Are you sure you want to leave?';
                return 'Prayer is currently in progress. Are you sure you want to leave?';
            }
        });
    }

    // Utility methods
    getPrayerNameInCurrentLanguage(prayerName) {
        const prayerNames = this.prayerNames[this.currentSettings.language] || this.prayerNames.en;
        const prayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        const index = prayerKeys.indexOf(prayerName.toLowerCase());
        return index >= 0 ? prayerNames[index] : prayerName;
    }

    getCurrentLocationName() {
        const regionNames = {
            mecca: 'Mecca, Saudi Arabia',
            madinah: 'Medina, Saudi Arabia',
            cairo: 'Cairo, Egypt',
            istanbul: 'Istanbul, Turkey',
            jakarta: 'Jakarta, Indonesia',
            karachi: 'Karachi, Pakistan'
        };
        return regionNames[this.currentSettings.region] || 'Unknown Location';
    }

    getRegionEmoji(region) {
        const emojis = {
            mecca: '🕌',
            madinah: '🕌',
            cairo: '🏺',
            istanbul: '🏰',
            jakarta: '🏝️',
            karachi: '🌴'
        };
        return emojis[region] || '🕌';
    }

    // Broadcast methods
    broadcastPrayerTimesUpdate() {
        window.postMessage({
            type: 'PRAYER_TIMES_UPDATED',
            prayerTimes: this.prayerTimes,
            source: 'global-prayer-system'
        }, window.location.origin);
    }

    broadcastPrayerAlertClosed() {
        window.postMessage({
            type: 'PRAYER_ALERT_CLOSED',
            source: 'global-prayer-system'
        }, window.location.origin);
    }

    broadcastSystemAvailability() {
        window.postMessage({
            type: 'GLOBAL_PRAYER_SYSTEM_READY',
            azanFiles: Object.keys(this.azanConfiguration.prayers).flatMap(key => 
                Object.values(this.azanConfiguration.prayers[key])
            ),
            supportedLanguages: Object.keys(this.prayerNames),
            supportedRegions: Object.keys(this.azanConfiguration.regional),
            source: 'global-prayer-system'
        }, window.location.origin);
    }

    // Settings management
    loadSettings() {
        const savedSettings = localStorage.getItem('globalPrayerSettings');
        if (savedSettings) {
            this.currentSettings = { ...this.currentSettings, ...JSON.parse(savedSettings) };
        }
    }

    saveSettings() {
        localStorage.setItem('globalPrayerSettings', JSON.stringify(this.currentSettings));
    }

    updateSettings(newSettings) {
        this.currentSettings = { ...this.currentSettings, ...newSettings };
        this.saveSettings();
        
        // Broadcast settings update
        window.postMessage({
            type: 'PRAYER_SETTINGS_UPDATED',
            settings: this.currentSettings,
            source: 'global-prayer-system'
        }, window.location.origin);
    }

    // Public API for other components
    getCurrentPrayerTimes() {
        return this.prayerTimes;
    }

    getNextPrayer() {
        if (this.nextPrayerIndex >= 0 && this.nextPrayerIndex < this.prayerTimes.length) {
            return {
                prayer: this.prayerTimes[this.nextPrayerIndex],
                index: this.nextPrayerIndex
            };
        }
        return null;
    }

    isAutoAlertEnabled() {
        return this.currentSettings.autoAlert;
    }

    setAutoAlert(enabled) {
        this.updateSettings({ autoAlert: enabled });
        
        if (enabled) {
            this.startPrayerMonitoring();
        } else {
            if (this.alertCheckInterval) {
                clearInterval(this.alertCheckInterval);
                this.alertCheckInterval = null;
            }
        }
    }

    // Destroy method
    destroy() {
        if (this.alertCheckInterval) {
            clearInterval(this.alertCheckInterval);
        }
        this.closeGlobalPrayerAlert();
        
        const overlay = document.getElementById('global-prayer-alert-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        console.log('🕌 Global Prayer System destroyed');
    }
}

// Initialize global prayer system
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.globalPrayerSystem = new GlobalPrayerSystem();
        window.GlobalPrayerSystem = GlobalPrayerSystem; // Make class available globally
        
        console.log('🌍 Global Prayer System with 11 azan files loaded successfully');
    }, 1000);
});

// Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.globalPrayerSystem = new GlobalPrayerSystem();
            window.GlobalPrayerSystem = GlobalPrayerSystem;
            
            console.log('🌍 Global Prayer System initialized (DOM ready)');
        }, 1000);
    });
} else {
    setTimeout(() => {
        window.globalPrayerSystem = new GlobalPrayerSystem();
        window.GlobalPrayerSystem = GlobalPrayerSystem;
        
        console.log('🌍 Global Prayer System initialized (DOM already ready)');
    }, 1000);
}
