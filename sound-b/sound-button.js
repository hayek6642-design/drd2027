document.addEventListener('DOMContentLoaded', () => {
  const soundButton = document.getElementById('sound-button');
  const soundPopup = document.getElementById('sound-popup');
  let longPressTimer;
  let isLongPress = false;
  let timeUpdateInterval;

  if (!soundButton || !soundPopup) return;

  let enterX = 0;
  let hasShown = false;

  soundButton.addEventListener('mouseenter', (e) => {
    enterX = e.clientX || 0;
    hasShown = false;
  });

  soundButton.addEventListener('mousemove', (e) => {
    if (!hasShown && (e.clientX || 0) > enterX + 10) {
      updatePopupContent();
      try {
        const cc = document.getElementById('counter-container');
        if (cc) {
          const w = cc.offsetWidth;
          soundPopup.style.width = Math.round(w) + 'px';
        }
      } catch(_) {}
      soundPopup.style.display = 'block';
      timeUpdateInterval = setInterval(updatePopupContent, 1000);
      hasShown = true;
    }
  });

  soundButton.addEventListener('mouseleave', () => {
    soundPopup.style.display = 'none';
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    hasShown = false;
  });

  function updatePopupContent() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    const gregorianString = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeEl = document.getElementById('current-time');
    const gregEl = document.getElementById('gregorian-date');
    if (timeEl) timeEl.textContent = timeString;
    if (gregEl) gregEl.textContent = gregorianString;
  }

  soundButton.addEventListener('click', () => {
    if (isLongPress) { isLongPress = false; return; }
    if (!window.player || typeof player.isMuted !== 'function') return;
    try {
      if (player.isMuted()) { if (typeof player.unMute === 'function') player.unMute(); }
      else { if (typeof player.mute === 'function') player.mute(); }
    } catch (_) {}
  });

  function startLongPressTimer() {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      const overlay = document.getElementById('popup-overlay');
      const iframe = document.getElementById('popup-iframe');
      if (!overlay || !iframe) return;
      overlay.style.display = 'flex';
      overlay.classList.add('open');
      iframe.src = '/services/yt-clear/azan-clock.html';
      const shield = document.getElementById('global-touch-shield');
      if (shield) shield.style.display = 'none';
      window.shieldDisabled = true;
    }, 1000);
  }

  function cancelLongPressTimer() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  soundButton.addEventListener('mousedown', startLongPressTimer);
  soundButton.addEventListener('mouseup', cancelLongPressTimer);
  soundButton.addEventListener('mouseleave', cancelLongPressTimer);
  soundButton.addEventListener('touchstart', (e) => { e.preventDefault(); startLongPressTimer(); }, { passive: false });
  soundButton.addEventListener('touchend', (e) => { e.preventDefault(); cancelLongPressTimer(); });
  soundButton.addEventListener('touchcancel', cancelLongPressTimer);
});
