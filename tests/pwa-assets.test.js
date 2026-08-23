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

    test('service-worker.js ASSETS array contains resolved Google Fonts subresources', () => {
        const swContent = fs.readFileSync(SW_PATH, 'utf8');

        // Extract ASSETS array literal using VM
        const match = swContent.match(/const\s+ASSETS\s*=\s*(\[[\s\S]*?\]);/);
        assert.ok(match, 'ASSETS array declaration found in service-worker.js');

        const context = {};
        vm.createContext(context);
        const assets = vm.runInContext(match[1], context);

        assert.ok(Array.isArray(assets), 'ASSETS should evaluate to an array');

        const gstaticUrls = assets.filter(url => typeof url === 'string' && url.startsWith('https://fonts.gstatic.com/'));
        assert.ok(gstaticUrls.length >= 29, `Expected >= 29 font files in ASSETS, found ${gstaticUrls.length}`);

        // Verify that Inter Tight, Sarabun, and JetBrains Mono fonts are present in the manifest
        const hasInterTight = gstaticUrls.some(u => u.includes('/intertight/'));
        const hasSarabun = gstaticUrls.some(u => u.includes('/sarabun/'));
        const hasJetBrains = gstaticUrls.some(u => u.includes('/jetbrainsmono/'));

        assert.ok(hasInterTight, 'ASSETS manifest must contain Inter Tight font files');
        assert.ok(hasSarabun, 'ASSETS manifest must contain Sarabun font files');
        assert.ok(hasJetBrains, 'ASSETS manifest must contain JetBrains Mono font files');
    });
});
