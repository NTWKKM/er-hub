const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
});
