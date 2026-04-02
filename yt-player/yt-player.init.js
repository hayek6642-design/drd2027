// yt-player.init.js — Fixed: exposes window.YTPlayerController for main.js
(function(){
  'use strict';

  // main.js waits for window.YTPlayerController.start() before activating YT module.
  // This stub was previously empty — now creates the controller.
  window.YTPlayerController = {
    _started: false,

    start: function() {
      if (this._started) return Promise.resolve();
      this._started = true;
      console.log('[YTPlayerController] Starting...');

      try {
        // Define initYouTubePlayer if nothing else has
        if (typeof window.initYouTubePlayer !== 'function') {
          window.initYouTubePlayer = function() {
            if (window.__YT_PLAYER_INIT__) return;
            if (!window.YT || !window.YT.Player) {
              console.warn('[YTPlayerController] YT API not ready');
              return;
            }
            window.__YT_PLAYER_INIT__ = true;
            var container = document.getElementById('video-container');
            if (!container) { console.warn('[YTPlayerController] #video-container not found'); return; }

            // Get video ID from URL, sessionStorage, or global config
            var urlParams = new URLSearchParams(window.location.search);
            var videoId = urlParams.get('v') || urlParams.get('video') ||
                          window.__INITIAL_VIDEO_ID__ ||
                          (window.AppConfig && window.AppConfig.videoId) || null;

            if (!videoId) {
              console.warn('[YTPlayerController] No videoId — player container ready, awaiting video assignment');
              window.__YT_PLAYER_READY__ = true;
              window.dispatchEvent(new CustomEvent('yt:player:ready', { detail: { player: null } }));
              return;
            }

            try {
              window.player = new window.YT.Player('video-container', {
                videoId: videoId,
                width: '100%',
                height: '100%',
                playerVars: { autoplay: 1, controls: 1, rel: 0, origin: window.location.origin },
                events: {
                  onReady: function(e) {
                    window.__YT_PLAYER_READY__ = true;
                    console.log('[YTPlayerController] Player ready ✅');
                    window.dispatchEvent(new CustomEvent('yt:player:ready', { detail: { player: e.target } }));
                  },
                  onError: function(e) {
                    console.warn('[YTPlayerController] Player error:', e.data);
                  }
                }
              });
            } catch(err) {
              console.warn('[YTPlayerController] YT.Player init error:', err);
            }
          };
        }

        // Hook into onYouTubeIframeAPIReady — preserve any existing handler
        var prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function() {
          try { if (typeof prevReady === 'function') prevReady(); } catch(_) {}
          try { window.initYouTubePlayer(); } catch(e) {
            console.warn('[YTPlayerController] initYouTubePlayer error:', e);
          }
        };

        // If the YouTube IFrame API already loaded (browser cache), trigger immediately
        if (window.YT && window.YT.Player) {
          setTimeout(function() {
            try { window.initYouTubePlayer(); } catch(_) {}
          }, 100);
        }

        console.log('[YTPlayerController] Registered — waiting for YouTube IFrame API ✅');
      } catch(e) {
        console.warn('[YTPlayerController] start() error:', e);
      }
      return Promise.resolve();
    }
  };

  console.log('[YTPlayerController] Controller ready');
})();
