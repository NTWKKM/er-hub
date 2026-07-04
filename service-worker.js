// service-worker.js — Offline PWA cache for ER Standing Order Hub
// Caches all static assets for offline access (ED wifi outages during stroke workup)
const CACHE_VERSION = 'er-hub-v8';
const ASSETS = [
  './',
  './index.html',
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
  './shared/print-bootstrap.js',
  './shared/blank-print-engine.js',
  './shared/form-validate.js',
  './docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png',
  './docs/STEMI-PE/STEMI new 26-4doc.pdf',
  './docs/STEMI-PE/PE-Massive-merged.pdf',
  './docs/High alert drug ER/Heparin.pdf',
  './docs/Toxico/Standing order for Antivenom update.pdf',
  './docs/order Sedation-Fen-dormicum/fen.pdf',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap'
];

/**
 * Retry helper: attempt fetch with exponential backoff.
 * @param {string} url - URL to fetch
 * @param {number} maxRetries - max retry attempts (default 2)
 * @param {number} delayMs - initial delay in ms (default 100)
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, maxRetries = 2, delayMs = 100) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.type === 'opaque') {
        // opaque responses (cross-origin) have no status property
        return response;
      }
      if (response.status === 404) {
        throw new Error(`404 Not Found: ${url}`);
      }
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt)));
        continue;
      }
      throw new Error(`Failed after ${maxRetries} retries: ${url}`);
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);

      // Precache all assets with per-asset retry on failure.
      // allSettled ensures one failure doesn't block others.
      // Log failures but don't fail the install.
      const results = await Promise.allSettled(
        ASSETS.map(async (url) => {
          try {
            const response = await fetchWithRetry(url, 2, 100);
            await cache.put(url, response);
            return { url, success: true };
          } catch (err) {
            // Log but don't throw — precache should be resilient
            console.warn(`Failed to cache ${url}:`, err.message);
            return { url, success: false, error: err.message };
          }
        })
      );

      // Optional: log summary
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      if (failed > 0) {
        console.warn(`[SW install] Precached ${succeeded}/${ASSETS.length} assets. ${failed} failed (will retry on next load).`);
      }
    })()
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
