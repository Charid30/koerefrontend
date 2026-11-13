// Service Worker — KOERE GMAO
// Stratégie : Network-first avec cache de secours.
// Incrémenter CACHE_VERSION à chaque déploiement pour forcer le vidage du cache.
const CACHE_VERSION = 'koere-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ne jamais mettre en cache les appels API
  if (url.pathname.startsWith('/api')) return;

  // Ignorer les WebSockets
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Fallback vers index.html pour les routes SPA
        if (event.request.destination === 'document') {
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }

        return new Response(
          JSON.stringify({ error: 'Hors ligne et ressource non disponible en cache' }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
  );
});
