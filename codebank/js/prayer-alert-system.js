// Automatic Prayer Alert System
// This system monitors prayer times and shows automatic alerts with azan

class PrayerAlertSystem {
    constructor() {
        this.prayerTimes = [];
        this.nextPrayerIndex = -1;
        this.isPrayerAlertActive = false;
        this.prayerAudio = null;
        this.alertTimeout = null;
        this.prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        this.azanFiles = [
            'azan1.mp3', // Fajr
            'azan2.mp3', // Dhuhr  
            'azan3.mp3', // Asr
            'azan4.mp3', // Maghrib
            'azan5.mp3'  // Isha
        ];
        this.alertCheckInterval = null;
        this.videoWasMuted = false;
        this.originalVolume = 1;
        
        this.initializePrayerAlertSystem();
    }

    initializePrayerAlertSystem() {
        console.log('🕌 Initializing Prayer Alert System...');
        
        // Create prayer alert popup elements
        this.createPrayerAlertPopup();
        
        // Load saved prayer times
        this.loadPrayerTimes();
        
        // Check if auto prayer alerts are enabled
        if (this.isAutoPrayerAlertEnabled()) {
            console.log('🕌 Auto prayer alerts enabled - starting monitoring');
            this.startPrayerMonitoring();
        } else {
            console.log('🕌 Auto prayer alerts disabled - monitoring paused');
        }
        
        // Listen for prayer time updates from other scripts
        this.setupPrayerTimeListeners();
    }

    createPrayerAlertPopup() {
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.id = 'prayer-alert-overlay';
        overlay.className = 'prayer-alert-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = `
            <div class="prayer-alert-popup">
                <div class="prayer-alert-content">
                    <div class="prayer-alert-header">
                        <h2 id="prayer-alert-title">Prayer Time</h2>
                        <button id="prayer-alert-close" class="prayer-alert-close-btn">✖</button>
                    </div>
                    <div class="prayer-alert-body">
                        <div class="prayer-icon">🕌</div>
                        <div class="prayer-name" id="current-prayer-name">Prayer Name</div>
                        <div class="prayer-status" id="prayer-alert-status">Playing Azan...</div>
                        <div class="azan-timer" id="azan-timer">00:00</div>
                    </div>
                    <div class="prayer-alert-footer">
                        <small>Click outside to close</small>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Add event listeners
        this.setupPopupEventListeners(overlay);
        
        console.log('✅ Prayer alert popup created');
    }

    setupPopupEventListeners(overlay) {
        // Close button
        const closeBtn = overlay.querySelector('#prayer-alert-close');
        closeBtn.addEventListener('click', () => {
            this.closePrayerAlert();
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closePrayerAlert();
            }
        });
        
        // Prevent click on popup content from closing
        const popup = overlay.querySelector('.prayer-alert-popup');
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    loadPrayerTimes() {
        // Get prayer times from existing system
        this.fetchCurrentPrayerTimes();
    }

