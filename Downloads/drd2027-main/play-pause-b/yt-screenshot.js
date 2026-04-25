// Screenshot Logic
// Extracted from yt-new.html

// Function to show counter temporarily
function showCounterTemporarily(duration = 10000) {
  const counterElement = document.getElementById('counter');
  if (!counterElement) {
    return;
  }
  counterElement.classList.remove('hidden');
  if (window.counterRevealTimeout) {
    clearTimeout(window.counterRevealTimeout);
  }
  window.counterRevealTimeout = setTimeout(() => {
    counterElement.classList.add('hidden');
  }, duration);
}

// Function to initialize counter hover reveal
function initializeCounterHoverReveal() {
  const codeDisplayElement = document.getElementById('code-display');
  if (!codeDisplayElement) {
    console.warn('Code display element not found for hover reveal.');
    return;
  }

  let hoverStartX = null;
  let revealTriggered = false;

  const resetHoverTracking = () => {
    hoverStartX = null;
    revealTriggered = false;
  };

  codeDisplayElement.addEventListener('mouseenter', () => {
    resetHoverTracking();
  });

  codeDisplayElement.addEventListener('mousemove', (event) => {
    if (revealTriggered) {
      return;
    }

    if (hoverStartX === null) {
      hoverStartX = event.offsetX;
      return;
    }

    const elementWidth = codeDisplayElement.clientWidth || 1;
    const startedOnLeft = hoverStartX <= elementWidth * 0.25;
    const reachedRightEdge = event.offsetX >= elementWidth * 0.75;

    if (startedOnLeft && reachedRightEdge) {
      revealTriggered = true;
      showCounterTemporarily();
    }
  });

  codeDisplayElement.addEventListener('mouseleave', () => {
    resetHoverTracking();
  });
}

// Function to initialize touch overlay blocker
function initializeTouchOverlayBlocker() {
  const overlay = document.querySelector('.touch-overlay');
  if (!overlay) {
    console.warn('Touch overlay element not found; unable to block video interactions.');
    return;
  }

  overlay.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
}

// Initialize screenshot functionality
document.addEventListener('DOMContentLoaded', function() {
  initializeCodeDisplayLongPress();
  initializeCounterHoverReveal();
  initializeTouchOverlayBlocker();
});

// Function to initialize code display long press functionality
function initializeCodeDisplayLongPress() {
  const codeDisplay = document.getElementById('code-display');
  if (!codeDisplay) return;
  let longPressTimer;

  codeDisplay.addEventListener('mousedown', () => {
    longPressTimer = setTimeout(openCodeBankPanel, 600);
  });
  codeDisplay.addEventListener('mouseup', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  });
  codeDisplay.addEventListener('mouseleave', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  });
  codeDisplay.addEventListener('touchstart', () => {
    longPressTimer = setTimeout(openCodeBankPanel, 600);
  }, { passive: true });
  codeDisplay.addEventListener('touchend', () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  });
}

// CodeBank Dashboard Integration
function openCodeBankPanel() {
  try { window.AUTH_ALREADY_HANDLED = true; } catch(_) {}
  const overlay = document.getElementById('code-popup-overlay');
  const iframe = document.getElementById('code-popup-iframe');
  if (!overlay || !iframe) return;
  overlay.classList.add('open');
  overlay.style.display = 'flex';
  iframe.src = '/codebank/indexCB/';
  window.dispatchEvent(new Event('codebank:opened'));
}

function showAlternativeDashboard() {
  const overlay = document.getElementById('code-popup-overlay');
  const content = document.getElementById('code-popup-content');
  if (!overlay || !content) return;
  overlay.classList.add('open');
  overlay.style.display = 'flex';
  content.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.src = '/services/codebank/indexCB/';
  iframe.style.cssText = 'width:100%;height:100%;border:0;';
  content.appendChild(iframe);
}

window.showAlternativeDashboard = showAlternativeDashboard;

// Function to show error message
function showErrorMessage(message) {
  const content = document.getElementById('code-popup-content');
  if (content) {
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ff6b6b;font-family:system-ui,Arial,sans-serif">'+String(message)+'</div>';
  }
}

// Function to update the monthly screenshot indicator
function updateScreenshotIndicator() {
  try {
    const raw = localStorage.getItem("user_screenshots");
    const data = (function(){
      try { return raw ? JSON.parse(raw) : { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() }; }
      catch(_) { return { count: 0, month: new Date().getMonth(), year: new Date().getFullYear() }; }
    })();

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Reset if it's a new month
    if (data.month !== currentMonth || data.year !== currentYear) {
      data.count = 0;
      data.month = currentMonth;
      data.year = currentYear;
      localStorage.setItem("user_screenshots", JSON.stringify(data));
    }

    const count = data.count || 0;
    const indicator = document.getElementById('monthly-limit-indicator');
    const countSpan = document.getElementById('screenshot-count');

    if (indicator && countSpan) {
      countSpan.textContent = count;

      // Show indicator when user has taken at least one screenshot or is near limit
      if (count > 0 || count >= 8) {
        indicator.style.display = 'block';

        // Change color based on proximity to limit
        if (count >= 10) {
          indicator.style.background = 'rgba(255, 0, 0, 0.9)'; // Red when limit reached
          indicator.innerHTML = '🚫 Limit reached!';
        } else if (count >= 8) {
          indicator.style.background = 'rgba(255, 165, 0, 0.9)'; // Orange when close
          indicator.innerHTML = `⚠️ ${count}/10 this month`;
        } else {
          indicator.style.background = 'rgba(50, 205, 50, 0.9)'; // Green when safe
          indicator.innerHTML = `📸 ${count}/10 this month`;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to update screenshot indicator:', e);
  }
}

// Update indicator on page load
document.addEventListener('DOMContentLoaded', function() {
  updateScreenshotIndicator();

  // Listen for screenshot updates
  window.addEventListener('storage', function(e) {
    if (e.key === 'user_screenshots') {
      updateScreenshotIndicator();
    }
  });

  // Update every 5 seconds as backup
  setInterval(updateScreenshotIndicator, 5000);
});
