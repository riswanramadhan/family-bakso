const CACHE_VERSION = 'v3';
const CACHE_NAME = `family-bakso-pos-${CACHE_VERSION}`;
const APP_SHELL = [
  '/',
  '/kasir',
  '/dapur',
  '/rekap',
  '/sinkronisasi',
  '/images/qris-family-bakso.jpg',
  '/images/menu/mie-ayam-bakar.webp',
  '/images/menu/mie-ayam-kuah.webp',
  '/images/menu/bakso-spesial.webp',
  '/images/menu/es-teh.webp',
];

function isCacheableStaticRequest(request) {
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return false;
  if (url.pathname.startsWith('/api/')) return false;

  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/images/') ||
    /\.(?:css|js|mjs|json|png|jpg|jpeg|webp|avif|svg|ico|woff2?)$/i.test(url.pathname)
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve(true);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const isDocument = request.mode === 'navigate';

  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/kasir');
          return fallback || Response.error();
        })
    );
    return;
  }

  if (!isCacheableStaticRequest(request)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response.ok) return response;
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => Response.error());
    })
  );
});
