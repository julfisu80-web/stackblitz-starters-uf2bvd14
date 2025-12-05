self.addEventListener("install", (event) => {
  console.log("Service Worker instalado");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activado");
  return self.clients.claim();
});

// Estrategia simple: permitir que la app funcione offline con cache básico
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.open("cho-cache").then((cache) =>
      cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (event.request.method === "GET") {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => response);

        return response || fetchPromise;
      })
    )
  );
});


