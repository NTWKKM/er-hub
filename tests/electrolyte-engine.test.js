const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ELECTROLYTE_ENGINE } = require('../shared/electrolyte-engine.js');

describe('ELECTROLYTE_ENGINE: TBW & Sodium Calculations', () => {
    test('TBW calculation by sex and age', () => {
        assert.equal(ELECTROLYTE_ENGINE.calcTBW(70, 'male', 30), 42.0); // 70 * 0.6
        assert.equal(ELECTROLYTE_ENGINE.calcTBW(60, 'female', 30), 30.0); // 60 * 0.5
        assert.equal(ELECTROLYTE_ENGINE.calcTBW(70, 'male', 75), 35.0); // 70 * 0.5
        assert.equal(ELECTROLYTE_ENGINE.calcTBW(60, 'female', 75), 27.0); // 60 * 0.45
        assert.equal(ELECTROLYTE_ENGINE.calcTBW(20, 'male', 8, true), 12.0); // child 20 * 0.6
    });

    test('Hyperglycemia-Corrected Sodium (Katz vs Hillier)', () => {
        // Normal glucose: no change
        assert.equal(ELECTROLYTE_ENGINE.calcCorrectedSodium(130, 95), 130);
        
        // Glucose 500 mg/dL (delta = 4), Katz: 120 + (1.6 * 4) = 126.4
        assert.equal(ELECTROLYTE_ENGINE.calcCorrectedSodium(120, 500, 'katz'), 126.4);
        
        // Glucose 500 mg/dL (delta = 4), Hillier (>400 -> factor 2.4): 120 + (2.4 * 4) = 129.6
        assert.equal(ELECTROLYTE_ENGINE.calcCorrectedSodium(120, 500, 'hillier'), 129.6);
        
        // Glucose 300 mg/dL (delta = 2), Hillier (<=400 -> factor 2.0): 125 + (2.0 * 2) = 129.0
        assert.equal(ELECTROLYTE_ENGINE.calcCorrectedSodium(125, 300, 'hillier'), 129.0);
    });

    test('Adrogué-Madias Formula (3% NaCl & Normal Saline)', () => {
        const tbw = 35; // 70kg elderly male
        const serumNa = 110;
        
        // 3% NaCl (513 mEq/L): (513 - 110) / (35 + 1) = 403 / 36 = 11.19 mEq/L per 1L
        const delta3Pct = ELECTROLYTE_ENGINE.calcAdrogueMadias(serumNa, 'nacl_3', tbw);
        assert.equal(delta3Pct, 11.19);
        
        // 0.9% NaCl (154 mEq/L): (154 - 110) / 36 = 44 / 36 = 1.22 mEq/L per 1L
        const delta09Pct = ELECTROLYTE_ENGINE.calcAdrogueMadias(serumNa, 'nacl_09', tbw);
        assert.equal(delta09Pct, 1.22);
    });

    test('Hyponatremia Infusion Rate Calculator', () => {
        const rate = ELECTROLYTE_ENGINE.calcHyponatremiaInfusionRate(6, 11.19);
        // totalLiters = 6 / 11.19 = 0.536 L -> ~536 mL / 24h -> ~22.3 mL/hr
        assert.ok(rate.mlPerHour > 20 && rate.mlPerHour < 25);
    });

    test('Hyponatremia Acute 3% Bolus Rules', () => {
        const adultBolus = ELECTROLYTE_ENGINE.calcHyponatremiaBolus(70, false);
        assert.equal(adultBolus.bolusMl, 100);
        
        const childBolus = ELECTROLYTE_ENGINE.calcHyponatremiaBolus(20, true);
        assert.equal(childBolus.bolusMl, 40); // 2 mL/kg
    });

    test('Free Water Deficit (Hypernatremia)', () => {
        const tbw = 30; // 60kg female
        const serumNa = 160;
        const fwd = ELECTROLYTE_ENGINE.calcFreeWaterDeficit(serumNa, tbw, 140);
        // FWD = 30 * ((160/140) - 1) = 30 * (20/140) = 4.29 L
        assert.equal(fwd.totalFwdLiters, 4.29);
        assert.equal(fwd.maxSafeDrop24h, 10);
        assert.ok(fwd.d5wHourlyRateMlHr > 0);
    });
});

