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

        // Check MDR-TB Bedaquiline summary & dropdown options
        assert.ok(html.includes('Bedaquiline'), 'Should include Bedaquiline in MDR-TB section');
        assert.ok(html.includes('Group A'), 'Should include WHO Group A classification');
        assert.ok(html.includes('mdr-shorter'), 'Should include mdr-shorter dropdown option');
        assert.ok(html.includes('mdr-longer'), 'Should include mdr-longer dropdown option');
        assert.ok(!html.includes('value="mdr"'), 'Should remove legacy value="mdr" dropdown option');
    });

    await t.test('Execution Test: Adult 4-FDC tablet weight boundaries calculation correctness', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        function runCalcAtWeight(w, patientType = 'adult-standard') {
            const dom = new JSDOM(html, { runScripts: 'dangerously' });
            const doc = dom.window.document;
            const wInput = doc.getElementById('tb-weight');
            const typeSelect = doc.getElementById('tb-patient-type');

            wInput.value = w;
            typeSelect.value = patientType;

            // Trigger calculateTBDoses
            dom.window.calculateTBDoses();

            const fdcText = doc.getElementById('fdc-4-val').innerText;
            const hVal = doc.getElementById('adult-h-val').innerText;
            const rVal = doc.getElementById('adult-r-val').innerText;

            return { fdcText, hVal, rVal };
        }

        // Test Band < 35 kg -> คำนวณรายบุคคล
        const b30 = runCalcAtWeight(30);
        assert.ok(b30.fdcText.includes('< 35 kg'), `Weight 30kg should specify per-kg calculation (< 35 kg), got: ${b30.fdcText}`);

        // Test Band 35 - 49 kg -> ≈3 tabs (H300 R450 Z1000 E800)
        const b35 = runCalcAtWeight(35);
        assert.ok(b35.fdcText.includes('3 เม็ด'), `Weight 35kg (boundary) should give ≈3 tabs 4-FDC, got: ${b35.fdcText}`);
        assert.strictEqual(b35.hVal, '300 mg/day');
        assert.strictEqual(b35.rVal, '450 mg/day');

        const b49 = runCalcAtWeight(49);
        assert.ok(b49.fdcText.includes('3 เม็ด'), `Weight 49kg (boundary) should give ≈3 tabs 4-FDC, got: ${b49.fdcText}`);

        // Test Band 50 - 69 kg -> ≈4 tabs (H300 R600 Z1500 E1000)
        const b50 = runCalcAtWeight(50);
        assert.ok(b50.fdcText.includes('4 เม็ด'), `Weight 50kg (boundary) should give ≈4 tabs 4-FDC, got: ${b50.fdcText}`);
        assert.strictEqual(b50.rVal, '600 mg/day');

        const b69 = runCalcAtWeight(69);
        assert.ok(b69.fdcText.includes('4 เม็ด'), `Weight 69kg should give ≈4 tabs 4-FDC, got: ${b69.fdcText}`);

        // Test Band >= 70 kg -> คำนวณรายบุคคล (ค่าอ้างอิง Z2000/E1200)
        const b70 = runCalcAtWeight(70);
        assert.ok(b70.fdcText.includes('70 kg'), `Weight 70kg should specify individual calculation (≥ 70 kg), got: ${b70.fdcText}`);
    });

    await t.test('Execution Test: Pediatric dispersible FDC, LFX max cap (1500mg), and TPT 3HP patient type branch', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        function runChildCalc(w, patientType = 'pediatric') {
            const dom = new JSDOM(html, { runScripts: 'dangerously' });
            const doc = dom.window.document;
            doc.getElementById('tb-weight').value = w;
            doc.getElementById('tb-patient-type').value = patientType;
            dom.window.calculateTBDoses();
            return {
                rhzVal: doc.getElementById('child-rhz-val').innerText,
                rhVal: doc.getElementById('child-rh-val').innerText,
                tpt3hp: doc.getElementById('tpt-3hp-val').innerText,
                warning: doc.getElementById('clinical-warning').innerText
            };
        }

        assert.ok(runChildCalc(5).rhzVal.includes('1 เม็ด'), 'Child 5kg should get 1 tab');
        assert.ok(runChildCalc(10).rhzVal.includes('2 เม็ด'), 'Child 10kg should get 2 tabs');
        assert.ok(runChildCalc(14).rhzVal.includes('3 เม็ด'), 'Child 14kg should get 3 tabs');
        assert.ok(runChildCalc(20).rhzVal.includes('4 เม็ด'), 'Child 20kg should get 4 tabs');

        // Test Pediatric LFX max cap = 1500 mg (CPG 2022 Table 7.1)
        const domH = new JSDOM(html, { runScripts: 'dangerously' });
        const docH = domH.window.document;
        docH.getElementById('tb-weight').value = 110;
        docH.getElementById('tb-patient-type').value = 'pediatric';
        docH.getElementById('tb-special').value = 'h-mono';
        domH.window.calculateTBDoses();
        assert.ok(docH.getElementById('clinical-warning').innerHTML.includes('1500 mg/day'), 'Pediatric LFX max cap should be 1500 mg/day');

        // Test TPT 3HP patient type branch: pediatric > 30kg gets H700/Rpt750 vs adult >= 30kg gets H900/Rpt900
        const childOver30 = runChildCalc(35, 'pediatric');
        assert.strictEqual(childOver30.tpt3hp, 'H 700 mg + Rpt 750 mg', 'Pediatric 35kg should get H 700 mg + Rpt 750 mg');

        const adultOver30 = runChildCalc(35, 'adult-standard');
        assert.strictEqual(adultOver30.tpt3hp, 'H 900 mg + Rpt 900 mg', 'Adult 35kg should get H 900 mg + Rpt 900 mg');
    });

    await t.test('Execution Test: H-monoresistance 6(H)RZELfx regimen dosage table (CPG 2022 Section 5.3)', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        function runHMonoCalc(w, patientType = 'adult-standard') {
            const dom = new JSDOM(html, { runScripts: 'dangerously' });
            const doc = dom.window.document;
            doc.getElementById('tb-weight').value = w;
            doc.getElementById('tb-patient-type').value = patientType;
            doc.getElementById('tb-special').value = 'h-mono';
            dom.window.calculateTBDoses();
            return {
                hmonoActive: doc.getElementById('result-hmono').classList.contains('active'),
                rVal: doc.getElementById('hmono-r-val').innerText,
                zVal: doc.getElementById('hmono-z-val').innerText,
                eVal: doc.getElementById('hmono-e-val').innerText,
                lfxVal: doc.getElementById('hmono-lfx-val').innerText,
                hHighVal: doc.getElementById('hmono-h-val').innerText,
                note: doc.getElementById('clinical-note-text').innerText
            };
        }

        // Test adult <50kg (45kg): Lfx 750mg
        const a45 = runHMonoCalc(45);
        assert.strictEqual(a45.hmonoActive, true, '#result-hmono should be active');
        assert.strictEqual(a45.lfxVal, '750 mg/day');
        assert.strictEqual(a45.rVal, '450 mg/day');
        assert.strictEqual(a45.zVal, '1000 mg/day');
        assert.strictEqual(a45.eVal, '800 mg/day');
        assert.strictEqual(a45.hHighVal, '400 mg/day');
        assert.ok(a45.note.includes('H-monoresistance Regimen [6(H)RZELfx x 6 เดือน]'));

        // Test adult High-dose H boundary at 29, 30, 34, 35 kg (CPG Table 6.3 30-35kg band = 400mg)
        const a29 = runHMonoCalc(29);
        assert.strictEqual(a29.hHighVal, '363 mg/day', '29kg fallback should be 363 mg/day');

        const a30 = runHMonoCalc(30);
        assert.strictEqual(a30.hHighVal, '400 mg/day', '30kg boundary should be 400 mg/day');

        const a34 = runHMonoCalc(34);
        assert.strictEqual(a34.hHighVal, '400 mg/day', '34kg boundary should be 400 mg/day');

        const a35 = runHMonoCalc(35);
        assert.strictEqual(a35.hHighVal, '400 mg/day', '35kg boundary should be 400 mg/day');

        // Test adult >=50kg (60kg): Lfx 1000mg
        const a60 = runHMonoCalc(60);
        assert.strictEqual(a60.lfxVal, '1000 mg/day');
        assert.strictEqual(a60.rVal, '600 mg/day');
        assert.strictEqual(a60.zVal, '1500 mg/day');
        assert.strictEqual(a60.eVal, '1000 mg/day');

        // Test pediatric (20kg): Lfx 300mg (15 mg/kg)
        const c20 = runHMonoCalc(20, 'pediatric');
        assert.strictEqual(c20.lfxVal, '300 mg/day');
        assert.strictEqual(c20.rVal, '300 mg/day');
    });

    await t.test('Execution Test: Multi-warning stacking and universal EMR note renal/liver alerts', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        // Test 1: H-mono + ckd-severe + abnormal liver stacking
        const dom1 = new JSDOM(html, { runScripts: 'dangerously' });
        const doc1 = dom1.window.document;
        doc1.getElementById('tb-weight').value = 50;
        doc1.getElementById('tb-special').value = 'h-mono';
        doc1.getElementById('tb-renal').value = 'ckd-severe';
        doc1.getElementById('tb-liver').value = 'abnormal';
        dom1.window.calculateTBDoses();

        const warningHTML = doc1.getElementById('clinical-warning').innerHTML;
        const noteText = doc1.getElementById('clinical-note-text').innerText;

        assert.ok(warningHTML.includes('H-monoresistance'), 'Warning box should contain H-mono callout');
        assert.ok(warningHTML.includes('ไตวายรุนแรง (CrCl &lt; 30 หรือฟอกไต)'), 'Warning box should contain updated Renal wording');
        assert.ok(warningHTML.includes('ตับอักเสบ'), 'Warning box should contain Liver callout');
        assert.ok(noteText.includes('⚠️ หมายเหตุปรับยาตามภาวะไต (CrCl < 30 หรือฟอกไต)'), 'EMR note should contain updated renal warning note');
        assert.ok(noteText.includes('⚠️ หมายเหตุภาวะตับ'), 'EMR note should contain liver warning note');

        // Test 2: MDR-longer + Amikacin checked + ckd-severe
        const dom2 = new JSDOM(html, { runScripts: 'dangerously' });
        const doc2 = dom2.window.document;
        doc2.getElementById('tb-weight').value = 50;
        doc2.getElementById('tb-special').value = 'mdr-longer';
        doc2.getElementById('tb-renal').value = 'ckd-severe';
        const amCb = doc2.querySelector('.mdr-drug[value="am"]');
        if (amCb) amCb.checked = true;
        dom2.window.calculateTBDoses();

        const warningHTML2 = doc2.getElementById('clinical-warning').innerHTML;
        const noteText2 = doc2.getElementById('clinical-note-text').innerText;

        assert.ok(warningHTML2.includes('Amikacin + ไตวายรุนแรง'), 'Warning box should contain Amikacin nephrotoxicity alert');
        assert.ok(noteText2.includes('Amikacin (Nephrotoxic)'), 'EMR note should contain Amikacin renal adjustment note');
    });

    await t.test('Execution Test: Context-aware inline table warnings & drug specificity', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        // Test 1: TPT Drug Specificity — TPT has H, so ckd-severe gives NO renal warning, but abnormal liver gives liver warning
        const domTPT = new JSDOM(html, { runScripts: 'dangerously' });
        const docTPT = domTPT.window.document;
        docTPT.getElementById('tb-weight').value = 50;
        docTPT.getElementById('tb-special').value = 'tpt';
        docTPT.getElementById('tb-renal').value = 'ckd-severe';
        docTPT.getElementById('tb-liver').value = 'abnormal';
        domTPT.window.calculateTBDoses();

        const tptWarnHTML = docTPT.getElementById('inline-warn-tpt').innerHTML;
        assert.strictEqual(tptWarnHTML.includes('ไตวายรุนแรง'), false, 'TPT inline warning should NOT contain renal alert (no Z/E/Am in TPT)');
        assert.ok(tptWarnHTML.includes('ตับอักเสบ'), 'TPT inline warning should contain liver alert for H');

        // Test 2: H-mono inline warning — shows both Z/E renal and liver alerts
        const domHMono = new JSDOM(html, { runScripts: 'dangerously' });
        const docHMono = domHMono.window.document;
        docHMono.getElementById('tb-weight').value = 50;
        docHMono.getElementById('tb-special').value = 'h-mono';
        docHMono.getElementById('tb-renal').value = 'ckd-severe';
        docHMono.getElementById('tb-liver').value = 'abnormal';
        domHMono.window.calculateTBDoses();

        const hmonoWarnHTML = docHMono.getElementById('inline-warn-hmono').innerHTML;
        assert.ok(hmonoWarnHTML.includes('Z/E ในสูตรนี้ต้องปรับเป็น 3 วัน/สัปดาห์'), 'H-mono inline warning should list Z/E renal adjustment');
        assert.ok(hmonoWarnHTML.includes('ในสูตรนี้มีผลต่อตับ'), 'H-mono inline warning should list liver risk');

        // Test 2b: Verify H-mono table dosage cells & rxNote lines display 3 วัน/สัปดาห์ when renal === ckd-severe
        const hmonoZVal = docHMono.getElementById('hmono-z-val').innerText;
        const hmonoEVal = docHMono.getElementById('hmono-e-val').innerText;
        const hmonoZWarnText = docHMono.getElementById('hmono-z-warn').innerText;
        const hmonoNote = docHMono.getElementById('clinical-note-text').innerText;

        assert.ok(hmonoZVal.includes('3 วัน/สัปดาห์'), 'H-mono Z table cell should state 3 วัน/สัปดาห์ when renal === ckd-severe');
        assert.ok(hmonoEVal.includes('3 วัน/สัปดาห์'), 'H-mono E table cell should state 3 วัน/สัปดาห์ when renal === ckd-severe');
        assert.ok(hmonoZWarnText.includes('ปรับกิน 3 วัน/สัปดาห์'), 'H-mono Z dose warn badge should display short warning');
        assert.ok(hmonoNote.includes('- PZA (1500mg) [3 วัน/สัปดาห์]:'), 'H-mono rxNote PZA line should specify [3 วัน/สัปดาห์]');
        assert.ok(hmonoNote.includes('- EMB (1000mg) [3 วัน/สัปดาห์]:'), 'H-mono rxNote EMB line should specify [3 วัน/สัปดาห์]');

        // Test 3: MDR-longer dynamic checkbox update
        const domLonger = new JSDOM(html, { runScripts: 'dangerously' });
        const docLonger = domLonger.window.document;
        docLonger.getElementById('tb-weight').value = 50;
        docLonger.getElementById('tb-special').value = 'mdr-longer';
        docLonger.getElementById('tb-renal').value = 'ckd-severe';
        domLonger.window.calculateTBDoses();

        // Check Lfx & Bdq only (no renal-adjusted drugs)
        docLonger.querySelector('.mdr-drug[value="lfx"]').checked = true;
        docLonger.querySelector('.mdr-drug[value="bdq"]').checked = true;
        domLonger.window.updateMdrLongerRegimen();

        let longerWarnHTML = docLonger.getElementById('inline-warn-mdr-longer').innerHTML;
        assert.strictEqual(longerWarnHTML.includes('ไตวายรุนแรง'), false, 'MDR-longer inline warning should be clean when no renal drugs are checked');

        // Check Amikacin dynamically
        docLonger.querySelector('.mdr-drug[value="am"]').checked = true;
        domLonger.window.updateMdrLongerRegimen();

        longerWarnHTML = docLonger.getElementById('inline-warn-mdr-longer').innerHTML;
        assert.ok(longerWarnHTML.includes('AM ในสูตรนี้ต้องปรับเป็น 3 วัน/สัปดาห์'), 'MDR-longer inline warning should dynamically include AM when checked');
    });

    await t.test('Execution Test: MDR/RR-TB Shorter Bdq Regimen weight boundaries (CPG 2022 Table 6.3)', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        function runShorterCalc(w) {
            const dom = new JSDOM(html, { runScripts: 'dangerously' });
            const doc = dom.window.document;
            doc.getElementById('tb-weight').value = w;
            doc.getElementById('tb-special').value = 'mdr-shorter';
            dom.window.calculateTBDoses();
            return {
                html: doc.getElementById('mdr-shorter-output').innerHTML,
                note: doc.getElementById('clinical-note-text').innerText
            };
        }

        // Test <30kg safeguard
        const under30 = runShorterCalc(25);
        assert.ok(under30.html.includes('น้ำหนัก &lt; 30 kg — ปรึกษาผู้เชี่ยวชาญ'));
        assert.ok(under30.note.includes('น้ำหนัก < 30 kg'));

        // Weight 35kg (band 30-35)
        const w35 = runShorterCalc(35);
        assert.ok(w35.html.includes('500 mg/day'), 'Pto at 35kg should be 500mg');
        assert.ok(w35.html.includes('1000 mg/day'), 'Z at 35kg should be 1000mg');
        assert.ok(w35.html.includes('400 mg/day high-dose'), 'H at 35kg should be 400mg');
        assert.ok(w35.html.includes('800 mg/day'), 'E at 35kg should be 800mg');

        // Weight 36kg (band 36-45)
        const w36 = runShorterCalc(36);
        assert.ok(w36.html.includes('500 mg/day'), 'Pto at 36kg should be 500mg');
        assert.ok(w36.html.includes('1000 mg/day'), 'Z at 36kg should be 1000mg');

        // Weight 55kg (band 46-55)
        const w55 = runShorterCalc(55);
        assert.ok(w55.html.includes('750 mg/day'), 'Pto at 55kg should be 750mg');
        assert.ok(w55.html.includes('1500 mg/day'), 'Z at 55kg should be 1500mg');
        assert.ok(w55.html.includes('600 mg/day high-dose'), 'H at 55kg should be 600mg');
        assert.ok(w55.html.includes('1200 mg/day'), 'E at 55kg should be 1200mg');

        // Weight 56kg (band 56-70)
        const w56 = runShorterCalc(56);
        assert.ok(w56.html.includes('750 mg/day'), 'Pto at 56kg should be 750mg');
        assert.ok(w56.html.includes('1500 mg/day'), 'Z at 56kg should be 1500mg');

        // Weight 71kg (band >70)
        const w71 = runShorterCalc(71);
        assert.ok(w71.html.includes('1000 mg/day'), 'Pto at 71kg should be 1000mg');
        assert.ok(w71.html.includes('2000 mg/day'), 'Z at 71kg should be 2000mg');
        assert.ok(w71.html.includes('1200 mg/day'), 'E at 71kg should be 1200mg');
    });

    await t.test('Execution Test: MDR/RR-TB Individualized Longer Regimen dosage table & selection validator (CPG 2022 Tables 6.4-6.6)', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');

        function runLongerCalc(w, checkedDrugs = []) {
            const dom = new JSDOM(html, { runScripts: 'dangerously' });
            const doc = dom.window.document;
            doc.getElementById('tb-weight').value = w;
            doc.getElementById('tb-special').value = 'mdr-longer';
            
            checkedDrugs.forEach(val => {
                const cb = doc.querySelector(`.mdr-drug[value="${val}"]`);
                if (cb) cb.checked = true;
            });

            dom.window.calculateTBDoses();
            return {
                status: doc.getElementById('mdr-rule-status').innerText,
                doseHtml: doc.getElementById('mdr-dose-output').innerHTML,
                note: doc.getElementById('clinical-note-text').innerText
            };
        }

        // Test Selection Rules
        // 4 drugs from A+B -> ครบเกณฑ์ ไม่ต้องใช้ C
        const rule4AB = runLongerCalc(40, ['lfx', 'bdq', 'lzd', 'cfz']);
        assert.ok(rule4AB.status.includes('ครบเกณฑ์ ไม่ต้องใช้ C'), '4 A+B drugs should satisfy rule without C');

        // 3 drugs from A+B + 0 from C -> ⚠️ A+B=3 ต้องเพิ่ม Group C
        const rule3AB = runLongerCalc(40, ['lfx', 'bdq', 'lzd']);
        assert.ok(rule3AB.status.includes('ต้องเพิ่ม Group C'), '3 A+B with 0 C should warn to add Group C');

        // 3 drugs from A+B + 1 from C -> ✅ ครบเกณฑ์
        const rule3AB1C = runLongerCalc(40, ['lfx', 'bdq', 'lzd', 'e']);
        assert.ok(rule3AB1C.status.includes('ครบเกณฑ์'), '3 A+B with 1 C should satisfy rule');

        // 2 drugs from A+B + 2 from C -> ⚠️ A+B=2 ต้องเพิ่ม Group C อย่างน้อย 3 ตัว
        const rule2AB2C = runLongerCalc(40, ['lfx', 'bdq', 'e', 'z']);
        assert.ok(rule2AB2C.status.includes('ต้องเพิ่ม Group C อย่างน้อย 3 ตัว'), '2 A+B with 2 C should warn to add at least 3 C drugs');

        // 2 drugs from A+B + 3 from C -> ✅ ครบเกณฑ์
        const rule2AB3C = runLongerCalc(40, ['lfx', 'bdq', 'e', 'z', 'eto']);
        assert.ok(rule2AB3C.status.includes('ครบเกณฑ์'), '2 A+B with 3 C should satisfy rule');

        // Test Weight-based Dosing Table Output for 35, 45, 55, 70, 71 kg
        const allDrugs = ['lfx', 'mfx', 'bdq', 'lzd', 'cfz', 'cs', 'e', 'dlm', 'z', 'am', 'eto', 'pas', 'ipm'];

        // 35 kg (band 30-35)
        const d35 = runLongerCalc(35, allDrugs);
        assert.ok(d35.doseHtml.includes('3 เม็ด (250mg)'), 'Lfx at 35kg should be 3 tabs');
        assert.ok(d35.doseHtml.includes('2 แคปซูล (250mg)'), 'Cs at 35kg should be 2 caps');
        assert.ok(d35.doseHtml.includes('2.5mL'), 'Am at 35kg should be 2.5mL');
        assert.ok(d35.doseHtml.includes('2 เม็ด (250mg)'), 'Eto at 35kg should be 2 tabs');

        // 45 kg (band 36-45)
        const d45 = runLongerCalc(45, allDrugs);
        assert.ok(d45.doseHtml.includes('3 เม็ด (250mg)'), 'Lfx at 45kg should be 3 tabs');
        assert.ok(d45.doseHtml.includes('3mL'), 'Am at 45kg should be 3mL');

        // 55 kg (band 46-55)
        const d55 = runLongerCalc(55, allDrugs);
        assert.ok(d55.doseHtml.includes('4 เม็ด (250mg)'), 'Lfx at 55kg should be 4 tabs');
        assert.ok(d55.doseHtml.includes('1 เม็ด (600mg)'), 'Lzd at 55kg should be 1 tab');
        assert.ok(d55.doseHtml.includes('3 แคปซูล (250mg)'), 'Cs at 55kg should be 3 caps');

        // 70 kg (band 56-70)
        const d70 = runLongerCalc(70, allDrugs);
        assert.ok(d70.doseHtml.includes('4 เม็ด (250mg)'), 'Lfx at 70kg should be 4 tabs');
        assert.ok(d70.doseHtml.includes('4mL'), 'Am at 70kg should be 4mL');

        // 71 kg (band >70)
        const d71 = runLongerCalc(71, allDrugs);
        assert.ok(d71.doseHtml.includes('4 เม็ด (500mg)'), 'PZA at 71kg should be 4 tabs');
        assert.ok(d71.doseHtml.includes('4 เม็ด (250mg)'), 'Eto at 71kg should be 4 tabs');
    });

    await t.test('DOM ID integrity cross-check', () => {
        const html = fs.readFileSync(TB_CALC_PATH, 'utf8');
        const usedMatches = [...html.matchAll(/getElementById\(['"]([\w-]+)['"]\)/g)].map(m => m[1]);
        const definedMatches = [...html.matchAll(/id=["']([\w-]+)["']/g)].map(m => m[1]);

        const usedSet = new Set(usedMatches);
        const definedSet = new Set(definedMatches);

        const missing = [...usedSet].filter(id => !definedSet.has(id));
        assert.deepStrictEqual(missing, [], `DOM IDs used in JS must exist in HTML, missing: ${missing.join(', ')}`);
    });

    await t.test('index.html links to tools/tb-calculator.html as prototype item T6', () => {
        const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
        assert.ok(html.includes('href="tools/tb-calculator.html"'), 'index.html should link to tools/tb-calculator.html');
        assert.ok(html.includes('T6'), 'index.html should label TB calculator as T6');
        assert.ok(html.includes('TB Weight-Based Dosing Calculator'), 'index.html should display title');
    });

    await t.test('service-worker.js includes ./tools/tb-calculator.html in ASSETS array and uses v47', () => {
        const sw = fs.readFileSync(path.join(__dirname, '../service-worker.js'), 'utf8');
        assert.ok(sw.includes("'er-hub-v47'"), 'CACHE_VERSION should be er-hub-v47');
        assert.ok(sw.includes("'./tools/tb-calculator.html'"), 'tb-calculator.html should be cached');
    });

    await t.test('index.html version string matches service-worker.js v47', () => {
        const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
        assert.ok(html.includes('v47'), 'index.html top nav should state v47');
    });

    await t.test('ARCHITECTURE.md documents tools/tb-calculator.html', () => {
        const arch = fs.readFileSync(path.join(ROOT_DIR, 'ARCHITECTURE.md'), 'utf8');
        assert.ok(arch.includes('tools/tb-calculator.html'), 'ARCHITECTURE.md should document tools/tb-calculator.html');
    });

});
