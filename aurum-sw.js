const AURUM_CACHE = 'aurum-app-2026-05-19-02';
const AURUM_SHELL = [
  './',
  './aurum-calc.html',
  './aurum-monitor.html',
  './calculator.js',
  './calculator-core.js',
  './AurumHiveModule.js',
  './AurumHiveModel.js',
  './aurum-wordmark.svg',
  './aurum-app-icon.svg',
  './site.webmanifest',
  './app-version.json',
  './hive-version.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(AURUM_CACHE)
      .then(cache => cache.addAll(AURUM_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('aurum-app-') && key !== AURUM_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function cacheFreshResponse(request, response) {
  if (!response || response.status !== 200) return response;
  const copy = response.clone();
  caches.open(AURUM_CACHE).then(cache => cache.put(request, copy));
  return response;
}

function networkFirst(request, fallbackUrl) {
  return fetch(request)
    .then(response => cacheFreshResponse(request, response))
    .catch(() => caches.match(request, { ignoreSearch: true })
      .then(cached => cached || (fallbackUrl ? caches.match(fallbackUrl) : null)));
}

function cacheFirst(request) {
  return caches.match(request, { ignoreSearch: true })
    .then(cached => cached || fetch(request).then(response => cacheFreshResponse(request, response)));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './aurum-calc.html'));
    return;
  }

  if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
