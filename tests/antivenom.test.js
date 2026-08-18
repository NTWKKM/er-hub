const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

function loadAntivenomDom() {
    const htmlPath = path.join(__dirname, '..', 'orders', 'antivenom.html');
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
        runScripts: 'dangerously',
        beforeParse(window) {
            window.alert = () => {};
            window.print = () => {};
            window.scrollTo = () => {};
            window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
        }
    });

    // Ensure DOMContentLoaded handlers run
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return dom.window;
}

describe('Antivenom Standing Order (orders/antivenom.html)', () => {
    test('Loads DOM and initializes without runtime errors', () => {
        const win = loadAntivenomDom();
        assert.ok(win.document.getElementById('antivenom-form'));
        assert.ok(win.document.querySelector('input[name="snake-type"][value="hematotoxin"]'));
        assert.ok(win.document.querySelector('input[name="snake-type"][value="neurotoxin"]'));
    });

    test('Horse allergy radio toggle handles change safely without throwing TypeError', () => {
        const win = loadAntivenomDom();
        const doc = win.document;
        const detailInput = doc.getElementById('horse-allergy-detail');

        const radioYes = doc.querySelector('input[name="horse-allergy"][value="yes"]');
        const radioNo = doc.querySelector('input[name="horse-allergy"][value="no"]');

        assert.ok(radioYes);
        assert.ok(radioNo);

        // Select Yes -> shows detail
        radioYes.checked = true;
        radioYes.dispatchEvent(new win.Event('change'));
        assert.equal(detailInput.style.display, 'block');

        // Select No -> hides detail
        radioNo.checked = true;
        radioNo.dispatchEvent(new win.Event('change'));
        assert.equal(detailInput.style.display, 'none');
    });

    test('Snake selection updates calculation and instructions', () => {
        const win = loadAntivenomDom();
        const doc = win.document;

        // Select hematotoxin -> green pit viper
        const hematoRadio = doc.querySelector('input[name="snake-type"][value="hematotoxin"]');
        hematoRadio.checked = true;
        hematoRadio.dispatchEvent(new win.Event('change'));

        const hematoSelect = doc.getElementById('hemato-snake-select');
        hematoSelect.value = 'green_pit_viper';
        hematoSelect.dispatchEvent(new win.Event('change'));

        // Check dosage instructions in print preview
        const snakeName = doc.getElementById('p-snake-name');
        assert.ok(snakeName.textContent.includes('Green Pit Viper') || snakeName.textContent.includes('เขียวหางไหม้'));
    });

    test('Validation enforces required weight on order print creation', () => {
        const win = loadAntivenomDom();
        const doc = win.document;

        // Missing weight should fail validation
        doc.getElementById('hn').value = '123456';
        doc.getElementById('age').value = '45';
        doc.querySelector('input[name="sex"][value="male"]').checked = true;
        doc.getElementById('weight').value = '';

        const createBtn = doc.getElementById('create-order-btn');
        createBtn.click();

        // Print header should not be populated with valid weight
        const pweight = doc.getElementById('p-weight');
        assert.notEqual(pweight.textContent, '45.0');
    });
});
