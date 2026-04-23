import { AssetBus } from '../local-asset-bus.js';
import '../asset-types.js';

window.GamesEngine = {
  add(n=1){ try { console.log('[GAMES GENERATED]', n); } catch(_){} AssetBus.increment(window.AssetType.Games, n, 'games-engine'); },
  set(n=0){ try { console.log('[GAMES GENERATED]', n); } catch(_){} AssetBus.update({ games: n, type: window.AssetType.Games }, 'games-engine'); }
};
