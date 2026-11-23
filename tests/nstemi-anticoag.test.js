/**
 * NSTEMI V1 and V2 anticoagulant and antiplatelet logic (re-audit 2026-11-22).
 *  - Enoxaparin: 1 mg/kg q12h at any age (no NSTE-ACS age adjustment); eGFR < 30 → 1 mg/kg OD (auto, overridable)
 *  - Fondaparinux contraindicated below eGFR 30 (ADR-40 amendment)
 *  - High risk (invasive < 24 h): hold P2Y12, no routine pretreatment (ACC/AHA 2025)
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { CLINICAL_ENGINE } = require('../shared/clinical-engine.js');

function loadHtmlDom(relPath) {
    const filePath = path.join(__dirname, '..', relPath);
    const dir = path.dirname(filePath);
    const html = fs.readFileSync(filePath, 'utf8').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
        const p = path.resolve(dir, src);
        return fs.existsSync(p) ? '<script>' + fs.readFileSync(p, 'utf8') + '</script>' : m;
    });
    const dom = new JSDOM(html, { url: 'file://' + filePath, runScripts: 'dangerously' });
    dom.window.scrollTo = () => {};
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return dom.window;
}

function fill(win, { weight, age, sex = 'male', cr }) {
    const doc = win.document;
    const set = (id, v) => {
        const el = doc.getElementById(id);
        el.value = String(v);
        el.dispatchEvent(new win.Event('input', { bubbles: true }));
        el.dispatchEvent(new win.Event('change', { bubbles: true }));
    };
    set('weight', weight);
    set('age', age);
    const sx = doc.querySelector(`input[name="sex"][value="${sex}"]`);
    sx.checked = true;
    sx.dispatchEvent(new win.Event('change', { bubbles: true }));
    set('creatinine', cr);
}

function chooseEnox(win) {
    const r = win.document.querySelector('input[name="anticoag-choice"][value="enox"]');
    r.checked = true;
    r.dispatchEvent(new win.Event('change', { bubbles: true }));
}

const freq = win => win.document.querySelector('input[name="enox-freq"]:checked')?.value;

describe('CLINICAL_ENGINE enoxaparin helpers', () => {
    test('standard adult: 1 mg/kg q12h', () => {
        assert.deepEqual(CLINICAL_ENGINE.calcEnoxaparinACS({ weight: 70, age: 60, freq: 'q12h' }),
            { mgPerKg: 1, dose: 70, freq: 'q12h' });
    });
    test('age >= 75 on q12h stays 1 mg/kg (0.75 mg/kg is a STEMI-only regimen)', () => {
        const r = CLINICAL_ENGINE.calcEnoxaparinACS({ weight: 70, age: 80, freq: 'q12h' });
        assert.equal(r.mgPerKg, 1);
        assert.equal(r.dose, 70);
    });
    test('once daily (renal) is 1 mg/kg', () => {
        assert.equal(CLINICAL_ENGINE.calcEnoxaparinACS({ weight: 70, age: 82, freq: 'q24h' }).dose, 70);
    });
    test('eGFR band: < 30 → q24h, >= 30 → q12h, unknown → null', () => {
        assert.equal(CLINICAL_ENGINE.enoxFreqForEgfr(29), 'q24h');
        assert.equal(CLINICAL_ENGINE.enoxFreqForEgfr(30), 'q12h');
        assert.equal(CLINICAL_ENGINE.enoxFreqForEgfr(null), null);
    });
});

for (const page of ['orders/nstemi.html', 'orders/nstemi-v2.html']) {
    describe(`${page} anticoagulation`, () => {
        test('elderly patient gets 1 mg/kg q12h enoxaparin on screen', () => {
            const win = loadHtmlDom(page);
            fill(win, { weight: 70, age: 80, cr: 0.9 });
            chooseEnox(win);
            assert.equal(freq(win), 'q12h');
            assert.match(win.document.getElementById('screen-anticoag').textContent, /Enoxaparin 70 mg SC q12h/);
        });

        test('Clear resets the eGFR band so the next patient gets auto frequency again', () => {
            const win = loadHtmlDom(page);
            fill(win, { weight: 70, age: 60, cr: 3.0 });      // eGFR ≈ 23 → q24h
            assert.equal(freq(win), 'q24h');
            // Manual q12h override: without a band reset on Clear it would survive to the next patient
            const q12 = win.document.querySelector('input[name="enox-freq"][value="q12h"]');
            q12.checked = true;
            q12.dispatchEvent(new win.Event('change', { bubbles: true }));
            assert.equal(freq(win), 'q12h');
            win.document.getElementById('clear-btn').click();
            fill(win, { weight: 70, age: 60, cr: 3.0 });      // same band, new patient
            assert.equal(freq(win), 'q24h', 'auto-selection must run again after Clear');
        });

        test('enoxaparin label shows a placeholder, not "null mg", when the weight is deleted', () => {
            const win = loadHtmlDom(page);
            fill(win, { weight: 70, age: 60, cr: 0.9 });
            chooseEnox(win);
            assert.match(win.document.getElementById('screen-anticoag').textContent, /Enoxaparin 70 mg/);
            const w = win.document.getElementById('weight');
            w.value = '';
            w.dispatchEvent(new win.Event('input', { bubbles: true }));
            const label = win.document.getElementById('screen-anticoag').textContent;
            assert.doesNotMatch(label, /null/);
            assert.match(label, /Enoxaparin -- mg/);
        });

        test('eGFR < 30 auto-selects once daily, and a manual q12h override survives re-render', () => {
            const win = loadHtmlDom(page);
            fill(win, { weight: 70, age: 60, cr: 3.0 });      // eGFR ≈ 23
            assert.equal(freq(win), 'q24h');
            const q12 = win.document.querySelector('input[name="enox-freq"][value="q12h"]');
            q12.checked = true;
            q12.dispatchEvent(new win.Event('change', { bubbles: true }));
            const w = win.document.getElementById('weight');
            w.value = '72';
            w.dispatchEvent(new win.Event('input', { bubbles: true }));
            assert.equal(freq(win), 'q12h', 'override must not be reset while the eGFR band is unchanged');
        });

        test('fondaparinux at eGFR 30 is selectable without override', () => {
            const win = loadHtmlDom(page);
            fill(win, { weight: 70, age: 60, cr: 2.4 });      // eGFR 30 (CKD-EPI 2021)
            assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(2.4, 60, 'male'), 30);
            const radio = win.document.getElementById('ac-radio-fonda');
            assert.equal(radio.closest('label').classList.contains('ac-disabled'), false);
            radio.click();
            assert.equal(radio.checked, true, 'a single click selects fondaparinux');
        });

        test('fondaparinux below eGFR 30 is contraindicated and needs a confirmed override', () => {
            const win = loadHtmlDom(page);
            fill(win, { weight: 70, age: 60, cr: 2.45 });     // eGFR 29
            assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(2.45, 60, 'male'), 29);
            const radio = win.document.getElementById('ac-radio-fonda');
            const label = radio.closest('label');
            assert.equal(label.classList.contains('ac-disabled'), true);
            radio.click();
            assert.equal(radio.checked, false, 'first click must not select a contraindicated drug');
            assert.equal(label.classList.contains('ac-override-pending'), true);
            radio.click();
            assert.equal(radio.checked, true, 'second click confirms the override');
        });

        test('fondaparinux hint states the eGFR < 30 contraindication', () => {
            const win = loadHtmlDom(page);
            fill(win, { weight: 70, age: 60, cr: 3.0 });      // eGFR ≈ 23
            assert.match(win.document.getElementById('ac-fonda-hint').textContent, /CI: eGFR <30/);
            assert.doesNotMatch(win.document.getElementById('ac-fonda-hint').textContent, /CI: eGFR <20/);
        });
    });
}

describe('orders/nstemi-v2.html P2Y12 hint for high risk', () => {
    test('high-risk hint holds P2Y12 without offering ticagrelor pretreatment', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'orders/nstemi-v2.html'), 'utf8');
        const line = src.split('\n').find(l => l.includes('<strong>High Risk:</strong>'));
        assert.ok(line, 'high-risk hint present');
        assert.doesNotMatch(line, /Ticagrelor 180/);
    });
});

describe('rt-PA post-thrombolysis rescue tips', () => {
    for (const page of ['orders/rtpa.html', 'orders/rtpa-v2.html']) {
        test(`${page}: tips popover covers sICH and angioedema and stays off the print`, () => {
            const doc = loadHtmlDom(page).document;
            const btn = doc.querySelector('.btn-rescue-tips');
            const pop = doc.getElementById('rescue-tips-pop');
            assert.ok(btn && pop);
            assert.equal(btn.getAttribute('popovertarget'), 'rescue-tips-pop');
            assert.ok(pop.hasAttribute('popover'));
            assert.match(pop.textContent, /Cryoprecipitate/);
            assert.match(pop.textContent, /Tranexamic acid/);
            assert.match(pop.textContent, /angioedema/i);
            assert.ok(btn.closest('.no-print'));
            assert.equal(doc.getElementById('print-area')?.contains(pop) ?? false, false);
        });
    }
    test('rtpa.html (V1, alteplase only) does not cite tenecteplase dosing', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'orders/rtpa.html'), 'utf8');
        assert.doesNotMatch(src, /Tenecteplase 0\.25 mg\/kg single bolus/);
    });
});
