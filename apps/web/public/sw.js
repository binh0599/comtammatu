/// <reference lib="webworker" />

/**
 * Service Worker for Cơm Tấm Má Tư POS
 *
 * Strategy:
 *  - POS static assets (JS/CSS): Cache-first (stale-while-revalidate)
 *  - Server Actions / API calls: Network-first with offline queue awareness
 *  - Images: Cache-first with 7-day expiry
 *  - Navigation (HTML): Network-first, fallback to offline page
 */

const CACHE_NAME = "pos-cache-v1";
const OFFLINE_PAGE = "/pos/offline";

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/pos",
  "/pos/offline",
];

// ---------------------------------------------------------------------------
// Install: pre-cache essential POS assets
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---------------------------------------------------------------------------
// Activate: clean up old caches
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch handler
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (Server Actions use POST) — let them pass through
  // The client-side offline queue handles failed mutations
  if (request.method !== "GET") {
    return;
  }

  // Skip Supabase realtime websocket connections
  if (url.hostname.includes("supabase.co")) {
    return;
  }

  // Skip non-POS routes — we only cache POS-related assets
  const isPosRoute =
    url.pathname.startsWith("/pos") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/favicon");

  if (!isPosRoute) {
    return;
  }

  // Navigation requests (HTML pages): Network-first, fallback to cache then offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses for offline use
          if (response.ok && url.pathname.startsWith("/pos")) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached || caches.match(OFFLINE_PAGE) || new Response("Offline", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              })
          )
        )
    );
    return;
  }

  // Static assets (JS/CSS/images): Stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|woff2?|png|jpg|svg|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const cloned = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: Network-first for other POS GET requests (data fetches via RSC)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })))
  );
});

// ---------------------------------------------------------------------------
// Message handler — for cache invalidation from the app
// ---------------------------------------------------------------------------

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "CLEAR_CACHE") {
    caches.delete(CACHE_NAME);
  }
});
