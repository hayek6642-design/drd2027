import { AssetBus } from '../local-asset-bus.js';
import '../asset-types.js';

window.SuperlikesEngine = {
  add(n=1){ try { console.log('[SUPERLIKES GENERATED]', n); } catch(_){} AssetBus.increment(window.AssetType.Superlikes, n, 'superlikes-engine'); },
  set(n=0){ try { console.log('[SUPERLIKES GENERATED]', n); } catch(_){} AssetBus.update({ superlikes: n, type: window.AssetType.Superlikes }, 'superlikes-engine'); }
};
