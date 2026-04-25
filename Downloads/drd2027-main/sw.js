// CodeBank Service Worker — v2.0.0
// Handles: offline caching, background sync, push notifications, install lifecycle

const CACHE_NAME = 'codebank-v2';
const STATIC_CACHE = 'codebank-static-v2';
const DYNAMIC_CACHE = 'codebank-dynamic-v2';

// Core app shell to cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/login.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/src/native-bridge.js',
  '/src/native-storage.js',
  '/public/bankode-core.js',
  '/public/layout-bootstrap.js',
  '/codebank/js/app-registry.js',
  '/codebank/aihub.html',
  '/codebank/shots.html'
];

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing CodeBank service worker…');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      // Use individual adds so one 404 doesn't break the whole install
      const cachePromises = APP_SHELL.map(url => 
        cache.add(url)
          .then(() => console.log('[SW] ✓ Cached:', url))
          .catch(e => {
            // Silently skip missing files (they may be optional or on CDN)
            // Only log errors for critical files
            if (url.includes('/index.html') || url.includes('/manifest.json')) {
              console.warn('[SW] ⚠ Could not cache', url, '—', e.message);
            }
          })
      );
      return Promise.allSettled(cachePromises);
    }).then(() => {
      console.log('[SW] App shell installation complete');
      return self.skipWaiting(); // Activate immediately
    })
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] Activated — controlling all clients');
      return self.clients.claim();
    })
  );
});

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-same-origin/CDN requests
  if (request.method !== 'GET') return;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // API calls — network first, no caching
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Critical shared/auth JS — always fetch latest from network
  if (
    url.pathname.startsWith('/shared/') && url.pathname.endsWith('.js') ||
    url.pathname.startsWith('/codebank/js/') && url.pathname.endsWith('.js')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Static assets — cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp)$/) ||
    APP_SHELL.includes(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ─── STRATEGIES ──────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || offlineFallback(request);
}

function offlineFallback(request) {
  const url = new URL(request.url);
  // Return cached index.html for navigation requests
  if (request.headers.get('Accept')?.includes('text/html')) {
    return caches.match('/index.html') || caches.match('/login.html');
  }
  // Generic offline response
  return new Response(JSON.stringify({ error: 'offline', message: 'No internet connection' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'CodeBank', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'CodeBank', {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'codebank',
      data: data.url ? { url: data.url } : {},
      vibrate: [100, 50, 100],
      requireInteraction: data.requireInteraction || false
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(c => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// ─── BACKGROUND SYNC ─────────────────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-purchases') {
    event.waitUntil(syncPendingPurchases());
  }
});

async function syncPendingPurchases() {
  try {
    const db = await openDB();
    const pending = await db.getAll('pending-purchases');
    for (const purchase of pending) {
      const res = await fetch('/api/pebalaash/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchase)
      });
      if (res.ok) await db.delete('pending-purchases', purchase.id);
    }
  } catch (e) {
    console.warn('[SW] Sync failed:', e);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('codebank-offline', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('pending-purchases', { keyPath: 'id' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] CodeBank service worker loaded — v2.0.0');
