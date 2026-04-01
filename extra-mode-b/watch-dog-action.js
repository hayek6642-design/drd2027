// Action Layer: Watch-dog prayer time logic for Extra Mode
// Path: /extra-mode-b/watch-dog-action.js

let PRAYER_TIMES = [];
let watchDogTimerId = null;

/**
 * ACTION LAYER Responsibilities:
 * - Decide WHEN to trigger states
 * - Connect to external data (Aladhan API)
 * - Do NOT create dog instance
 * - Do NOT import Three.js
 */

// Fetch real local prayer times using Aladhan API
function fetchPrayerTimes() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lon}&method=2`;
      fetch(url)
        .then(response => response.json())
        .then(data => {
          if (data && data.data && data.data.timings) {
            const t = data.data.timings;
            PRAYER_TIMES = [
              { name: 'Fajr', time: t.Fajr },
              { name: 'Dhuhr', time: t.Dhuhr },
              { name: 'Asr', time: t.Asr },
              { name: 'Maghrib', time: t.Maghrib },
              { name: 'Isha', time: t.Isha }
            ];
            console.log('[ActionLayer] Fetched prayer times:', PRAYER_TIMES);
          }
        })
        .catch(err => {
          console.error('[ActionLayer] Failed to fetch prayer times:', err);
          // FIX: Keep previous PRAYER_TIMES if already populated, don't wipe them
          if (PRAYER_TIMES.length === 0) {
            console.warn('[ActionLayer] No fallback prayer times available');
          }
        });
    }, function(error) {
      console.error('[ActionLayer] Geolocation error:', error);
    });
  }
}

// Initial fetch
fetchPrayerTimes();

// Returns true if current time is within 30 min before/after any prayer
function isWithinPrayerWindow() {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const prayer of PRAYER_TIMES) {
    let timeStr = prayer.time.split(' ')[0];
    const [h, m] = timeStr.split(':').map(Number);
    const prayerMinutes = h * 60 + m;
    if (Math.abs(nowMinutes - prayerMinutes) <= 30) {
      return true;
    }
  }
  return false;
}

/**
 * Triggers the watchdog state through the Adapter singleton
 * @param {boolean} active 
 */
function setWatchDogActive(active) {
  window.watchDogActive = active;
  
  // 🔗 Communication: Action Layer -> Adapter
  const guardian = window.__GUARDIAN__;
  const tm = window.TimerManager;
  
  if (active) {
    console.log('[ActionLayer] Watch-dog activated');
    try { document.body.classList.add('watch-dog-active'); } catch(_){}
    
    // Set 3D state to monitoring if active
    if (guardian && typeof guardian.setState === 'function') {
      guardian.setState('monitoring');
    }
  } else {
    console.log('[ActionLayer] Watch-dog deactivated');
    try { document.body.classList.remove('watch-dog-active'); } catch(_){}
    
    // Set 3D state to idle if deactivated
    if (guardian && typeof guardian.setState === 'function') {
      guardian.setState('idle');
    }
    
    if (watchDogTimerId) {
      if (tm) {
        tm.clearTimeout(watchDogTimerId);
      } else {
        clearTimeout(watchDogTimerId);
      }
      watchDogTimerId = null;
    }
  }
}

// Handle Extra Mode changes
function handleExtraModeChange(isActive) {
  if (isActive) {
    if (isWithinPrayerWindow()) {
      setWatchDogActive(false);
    } else {
      setWatchDogActive(true);
    }
  } else {
    setWatchDogActive(false);
  }
}

// Periodic check using TimerManager
if (window.TimerManager) {
  window.TimerManager.setInterval(() => {
    if (window.extraModeActive) {
      handleExtraModeChange(true);
    }
  }, 60000);
} else {
  console.warn('[ActionLayer] TimerManager not found, using direct setInterval');
  setInterval(() => {
    if (window.extraModeActive) {
      handleExtraModeChange(true);
    }
  }, 60000);
}

// Global exports
window.handleExtraModeChange = handleExtraModeChange;
window.isWithinPrayerWindow = isWithinPrayerWindow;
