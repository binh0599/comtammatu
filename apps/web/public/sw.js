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

  // Skip routes outside POS/customer — we only cache app-related assets
  const isAppRoute =
    url.pathname.startsWith("/pos") ||
    url.pathname.startsWith("/customer") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/favicon");

  if (!isAppRoute) {
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
// Push notification handler
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Cơm tấm Má Tư", body: event.data.text() };
  }

  const { title, body, icon, url, type } = payload;

  const options = {
    body: body || "",
    icon: icon || "/favicon.ico",
    badge: "/favicon.ico",
    tag: type || "general",
    renotify: true,
    data: { url: url || "/", type },
    actions: url
      ? [{ action: "open", title: "Xem chi tiết" }]
      : [],
  };

  event.waitUntil(self.registration.showNotification(title || "Thông báo", options));
});

// ---------------------------------------------------------------------------
// Notification click handler
// ---------------------------------------------------------------------------

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if possible
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window
        return self.clients.openWindow(url);
      })
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