describe('ELECTROLYTE_ENGINE: Potassium & Acidosis Modules', () => {
    test('Potassium deficit estimations', () => {
        assert.equal(ELECTROLYTE_ENGINE.calcPotassiumDeficit(4.2).deficitMeq, 0);
        assert.equal(ELECTROLYTE_ENGINE.calcPotassiumDeficit(4.2).severity, 'Normal (4.0-5.0)');
        assert.equal(ELECTROLYTE_ENGINE.calcPotassiumDeficit(6.5).severity, 'Hyperkalemia (>5.0 mEq/L)');
        assert.equal(ELECTROLYTE_ENGINE.calcPotassiumDeficit(6.5).isHyperkalemic, true);
        assert.equal(ELECTROLYTE_ENGINE.calcPotassiumDeficit(3.8).severity, 'Mild (3.5-3.9)');
        assert.equal(ELECTROLYTE_ENGINE.calcPotassiumDeficit(2.3).severity, 'Life-Threatening (<2.5)');
    });

    test('Spot UK/UCr ratio assessment (replaces TTKG)', () => {
        const hypokalemicRenal = ELECTROLYTE_ENGINE.calcSpotUKCr(30, 10, 'mmol_mmol'); // ratio = 3.0 > 1.5
        assert.equal(hypokalemicRenal.ratio, 3.0);
        assert.ok(hypokalemicRenal.interpretationHypo.includes('Inappropriate renal K+ wasting'));

        const hypokalemicExtra = ELECTROLYTE_ENGINE.calcSpotUKCr(10, 10, 'mmol_mmol'); // ratio = 1.0 < 1.5
        assert.ok(hypokalemicExtra.interpretationHypo.includes('Appropriate renal conservation'));
    });

    test('Potassium safety limits enforcement', () => {
        // Peripheral line > 20 mEq/hr -> Blocked
        const unsafePeripheral = ELECTROLYTE_ENGINE.evaluatePotassiumSafety(25, 40, false);
        assert.equal(unsafePeripheral.isBlocked, true);

        // Peripheral line concentration > 40 mEq/L -> Blocked
        const unsafeConc = ELECTROLYTE_ENGINE.evaluatePotassiumSafety(10, 60, false);
        assert.equal(unsafeConc.isBlocked, true);

        // Central line within safe bounds
        const safeCentral = ELECTROLYTE_ENGINE.evaluatePotassiumSafety(25, 80, true);
        assert.equal(safeCentral.isBlocked, false);

        // Hyperkalemia safety guard (serumK >= 5.0) -> Blocked
        const hyperkSafety = ELECTROLYTE_ENGINE.evaluatePotassiumSafety(10, 40, false, 5.8);
        assert.equal(hyperkSafety.isBlocked, true);
        assert.ok(hyperkSafety.warnings.some(w => w.includes('STRICLY CONTRAINDICATED') || w.includes('CONTRAINDICATED')));

        const infusionHyperk = ELECTROLYTE_ENGINE.calcPotassiumInfusion({
            fluidVolumeMl: 1000,
            kclMeqAdded: 40,
            pumpRateMlHr: 100,
            isCentralLine: false,
            serumK: 6.2
        });
        assert.equal(infusionHyperk.safety.isBlocked, true);
    });

    test('Bicarbonate Deficit Calculation & BICAR-ICU Indication', () => {
        // 70kg patient, HCO3 = 6, Target = 14
        // Standard fvd = 0.5: 0.5 * 70 * (14 - 6) = 280 mEq
        const def = ELECTROLYTE_ENGINE.calcBicarbonateDeficit(70, 6, 14, false);
        assert.equal(def.deficitMeq, 280);
        assert.equal(def.halfDeficitMeq, 140);
        // 7.5% NaHCO3 (44.6 mEq/amp): 280 / 44.6 = 6.27 -> Math.ceil = 7 ampules
        assert.equal(def.ampules75Total, 7);
        // 8.4% NaHCO3 (50 mEq/amp): 280 / 50 = 5.6 -> Math.ceil = 6 ampules
        assert.equal(def.ampules84Total, 6);
        assert.ok(def.recipes.recipe75.formula1000.includes('7.5%'));
        assert.ok(def.recipes.recipe84.formula1000.includes('8.4%'));

        // Severe acidemia fvd = 0.8: 0.8 * 70 * 8 = 448 mEq
        const defSevere = ELECTROLYTE_ENGINE.calcBicarbonateDeficit(70, 6, 14, true);
        assert.equal(defSevere.deficitMeq, 448);
        assert.equal(defSevere.ampules75Total, 11); // 448 / 44.6 = 10.04 -> ceil 11
        assert.equal(defSevere.ampules84Total, 9);  // 448 / 50 = 8.96 -> ceil 9

        // BICAR-ICU indication test: Sepsis + severe acidemia + AKI Stage 2 -> Recommended
        const evalBicarbAki = ELECTROLYTE_ENGINE.evaluateBicarbonateIndication({
            etiology: 'lactic_sepsis',
            ph: 7.12,
            hco3: 8,
            akinStage: 2
        });
        assert.equal(evalBicarbAki.recommended, true);

        // DKA with pH 7.05 -> Contraindicated
        const evalDka = ELECTROLYTE_ENGINE.evaluateBicarbonateIndication({
            etiology: 'dka',
            ph: 7.05,
            hco3: 9
        });
        assert.equal(evalDka.contraindicated, true);

        // DKA with pH 6.85 -> Recommended
        const evalDkaSevere = ELECTROLYTE_ENGINE.evaluateBicarbonateIndication({
            etiology: 'dka',
            ph: 6.85,
            hco3: 4
        });
        assert.equal(evalDkaSevere.recommended, true);

        // Alkalemia with pH 7.50 -> Contraindicated
        const evalAlkalemia = ELECTROLYTE_ENGINE.evaluateBicarbonateIndication({
            etiology: 'lactic_sepsis',
            ph: 7.50,
            hco3: 30
        });
        assert.equal(evalAlkalemia.contraindicated, true);
        assert.ok(evalAlkalemia.summary.includes('Alkalemia Present'));
    });
});

