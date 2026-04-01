
import EventEmitter from 'events';

class AssetEvents extends EventEmitter { }

export const assetEvents = new AssetEvents();

export const ASSET_EVENTS = {
    BALANCE_UPDATED: 'assets:balance_updated',
    LOCKED: 'assets:locked',
    RELEASED: 'assets:released',
    SPENT: 'assets:spent',
    INSUFFICIENT_FUNDS: 'assets:insufficient_funds'
};
