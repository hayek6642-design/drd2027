import { AssetBus } from '../local-asset-bus.js';
import '../asset-types.js';

window.LikesEngine = {
  add(n=1){ try { console.log('[LIKES GENERATED]', n); } catch(_){} AssetBus.increment(window.AssetType.Likes, n, 'likes-engine'); },
  set(n=0){ try { console.log('[LIKES GENERATED]', n); } catch(_){} AssetBus.update({ likes: n, type: window.AssetType.Likes }, 'likes-engine'); }
};
