const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SW_PATH = path.join(__dirname, '..', 'service-worker.js');
const ROOT_DIR = path.join(__dirname, '..');

describe('PWA Cache Assets Validation', () => {
    test('all local files in service-worker.js ASSETS array exist on disk', () => {
        const swContent = fs.readFileSync(SW_PATH, 'utf8');

        // Regex to extract the ASSETS array
        const match = swContent.match(/const\s+ASSETS\s*=\s*\[([\s\S]*?)\];/);
        assert.ok(match, 'ASSETS array not found in service-worker.js');

        // Split by comma and extract string paths
        const rawAssets = match[1]
            .split(',')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                const strMatch = line.match(/['"](.*?)['"]/);
                return strMatch ? strMatch[1] : null;
            })
            .filter(Boolean);

        assert.ok(rawAssets.length > 0, 'No assets extracted from service-worker.js');

        const missingFiles = [];

        rawAssets.forEach(asset => {
            // Ignore external URLs
            if (asset.startsWith('http://') || asset.startsWith('https://')) {
                return;
            }

            // Normalise paths (e.g. "./" or "./index.html" -> index.html)
            let relativePath = asset;
            if (relativePath.startsWith('./')) {
                relativePath = relativePath.slice(2);
            }
            if (relativePath === '') {
                relativePath = 'index.html'; // Root maps to index.html
            }

            // Decode URL-encoded characters in paths (e.g. %20 -> space)
            const decodedPath = decodeURIComponent(relativePath);
            const absolutePath = path.join(ROOT_DIR, decodedPath);

            if (!fs.existsSync(absolutePath)) {
                missingFiles.push({ asset, absolutePath });
            }
        });

        assert.equal(
            missingFiles.length,
            0,
            `Some files in the PWA cache manifest do not exist on disk:\n` +
            missingFiles.map(f => `- ${f.asset} (resolved to: ${f.absolutePath})`).join('\n')
        );
    });

    test('service-worker.js ASSETS array contains self-hosted font files', () => {
        const swContent = fs.readFileSync(SW_PATH, 'utf8');

        // Extract ASSETS array literal using VM
        const match = swContent.match(/const\s+ASSETS\s*=\s*(\[[\s\S]*?\]);/);
        assert.ok(match, 'ASSETS array declaration found in service-worker.js');

        const context = {};
        vm.createContext(context);
        const assets = vm.runInContext(match[1], context);

        assert.ok(Array.isArray(assets), 'ASSETS should evaluate to an array');

        // Must NOT contain any Google Fonts CDN references (self-hosted now)
        const gstaticUrls = assets.filter(url => typeof url === 'string' && url.startsWith('https://fonts.gstatic.com/'));
        assert.equal(gstaticUrls.length, 0, `Expected 0 Google Fonts CDN URLs in ASSETS (self-hosted), found ${gstaticUrls.length}`);

        // Verify self-hosted font files are present
        const localFonts = assets.filter(url => typeof url === 'string' && url.includes('./shared/fonts/'));
        assert.ok(localFonts.length >= 4, `Expected >= 4 self-hosted font files in ASSETS, found ${localFonts.length}`);

        // Verify that Inter Tight, Sarabun, and JetBrains Mono fonts are present
        const hasInterTight = localFonts.some(u => u.includes('InterTight'));
        const hasSarabun = localFonts.some(u => u.includes('Sarabun'));
        const hasJetBrains = localFonts.some(u => u.includes('JetBrainsMono'));

        assert.ok(hasInterTight, 'ASSETS manifest must contain self-hosted Inter Tight font files');
        assert.ok(hasSarabun, 'ASSETS manifest must contain self-hosted Sarabun font files');
        assert.ok(hasJetBrains, 'ASSETS manifest must contain self-hosted JetBrains Mono font files');
    });

    function loadServiceWorkerContext({ mockFetch, mockCaches }) {
        const listeners = {};
        const selfObj = {
            addEventListener: (event, handler) => {
                listeners[event] = handler;
            },
            location: { origin: 'http://localhost' },
            clients: { claim: () => Promise.resolve() },
            skipWaiting: () => {}
        };

        const context = {
            self: selfObj,
            fetch: mockFetch,
            caches: mockCaches,
            setTimeout: (fn) => setImmediate(fn),
            clearTimeout: (id) => clearImmediate(id),
            console: {
                log: () => {},
                info: () => {},
                warn: () => {},
                error: () => {}
            },
            Promise,
            Math,
            Error,
            Array,
            Object
        };

        selfObj.self = selfObj;
        vm.createContext(context);
        const swContent = fs.readFileSync(SW_PATH, 'utf8');
        vm.runInContext(swContent, context);

        const cacheVerMatch = swContent.match(/const\s+CACHE_VERSION\s*=\s*['"](.*?)['"]/);
        const cacheVersion = cacheVerMatch ? cacheVerMatch[1] : null;

        const assetsMatch = swContent.match(/const\s+ASSETS\s*=\s*(\[[\s\S]*?\]);/);
        const assets = assetsMatch ? vm.runInContext(assetsMatch[1], vm.createContext({})) : [];

        return { context, listeners, cacheVersion, assets };
    }

    test('service-worker.js install handler rejects waitUntil and deletes partial cache on precache failure', async () => {
        const deletedCaches = [];
        const putAssets = [];

        const mockCache = {
            put: async (url, response) => {
                putAssets.push(url);
            }
        };

        const mockCaches = {
            open: async (name) => mockCache,
            delete: async (name) => {
                deletedCaches.push(name);
                return true;
            }
        };

        // Make one specific asset exhaust retries
        const failingAsset = './orders/rtpa.html';
        const mockFetch = async (url) => {
            if (url === failingAsset) {
                throw new Error('Simulated network failure 503');
            }
            return { ok: true, status: 200, type: 'basic' };
        };

        const { listeners, cacheVersion } = loadServiceWorkerContext({ mockFetch, mockCaches });
        assert.ok(typeof listeners.install === 'function', 'install listener must be registered');

        let waitPromise = null;
        const mockEvent = {
            waitUntil: (p) => {
                waitPromise = p;
            }
        };

        listeners.install(mockEvent);
        assert.ok(waitPromise, 'install handler must call event.waitUntil()');

        await assert.rejects(
            waitPromise,
            (err) => {
                assert.match(err.message, /Precache failed for 1 asset\(s\)/);
                assert.match(err.message, /orders\/rtpa\.html/);
                return true;
            },
            'waitUntil promise must reject when asset precache fails'
        );

        assert.ok(
            deletedCaches.includes(cacheVersion),
            `caches.delete must be called with CACHE_VERSION (${cacheVersion}) to purge partial cache`
        );
    });

    test('service-worker.js install handler resolves waitUntil and caches all assets on success', async () => {
        const deletedCaches = [];
        const putAssets = [];

        const mockCache = {
            put: async (url, response) => {
                putAssets.push(url);
            }
        };

        const mockCaches = {
            open: async (name) => mockCache,
            delete: async (name) => {
                deletedCaches.push(name);
                return true;
            }
        };

        const mockFetch = async (url) => ({ ok: true, status: 200, type: 'basic' });

        const { listeners, assets } = loadServiceWorkerContext({ mockFetch, mockCaches });
        assert.ok(typeof listeners.install === 'function', 'install listener must be registered');

        let waitPromise = null;
        const mockEvent = {
            waitUntil: (p) => {
                waitPromise = p;
            }
        };

        listeners.install(mockEvent);
        assert.ok(waitPromise, 'install handler must call event.waitUntil()');

        await assert.doesNotReject(waitPromise, 'waitUntil promise must resolve when all assets succeed');

        assert.equal(
            deletedCaches.length,
            0,
            'caches.delete must not be called when installation succeeds'
        );
        assert.equal(
            putAssets.length,
            assets.length,
            'all assets from ASSETS array must be cached'
        );
        assert.deepEqual(
            [...putAssets].sort(),
            [...assets].sort(),
            'each asset from ASSETS must be cached exactly once'
        );
    });
});
