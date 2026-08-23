const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

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

    // Ensure DOMContentLoaded handlers run
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return dom.window;
}

describe('NSTEMI V2 Worksheet (orders/nstemi-v2.html) DOM Execution', () => {
    test('Initializes with empty inputs displaying placeholder "--" without phantom GRACE score', () => {
        const win = loadHtmlDom('orders/nstemi-v2.html');
        const doc = win.document;

        assert.equal(doc.getElementById('screen-grace').textContent, '--');
        assert.equal(doc.getElementById('p-grace').textContent, '--');
        assert.equal(doc.getElementById('screen-risk-label').textContent, '--');
        assert.equal(doc.getElementById('screen-risk-badge').className, 'risk-badge');
        assert.equal(doc.getElementById('grace-row-placeholder').style.display, '');
        assert.equal(doc.getElementById('grace-row-total').style.display, 'none');
    });

    test('Incomplete form inputs do not trigger GRACE calculation or phantom points', () => {
        const win = loadHtmlDom('orders/nstemi-v2.html');
        const doc = win.document;

        // Fill age, hr, sbp but leave creatinine empty
        doc.getElementById('age').value = '65';
        doc.getElementById('hr').value = '80';
        doc.getElementById('sbp').value = '120';
        doc.getElementById('age').dispatchEvent(new win.Event('input', { bubbles: true }));

        assert.equal(doc.getElementById('screen-grace').textContent, '--');
        assert.equal(doc.getElementById('p-grace').textContent, '--');
        assert.equal(doc.getElementById('screen-risk-label').textContent, '--');
    });

    test('Complete form calculates exact GRACE score and formats Killip as Roman numeral', () => {
        const win = loadHtmlDom('orders/nstemi-v2.html');
        const doc = win.document;

        doc.getElementById('age').value = '65';
        doc.getElementById('hr').value = '80';
        doc.getElementById('sbp').value = '120';
        doc.getElementById('creatinine').value = '1.0';

        // Select Killip II
        const killip2 = doc.querySelector('input[name="killip"][value="2"]');
        if (killip2) {
            killip2.checked = true;
            killip2.dispatchEvent(new win.Event('change', { bubbles: true }));
        }
        doc.getElementById('nstemi-form').dispatchEvent(new win.Event('input', { bubbles: true }));

        // Expected score: 58 (age 65) + 9 (hr 80) + 34 (sbp 120) + 7 (cr 1.0) + 20 (Killip II) = 128
        assert.equal(doc.getElementById('screen-grace').textContent, '128');
        assert.equal(doc.getElementById('p-grace').textContent, '128');
        assert.equal(doc.getElementById('p-killip').textContent, 'Class II');
        assert.equal(doc.getElementById('grace-val-killip').textContent, 'Class II');
        assert.equal(doc.getElementById('screen-risk-label').textContent, 'Low-to-Intermediate Risk');
        assert.equal(doc.getElementById('grace-row-total').style.display, '');
    });

    test('Troponin delta percentage correctly formats positive and negative signs', () => {
        const win = loadHtmlDom('orders/nstemi-v2.html');
        const doc = win.document;

        // Baseline H0 = 100
        doc.getElementById('troponin-h0').value = '100';

        // Rising delta H1 = 125 (+25.0%)
        doc.getElementById('troponin-h1').value = '125';
        doc.getElementById('nstemi-form').dispatchEvent(new win.Event('input', { bubbles: true }));
        assert.ok(doc.getElementById('p-troponin-values').innerHTML.includes('H1: 125 → +25.0%'),
            `Expected "+25.0%", got: ${doc.getElementById('p-troponin-values').innerHTML}`);

        // Falling delta H3 = 80 (-20.0%)
        doc.getElementById('troponin-h3').value = '80';
        doc.getElementById('nstemi-form').dispatchEvent(new win.Event('input', { bubbles: true }));
        assert.ok(doc.getElementById('p-troponin-values').innerHTML.includes('H3: 80 → -20.0%'),
            `Expected "-20.0%", got: ${doc.getElementById('p-troponin-values').innerHTML}`);
        assert.ok(!doc.getElementById('p-troponin-values').innerHTML.includes('+-20.0%'),
            'Must not contain "+-20.0%" malformed sign');
    });
});

describe('NIHSS V2 Worksheet (tools/nihss-v2.html) DOM Execution', () => {
    test('inputmode="numeric" is set strictly on score inputs and not on examiner signature fields', () => {
        const win = loadHtmlDom('tools/nihss-v2.html');
        const doc = win.document;

        const scoreCell = doc.querySelector('input[data-key="1a-1"]');
        const sigCell = doc.querySelector('input[data-key="sig-1"]');

        assert.equal(scoreCell.getAttribute('inputmode'), 'numeric');
        assert.equal(sigCell.getAttribute('inputmode'), null);
    });

    test('Score normalization runs on blur and enforces item boundaries', () => {
        const win = loadHtmlDom('tools/nihss-v2.html');
        const doc = win.document;

        const cell1a = doc.querySelector('input[data-key="1a-1"]');
        const cell5a = doc.querySelector('input[data-key="5a-1"]');

        // Item 1a max is 3 -> 99 should cap to 3
        cell1a.value = '99';
        cell1a.dispatchEvent(new win.Event('blur'));
        assert.equal(cell1a.value, '3');

        // Non-numeric input -> cleared
        cell1a.value = '1.5';
        cell1a.dispatchEvent(new win.Event('blur'));
        assert.equal(cell1a.value, '');

        // Item 5a supports 'UN' -> 'un' becomes 'UN'
        cell5a.value = 'un';
        cell5a.dispatchEvent(new win.Event('blur'));
        assert.equal(cell5a.value, 'UN');

        // Item 1a does not support UN -> 'un' becomes ''
        cell1a.value = 'un';
        cell1a.dispatchEvent(new win.Event('blur'));
        assert.equal(cell1a.value, '');
    });

    test('printWithData() and beforeprint normalize all score cells before printing', () => {
        const win = loadHtmlDom('tools/nihss-v2.html');
        const doc = win.document;

        // Mock window.print
        let printCalled = false;
        win.print = () => { printCalled = true; };

        const cell1a = doc.querySelector('input[data-key="1a-1"]');
        const cell5a = doc.querySelector('input[data-key="5a-1"]');

        cell1a.value = '10'; // Out of range (max 3)
        cell5a.value = '20'; // Out of range (max 4)

        // Trigger printWithData without manual blur
        win.printWithData();

        assert.equal(cell1a.value, '3');
        assert.equal(cell5a.value, '4');
        assert.equal(doc.getElementById('total-1').textContent, '7');
        assert.equal(printCalled, true);

        // Test beforeprint event handler
        const cell2 = doc.querySelector('input[data-key="2-1"]');
        cell2.value = '50'; // Out of range (max 2)
        win.dispatchEvent(new win.Event('beforeprint'));

        assert.equal(cell2.value, '2');
    });
});
