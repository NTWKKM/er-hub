// tests/tb-calculator-ui.test.js
// Unit tests and verification guard for TB Weight-Based Dosing Calculator prototype tool

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('TB Weight-Based Dosing Calculator Verification', async (t) => {

    await t.test('tb-calculator.html exists on disk', () => {
        const filePath = path.join(ROOT_DIR, 'tools', 'tb-calculator.html');
        assert.strictEqual(fs.existsSync(filePath), true, 'tools/tb-calculator.html should exist');
    });

    await t.test('tb-calculator.html contains required Thailand CPG 2018 & 2022 clinical elements', () => {
        const html = fs.readFileSync(path.join(ROOT_DIR, 'tools', 'tb-calculator.html'), 'utf8');

        // Check CPG citation
        assert.ok(html.includes('CPG วัณโรค ประเทศไทย พ.ศ. 2561 & 2565'), 'Should cite Thailand CPG 2018 & 2022');

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
        assert.ok(html.includes('6-9H'), 'Should include 6-9H preventive regimen');

        // Check MDR-TB Bedaquiline summary
        assert.ok(html.includes('Bedaquiline'), 'Should include Bedaquiline in MDR-TB section');
        assert.ok(html.includes('Group A'), 'Should include WHO Group A classification');
    });

    await t.test('index.html links to tools/tb-calculator.html as prototype item T6', () => {
        const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
        assert.ok(html.includes('href="tools/tb-calculator.html"'), 'index.html should link to tools/tb-calculator.html');
        assert.ok(html.includes('T6'), 'index.html should label TB calculator as T6');
        assert.ok(html.includes('TB Weight-Based Dosing Calculator'), 'index.html should display title');
    });

    await t.test('service-worker.js includes ./tools/tb-calculator.html in ASSETS array and uses v37', () => {
        const sw = fs.readFileSync(path.join(ROOT_DIR, 'service-worker.js'), 'utf8');
        assert.ok(sw.includes("'er-hub-v37'"), 'CACHE_VERSION should be er-hub-v37');
        assert.ok(sw.includes("'./tools/tb-calculator.html'"), 'ASSETS array should contain ./tools/tb-calculator.html');
    });

    await t.test('index.html version string matches service-worker.js v37', () => {
        const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
        assert.ok(html.includes('v37'), 'index.html top nav should state v37');
    });

    await t.test('ARCHITECTURE.md documents tools/tb-calculator.html', () => {
        const arch = fs.readFileSync(path.join(ROOT_DIR, 'ARCHITECTURE.md'), 'utf8');
        assert.ok(arch.includes('tools/tb-calculator.html'), 'ARCHITECTURE.md should document tools/tb-calculator.html');
    });

});
