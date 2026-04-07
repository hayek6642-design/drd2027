// ACC Bridge — communicates with CodeBank parent window via postMessage
// Falls back to local mock if not embedded in CodeBank

export interface AccAssets {
  codes: number;
  silver: number;
  gold: number;
}

export interface PendingTreasure {
  id: string;
  type: 'codes' | 'silver' | 'gold';
  amount: number;
  minedAt: number;
  lat: number;
  lng: number;
  regionName: string;
}

type AssetsListener = (assets: AccAssets) => void;

class AccBridge {
  private assets: AccAssets = { codes: 100, silver: 10, gold: 1 };
  private pending: PendingTreasure[] = [];
  private listeners: AssetsListener[] = [];
  private isEmbedded: boolean = false;

  constructor() {
    // Check if running inside CodeBank iframe
    try {
      this.isEmbedded = window.self !== window.top;
    } catch {
      this.isEmbedded = true;
    }

    if (this.isEmbedded) {
      window.addEventListener('message', this.handleParentMessage.bind(this));
      // Request current assets from parent
      this.postToParent({ type: 'YAHOOD_INIT', payload: {} });
    }
  }

  private handleParentMessage(event: MessageEvent) {
    if (!event.data || event.data.source !== 'ACC') return;
    if (event.data.type === 'ACC_ASSETS_UPDATE') {
      this.assets = event.data.payload;
      this.notify();
    }
  }

  private postToParent(msg: object) {
    try {
      window.parent.postMessage({ source: 'YAHOOD', ...msg }, '*');
    } catch {
      // standalone mode — ignore
    }
  }

  getAssets(): AccAssets {
    return { ...this.assets };
  }

  getPending(): PendingTreasure[] {
    return [...this.pending];
  }

  addPending(treasure: Omit<PendingTreasure, 'id' | 'minedAt'>): PendingTreasure {
    const t: PendingTreasure = {
      ...treasure,
      id: crypto.randomUUID(),
      minedAt: Date.now(),
    };
    this.pending.push(t);
    return t;
  }

  depositAll(): AccAssets {
    const totals: AccAssets = { codes: 0, silver: 0, gold: 0 };
    for (const t of this.pending) {
      totals[t.type] += t.amount;
      this.assets[t.type] += t.amount;
    }
    this.pending = [];

    if (this.isEmbedded) {
      this.postToParent({ type: 'YAHOOD_EARN', payload: totals });
    }

    this.notify();
    return this.getAssets();
  }

  spendSilver(amount: number): boolean {
    if (this.assets.silver < amount) return false;
    this.assets.silver -= amount;
    if (this.isEmbedded) {
      this.postToParent({ type: 'YAHOOD_SPEND', payload: { silver: amount } });
    }
    this.notify();
    return true;
  }

  stealAll(): PendingTreasure[] {
    const stolen = [...this.pending];
    this.pending = [];
    return stolen;
  }

  receiveStolen(treasures: PendingTreasure[]) {
    for (const t of treasures) {
      this.pending.push({ ...t, id: crypto.randomUUID(), minedAt: Date.now() });
    }
  }

  subscribe(fn: AssetsListener) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.getAssets()));
  }
}

export const accBridge = new AccBridge();
