;(function(){
  function guardAssetWrite(source, payload){
    try {
      var SL = window.StorageLord;
      if (SL && typeof SL.canWrite === 'function') {
        var ok = SL.canWrite(source);
        if (!ok) { try { window.dispatchEvent(new CustomEvent('asset-write-blocked', { detail: { source: source, payload: payload } })); } catch(_){} }
        return ok;
      }
      return true;
    } catch(_){ return true }
  }
  window.guardAssetWrite = guardAssetWrite;
})();
