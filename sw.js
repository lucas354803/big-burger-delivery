const CACHE_NAME = 'bigburger-pwa-v4-sem-cache-api';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => null)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Nunca cachear API, admin, motoboy ou arquivos JS do painel.
  // Isso evita salvar no Supabase e, ao atualizar, voltar para dados antigos do cache.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('admin') ||
    url.pathname.includes('motoboy') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => null);
        return response;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('/index.html')))
  );
});
