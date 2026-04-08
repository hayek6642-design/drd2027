// Three-Way Toggle Logic
// Extracted from yt-new.html

// Initialize toggle button and related logic
document.addEventListener('DOMContentLoaded', () => {
  const threeWay = document.getElementById('three-way-toggle');
  const toggleTrack = threeWay ? threeWay.querySelector('.toggle-track') : null;
  const toggleHandle = threeWay ? threeWay.querySelector('.toggle-handle') : null;

  function updateThreeWayUI(section) {
    if (!threeWay || !toggleHandle) return;
    threeWay.classList.remove('state-home','state-nour','state-afra7');
    const s = (section || window.currentSection || 'home').toLowerCase();
    threeWay.classList.add(`state-${s}`);
    // Smooth handle transition
    toggleHandle.style.transition = 'transform 200ms ease';
    toggleHandle.style.willChange = 'transform';
    const pos = s === 'nour' ? 0 : (s === 'home' ? 50 : 100);
    toggleHandle.style.transform = `translateX(${pos}%)`;
    threeWay.setAttribute('aria-label', `Active section: ${s}`);
    console.log(`[SWITCH] Active section: ${s}`);
  }

  function getSectionByClick(e) {
    if (!toggleTrack) return null;
    const rect = toggleTrack.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 1/3) return 'nour';
    if (x < 2/3) return 'home';
    return 'afra7';
  }

  if (threeWay) {
    threeWay.addEventListener('click', (e) => {
      const targetSection = getSectionByClick(e) || 'home';
      if (targetSection === 'home' && typeof window.showHomeSection === 'function') {
        window.showHomeSection();
      } else if (targetSection === 'nour' && typeof window.showNourSection === 'function') {
        window.showNourSection();
      } else if (targetSection === 'afra7' && typeof window.showAfra7Section === 'function') {
        window.showAfra7Section();
      }
      updateThreeWayUI(targetSection);
    });
    // Initial sync
    updateThreeWayUI(window.currentSection || 'home');
    // Sync UI when section changes elsewhere
    window.addEventListener('section:changed', (e) => {
      const s = (e && e.detail && e.detail.section) ? e.detail.section : (window.currentSection || 'home');
      updateThreeWayUI(s);
    });
  }
});
