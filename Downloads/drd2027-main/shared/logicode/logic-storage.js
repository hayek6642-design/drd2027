// FILE: shared/logicode/logic-storage.js
// -----------------------------
export const STORAGE_CONFIG = {
  DB_NAME: 'logicode_v1',
  TEMP_STORE: 'temp_codes',
  BARS_STORE: 'bars',
  SYNC_STORE: 'sync_queue'
};

export async function openDb(dbName = STORAGE_CONFIG.DB_NAME) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = (evt) => {
      const db = evt.target.result;
      if (!db.objectStoreNames.contains(STORAGE_CONFIG.TEMP_STORE)) db.createObjectStore(STORAGE_CONFIG.TEMP_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORAGE_CONFIG.BARS_STORE)) db.createObjectStore(STORAGE_CONFIG.BARS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORAGE_CONFIG.SYNC_STORE)) db.createObjectStore(STORAGE_CONFIG.SYNC_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbTxn(storeName, mode, cb) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    try {
      const r = cb(store);
      tx.oncomplete = () => res(r);
      tx.onerror = () => rej(tx.error);
    } catch (e) { rej(e); }
  });
}

export async function idbPut(storeName, obj) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(obj);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

export async function idbGetAll(storeName) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}

export async function idbGet(storeName, key) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
}

export async function idbDelete(storeName, key) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}