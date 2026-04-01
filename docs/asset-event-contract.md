# Asset Event Contract (Local Only)

## Event: `assets:updated`
- Source of truth for all UI updates.
- Fired by the single writer on the page via `AssetBus`.
- Never read from storage; no polling.

### Payload (`detail`)
- `type` (string, required): one of `codes`, `likes`, `superlikes`, `games`, `transactions`.
- `latest` (string, optional): latest code value.
- `count` (number, required for `codes`): total codes count (non-negative).
- `likes` (number, optional, non-negative).
- `superlikes` (number, optional, non-negative).
- `games` (number, optional, non-negative).
- `transactions` (number, optional, non-negative).
- `ts` (number, required): monotonic timestamp for ordering.
- `proof` (string, required): event proof token.
- `expiryTs` (number, required): proof expiry timestamp.

## Snapshot (Handshake to CodeBank)
- Unified object sent via `CODEBANK_ASSETS_SYNC`.
- Fields:
  - `latestCode` (string)
  - `codesList` (array of strings)
  - `count` (number)
  - `ts` (number)
  - `likesCount` (number)
  - `superlikesCount` (number)
  - `gamesCount` (number)
  - `transactionsCount` (number)

## Guarantees
- Ordering: `ts` increases; events with stale `ts` are considered older.
- Source of truth: Only events; UI does not read storage.
- Single writer: `yt-new-clear` page emits all events.
- Reflector-only: CodeBank consumes snapshot, does not generate or persist.

## Allowed
- Event-driven UI updates.
- Validation by `AssetPolicy` prior to emission.

## Forbidden
- Backend, Auth, API calls.
- IndexedDB or localStorage reads in UI.
- Polling or duplicate buses.
- Generation logic inside UI/dashboard.

