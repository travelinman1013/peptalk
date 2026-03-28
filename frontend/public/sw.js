const CACHE_NAME = "peptalk-v1";
const THUMBNAIL_CACHE = "thumbnails-v1";
const MAX_THUMBNAILS = 500;

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
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== THUMBNAIL_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

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
              // Evict oldest if over cap
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

  // Everything else (API, videos) — network-only
});
