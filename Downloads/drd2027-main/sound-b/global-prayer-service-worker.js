/**
 * Global Prayer System Service Worker
 * Handles background notifications for prayer times even when the app is closed
 */

const CACHE_NAME = 'global-prayer-system-v1.0.0';
const PRAYER_CACHE = 'prayer-times-cache-v1';
const AZAN_CACHE = 'azan-files-cache-v1';

// Core prayer notification configuration
const PRAYER_CONFIG = {
    notificationsEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    maxNotificationsPerDay: 5,
    quietHours: { start: 22, end: 5 }, // 10 PM to 5 AM
    backgroundSync: true
};

// Prayer names in multiple languages
const PRAYER_NAMES = {
    en: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
    ar: ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'],
    ur: ['فجر', 'ظهر', 'عصر', 'مغرب', 'عشاء'],
    tr: ['Sabah', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'],
    id: ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'],
    fa: ['فجر', 'ظهر', 'عصر', 'مغرب', 'عشاء'],
    hi: ['फजर', 'जुहर', 'आसर', 'मगरिब', 'इशा']
};

// Regional azan file mappings
const REGIONAL_AZAN = {
    mecca: { fajr: 'azan1.mp3', dhuhr: 'azan2.mp3', asr: 'azan3.mp3', maghrib: 'azan4.mp3', isha: 'azan5.mp3' },
    madinah: { fajr: 'azan6.mp3', dhuhr: 'azan7.mp3', asr: 'azan8.mp3', maghrib: 'azan9.mp3', isha: 'azan10.mp3' },
    cairo: { fajr: 'azan11.mp3', dhuhr: 'azan1.mp3', asr: 'azan2.mp3', maghrib: 'azan3.mp3', isha: 'azan4.mp3' },
    istanbul: { fajr: 'azan5.mp3', dhuhr: 'azan6.mp3', asr: 'azan7.mp3', maghrib: 'azan8.mp3', isha: 'azan9.mp3' },
    jakarta: { fajr: 'azan10.mp3', dhuhr: 'azan11.mp3', asr: 'azan1.mp3', maghrib: 'azan2.mp3', isha: 'azan3.mp3' },
    karachi: { fajr: 'azan4.mp3', dhuhr: 'azan5.mp3', asr: 'azan6.mp3', maghrib: 'azan7.mp3', isha: 'azan8.mp3' }
};

// Service Worker Installation
self.addEventListener('install', event => {
    console.log('🕌 Global Prayer Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache essential files
            caches.open(CACHE_NAME).then(cache => {
                return cache.addAll([
                    '/yt-coder/global-prayer-system.js',
                    '/yt-coder/global-prayer-communication.js',
                    '/yt-coder/global-prayer-dashboard.html'
                ]);
            }),
            
            // Cache azan files
            caches.open(AZAN_CACHE).then(cache => {
                const azanFiles = [
                    '/yt-coder/azan1.mp3', '/yt-coder/azan2.mp3', '/yt-coder/azan3.mp3',
                    '/yt-coder/azan4.mp3', '/yt-coder/azan5.mp3', '/yt-coder/azan6.mp3',
                    '/yt-coder/azan7.mp3', '/yt-coder/azan8.mp3', '/yt-coder/azan9.mp3',
                    '/yt-coder/azan10.mp3', '/yt-coder/azan11.mp3'
                ];
                return cache.addAll(azanFiles);
            }),
            
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
    );
});

// Service Worker Activation
self.addEventListener('activate', event => {
    console.log('🕌 Global Prayer Service Worker activated');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && 
                            cacheName !== PRAYER_CACHE && 
                            cacheName !== AZAN_CACHE) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all clients
            self.clients.claim()
        ])
    );
});

