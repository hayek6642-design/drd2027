// Sound Button Logic
// Extracted from yt-new.html

document.addEventListener('DOMContentLoaded', () => {
  const soundButton = document.getElementById('sound-button');
  const soundPopup = document.getElementById('sound-popup');
  let longPressTimer;
  let isLongPress = false;
  let timeUpdateInterval;

  // Hover popup functionality - only on left-to-right hover
  let enterX = 0;
  let hasShown = false;

  soundButton.addEventListener('mouseenter', (e) => {
    enterX = e.clientX;
    hasShown = false;
  });

  soundButton.addEventListener('mousemove', (e) => {
    if (!hasShown && e.clientX > enterX + 10) { // Moved right by at least 10px
      updatePopupContent();
      soundPopup.style.display = 'block';
      timeUpdateInterval = setInterval(updatePopupContent, 1000); // Update every second
      hasShown = true;
    }
  });

  soundButton.addEventListener('mouseleave', () => {
    soundPopup.style.display = 'none';
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
    }
    hasShown = false;
  });

  function getTimeZoneFromCountry(countryCode) {
    const timeZoneMap = {
      'US': 'America/New_York',
      'GB': 'Europe/London',
      'DE': 'Europe/Berlin',
      'FR': 'Europe/Paris',
      'AE': 'Asia/Dubai',
      'SA': 'Asia/Riyadh',
      'EG': 'Africa/Cairo',
      'PK': 'Asia/Karachi',
      'IN': 'Asia/Kolkata',
      'BD': 'Asia/Dhaka',
      'MY': 'Asia/Kuala_Lumpur',
      'ID': 'Asia/Jakarta',
      'TR': 'Europe/Istanbul',
      'IR': 'Asia/Tehran',
      'IQ': 'Asia/Baghdad',
      'JO': 'Asia/Amman',
      'LB': 'Asia/Beirut',
      'SY': 'Asia/Damascus',
      'YE': 'Asia/Aden',
      'OM': 'Asia/Muscat',
      'KW': 'Asia/Kuwait',
      'QA': 'Asia/Qatar',
      'BH': 'Asia/Bahrain',
      'IL': 'Asia/Jerusalem',
      'PS': 'Asia/Gaza',
      'MA': 'Africa/Casablanca',
      'TN': 'Africa/Tunis',
      'DZ': 'Africa/Algiers',
      'LY': 'Africa/Tripoli',
      'SD': 'Africa/Khartoum',
      'SO': 'Africa/Mogadishu',
      'ET': 'Africa/Addis_Ababa',
      'KE': 'Africa/Nairobi',
      'UG': 'Africa/Kampala',
      'TZ': 'Africa/Dar_es_Salaam',
      'ZA': 'Africa/Johannesburg',
      'NG': 'Africa/Lagos',
      'GH': 'Africa/Accra',
      'CI': 'Africa/Abidjan',
      'SN': 'Africa/Dakar',
      'ML': 'Africa/Bamako',
      'BF': 'Africa/Ouagadougou',
      'NE': 'Africa/Niamey',
      'TD': 'Africa/Ndjamena',
      'CM': 'Africa/Douala',
      'GA': 'Africa/Libreville',
      'CG': 'Africa/Brazzaville',
      'CD': 'Africa/Kinshasa',
      'RW': 'Africa/Kigali',
      'BI': 'Africa/Bujumbura',
      'MW': 'Africa/Blantyre',
      'MZ': 'Africa/Maputo',
      'ZW': 'Africa/Harare',
      'ZM': 'Africa/Lusaka',
      'BW': 'Africa/Gaborone',
      'NA': 'Africa/Windhoek',
      'AO': 'Africa/Luanda'
    };
    return timeZoneMap[countryCode] || 'America/New_York';
  }

  function updatePopupContent() {
    const now = new Date();

    // Get user timezone based on selected country
    const userPrefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
    const countryCode = userPrefs.country || 'US';
    const timeZone = getTimeZoneFromCountry(countryCode);

    // Update current time in 12-hour format with AM/PM - use local system time like azan-clock
    const timeString = now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });

    document.getElementById('current-time').textContent = timeString;

    // Update Gregorian date
    const gregorianString = now.toLocaleDateString('en-US', {
      timeZone: timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    document.getElementById('gregorian-date').textContent = gregorianString;

    // Update Hijri date using hijri-date library or fallback calculation
    if (typeof HijriDate !== 'undefined') {
      try {
        const hijri = new HijriDate(now);
        // HijriDate months are 0-indexed (0 = Muharram, 11 = Dhu al-Hijjah)
        const monthNames = [
          'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
          'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
          'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
        ];
        const monthIndex = hijri.getMonth();
        const day = hijri.getDate();
        const year = hijri.getFullYear();

        // Validate the values
        if (monthIndex >= 0 && monthIndex < 12 && day > 0 && day <= 30 && year > 0) {
          const hijriString = `${day} ${monthNames[monthIndex]} ${year}`;
          document.getElementById('hijri-date').textContent = hijriString;
        } else {
          // Invalid values from library, use fallback
          console.warn('Invalid HijriDate values, using fallback');
          document.getElementById('hijri-date').textContent = getHijriDate(now);
        }
      } catch (error) {
        console.warn('HijriDate library error, using fallback:', error);
        document.getElementById('hijri-date').textContent = getHijriDate(now);
      }
    } else {
      // Wait a bit for library to load, then retry
      setTimeout(() => {
        if (typeof HijriDate !== 'undefined') {
          try {
            const hijri = new HijriDate(now);
            const monthNames = [
              'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
              'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
              'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
            ];
            const monthIndex = hijri.getMonth();
            const day = hijri.getDate();
            const year = hijri.getFullYear();

            if (monthIndex >= 0 && monthIndex < 12 && day > 0 && day <= 30 && year > 0) {
              const hijriString = `${day} ${monthNames[monthIndex]} ${year}`;
              document.getElementById('hijri-date').textContent = hijriString;
            } else {
              document.getElementById('hijri-date').textContent = getHijriDate(now);
            }
          } catch (retryError) {
            document.getElementById('hijri-date').textContent = getHijriDate(now);
          }
        } else {
          document.getElementById('hijri-date').textContent = getHijriDate(now);
        }
      }, 1000);
    }
  }

  function getHijriDate(date) {
    // More accurate Hijri date calculation using astronomical method
    // Based on the Islamic calendar calculation
    const gregorianEpoch = new Date(622, 7, 16); // August 16, 622 AD (corrected epoch)
    const daysSinceEpoch = Math.floor((date - gregorianEpoch) / (1000 * 60 * 60 * 24));

    // Average Hijri year is 354.3667 days, month is 29.530588 days
    const avgYearDays = 354.3667;
    const avgMonthDays = 29.530588;

    // Calculate year
    const hijriYear = Math.floor(daysSinceEpoch / avgYearDays) + 1;

    // Calculate days within the year
    const daysInYear = daysSinceEpoch - Math.floor((hijriYear - 1) * avgYearDays);

    // Calculate month and day
    let monthDays = 0;
    let hijriMonth = 0;
    let hijriDay = 0;

    // Hijri months with alternating 30/29 days (approximate)
    const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

    for (let i = 0; i < 12; i++) {
      if (daysInYear < monthDays + monthLengths[i]) {
        hijriMonth = i;
        hijriDay = daysInYear - monthDays + 1;
        break;
      }
      monthDays += monthLengths[i];
    }

    // If we went through all months, adjust
    if (hijriMonth === 0) {
      hijriMonth = 11; // Dhu al-Hijjah
      hijriDay = daysInYear - monthDays + 1;
    }

    const monthNames = [
      'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
      'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
      'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
    ];

    return `${hijriDay} ${monthNames[hijriMonth]} ${hijriYear}`;
  }

  // Normal click behavior (mute/unmute)
  soundButton.addEventListener('click', (e) => {
    if (isLongPress) {
      isLongPress = false; // Ignore if it was a long press
      return;
    }
    if (!window.player || typeof player.isMuted !== 'function') {
      console.warn('[Sound] YouTube player not ready or not found');
      return;
    }
    
    // 🔹 Ensure AudioContext is resumed if needed (browser policy)
    try {
      if (window.audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch(_) {}

    if (player.isMuted()) {
      if (typeof player.unMute === 'function') {
        player.unMute();
        console.log('[Sound] Player unmuted');
      }
      soundButton.textContent = '🔊'; // Show active icon
    } else {
      if (typeof player.mute === 'function') {
        player.mute();
        console.log('[Sound] Player muted');
      }
      soundButton.textContent = '🔇'; // Show muted icon
    }
  });

  // Start timer on press (mouse or touch)
  function startLongPressTimer() {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      const overlay = document.getElementById('popup-overlay');
      const iframe = document.getElementById('popup-iframe');
      if (!overlay || !iframe) return;
      overlay.style.display = 'flex';
      overlay.classList.add('open');
      overlay.classList.add('modal');
      iframe.src = '/services/yt-clear/azan-clock.html';
      const shield = document.getElementById('global-touch-shield');
      if (shield) shield.style.display = 'none';
      window.shieldDisabled = true;
    }, 1000);
  }

  // Cancel timer on release (mouse or touch)
  function cancelLongPressTimer() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // Mouse events
  soundButton.addEventListener('mousedown', startLongPressTimer);
  soundButton.addEventListener('mouseup', cancelLongPressTimer);
  soundButton.addEventListener('mouseleave', cancelLongPressTimer);

  // Touch events (for mobile)
  soundButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling/ghost clicks
    startLongPressTimer(e);
  }, { passive: false });

  soundButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    cancelLongPressTimer();
  });

  soundButton.addEventListener('touchcancel', cancelLongPressTimer);

  // Popup logic for azan-clock.html
  function showAzanClockPopup() {
    try {
      const url = '/services/yt-clear/azan-clock.html';
      const w = window.open(url, 'azanClock', 'width=600,height=700,resizable=yes,scrollbars=1,toolbar=0,location=0,menubar=0,status=0');
      if (w) w.focus();
    } catch(_) {}
  }

  document.getElementById('popup-close').addEventListener('click', function() {
    const overlay = document.getElementById('popup-overlay');
    const iframe = document.getElementById('popup-iframe');
    overlay.classList.remove('open');
    overlay.classList.remove('no-dim');
    overlay.classList.remove('modal');
    overlay.style.display = 'none';
    iframe.src = '';
    const shield = document.getElementById('global-touch-shield');
    if (shield) shield.style.display = 'block';
    window.shieldDisabled = false;
  });

  // Code display popup close handler
  document.getElementById('code-popup-close').addEventListener('click', function() {
    const overlay = document.getElementById('code-popup-overlay');
    const content = document.getElementById('code-popup-content');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => {
      overlay.style.display = 'none';
      if (content) content.innerHTML = '';
    }, 200);
  });
});
