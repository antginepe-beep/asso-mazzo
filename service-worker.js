const CACHE_NAME = 'asso-mazzo-v3';
const APP_BASE = self.location.pathname.replace(/\/service-worker\.js$/, '') || '/';
const urlsToCache = [
  `${APP_BASE}/`,
  `${APP_BASE}/index.html`,
  `${APP_BASE}/style.css`,
  `${APP_BASE}/script.js`,
  `${APP_BASE}/manifest.json`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME) {
          return caches.delete(cacheName);
        }
        return null;
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || new Response('Offline - Contenuto non disponibile', { status: 503 });
      })
  );
});
