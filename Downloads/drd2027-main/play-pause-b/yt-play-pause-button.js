// Play/Pause Button Logic
// Extracted from yt-new.html

document.addEventListener('DOMContentLoaded', () => {
  const playPauseButton = document.getElementById('play-pause-button');
  if (!playPauseButton) return;

  let pressTimer = null;

  function ensurePulseStyles(){
    try {
      if (document.getElementById('play-pause-pulse-style')) return;
      const style = document.createElement('style');
      style.id = 'play-pause-pulse-style';
      style.textContent = `@keyframes screenshotPulse{0%{box-shadow:0 0 0 0 rgba(255,0,0,0.8)}50%{box-shadow:0 0 0 6px rgba(255,0,0,0.4)}100%{box-shadow:0 0 0 0 rgba(255,0,0,0)}}#play-pause-button.screenshot-pulse{animation:screenshotPulse 800ms ease-out;outline:2px solid rgba(255,0,0,0.9);border-radius:50%}`;
      document.head.appendChild(style);
    } catch(_) {}
  }

  const handleClick = (e) => {
    if (window.SystemProtection && window.SystemProtection.isProtectionActive()) return;
    if (window.__EXTRA_MODE_LOCKED__ === true) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      if (window.ExtraMode && window.ExtraMode.isActive && window.ExtraMode.isActive()) {
        window.ExtraMode.deactivate && window.ExtraMode.deactivate();
      }
    } catch(_) {}
    ensurePulseStyles();
    try { playPauseButton.classList.add('screenshot-pulse'); } catch(_){}
    setTimeout(() => { try { playPauseButton.classList.remove('screenshot-pulse'); } catch(_){} }, 900);
    if (typeof window.instantScreenshot === 'function') {
      window.instantScreenshot();
    }
  };

  const startPress = (e) => {
    if (window.SystemProtection && window.SystemProtection.isProtectionActive()) return;
    if (window.__EXTRA_MODE_LOCKED__ === true) return;
    pressTimer = setTimeout(() => {
      window.AUTH_ALREADY_HANDLED = true;
      const overlay = document.getElementById('code-popup-overlay');
      const iframe = document.getElementById('code-popup-iframe');
      if (!overlay || !iframe) return;
      overlay.style.display = 'flex';
      overlay.classList.add('open');
      iframe.src = '/codebank/indexCB/';
      const shield = document.getElementById('global-touch-shield');
      if (shield) shield.style.display = 'none';
      window.shieldDisabled = true;
    }, 1000);
  };

  const endPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  playPauseButton.addEventListener('click', handleClick);
  playPauseButton.addEventListener('mousedown', startPress);
  playPauseButton.addEventListener('mouseup', endPress);
  playPauseButton.addEventListener('mouseleave', endPress);
  playPauseButton.addEventListener('touchstart', startPress, { passive: true });
  playPauseButton.addEventListener('touchend', endPress);
  playPauseButton.addEventListener('touchcancel', endPress);
});
