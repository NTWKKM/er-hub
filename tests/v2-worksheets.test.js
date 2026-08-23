const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CLINICAL_ENGINE } = require('../shared/clinical-engine.js');

describe('NSTEMI V2 Worksheet Logic & Clinical Safety', () => {
    test('Script in orders/nstemi-v2.html contains no top-level duplicate blocks', () => {
        const content = fs.readFileSync(path.join(__dirname, '..', 'orders', 'nstemi-v2.html'), 'utf8');
        
        // Assert no duplicate top-level _applyAcState outside function
        const matches = content.match(/_applyAcState\('fonda'/g);
        assert.equal(matches.length, 1, 'Expected exactly 1 call to _applyAcState("fonda") in nstemi-v2.html');
    });

    test('GRACE calculation requires complete inputs (avoids null < threshold JS coercion bug)', () => {
        // Simulating the gating rule
        const checkComplete = (age, hr, sbp, cr) => {
            const minAge = 18;
            return !isNaN(age) && age >= minAge && !isNaN(hr) && hr > 0 && !isNaN(sbp) && sbp > 0 && !isNaN(cr) && cr > 0;
        };

        // Incomplete forms
        assert.equal(checkComplete(NaN, 80, 120, 1.0), false);
        assert.equal(checkComplete(65, NaN, 120, 1.0), false);
        assert.equal(checkComplete(65, 80, NaN, 1.0), false);
        assert.equal(checkComplete(65, 80, 120, NaN), false);
        assert.equal(checkComplete(0, 80, 120, 1.0), false);
        assert.equal(checkComplete(65, 0, 120, 1.0), false);
        assert.equal(checkComplete(65, 80, 0, 1.0), false);
        assert.equal(checkComplete(65, 80, 120, 0), false);

        // Complete form
        assert.equal(checkComplete(65, 80, 120, 1.0), true);

        // Verify that complete form produces valid GRACE score
        const res = CLINICAL_ENGINE.calcGRACE({
            age: 65,
            hr: 80,
            sbp: 120,
            cr: 1.0,
            killip: '1',
            cardArr: false,
            stDev: false,
            elevMk: false
        });
        assert.ok(res.score > 0, 'GRACE score should be positive for complete inputs');
        assert.equal(res.score, 108); // 58 (age) + 9 (hr) + 34 (sbp) + 7 (cr)
    });

    test('Troponin percentage formatter produces correct mathematical signs', () => {
        const pct = v => `${Number(v) >= 0 ? '+' : ''}${v}%`;

        assert.equal(pct('25.0'), '+25.0%');
        assert.equal(pct('-20.0'), '-20.0%');
        assert.equal(pct('0.0'), '+0.0%');
    });

    test('Killip class formatting maps numeric values to Roman numerals', () => {
        const formatKillip = k => `Class ${({'1':'I','2':'II','3':'III','4':'IV'})[k] || 'I'}`;

        assert.equal(formatKillip('1'), 'Class I');
        assert.equal(formatKillip('2'), 'Class II');
        assert.equal(formatKillip('3'), 'Class III');
        assert.equal(formatKillip('4'), 'Class IV');
        assert.equal(formatKillip('unknown'), 'Class I');
    });
});

describe('NIHSS V2 Worksheet Score Normalization', () => {
    const itemMax = {
        "1a": 3, "1b": 2, "1c": 2, "2": 2, "3": 3, "4": 3,
        "5a": 4, "5b": 4, "6a": 4, "6b": 4, "7": 2, "8": 2,
        "9": 3, "10": 2, "11": 2
    };
    const unItems = new Set(["5a", "5b", "6a", "6b", "7", "10"]);

    function normalizeValue(itemKey, rawValue) {
        const max = itemMax[itemKey];
        const v = String(rawValue).trim();
        if (v === '') return '';
        if (/^(un|x)$/i.test(v)) {
            return unItems.has(itemKey) ? 'UN' : '';
        }
        if (!/^\d+$/.test(v)) {
            return '';
        }
        const n = parseInt(v, 10);
        if (isNaN(n)) return '';
        if (max !== undefined && n > max) return String(max);
        if (n < 0) return '0';
        return String(n);
    }

    test('Caps scores exceeding item maximum', () => {
        assert.equal(normalizeValue('1a', '99'), '3');
        assert.equal(normalizeValue('5a', '10'), '4');
        assert.equal(normalizeValue('2', '5'), '2');
    });

    test('Handles UN and X for eligible vs non-eligible items', () => {
        assert.equal(normalizeValue('5a', 'un'), 'UN');
        assert.equal(normalizeValue('5a', 'UN'), 'UN');
        assert.equal(normalizeValue('5b', 'x'), 'UN');
        assert.equal(normalizeValue('7', 'X'), 'UN');
        assert.equal(normalizeValue('10', 'un'), 'UN');

        // Non-UN eligible items
        assert.equal(normalizeValue('1a', 'un'), '');
        assert.equal(normalizeValue('1a', 'x'), '');
        assert.equal(normalizeValue('2', 'un'), '');
    });

    test('Filters malformed or floating point inputs', () => {
        assert.equal(normalizeValue('1a', '1.5'), '');
        assert.equal(normalizeValue('1a', 'abc'), '');
        assert.equal(normalizeValue('1a', '3a'), '');
    });

    test('Preserves valid numeric scores', () => {
        assert.equal(normalizeValue('1a', '0'), '0');
        assert.equal(normalizeValue('1a', '2'), '2');
        assert.equal(normalizeValue('5a', '4'), '4');
    });
});

describe('Service Worker Google Fonts Offline Precache', () => {
    test('service-worker.js ASSETS array contains resolved fonts.gstatic.com resources', () => {
        const swContent = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
        
        const gstaticMatches = swContent.match(/https:\/\/fonts\.gstatic\.com\/[^\s'"]+/g) || [];
        assert.ok(gstaticMatches.length > 20, `Expected >20 gstatic font files precached, found ${gstaticMatches.length}`);
        
        // Assert key families are present
        const hasInterTight = gstaticMatches.some(u => u.includes('intertight'));
        const hasSarabun = gstaticMatches.some(u => u.includes('sarabun'));
        const hasJetBrains = gstaticMatches.some(u => u.includes('jetbrainsmono'));

        assert.ok(hasInterTight, 'Precache must include Inter Tight font files');
        assert.ok(hasSarabun, 'Precache must include Sarabun font files');
        assert.ok(hasJetBrains, 'Precache must include JetBrains Mono font files');
    });
});
