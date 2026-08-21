const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const BurnEngine = require('../shared/burn-engine.js');

function loadBurnManagerDom() {
    const htmlPath = path.join(__dirname, '..', 'tools', 'burn-manager.html');
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

    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return dom.window;
}

describe('Burn Management Clinical Engine (shared/burn-engine.js)', () => {

    describe('1. Lund & Browder 6-Age-Column Sum-to-100% Invariant', () => {
        const columns = ['0', '1', '5', '10', '15', 'adult'];

        for (const col of columns) {
            it(`Column '${col}' must strictly sum to exactly 100.0% across all 32 anatomic regions`, () => {
                let total = 0;
                for (const [region, weights] of Object.entries(BurnEngine.LUND_BROWDER_TABLE)) {
                    assert.ok(typeof weights[col] === 'number', `Region ${region} missing weight for col ${col}`);
                    total += weights[col];
                }
                assert.equal(Number(total.toFixed(4)), 100.0, `Column ${col} sum is ${total} instead of 100.0%`);
            });
        }

        it('Validates individual expected anatomical region percentages by age', () => {
            // Head decreases with age: 19% -> 17% -> 13% -> 11% -> 9% -> 7%
            assert.equal(BurnEngine.LUND_BROWDER_TABLE.head_ant['0'] + BurnEngine.LUND_BROWDER_TABLE.head_post['0'], 19.0);
            assert.equal(BurnEngine.LUND_BROWDER_TABLE.head_ant['1'] + BurnEngine.LUND_BROWDER_TABLE.head_post['1'], 17.0);
            assert.equal(BurnEngine.LUND_BROWDER_TABLE.head_ant['5'] + BurnEngine.LUND_BROWDER_TABLE.head_post['5'], 13.0);
            assert.equal(BurnEngine.LUND_BROWDER_TABLE.head_ant['10'] + BurnEngine.LUND_BROWDER_TABLE.head_post['10'], 11.0);
            assert.equal(BurnEngine.LUND_BROWDER_TABLE.head_ant['15'] + BurnEngine.LUND_BROWDER_TABLE.head_post['15'], 9.0);
            assert.equal(BurnEngine.LUND_BROWDER_TABLE.head_ant['adult'] + BurnEngine.LUND_BROWDER_TABLE.head_post['adult'], 7.0);

            // Thighs increase with age: 11% -> 13% -> 16% -> 17% -> 18% -> 19%
            assert.equal(
                BurnEngine.LUND_BROWDER_TABLE.thigh_r_ant['10'] +
                BurnEngine.LUND_BROWDER_TABLE.thigh_r_post['10'] +
                BurnEngine.LUND_BROWDER_TABLE.thigh_l_ant['10'] +
                BurnEngine.LUND_BROWDER_TABLE.thigh_l_post['10'],
                17.0 // 8.5% each thigh
            );
        });
    });

    describe('2. Age Column Boundary Mapping Tests', () => {
        it('maps age to correct 6 Lund-Browder columns', () => {
            // Col 0: < 1.0 year
            assert.equal(BurnEngine.getLundBrowderAgeColumn(0), '0');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(0.5), '0');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(0.99), '0');

            // Col 1: 1.0 to 4.99 years
            assert.equal(BurnEngine.getLundBrowderAgeColumn(1.0), '1');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(3.0), '1');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(4.99), '1');

            // Col 5: 5.0 to 9.99 years
            assert.equal(BurnEngine.getLundBrowderAgeColumn(5.0), '5');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(7.5), '5');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(9.99), '5');

            // Col 10: 10.0 to 14.99 years
            assert.equal(BurnEngine.getLundBrowderAgeColumn(10.0), '10');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(12.5), '10');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(14.99), '10');

            // Col 15: 15.0 to 17.99 years
            assert.equal(BurnEngine.getLundBrowderAgeColumn(15.0), '15');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(16.0), '15');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(17.99), '15');

            // Col adult: >= 18.0 years
            assert.equal(BurnEngine.getLundBrowderAgeColumn(18.0), 'adult');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(45.0), 'adult');
            assert.equal(BurnEngine.getLundBrowderAgeColumn(80.0), 'adult');
        });
    });

    describe('3. calculateTBSA() & 1st Degree Burn Exclusion', () => {
        it('calculates full adult anterior trunk + head partial thickness burn', () => {
            const res = BurnEngine.calculateTBSA(30, {
                trunk_ant: { degree: 2, fraction: 1.0 }, // 13%
                head_ant: { degree: 3, fraction: 1.0 }    // 3.5%
            });
            assert.equal(res.tbsaResuscitative, 16.5);
            assert.equal(res.tbsaTotal, 16.5);
            assert.equal(res.deg2Pct, 13.0);
            assert.equal(res.deg3Pct, 3.5);
            assert.equal(res.deg1Pct, 0);
        });

        it('strictly excludes 1st degree (superficial erythema) from tbsaResuscitative', () => {
            const res = BurnEngine.calculateTBSA(25, {
                trunk_ant: { degree: 1, fraction: 1.0 }, // 13% (1st deg)
                trunk_post: { degree: 2, fraction: 1.0 }  // 13% (2nd deg)
            });
            assert.equal(res.tbsaTotal, 26.0);
            assert.equal(res.tbsaResuscitative, 13.0); // Only 2nd degree counted
            assert.equal(res.deg1Pct, 13.0);
            assert.equal(res.deg2Pct, 13.0);
        });

        it('applies infant age-adjusted head size in calculation', () => {
            const infantRes = BurnEngine.calculateTBSA(0.5, {
                head_ant: 2,
                head_post: 2
            });
            assert.equal(infantRes.tbsaResuscitative, 19.0); // 9.5 + 9.5

            const adultRes = BurnEngine.calculateTBSA(35, {
                head_ant: 2,
                head_post: 2
            });
            assert.equal(adultRes.tbsaResuscitative, 7.0); // 3.5 + 3.5
        });
    });

    describe('4. Fluid Resuscitation Rules (ATLS 11th Table 9-1 & Parkland)', () => {
        it('Adult 70kg with 40% TBSA thermal burn: Parkland (4 mL) & Modified Brooke (2 mL)', () => {
            const fluid = BurnEngine.calculateFluidRequirements({
                weightKg: 70,
                tbsaPct: 40,
                ageYears: 35,
                isElectrical: false
            });

            assert.equal(fluid.isValid, true);
            assert.equal(fluid.guidelineCoefficient, 2); // >= 13 years old
            assert.equal(fluid.modifiedBrookeTotalMl, 5600); // 2 * 70 * 40
            assert.equal(fluid.parklandTotalMl, 11200);      // 4 * 70 * 40
            assert.equal(fluid.secondarySurveyRateMlHr, 350); // 5600 / 16
            assert.equal(fluid.first8hTargetMl, 2800);       // 5600 / 2
            assert.equal(fluid.first8hHourlyRate, 350);       // 2800 / 8
            assert.equal(fluid.next16hHourlyRate, 175);       // 2800 / 16
            assert.equal(fluid.requiresMaintenanceDextrose, false); // >30kg and >=13y
        });

        it('Pediatric Age boundary < 13y: age 12.99y (3 mL) vs age 13.0y (2 mL)', () => {
            const peds = BurnEngine.calculateFluidRequirements({
                weightKg: 40,
                tbsaPct: 20,
                ageYears: 12.99,
                isElectrical: false
            });
            assert.equal(peds.guidelineCoefficient, 3);
            assert.equal(peds.modifiedBrookeTotalMl, 3 * 40 * 20); // 2400 mL

            const adult = BurnEngine.calculateFluidRequirements({
                weightKg: 40,
                tbsaPct: 20,
                ageYears: 13.0,
                isElectrical: false
            });
            assert.equal(adult.guidelineCoefficient, 2);
            assert.equal(adult.modifiedBrookeTotalMl, 2 * 40 * 20); // 1600 mL
        });

        it('Maintenance D5LR Weight Boundary: <= 30 kg vs > 30 kg', () => {
            const child30kg = BurnEngine.calculateFluidRequirements({
                weightKg: 30.0,
                tbsaPct: 25,
                ageYears: 8
            });
            assert.equal(child30kg.requiresMaintenanceDextrose, true);
            assert.equal(child30kg.pediatricMaintenance.isIndicated, true);
            // 4-2-1 rule for 30kg: (10*4) + (10*2) + (10*1) = 40 + 20 + 10 = 70 mL/hr
            assert.equal(child30kg.pediatricMaintenance.hourlyRateMlHr, 70);

            const child31kg = BurnEngine.calculateFluidRequirements({
                weightKg: 30.1,
                tbsaPct: 25,
                ageYears: 14 // older child
            });
            assert.equal(child31kg.requiresMaintenanceDextrose, false);
            assert.equal(child31kg.pediatricMaintenance.isIndicated, false);
        });

        it('Electrical Injury uses 4 mL/kg/%TBSA for all ages', () => {
            const elec = BurnEngine.calculateFluidRequirements({
                weightKg: 80,
                tbsaPct: 30,
                ageYears: 40,
                isElectrical: true
            });
            assert.equal(elec.guidelineCoefficient, 4);
            assert.equal(elec.modifiedBrookeTotalMl, 4 * 80 * 30); // 9600 mL
        });

        it('Time Elapsed Adjustment: patient arrives 3 hours post-burn with 500 mL prehospital fluid given', () => {
            const fluid = BurnEngine.calculateFluidRequirements({
                weightKg: 70,
                tbsaPct: 40,
                ageYears: 30,
                hoursElapsed: 3,
                prehospitalFluidGivenMl: 500
            });
            // Total 24h = 5600 mL. 1st 8h Target = 2800 mL.
            // Remaining 1st 8h = 2800 - 500 = 2300 mL.
            // Hours remaining in 1st 8h = 8 - 3 = 5 hours.
            // Rate for remaining 5 hours = 2300 / 5 = 460 mL/hr.
            assert.equal(fluid.first8hRemainingMl, 2300);
            assert.equal(fluid.first8hHourlyRate, 460);
        });
    });

    describe('5. Urine Output (UO) Target & Shock Titration', () => {
        it('Adult standard target: 0.5–1.0 mL/kg/hr (min 30, max 50+ mL/hr)', () => {
            const uo70kg = BurnEngine.getTargetUrineOutput(70, 30, false, false);
            assert.equal(uo70kg.targetMlHrMin, 35);  // max(30, 70*0.5) = 35
            assert.equal(uo70kg.targetMlHrMax, 70);  // max(50, 70*1.0) = 70
            assert.equal(uo70kg.targetMlKgHr, '0.5');
        });

        it('Pediatric target: 1.0 mL/kg/hr', () => {
            const uoChild = BurnEngine.getTargetUrineOutput(20, 5, false, false);
            assert.equal(uoChild.targetMlHrMin, 20);
            assert.equal(uoChild.targetMlHrMax, 20);
            assert.equal(uoChild.targetMlKgHr, '1.0');
        });

        it('Electrical Burn Pigmented Urine Target: 100 mL/hr in adults and 1.0–2.0 mL/kg/hr in children', () => {
            const adultElec = BurnEngine.getTargetUrineOutput(80, 35, true, true);
            assert.equal(adultElec.targetMlHrMin, 100);
            assert.equal(adultElec.targetMlHrMax, 100);

            const childElec = BurnEngine.getTargetUrineOutput(25, 7, true, true);
            assert.equal(childElec.targetMlHrMin, 25);
            assert.equal(childElec.targetMlHrMax, 50);
            assert.equal(childElec.targetMlKgHr, '1.0–2.0');
        });

        it('UO Titration: Under-resuscitation raises rate by 10-30%', () => {
            const target = BurnEngine.getTargetUrineOutput(70, 30, false, false); // 35-50 mL/hr
            const titration = BurnEngine.getUrineOutputTitration(400, 20, target, false, 70); // UO is 20 mL/hr (<35)
            assert.equal(titration.status, 'UNDER_RESUSCITATION');
            assert.equal(titration.adjustedRateMin, 440); // 400 * 1.10
            assert.equal(titration.adjustedRateMax, 520); // 400 * 1.30
        });

        it('UO Titration: Hypotension / Shock triggers warm crystalloid bolus (10-20 mL/kg)', () => {
            const target = BurnEngine.getTargetUrineOutput(70, 30, false, false);
            const titration = BurnEngine.getUrineOutputTitration(400, 25, target, true, 70);
            assert.equal(titration.status, 'SHOCK_HYPOTENSION');
            assert.equal(titration.action, 'FLUID_BOLUS_AND_INCREASE');
            assert.equal(titration.bolusTotalMl, 1400); // 20 mL/kg default
            assert.equal(titration.bolusRangeMinMl, 700);
            assert.equal(titration.bolusRangeMaxMl, 1400);
            assert.ok(titration.bolusAdvice.includes('1400 mL (20 mL/kg)'));
        });
    });

    describe('6. Cyanide Antidote (Hydroxocobalamin) Dosing & Cap Boundaries', () => {
        it('Weight 10 kg (pediatric): 70 mg/kg = 700 mg (no cap)', () => {
            const dose = BurnEngine.getCyanideAntidoteDosing(10);
            assert.equal(dose.hydroxocobalaminMg, 700);
            assert.equal(dose.hydroxocobalaminG, 0.7);
            assert.equal(dose.isCapped, false);
        });

        it('Weight 50 kg: 70 mg/kg = 3500 mg (no cap)', () => {
            const dose = BurnEngine.getCyanideAntidoteDosing(50);
            assert.equal(dose.hydroxocobalaminMg, 3500);
            assert.equal(dose.hydroxocobalaminG, 3.5);
            assert.equal(dose.isCapped, false);
        });

        it('Weight 70 kg: 70 mg/kg * 70 kg = 4900 mg (strictly NO cap, <5000mg)', () => {
            const dose = BurnEngine.getCyanideAntidoteDosing(70);
            assert.equal(dose.hydroxocobalaminMg, 4900);
            assert.equal(dose.hydroxocobalaminG, 4.9);
            assert.equal(dose.isCapped, false);
        });

        it('Weight 71 kg: 70 mg/kg * 71 kg = 4970 mg (strictly NO cap, <5000mg)', () => {
            const dose = BurnEngine.getCyanideAntidoteDosing(71);
            assert.equal(dose.hydroxocobalaminMg, 4970);
            assert.equal(dose.hydroxocobalaminG, 4.97);
            assert.equal(dose.isCapped, false);
        });

        it('Weight 72 kg: 70 mg/kg * 72 kg = 5040 mg -> CAPPED at 5000 mg (5.0 g)', () => {
            const dose = BurnEngine.getCyanideAntidoteDosing(72);
            assert.equal(dose.hydroxocobalaminMg, 5000);
            assert.equal(dose.hydroxocobalaminG, 5.0);
            assert.equal(dose.isCapped, true);
        });

        it('Weight 100 kg (adult standard): Capped at 5000 mg (5.0 g)', () => {
            const dose = BurnEngine.getCyanideAntidoteDosing(100);
            assert.equal(dose.hydroxocobalaminMg, 5000);
            assert.equal(dose.hydroxocobalaminG, 5.0);
            assert.equal(dose.isCapped, true);
        });
    });

    describe('7. Carbon Monoxide (CO) Assessment & HBO Thresholds', () => {
        it('Non-pregnant adult with COHb 26% meets HBO criteria (>25%)', () => {
            const co = BurnEngine.getCOAssessment(26, false, {});
            assert.equal(co.meetsHboCriteria, true);
            assert.equal(co.hboThresholdCOHb, 25);
        });

        it('Pregnant patient with COHb 16% meets HBO criteria (>15% in pregnancy)', () => {
            const co = BurnEngine.getCOAssessment(16, true, {});
            assert.equal(co.meetsHboCriteria, true);
            assert.equal(co.hboThresholdCOHb, 15);
        });

        it('Patient with COHb 12% but syncope/coma meets HBO criteria', () => {
            const co = BurnEngine.getCOAssessment(12, false, { syncopeOrComa: true });
            assert.equal(co.meetsHboCriteria, true);
        });
    });

    describe('8. Inhalation Risk Stratification & Airway Triage', () => {
        it('Stridor triggers immediate intubation recommendation', () => {
            const res = BurnEngine.evaluateInhalationRisk({
                stridor: true,
                enclosedSpace: true
            });
            assert.equal(res.recommendation, 'IMMEDIATE_INTUBATION');
            assert.equal(res.urgency, 'HIGH_PRIORITY_DEFINITIVE_AIRWAY');
        });

        it('Closed space + soot without airway obstruction triggers close serial monitoring', () => {
            const res = BurnEngine.evaluateInhalationRisk({
                enclosedSpace: true,
                sootInMouthOrNose: true
            });
            assert.equal(res.recommendation, 'CLOSE_SERIAL_MONITORING_OR_EARLY_INTUBATION');
        });
    });

    describe('9. ABA 2023 Referral Criteria', () => {
        it('Contains 10 verified ABA referral criteria items', () => {
            assert.equal(BurnEngine.ABA_REFERRAL_CRITERIA.length, 10);
            assert.ok(BurnEngine.ABA_REFERRAL_CRITERIA.some(c => c.id === 'aba_tbsa10'));
            assert.ok(BurnEngine.ABA_REFERRAL_CRITERIA.some(c => c.id === 'aba_inhalation'));
            assert.ok(BurnEngine.ABA_REFERRAL_CRITERIA.some(c => c.id === 'aba_electrical'));
        });
    });

    describe('10. DOM Integration Test: tools/burn-manager.html', () => {
        it('Loads DOM, SVG body parts, and elements without throwing', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;
            assert.ok(doc.getElementById('svg-anterior'));
            assert.ok(doc.getElementById('svg-posterior'));
            assert.ok(doc.getElementById('part-chest_ant'));
            assert.ok(doc.getElementById('part-abdomen_ant'));
            assert.ok(doc.getElementById('part-back_upper_post'));
            assert.ok(doc.getElementById('part-back_lower_post'));
            assert.ok(doc.getElementById('input-direct-tbsa'));
            assert.ok(doc.getElementById('val-resuscitative-tbsa'));
            assert.ok(doc.getElementById('val-first8h-rate'));
            assert.ok(doc.querySelector('.top-nav'), 'Top nav element must be present in DOM');
            assert.ok(doc.querySelector('.nav-home'), 'Nav home link must be present');
        });

        it('Interactively painting chest and abdomen updates %TBSA and fluid rates in real time', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            // Default adult 70kg, unburned
            assert.equal(doc.getElementById('val-resuscitative-tbsa').textContent, '0.0');
            assert.equal(doc.getElementById('val-first8h-rate').textContent, '0 mL/hr');

            // Click chest_ant with active degree 2 (6.5% in adult)
            const chest = doc.getElementById('part-chest_ant');
            chest.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));

            assert.equal(doc.getElementById('val-resuscitative-tbsa').textContent, '6.5');

            // Click abdomen_ant with active degree 2 (+6.5% = 13.0% in adult)
            const abdomen = doc.getElementById('part-abdomen_ant');
            abdomen.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));

            // 13% of 70kg at 2 mL/kg/% = 2 * 70 * 13 = 1820 mL in 24h
            // 1st 8h target = 910 mL. With 1h elapsed (7h remaining) = 910 / 7 = 130 mL/hr
            assert.equal(doc.getElementById('val-resuscitative-tbsa').textContent, '13.0');
            assert.equal(doc.getElementById('val-total-24h').textContent, '1,820 mL');
            assert.equal(doc.getElementById('val-first8h-rate').textContent, '130 mL/hr');
            assert.equal(doc.getElementById('val-parkland-total').textContent, '3,640 mL');
            assert.equal(doc.getElementById('val-parkland-first8h-rate').textContent, '260 mL/hr');
        });

        it('Direct % TBSA input immediately drives fluid calculations without painting', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            const inputDirect = doc.getElementById('input-direct-tbsa');
            inputDirect.value = '25';
            inputDirect.dispatchEvent(new win.Event('input', { bubbles: true }));

            // 25% of 70kg at 2 mL/kg/% = 2 * 70 * 25 = 3500 mL in 24h
            // 1st 8h target = 1750 mL. With 1h elapsed (7h remaining) = 1750 / 7 = 250 mL/hr
            assert.equal(doc.getElementById('val-resuscitative-tbsa').textContent, '25.0');
            assert.equal(doc.getElementById('val-total-24h').textContent, '3,500 mL');
            assert.equal(doc.getElementById('val-first8h-rate').textContent, '250 mL/hr');
            assert.equal(doc.getElementById('val-parkland-total').textContent, '7,000 mL');
            assert.equal(doc.getElementById('val-parkland-first8h-rate').textContent, '500 mL/hr');
        });

        it('1st Degree burn painting is tracked visually but excluded from resuscitative TBSA', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            // Select 1st degree button
            const deg1Btn = doc.querySelector('.degree-btn[data-degree="1"]');
            deg1Btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));

            // Click chest
            const chest = doc.getElementById('part-chest_ant');
            chest.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));

            // 1st degree is 6.5%, but resuscitative TBSA must be 0.0%
            assert.equal(doc.getElementById('val-resuscitative-tbsa').textContent, '0.0');
            assert.equal(doc.getElementById('val-deg1-badge').textContent, '1st Deg (Excl): 6.5%');
            assert.equal(doc.getElementById('val-total-24h').textContent, '0 mL');
        });

        it('Inhalation checklist stridor click triggers immediate intubation alert in DOM', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            const stridorChk = doc.getElementById('chk-stridor');
            stridorChk.checked = true;
            stridorChk.dispatchEvent(new win.Event('change', { bubbles: true }));

            const alertTitle = doc.getElementById('inhal-triage-title');
            assert.ok(alertTitle.textContent.includes('Immediate Intubation Indicated'));
        });

        it('Hoarseness checkbox is present and wired into inhalation checklist', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;
            const hoarsenessChk = doc.getElementById('chk-hoarseness');
            assert.ok(hoarsenessChk, 'chk-hoarseness checkbox must exist in DOM');
            const carbonChk = doc.getElementById('chk-carbonaceous');
            assert.ok(carbonChk, 'chk-carbonaceous checkbox must exist in DOM');
        });

        it('Prehospital Initial Rate displays 500 mL/hr for adult and 125 mL/hr for young child', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;
            assert.equal(doc.getElementById('val-prehospital-rate').textContent, '500 mL/hr');

            const inputAge = doc.getElementById('input-age');
            inputAge.value = '3';
            inputAge.dispatchEvent(new win.Event('input', { bubbles: true }));
            assert.equal(doc.getElementById('val-prehospital-rate').textContent, '125 mL/hr');
        });

        it('Dynamic ABA Referral Criteria renders all 10 items from engine array and auto-flags on criteria met', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;
            const abaItems = doc.querySelectorAll('.aba-chk');
            assert.equal(abaItems.length, 10, 'Must dynamically render exactly 10 ABA criteria');

            // Default adult 70kg unburned has 0 criteria
            assert.equal(doc.getElementById('aba-referral-badge').textContent, '0/10 ข้อ');

            // Direct entry 25% TBSA -> triggers aba_tbsa10
            const inputDirect = doc.getElementById('input-direct-tbsa');
            inputDirect.value = '25';
            inputDirect.dispatchEvent(new win.Event('input', { bubbles: true }));

            assert.equal(doc.getElementById('aba_tbsa10').checked, true);
            assert.ok(doc.getElementById('aba-referral-banner').textContent.includes('เข้าเกณฑ์ส่งต่อศูนย์รักษาแผลไหม้'));
        });

        it('Toxicology renders Sodium Thiosulfate alternative and HBO criteria evaluation', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            // 70kg adult cyanide dose
            assert.ok(doc.getElementById('val-cyanide-dose').textContent.includes('4.9 g IV'));
            assert.equal(doc.getElementById('val-thiosulfate-dose').textContent, '12.5 g (50 mL 25%)');

            // COHb 30% triggers HBO alert
            const inputCohb = doc.getElementById('input-cohb');
            inputCohb.value = '30';
            inputCohb.dispatchEvent(new win.Event('input', { bubbles: true }));

            assert.equal(doc.getElementById('co-severity-badge').textContent, 'Mod-Severe (30–40%)');
            assert.equal(doc.getElementById('chk-hbo-cohb').checked, true);
            assert.ok(doc.getElementById('co-assessment-result').textContent.includes('เข้าเกณฑ์ส่งพิจารณา Hyperbaric Oxygen'));
        });
    });

    describe('11. UO Target Scaling for Large Patients (BUG-1 Regression)', () => {
        it('120kg adult: targetMax (120) must be greater than targetMin (60)', () => {
            const uo = BurnEngine.getTargetUrineOutput(120, 35, false, false);
            assert.equal(uo.targetMlHrMin, 60);   // max(30, 120*0.5) = 60
            assert.equal(uo.targetMlHrMax, 120);   // max(50, 120*1.0) = 120
            assert.ok(uo.targetMlHrMax > uo.targetMlHrMin, 'targetMax must exceed targetMin for large patients');
        });

        it('40kg adult: targetMin = 30 (floor), targetMax = 50 (floor)', () => {
            const uo = BurnEngine.getTargetUrineOutput(40, 25, false, false);
            assert.equal(uo.targetMlHrMin, 30);    // max(30, 40*0.5=20) = 30
            assert.equal(uo.targetMlHrMax, 50);    // max(50, 40*1.0=40) = 50
        });
    });

    describe('12. Over-Resuscitation Titration Path', () => {
        it('UO far above target triggers OVER_RESUSCITATION and rate decrease', () => {
            const target = BurnEngine.getTargetUrineOutput(70, 30, false, false); // min=35, max=70
            // Over-resuscitation triggers when uo > maxTarget * 1.3 = 70 * 1.3 = 91
            const titration = BurnEngine.getUrineOutputTitration(400, 100, target, false, 70);
            assert.equal(titration.status, 'OVER_RESUSCITATION');
            assert.equal(titration.action, 'DECREASE_RATE');
            assert.equal(titration.adjustedRateMin, 280);  // 400 * 0.70
            assert.equal(titration.adjustedRateMax, 360);  // 400 * 0.90
            assert.equal(titration.suggestedRate, 320);     // 400 * 0.80
        });

        it('UO within target range maintains rate', () => {
            const target = BurnEngine.getTargetUrineOutput(70, 30, false, false);
            const titration = BurnEngine.getUrineOutputTitration(350, 50, target, false, 70);
            assert.equal(titration.status, 'ON_TARGET');
            assert.equal(titration.action, 'MAINTAIN_RATE');
            assert.equal(titration.suggestedRate, 350);
        });
    });

    describe('13. Cyanide Dosing Invalid Weight Guard (BUG-4 Regression)', () => {
        it('Weight 0 returns isValid=false with all doses zeroed', () => {
            const dose = BurnEngine.getCyanideAntidoteDosing(0);
            assert.equal(dose.isValid, false);
            assert.equal(dose.hydroxocobalaminMg, 0);
            assert.equal(dose.hydroxocobalaminG, 0);
            assert.equal(dose.sodiumThiosulfateMg, 0);
        });

        it('Negative weight returns isValid=false with all doses zeroed', () => {
            const dose = BurnEngine.getCyanideAntidoteDosing(-5);
            assert.equal(dose.isValid, false);
            assert.equal(dose.hydroxocobalaminMg, 0);
        });

        it('NaN weight returns isValid=false', () => {
            const dose = BurnEngine.getCyanideAntidoteDosing(NaN);
            assert.equal(dose.isValid, false);
            assert.equal(dose.hydroxocobalaminMg, 0);
        });
    });

    describe('14. Parkland Schedule with Prehospital Fluid Offset', () => {
        it('Parkland first 8h rate accounts for prehospital fluid given', () => {
            const fluid = BurnEngine.calculateFluidRequirements({
                weightKg: 70,
                tbsaPct: 40,
                ageYears: 30,
                hoursElapsed: 2,
                prehospitalFluidGivenMl: 1000
            });
            // Parkland total = 4 * 70 * 40 = 11200 mL
            assert.equal(fluid.parklandTotalMl, 11200);
            // Parkland 1st 8h target = 5600 mL
            assert.equal(fluid.parklandFirst8hTargetMl, 5600);
            // Remaining = 5600 - 1000 = 4600 mL in 6 hours
            assert.equal(fluid.parklandFirst8hRemainingMl, 4600);
            assert.equal(fluid.parklandFirst8hHourlyRate, 767); // 4600 / 6 = 766.67 → 767
        });
    });

    describe('15. 100% TBSA Cap Boundary', () => {
        it('All 32 regions at degree 3 caps tbsaResuscitative at 100%', () => {
            const allBurned = {};
            for (const region of Object.keys(BurnEngine.LUND_BROWDER_TABLE)) {
                allBurned[region] = 3;
            }
            const res = BurnEngine.calculateTBSA(25, allBurned);
            assert.equal(res.tbsaResuscitative, 100);
            assert.equal(res.tbsaTotal, 100);
        });
    });

    describe('16. Shock / Hypotension Titration with Customizable Bolus (10–20 mL/kg)', () => {
        it('70kg adult in shock at 20 mL/kg yields 1,400 mL bolus and +25% suggested rate', () => {
            const target = BurnEngine.getTargetUrineOutput(70, 30, false, false);
            const titration = BurnEngine.getUrineOutputTitration(400, 10, target, true, 70, 20);
            assert.equal(titration.status, 'SHOCK_HYPOTENSION');
            assert.equal(titration.bolusMlKg, 20);
            assert.equal(titration.bolusTotalMl, 1400);
            assert.equal(titration.suggestedRate, 500); // 400 * 1.25
            assert.ok(titration.bolusAdvice.includes('1400 mL (20 mL/kg)'));
        });

        it('70kg adult in shock at 10 mL/kg yields 700 mL bolus', () => {
            const target = BurnEngine.getTargetUrineOutput(70, 30, false, false);
            const titration = BurnEngine.getUrineOutputTitration(400, 10, target, true, 70, 10);
            assert.equal(titration.bolusMlKg, 10);
            assert.equal(titration.bolusTotalMl, 700);
            assert.ok(titration.bolusAdvice.includes('700 mL (10 mL/kg)'));
        });

        it('70kg adult in shock at 15 mL/kg yields 1,050 mL bolus', () => {
            const target = BurnEngine.getTargetUrineOutput(70, 30, false, false);
            const titration = BurnEngine.getUrineOutputTitration(400, 10, target, true, 70, 15);
            assert.equal(titration.bolusMlKg, 15);
            assert.equal(titration.bolusTotalMl, 1050);
            assert.ok(titration.bolusAdvice.includes('1050 mL (15 mL/kg)'));
        });

        it('Bolus clamping guards against values below 10 or above 20 mL/kg', () => {
            const target = BurnEngine.getTargetUrineOutput(70, 30, false, false);
            const under = BurnEngine.getUrineOutputTitration(400, 10, target, true, 70, 5);
            assert.equal(under.bolusMlKg, 10, 'Clamps minimum to 10 mL/kg');
            const over = BurnEngine.getUrineOutputTitration(400, 10, target, true, 70, 35);
            assert.equal(over.bolusMlKg, 20, 'Clamps maximum to 20 mL/kg');
        });

        it('calculateFluidRequirements with isHypotensive=true returns shock-adjusted rate (+25%), bolus volume, and adjusted 8h/24h totals', () => {
            const fluid = BurnEngine.calculateFluidRequirements({
                weightKg: 70,
                tbsaPct: 40,
                ageYears: 30,
                isHypotensive: true,
                shockBolusMlKg: 20
            });
            assert.equal(fluid.isHypotensive, true);
            assert.equal(fluid.shockBolusMl, 1400);

            // Modified Brooke total = 2 * 70 * 40 = 5600 mL. Baseline 8h rate = 2800 / 8 = 350 mL/hr
            assert.equal(fluid.baselineFirst8hRate, 350);
            assert.equal(fluid.first8hHourlyRate, 438); // 350 * 1.25 = 437.5 -> 438 mL/hr
            assert.equal(fluid.shockAdjustedFirst8hRate, 438);

            // Shock 8h target = 1400 bolus + (438 * 8) = 1400 + 3504 = 4904 mL
            assert.equal(fluid.first8hTargetMl, 4904);
            // Shock 24h total = 4904 + 2800 = 7704 mL
            assert.equal(fluid.modifiedBrookeTotalMl, 7704);
            assert.equal(fluid.total24hMl, 7704);

            // Parkland baseline 8h rate = 5600 / 8 = 700 mL/hr. Adjusted = 875 mL/hr
            assert.equal(fluid.parklandBaselineFirst8hRate, 700);
            assert.equal(fluid.parklandFirst8hHourlyRate, 875);
            // Parkland Shock 8h target = 1400 + (875 * 8) = 1400 + 7000 = 8400 mL
            assert.equal(fluid.parklandFirst8hTargetMl, 8400);
            // Parkland Shock 24h total = 8400 + 5600 = 14000 mL
            assert.equal(fluid.parklandTotalMl, 14000);
        });
    });

    describe('17. Strict Pediatric Maintenance <=30kg Boundary (ATLS Table 9-1)', () => {
        it('12yo 45kg child (>30kg) does not trigger dextrose maintenance', () => {
            const fluid = BurnEngine.calculateFluidRequirements({
                weightKg: 45,
                tbsaPct: 20,
                ageYears: 12
            });
            assert.equal(fluid.requiresMaintenanceDextrose, false, 'Children >30kg do not require D5LR maintenance');
        });

        it('6yo 20kg child (<=30kg) triggers dextrose maintenance', () => {
            const fluid = BurnEngine.calculateFluidRequirements({
                weightKg: 20,
                tbsaPct: 20,
                ageYears: 6
            });
            assert.equal(fluid.requiresMaintenanceDextrose, true, 'Children <=30kg require D5LR maintenance');
            assert.equal(fluid.pediatricMaintenance.hourlyRateMlHr, 60); // 40 + (10 * 2) = 60 mL/hr
        });
    });

    describe('18. Post-8h Catch-up Schedule & Flag', () => {
        it('hoursElapsed >= 8 sets isPost8h to true and calculates remaining hours rate', () => {
            const fluid = BurnEngine.calculateFluidRequirements({
                weightKg: 70,
                tbsaPct: 30,
                ageYears: 30,
                hoursElapsed: 10,
                prehospitalFluidGivenMl: 1000
            });
            assert.equal(fluid.isPost8h, true);
            // Modified Brooke total = 2 * 70 * 30 = 4200 mL
            // Remaining volume = 4200 - 1000 = 3200 mL
            // Remaining hours = 24 - 10 = 14 hours
            // Rate = 3200 / 14 = 228.57 -> 229 mL/hr
            assert.equal(fluid.first8hHourlyRate, 229);
        });
    });

    describe('19. Airway Safety Pearls Export', () => {
        it('AIRWAY_SAFETY_PEARLS provides succinylcholine and ETT size standards', () => {
            assert.ok(BurnEngine.AIRWAY_SAFETY_PEARLS);
            assert.equal(BurnEngine.AIRWAY_SAFETY_PEARLS.succinylcholineWarningHours, 24);
            assert.ok(BurnEngine.AIRWAY_SAFETY_PEARLS.succinylcholineWarning.includes('Succinylcholine'));
            assert.equal(BurnEngine.AIRWAY_SAFETY_PEARLS.ettSizeAdultMin, 7.5);
        });
    });

    describe('20. DOM Interactive Shock Bolus Buttons & Dynamic Schedule Labels', () => {
        it('Selecting shock checkbox updates main formula hero rates and 8h/24h totals to shock resuscitation plan', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            // Set elapsed hours to 0 to test exact 8-hour window
            const inputElapsed = doc.getElementById('input-elapsed');
            inputElapsed.value = '0';
            inputElapsed.dispatchEvent(new win.Event('input', { bubbles: true }));

            // Direct entry 36% TBSA for 70kg adult (Modified Brooke baseline = 2 * 70 * 36 / 2 / 8 = 315 mL/hr)
            const inputDirect = doc.getElementById('input-direct-tbsa');
            inputDirect.value = '36';
            inputDirect.dispatchEvent(new win.Event('input', { bubbles: true }));

            assert.equal(doc.getElementById('val-first8h-rate').textContent, '315 mL/hr');
            assert.equal(doc.getElementById('val-first8h-target').textContent, '2,520 mL');
            assert.equal(doc.getElementById('val-total-24h').textContent, '5,040 mL');
            assert.equal(doc.getElementById('badge-modified-shock').style.display, 'none');

            // Check shock checkbox (default 20 mL/kg = 1400 mL bolus)
            const chkHypo = doc.getElementById('check-hypotensive');
            chkHypo.checked = true;
            chkHypo.dispatchEvent(new win.Event('change', { bubbles: true }));

            // Main hero rate on formula card must directly update to shock-adjusted rate 394 mL/hr
            assert.equal(doc.getElementById('val-first8h-rate').textContent, '394 mL/hr');
            assert.equal(doc.getElementById('badge-modified-shock').style.display, 'inline-block');
            assert.ok(doc.getElementById('val-time-remaining-desc').textContent.includes('ปรับเพิ่ม +25% สำหรับภาวะช็อก'));

            // 8h target with shock = 1400 bolus + (394 * 8) = 4,552 mL
            assert.equal(doc.getElementById('val-first8h-target').textContent, '4,552 mL');
            assert.equal(doc.getElementById('lbl-first8h-target').textContent, 'ยอด 8 ชม. แรก (รวม Bolus)');

            // 24h total with shock = 4552 + 2520 = 7,072 mL
            assert.equal(doc.getElementById('val-total-24h').textContent, '7,072 mL');
            assert.equal(doc.getElementById('lbl-total-24h').textContent, 'ยอดรวม 24 ชม. (แผนกู้ชีพ)');

            // Parkland rate must also be shock-adjusted: baseline 630 * 1.25 = 788 mL/hr
            assert.equal(doc.getElementById('val-parkland-first8h-rate').textContent, '788 mL/hr');
            assert.equal(doc.getElementById('val-parkland-first8h-target').textContent, '7,704 mL');
            assert.equal(doc.getElementById('val-parkland-total').textContent, '12,744 mL');

            // Unchecking shock restores baseline rates and totals
            chkHypo.checked = false;
            chkHypo.dispatchEvent(new win.Event('change', { bubbles: true }));

            assert.equal(doc.getElementById('val-first8h-rate').textContent, '315 mL/hr');
            assert.equal(doc.getElementById('val-first8h-target').textContent, '2,520 mL');
            assert.equal(doc.getElementById('val-total-24h').textContent, '5,040 mL');
            assert.equal(doc.getElementById('badge-modified-shock').style.display, 'none');
        });

        it('Selecting shock checkbox and clicking 15 mL/kg bolus button updates UI and calculated volume', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            const chkHypo = doc.getElementById('check-hypotensive');
            chkHypo.checked = true;
            chkHypo.dispatchEvent(new win.Event('change', { bubbles: true }));

            const panel = doc.getElementById('shock-bolus-panel');
            assert.equal(panel.style.display, 'block');

            // Default 70kg at 20 mL/kg = 1,400 mL
            assert.equal(doc.getElementById('val-shock-bolus-vol').textContent, '1,400 mL');

            // Click 15 mL/kg button
            const btn15 = doc.querySelector('.bolus-btn[data-bolus="15"]');
            assert.ok(btn15);
            btn15.dispatchEvent(new win.Event('click', { bubbles: true }));

            // 70kg * 15 = 1,050 mL
            assert.equal(doc.getElementById('val-shock-bolus-vol').textContent, '1,050 mL');

            // Click 10 mL/kg button
            const btn10 = doc.querySelector('.bolus-btn[data-bolus="10"]');
            assert.ok(btn10);
            btn10.dispatchEvent(new win.Event('click', { bubbles: true }));

            // 70kg * 10 = 700 mL
            assert.equal(doc.getElementById('val-shock-bolus-vol').textContent, '700 mL');
        });

        it('Post-8h elapsed time updates dynamic schedule header labels', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            const inputElapsed = doc.getElementById('input-elapsed');
            inputElapsed.value = '10';
            inputElapsed.dispatchEvent(new win.Event('input', { bubbles: true }));

            const lblFirst8h = doc.getElementById('lbl-first8h-rate');
            assert.ok(lblFirst8h.textContent.includes('อัตราชดเชยหลัง 8 ชม.'));
            assert.ok(lblFirst8h.textContent.includes('14h Left'));
        });
    });

    describe('21. getRegionPercentages() Helper Invariants', () => {
        it('Returns all 32 region percentages for adult bracket', () => {
            const adultPcts = BurnEngine.getRegionPercentages('adult');
            assert.equal(adultPcts.head_ant, 3.5);
            assert.equal(adultPcts.head_post, 3.5);
            assert.equal(adultPcts.chest_ant, 6.5);
            assert.equal(adultPcts.abdomen_ant, 6.5);
            assert.equal(adultPcts.thigh_r_ant, 4.75);
            assert.equal(adultPcts.leg_lower_r_ant, 3.5);
        });

        it('Returns infant (<1y) percentages with 19% head and smaller thighs/legs', () => {
            const infantPcts = BurnEngine.getRegionPercentages('0');
            assert.equal(infantPcts.head_ant, 9.5);
            assert.equal(infantPcts.head_post, 9.5);
            assert.equal(infantPcts.thigh_r_ant, 2.75);
            assert.equal(infantPcts.leg_lower_r_ant, 2.5);
        });

        it('Defaults to adult when invalid or undefined column is provided', () => {
            const defPcts = BurnEngine.getRegionPercentages();
            assert.equal(defPcts.head_ant, 3.5);
        });
    });

    describe('22. DOM Pediatric Body Model & Dynamic Lund-Browder Label Sync', () => {
        it('Changing age to infant (0.5y) updates wrapper class to model-col-0 and head label to 9.5%', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            const inputAge = doc.getElementById('input-age');
            inputAge.value = '0.5';
            inputAge.dispatchEvent(new win.Event('input', { bubbles: true }));

            const wrapper = doc.getElementById('body-mapper-wrapper');
            assert.ok(wrapper.classList.contains('model-col-0'), 'Wrapper must have model-col-0 for infant');

            const headLabel = doc.getElementById('lbl-head_ant');
            assert.equal(headLabel.textContent, '9.5%', 'Infant anterior head label must display 9.5%');

            const thighLabel = doc.getElementById('lbl-thigh_r_ant');
            assert.equal(thighLabel.textContent, '2.75%', 'Infant anterior right thigh label must display 2.75%');
        });

        it('Changing age to child (7y) updates wrapper class to model-col-5 and head label to 6.5%', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            const inputAge = doc.getElementById('input-age');
            inputAge.value = '7';
            inputAge.dispatchEvent(new win.Event('input', { bubbles: true }));

            const wrapper = doc.getElementById('body-mapper-wrapper');
            assert.ok(wrapper.classList.contains('model-col-5'), 'Wrapper must have model-col-5 for child');

            const headLabel = doc.getElementById('lbl-head_ant');
            assert.equal(headLabel.textContent, '6.5%', 'Child anterior head label must display 6.5%');
        });
    });

    describe('23. Shock Titration (+20% to +30%) & Zero-Weight Boundary Guard', () => {
        it('Shock/Hypotension titration sets adjustedRateMin to +20% (ATLS 11th p. 138-139)', () => {
            const target = BurnEngine.getTargetUrineOutput(70, 30, false, false);
            const titration = BurnEngine.getUrineOutputTitration(500, 20, target, true, 70);
            assert.equal(titration.status, 'SHOCK_HYPOTENSION');
            assert.equal(titration.adjustedRateMin, 600, '500 * 1.20 = 600 mL/hr (+20%)');
            assert.equal(titration.adjustedRateMax, 650, '500 * 1.30 = 650 mL/hr (+30%)');
            assert.equal(titration.suggestedRate, 625, '500 * 1.25 = 625 mL/hr (+25%)');
        });

        it('Zero-weight (wt=0) calculateFluidRequirements does not flag requiresMaintenanceDextrose', () => {
            const res = BurnEngine.calculateFluidRequirements({
                weightKg: 0,
                tbsaPct: 20,
                ageYears: 2
            });
            assert.equal(res.requiresMaintenanceDextrose, false, 'wt=0 must not require pediatric maintenance dextrose');
        });
    });

    describe('24. ANATOMICAL_PRESETS Definition & Application', () => {
        it('ANATOMICAL_PRESETS exports valid region arrays for all presets', () => {
            assert.ok(BurnEngine.ANATOMICAL_PRESETS, 'ANATOMICAL_PRESETS must be exported');
            assert.ok(Array.isArray(BurnEngine.ANATOMICAL_PRESETS.head_all.regions));
            assert.ok(Array.isArray(BurnEngine.ANATOMICAL_PRESETS.trunk_ant_all.regions));
            assert.ok(Array.isArray(BurnEngine.ANATOMICAL_PRESETS.arm_r_all.regions));
            assert.ok(Array.isArray(BurnEngine.ANATOMICAL_PRESETS.legs_both_all.regions));
            assert.equal(BurnEngine.ANATOMICAL_PRESETS.legs_both_all.regions.length, 12);
        });

        it('DOM Quick Preset button paints entire anatomical unit in single click', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            const btnArmR = doc.querySelector('button[data-preset="arm_r_all"]');
            assert.ok(btnArmR, 'Preset button for Right Arm must exist');
            btnArmR.dispatchEvent(new win.Event('click', { bubbles: true }));

            const upperArm = doc.getElementById('part-arm_upper_r_ant');
            const handR = doc.getElementById('part-hand_r_ant');
            assert.ok(upperArm.classList.contains('deg-2'), 'Upper arm should be painted deg-2');
            assert.ok(handR.classList.contains('deg-2'), 'Hand should be painted deg-2');

            const tbsaEl = doc.getElementById('val-resuscitative-tbsa');
            assert.equal(tbsaEl.textContent, '9.5', 'Adult Right Upper Limb total in Lund-Browder is 9.5% (4% upper + 3% lower + 2.5% hand)');
        });
    });

    describe('25. estimateCOClearanceTime() Helper Invariants', () => {
        it('Calculates clearance time for 100% NRB (T½ = 60 min)', () => {
            // From 20% to 5% COHb = 2 half-lives = 2 * 60 = 120 minutes = 2 hours
            const res = BurnEngine.estimateCOClearanceTime(20, 5, 'nrb_100');
            assert.equal(res.halfLifeMinutes, 60);
            assert.equal(res.clearanceMinutes, 120);
            assert.equal(res.timeFormatted, '2 ชม. ');
        });

        it('Calculates clearance time for HBO 3.0 ATA (T½ = 23 min)', () => {
            // From 20% to 5% COHb = 2 half-lives = 2 * 23 = 46 minutes
            const res = BurnEngine.estimateCOClearanceTime(20, 5, 'hbo_3ata');
            assert.equal(res.halfLifeMinutes, 23);
            assert.equal(res.clearanceMinutes, 46);
            assert.equal(res.timeFormatted, '46 นาที');
        });

        it('Handles initial <= target COHb cleanly with 0 minutes', () => {
            const res = BurnEngine.estimateCOClearanceTime(3, 5, 'nrb_100');
            assert.equal(res.clearanceMinutes, 0);
            assert.ok(res.timeFormatted.includes('0 นาที'));
        });
    });

    describe('26. evaluatePresumptiveCyanideToxicity() Criteria Scoring', () => {
        it('Identifies presumptive cyanide toxicity when enclosed space + lactate >= 10', () => {
            const evalRes = BurnEngine.evaluatePresumptiveCyanideToxicity({
                enclosedSpace: true,
                alteredConsciousnessOrCPR: true,
                persistentHypotension: true,
                lactateGte10: true,
                cohbGt10: true
            });
            assert.equal(evalRes.isPresumptiveCyanide, true);
            assert.equal(evalRes.criteriaMetCount, 5);
            assert.ok(evalRes.indicationText.includes('Hydroxocobalamin'));
        });

        it('Returns false when no high-risk criteria are met', () => {
            const evalRes = BurnEngine.evaluatePresumptiveCyanideToxicity({
                enclosedSpace: false,
                alteredConsciousnessOrCPR: false,
                persistentHypotension: false,
                lactateGte10: false,
                cohbGt10: false
            });
            assert.equal(evalRes.isPresumptiveCyanide, false);
            assert.equal(evalRes.criteriaMetCount, 0);
        });
    });

    describe('27. Pointer & Click Event Collision & Ghosting Prevention', () => {
        it('Sequential pointerdown followed by click does not untoggle/erase painted region', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            const chestPart = doc.getElementById('part-chest_ant');
            const svgAnt = doc.getElementById('svg-anterior');

            // Simulate real browser event sequence on tapping chest
            const pointerDownEvent = new win.Event('pointerdown', { bubbles: true });
            pointerDownEvent.clientX = 100;
            pointerDownEvent.clientY = 100;
            Object.defineProperty(pointerDownEvent, 'target', { value: chestPart });

            svgAnt.dispatchEvent(pointerDownEvent);
            assert.ok(chestPart.classList.contains('deg-2'), 'Pointerdown must paint part to deg-2');

            // Browser immediately fires click on the same element
            chestPart.dispatchEvent(new win.Event('click', { bubbles: true }));
            assert.ok(chestPart.classList.contains('deg-2'), 'Subsequent click must NOT unpaint to deg-0 due to race condition');

            const tbsaEl = doc.getElementById('val-resuscitative-tbsa');
            assert.equal(tbsaEl.textContent, '6.5', 'Chest must remain 6.5%');
        });

        it('Reset button cleanly resets Direct TBSA input to 0', () => {
            const win = loadBurnManagerDom();
            const doc = win.document;

            // Paint chest
            const chestPart = doc.getElementById('part-chest_ant');
            chestPart.dispatchEvent(new win.Event('click', { bubbles: true }));

            const inputDirect = doc.getElementById('input-direct-tbsa');
            assert.equal(inputDirect.value, '6.5');

            // Reset
            const resetBtn = doc.getElementById('quick-reset-btn');
            resetBtn.dispatchEvent(new win.Event('click', { bubbles: true }));

            assert.equal(inputDirect.value, '0');
            const valTbsa = doc.getElementById('val-resuscitative-tbsa');
            assert.equal(valTbsa.textContent, '0.0');
        });
    });
});
