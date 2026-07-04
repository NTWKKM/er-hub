const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const NSTEMI_PATH = path.join(__dirname, '..', 'orders', 'nstemi.html');

describe('NSTEMI Anticoagulant Thresholds and Constants', () => {
    test('nstemi.html should define and use FONDA_MIN_EGFR and ENOX_MIN_EGFR constants', () => {
        const content = fs.readFileSync(NSTEMI_PATH, 'utf8');

        // Extract constants
        const fondaConstMatch = content.match(/const\s+FONDA_MIN_EGFR\s*=\s*(\d+)/);
        const enoxConstMatch = content.match(/const\s+ENOX_MIN_EGFR\s*=\s*(\d+)/);

        assert.ok(fondaConstMatch, 'FONDA_MIN_EGFR constant should be defined');
        assert.ok(enoxConstMatch, 'ENOX_MIN_EGFR constant should be defined');

        const fondaLimit = parseInt(fondaConstMatch[1], 10);
        const enoxLimit = parseInt(enoxConstMatch[1], 10);

        assert.equal(fondaLimit, 30, 'FONDA_MIN_EGFR should be 30');
        assert.equal(enoxLimit, 15, 'ENOX_MIN_EGFR should be 15');

        // Verify no stray hardcoded cutoffs in the script block
        const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
        assert.ok(scriptMatch, 'Should find script block in nstemi.html');
        const scriptContent = scriptMatch[1];

        // Ensure no literal "egfrLive < 20" or "egfrLive < 30" or similar comparison patterns
        const invalidPatterns = [
            /egfrLive\s*<\s*20\b/,
            /egfrLive\s*<\s*30\b/,
            /egfrLive\s*<\s*15\b/,
            /egfrLive\s*>=\s*30\b/,
            /egfrLive\s*>=\s*15\b/,
            /egfrLive\s*===\s*30\b/,
            /egfrForCalc\s*<\s*30\b/
        ];

        invalidPatterns.forEach(pattern => {
            assert.ok(!pattern.test(scriptContent), `Stray hardcoded threshold check found in JS: ${pattern.toString()}`);
        });
    });
});