// Push Notification Handler
self.addEventListener('push', event => {
    console.log('🕌 Push notification received');
    
    const options = {
        body: 'Prayer notification',
        icon: '/yt-coder/assets/icons/prayer-icon.png',
        badge: '/yt-coder/assets/icons/prayer-badge.png',
        sound: '/yt-coder/azan1.mp3',
        vibrate: [200, 100, 200, 100, 200],
        data: {
            timestamp: Date.now(),
            type: 'prayer_notification'
        },
        actions: [
            {
                action: 'open_prayer_app',
                title: 'Open Prayer App',
                icon: '/yt-coder/assets/icons/open-icon.png'
            },
            {
                action: 'snooze_10min',
                title: 'Snooze 10 min',
                icon: '/yt-coder/assets/icons/snooze-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/yt-coder/assets/icons/dismiss-icon.png'
            }
        ],
        requireInteraction: true,
        silent: false,
        tag: 'prayer-notification',
        renotify: true
    };
    
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('🕌 Push data:', data);
            
            // Update notification content based on prayer data
            const prayerName = data.prayerName || 'Prayer';
            const timeLeft = data.timeLeft || '';
            const location = data.location || '';
            
            options.body = `🕌 ${prayerName} ${timeLeft ? `in ${timeLeft}` : 'now'}`;
            if (location) {
                options.body += ` - ${location}`;
            }
            
            options.data = { ...options.data, ...data };
            
            // Add specific azan sound for this prayer
            if (data.prayerKey && data.region) {
                const azanFile = getAzanFileForPrayer(data.prayerKey, data.region);
                if (azanFile) {
                    options.sound = `/yt-coder/${azanFile}`;
                }
            }
            
        } catch (error) {
            console.error('Error parsing push data:', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification('🕌 Prayer Time', options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
    console.log('🕌 Notification clicked:', event.action);
    
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data || {};
    
    switch (action) {
        case 'open_prayer_app':
            openPrayerApp();
            break;
            
        case 'snooze_10min':
            snoozeNotification(10);
            break;
            
        case 'dismiss':
            // Just close the notification (already done above)
            console.log('🕌 Prayer notification dismissed');
            break;
            
        default:
            // Default action - open prayer app
            openPrayerApp();
            break;
    }
});

// Background Sync Handler
self.addEventListener('sync', event => {
    console.log('🕌 Background sync triggered:', event.tag);
    
    if (event.tag === 'prayer-times-sync') {
        event.waitUntil(syncPrayerTimes());
    } else if (event.tag === 'azan-update-sync') {
        event.waitUntil(updateAzanFiles());
    }
});

// Message Handler for communication with main app
self.addEventListener('message', event => {
    console.log('🕌 Service Worker received message:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'SCHEDULE_PRAYER_NOTIFICATION':
            schedulePrayerNotification(data);
            break;
            
        case 'CANCEL_PRAYER_NOTIFICATION':
            cancelPrayerNotification(data.prayerId);
            break;
            
        case 'GET_CACHED_PRAYER_TIMES':
            getCachedPrayerTimes().then(times => {
                event.ports[0].postMessage({ type: 'PRAYER_TIMES', data: times });
            });
            break;
            
        case 'UPDATE_SETTINGS':
            updateNotificationSettings(data);
            break;
            
        case 'TEST_NOTIFICATION':
            showTestNotification();
            break;
    }
});

// Utility Functions

function openPrayerApp() {
    // Focus or open the prayer app
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
            if (clients.length > 0) {
                // Focus existing window
                return clients[0].focus();
            } else {
                // Open new window
                return self.clients.openWindow('/yt-coder/global-prayer-dashboard.html');
            }
        })
        .catch(error => {
            console.error('Error opening prayer app:', error);
            // Fallback to opening URL
            return self.clients.openWindow('/yt-coder/');
        });
}

function snoozeNotification(minutes) {
    console.log(`oreauing notification for ${minutes} minutes`);
    
    // Schedule a new notification after the snooze period
    setTimeout(() => {
        showNotification('🕌 Prayer Reminder', {
            body: 'Prayer time reminder',
            tag: 'snoozed-prayer',
            requireInteraction: true
        });
    }, minutes * 60 * 1000);
}

async function syncPrayerTimes() {
    try {
        console.log('🕌 Syncing prayer times in background...');
        
        // Get location from cache or use default
        const cachedLocation = await getCachedLocation();
        const { latitude, longitude } = cachedLocation || { latitude: 21.4225, longitude: 39.8262 };
        
        // Fetch fresh prayer times
        const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`);
        const data = await response.json();
        
        // Cache the prayer times
        await cachePrayerTimes(data.data.timings);
        
        console.log('🕌 Prayer times synced successfully');
        
        return data.data.timings;
    } catch (error) {
        console.error('Error syncing prayer times:', error);
        throw error;
    }
}

async function updateAzanFiles() {
    try {
        console.log('🕌 Updating azan files cache...');
        
        const azanFiles = [
            'azan1.mp3', 'azan2.mp3', 'azan3.mp3', 'azan4.mp3', 'azan5.mp3',
            'azan6.mp3', 'azan7.mp3', 'azan8.mp3', 'azan9.mp3', 'azan10.mp3', 'azan11.mp3'
        ];
        
        const cache = await caches.open(AZAN_CACHE);
        
        // Update each azan file
        for (const file of azanFiles) {
            try {
                const response = await fetch(`/yt-coder/${file}`);
                if (response.ok) {
                    await cache.put(`/yt-coder/${file}`, response);
                    console.log(`✅ Cached ${file}`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to cache ${file}:`, error);
            }
        }
        
        console.log('🕌 Azan files update completed');
    } catch (error) {
        console.error('Error updating azan files:', error);
    }
}