describe('ELECTROLYTE_ENGINE: Calcium, Magnesium & Gaps', () => {
    test('Direct Ionized Calcium priority and Payne Alert', () => {
        // Direct iCa provided: normal
        const normalIca = ELECTROLYTE_ENGINE.evaluateCalcium(1.22, 0, 0);
        assert.equal(normalIca.primaryType, 'ionized');
        assert.equal(normalIca.status, 'normal');

        // Total Ca with low Albumin: generates Payne alert
        const totalCaHypoalb = ELECTROLYTE_ENGINE.evaluateCalcium(0, 8.0, 2.0);
        assert.equal(totalCaHypoalb.primaryType, 'total');
        assert.equal(totalCaHypoalb.payneCorrectedCa, 9.6); // 8.0 + 0.8*(4-2) = 9.6
        assert.ok(totalCaHypoalb.evidenceAlert.includes('IFCC/IOF/EFLM 2026'));
    });

    test('Phosphate & Calcium Precipitation Gate ([Ca x PO4] < 55)', () => {
        // Ca = 9.0, PO4 = 2.0 -> Product = 18 < 55 -> Safe
        const safeModerate = ELECTROLYTE_ENGINE.calcPhosphateRepletion(2.0, 9.0, 70);
        assert.equal(safeModerate.isPrecipitationRisk, false);
        assert.equal(safeModerate.caPo4Product, 18.0);
        assert.equal(safeModerate.severity, 'Moderate (1.0 - 2.4 mg/dL)');

        // Ca = 10.0, PO4 = 6.0 -> Product = 60 >= 55 -> Hyperphosphatemia with Precipitation Risk!
        const dangerProduct = ELECTROLYTE_ENGINE.calcPhosphateRepletion(6.0, 10.0, 70);
        assert.equal(dangerProduct.severity, 'Hyperphosphatemia (>4.5 mg/dL)');
        assert.equal(dangerProduct.caPo4Product, 60.0);
        assert.equal(dangerProduct.isPrecipitationRisk, true);
        assert.ok(dangerProduct.safetyGate.includes('CRITICAL WARNING'));
    });

    test('Magnesium Repletion with eGFR adjustment', () => {
        // Normal eGFR 90: full rate 1.0 g/hr
        const normalEgfr = ELECTROLYTE_ENGINE.calcMgRepletion(0.8, false, 90);
        assert.ok(normalEgfr.maintenanceInfusion.includes('1.0 g/hr'));

        // Impaired eGFR 20: 50% reduced rate 0.5 g/hr
        const renalEgfr = ELECTROLYTE_ENGINE.calcMgRepletion(0.8, false, 20);
        assert.ok(renalEgfr.maintenanceInfusion.includes('0.5 g/hr'));
        assert.ok(renalEgfr.maintenanceInfusion.includes('reduced by 50%'));
    });

    test('Modern ISE Anion Gap & Delta-Delta Ratio', () => {
        // Modern ISE normal range: 4 to 10 mEq/L
        // Na=140, Cl=108, HCO3=24 -> AG = 8 (Normal)
        const agNormal = ELECTROLYTE_ENGINE.calcAnionGap(140, 108, 24, 4.0);
        assert.equal(agNormal.rawAg, 8);
        assert.equal(agNormal.correctedAg, 8);
        assert.ok(agNormal.interpretation.includes('Normal Anion Gap'));

        // High AG: Na=140, Cl=100, HCO3=15, Alb=2.0 -> Raw AG = 25, Corrected AG = 25 + 2.5*(4-2) = 30
        const agHigh = ELECTROLYTE_ENGINE.calcAnionGap(140, 100, 15, 2.0);
        assert.equal(agHigh.rawAg, 25);
        assert.equal(agHigh.correctedAg, 30);
        assert.ok(agHigh.interpretation.includes('HAGMA'));

        // Delta-Delta: Corrected AG = 30, HCO3 = 15
        // deltaAg = 30 - 10 = 20, deltaHco3 = 24 - 15 = 9 -> Ratio = 20 / 9 = 2.22 (>2.0 -> HAGMA + Met Alk)
        const dd = ELECTROLYTE_ENGINE.calcDeltaDelta(30, 15);
        assert.equal(dd.deltaRatio, 2.22);
        assert.ok(dd.interpretation.includes('Metabolic Alkalosis'));
    });

    test('Urine Anion Gap and Fractional Excretion', () => {
        // Negative UAG: U_Na=20, U_K=15, U_Cl=60 -> UAG = 20 + 15 - 60 = -25 (GI loss)
        const uagNeg = ELECTROLYTE_ENGINE.calcUrineGaps(20, 15, 60);
        assert.equal(uagNeg.urineAnionGap, -25);
        assert.ok(uagNeg.uagInterpretation.includes('GI loss'));

        // FE_Na: U_Na=15, S_Na=140, U_Cr=100, S_Cr=1.0 -> FE_Na = (15 * 1.0) / (140 * 100) * 100 = 0.11% (Prerenal)
        const fe = ELECTROLYTE_ENGINE.calcFractionalExcretions({
            uNa: 15, sNa: 140, uCr: 100, sCr: 1.0, uCa: 5, sCa: 10
        });
        assert.equal(fe.feNa, 0.11);
        assert.ok(fe.feNaInterp.includes('Prerenal'));
        assert.equal(fe.cccr, 0.005); // (5 * 1) / (10 * 100) = 0.005 < 0.01 (FHH)
        assert.ok(fe.cccrInterp.includes('FHH'));
    });
});

