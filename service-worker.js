// service-worker.js — Offline PWA cache for ER Standing Order Hub
// Caches all static assets for offline access (ED wifi outages during stroke workup)
const CACHE_VERSION = 'er-hub-v1';
const ASSETS = [
  './',
  './index.html',
  './favicon.svg',
  './orders/rtpa.html',
  './orders/stemi.html',
  './orders/nstemi.html',
  './orders/pe.html',
  './orders/heparin.html',
  './orders/antivenom.html',
  './orders/sedation.html',
  './tools/drip-calculator.html',
  './shared/base.css',
  './shared/print.css',
  './shared/components.js',
  './shared/calc-engine.js',
  './shared/anticoag-engine.js',
  './shared/drug-data.js',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for navigation requests, cache-first for assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          // Cache successful responses (same-origin only)
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  }
});