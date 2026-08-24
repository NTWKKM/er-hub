// service-worker.js — Offline PWA cache for ER Standing Order Hub
// Caches all static assets for offline access (ED wifi outages during stroke workup)
// CRITICAL: Always keep in sync with the nav-right version string in index.html
const CACHE_VERSION = 'er-hub-v72';
const CACHE_DATE = '24/08/2569';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './orders/rtpa.html',
  './orders/rtpa-v2.html',
  './orders/stemi.html',
  './orders/nstemi.html',
  './orders/nstemi-v2.html',
  './orders/pe.html',
  './orders/heparin.html',
  './orders/antivenom.html',
  './orders/antivenom-v2.html',
  './orders/sedation.html',
  './orders/anaphylaxis.html',
  './tools/drip-calculator.html',
  './tools/rsi-checklist.html',
  './tools/resus-timer.html',
  './tools/nihss.html',
  './tools/nihss-v2.html',
  './tools/Urgent-Clinic-Home-Medication.html',
  './tools/score-hub.html',
  './tools/tb-calculator.html',
  './tools/mgso4-calculator.html',
  './tools/burn-manager.html',
  './tools/electrolyte-hub.html',
  './tools/er-note/index.html',
  './tools/er-note/general-er-note.html',
  './tools/er-note/sepsis.html',
  './tools/er-note/trauma.html',
  './tools/er-note/mammalian-bite.html',
  './tools/er-note/chest-pain.html',
  './tools/er-note/abdominal-pain.html',
  './tools/er-note/eye-injury.html',
  './tools/er-note/er-note.css',
  './tools/er-note/er-note.js',
  './shared/base.css',
  './shared/print.css',
  './shared/components.js',
  './shared/calc-engine.js',
  './shared/clinical-engine.js',
  './shared/anticoag-engine.js',
  './shared/stroke-engine.js',
  './shared/stemi-engine.js',
  './shared/drug-data.js',
  './shared/ob-engine.js',
  './shared/burn-engine.js',
  './shared/electrolyte-engine.js',
  './shared/print-bootstrap.js',
  './shared/blank-print-engine.js',
  './shared/form-validate.js',
  './docs/icon-512x512.png',
  './docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png',
  './docs/burn-assets/airway-burn-atls.png',
  './docs/burn-assets/escharotomy-atls.png',
  './docs/burn-assets/escharotomy-chest-tintinalli.png',
  './docs/burn-assets/escharotomy-hand-tintinalli.png',
  './docs/STEMI-PE/STEMI new 26-4doc.pdf',
  './docs/STEMI-PE/PE-Massive-merged.pdf',
  './docs/High alert drug ER/Heparin.pdf',
  './docs/Toxico/Standing order for Antivenom update.pdf',
  './docs/order Sedation-Fen-dormicum/fen.pdf',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap',
  'https://fonts.gstatic.com/s/intertight/v9/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mj0QiqXA.ttf',
  'https://fonts.gstatic.com/s/intertight/v9/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mj6AiqXA.ttf',
  'https://fonts.gstatic.com/s/intertight/v9/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mjDw-qXA.ttf',
  'https://fonts.gstatic.com/s/intertight/v9/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2mjPQ-qXA.ttf',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsD8ah8QA.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsD8ahuQ2e8Smg.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsE8ah8QA.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsE8ahuQ2e8Smg.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsH8ag.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsH8ahuQ2e8.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsI8ah8QA.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsI8ahuQ2e8Smg.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsJ8ah8QA.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsJ8ahuQ2e8Smg.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsK8ah8QA.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsK8ahuQ2e8Smg.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsL8ah8QA.woff2',
  'https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsL8ahuQ2e8Smg.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8-qxjPQ.ttf',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8L6tjPQ.ttf',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx3cwgknk-6nFg.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx3cwhsk.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx7cwgknk-6nFg.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx7cwhsk.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwgknk-4.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxPcwgknk-6nFg.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxPcwhsk.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxTcwgknk-6nFg.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxTcwhsk.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx_cwgknk-6nFg.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx_cwhsk.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9WBI.ttf',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9aAFJn2QN.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9aAFJn3YO5gjupg.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9aBVJn3YO5gg.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9aBVJnw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9aBpJn2QN.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9aBpJn3YO5gjupg.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9aBtJn2QN.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9aBtJn3YO5gjupg.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5sik8s6yLUrwB0lw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5sik8s6zDX.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5silQs6yLUrwB0lw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5silQs6zDX.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5silUs6yLUrwB0lw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5silUs6zDX.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5silss6w.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5silss6yLUrwA.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5sulw.ttf',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YMptik8s6yLUrwB0lw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YMptik8s6zDX.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YMptilQs6yLUrwB0lw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YMptilQs6zDX.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YMptilUs6yLUrwB0lw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YMptilUs6zDX.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YMptilss6w.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YMptilss6yLUrwA.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YMptulw.ttf',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YOZqik8s6yLUrwB0lw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YOZqik8s6zDX.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YOZqilQs6yLUrwB0lw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YOZqilQs6zDX.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YOZqilUs6yLUrwB0lw.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YOZqilUs6zDX.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YOZqilss6w.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YOZqilss6yLUrwA.woff2',
  'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YOZqulw.ttf'
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
          // Cache successful responses (same-origin and Google Fonts)
          if ((response.ok || response.type === 'opaque') &&
              (event.request.url.startsWith(self.location.origin) ||
               event.request.url.startsWith('https://fonts.googleapis.com') ||
               event.request.url.startsWith('https://fonts.gstatic.com'))) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
