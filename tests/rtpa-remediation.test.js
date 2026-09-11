const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { ED_PRINT_BOOTSTRAP } = require('../shared/print-bootstrap.js');

const RTPA_V1_PATH = path.join(__dirname, '..', 'orders', 'rtpa.html');
const RTPA_V2_PATH = path.join(__dirname, '..', 'orders', 'rtpa-v2.html');
const PRINT_CSS_PATH = path.join(__dirname, '..', 'shared', 'print.css');

const rtpaV1Html = fs.readFileSync(RTPA_V1_PATH, 'utf8');
const rtpaV2Html = fs.readFileSync(RTPA_V2_PATH, 'utf8');
const printCss = fs.readFileSync(PRINT_CSS_PATH, 'utf8');

function loadHtmlDom(relPath) {
    const filePath = path.join(__dirname, '..', relPath);
    let html = fs.readFileSync(filePath, 'utf8');
    const dir = path.dirname(filePath);

    // Inline local scripts for deterministic node:test execution
    html = html.replace(/<script src="([^"]+)"><\/script>/g, (match, src) => {
        if (src.startsWith('http')) return match;
        const scriptPath = path.resolve(dir, src);
        if (fs.existsSync(scriptPath)) {
            return '<script>' + fs.readFileSync(scriptPath, 'utf8') + '</script>';
        }
        return match;
    });

    const dom = new JSDOM(html, {
        url: 'file://' + filePath,
        runScripts: 'dangerously'
    });

    dom.window.scrollTo = () => {};
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return dom.window;
}