function schedulePrayerNotification(data) {
    const { prayerName, prayerTime, prayerKey, region, language = 'en' } = data;
    
    // Calculate time until prayer
    const now = new Date();
    const [hours, minutes] = prayerTime.split(':').map(Number);
    const prayerDate = new Date();
    prayerDate.setHours(hours, minutes, 0, 0);
    
    // If prayer time has passed today, schedule for tomorrow
    if (prayerDate <= now) {
        prayerDate.setDate(prayerDate.getDate() + 1);
    }
    
    const timeUntilPrayer = prayerDate.getTime() - now.getTime();
    
    // Schedule notification (with 1-minute buffer before prayer)
    const notificationTime = Math.max(0, timeUntilPrayer - 60000);
    
    setTimeout(() => {
        const localizedName = getLocalizedPrayerName(prayerName, language);
        const azanFile = getAzanFileForPrayer(prayerKey, region);
        
        showNotification('🕌 Prayer Time', {
            body: `${localizedName} is starting now`,
            sound: `/yt-coder/${azanFile}`,
            data: {
                prayerName: localizedName,
                prayerKey,
                region,
                originalName: prayerName,
                timestamp: Date.now()
            }
        });
    }, notificationTime);
    
    console.log(`🕌 Scheduled notification for ${prayerName} at ${prayerDate.toLocaleString()}`);
}

function cancelPrayerNotification(prayerId) {
    // Cancel scheduled notification (implementation depends on the scheduling method used)
    console.log(`🕌 Cancelled notification for prayer: ${prayerId}`);
}

async function getCachedPrayerTimes() {
    try {
        const cache = await caches.open(PRAYER_CACHE);
        const response = await cache.match('/cached-prayer-times');
        
        if (response) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error getting cached prayer times:', error);
    }
    
    return null;
}

async function cachePrayerTimes(timings) {
    try {
        const cache = await caches.open(PRAYER_CACHE);
        const response = new Response(JSON.stringify(timings), {
            headers: { 'Content-Type': 'application/json' }
        });
        
        await cache.put('/cached-prayer-times', response);
        console.log('🕌 Prayer times cached successfully');
    } catch (error) {
        console.error('Error caching prayer times:', error);
    }
}

async function getCachedLocation() {
    try {
        const cache = await caches.open(PRAYER_CACHE);
        const response = await cache.match('/cached-location');
        
        if (response) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error getting cached location:', error);
    }
    
    return null;
}

function getLocalizedPrayerName(prayerName, language) {
    const names = PRAYER_NAMES[language] || PRAYER_NAMES.en;
    const prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const index = prayerKeys.indexOf(prayerName);
    
    return index >= 0 ? names[index] : prayerName;
}

function getAzanFileForPrayer(prayerKey, region) {
    if (region && REGIONAL_AZAN[region]) {
        return REGIONAL_AZAN[region][prayerKey] || 'azan1.mp3';
    }
    
    // Default azan files
    const defaultAzan = {
        fajr: 'azan1.mp3',
        dhuhr: 'azan2.mp3', 
        asr: 'azan3.mp3',
        maghrib: 'azan4.mp3',
        isha: 'azan5.mp3'
    };
    
    return defaultAzan[prayerKey] || 'azan1.mp3';
}

function showNotification(title, options = {}) {
    const defaultOptions = {
        icon: '/yt-coder/assets/icons/prayer-icon.png',
        badge: '/yt-coder/assets/icons/prayer-badge.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: 'prayer-notification',
        actions: [
            {
                action: 'open_prayer_app',
                title: 'Open App',
                icon: '/yt-coder/assets/icons/open-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/yt-coder/assets/icons/dismiss-icon.png'
            }
        ]
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    return self.registration.showNotification(title, finalOptions);
}

function showTestNotification() {
    showNotification('🕌 Test Prayer Notification', {
        body: 'This is a test of the Global Prayer System notification',
        tag: 'test-prayer',
        data: {
            type: 'test',
            timestamp: Date.now()
        }
    });
    
    console.log('🕌 Test notification sent');
}

function updateNotificationSettings(settings) {
    Object.assign(PRAYER_CONFIG, settings);
    console.log('🕌 Notification settings updated:', PRAYER_CONFIG);
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', event => {
        if (event.tag === 'prayer-times-refresh') {
            event.waitUntil(syncPrayerTimes());
        }
    });
}

// Handle notification close event
self.addEventListener('notificationclose', event => {
    console.log('🕌 Prayer notification closed:', event.notification.tag);
});

// Error handler
self.addEventListener('error', event => {
    console.error('🕌 Service Worker error:', event.error);
});

console.log('🕌 Global Prayer Service Worker loaded and ready');