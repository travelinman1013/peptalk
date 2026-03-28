const CACHE_NAME = "peptalk-v2";
const THUMBNAIL_CACHE = "thumbnails-v2";
const API_CACHE = "api-v1";
const VIDEO_CACHE = "videos-v1";
const MAX_THUMBNAILS = 2000;
const MAX_VIDEOS = 30;

// App shell to pre-cache on install
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean up old cache versions
  const keepCaches = new Set([CACHE_NAME, THUMBNAIL_CACHE, API_CACHE, VIDEO_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !keepCaches.has(k)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Static assets (hashed filenames) — cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Thumbnails — cache-first with size cap
  if (url.pathname.includes("/thumbnails/")) {
    event.respondWith(
      caches.open(THUMBNAIL_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then(async (response) => {
            if (response.ok) {
              const keys = await cache.keys();
              if (keys.length >= MAX_THUMBNAILS) {
                await cache.delete(keys[0]);
              }
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // Videos (*.mp4) — cache-first with size cap
  if (url.pathname.endsWith(".mp4") || url.pathname.includes("/video")) {
    // Only cache full requests, not range requests
    if (event.request.headers.get("range")) return;
    event.respondWith(
      caches.open(VIDEO_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then(async (response) => {
            if (response.ok) {
              const keys = await cache.keys();
              if (keys.length >= MAX_VIDEOS) {
                await cache.delete(keys[0]);
              }
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // Browse API — stale-while-revalidate
  if (url.pathname === "/browse" || url.pathname.endsWith("/browse")) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cached); // fallback to cache on network failure

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else — network-only
});
