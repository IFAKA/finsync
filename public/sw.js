const CACHE_NAME = 'budget-pwa-v2';
const STATIC_CACHE = 'budget-static-v2';
const DYNAMIC_CACHE = 'budget-dynamic-v2';

// App shell - critical assets for offline
const APP_SHELL = [
  '/',
  '/transactions',
  '/budgets',
  '/rules',
  '/sync',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache app shell, but don't fail install if some fail
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`Failed to cache ${url}:`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !currentCaches.includes(key))
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Helper: Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached;
  }
}

// Helper: Network-first strategy with cache fallback
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation requests, return cached home page as fallback
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    throw new Error('No cached response available');
  }
}

// Helper: Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip cross-origin requests except for fonts
  const isSameOrigin = url.origin === self.location.origin;
  const isFontRequest = url.hostname.includes('fonts.googleapis.com') ||
                        url.hostname.includes('fonts.gstatic.com');

  if (!isSameOrigin && !isFontRequest) return;

  // Handle different request types

  // 1. API routes - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
    return;
  }

  // 2. Next.js static assets (_next/static) - cache first (immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // 3. Next.js data requests - network first
  if (url.pathname.startsWith('/_next/data/')) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
    return;
  }

  // 4. Font requests - cache first
  if (isFontRequest) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // 5. Static files (icons, manifest, etc) - cache first
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp|json)$/)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // 6. Navigation requests (HTML pages) - network first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
    return;
  }

  // 7. Everything else - stale while revalidate
  event.respondWith(staleWhileRevalidate(event.request, DYNAMIC_CACHE));
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
