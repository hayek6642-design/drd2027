window.currentSection='home';
var videoIds=['PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN','pR_ZnFp9bgE','fUehe82E5yU'];
function isPlayerReadyForSectionBase(){
  return !!(window.player&&typeof window.player.getPlayerState==='function');
}
function saveCurrentSectionTime(){
  if(!isPlayerReadyForSectionBase())return;
  try{
    var t=window.player.getCurrentTime?window.player.getCurrentTime():0;
    window._lastSectionTime=t||0;
  }catch(_){}}
function showHomeSection(){
  window.currentSection='home';
  if(!window.player)return;
  if(typeof window.player.loadPlaylist==='function'){
    window.player.loadPlaylist({listType:'playlist',list:videoIds[0],index:0,startSeconds:0});
  }
  try{ window.dispatchEvent(new CustomEvent('section:changed',{ detail:{ section:'home' } })); }catch(_){ }
}
function showNourSection(){
  window.currentSection='nour';
  if(!window.player)return;
  if(typeof window.player.loadVideoById==='function'){
    window.player.loadVideoById({videoId:videoIds[1],startSeconds:0});
  }
  try{ window.dispatchEvent(new CustomEvent('section:changed',{ detail:{ section:'nour' } })); }catch(_){ }
}
function showAfra7Section(){
  window.currentSection='afra7';
  if(!window.player)return;
  if(typeof window.player.loadVideoById==='function'){
    window.player.loadVideoById({videoId:videoIds[2],startSeconds:0});
  }
  try{ window.dispatchEvent(new CustomEvent('section:changed',{ detail:{ section:'afra7' } })); }catch(_){ }
}
// Avoid global identifier conflicts; keep readiness checks internal
window.saveCurrentSectionTime=saveCurrentSectionTime;
window.showHomeSection=showHomeSection;
window.showNourSection=showNourSection;
window.showAfra7Section=showAfra7Section;
// Extracted from yt-new.html

// Track current section (Home, Nour, or Afra7)
window.currentSection = 'home'; // Default to Home

// Video IDs for sections (by section key)
const videoIdsMap = {
  'home': 'PLD60YBjiIjQPryp_T2IdNm9fukceO8AtN', // Home (Playlist ID)
  'nour': 'SJUH0qthtCA', // Nour (Single Video ID)
  'afra7': 'fUehe82E5yU' // Afra7 (Single Video ID)
};

// Debounced initialization promises to prevent multiple attempts
let homeInitPromise = null;
let nourInitPromise = null;
let afra7InitPromise = null;

// Enhanced player readiness check
function isPlayerReadyForSectionX() {
  if (!player || !player.getPlayerState) {
    return false;
  }

  const playerState = player.getPlayerState();
  // Allow UNSTARTED state as it means player exists but video not loaded yet
  // Block only when player doesn't exist or getPlayerState is unavailable
  return playerState !== undefined;
}

// Function to show popup when extra mode cannot be activated
window.showExtraModeBlockedPopup = function() {
  // Use the same popup system as section switching
  if (window.showSectionPopup) {
    window.showSectionPopup("You can't activate the extra mode");
  } else {
    // Fallback: create a simple popup
    let existing = document.querySelector('.extra-mode-blocked-popup');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'extra-mode-blocked-popup section-switch-popup';
    el.textContent = "You can't activate the extra mode";
    document.body.appendChild(el);
    void el.offsetWidth; // force reflow
    el.classList.add('in');
    setTimeout(() => {
      el.classList.remove('in');
      el.classList.add('out');
    }, 560);
    setTimeout(() => {
      el.remove();
    }, 800);
  }
};

// Helper function to save current playback time before switching
window.saveCurrentSectionTime = async function(sectionId) {
  if (!player || !sectionId) return;

  try {
    const currentTime = player && typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
    const playlistIndex = player && typeof player.getPlaylistIndex === 'function' ? player.getPlaylistIndex() : 0;

    const saveData = {
      time: currentTime,
      index: playlistIndex
    };

    if (window.AuthSyncManager && window.AuthSyncManager.setUserData) {
      // Auth logic removed for mirror-only mode
      console.log(`[Section Switch] Saved time for ${sectionId}:`, saveData);
    } else {
      // Fallback to localStorage
      localStorage.setItem(`video_${videoIdsMap[sectionId]}`, JSON.stringify(saveData));
    }
  } catch (e) {
    console.warn(`[Section Switch] Error saving time for ${sectionId}:`, e);
  }
};

