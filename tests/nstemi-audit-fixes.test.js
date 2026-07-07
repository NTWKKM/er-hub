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
const STEMI_PATH = path.join(__dirname, '..', 'orders', 'stemi.html');

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
    const clearMatch = html.match(/clear-btn['"\]]\)\.addEventListener\('click'[\s\S]*?applyBlankTemplate\(\);[\s\S]*?\}\s*\)\s*;/);
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

describe('NSTEMI Audit Fixes — A5: updateLiveEGFR null-safe via calcEGFR()', () => {
    const html = read(NSTEMI_PATH);

    test('updateLiveEGFR delegates to calcEGFR() (single source of truth)', () => {
        // Extract updateLiveEGFR function
        const match = html.match(/function updateLiveEGFR\(\)\s*\{[\s\S]*?\}/);
        assert.ok(match, 'updateLiveEGFR function not found');
        assert.match(match[0], /calcEGFR\(\)/, 'updateLiveEGFR must delegate to calcEGFR() to avoid duplicate-impl drift');
    });

    test('updateLiveEGFR null-guards egfr before display', () => {
        const match = html.match(/function updateLiveEGFR\(\)\s*\{[\s\S]*?\}/);
        assert.ok(match, 'updateLiveEGFR function not found');
        assert.match(match[0], /egfr\s*!==\s*null/, 'updateLiveEGFR must null-guard egfr before .toFixed() (calcEGFR returns null for cr<=0)');
    });
});

describe('Drip Calculator — A6: clamp-on-blur (not on input)', () => {
    const html = read(DRIP_PATH);

    test('doseInput input handler does NOT write back clamped value', () => {
        const match = html.match(/doseInput\.addEventListener\('input'[\s\S]*?\}\)/);
        assert.ok(match, 'doseInput input handler not found');
        assert.doesNotMatch(match[0], /doseInput\.value\s*=\s*val/,
            'input handler must NOT write back clamped value (destroys manual number entry mid-typing)');
    });

    test('doseInput blur handler clamps and writes back', () => {
        const match = html.match(/doseInput\.addEventListener\('blur'[\s\S]*?\}\)/);
        assert.ok(match, 'doseInput blur handler not found');
        assert.match(match[0], /doseInput\.value\s*=\s*val/, 'blur handler must clamp and write back');
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

describe('SW Version — cache version bumped (v25 drip-calculator precache)', () => {
    const sw = read(SW_PATH);
    const index = read(INDEX_PATH);

    test('CACHE_VERSION is v25', () => {
        assert.match(sw, /er-hub-v25/, 'CACHE_VERSION must be er-hub-v25');
    });

    test('index.html version string is v25', () => {
        assert.match(index, /v25/, 'index.html must display v25');
    });
});

describe('STEMI Age-75 Boundary — ADR-49 #9: TNK vs Clopidogrel cutoffs', () => {
    // The user confirmed the boundary difference is intentional:
    //   - TNK halving:    age >= 75 (ASSENT-2 / ESC)
    //   - Clopidogrel load: age <= 75 → full 4 tabs, age > 75 → 1 tab (PLATO-derived)
    // At age 75: half TNK + full clopidogrel load.
    const html = read(STEMI_PATH);

    test('TNK halving uses age >= 75', () => {
        assert.match(html, /const elderly = age >= 75/,
            'TNK elderly flag must be age >= 75');
    });

    test('Clopidogrel loading uses age <= 75 for full dose', () => {
        assert.match(html, /const clopiTabs = age <= 75 \? 4 : 1/,
            'Clopidogrel loading must be age <= 75 → 4 tabs, >75 → 1 tab');
    });

    test('age 74 → full TNK + 300 mg clopidogrel load (4 tabs)', () => {
        // age 74: elderly=false (74 >= 75 is false), clopiTabs=4 (74 <= 75)
        const tnkElderly = (74 >= 75);
        const clopiTabs = 74 <= 75 ? 4 : 1;
        assert.equal(tnkElderly, false, 'age 74 must get full TNK dose');
        assert.equal(clopiTabs, 4, 'age 74 must get 4 clopidogrel tabs (300 mg load)');
    });

    test('age 75 → half TNK + 300 mg clopidogrel load (4 tabs)', () => {
        // age 75: elderly=true (75 >= 75), clopiTabs=4 (75 <= 75)
        const tnkElderly = (75 >= 75);
        const clopiTabs = 75 <= 75 ? 4 : 1;
        assert.equal(tnkElderly, true, 'age 75 must get halved TNK dose');
        assert.equal(clopiTabs, 4, 'age 75 must still get 4 clopidogrel tabs (full load)');
    });

    test('age 76 → half TNK + 75 mg clopidogrel (1 tab, no load)', () => {
        // age 76: elderly=true (76 >= 75), clopiTabs=1 (76 > 75)
        const tnkElderly = (76 >= 75);
        const clopiTabs = 76 <= 75 ? 4 : 1;
        assert.equal(tnkElderly, true, 'age 76 must get halved TNK dose');
        assert.equal(clopiTabs, 1, 'age 76 must get 1 clopidogrel tab (75 mg, no load)');
    });

    test('code comment documents the intentional boundary discrepancy', () => {
        assert.match(html, /TNK halving uses age >= 75.*clopidogrel loading omission.*age > 75/s,
            'STEMI must document why TNK and clopidogrel cutoffs differ at age 75');
    });
});