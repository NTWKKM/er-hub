// tests/tb-calculator-ui.test.js
// Unit tests and verification guard for TB Weight-Based Dosing Calculator prototype tool

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.resolve(__dirname, '..');
const TB_CALC_PATH = path.join(ROOT_DIR, 'tools', 'tb-calculator.html');

test('TB Weight-Based Dosing Calculator Verification', async (t) => {

    await t.test('tb-calculator.html exists on disk', () => {
        assert.strictEqual(fs.existsSync(TB_CALC_PATH), true, 'tools/tb-calculator.html should exist');
    });

    await t.test('tb-calculator.html contains required Thailand CPG 2018 & 2022 clinical elements', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        // Check CPG citation
        assert.ok(html.includes('2561 & 2565 (2022)'), 'Should cite Thailand CPG 2018 & 2022');

        // Check Adult 4-FDC & 2-FDC
        assert.ok(html.includes('H75/R150/Z400/E275'), 'Should include Adult 4-FDC composition');
        assert.ok(html.includes('H150/R300'), 'Should include Adult 2-FDC composition');

        // Check Pediatric mg/kg formulas
        assert.ok(html.includes('10 (10-15) mg/kg/day'), 'Should include child Isoniazid mg/kg formula');
        assert.ok(html.includes('15 (10-20) mg/kg/day'), 'Should include child Rifampicin mg/kg formula');
        assert.ok(html.includes('35 (30-40) mg/kg/day'), 'Should include child Pyrazinamide mg/kg formula');
        assert.ok(html.includes('20 (15-25) mg/kg/day'), 'Should include child Ethambutol mg/kg formula');

        // Check Pediatric Dispersible FDCs
        assert.ok(html.includes('RHZ 75/50/150'), 'Should include child 3-FDC dispersible composition');
        assert.ok(html.includes('RH 75/50'), 'Should include child 2-FDC dispersible composition');

        // Check Renal Failure adjustments (CrCl < 30 / HD)
        assert.ok(html.includes('3 ครั้ง/สัปดาห์'), 'Should specify 3x/week for Z & E in renal failure');
        assert.ok(html.includes('หลังล้างไต'), 'Should specify post-hemodialysis administration');

        // Check Hepatoxicity & H-monoresistance
        assert.ok(html.includes('6(H)RZELfx'), 'Should include 6HRZELfx regimen for H-monoresistance');
        assert.ok(html.includes('Levofloxacin'), 'Should include Levofloxacin for H-monoresistance');

        // Check TPT Regimens
        assert.ok(html.includes('3HP'), 'Should include 3HP preventive regimen');
        assert.ok(html.includes('1HP'), 'Should include 1HP preventive regimen');
        assert.ok(html.includes('4R'), 'Should include 4R preventive regimen');
        assert.ok(html.includes('3HR'), 'Should include 3HR preventive regimen');
        assert.ok(html.includes('6H'), 'Should include 6H preventive regimen');

        // Check MDR-TB Bedaquiline summary
        assert.ok(html.includes('Bedaquiline'), 'Should include Bedaquiline in MDR-TB section');
        assert.ok(html.includes('Group A'), 'Should include WHO Group A classification');
    });

    await t.test('Execution Test: Adult 4-FDC tablet weight boundaries calculation correctness', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        function runCalcAtWeight(w, age = 40) {
            const dom = new JSDOM(html, { runScripts: 'dangerously' });
            const doc = dom.window.document;
            const wInput = doc.getElementById('tb-weight');
            const ageInput = doc.getElementById('tb-age');

            wInput.value = w;
            ageInput.value = age;

            // Trigger calculateTBDoses
            dom.window.calculateTBDoses();

            const fdcText = doc.getElementById('fdc-4-val').innerText;
            const hVal = doc.getElementById('adult-h-val').innerText;
            const rVal = doc.getElementById('adult-r-val').innerText;

            return { fdcText, hVal, rVal };
        }

        // Test Band 30 - 37 kg -> 2 tabs
        const b35 = runCalcAtWeight(35);
        assert.ok(b35.fdcText.includes('2 เม็ด'), `Weight 35kg should give 2 tabs 4-FDC, got: ${b35.fdcText}`);

        const b37 = runCalcAtWeight(37);
        assert.ok(b37.fdcText.includes('2 เม็ด'), `Weight 37kg should give 2 tabs 4-FDC, got: ${b37.fdcText}`);

        // Test Band 38 - 54 kg -> 3 tabs (Critical Bug Fix verification: 50kg & 54kg must give 3 tabs!)
        const b38 = runCalcAtWeight(38);
        assert.ok(b38.fdcText.includes('3 เม็ด'), `Weight 38kg should give 3 tabs 4-FDC, got: ${b38.fdcText}`);

        const b50 = runCalcAtWeight(50);
        assert.ok(b50.fdcText.includes('3 เม็ด'), `Weight 50kg (boundary) should give 3 tabs 4-FDC, got: ${b50.fdcText}`);

        const b54 = runCalcAtWeight(54);
        assert.ok(b54.fdcText.includes('3 เม็ด'), `Weight 54kg should give 3 tabs 4-FDC, got: ${b54.fdcText}`);

        // Test Band 55 - 70 kg -> 4 tabs
        const b55 = runCalcAtWeight(55);
        assert.ok(b55.fdcText.includes('4 เม็ด'), `Weight 55kg should give 4 tabs 4-FDC, got: ${b55.fdcText}`);

        const b70 = runCalcAtWeight(70);
        assert.ok(b70.fdcText.includes('4 เม็ด'), `Weight 70kg should give 4 tabs 4-FDC, got: ${b70.fdcText}`);

        // Test Band > 70 kg -> 5 tabs
        const b71 = runCalcAtWeight(71);
        assert.ok(b71.fdcText.includes('5 เม็ด'), `Weight 71kg should give 5 tabs 4-FDC, got: ${b71.fdcText}`);
    });

    await t.test('Execution Test: Pediatric dispersible FDC weight boundaries', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        function runChildCalc(w, age = 5) {
            const dom = new JSDOM(html, { runScripts: 'dangerously' });
            const doc = dom.window.document;
            doc.getElementById('tb-weight').value = w;
            doc.getElementById('tb-age').value = age;
            dom.window.calculateTBDoses();
            return {
                rhzVal: doc.getElementById('child-rhz-val').innerText,
                rhVal: doc.getElementById('child-rh-val').innerText
            };
        }

        assert.ok(runChildCalc(5).rhzVal.includes('1 เม็ด'), 'Child 5kg should get 1 tab');
        assert.ok(runChildCalc(10).rhzVal.includes('2 เม็ด'), 'Child 10kg should get 2 tabs');
        assert.ok(runChildCalc(14).rhzVal.includes('3 เม็ด'), 'Child 14kg should get 3 tabs');
        assert.ok(runChildCalc(20).rhzVal.includes('4 เม็ด'), 'Child 20kg should get 4 tabs');
    });

    await t.test('index.html links to tools/tb-calculator.html as prototype item T6', () => {
        const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
        assert.ok(html.includes('href="tools/tb-calculator.html"'), 'index.html should link to tools/tb-calculator.html');
        assert.ok(html.includes('T6'), 'index.html should label TB calculator as T6');
        assert.ok(html.includes('TB Weight-Based Dosing Calculator'), 'index.html should display title');
    });

    await t.test('service-worker.js includes ./tools/tb-calculator.html in ASSETS array and uses v39', () => {
        const sw = fs.readFileSync(path.join(ROOT_DIR, 'service-worker.js'), 'utf8');
        assert.ok(sw.includes("'er-hub-v39'"), 'CACHE_VERSION should be er-hub-v39');
        assert.ok(sw.includes("'./tools/tb-calculator.html'"), 'ASSETS array should contain ./tools/tb-calculator.html');
    });

    await t.test('index.html version string matches service-worker.js v39', () => {
        const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
        assert.ok(html.includes('v39'), 'index.html top nav should state v39');
    });

    await t.test('ARCHITECTURE.md documents tools/tb-calculator.html', () => {
        const arch = fs.readFileSync(path.join(ROOT_DIR, 'ARCHITECTURE.md'), 'utf8');
        assert.ok(arch.includes('tools/tb-calculator.html'), 'ARCHITECTURE.md should document tools/tb-calculator.html');
    });

});
