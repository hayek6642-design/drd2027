# File Upload Volatility and TTL

- Files are stored in-memory on the server with a strict TTL (default 5 minutes).
- Upload endpoint: `POST /api/upload` returns `{ id, url, expiresAt }`.
- Fetch endpoint: `GET /api/file/:id` serves raw bytes with correct `Content-Type`.
- After `expiresAt`, files are deleted and requests return `404 Not found or expired`.
- Clients should not rely on persistent storage; always treat file URLs as ephemeral.
- Recommended: persist only lightweight references in IndexedDB with `expiresAt` and clear them via the IndexedDB cleaner.

Operational notes:
- TTL can be overridden per upload via `ttlMs` if needed.
- No disk writes; memory-only to maximize privacy and reduce residue.
- Cache headers are `no-store` to prevent unintended retention.