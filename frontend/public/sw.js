// Service Worker for Protein.tn PWA
// Enables the beforeinstallprompt event on Android/Chrome and provides basic offline fallback.

const CACHE_NAME = 'protein-tn-v1';
const PRECACHE_URLS = [
  '/',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first, fallback to cache for GET requests.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Skip cross-origin requests (API, images CDN) — let them go directly.
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML/static responses.
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
