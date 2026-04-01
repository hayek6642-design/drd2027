// yt-bootstrap.js - zero-auth version

console.log("[YT-Bootstrap] Running zero-auth setup");

function initYTBootstrap() {
  if (window.__YT_BOOTSTRAP_INIT__) return;
  window.__YT_BOOTSTRAP_INIT__ = true;

  console.log("[YT-Bootstrap] Initializing modules...");

  // Initialize counters & code display (no auth)
  if (typeof updateCounter === "function") {
    updateCounter(localStorage.getItem("yt-new-counter") || 0);
  }
  if (typeof updateCodeDisplay === "function") {
    updateCodeDisplay("INITIAL-ZERO-AUTH-CODE");
  }

  // Initialize WebSocket
  if (typeof setupWebSocket === "function") {
    setupWebSocket();
  }

  // Initialize YouTube
  if (typeof initYouTubePlayer === "function") {
    initYouTubePlayer();
  }
}

// Start after DOM ready
document.addEventListener("DOMContentLoaded", initYTBootstrap);
