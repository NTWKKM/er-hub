const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

function loadScoreHubDom() {
    const htmlPath = path.join(__dirname, '..', 'tools', 'score-hub.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const dir = path.dirname(htmlPath);

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
        url: 'file://' + htmlPath,
        runScripts: 'dangerously'
    });

    // Ensure DOMContentLoaded handlers run
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return dom.window;
}

describe('Clinical Score Hub (tools/score-hub.html)', () => {
    let win;

    test('Loads DOM and initializes without throwing', () => {
        win = loadScoreHubDom();
        assert.ok(win.document.getElementById('tab-btn-aws'));
        assert.ok(win.document.getElementById('panel-aws'));
    });

    test('1. AWS Score (CIWA-Ar) calculation and tier thresholds', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        // Default all 0 -> Mild (< 10)
        assert.equal(doc.getElementById('aws-score-display').textContent, '0 / 67');
        assert.ok(doc.getElementById('aws-risk-badge').textContent.includes('Mild'));

        // Moderate tier (10 - 19)
        doc.getElementById('aws-nausea').value = '4';
        doc.getElementById('aws-tremor').value = '4';
        doc.getElementById('aws-sweats').value = '4';
        win.calcAWS();
        assert.equal(doc.getElementById('aws-score-display').textContent, '12 / 67');
        assert.ok(doc.getElementById('aws-risk-badge').textContent.includes('Moderate'));

        // Severe tier (>= 20)
        doc.getElementById('aws-anxiety').value = '4';
        doc.getElementById('aws-agitation').value = '5';
        win.calcAWS();
        assert.equal(doc.getElementById('aws-score-display').textContent, '21 / 67');
        assert.ok(doc.getElementById('aws-risk-badge').textContent.includes('Severe'));
    });

    test('2. Sepsis (SIRS Criteria) evaluation', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        win.calcSepsis();
        // Default 0 -> Negative
        assert.equal(doc.getElementById('sirs-score').textContent, '0 / 4');
        assert.ok(doc.getElementById('sepsis-status-badge').textContent.includes('Negative'));

        // Check 2 items -> Positive (>= 2)
        doc.getElementById('sirs-temp').checked = true;
        doc.getElementById('sirs-hr').checked = true;
        win.calcSepsis();
        assert.equal(doc.getElementById('sirs-score').textContent, '2 / 4');
        assert.ok(doc.getElementById('sepsis-status-badge').textContent.includes('POSITIVE'));
    });

    test('3. Sepsis NEWS2 score and single parameter 3-point rule', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        // Default 0 -> Low Risk (0-4)
        assert.equal(doc.getElementById('news2-score-val').textContent, '0');
        assert.ok(doc.getElementById('news2-risk-badge').textContent.includes('Low'));

        // Single parameter with 3 points -> Medium Risk trigger
        doc.getElementById('news-rr').value = '3';
        win.calcNEWS2();
        assert.equal(doc.getElementById('news2-score-val').textContent, '3');
        assert.ok(doc.getElementById('news2-risk-badge').textContent.includes('Medium'));

        // Total >= 7 -> High Risk
        doc.getElementById('news-sbp').value = '3';
        doc.getElementById('news-hr').value = '2';
        win.calcNEWS2();
        assert.equal(doc.getElementById('news2-score-val').textContent, '8');
        assert.ok(doc.getElementById('news2-risk-badge').textContent.includes('High'));
    });

    test('4. Sepsis MEWS calculation', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        // Default 0 -> Low (0-1)
        assert.equal(doc.getElementById('mews-score-val').textContent, '0');
        assert.ok(doc.getElementById('mews-risk-badge').textContent.includes('Low'));

        // MEWS 3 -> Medium (2-4)
        doc.getElementById('mews-sbp').value = '2';
        doc.getElementById('mews-hr').value = '1';
        win.calcMEWS();
        assert.equal(doc.getElementById('mews-score-val').textContent, '3');
        assert.ok(doc.getElementById('mews-risk-badge').textContent.includes('Medium'));

        // MEWS >= 5 -> High
        doc.getElementById('mews-rr').value = '2';
        doc.getElementById('mews-temp').value = '2';
        win.calcMEWS();
        assert.equal(doc.getElementById('mews-score-val').textContent, '7');
        assert.ok(doc.getElementById('mews-risk-badge').textContent.includes('High'));
    });

    test('5. Sepsis Empiric Antibiotics source update', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        doc.getElementById('sepsis-source-select').value = 'cns';
        win.updateSepsisAbx();
        assert.ok(doc.getElementById('abx-title').textContent.includes('Central Nervous System'));
        assert.ok(doc.getElementById('abx-detail-text').innerHTML.includes('Ceftriaxone 2 g IV q 12h'));
    });

    test('6. ABCD2 Score for TIA stroke risk', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        // Age >= 60 (+1), BP >= 140/90 (+1), Unilateral weakness (+2), Duration >= 60m (+2), DM (+1) = 7
        doc.getElementById('abcd2-age').value = '1';
        doc.getElementById('abcd2-bp').value = '1';
        doc.getElementById('abcd2-clinical').value = '2';
        doc.getElementById('abcd2-duration').value = '2';
        doc.getElementById('abcd2-dm').value = '1';
        win.calcABCD2();

        assert.equal(doc.getElementById('abcd2-score-val').textContent, '7 / 7');
        assert.ok(doc.getElementById('abcd2-risk-badge').textContent.includes('High'));
    });

    test('7. HEART Score for chest pain evaluation', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        // Highly suspicious (+2), ST depression (+2), Age >= 65 (+2), >=3 Risk factors (+2), Trop > 3x (+2) = 10
        doc.getElementById('heart-history').value = '2';
        doc.getElementById('heart-ecg').value = '2';
        doc.getElementById('heart-age').value = '2';
        doc.getElementById('heart-risk').value = '2';
        doc.getElementById('heart-trop').value = '2';
        win.calcHEART();

        assert.equal(doc.getElementById('heart-score-val').textContent, '10 / 10');
        assert.ok(doc.getElementById('heart-risk-badge').textContent.includes('High Risk'));
    });

    test('8. Wells Score for Pulmonary Embolism (2-tier and 3-tier)', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        // DVT signs (+3) + Alt Dx less likely (+3) = 6.0 (PE Likely > 4.0, Moderate 2.0-6.0)
        doc.getElementById('wells-dvt').checked = true;
        doc.getElementById('wells-alt').checked = true;
        win.calcWells();

        assert.equal(doc.getElementById('wells-score-val').textContent, '6.0');
        assert.ok(doc.getElementById('wells-risk-badge').textContent.includes('PE Likely'));
        assert.ok(doc.getElementById('wells-guidance').textContent.includes('Moderate Risk'));

        // + HR > 100 (+1.5) = 7.5 -> High Risk (> 6.0)
        doc.getElementById('wells-hr').checked = true;
        win.calcWells();
        assert.equal(doc.getElementById('wells-score-val').textContent, '7.5');
        assert.ok(doc.getElementById('wells-guidance').textContent.includes('High Risk'));
    });

    test('9. Revised Geneva Score for PE', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        // Age >= 65 (+1), HR >= 95 (+5), Prev DVT (+3), Hemoptysis (+2) = 11 (High Risk >= 11)
        doc.getElementById('geneva-age').value = '1';
        doc.getElementById('geneva-hr').value = '5';
        doc.getElementById('geneva-prev').checked = true;
        doc.getElementById('geneva-hemo').checked = true;
        win.calcGeneva();

        assert.equal(doc.getElementById('geneva-score-val').textContent, '11');
        assert.ok(doc.getElementById('geneva-risk-badge').textContent.includes('High Risk'));
    });

    test('10. PERC Rule (8/8 negative criteria required to rule out)', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        // 0 of 8 checked -> Positive (rule-out failed)
        win.calcPERC();
        assert.equal(doc.getElementById('perc-score-val').textContent, '0 / 8');
        assert.ok(doc.getElementById('perc-risk-badge').textContent.includes('PERC Positive'));

        // Check all 8 -> PERC Negative (Rule Out PE)
        const ids = ['perc-age', 'perc-hr', 'perc-spo2', 'perc-prev', 'perc-surg', 'perc-hemo', 'perc-estrogen', 'perc-leg'];
        ids.forEach(id => { doc.getElementById(id).checked = true; });
        win.calcPERC();
        assert.equal(doc.getElementById('perc-score-val').textContent, '8 / 8');
        assert.ok(doc.getElementById('perc-risk-badge').textContent.includes('PERC Negative'));
    });

    test('11. Sepsis Resuscitation SSC 2026 guidance elements present', () => {
        win = loadScoreHubDom();
        const doc = win.document;
        const html = doc.documentElement.innerHTML;

        assert.ok(html.includes('SSC 2026'), 'Should include SSC 2026 references');
        assert.ok(html.includes('Active Fluid Removal (De-resuscitation)'), 'Should mention Active Fluid Removal (De-resuscitation)');
        assert.ok(html.includes('เป้าหมาย MAP 60-65 mmHg ในผู้ใหญ่ ≥ 65 ปี'), 'Should include MAP 60-65 mmHg target in elderly');
    });

    test('12. Instant Score Search filter and instant tab jump', () => {
        win = loadScoreHubDom();
        const doc = win.document;

        const searchInput = doc.getElementById('score-search');
        const dropdown = doc.getElementById('search-results-dropdown');
        assert.ok(searchInput, 'Search input should exist');
        assert.ok(dropdown, 'Dropdown container should exist');

        // Typing 'heart' filters and shows matching item
        searchInput.value = 'heart';
        searchInput.dispatchEvent(new win.Event('input'));

        assert.equal(dropdown.style.display, 'block');
        const items = dropdown.querySelectorAll('.search-result-item');
        assert.ok(items.length >= 1, 'Should find at least 1 match for "heart"');

        // Click first item -> activates HEART tab
        items[0].click();
        assert.ok(doc.getElementById('tab-btn-heart').classList.contains('active'), 'HEART tab button should be active');
        assert.ok(doc.getElementById('panel-heart').classList.contains('active'), 'HEART panel should be active');
        assert.equal(dropdown.style.display, 'none');

        // Typing 'wells' -> jumps to PE tab and activates Wells sub-tab
        searchInput.value = 'wells';
        searchInput.dispatchEvent(new win.Event('input'));
        const peItems = dropdown.querySelectorAll('.search-result-item');
        assert.ok(peItems.length >= 1);
        peItems[0].click();
        assert.ok(doc.getElementById('tab-btn-pe').classList.contains('active'), 'PE tab button should be active');
        assert.ok(doc.getElementById('panel-pe').classList.contains('active'), 'PE panel should be active');
        assert.equal(doc.getElementById('pe-sub-wells').style.display, 'block');
    });
});
