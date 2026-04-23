const DB_NAME = "e7ki_db";
const DB_VERSION = 1;
const MESSAGES_STORE = "messages";
const CHATS_STORE = "chats";
const FILES_STORE = "files";

let db = null;

export async function initDB() {
    if (db) return db;
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(MESSAGES_STORE)) {
                const messagesStore = database.createObjectStore(MESSAGES_STORE, { keyPath: "id" });
                messagesStore.createIndex("chatId", "chatId", { unique: false });
                messagesStore.createIndex("timestamp", "timestamp", { unique: false });
                messagesStore.createIndex("expiresAt", "expiresAt", { unique: false });
            }
            if (!database.objectStoreNames.contains(CHATS_STORE)) {
                const chatsStore = database.createObjectStore(CHATS_STORE, { keyPath: "id" });
                chatsStore.createIndex("updatedAt", "updatedAt", { unique: false });
            }
            if (!database.objectStoreNames.contains(FILES_STORE)) {
                const filesStore = database.createObjectStore(FILES_STORE, { keyPath: "messageId" });
                filesStore.createIndex("expiresAt", "expiresAt", { unique: false });
            }
        };
    });
}

export async function saveMessage(message) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([MESSAGES_STORE], "readwrite");
        const store = transaction.objectStore(MESSAGES_STORE);
        const request = store.put(message);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function getMessages(chatId, limit = 50) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([MESSAGES_STORE], "readonly");
        const store = transaction.objectStore(MESSAGES_STORE);
        const index = store.index("chatId");
        const request = index.getAll(IDBKeyRange.only(chatId));
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const messages = request.result;
            messages.sort((a, b) => a.timestamp - b.timestamp);
            resolve(messages.slice(-limit));
        };
    });
}

export async function deleteMessage(messageId) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([MESSAGES_STORE], "readwrite");
        const store = transaction.objectStore(MESSAGES_STORE);
        const request = store.delete(messageId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function saveChat(chat) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([CHATS_STORE], "readwrite");
        const store = transaction.objectStore(CHATS_STORE);
        const request = store.put(chat);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function getChats() {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([CHATS_STORE], "readonly");
        const store = transaction.objectStore(CHATS_STORE);
        const index = store.index("updatedAt");
        const request = index.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const chats = request.result;
            chats.sort((a, b) => b.updatedAt - a.updatedAt);
            resolve(chats);
        };
    });
}

export async function getChat(chatId) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([CHATS_STORE], "readonly");
        const store = transaction.objectStore(CHATS_STORE);
        const request = store.get(chatId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

export async function deleteChat(chatId) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([CHATS_STORE, MESSAGES_STORE], "readwrite");
        const chatsStore = transaction.objectStore(CHATS_STORE);
        const messagesStore = transaction.objectStore(MESSAGES_STORE);
        
        chatsStore.delete(chatId);
        const index = messagesStore.index("chatId");
        const request = index.openKeyCursor(IDBKeyRange.only(chatId));
        
        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                messagesStore.delete(cursor.primaryKey);
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = () => reject(request.error);
    });
}

export async function saveFileBlob(messageId, blob, expiresAt) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([FILES_STORE], "readwrite");
        const store = transaction.objectStore(FILES_STORE);
        const request = store.put({ messageId, blob, expiresAt });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function getFileBlob(messageId) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([FILES_STORE], "readonly");
        const store = transaction.objectStore(FILES_STORE);
        const request = store.get(messageId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const result = request.result;
            if (result && result.expiresAt > Date.now()) {
                resolve(result.blob);
            } else {
                if (result) store.delete(messageId);
                resolve(null);
            }
        };
    });
}

export async function cleanupExpiredMessages() {
    const database = await initDB();
    const now = Date.now();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([MESSAGES_STORE, FILES_STORE], "readwrite");
        
        const messagesStore = transaction.objectStore(MESSAGES_STORE);
        const messagesIndex = messagesStore.index("expiresAt");
        const messagesRequest = messagesIndex.openCursor(IDBKeyRange.upperBound(now));
        
        messagesRequest.onsuccess = () => {
            const cursor = messagesRequest.result;
            if (cursor) {
                messagesStore.delete(cursor.primaryKey);
                cursor.continue();
            }
        };

        const filesStore = transaction.objectStore(FILES_STORE);
        const filesIndex = filesStore.index("expiresAt");
        const filesRequest = filesIndex.openCursor(IDBKeyRange.upperBound(now));
        
        filesRequest.onsuccess = () => {
            const cursor = filesRequest.result;
            if (cursor) {
                filesStore.delete(cursor.primaryKey);
                cursor.continue();
            }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export function startCleanupInterval(intervalMs = 60000) {
    setInterval(cleanupExpiredMessages, intervalMs);
}

export async function updateMessageStatus(messageId, status) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([MESSAGES_STORE], "readwrite");
        const store = transaction.objectStore(MESSAGES_STORE);
        const request = store.get(messageId);
        
        request.onsuccess = () => {
            const message = request.result;
            if (message) {
                message.status = status;
                store.put(message);
            }
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

export async function updateMessageReactions(messageId, reactions) {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction([MESSAGES_STORE], "readwrite");
        const store = transaction.objectStore(MESSAGES_STORE);
        const request = store.get(messageId);
        
        request.onsuccess = () => {
            const message = request.result;
            if (message) {
                message.reactions = reactions;
                store.put(message);
            }
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}
