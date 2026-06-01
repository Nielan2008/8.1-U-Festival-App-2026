const CACHE_NAME = 'loveu-festival-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];
 
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});
 
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : null)
      ))
      .then(() => self.clients.claim())
  );
});
 
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
 
  // Never intercept API calls — let them go straight to the server
  if (url.pathname.startsWith('/api')) return;
 
  // Never intercept non-GET requests
  if (event.request.method !== 'GET') return;
 
  // Never intercept cross-origin requests
  if (url.origin !== self.location.origin) return;
 
  // Only cache static assets
  const isStaticAsset = (
    ASSETS.includes(url.pathname) ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.ico')
  );
 
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          // Only cache valid responses
          if (response && response.ok && response.status === 200) {
            const responseToCache = response.clone(); // clone BEFORE consuming
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => cached);
 
        return cached || fetchPromise;
      })
    );
  }
});