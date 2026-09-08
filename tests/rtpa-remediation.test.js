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
});
