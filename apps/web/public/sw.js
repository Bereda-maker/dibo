const CACHE_VERSION = "dibora-shell-v1";
const APP_SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/icon.png", "/favicon.ico", "/images/dibora-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match("/offline.html"))));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || ["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith(caches.match(request).then((cached) => {
      const fresh = fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || fresh;
    }));
  }
});
