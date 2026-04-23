
// --- Extra Reward Mode Implementation ---
let watchSeconds = 0;
let watchInterval = null;
// FIX: Renamed to avoid collision with yt-extramode.js (both declared _wtExtraModeActive)
let _wtExtraModeActive = false;
let pressTimer = null;

function startExtraWatch() {
  // Check if current section allows extra mode (only Home section)
  const currentSection = window.currentSection || 'home';
  if (currentSection !== 'home') {
    console.warn('[Extra Mode] Cannot activate extra mode on', currentSection, 'section. Only available on Home section.');
    // Show popup notification
    if (window.showExtraModeBlockedPopup && typeof window.showExtraModeBlockedPopup === 'function') {
      window.showExtraModeBlockedPopup();
    }
    return; // Prevent activation
  }
  
  extraModeActive = true;
  watchSeconds = 0;
  clearInterval(watchInterval);

  watchInterval = setInterval(() => {
    if (document.visibilityState === "visible") {
      watchSeconds += 5 * 60; // 5 minutes in seconds
      checkBarReward();
    } else {
      cancelExtraMode("Lost visibility");
    }
  }, 5 * 60 * 1000);
}

function cancelExtraMode(reason) {
  console.log("Extra mode cancelled:", reason);
  watchSeconds = 0;
  extraModeActive = false;
  clearInterval(watchInterval);
  updateExtraDisplay("");
}

function checkBarReward() {
  // FIX: Added null guard — crashes if element doesn't exist in DOM
  const display = document.getElementById("code-display");
  if (!display) return;

  if (watchSeconds >= 36000) { // 10 hours
    display.innerText = "1 Gold Bar";
    // saveToSupabase("1 Gold Bar"); // Removed - using Clerk for authentication
    cancelExtraMode("Gold reward complete");
  } else if (watchSeconds >= 3600 && watchSeconds % 3600 === 0) {
    display.innerText = "1 Silver Bar";
    // saveToSupabase("1 Silver Bar"); // Removed - using Clerk for authentication
    // Do NOT cancel, allow continued watching toward gold
  } else {
    // Show progress toward next bar
    updateExtraDisplay(formatExtraProgress());
  }
}

function updateExtraDisplay(text) {
  const display = document.getElementById("code-display");
  if (display) display.innerText = text;
}

function formatExtraProgress() {
  // Show time toward next bar
  const hours = Math.floor(watchSeconds / 3600);
  const mins = Math.floor((watchSeconds % 3600) / 60);
  let next = "";
  if (watchSeconds < 3600) {
    next = `Next Silver Bar: ${60 - mins} min`;
  } else if (watchSeconds < 36000) {
    next = `Silver Bars: ${hours} | Next Gold: ${10 - hours} hr`;
  }
  return `Extra Mode\n${next}`;
}

// Long press activation for Extra button
window.addEventListener("DOMContentLoaded", () => {
  const extraBtn = document.getElementById("extra-button");
  if (!extraBtn) return;
  extraBtn.addEventListener("mousedown", () => {
    pressTimer = setTimeout(startExtraWatch, 1500);
  });
  extraBtn.addEventListener("mouseup", () => clearTimeout(pressTimer));
  extraBtn.addEventListener("mouseleave", () => clearTimeout(pressTimer));
});

// Cancel Extra mode on focus loss
document.addEventListener("visibilitychange", () => {
  if (_wtExtraModeActive && document.visibilityState !== "visible") {
    cancelExtraMode("Lost focus");
  }
});

// Prevent normal code gen if _wtExtraModeActive
function shouldGenerateNormalCode() {
  return !_wtExtraModeActive;
}

// --- Normal code generation fallback (if not in extra mode) ---
let secondsWatched = 0;
let interval = null;

function startWatching() {
  if (_wtExtraModeActive) return;
  interval = setInterval(() => {
    if (document.visibilityState === "visible") {
      secondsWatched += 300;
      handleCodeGeneration();
    }
  }, 5 * 60 * 1000);
}

function resetWatching() {
  secondsWatched = 0;
}

function handleCodeGeneration() {
  if (!shouldGenerateNormalCode()) return;
  const display = document.getElementById("code-display");

  if (secondsWatched >= 36000) {
    display.innerText = "1 Gold Bar";
    // FIX: saveToSupabase() was called but never defined — replaced with localStorage
    try { localStorage.setItem('lastReward', JSON.stringify({ type: 'gold', ts: Date.now() })); } catch(_) {}
    secondsWatched = 0;
  } else if (secondsWatched % 3600 < 300 && secondsWatched >= 3600) {
    display.innerText = "1 Silver Bar";
    // FIX: saveToSupabase() was called but never defined — replaced with localStorage
    try { localStorage.setItem('lastReward', JSON.stringify({ type: 'silver', ts: Date.now() })); } catch(_) {}
  } else {
    // Mirror-only: do not generate codes here
    updateExtraDisplay(formatExtraProgress());
  }
}

// No local generation functions in mirror-only mode

function compress(code) {
  // FIX: LZString was used but never imported. Added guard with fallback.
  if (typeof LZString !== 'undefined' && typeof LZString.compressToUTF16 === 'function') {
    return LZString.compressToUTF16(code);
  }
  console.warn('[watch-tracker] LZString not loaded, returning raw code');
  return code;
}

function saveToLocal(code) {
  localStorage.setItem("lastCode", code);
}

// Network persistence removed per mirror-only architecture

window.onload = () => startWatching();
