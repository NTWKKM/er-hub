/**
 * Service worker fetch strategy: code assets must come from the same deploy as the page.
 * Regression: new NSTEMI HTML (network) + cached old clinical-engine.js → TypeError.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SW_SRC = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
const ORIGIN = 'https://ntwkkm.github.io';
const SCOPE = ORIGIN + '/er-hub/';

/** Boot the real service-worker.js with mocked caches and fetch. */
function bootSW({ network, cached = {} }) {
    const store = new Map(Object.entries(cached));      // url → body (the "old" cache)
    const fetchCalls = [];
    const handlers = {};
    const keyOf = (req, opts = {}) => {
        const u = new URL(typeof req === 'string' ? req : req.url, SCOPE);
        if (opts.ignoreSearch) u.search = '';
        return u.href;
    };
    const match = async (req, opts = {}) => {
        const key = keyOf(req, opts);
        for (const [k, body] of store) {
            const kk = opts.ignoreSearch ? (() => { const u = new URL(k); u.search = ''; return u.href; })() : k;
            if (kk === key) return new Response(body, { status: 200 });
        }
        return undefined;
    };
    const caches = {
        open: async () => ({ put: async (req, res) => { store.set(keyOf(req), await res.text()); } }),
        match,
        keys: async () => [],
        delete: async () => true
    };
    const fetch = async (req, opts) => {
        const url = typeof req === 'string' ? req : req.url;
        fetchCalls.push({ url, opts });
        return network(url, opts);
    };
    const self = {
        location: { origin: ORIGIN },
        registration: { scope: SCOPE },
        addEventListener: (type, fn) => { handlers[type] = fn; },
        clients: { claim: () => {} },
        skipWaiting: () => {}
    };
    vm.runInNewContext(SW_SRC, { self, caches, fetch, Response, URL, Promise, setTimeout, clearTimeout, console });
    async function request(url, { mode = 'no-cors', destination = '' } = {}) {
        let responded;
        const event = {
            request: { url: new URL(url, SCOPE).href, method: 'GET', mode, destination },
            preloadResponse: Promise.resolve(undefined),
            respondWith: (p) => { responded = p; }
        };
        handlers.fetch(event);
        const res = await responded;
        return { status: res.status, body: await res.text() };
    }
    return { request, fetchCalls, store };
}

const ok = body => async () => {
    const r = new Response(body, { status: 200 });
    Object.defineProperty(r, 'type', { value: 'basic' });
    return r;
};
const offline = async () => { throw new TypeError('Failed to fetch'); };

describe('service worker fetch strategy', () => {
    test('engine scripts are network-first: a newer deploy wins over the cached copy', async () => {
        const sw = bootSW({ network: ok('NEW engine'), cached: { [SCOPE + 'shared/clinical-engine.js']: 'OLD engine' } });
        const res = await sw.request('shared/clinical-engine.js', { destination: 'script' });
        assert.equal(res.body, 'NEW engine');
        assert.equal(sw.fetchCalls[0].opts.cache, 'no-cache', 'code requests revalidate past the HTTP cache');
        assert.equal(sw.store.get(SCOPE + 'shared/clinical-engine.js'), 'NEW engine', 'cache refreshed');
    });

    test('stylesheets and page HTML are network-first too', async () => {
        const sw = bootSW({ network: ok('NEW'), cached: { [SCOPE + 'tools/screen/tool-screen.css']: 'OLD', [SCOPE + 'orders/nstemi-v2.html']: 'OLD' } });
        assert.equal((await sw.request('tools/screen/tool-screen.css', { destination: 'style' })).body, 'NEW');
        assert.equal((await sw.request('orders/nstemi-v2.html', { mode: 'navigate', destination: 'document' })).body, 'NEW');
    });

    test('offline: code falls back to the cache; navigations ignore ?draft= query strings', async () => {
        const sw = bootSW({ network: offline, cached: {
            [SCOPE + 'shared/clinical-engine.js']: 'CACHED engine',
            [SCOPE + 'tools/er-note/sepsis.html']: 'CACHED sepsis'
        } });
        assert.equal((await sw.request('shared/clinical-engine.js', { destination: 'script' })).body, 'CACHED engine');
        assert.equal((await sw.request('tools/er-note/sepsis.html?draft=d_abc', { mode: 'navigate' })).body, 'CACHED sepsis');
    });

    test('offline navigation to an uncached page falls back to the portal shell', async () => {
        const sw = bootSW({ network: offline, cached: { [SCOPE + 'index.html']: 'PORTAL' } });
        assert.equal((await sw.request('orders/unknown.html', { mode: 'navigate' })).body, 'PORTAL');
    });

    test('offline and uncached code returns 503, never undefined', async () => {
        const sw = bootSW({ network: offline });
        assert.equal((await sw.request('shared/missing.js', { destination: 'script' })).status, 503);
    });

    test('fonts, images and PDFs stay cache-first (no network hit when cached)', async () => {
        const sw = bootSW({ network: ok('NETWORK'), cached: { [SCOPE + 'shared/fonts/Sarabun-400-thai.woff2']: 'FONT' } });
        const res = await sw.request('shared/fonts/Sarabun-400-thai.woff2', { destination: 'font' });
        assert.equal(res.body, 'FONT');
        assert.equal(sw.fetchCalls.length, 0);
    });

    test('the static route no longer pins /shared/* to the cache', () => {
        assert.doesNotMatch(SW_SRC, /pathname: scopePath \+ 'shared\/\*'/);
        assert.match(SW_SRC, /pathname: scopePath \+ 'docs\/\*'/);
    });

    test('precache bypasses the HTTP cache', () => {
        assert.match(SW_SRC, /fetch\(url, \{ cache: 'reload' \}\)/);
    });
});
