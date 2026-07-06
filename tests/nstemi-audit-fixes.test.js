const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const NSTEMI_PATH = path.join(__dirname, '..', 'orders', 'nstemi.html');
const RT_PA_PATH  = path.join(__dirname, '..', 'orders', 'rtpa.html');
const INDEX_PATH = path.join(__dirname, '..', 'index.html');
const DRIP_PATH  = path.join(__dirname, '..', 'tools', 'drip-calculator.html');
const SW_PATH    = path.join(__dirname, '..', 'service-worker.js');
const MANIFEST   = path.join(__dirname, '..', 'manifest.json');
const DEAD_CSS   = path.join(__dirname, 'dead-css-guard.test.js');

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

describe('NSTEMI Audit Fixes — A1: print-blank-btn window.print()', () => {
    const html = read(NSTEMI_PATH);

    test('print-blank-btn handler calls window.print()', () => {
        // Find the print-blank-btn click handler and verify it calls window.print()
        const match = html.match(/print-blank-btn['"\]]\)\.addEventListener\('click'[^}]*\{[\s\S]*?\}\)/);
        assert.ok(match, 'print-blank-btn click handler not found');
        assert.match(match[0], /window\.print\(\)/, 'print-blank-btn handler must call window.print()');
    });

    test('rtpa.html print-blank-btn also calls window.print()', () => {
        const rtpa = read(RT_PA_PATH);
        const match = rtpa.match(/print-blank-btn['"\]]\)\.addEventListener\('click'[^}]*\{[\s\S]*?\}\)/);
        assert.ok(match, 'rtpa print-blank-btn click handler not found');
        assert.match(match[0], /window\.print\(\)/, 'rtpa print-blank-btn handler must call window.print()');
    });
});

describe('NSTEMI Audit Fixes — A2: clear-btn resets anticoag + DAPT', () => {
    const html = read(NSTEMI_PATH);

    // Extract the clear-btn handler block (greedy match to capture the full handler)
    const clearMatch = html.match(/clear-btn['"\]]\)\.addEventListener\('click'[\s\S]*?print-blank-btn['"\]]\)\.click\(\);[\s\S]*?\}\s*\)\s*;/);
    const handler = clearMatch ? clearMatch[0] : '';

    test('clear-btn handler resets anticoag panel state', () => {
        assert.ok(clearMatch, 'clear-btn handler not found');
        assert.match(handler, /ac-override-pending/, 'clear-btn must remove ac-override-pending class');
        assert.match(handler, /ac-disabled/, 'clear-btn must remove ac-disabled class');
        assert.match(handler, /updateAnticoagOutput/, 'clear-btn must call updateAnticoagOutput()');
        assert.match(handler, /updateAcHints/, 'clear-btn must call updateAcHints()');
    });

    test('clear-btn handler resets DAPT panel state', () => {
        assert.ok(clearMatch, 'clear-btn handler not found');
        assert.match(handler, /dapt-p2y12/, 'clear-btn must reset dapt-p2y12 radios');
        assert.match(handler, /dapt-asa/, 'clear-btn must reset dapt-asa checkbox');
        assert.match(handler, /dapt-hint-box/, 'clear-btn must hide dapt-hint-box');
    });
});

describe('NSTEMI Audit Fixes — A3: validation + dead code', () => {
    const html = read(NSTEMI_PATH);

    test('ED_VALIDATE.range() calls exist for weight, age, creatinine', () => {
        assert.match(html, /ED_VALIDATE\.range\(\s*['"]weight['"]/, 'weight validation missing');
        assert.match(html, /ED_VALIDATE\.range\(\s*['"]age['"]/, 'age validation missing');
        assert.match(html, /ED_VALIDATE\.range\(\s*['"]creatinine['"]/, 'creatinine validation missing');
    });

    test('dead form submit listener is removed', () => {
        // The old "addEventListener('submit'" listener should NOT exist
        // (only the create-order-btn listener remains)
        const submitListeners = html.match(/addEventListener\('submit'/g) || [];
        assert.equal(submitListeners.length, 0, 'form submit listener should be removed');
    });
});

describe('NSTEMI Audit Fixes — A4: eGFR rounding consistency', () => {
    const html = read(NSTEMI_PATH);

    test('egfrForCalc (Math.round) is not used for Enoxaparin frequency', () => {
        // The old pattern "egfrForCalc < FONDA_MIN_EGFR" should be gone
        assert.doesNotMatch(html, /egfrForCalc\s*<\s*FONDA_MIN_EGFR/,
            'egfrForCalc should not be used for Enoxaparin frequency decision');
    });

    test('unrounded egfr is used for Enox frequency auto-select', () => {
        assert.match(html, /egfr\s*<\s*FONDA_MIN_EGFR/,
            'unrounded egfr must be used for Enoxaparin frequency auto-select');
    });
});

describe('NSTEMI Audit Fixes — A5: updateLiveEGFR age guard', () => {
    const html = read(NSTEMI_PATH);

    test('updateLiveEGFR has age >= MIN_AGE guard', () => {
        // Extract updateLiveEGFR function
        const match = html.match(/function updateLiveEGFR\(\)\s*\{[\s\S]*?\}/);
        assert.ok(match, 'updateLiveEGFR function not found');
        assert.match(match[0], /age\s*>=\s*MIN_AGE/, 'updateLiveEGFR must have age >= MIN_AGE guard');
    });
});

describe('Drip Calculator — A6: soft-clamp write-back', () => {
    const html = read(DRIP_PATH);

    test('doseInput.value is written back after clamping', () => {
        const match = html.match(/doseInput\.addEventListener\('input'[\s\S]*?\}\)/);
        assert.ok(match, 'doseInput input handler not found');
        assert.match(match[0], /doseInput\.value\s*=\s*val/, 'clamped value must be written back to doseInput.value');
    });
});

describe('Dead Script Removal — A7 + A8', () => {
    test('index.html does not load shared/components.js', () => {
        const html = read(INDEX_PATH);
        assert.doesNotMatch(html, /<script src="shared\/components\.js"><\/script>/,
            'index.html should not load components.js (dead script)');
    });

    test('drip-calculator.html does not load shared/form-validate.js', () => {
        const html = read(DRIP_PATH);
        assert.doesNotMatch(html, /<script src="\.\.\/shared\/form-validate\.js"><\/script>/,
            'drip-calculator.html should not load form-validate.js (dead script)');
    });
});

describe('Dead CSS Guard — A10: index.html coverage', () => {
    const testCode = read(DEAD_CSS);

    test('dead-css-guard.test.js includes index.html', () => {
        assert.match(testCode, /index\.html/, 'dead-css-guard must check index.html');
    });
});

describe('Manifest Theme Colors — A12', () => {
    const manifest = JSON.parse(read(MANIFEST));

    test('theme_color matches Braun palette', () => {
        assert.equal(manifest.theme_color, '#f4f2ec');
    });

    test('background_color matches Braun paper', () => {
        assert.equal(manifest.background_color, '#ebe7df');
    });
});

describe('Index.html — A13: redirect allow-list', () => {
    const html = read(INDEX_PATH);

    test('redirect script has allow-list for order slugs', () => {
        assert.match(html, /ALLOWED_SLUGS/, 'index.html must have ALLOWED_SLUGS array');
        assert.match(html, /ALLOWED_SLUGS\.includes/, 'must validate slug against allow-list');
    });
});

describe('Index.html — A14: idempotent toast listener', () => {
    const html = read(INDEX_PATH);

    test('showUpdateToast guards against duplicate listeners', () => {
        const match = html.match(/function showUpdateToast[\s\S]*?\}/);
        assert.ok(match, 'showUpdateToast function not found');
        assert.match(match[0], /dataset\.wired/, 'showUpdateToast must guard with dataset.wired');
    });
});

describe('NSTEMI Layout — B2: dapt-anticoag-row grid', () => {
    const html = read(NSTEMI_PATH);

    test('dapt-anticoag-row CSS class exists', () => {
        assert.match(html, /\.dapt-anticoag-row\s*\{/, '.dapt-anticoag-row CSS rule missing');
    });

    test('dapt-anticoag-row uses grid with 2 columns', () => {
        const match = html.match(/\.dapt-anticoag-row\s*\{[^}]*\}/);
        assert.ok(match);
        assert.match(match[0], /display:\s*grid/, 'must be display: grid');
        assert.match(match[0], /grid-template-columns:\s*1fr\s+1fr/, 'must be 2 equal columns');
    });

    test('mobile breakpoint stacks dapt-anticoag-row to 1 column', () => {
        assert.match(html, /\.dapt-anticoag-row\s*\{\s*grid-template-columns:\s*1fr/,
            'mobile breakpoint must stack to 1fr');
    });

    test('dapt-anticoag-row is hidden in print', () => {
        assert.match(html, /\.dapt-anticoag-row\s*\{\s*display:\s*none\s*!important/,
            'dapt-anticoag-row must be hidden in @media print');
    });

    test('grace-summary closes before dapt-anticoag-row', () => {
        // Verify the reflow: grace-summary closes, then dapt-anticoag-row opens
        const match = html.match(/end \.grace-summary[\s\S]*?dapt-anticoag-row/);
        assert.ok(match, 'grace-summary must close before dapt-anticoag-row opens');
    });
});

describe('NSTEMI Print — B3: Prasugrel color, bullets, Ticagrelor continuation', () => {
    const html = read(NSTEMI_PATH);

    test('Prasugrel stat <li> has no inline red color style', () => {
        const match = html.match(/<li id="p-prasa-stat"[^>]*>/);
        assert.ok(match, 'p-prasa-stat <li> not found');
        assert.doesNotMatch(match[0], /color:\s*#c0392b/,
            'p-prasa-stat must not have red color style (normal text)');
    });

    test('Stat Medications uses order-list-plain class (no bullets)', () => {
        assert.match(html, /Stat Medications:[\s\S]*?order-list order-list-plain/,
            'Stat Medications must use order-list-plain');
    });

    test('order-list-plain CSS rule exists', () => {
        assert.match(html, /\.order-list-plain\s*\{[^}]*list-style:\s*none/,
            '.order-list-plain must have list-style: none');
        assert.match(html, /\.order-list-plain\s*\{[^}]*padding-left:\s*0/,
            '.order-list-plain must have padding-left: 0');
    });

    test('Ticagrelor continuation uses "1 x 2 pc" format', () => {
        assert.match(html, /Ticagrelor \(90\) 1 x 2 pc/,
            'Ticagrelor continuation must use "1 x 2 pc" format');
    });

    test('Ticagrelor continuation blank-print manifest also uses "1 x 2 pc"', () => {
        assert.match(html, /p-tiga-cont.*html.*Ticagrelor \(90\) 1 x 2 pc/,
            'blank-print manifest for p-tiga-cont must also use "1 x 2 pc"');
    });
});

describe('SW Version — A11: cache version bumped', () => {
    const sw = read(SW_PATH);
    const index = read(INDEX_PATH);

    test('CACHE_VERSION is v17', () => {
        assert.match(sw, /er-hub-v17/, 'CACHE_VERSION must be er-hub-v17');
    });

    test('index.html version string is v17', () => {
        assert.match(index, /v17/, 'index.html must display v17');
    });
});