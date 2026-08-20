// Service Worker for Protein.tn PWA
// Enables the beforeinstallprompt event on Android/Chrome and provides basic offline fallback.
//
// ── IT USED TO SIT IN FRONT OF EVERY REQUEST THIS SITE MAKES (20/08/2026) ───────────────────
// Owner: "still when i click on boutique it's not instantly browsing to /shop — fix it in the
// entire website."
//
// The previous handler was `if (method !== 'GET') return; if (cross-origin) return;` and then
// `event.respondWith(fetch(...))` for everything that survived. "Everything" meant:
//
//   · every `?_rsc=` payload — i.e. EVERY client-side navigation on the site
//   · every /_next/static chunk (already immutable and HTTP-cached for a year)
//   · every /_next/image response (this catalogue has ~23,000 packshots)
//   · every font
//
// Two costs, and the first is the one the owner is feeling. A request that a service worker
// answers cannot start until the worker is RUNNING: if it has been idle — which it has, for every
// first navigation of a session — the browser boots it first, and on a mid-range Android that is
// tens to low hundreds of milliseconds added to the front of the navigation, before a byte moves.
// The second is that every one of those responses was `clone()`d and written into a cache that has
// one fixed name and no eviction, so it grew without limit for the entire life of the install.
//
// None of that bought anything. Hashed chunks and images are already cached by the browser's own
// HTTP cache, correctly and with eviction; an RSC payload is a one-shot response that nothing ever
// re-requests. The only thing a cache here genuinely adds is an offline fallback for a DOCUMENT.
//
// So this worker now declines to handle anything but a document navigation, and it enables
// navigationPreload so that even those start fetching in parallel with the worker's own boot
// instead of after it.

const CACHE_NAME = 'protein-tn-v2';
const OFFLINE_FALLBACK = '/';
const PRECACHE_URLS = [
  '/',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png',
];

/**
 * Never store a document for these. They are per-customer or per-order, and a cached copy served
 * to the next person on a shared phone is the kind of bug that is impossible to reproduce and
 * unforgivable when it happens.
 */
const PRIVATE_PATHS = ['/account', '/checkout', '/cart', '/order-confirmation', '/login', '/register', '/reset-password'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Lets the browser issue the navigation request WHILE this worker is starting up, rather
      // than after. Without it a cold worker is pure added latency on the first navigation of
      // every session — which is exactly the one a visitor judges the site by.
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          // Not supported (Safari) — the fetch below still runs, just without the head start.
        }
      }
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  /*
   * NOT HANDLED, DELIBERATELY — falling out of this listener without calling respondWith() hands
   * the request straight back to the browser, which is faster than anything this file could do:
   *
   *   · cross-origin (the API, any CDN)
   *   · `?_rsc=` — every soft navigation and every prefetch. Passing these through the worker
   *     added a hop to the one path that has to feel instant, and cached a payload that is read
   *     once and never asked for again.
   *   · /_next/* — immutable, content-hashed, and already served with a one-year Cache-Control.
   *     A second copy in a service-worker cache is duplicated storage with worse eviction.
   *   · anything that is not a document navigation.
   */
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode !== 'navigate') return;
  if (url.searchParams.has('_rsc')) return;
  if (url.pathname.startsWith('/_next/')) return;

  const isPrivate = PRIVATE_PATHS.some(
    (p) => url.pathname === p || url.pathname.startsWith(`${p}/`)
  );

  event.respondWith(
    (async () => {
      try {
        // The response navigationPreload already started, if the browser supports it.
        const preloaded = await event.preloadResponse;
        const response = preloaded || (await fetch(request));

        if (!isPrivate && response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          // Not awaited: writing the cache must never sit between the network and the paint.
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      } catch {
        // Offline. Serve this page if we have it, else the homepage shell, else let the browser
        // show its own network-error page — which is a better answer than an empty 200.
        const cached = await caches.match(request);
        if (cached) return cached;
        const fallback = await caches.match(OFFLINE_FALLBACK);
        if (fallback) return fallback;
        return Response.error();
      }
    })()
  );
});