// Section switching functions - called by 3-way toggle (OPTIMIZED)
window.showHomeSection = async function() {
  console.log('[Section Switch] Switching to Home section');

  // Return existing promise if already initializing
  if (homeInitPromise) {
    console.log('[Section Switch] Home section initialization already in progress');
    return homeInitPromise;
  }

  // Enhanced player readiness check
  if (!isPlayerReadyForSectionX()) {
    console.warn('[Section Switch] Player not ready for section switching, waiting...');
    homeInitPromise = new Promise(resolve => {
      const checkPlayerReady = setInterval(() => {
        if (isPlayerReadyForSectionX()) {
          clearInterval(checkPlayerReady);
          resolve(window.showHomeSection());
        }
      }, 300);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkPlayerReady);
        console.warn('[Section Switch] Home section initialization timeout');
        homeInitPromise = null;
        resolve();
      }, 10000);
    });

    return homeInitPromise.finally(() => {
      homeInitPromise = null;
    });
  }

  // Update current section
  window.currentSection = 'home';
  try { window.dispatchEvent(new CustomEvent('section:changed', { detail: { section: 'home' } })); } catch(_){}

  // Load saved playback time for Home (continues from last position)
  let savedData = { time: 0, index: 0 };
  if (window.AuthSyncManager && window.AuthSyncManager.getUserData) {
    try {
      const savedDataStr = null;
      if (savedDataStr && typeof savedDataStr === 'string') {
        savedData = JSON.parse(savedDataStr);
      } else if (savedDataStr && typeof savedDataStr === 'object') {
        savedData = savedDataStr;
      }
    } catch (e) {
      console.warn('[Section Switch] Error loading saved data for Home:', e);
      // Try localStorage fallback
      try {
        const localData = localStorage.getItem(`video_${videoIdsMap.home}`);
        if (localData) savedData = JSON.parse(localData);
      } catch (e2) {}
    }
  } else {
    // Fallback to localStorage
    try {
      const localData = localStorage.getItem(`video_${videoIdsMap.home}`);
      if (localData) savedData = JSON.parse(localData);
    } catch (e) {}
  }

  const startSeconds = savedData.time || 0;
  const startIndex = savedData.index || 0;

  try {
    // OPTIMIZED: Use player content update instead of recreation
    if (window.YouTubeAPIManager && typeof window.YouTubeAPIManager.updatePlayerContent === 'function') {
      console.log('[Section Switch] Using optimized player content update for Home');
      await window.YouTubeAPIManager.updatePlayerContent(videoIdsMap.home);

      // Seek to saved position after content loads
      setTimeout(() => {
        try {
          if (player && startSeconds > 0 && typeof player.seekTo === 'function') {
            player.seekTo(startSeconds, true);
          }
        } catch (seekError) {
          console.warn('[Section Switch] Error seeking to saved position:', seekError);
        }
      }, 1000);

    } else {
      // FALLBACK: Traditional method for backward compatibility
      console.log('[Section Switch] Using fallback method for Home section');

      // Check if player is ready and in a valid state
      if (!player || typeof player.getPlayerState !== 'function') {
        console.warn('[Section Switch] Player not ready, waiting...');
        setTimeout(() => window.showHomeSection(), 500);
        return;
      }

      // Stop current playback before switching to playlist
      try {
        if (player && typeof player.stopVideo === 'function') {
          player.stopVideo();
        }
      } catch (stopError) {
        console.warn('[Section Switch] Error stopping video:', stopError);
      }

      // Small delay to ensure player is ready for new content
      setTimeout(() => {
        try {
          // Use loadPlaylist with proper parameters
            if (player && typeof player.loadPlaylist === 'function') player.loadPlaylist({
              listType: 'playlist',
              list: videoIdsMap.home,
              index: startIndex,
              startSeconds: startSeconds
            });
          console.log(`[Section Switch] Home playlist loaded from saved position: ${startSeconds}s, index: ${startIndex}`);
        } catch (loadError) {
          console.warn('[Section Switch] Error with loadPlaylist, trying alternative method:', loadError);
          // Alternative: cue playlist first, then load
          try {
            if (player && typeof player.cuePlaylist === 'function') player.cuePlaylist({
              listType: 'playlist',
              list: videoIdsMap.home,
              index: startIndex
            });

            // Wait for playlist to cue, then seek and play
            setTimeout(() => {
              try {
                if (player && startSeconds > 0 && typeof player.seekTo === 'function') {
                  player.seekTo(startSeconds, true);
                }
                if (player && typeof player.playVideo === 'function') {
                  player.playVideo();
                }
              } catch (seekError) {
                console.warn('[Section Switch] Error seeking/playing:', seekError);
              }
            }, 500);
          } catch (cueError) {
            console.error('[Section Switch] Error with cuePlaylist:', cueError);
          }
        }
      }, 100);
    }
  } catch (e) {
    console.error('[Section Switch] Error loading Home playlist:', e);
    // Retry after a short delay
    setTimeout(() => {
      console.log('[Section Switch] Retrying Home section load...');
      window.showHomeSection();
    }, 1000);
  }
}

