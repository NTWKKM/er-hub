const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const BurnEngine = require('../shared/burn-engine.js');

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
        it('Adult standard target: 0.5 mL/kg/hr (min 30-50 mL/hr)', () => {
            const uo70kg = BurnEngine.getTargetUrineOutput(70, 30, false, false);
            assert.equal(uo70kg.targetMlHrMin, 35);
            assert.equal(uo70kg.targetMlHrMax, 50);
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
            assert.ok(titration.bolusAdvice.includes('700–1400 mL')); // 10-20 mL/kg for 70kg
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
        const fs = require('node:fs');
        const path = require('node:path');
        const { JSDOM } = require('jsdom');

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
            assert.equal(doc.getElementById('val-total-24h').textContent, '1820 mL');
            assert.equal(doc.getElementById('val-first8h-rate').textContent, '130 mL/hr');
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
            assert.equal(doc.getElementById('val-total-24h').textContent, '3500 mL');
            assert.equal(doc.getElementById('val-first8h-rate').textContent, '250 mL/hr');
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
    });
});
