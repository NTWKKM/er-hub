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
    test('Score cells are select dropdowns and examiner signature fields are text inputs', () => {
        const win = loadHtmlDom('tools/nihss-v2.html');
        const doc = win.document;

        const scoreCell = doc.querySelector('.cell[data-key="1a-1"]');
        const sigCell = doc.querySelector('input[data-key="sig-1"]');

        assert.equal(scoreCell.tagName, 'SELECT');
        assert.equal(sigCell.tagName, 'INPUT');
        assert.equal(sigCell.type, 'text');
    });

    test('Selecting scores updates total sum in real time across columns', () => {
        const win = loadHtmlDom('tools/nihss-v2.html');
        const doc = win.document;

        const cell1a = doc.querySelector('.cell[data-key="1a-1"]');
        const cell5a = doc.querySelector('.cell[data-key="5a-1"]');
        const cell6a = doc.querySelector('.cell[data-key="6a-1"]');

        cell1a.value = '2';
        cell1a.dispatchEvent(new win.Event('change'));

        cell5a.value = '3';
        cell5a.dispatchEvent(new win.Event('change'));

        cell6a.value = 'UN';
        cell6a.dispatchEvent(new win.Event('change'));

        assert.equal(doc.getElementById('total-1').textContent, '5');

        // Column 2
        const cell1a_col2 = doc.querySelector('.cell[data-key="1a-2"]');
        cell1a_col2.value = '1';
        cell1a_col2.dispatchEvent(new win.Event('change'));
        assert.equal(doc.getElementById('total-2').textContent, '1');
    });

    test('Unselected score options default to blank empty string instead of dashes', () => {
        const win = loadHtmlDom('tools/nihss-v2.html');
        const doc = win.document;

        const selectCells = doc.querySelectorAll('select.cell');
        assert.equal(selectCells.length, 45, 'Must have 45 score select cells (15 items x 3 timepoints)');

        selectCells.forEach(select => {
            const firstOpt = select.options[0];
            assert.equal(firstOpt.value, '', 'First option value must be empty string');
            assert.equal(firstOpt.textContent, '', 'First option text must be completely blank');
            assert.equal(select.value, '', 'Initial select value must be empty string');
        });
    });

    test('printBlank() temporarily clears all selections and restores them after print', () => {
        const win = loadHtmlDom('tools/nihss-v2.html');
        const doc = win.document;

        let printCalled = false;
        win.print = () => { printCalled = true; };

        const cell1a = doc.querySelector('.cell[data-key="1a-1"]');
        const cell5a = doc.querySelector('.cell[data-key="5a-1"]');

        cell1a.value = '3';
        cell5a.value = '4';
        cell1a.dispatchEvent(new win.Event('change'));

        assert.equal(doc.getElementById('total-1').textContent, '7');

        win.printBlank();

        assert.equal(printCalled, true);
        assert.equal(cell1a.value, '3');
        assert.equal(cell5a.value, '4');
        assert.equal(doc.getElementById('total-1').textContent, '7');
    });

    test('Table headers have dedicated width classes and 2-line structure for post 1h column', () => {
        const win = loadHtmlDom('tools/nihss-v2.html');
        const doc = win.document;

        const thPost1h = doc.querySelector('thead th.col-chk-post1h');
        assert.ok(thPost1h, 'Header for post-1h column should have .col-chk-post1h class');
        assert.ok(thPost1h.innerHTML.includes('หลังให้ยา 1 ชม.'), 'Header must contain Thai line "หลังให้ยา 1 ชม."');
        assert.ok(thPost1h.innerHTML.includes('(Post 1h)'), 'Header must contain English line "(Post 1h)"');

        const thPost24h = doc.querySelector('thead th.col-chk-post24h');
        assert.ok(thPost24h, 'Header for post-24h column should have .col-chk-post24h class');
        assert.ok(thPost24h.innerHTML.includes('24 ชั่วโมง'), 'Header must contain Thai line "24 ชั่วโมง"');
        assert.ok(thPost24h.innerHTML.includes('(Post 24h)'), 'Header must contain English line "(Post 24h)"');
    });
});

describe('rt-PA & Tenecteplase Stroke Worksheet (orders/rtpa-v2.html) DOM Execution', () => {
    test('Default selection is Alteplase 0.9 mg/kg and updates live HUD accordingly', () => {
        const win = loadHtmlDom('orders/rtpa-v2.html');
        const doc = win.document;

        const standardRadio = doc.querySelector('input[name="dose-radio"][value="0.9"]');
        assert.ok(standardRadio && standardRadio.checked, 'Alteplase 0.9 mg/kg must be checked by default');

        // Enter weight = 60 kg
        doc.getElementById('weight').value = '60';
        doc.getElementById('weight').dispatchEvent(new win.Event('input', { bubbles: true }));

        // 60 kg * 0.9 = 54 mg total, 5.4 mg push (10%), 48.6 mg drip (90%)
        assert.equal(doc.getElementById('hud-total-dose').textContent, '54.00 mg');
        assert.equal(doc.getElementById('hud-push-dose').textContent, '5.4 mg');
        assert.equal(doc.getElementById('hud-drip-dose').textContent, '48.60 mg');
        assert.equal(doc.getElementById('hud-regimen-badge').textContent, '0.9 mg/kg');
    });

    test('Selecting Tenecteplase (TNK 0.25 mg/kg) updates live HUD with single bolus push', () => {
        const win = loadHtmlDom('orders/rtpa-v2.html');
        const doc = win.document;

        doc.getElementById('weight').value = '60';
        const tnkRadio = doc.querySelector('input[name="dose-radio"][value="tnk"]');
        assert.ok(tnkRadio, 'TNK radio option must exist');
        tnkRadio.checked = true;
        tnkRadio.dispatchEvent(new win.Event('change', { bubbles: true }));

        // 60 kg * 0.25 = 15 mg (3.0 mL of 5 mg/mL)
        assert.equal(doc.getElementById('hud-total-dose').textContent, '15.0 mg (3.0 mL)');
        assert.equal(doc.getElementById('hud-push-dose').textContent, '15.0 mg (3.0 mL)');
        assert.equal(doc.getElementById('hud-drip-dose').textContent, '0 mg');
        assert.equal(doc.getElementById('hud-regimen-badge').textContent, 'TNK 0.25 mg/kg');
    });

    test('Form submission with Tenecteplase generates correct print order structure', () => {
        const win = loadHtmlDom('orders/rtpa-v2.html');
        const doc = win.document;

        doc.getElementById('hn').value = '123456';
        doc.getElementById('weight').value = '70';
        const tnkRadio = doc.querySelector('input[name="dose-radio"][value="tnk"]');
        tnkRadio.checked = true;
        tnkRadio.dispatchEvent(new win.Event('change', { bubbles: true }));

        doc.getElementById('rtpa-form').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));

        // Check print results container is visible
        assert.equal(doc.getElementById('results-container').classList.contains('hidden'), false);
        assert.equal(doc.getElementById('result-hn').textContent, '123456');
        assert.equal(doc.getElementById('result-weight').textContent, '70.00');

        const printHeader = doc.getElementById('print-drug-header');
        assert.ok(printHeader.textContent.includes('Tenecteplase'), 'Print order header must specify Tenecteplase');

        const printDetails = doc.getElementById('print-drug-details');
        assert.ok(printDetails.textContent.includes('17.5'), 'Print details must include calculated 17.5 mg dose (70*0.25)');
        assert.ok(printDetails.textContent.includes('3.5'), 'Print details must include calculated 3.5 mL volume');
    });
});