window.showNourSection = async function() {
  console.log('[Section Switch] Switching to Nour section');

  // Return existing promise if already initializing
  if (nourInitPromise) {
    console.log('[Section Switch] Nour section initialization already in progress');
    return nourInitPromise;
  }

  // Enhanced player readiness check
  if (!isPlayerReadyForSectionX()) {
    console.warn('[Section Switch] Player not ready for section switching, waiting...');
    nourInitPromise = new Promise(resolve => {
      const checkPlayerReady = setInterval(() => {
        if (isPlayerReadyForSectionX()) {
          clearInterval(checkPlayerReady);
          resolve(window.showNourSection());
        }
      }, 300);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkPlayerReady);
        console.warn('[Section Switch] Nour section initialization timeout');
        nourInitPromise = null;
        resolve();
      }, 10000);
    });

    return nourInitPromise.finally(() => {
      nourInitPromise = null;
    });
  }

  // Update current section
  window.currentSection = 'nour';
  try { window.dispatchEvent(new CustomEvent('section:changed', { detail: { section: 'nour' } })); } catch(_){}

  // Deactivate extra mode if active (extra mode only works on Home)
  if (window.ExtraMode && window.ExtraMode.isActive && window.ExtraMode.isActive()) {
    console.log('[Section Switch] Deactivating extra mode (not available on Nour section)');
    if (window.ExtraMode.deactivate) {
      window.ExtraMode.deactivate();
    }
  }
  // Also check for the other extra mode system
  if (window.deactivateExtraMode && typeof window.deactivateExtraMode === 'function') {
    window.deactivateExtraMode();
  }

  // Load saved playback time for Nour (continues from last position)
  let savedData = { time: 0 };
  if (window.AuthSyncManager && window.AuthSyncManager.getUserData) {
    try {
      const savedDataStr = null;
      if (savedDataStr && typeof savedDataStr === 'string') {
        savedData = JSON.parse(savedDataStr);
      } else if (savedDataStr && typeof savedDataStr === 'object') {
        savedData = savedDataStr;
      }
    } catch (e) {
      console.warn('[Section Switch] Error loading saved data for Nour:', e);
      // Try localStorage fallback
      try {
        const localData = localStorage.getItem(`video_${videoIdsMap.nour}`);
        if (localData) savedData = JSON.parse(localData);
      } catch (e2) {}
    }
  } else {
    // Fallback to localStorage
    try {
      const localData = localStorage.getItem(`video_${videoIdsMap.nour}`);
      if (localData) savedData = JSON.parse(localData);
    } catch (e) {}
  }

  const startSeconds = savedData.time || 0;

  try {
    if (player && typeof player.loadVideoById === 'function') {
      player.loadVideoById({
        videoId: videoIdsMap.nour,
        startSeconds: startSeconds
      });
      console.log(`[Section Switch] Nour loaded from saved position: ${startSeconds}s`);
    }
  } catch (e) {
    console.error('[Section Switch] Error loading Nour video:', e);
  }
};

window.showAfra7Section = async function() {
  console.log('[Section Switch] Switching to Afra7 section');

  // Return existing promise if already initializing
  if (afra7InitPromise) {
    console.log('[Section Switch] Afra7 section initialization already in progress');
    return afra7InitPromise;
  }

  // Enhanced player readiness check
  if (!isPlayerReadyForSectionX()) {
    console.warn('[Section Switch] Player not ready for section switching, waiting...');
    afra7InitPromise = new Promise(resolve => {
      const checkPlayerReady = setInterval(() => {
        if (isPlayerReadyForSectionX()) {
          clearInterval(checkPlayerReady);
          resolve(window.showAfra7Section());
        }
      }, 300);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkPlayerReady);
        console.warn('[Section Switch] Afra7 section initialization timeout');
        afra7InitPromise = null;
        resolve();
      }, 10000);
    });

    return afra7InitPromise.finally(() => {
      afra7InitPromise = null;
    });
  }

  // Update current section
  window.currentSection = 'afra7';
  try { window.dispatchEvent(new CustomEvent('section:changed', { detail: { section: 'afra7' } })); } catch(_){}

  // Deactivate extra mode if active (extra mode only works on Home)
  if (window.ExtraMode && window.ExtraMode.isActive && window.ExtraMode.isActive()) {
    console.log('[Section Switch] Deactivating extra mode (not available on Afra7 section)');
    if (window.ExtraMode.deactivate) {
      window.ExtraMode.deactivate();
    }
  }
  // Also check for the other extra mode system
  if (window.deactivateExtraMode && typeof window.deactivateExtraMode === 'function') {
    window.deactivateExtraMode();
  }

  // Afra7 always starts from beginning (no saved time)
  const startSeconds = 0;

  try {
    if (player && typeof player.loadVideoById === 'function') {
      player.loadVideoById({
        videoId: videoIdsMap.afra7,
        startSeconds: startSeconds
      });
      console.log('[Section Switch] Afra7 loaded from beginning (0s)');
    }
  } catch (e) {
    console.error('[Section Switch] Error loading Afra7 video:', e);
  }
};

// Function to switch to the next section
function switchToNextSection() {
  const order = ['home', 'nour', 'afra7'];
  const current = (window.currentSection || 'home').toLowerCase();
  const idx = order.indexOf(current);
  const next = order[(idx + 1) % order.length];
  if (next === 'home' && typeof window.showHomeSection === 'function') {
    window.showHomeSection();
    return;
  }
  if (next === 'nour' && typeof window.showNourSection === 'function') {
    window.showNourSection();
    return;
  }
  if (next === 'afra7' && typeof window.showAfra7Section === 'function') {
    window.showAfra7Section();
    return;
  }
}
