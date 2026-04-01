(function(){
  const PlayerUI = {
    show(){
      try {
        const container = document.getElementById('video-container');
        if (container){
          container.style.display = 'block';
          container.style.visibility = 'visible';
          container.style.opacity = '1';
        }
        if (window.player && typeof window.player.playVideo==='function') {
          try { window.player.playVideo(); } catch(_){}
        }
      } catch(_){}
    }
  };
  window.PlayerUI = PlayerUI;
  window.addEventListener('identity:completed', () => { try { PlayerUI.show(); } catch(_){} });
  window.addEventListener('corsa:loading:completed', () => { try { PlayerUI.show(); } catch(_){} });
})();