    async fetchCurrentPrayerTimes() {
        try {
            // Try to get coordinates from localStorage (same as azan-clock.html)
            const savedLat = localStorage.getItem('userLat');
            const savedLng = localStorage.getItem('userLng');
            
            if (savedLat && savedLng) {
                await this.fetchPrayerTimesFromAPI(parseFloat(savedLat), parseFloat(savedLng));
            } else {
                // Get current location
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const { latitude, longitude } = position.coords;
                            await this.fetchPrayerTimesFromAPI(latitude, longitude);
                        },
                        (error) => {
                            console.error('Geolocation error:', error);
                            // Use Mecca coordinates as fallback
                            this.fetchPrayerTimesFromAPI(21.4225, 39.8262);
                        }
                    );
                } else {
                    // Use Mecca coordinates as fallback
                    this.fetchPrayerTimesFromAPI(21.4225, 39.8262);
                }
            }
        } catch (error) {
            console.error('Error loading prayer times:', error);
        }
    }

    async fetchPrayerTimesFromAPI(lat, lon) {
        try {
            // Check if we have internet connection
            if (!navigator.onLine) {
                console.log('🕌 Offline - loading prayer times from cache');
                this.loadPrayerTimesFromCache();
                return;
            }

            const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`);
            
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();
            const timings = data.data.timings;

            this.prayerTimes = [
                { name: 'Fajr', time: timings.Fajr, fullName: 'Fajr Prayer' },
                { name: 'Dhuhr', time: timings.Dhuhr, fullName: 'Dhuhr Prayer' },
                { name: 'Asr', time: timings.Asr, fullName: 'Asr Prayer' },
                { name: 'Maghrib', time: timings.Maghrib, fullName: 'Maghrib Prayer' },
                { name: 'Isha', time: timings.Isha, fullName: 'Isha Prayer' }
            ];

            // Save to cache
            localStorage.setItem('cachedPrayerTimes', JSON.stringify(this.prayerTimes));
            localStorage.setItem('cachedPrayerTimesDate', new Date().toDateString());

            console.log('🕌 Prayer times loaded and cached:', this.prayerTimes);
            this.calculateNextPrayer();
        } catch (error) {
            // Silently handle fetch errors (CORS, network, etc.)
            console.log('🕌 Prayer API fetch failed - using cache');
            this.loadPrayerTimesFromCache();
        }
    }

    loadPrayerTimesFromCache() {
        try {
            const cachedData = localStorage.getItem('cachedPrayerTimes');
            if (cachedData) {
                this.prayerTimes = JSON.parse(cachedData);
                console.log('🕌 Loaded prayer times from cache:', this.prayerTimes);
                this.calculateNextPrayer();
            } else {
                console.warn('🕌 No cached prayer times available');
                // Use default Mecca times as extreme fallback
                this.prayerTimes = [
                    { name: 'Fajr', time: '05:00', fullName: 'Fajr Prayer' },
                    { name: 'Dhuhr', time: '12:20', fullName: 'Dhuhr Prayer' },
                    { name: 'Asr', time: '15:45', fullName: 'Asr Prayer' },
                    { name: 'Maghrib', time: '18:30', fullName: 'Maghrib Prayer' },
                    { name: 'Isha', time: '20:00', fullName: 'Isha Prayer' }
                ];
                this.calculateNextPrayer();
            }
        } catch (e) {
            console.error('Error loading prayer cache:', e);
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
        // Check every 30 seconds for prayer time
        this.alertCheckInterval = setInterval(() => {
            this.checkPrayerTime();
        }, 30000);

        // Also check immediately
        this.checkPrayerTime();
        
        console.log('✅ Prayer monitoring started');
    }

    checkPrayerTime() {
        if (this.isPrayerAlertActive) return; // Don't check if alert is already active

        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

        for (let i = 0; i < this.prayerTimes.length; i++) {
            const prayer = this.prayerTimes[i];
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const prayerTimeMinutes = hours * 60 + minutes;
            
            // Check if it's prayer time (within 2 minutes window)
            const timeDiff = Math.abs(currentTimeMinutes - prayerTimeMinutes);
            
            if (timeDiff <= 1) { // Within 1 minute window
                this.showPrayerAlert(prayer, i);
                return;
            }
        }
    }

    showPrayerAlert(prayer, index) {
        console.log(`🕌 Showing prayer alert for ${prayer.name}`);
        
        this.isPrayerAlertActive = true;
        this.currentPrayerIndex = index;

        // Update popup content
        document.getElementById('prayer-alert-title').textContent = prayer.fullName;
        document.getElementById('current-prayer-name').textContent = prayer.name;
        document.getElementById('prayer-alert-status').textContent = 'Playing Azan...';

        // Show popup
        const overlay = document.getElementById('prayer-alert-overlay');
        overlay.style.display = 'flex';

        // Mute video
        this.muteVideo();

        // Play azan
        this.playAzan(index);

        // Start timer display
        this.startAzanTimer();

        // Auto close after azan duration (approximately 3-4 minutes)
        this.alertTimeout = setTimeout(() => {
            this.closePrayerAlert();
        }, 240000); // 4 minutes max
    }

    playAzan(index) {
        try {
            // Stop any existing audio
            this.stopAzan();

            // Create new audio element
            this.prayerAudio = new Audio();
            
            // Use appropriate azan file or fallback
            if (index < this.azanFiles.length) {
                this.prayerAudio.src = this.azanFiles[index];
            } else {
                this.prayerAudio.src = 'azan1.mp3'; // Default
            }

            this.prayerAudio.volume = 0.8;
            this.prayerAudio.loop = false;

            // When azan ends, update status
            this.prayerAudio.addEventListener('ended', () => {
                document.getElementById('prayer-alert-status').textContent = 'Azan completed';
                
                // Auto close after a short delay
                setTimeout(() => {
                    this.closePrayerAlert();
                }, 2000);
            });

            // Play azan
            this.prayerAudio.play().catch(error => {
                console.error('Error playing azan:', error);
                document.getElementById('prayer-alert-status').textContent = 'Azan failed to play';
            });

        } catch (error) {
            console.error('Error setting up azan:', error);
            document.getElementById('prayer-alert-status').textContent = 'Error playing azan';
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
            timerElement.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        this.timerInterval = setInterval(updateTimer, 1000);
    }

    muteVideo() {
        try {
            // Mute YouTube video
            if (window.player && typeof player.mute === 'function') {
                if (!player.isMuted()) {
                    this.videoWasMuted = false;
                    player.mute();
                    console.log('🔇 YouTube video muted for prayer');
                } else {
                    this.videoWasMuted = true; // Already muted
                }
            }
            
            // Mute all other components (games, samma3ny, farragna, etc.)
            this.muteAllComponents();
            
        } catch (error) {
            console.error('Error muting media:', error);
        }
    }
    
    muteAllComponents() {
        const components = ['games', 'samma3ny', 'farragna', 'oneworld', 'e7ki'];

        // Send mute messages to all components
        components.forEach(component => {
            try {
                window.postMessage({
                    type: 'MUTE_AUDIO',
                    component: component,
                    source: 'prayer-alert'
                }, window.location.origin);
                console.log(`🔇 Muted ${component} for prayer`);
            } catch (error) {
                console.warn(`Failed to mute ${component}:`, error);
            }
        });
    }
    
    unmuteAllComponents() {
        const components = ['games', 'samma3ny', 'farragna', 'oneworld', 'e7ki', 'community'];
        
        // Send unmute messages to all components
        components.forEach(component => {
            try {
                window.postMessage({
                    type: 'UNMUTE_AUDIO',
                    component: component,
                    source: 'prayer-alert'
                }, window.location.origin);
                console.log(`🔊 Unmuted ${component} after prayer`);
            } catch (error) {
                console.warn(`Failed to unmute ${component}:`, error);
            }
        });
    }

    unmuteVideo() {
        try {
            // Unmute YouTube video if it wasn't muted before
            if (window.player && typeof player.unMute === 'function') {
                if (!this.videoWasMuted) {
                    player.unMute();
                    console.log('🔊 YouTube video unmuted after prayer');
                }
            }
            
            // Unmute all other components
            this.unmuteAllComponents();
            
        } catch (error) {
            console.error('Error unmuting media:', error);
        }
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

    closePrayerAlert() {
        console.log('🕌 Closing prayer alert');
        
        // Clear timeout
        if (this.alertTimeout) {
            clearTimeout(this.alertTimeout);
            this.alertTimeout = null;
        }

        // Stop azan
        this.stopAzan();

        // Hide popup
        const overlay = document.getElementById('prayer-alert-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }

        // Unmute video
        this.unmuteVideo();

        // Reset state
        this.isPrayerAlertActive = false;
        this.currentPrayerIndex = -1;
    }

    setupPrayerTimeListeners() {
        // Listen for prayer time updates from other scripts
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type === 'PRAYER_TIMES_UPDATED') {
                console.log('🕌 Prayer times updated from external source');
                this.prayerTimes = event.data.prayerTimes;
                this.calculateNextPrayer();
            }
        });

        // Listen for toggle messages from azan-clock popup
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type === 'AUTO_PRAYER_ALERT_TOGGLE') {
                console.log(`🕌 Auto prayer alert ${event.data.enabled ? 'enabled' : 'disabled'} from popup`);
                this.handleAutoToggle(event.data.enabled);
            }
        });
    }

    handleAutoToggle(enabled) {
        if (enabled) {
            // Enable automatic prayer alerts
            if (this.alertCheckInterval) {
                clearInterval(this.alertCheckInterval);
            }
            this.startPrayerMonitoring();
            localStorage.setItem('autoPrayerAlertEnabled', 'true');
            console.log('🕌 Auto prayer alert monitoring started');
        } else {
            // Disable automatic prayer alerts
            if (this.alertCheckInterval) {
                clearInterval(this.alertCheckInterval);
                this.alertCheckInterval = null;
            }
            localStorage.setItem('autoPrayerAlertEnabled', 'false');
            
            // Close any active prayer alert
            if (this.isPrayerAlertActive) {
                this.closePrayerAlert();
            }
            console.log('🕌 Auto prayer alert monitoring stopped');
        }
    }

    // Check if auto prayer alerts are enabled
    isAutoPrayerAlertEnabled() {
        const savedState = localStorage.getItem('autoPrayerAlertEnabled');
        return savedState === 'true'; // Default to disabled if not set
    }

    // Send current status to azan-clock popup
    sendStatusToPopup() {
        const isEnabled = this.isAutoPrayerAlertEnabled();
        
        // Send message to all popup windows
        window.postMessage({
            type: 'PRAYER_ALERT_STATUS',
            enabled: isEnabled
        }, window.location.origin);
        
        console.log(`🕌 Sent status to popup: ${isEnabled ? 'enabled' : 'disabled'}`);
    }

    // Public method to manually trigger prayer alert (for testing)
    triggerPrayerAlert(prayerName = 'Fajr') {
        const prayer = this.prayerTimes.find(p => p.name === prayerName);
        if (prayer) {
            const index = this.prayerTimes.indexOf(prayer);
            this.showPrayerAlert(prayer, index);
        }
    }

    // Get current prayer times (for external access)
    getCurrentPrayerTimes() {
        return this.prayerTimes;
    }

    // Get next prayer information
    getNextPrayer() {
        if (this.nextPrayerIndex >= 0 && this.nextPrayerIndex < this.prayerTimes.length) {
            return {
                prayer: this.prayerTimes[this.nextPrayerIndex],
                index: this.nextPrayerIndex
            };
        }
        return null;
    }

    // Destroy the prayer alert system
    destroy() {
        if (this.alertCheckInterval) {
            clearInterval(this.alertCheckInterval);
        }
        this.closePrayerAlert();
        
        const overlay = document.getElementById('prayer-alert-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        console.log('🕌 Prayer Alert System destroyed');
    }
}

// Initialize prayer alert system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        window.prayerAlertSystem = new PrayerAlertSystem();
        window.globalPrayerAlertSystem = window.prayerAlertSystem; // Global reference for other components
        console.log('🕌 Prayer Alert System initialized successfully');
    }, 2000);
});

// Export for manual initialization if needed
window.PrayerAlertSystem = PrayerAlertSystem;
