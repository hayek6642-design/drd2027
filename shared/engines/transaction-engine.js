import { AssetBus } from '../local-asset-bus.js';
import '../asset-types.js';

window.TransactionEngine = {
  add(n=1){ try { console.log('[TRANSACTIONS GENERATED]', n); } catch(_){} AssetBus.increment(window.AssetType.Transactions, n, 'transaction-engine'); },
  set(n=0){ try { console.log('[TRANSACTIONS GENERATED]', n); } catch(_){} AssetBus.update({ transactions: n, type: window.AssetType.Transactions }, 'transaction-engine'); }
};
