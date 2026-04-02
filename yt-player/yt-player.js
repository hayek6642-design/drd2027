export const YTPlayer = {
  init() {
    // Ensure YouTube IFrame API is loaded without relying on inline script tags
    (function loadApi(){
      try{
        if (window.YT && window.YT.Player) return;
        const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
        if (existing) return;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.defer = true;
        document.head.appendChild(tag);
      }catch(_){ }
    })();
    function doInit(){
      if (window.__YT_PLAYER_INIT__) return;
      if (typeof window.initYouTubePlayer === 'function') {
        window.__YT_PLAYER_INIT__ = true;
        window.initYouTubePlayer();
      }
    }
    window.onYouTubeIframeAPIReady = function(){ doInit() };
    if (document.readyState === 'complete') {
      setTimeout(()=>{ if (window.YT && window.YT.Player) doInit() }, 300);
    }
  }
}