describe('rt-PA v1 & v2 Remediation Verification', () => {
    test('Print Privacy: print.css must not force display: block on hidden results-container', () => {
        assert.ok(!printCss.includes('.results-container.hidden'), 'Must not contain .results-container.hidden in print.css');
    });

    test('Print Bootstrap: manual pen entry fallback provides clean underline slots', () => {
        const manualDt = ED_PRINT_BOOTSTRAP.getDateTimeHTML(false);
        assert.ok(manualDt.includes('_____/_____/_________'), 'Date slot must be underscores');
        assert.ok(manualDt.includes('____:____ น.'), 'Time slot must be underscore clock format');
        assert.ok(!manualDt.includes('....................'), 'Must not use dotted line placeholder');
    });

    test('Clinical Typos: rtpa.html (v1) and rtpa-v2.html must have 0 medical typos', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            assert.ok(!content.includes('110mmg'), `${name} must not contain 110mmg`);
            assert.ok(!content.includes('bacteria endocarditis'), `${name} must not contain bacteria endocarditis`);
            assert.ok(!content.includes('intracranial of intraspinal surgery'), `${name} must not contain intracranial of intraspinal`);
            assert.ok(!content.includes('direct factor a inhibitor'), `${name} must not contain direct factor a inhibitor`);
            assert.ok(!content.includes('Lumber puncture'), `${name} must not contain Lumber puncture`);
            assert.ok(!content.includes('Maharat NakhonRatchasima Hospital'), `${name} must not have unspaced NakhonRatchasima`);
            assert.ok(!content.includes('Maharat Nakhonratchasima Hospital'), `${name} must not have lowercase Nakhonratchasima`);

            // Check correct replacements
            assert.ok(content.includes('110 mmHg'), `${name} must contain 110 mmHg`);
            assert.ok(content.includes('bacterial endocarditis'), `${name} must contain bacterial endocarditis`);
            assert.ok(content.includes('intracranial or intraspinal surgery'), `${name} must contain intracranial or intraspinal surgery`);
            assert.ok(content.includes('direct factor Xa inhibitor'), `${name} must contain direct factor Xa inhibitor`);
            assert.ok(content.includes('Lumbar puncture or arterial puncture'), `${name} must contain Lumbar puncture or arterial puncture`);
            assert.ok(content.includes('Maharat Nakhon Ratchasima Hospital'), `${name} must have standardized hospital name`);
        }
    });

    test('Offline-First Logo Resilience: rtpa.html (v1) and rtpa-v2.html embed authentic Base64 logo', () => {
        const { ED_COMPONENTS } = require('../shared/components.js');
        const fallbackPath = '../docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png';

        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            const dom = new JSDOM(content);
            const img = dom.window.document.querySelector('img.stroke-print-logo');
            assert.ok(img, `${name} must contain img.stroke-print-logo element`);
            assert.equal(img.getAttribute('src'), ED_COMPONENTS.MNRH_LOGO_BASE64, `${name} logo src must match ED_COMPONENTS.MNRH_LOGO_BASE64`);
            assert.equal(img.getAttribute('decoding'), 'sync', `${name} logo must specify decoding="sync"`);
            assert.equal(img.getAttribute('loading'), 'eager', `${name} logo must specify loading="eager"`);
            assert.ok(img.getAttribute('onerror')?.includes(fallbackPath), `${name} logo must specify fallback onerror`);
            assert.equal(img.getAttribute('data-fallback'), fallbackPath, `${name} logo must specify data-fallback`);
        }
    });

    test('Offline-First Logo Resilience: ED_COMPONENTS.injectStrokeHeader injects Base64 logo with sync decoding', () => {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-header"></div></body></html>');
        global.document = dom.window.document;
        global.window = dom.window;
        const { ED_COMPONENTS } = require('../shared/components.js');

        ED_COMPONENTS.injectStrokeHeader('test-header', 'Alteplase');
        const headerEl = dom.window.document.getElementById('test-header');
        assert.ok(headerEl.innerHTML.includes('data:image/png;base64,'), 'injectStrokeHeader must use Base64 data URI by default');
        assert.ok(headerEl.innerHTML.includes('decoding="sync"'), 'injectStrokeHeader must specify decoding="sync"');
        assert.ok(headerEl.innerHTML.includes('loading="eager"'), 'injectStrokeHeader must specify loading="eager"');
        assert.ok(headerEl.innerHTML.includes('Standing order for Alteplase Stroke fast track'), 'injectStrokeHeader must render correct title');

        ED_COMPONENTS.injectStrokeHeader('test-header', 'Tenecteplase');
        assert.ok(headerEl.innerHTML.includes('data:image/png;base64,'), 'Tenecteplase header must also contain Base64 logo');
        assert.ok(headerEl.innerHTML.includes('Standing order for Tenecteplase Stroke fast track'), 'Tenecteplase title must be rendered');
    });

    test('Accessibility: rtpa.html (v1) must have role="radiogroup" and role="radio" with aria-checked', () => {
        assert.ok(rtpaV1Html.includes('role="radiogroup"'), 'Must have role=radiogroup on button-dose-group');
        assert.ok(rtpaV1Html.includes('role="radio"'), 'Must have role=radio on dose-button');
        assert.ok(rtpaV1Html.includes('aria-checked="true"'), 'Must have default aria-checked=true');
        assert.ok(rtpaV1Html.includes('aria-checked="false"'), 'Must have default aria-checked=false');
    });

    test('Stale PHI Reset: DOM purge on clear-btn in rtpa.html (v1)', () => {
        const win = loadHtmlDom('orders/rtpa.html');
        const doc = win.document;

        // Simulate order calculation
        doc.getElementById('hn').value = '1234567';
        doc.getElementById('weight').value = '55';
        doc.getElementById('rtpa-form').dispatchEvent(new win.Event('submit', { cancelable: true }));

        // Check values set
        assert.equal(doc.getElementById('result-hn').textContent, '1234567');
        assert.equal(doc.getElementById('result-weight').textContent, '55.00');
        assert.equal(doc.getElementById('total-dose').textContent, '49.50');

        // Click Clear button
        doc.getElementById('clear-btn').click();

        // Check PHI is purged from print-area DOM
        assert.equal(doc.getElementById('result-hn').textContent, '...');
        assert.equal(doc.getElementById('result-weight').textContent, '...');
        assert.equal(doc.getElementById('total-dose').textContent, '...');
        assert.equal(doc.getElementById('push-dose').textContent, '...');
        assert.equal(doc.getElementById('drip-dose').textContent, '...');
        assert.ok(doc.getElementById('results-container').classList.contains('hidden'));
    });

    test('Stale PHI Reset: DOM purge on clear-btn in rtpa-v2.html (v2)', () => {
        const win = loadHtmlDom('orders/rtpa-v2.html');
        const doc = win.document;

        // Simulate order calculation
        doc.getElementById('hn').value = '9876543';
        doc.getElementById('weight').value = '60';
        doc.getElementById('rtpa-form').dispatchEvent(new win.Event('submit', { cancelable: true }));

        assert.equal(doc.getElementById('result-hn').textContent, '9876543');
        assert.equal(doc.getElementById('result-weight').textContent, '60.00');

        // Click Clear button
        doc.getElementById('clear-btn').click();

        assert.equal(doc.getElementById('result-hn').textContent, '...');
        assert.equal(doc.getElementById('result-weight').textContent, '...');
        assert.ok(doc.getElementById('results-container').classList.contains('hidden'));
    });

    test('Clinical Guidelines: Nicardipine continuation order specifies max 75 ml/hr (15 mg/hr)', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            assert.ok(content.includes('Nicardipine 20 mg + 5DW'), `${name} must contain Nicardipine order`);
            assert.ok(content.includes('titrate ทีละ 10 ml/hr ทุก 5-15 min (max 75 ml/hr หรือ 15 mg/hr)'),
                `${name} must specify titration rate and max 75 ml/hr (15 mg/hr)`);
        }
    });

    test('Clinical Guidelines: DTX target specifies 140–180 mg/dL and treats hypoglycemia < 60 mg/dL', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            assert.ok(!content.includes('keep 80 – 180 mg%'), `${name} must not contain forbidden intensive target 80-180 mg%`);
            assert.ok(content.includes('Serial DTX q 6 hr keep 140 – 180 mg/dL (treat hypoglycemia &lt; 60 mg/dL promptly)'),
                `${name} must specify recommended 140-180 mg/dL target with &lt; encoded`);
        }
    });

    test('Document Structure: Page 3 header specifies Timeline and Pre-evaluation Protocol', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            assert.ok(content.includes('Timeline and Pre-evaluation Protocol for IV rt-PA'),
                `${name} page 3 must have correct timeline title`);
            assert.ok(!content.includes('<div class="stroke-page" id="stroke-page-3">\n            <div class="stroke-page-header">\n                <h4>Maharat Nakhon Ratchasima Hospital</h4>\n                <p><strong>Inclusion and Exclusion Criteria for IV rt-PA</strong></p>'),
                `${name} page 3 header must not duplicate Inclusion and Exclusion Criteria`);
        }
    });

    test('HTML Spec: Record BP list must have valid <ul> nesting inside <li>', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            assert.ok(!content.includes('<li>Record BP ระหว่างให้ rt-PA</li>\n                            <ul style="list-style-type: none;'),
                `${name} must not have ul directly following closed li`);
            assert.ok(content.includes('<li>Record BP ระหว่างให้ rt-PA\n                                <ul style="list-style-type: none;'),
                `${name} must wrap the child ul inside li`);
        }
    });

    test('Print Layout: Doctor order cells use order-cell-flex and calibrated .order-row-spacer', () => {
        assert.ok(printCss.includes('.order-cell-flex'), 'print.css must define .order-cell-flex');
        assert.ok(printCss.includes('.order-row-spacer'), 'print.css must define .order-row-spacer');
        const printStart = printCss.indexOf('@media print');
        assert.ok(printStart > 0, 'print.css must define @media print');
        assert.match(printCss.slice(0, printStart),
            /\.order-row-spacer\s*\{\s*height:\s*16\.5em;?\s*\}/,
            'print.css must retain 16.5em for on-screen preview');
        assert.match(printCss.slice(printStart),
            /\.order-row-spacer\s*\{\s*height:\s*11\.5em\s*!important;?\s*\}/,
            'print.css must enforce 11.5em in @media print');
        for (const pagePath of ['orders/rtpa.html', 'orders/rtpa-v2.html']) {
            const win = loadHtmlDom(pagePath);
            const doc = win.document;

            // Structurally inspect doctor order cells containing doctor signature lines
            const allCells = Array.from(doc.querySelectorAll('.grid-cell'));
            const doctorOrderCells = allCells.filter(cell => cell.textContent.includes('ลงชื่อแพทย์'));
            assert.ok(doctorOrderCells.length >= 2, `${pagePath} must have at least 2 doctor order cells`);
            for (const cell of doctorOrderCells) {
                assert.ok(cell.classList.contains('order-cell-flex'),
                    `${pagePath}: doctor order cell must have order-cell-flex class`);
                assert.ok(cell.querySelector('.order-row-spacer'),
                    `${pagePath}: doctor order cell must contain .order-row-spacer for handwritten order area`);
            }

            // Assert that no brittle inline style="height:11.5em" spacer div nodes remain in the DOM
            const inlineSpacers = doc.querySelectorAll('div[style*="11.5em"]');
            assert.equal(inlineSpacers.length, 0,
                `${pagePath} must use clean .order-row-spacer class instead of brittle inline style="height:11.5em"`);

            const htmlContent = fs.readFileSync(path.resolve(__dirname, '..', pagePath), 'utf-8');
            assert.match(htmlContent, /\.order-row-spacer\s*\{\s*height:\s*11\.5em\s*!important;?\s*\}/,
                `${pagePath} must enforce 11.5em in its @media print stylesheet`);
        }
    });

    test('Safety: Stale calculation invalidation on input modification in v1 and v2', () => {
        for (const pagePath of ['orders/rtpa.html', 'orders/rtpa-v2.html']) {
            const win = loadHtmlDom(pagePath);
            const doc = win.document;
            const form = doc.getElementById('rtpa-form');
            const rc = doc.getElementById('results-container');

            // 1. Initial Submit order
            doc.getElementById('hn').value = '1122334';
            doc.getElementById('weight').value = '65';
            form.dispatchEvent(new win.Event('submit', { cancelable: true }));
            assert.ok(!rc.classList.contains('hidden'), `${pagePath}: results-container must be visible after submit`);

            // 2. Modify weight input -> must immediately invalidate and hide results-container
            doc.getElementById('weight').value = '70';
            doc.getElementById('weight').dispatchEvent(new win.Event('input'));
            assert.ok(rc.classList.contains('hidden'), `${pagePath}: results-container must be hidden when weight changes`);

            // Resubmit
            form.dispatchEvent(new win.Event('submit', { cancelable: true }));
            assert.ok(!rc.classList.contains('hidden'), `${pagePath}: results-container must be visible again`);

            // 3. Modify HN input -> must immediately invalidate and hide results-container
            doc.getElementById('hn').value = '9999999';
            doc.getElementById('hn').dispatchEvent(new win.Event('input'));
            assert.ok(rc.classList.contains('hidden'), `${pagePath}: results-container must be hidden when HN changes`);

            // Resubmit
            form.dispatchEvent(new win.Event('submit', { cancelable: true }));
            assert.ok(!rc.classList.contains('hidden'), `${pagePath}: results-container must be visible again`);

            // 4. Modify #use-current-time checkbox -> must immediately invalidate and hide results-container
            const useTimeCheckbox = doc.getElementById('use-current-time');
            assert.ok(useTimeCheckbox, `${pagePath} must have #use-current-time checkbox`);
            useTimeCheckbox.checked = !useTimeCheckbox.checked;
            useTimeCheckbox.dispatchEvent(new win.Event('change'));
            assert.ok(rc.classList.contains('hidden'), `${pagePath}: results-container must be hidden when #use-current-time changes`);

            // Resubmit
            form.dispatchEvent(new win.Event('submit', { cancelable: true }));
            assert.ok(!rc.classList.contains('hidden'), `${pagePath}: results-container must be visible again`);

            // 5. Modify dosing regimen -> must immediately invalidate and hide results-container
            const doseBtn06 = doc.querySelector('.dose-button[data-dose="0.6"]');
            const doseRadio06 = doc.querySelector('input[name="dose-radio"][value="0.6"]');
            if (doseBtn06) {
                doseBtn06.dispatchEvent(new win.Event('click'));
            } else if (doseRadio06) {
                doseRadio06.checked = true;
                doseRadio06.dispatchEvent(new win.Event('change'));
            } else {
                assert.fail(`${pagePath} must have a dosing regimen selector for 0.6`);
            }
            assert.ok(rc.classList.contains('hidden'), `${pagePath}: results-container must be hidden when dosing regimen changes`);

            // Resubmit
            form.dispatchEvent(new win.Event('submit', { cancelable: true }));
            assert.ok(!rc.classList.contains('hidden'), `${pagePath}: results-container must be visible again after regimen resubmit`);
        }
    });

    test('Clinical Precision: Weight pre-rounded to 2 decimal places in v1 and v2', () => {
        for (const pagePath of ['orders/rtpa.html', 'orders/rtpa-v2.html']) {
            const win = loadHtmlDom(pagePath);
            const doc = win.document;

            doc.getElementById('hn').value = '1122334';
            doc.getElementById('weight').value = '55.548';
            doc.getElementById('rtpa-form').dispatchEvent(new win.Event('submit', { cancelable: true }));

            const rc = doc.getElementById('results-container');
            assert.ok(!rc.classList.contains('hidden'), `${pagePath}: results-container must be visible after submit`);

            // Discriminating test case:
            // 55.548 rounded to 2 decimal places is 55.55 kg.
            // 55.55 kg * 0.9 mg/kg = 49.995 mg -> totalDose rounds to 50.00 mg.
            // idealPush = 50.00 * 0.10 = 5.0 mg -> pushDose = 5.0 mg, dripDose = 45.00 mg.
            // (If unrounded 55.548 kg were used: 55.548 * 0.9 = 49.9932 mg -> totalDose = 49.99 mg, pushDose = 4.9 mg).
            assert.equal(doc.getElementById('result-weight').textContent, '55.55',
                `${pagePath}: rendered weight must be pre-rounded to 55.55`);
            assert.equal(doc.getElementById('total-dose').textContent, '50.00',
                `${pagePath}: total dose must be calculated from rounded 55.55 kg as 50.00 mg`);
            assert.equal(doc.getElementById('push-dose').textContent, '5.0',
                `${pagePath}: push dose must be 5.0 mg`);
            assert.equal(doc.getElementById('drip-dose').textContent, '45.00',
                `${pagePath}: drip dose must be 45.00 mg`);
        }
    });

    test('Design Theme: Modern Apple / iPadOS Slate Canvas (#ECECEE) and Elevated White card container (#FFFFFF)', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            assert.ok(/body\s*\{[^}]*background-color:\s*#ececee/i.test(content), `${name} body must have #ECECEE background`);
            assert.ok(/\.container\s*\{[^}]*background-color:\s*#ffffff/i.test(content), `${name} .container must have #FFFFFF background`);
            assert.ok(/\.container\s*\{[^}]*border-radius:\s*12px/i.test(content), `${name} .container must have 12px squircle radius`);
            assert.ok(/\.container\s*\{[^}]*border:\s*1px solid #d8d8dc/i.test(content), `${name} .container must have #D8D8DC subtle border`);
        }
    });

    test('Realistic Order Sheet: elevated white paper styling on screen', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            assert.ok(/#print-area\s*\{[^}]*background:\s*#ffffff/i.test(content), `${name} #print-area must be white (#ffffff) on screen`);
            assert.ok(/#print-area\s*\{[^}]*border:\s*1px solid #d8d8dc/i.test(content), `${name} #print-area must have #D8D8DC border on screen`);
            assert.ok(/#print-area\s*\{[^}]*box-shadow:/i.test(content), `${name} #print-area must have elevated shadow on screen`);
        }
    });

    test('Table Grid Borders: arithmetic eliminates 2px border duplication', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            assert.ok(/\.grid-header:nth-child\(5n\)\s*\{[^}]*border-right:\s*none/i.test(content), `${name} must remove border-right on 5n header`);
            assert.ok(/\.grid-cell:nth-child\(5n\)\s*\{[^}]*border-right:\s*none/i.test(content), `${name} must remove border-right on 5n cell`);
            assert.ok(/\.order-grid-5col\s*>\s*\.grid-cell:nth-child\(n\+11\)\s*\{[^}]*border-bottom:\s*none/i.test(content),
                `${name} must remove border-bottom on bottom row cells (n+11)`);
        }
    });

    test('Dose & Action Button Ergonomics: Neutral warm gray, vibrant blue #007BFF, medical green #24963e', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            // Unselected dose controls
            assert.ok(/#c9c6b8/i.test(content), `${name} must style unselected dose controls with #C9C6B8`);
            assert.ok(/#55524b/i.test(content), `${name} must style unselected dose text with #55524B (7.79:1 AAA contrast)`);

            // Calculate & active dose controls
            assert.ok(/\.btn-calculate\s*\{[^}]*background-color:\s*#007bff/i.test(content), `${name} .btn-calculate must be #007BFF`);
            assert.ok(/(?:\.dose-button\.active|\.regimen-card\.active)\s*\{[^}]*background(?:-color)?:\s*#007bff/i.test(content),
                `${name} active dose control must be #007BFF`);

            // Print button controls
            assert.ok(/(?:\.btn-blank-order|#print-blank-btn)\s*\{[^}]*background-color:\s*#24963e/i.test(content),
                `${name} print button must be medical green #24963e`);
            assert.ok(/(?:\.btn-blank-order:hover|#print-blank-btn:hover)\s*\{[^}]*background-color:\s*#1e7e34/i.test(content),
                `${name} print button hover must be #1e7e34`);

            // Keyboard navigation
            assert.ok(/:focus-visible/i.test(content), `${name} must provide :focus-visible styling`);
        }
    });

    test('Ink-Saver Print Styles: @media print enforces transparent backgrounds, border none, box-shadow none', () => {
        for (const [name, content] of [['v1', rtpaV1Html], ['v2', rtpaV2Html]]) {
            const match = content.match(/@media print\s*\{([\s\S]*?)\}\s*<\/style>/i);
            assert.ok(match, `${name} must have @media print in style block`);
            const printRules = match[1];
            assert.ok(/background:\s*transparent\s*!important/i.test(printRules), `${name} @media print must enforce background: transparent`);
            assert.ok(/border:\s*none\s*!important/i.test(printRules), `${name} @media print must enforce border: none`);
            assert.ok(/box-shadow:\s*none\s*!important/i.test(printRules), `${name} @media print must enforce box-shadow: none`);
        }
    });

    test('Ink-Saver Print Styles: .grid-header in rtpa v1 & v2 has transparent background on print (no shading fill)', () => {
        const currentV1Html = fs.readFileSync(RTPA_V1_PATH, 'utf8');
        const currentV2Html = fs.readFileSync(RTPA_V2_PATH, 'utf8');
        const currentPrintCss = fs.readFileSync(PRINT_CSS_PATH, 'utf8');

        for (const [name, content] of [['v1', currentV1Html], ['v2', currentV2Html]]) {
            const match = content.match(/@media print\s*\{([\s\S]*?)\}\s*<\/style>/i);
            assert.ok(match, `${name} must have @media print in style block`);
            const printRules = match[1];
            assert.ok(/\.grid-header\s*\{[^}]*background(?:-color)?:\s*transparent\s*!important/i.test(printRules),
                `${name} @media print must enforce .grid-header transparent background`);
        }

        assert.ok(/\.theme-stroke\s+\.grid-header\s*\{[^}]*background(?:-color)?:\s*transparent\s*!important/i.test(currentPrintCss),
            'print.css must enforce transparent background for .theme-stroke .grid-header');

        const printMediaMatch = currentPrintCss.match(/@media print\s*\{([\s\S]*)\}/i);
        assert.ok(printMediaMatch, 'print.css must have @media print block');
        assert.ok(!/\.grid-header\s*\{[^}]*background-color:\s*#e9ecef/i.test(printMediaMatch[1]),
            'print.css must not apply #e9ecef background to .grid-header in @media print');
        assert.ok(/\.grid-header\s*\{[^}]*background(?:-color)?:\s*transparent\s*!important/i.test(printMediaMatch[1]),
            'print.css must enforce transparent background for all .grid-header on print');
    });

    test('Print Margin Harmony: #print-area matches .stroke-page 195mm width and 3mm padding in v1, v2, and print.css', () => {
        const v1Html = fs.readFileSync(RTPA_V1_PATH, 'utf8');
        const v2Html = fs.readFileSync(RTPA_V2_PATH, 'utf8');
        const currentPrintCss = fs.readFileSync(PRINT_CSS_PATH, 'utf8');

        for (const [name, content] of [['v1', v1Html], ['v2', v2Html]]) {
            assert.match(content, /#print-area\s*\{[^}]*width:\s*195mm\s*!important/i,
                `${name} must set #print-area width to 195mm !important to match pages 2-4`);
            assert.match(content, /#print-area\s*\{[^}]*padding:\s*3mm 0\s*!important/i,
                `${name} must set #print-area padding to 3mm 0 !important to match pages 2-4`);
        }

        assert.match(currentPrintCss, /\.theme-stroke\s+#print-area\s*\{[^}]*width:\s*195mm\s*!important/i,
            'print.css must define .theme-stroke #print-area width: 195mm !important');
        assert.match(currentPrintCss, /\.theme-stroke\s+#print-area\s*\{[^}]*padding:\s*3mm 0\s*!important/i,
            'print.css must define .theme-stroke #print-area padding: 3mm 0 !important');
    });

    test('Print Typography: Blood test results checklist items aligned in a 2-column grid without brittle non-breaking spaces', () => {
        const v1Html = fs.readFileSync(RTPA_V1_PATH, 'utf8');
        const v2Html = fs.readFileSync(RTPA_V2_PATH, 'utf8');

        for (const [name, content] of [['v1', v1Html], ['v2', v2Html]]) {
            const match = content.match(/<strong>Blood test results<\/strong>[\s\S]*?<div\s+style="([^"]*display:\s*grid[^"]*)"\s*>([\s\S]*?)<\/div>\s*<\/td>/i);
            assert.ok(match, `${name} must contain Blood test results followed by a grid container`);
            assert.match(match[1], /grid-template-columns:\s*195px\s+auto/i, `${name} must use 195px auto columns`);
            const gridContent = match[2];
            assert.match(gridContent, /☐\s*BS\s*&lt;\s*50,\s*&gt;\s*400\s*mg\/dl/i, `${name} grid must contain BS check`);
            assert.match(gridContent, /☐\s*Plt\s*&lt;\s*100,000/i, `${name} grid must contain Plt check`);
            assert.match(gridContent, /☐\s*INR\s*&gt;\s*1\.7/i, `${name} grid must contain INR check`);
            assert.match(gridContent, /☐\s*PTT\s*prolonged/i, `${name} grid must contain PTT check`);
        }
    });

    test('Accessibility (BUG-1): rtpa.html (v1) WAI-ARIA roving tabindex & 4-way arrow key navigation', () => {
        const win = loadHtmlDom('orders/rtpa.html');
        const doc = win.document;
        const btn09 = doc.querySelector('.dose-button[data-dose="0.9"]');
        const btn06 = doc.querySelector('.dose-button[data-dose="0.6"]');
        const hiddenInput = doc.getElementById('selected-dose-value');

        // Initial state
        assert.equal(btn09.getAttribute('tabindex'), '0', 'Standard dose (0.9) must have tabindex="0" initially');
        assert.equal(btn09.getAttribute('aria-checked'), 'true', 'Standard dose (0.9) must have aria-checked="true" initially');
        assert.ok(btn09.classList.contains('active'), 'Standard dose (0.9) must have active class initially');
        assert.equal(btn06.getAttribute('tabindex'), '-1', 'Alternative dose (0.6) must have tabindex="-1" initially');
        assert.equal(btn06.getAttribute('aria-checked'), 'false', 'Alternative dose (0.6) must have aria-checked="false" initially');
        assert.ok(!btn06.classList.contains('active'), 'Alternative dose (0.6) must not have active class initially');
        assert.equal(hiddenInput.value, '0.9', 'selected dose value must be 0.9 initially');

        // ArrowDown from 0.9 -> switches to 0.6
        btn09.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
        assert.equal(btn06.getAttribute('tabindex'), '0', 'Alternative dose (0.6) must have tabindex="0" after ArrowDown');
        assert.equal(btn06.getAttribute('aria-checked'), 'true', 'Alternative dose (0.6) must have aria-checked="true" after ArrowDown');
        assert.ok(btn06.classList.contains('active'), 'Alternative dose (0.6) must have active class after ArrowDown');
        assert.equal(btn09.getAttribute('tabindex'), '-1', 'Standard dose (0.9) must have tabindex="-1" after ArrowDown');
        assert.equal(btn09.getAttribute('aria-checked'), 'false', 'Standard dose (0.9) must have aria-checked="false" after ArrowDown');
        assert.equal(hiddenInput.value, '0.6', 'selected dose value must update to 0.6');

        // ArrowRight from 0.6 -> wraps to 0.9
        btn06.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        assert.equal(btn09.getAttribute('tabindex'), '0', 'Standard dose (0.9) must wrap to tabindex="0" on ArrowRight');
        assert.equal(btn09.getAttribute('aria-checked'), 'true', 'Standard dose (0.9) must wrap to aria-checked="true" on ArrowRight');
        assert.equal(hiddenInput.value, '0.9', 'selected dose value must wrap to 0.9');

        // ArrowUp from 0.9 -> wraps to 0.6
        btn09.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
        assert.equal(btn06.getAttribute('tabindex'), '0', 'Alternative dose (0.6) must wrap to tabindex="0" on ArrowUp');
        assert.equal(hiddenInput.value, '0.6', 'selected dose value must be 0.6');

        // ArrowLeft from 0.6 -> wraps to 0.9
        btn06.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
        assert.equal(btn09.getAttribute('tabindex'), '0', 'Standard dose (0.9) must wrap to tabindex="0" on ArrowLeft');
        assert.equal(hiddenInput.value, '0.9', 'selected dose value must be 0.9');

        // Click 0.6 directly
        btn06.click();
        assert.equal(btn06.getAttribute('tabindex'), '0', 'Alternative dose (0.6) must have tabindex="0" after click');
        assert.equal(btn09.getAttribute('tabindex'), '-1', 'Standard dose (0.9) must have tabindex="-1" after clicking 0.6');

        // Clear button resets tabindex
        doc.getElementById('clear-btn').click();
        assert.equal(btn09.getAttribute('tabindex'), '0', 'Clear button must reset 0.9 to tabindex="0"');
        assert.equal(btn09.getAttribute('aria-checked'), 'true', 'Clear button must reset 0.9 to aria-checked="true"');
        assert.ok(btn09.classList.contains('active'), 'Clear button must reset 0.9 to active');
        assert.equal(btn06.getAttribute('tabindex'), '-1', 'Clear button must reset 0.6 to tabindex="-1"');
        assert.equal(btn06.getAttribute('aria-checked'), 'false', 'Clear button must reset 0.6 to aria-checked="false"');
        assert.equal(hiddenInput.value, '0.9', 'Clear button must reset selected dose value to 0.9');
    });

    test('Clinical Safety Awareness (IMP-1) & Form Layout Stabilization in rtpa.html (v1)', () => {
        const v1Content = fs.readFileSync(RTPA_V1_PATH, 'utf8');

        // 1. CSS & Layout Grid checks
        assert.match(v1Content, /\.input-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)/i,
            'v1 must lock .input-layout grid tracks with minmax(0, 1fr) minmax(0, 1fr) to prevent CLS');
        assert.ok(v1Content.includes('.form-section-inputs'), 'v1 must define .form-section-inputs');
        assert.ok(v1Content.includes('.form-section-dose'), 'v1 must define .form-section-dose');
        assert.ok(v1Content.includes('.form-section-time'), 'v1 must define .form-section-time');
        assert.match(v1Content, /\.form-section-time\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/i,
            'v1 .form-section-time must be a full-width dedicated row spanning 1 / -1');
        assert.match(v1Content, /@keyframes\s+fadeInBadge/i, 'v1 must include fadeInBadge keyframe for micro-badge');
        assert.match(v1Content, /animation:\s*fadeInBadge\s+0\.15s\s+ease-out/i, 'v1 must specify fadeInBadge 0.15s ease-out');

        const win = loadHtmlDom('orders/rtpa.html');
        const doc = win.document;
        const weightInput = doc.getElementById('weight');
        const badge = doc.getElementById('max-dose-badge');
        const timeCheckbox = doc.getElementById('use-current-time');
        const btn06 = doc.querySelector('.dose-button[data-dose="0.6"]');
        const clearBtn = doc.getElementById('clear-btn');

        // Form DOM hierarchy check
        const sectionInputs = doc.querySelector('.form-section-inputs');
        const sectionDose = doc.querySelector('.form-section-dose');
        const sectionTime = doc.querySelector('.form-section-time');
        assert.ok(sectionInputs && sectionInputs.contains(doc.getElementById('hn')) && sectionInputs.contains(weightInput),
            'form-section-inputs must contain HN and Weight inputs');
        assert.ok(sectionDose && sectionDose.contains(doc.querySelector('.button-dose-group')),
            'form-section-dose must contain dosage selection buttons');
        assert.ok(sectionTime && sectionTime.contains(timeCheckbox) && sectionTime.contains(badge),
            'form-section-time must contain time checkbox and max dose badge');
        assert.ok(badge.textContent.includes('⚠ Max dose capped'), 'Badge must display "⚠ Max dose capped"');

        // Initial state: badge is hidden
        assert.ok(!badge.classList.contains('visible'), 'Micro-badge must be hidden initially');

        // Standard dose (0.9 mg/kg, max 90 mg):
        // Weight 99 kg -> 99 * 0.9 = 89.1 < 90 mg -> badge hidden
        weightInput.value = '99';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(!badge.classList.contains('visible'), 'Micro-badge must be hidden when 99 * 0.9 = 89.1 < 90');

        // Weight 100 kg -> 100 * 0.9 = 90 >= 90 mg -> badge visible
        weightInput.value = '100';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(badge.classList.contains('visible'), 'Micro-badge must appear when 100 * 0.9 = 90 >= 90');

        // Weight 110 kg -> 110 * 0.9 = 99 >= 90 mg -> badge visible
        weightInput.value = '110';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(badge.classList.contains('visible'), 'Micro-badge must remain visible when 110 * 0.9 >= 90');

        // Switch to Alternative dose (0.6 mg/kg, max 60 mg) with weight 90 kg:
        // 90 * 0.6 = 54 < 60 mg -> badge hidden
        weightInput.value = '90';
        weightInput.dispatchEvent(new win.Event('input'));
        btn06.click();
        assert.ok(!badge.classList.contains('visible'), 'Micro-badge must be hidden for 0.6 regimen when 90 * 0.6 = 54 < 60');

        // Weight 100 kg on 0.6 regimen -> 100 * 0.6 = 60 >= 60 mg -> badge visible
        weightInput.value = '100';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(badge.classList.contains('visible'), 'Micro-badge must appear for 0.6 regimen when 100 * 0.6 = 60 >= 60');

        // Clear button resets weight and hides micro-badge
        clearBtn.click();
        assert.ok(!badge.classList.contains('visible'), 'Clear button must hide the micro-badge');
    });

    test('Clinical Safety Awareness: rtpa-v2.html live calculation micro-badge in dose-hud', () => {
        const v2Content = fs.readFileSync(RTPA_V2_PATH, 'utf8');
        assert.ok(v2Content.includes('id="hud-max-dose-badge"'), 'v2 must contain hud-max-dose-badge');
        assert.ok(v2Content.includes('.micro-badge'), 'v2 must style .micro-badge');
        assert.match(v2Content, /@keyframes\s+fadeInBadge/i, 'v2 must include fadeInBadge keyframe for micro-badge');
        assert.match(v2Content, /animation:\s*fadeInBadge\s+0\.15s\s+ease-out/i, 'v2 must specify fadeInBadge 0.15s ease-out');

        const win = loadHtmlDom('orders/rtpa-v2.html');
        const doc = win.document;
        const weightInput = doc.getElementById('weight');
        const badge = doc.getElementById('hud-max-dose-badge');
        const clearBtn = doc.getElementById('clear-btn');
        const standardRadio = doc.querySelector('input[name="dose-radio"][value="0.9"]');
        const lowRadio = doc.querySelector('input[name="dose-radio"][value="0.6"]');
        const tnkRadio = doc.querySelector('input[name="dose-radio"][value="tnk"]');

        assert.ok(badge, 'hud-max-dose-badge must exist in DOM');
        assert.ok(badge.textContent.includes('⚠ Max dose capped'), 'Badge must say ⚠ Max dose capped');
        assert.ok(!badge.classList.contains('visible'), 'Micro-badge must be hidden initially');

        // Standard dose (0.9 mg/kg, max 90 mg)
        weightInput.value = '99';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(!badge.classList.contains('visible'), 'Badge hidden for 0.9 regimen when 99 * 0.9 = 89.1 < 90');

        weightInput.value = '100';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(badge.classList.contains('visible'), 'Badge appears for 0.9 regimen when 100 * 0.9 = 90 >= 90');

        // Alternative Low dose (0.6 mg/kg, max 60 mg)
        lowRadio.checked = true;
        lowRadio.dispatchEvent(new win.Event('change'));
        weightInput.value = '90';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(!badge.classList.contains('visible'), 'Badge hidden for 0.6 regimen when 90 * 0.6 = 54 < 60');

        weightInput.value = '100';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(badge.classList.contains('visible'), 'Badge appears for 0.6 regimen when 100 * 0.6 = 60 >= 60');

        // TNK dose (0.25 mg/kg, max 25 mg)
        tnkRadio.checked = true;
        tnkRadio.dispatchEvent(new win.Event('change'));
        weightInput.value = '99';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(!badge.classList.contains('visible'), 'Badge hidden for TNK when 99 * 0.25 = 24.75 < 25');

        weightInput.value = '100';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(badge.classList.contains('visible'), 'Badge appears for TNK when 100 * 0.25 = 25 >= 25');

        // Clear button resets
        clearBtn.click();
        assert.ok(!badge.classList.contains('visible'), 'Clear button must hide the live HUD micro-badge');
    });

    test('Clinical UX: rtpa-v2.html smooth fade-in animation on regimen switch and first calculation', () => {
        const v2Content = fs.readFileSync(RTPA_V2_PATH, 'utf8');
        assert.match(v2Content, /@keyframes\s+fadeInValue/i, 'v2 must define fadeInValue keyframe');
        assert.ok(v2Content.includes('.hud-value.animate-fade'), 'v2 must define .hud-value.animate-fade class');

        const win = loadHtmlDom('orders/rtpa-v2.html');
        const doc = win.document;
        const weightInput = doc.getElementById('weight');
        const hudTotal = doc.getElementById('hud-total-dose');
        const lowRadio = doc.querySelector('input[name="dose-radio"][value="0.6"]');

        // Initially empty (-- mg), animate-fade is not present
        assert.ok(!hudTotal.classList.contains('animate-fade'), 'hud-total must not have animate-fade initially');

        // First calculation from empty -> triggers animate-fade
        weightInput.value = '60';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(hudTotal.classList.contains('animate-fade'), 'hud-total must trigger animate-fade on first calculation from empty');

        // Continuous typing (already has value) -> does not trigger animate-fade
        hudTotal.classList.remove('animate-fade');
        weightInput.value = '65';
        weightInput.dispatchEvent(new win.Event('input'));
        assert.ok(!hudTotal.classList.contains('animate-fade'), 'Continuous typing must not trigger animate-fade (0ms instant update)');

        // Regimen switch -> triggers animate-fade
        lowRadio.checked = true;
        lowRadio.dispatchEvent(new win.Event('change'));
        assert.ok(hudTotal.classList.contains('animate-fade'), 'Regimen switch must trigger animate-fade');
    });
});