describe('ELECTROLYTE_ENGINE: Diagnostic Decision Trees', () => {
    test('Hyponatremia Decision Tree', () => {
        const hypertonic = ELECTROLYTE_ENGINE.evaluateHyponatremiaWorkup({ serumOsm: 310 });
        assert.equal(hypertonic.category, 'Hypertonic Hyponatremia');

        const siadh = ELECTROLYTE_ENGINE.evaluateHyponatremiaWorkup({
            serumOsm: 260,
            uOsm: 350,
            volumeStatus: 'euvolemic',
            uNa: 50,
            feUratePostNorm: 9.5
        });
        assert.ok(siadh.category.includes('Euvolemic'));
        assert.ok(siadh.primaryCauses[0].includes('Confirmed SIADH'));
    });

    test('Hypokalemia Decision Tree', () => {
        const gitelman = ELECTROLYTE_ENGINE.evaluateHypokalemiaWorkup({
            spotUKCrRatio: 2.5,
            bpStatus: 'normal',
            acidBaseStatus: 'alkalosis',
            uCl: 35
        });
        assert.ok(gitelman.category.includes('Chloride-Resistant'));
        assert.ok(gitelman.primaryCauses.some(c => c.includes('Gitelman')));
    });

    test('Hypernatremia & Hyperkalemia Decision Trees', () => {
        const cdi = ELECTROLYTE_ENGINE.evaluateHypernatremiaWorkup({ uOsm: 150, responseToDdavp: 'good' });
        assert.ok(cdi.category.includes('Central Diabetes Insipidus'));

        const ndi = ELECTROLYTE_ENGINE.evaluateHypernatremiaWorkup({ uOsm: 200, responseToDdavp: 'poor' });
        assert.ok(ndi.category.includes('Nephrogenic Diabetes Insipidus'));

        const pseudoK = ELECTROLYTE_ENGINE.evaluateHyperkalemiaWorkup({ isHemolyzed: true });
        assert.ok(pseudoK.category.includes('Pseudohyperkalemia'));

        const rta4 = ELECTROLYTE_ENGINE.evaluateHyperkalemiaWorkup({ isHemolyzed: false, gfr: 65, spotUKCrRatio: 1.2 });
        assert.ok(rta4.category.includes('Impaired Tubular Potassium Secretion'));
    });

    test('Metabolic Acidosis & Alkalosis Decision Trees', () => {
        const hagma = ELECTROLYTE_ENGINE.evaluateMetabolicAcidosisWorkup({ anionGap: 18, deltaRatio: 1.2 });
        assert.ok(hagma.category.includes('HAGMA'));

        const nagmaDiarrhea = ELECTROLYTE_ENGINE.evaluateMetabolicAcidosisWorkup({ anionGap: 8, uag: -20 });
        assert.ok(nagmaDiarrhea.category.includes('Gastrointestinal'));

        const rta1 = ELECTROLYTE_ENGINE.evaluateMetabolicAcidosisWorkup({ anionGap: 8, uag: 15, urinePh: 6.5, serumK: 3.0 });
        assert.ok(rta1.category.includes('Type 1 RTA'));

        const metAlkResp = ELECTROLYTE_ENGINE.evaluateMetabolicAlkalosisWorkup({ uCl: 10 });
        assert.ok(metAlkResp.category.includes('Chloride-Responsive'));

        const metAlkResistHTN = ELECTROLYTE_ENGINE.evaluateMetabolicAlkalosisWorkup({ uCl: 35, bpStatus: 'hypertensive' });
        assert.ok(metAlkResistHTN.category.includes('Mineralocorticoid Excess'));
    });

    test('Calcium Workup & IV Infusion Auto-Calculators', () => {
        const fhh = ELECTROLYTE_ENGINE.evaluateCalciumWorkup({ isHypercalcemia: true, pthStatus: 'normal', cccr: 0.006 });
        assert.ok(fhh.category.includes('FHH'));

        const kInfusion = ELECTROLYTE_ENGINE.calcPotassiumInfusion({ fluidVolumeMl: 1000, kclMeqAdded: 40, pumpRateMlHr: 100, isCentralLine: false });
        assert.equal(kInfusion.concMeqL, 40);
        assert.equal(kInfusion.rateMeqHr, 4);
        assert.equal(kInfusion.bottleDurationHrs, 10);
        assert.equal(kInfusion.safety.isSafe, true);

        const salicylate = ELECTROLYTE_ENGINE.calcSalicylateAlkalinization({ weightKg: 60, formulation: '75' });
        assert.ok(salicylate.recipe.includes('7.5%'));
        assert.ok(salicylate.potassiumMandate.includes('MANDATORY'));
    });
});
