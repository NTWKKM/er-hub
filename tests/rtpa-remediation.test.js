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
});
