import { initDB, cleanupExpiredMessages, startCleanupInterval } from "./indexeddb";

const CLEANUP_INTERVAL = 60000;

export function startIndexedDBCleanup() {
  initDB().then(() => {
    startCleanupInterval(CLEANUP_INTERVAL);
    cleanupExpiredMessages();
  });
}