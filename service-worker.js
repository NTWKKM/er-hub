// service-worker.js — Offline PWA cache for ER Standing Order Hub
// Caches all static assets for offline access (ED wifi outages during stroke workup)
// CRITICAL: Always keep in sync with the nav-right version string in index.html
const CACHE_VERSION = 'er-hub-v124';
const CACHE_DATE = '23/11/2569';
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
  './tools/nihss.html',
  './tools/nihss-v2.html',
  './tools/electrolyte-hub.html',
  './tools/burn-manager.html',
  './tools/tb-calculator.html',
  './tools/mgso4-calculator.html',
  './tools/screen/tool-screen.css',
  './tools/screen/tokens.css',
  './tools/screen/base.css',
  './tools/Urgent-Clinic-Home-Medication.html',
  './tools/score-hub.html',
  './tools/rsi-checklist.html',
  './tools/resus-timer.html',
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
  './shared/abx-engine.js',
  './tools/abx-renal-dosing.html',
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
  /* Self-hosted fonts (Thai + Latin WOFF2 subsets) */
  './shared/fonts/Sarabun-400-thai.woff2',
  './shared/fonts/Sarabun-400-latin.woff2',
  './shared/fonts/Sarabun-700-thai.woff2',
  './shared/fonts/Sarabun-700-latin.woff2',
  './shared/fonts/InterTight-400-latin.woff2',
  './shared/fonts/InterTight-400-latin-ext.woff2',
  './shared/fonts/InterTight-500-latin.woff2',
  './shared/fonts/InterTight-500-latin-ext.woff2',
  './shared/fonts/InterTight-600-latin.woff2',
  './shared/fonts/InterTight-600-latin-ext.woff2',
  './shared/fonts/InterTight-700-latin.woff2',
  './shared/fonts/InterTight-700-latin-ext.woff2',
  './shared/fonts/JetBrainsMono-500-latin.woff2',
  './shared/fonts/JetBrainsMono-500-latin-ext.woff2',
  './shared/fonts/JetBrainsMono-700-latin.woff2',
  './shared/fonts/JetBrainsMono-700-latin-ext.woff2'
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
      // 'reload' bypasses the HTTP cache so a new CACHE_VERSION never precaches stale files
      const response = await fetch(url, { cache: 'reload' });
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
  // Static Routing API — serve immutable reference assets (PDFs, images) straight from cache
  // (Chromium 123+). /shared/* is deliberately NOT routed here: engines and styles must stay
  // in step with the HTML that loads them (see the fetch handler).
  if (event.addRoutes) {
    // Resolve against the SW scope so routes still match when hosted under a sub-path
    // (e.g. GitHub Pages /er-hub/); a bare '/docs/*' would only match at the origin root.
    const scopePath = new URL(self.registration.scope).pathname;
    event.addRoutes([
      { condition: { urlPattern: { pathname: scopePath + 'docs/*' }, requestMethod: 'GET' }, source: 'cache' }
    ]);
  }
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);

      // Precache all assets with per-asset retry.
      // If any asset fails after retries, abort install and clean up the partial cache
      // so the previous working offline cache is retained and not deleted during activation.
      const failed = [];
      await Promise.all(
        ASSETS.map(async (url) => {
          try {
            const response = await fetchWithRetry(url, 2, 100);
            await cache.put(url, response);
          } catch (err) {
            console.error(`[SW install] Failed to cache ${url}:`, err.message);
            failed.push({ url, error: err.message });
          }
        })
      );

      if (failed.length > 0) {
        // Clean up incomplete cache to prevent partial offline state
        await caches.delete(CACHE_VERSION);
        const failedUrls = failed.map(f => f.url).join(', ');
        throw new Error(`[SW install] Precache failed for ${failed.length} asset(s): ${failedUrls}. Aborting install to prevent activating an incomplete cache.`);
      }

      console.info(`[SW install] Precached all ${ASSETS.length} assets successfully into ${CACHE_VERSION}.`);
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Enable Navigation Preload — parallel network fetch during SW wake-up (saves ~300ms)
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    // Atomic cache cleanup — delete all caches except the current version
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

// ── Fetch strategy ────────────────────────────────────────────────────────────
// Code (navigations, HTML, JS, CSS, JSON) is network-first so a page and the engines it
// loads always come from the same deploy. Serving HTML from the network but engines from
// an older cache caused version skew (e.g. new NSTEMI HTML calling a function the cached
// clinical-engine.js did not have). Fonts, images and PDFs stay cache-first.
const NETWORK_TIMEOUT_MS = 5000;
const CODE_PATH = /\.(?:html?|js|mjs|css|json)$/i;

// Persisting a copy is best-effort: a quota or storage error must not turn a good network
// response into a fallback.
async function putInCache(request, response) {
  try {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response);
  } catch (err) {
    console.warn('[SW] cache.put failed:', request.url, err && err.message);
  }
}

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isCodeRequest(request) {
  if (request.mode === 'navigate') return true;
  if (!isSameOrigin(request)) return false;
  if (request.destination === 'script' || request.destination === 'style') return true;
  return CODE_PATH.test(new URL(request.url).pathname);
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

async function networkFirst(request, preloadPromise, waitUntil) {
  // 'no-cache' revalidates with the server (cheap 304) instead of trusting the HTTP cache.
  // The timeout covers only the network request; the cache write runs outside it (kept
  // alive by waitUntil) so a slow write cannot turn a successful fetch into a fallback.
  const network = Promise.resolve(preloadPromise || null)
    .catch(() => null)
    .then((preloaded) => preloaded || fetch(request, { cache: 'no-cache' }))
    .then((response) => {
      if (response && response.ok && response.type === 'basic') {
        const write = putInCache(request, response.clone());
        if (waitUntil) waitUntil(write);
      }
      return response;
    });
  try {
    return await withTimeout(network, NETWORK_TIMEOUT_MS);
  } catch (err) {
    // Offline or very slow network: fall back to the cached copy (query strings such as
    // ?draft=<id> are ignored so ER NOTE drafts still open offline)
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    return new Response('', { status: 503, statusText: 'Offline and not cached' });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  let response;
  try {
    response = await fetch(request);
  } catch (err) {
    return new Response('', { status: 503, statusText: 'Offline and not cached' });
  }
  // Cache successful same-origin responses for offline resilience
  if (response.ok && isSameOrigin(request)) {
    await putInCache(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (isCodeRequest(event.request)) {
    // Navigation Preload starts the network request in parallel with SW wake-up
    const preload = event.request.mode === 'navigate' ? event.preloadResponse : null;
    event.respondWith(networkFirst(event.request, preload, (p) => event.waitUntil(p)));
  } else {
    event.respondWith(cacheFirst(event.request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
