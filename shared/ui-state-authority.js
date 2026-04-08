(function(){
  const UIState = {
    _locks: new Set(),
    lock(reason){
      try { this._locks.add(String(reason||'unknown')); document.body.classList.add('popup-active'); } catch(_){}
      try { window.dispatchEvent(new CustomEvent('ui:locked', { detail: { reason } })); } catch(_){}
    },
    unlock(reason){
      try { this._locks.delete(String(reason||'unknown')); if (this._locks.size===0) document.body.classList.remove('popup-active'); } catch(_){}
      try { window.dispatchEvent(new CustomEvent('ui:unlocked', { detail: { reason } })); } catch(_){}
    },
    isLocked(){ return this._locks.size>0; }
  };
  window.UIState = UIState;
})();

