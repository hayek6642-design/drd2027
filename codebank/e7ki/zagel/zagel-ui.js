/**
 * Zagel UI - Visual Effects and Animations
 */

export const ZagelUI = (() => {

  function flyIn(targetName) {
    // Remove existing
    const existing = document.querySelector('.zagel-flying');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'zagel-flying';
    el.innerHTML = \`
      <div class="zagel-bird">🕊️</div>
      <div class="zagel-speech-bubble">
        <div class="zagel-header">💌 رسالة لـ \${targetName}</div>
        <div class="zagel-body">جاية الحين...</div>
      </div>
    \`;

    document.body.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      el.classList.add('active');
    });

    // Remove after 8 seconds
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 500);
    }, 8000);
  }

  function showThinking() {
    const indicator = document.createElement('div');
    indicator.id = 'zagel-thinking';
    indicator.innerHTML = \`
      <div class="thinking-dots">
        <span></span><span></span><span></span>
      </div>
      <div>زاجل تفكر...</div>
    \`;
    document.body.appendChild(indicator);
  }

  function hideThinking() {
    const el = document.getElementById('zagel-thinking');
    if (el) el.remove();
  }

  function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'zagel-notification';
    notif.innerHTML = \`
      <span class="zagel-notif-icon">🕊️</span>
      <span>\${message}</span>
    \`;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.classList.add('show');
    }, 10);

    setTimeout(() => {
      notif.classList.remove('show');
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  return {
    flyIn,
    showThinking,
    hideThinking,
    showNotification
  };

})();
