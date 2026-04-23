(function() {
  // 4️⃣ Prevent duplicate initialization
  if (window.__LAYOUT_BOOTSTRAP__) return;
  window.__LAYOUT_BOOTSTRAP__ = true;

  let _cachedVideoBoxEl = null;
  let _lastLayoutLog = 0;
  let _cachedInset = -1;

  function __measureInset(){
    if (_cachedInset !== -1) return _cachedInset;
    const el=document.createElement('div');
    el.style.cssText='position:fixed;left:-9999px;top:-9999px;padding-bottom:env(safe-area-inset-bottom);';
    document.body.appendChild(el);
    const v=parseFloat(getComputedStyle(el).paddingBottom)||0;
    document.body.removeChild(el);
    _cachedInset = v;
    return v;
  }
  function __applyVars(){
    // choose the real visual video box
    if (!_cachedVideoBoxEl) {
      try {
        const iframe = document.querySelector('#video-container iframe');
        if (iframe) {
          _cachedVideoBoxEl = iframe;
        } else {
          const container = document.getElementById('video-container');
          if (container) {
            _cachedVideoBoxEl = container;
          } else {
            _cachedVideoBoxEl = document.querySelector('.video-wrapper');
          }
        }
      } catch(_) {}
    }
    
    const videoBoxEl = _cachedVideoBoxEl;
    if(!videoBoxEl) return;

    const r = videoBoxEl.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      // If we're using video-container but it hasn't settled yet, wait
      if (videoBoxEl.id === 'video-container') {
        const now = Date.now();
        if (now - _lastLayoutLog > 5000) {
            if (window.DEBUG_MODE) console.log('[LAYOUT] video-container has no dimensions, skipping update');
            _lastLayoutLog = now;
        }
        return;
      }
    }

    const inset = __measureInset();
    // write css vars on a shared ancestor so counter can read them
    const scopeEl = document.querySelector('.video-wrapper') || document.documentElement;
    scopeEl.style.setProperty('--video-w', r.width+'px');
    scopeEl.style.setProperty('--video-h', r.height+'px');
    scopeEl.style.setProperty('--video-x', r.left+'px');
    scopeEl.style.setProperty('--video-y', r.top+'px');
    scopeEl.style.setProperty('--video-aspect', (r.width&&r.height?(r.width/r.height):0)+'');
    scopeEl.style.setProperty('--safe-bottom', inset+'px');
    
    const now = Date.now();
    if (now - _lastLayoutLog > 5000) {
      try{ console.log('[LAYOUT] using video box from '+(videoBoxEl.id?('#'+videoBoxEl.id):(videoBoxEl.tagName.toLowerCase()))); }catch(_){ }
      _lastLayoutLog = now;
    }
  }
  function __init(){
    __applyVars();
    window.addEventListener('resize', __applyVars);
    try{
      const wrapper=document.querySelector('.video-wrapper');
      if(wrapper&&typeof ResizeObserver!=='undefined'){
        const ro=new ResizeObserver(()=>__applyVars());
        ro.observe(wrapper);
      }
    }catch(_){ }
  }
  window.__layoutBootstrapApply=__applyVars;
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', __init);
  }else{
    __init();
  }
  try{ window.addEventListener('load', ()=>__applyVars()); }catch(_){ }
})();
