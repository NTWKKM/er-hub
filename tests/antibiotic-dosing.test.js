/**
 * tests/antibiotic-dosing.test.js
 * 
 * Standalone 4-Tier E2E Test Suite for ER-Hub Stanford Antibiotic Dosing Engine.
 * Built with Node.js native test runner (node:test) and strict assertion library (node:assert/strict).
 * Zero external runtime or test dependencies.
 * 
 * Authoritative Sources:
 * - /Users/ntwkkm/er-hub/.agents/ORIGINAL_REQUEST.md
 * - /Users/ntwkkm/er-hub/PROJECT.md
 * - /Users/ntwkkm/er-hub/TEST_INFRA.md
 * - Stanford Health Care Antimicrobial Dosing Reference Guide
 * - Cockcroft DW, Gault MH. Nephron 1976; 16:31-41.
 * - Inker LA, Eneanya ND, Coresh J, et al. NEJM 2021; 385:1737-1749.
 */

const { describe, test, it } = require('node:test');
const assert = require('node:assert/strict');
const ABX_ENGINE = require('../shared/abx-engine.js');

// ============================================================================
// TIER 1: ANTHROPOMETRICS & DUAL RENAL CALCULATION ENGINE
// ============================================================================
describe('Tier 1: Anthropometrics & Dual Renal Calculations', () => {

    describe('1.1 Ideal Body Weight (Devine Formula & >5ft Clamping)', () => {
        test('Male baseline at 5 feet (152.4 cm) yields exactly 50.0 kg', () => {
            const ibw = ABX_ENGINE.calcIBW(152.4, 'M');
            assert.ok(Math.abs(ibw - 50.0) < 0.001, `Expected 50.0 kg, got ${ibw}`);
        });

        test('Male: 50 kg + 2.3 kg/inch over 5 ft (177.8 cm / 70 in -> 73.0 kg)', () => {
            // 177.8 cm = 70 in = 10 inches over 5 ft
            // 50 + 2.3 * 10 = 73.0 kg
            const ibw = ABX_ENGINE.calcIBW(177.8, 'M');
            assert.ok(Math.abs(ibw - 73.0) < 0.01, `Expected 73.0 kg, got ${ibw}`);
        });

        test('Female baseline at 5 feet (152.4 cm) yields exactly 45.5 kg', () => {
            const ibw = ABX_ENGINE.calcIBW(152.4, 'F');
            assert.ok(Math.abs(ibw - 45.5) < 0.001, `Expected 45.5 kg, got ${ibw}`);
        });

        test('Female: 45.5 kg + 2.3 kg/inch over 5 ft (165.1 cm / 65 in -> 57.0 kg)', () => {
            // 165.1 cm = 65 in = 5 inches over 5 ft
            // 45.5 + 2.3 * 5 = 57.0 kg
            const ibw = ABX_ENGINE.calcIBW(165.1, 'F');
            assert.ok(Math.abs(ibw - 57.0) < 0.01, `Expected 57.0 kg, got ${ibw}`);
        });

        test('Height under 5 feet clamps negative inches to 0 (does not subtract weight)', () => {
            const ibwMaleShort = ABX_ENGINE.calcIBW(140.0, 'M');
            const ibwFemaleShort = ABX_ENGINE.calcIBW(145.0, 'F');
            assert.strictEqual(ibwMaleShort, 50.0, 'Male under 5ft must be clamped to baseline 50 kg');
            assert.strictEqual(ibwFemaleShort, 45.5, 'Female under 5ft must be clamped to baseline 45.5 kg');
        });

        test('Invalid or non-positive height returns null', () => {
            assert.strictEqual(ABX_ENGINE.calcIBW(0, 'M'), null);
            assert.strictEqual(ABX_ENGINE.calcIBW(-160, 'M'), null);
            assert.strictEqual(ABX_ENGINE.calcIBW(null, 'M'), null);
            assert.strictEqual(ABX_ENGINE.calcIBW(undefined, 'F'), null);
        });
    });

    describe('1.2 Adjusted Body Weight (AdjBW / ABW with 40% Factor)', () => {
        test('Calculates AdjBW = IBW + 0.40 * (TBW - IBW)', () => {
            // TBW = 100 kg, IBW = 60 kg -> excess = 40 kg -> 60 + 0.4 * 40 = 76.0 kg
            const abw = ABX_ENGINE.calcABW(100, 60);
            assert.strictEqual(abw, 76.0);
        });

        test('AdjBW when TBW equals IBW returns IBW', () => {
            const abw = ABX_ENGINE.calcABW(70, 70);
            assert.strictEqual(abw, 70.0);
        });

        test('AdjBW returns null when either input is missing or zero', () => {
            assert.strictEqual(ABX_ENGINE.calcABW(null, 60), null);
            assert.strictEqual(ABX_ENGINE.calcABW(100, null), null);
            assert.strictEqual(ABX_ENGINE.calcABW(0, 60), null);
        });
    });

    describe('1.3 Quetelet Body Mass Index (BMI)', () => {
        test('Normal BMI calculation (70 kg, 175 cm -> 22.86 kg/m²)', () => {
            const bmi = ABX_ENGINE.calcBMI(70, 175);
            assert.ok(Math.abs(bmi - 22.857) < 0.01, `Expected ~22.86, got ${bmi}`);
        });

        test('Obese BMI >= 30 detection (110 kg, 170 cm -> 38.06 kg/m²)', () => {
            const bmi = ABX_ENGINE.calcBMI(110, 170);
            assert.ok(bmi >= 30, 'BMI should be >= 30');
            assert.ok(Math.abs(bmi - 38.06) < 0.1, `Expected ~38.06, got ${bmi}`);
        });

        test('Invalid or missing BMI inputs return null', () => {
            assert.strictEqual(ABX_ENGINE.calcBMI(0, 170), null);
            assert.strictEqual(ABX_ENGINE.calcBMI(70, 0), null);
            assert.strictEqual(ABX_ENGINE.calcBMI(null, 170), null);
        });
    });

    describe('1.4 Mosteller Body Surface Area (BSA)', () => {
        test('Standard adult BSA: sqrt((170 * 70) / 3600) ~ 1.817 m²', () => {
            const bsa = ABX_ENGINE.calcBSA(70, 170);
            const expected = Math.sqrt((170 * 70) / 3600);
            assert.ok(Math.abs(bsa - expected) < 0.001);
            assert.ok(Math.abs(bsa - 1.817) < 0.01);
        });

        test('Invalid or missing BSA inputs return null', () => {
            assert.strictEqual(ABX_ENGINE.calcBSA(0, 170), null);
            assert.strictEqual(ABX_ENGINE.calcBSA(70, null), null);
        });
    });

    describe('1.5 Cockcroft-Gault CrCl with Intelligent Weight Tiering', () => {
        test('Underweight patient (TBW < IBW) MUST use Total Body Weight (TBW)', () => {
            // Male: Age 40, Height 177.8 cm (IBW 73 kg), TBW 55 kg (< IBW), SCr 1.0
            const res = ABX_ENGINE.calcCrCl({ age: 40, sex: 'M', weightKg: 55, heightCm: 177.8, scr: 1.0 });
            assert.strictEqual(res.weightType, 'TBW', 'Underweight patients must use TBW to avoid overestimating clearance');
            assert.strictEqual(res.weightUsed, 55);
            // CrCl = ((140 - 40) * 55) / (72 * 1.0) = 5500 / 72 = 76.39 mL/min
            assert.ok(Math.abs(res.crcl - (5500 / 72)) < 0.01);
        });

        test('Obese patient (BMI >= 30) MUST use Adjusted Body Weight (AdjBW 40%)', () => {
            // Male: Age 50, Height 170 cm, TBW 110 kg (BMI ~38.06), SCr 1.2
            // IBW = 50 + 2.3 * ((170 - 152.4)/2.54) = 50 + 2.3 * 6.929 = 65.937 kg
            // AdjBW = 65.937 + 0.40 * (110 - 65.937) = 83.562 kg
            const res = ABX_ENGINE.calcCrCl({ age: 50, sex: 'M', weightKg: 110, heightCm: 170, scr: 1.2 });
            assert.strictEqual(res.weightType, 'ABW', 'Obese patient (BMI >= 30) must use ABW');
            assert.ok(Math.abs(res.weightUsed - 83.56) < 0.5);
            assert.ok(res.crcl > 0);
        });

        test('Normal weight patient uses IBW (Stanford recommendation)', () => {
            // Male: Age 60, Height 177.8 cm (IBW 73 kg), TBW 75 kg (BMI ~23.7, 75 <= 1.2*73), SCr 1.0
            const res = ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 75, heightCm: 177.8, scr: 1.0 });
            assert.strictEqual(res.weightType, 'IBW');
            assert.ok(Math.abs(res.weightUsed - 73.0) < 0.1);
        });

        test('Female 0.85 multiplier is strictly applied', () => {
            const male = ABX_ENGINE.calcCrCl({ age: 65, sex: 'M', weightKg: 65, heightCm: 165, scr: 1.1, weightType: 'TBW' });
            const female = ABX_ENGINE.calcCrCl({ age: 65, sex: 'F', weightKg: 65, heightCm: 165, scr: 1.1, weightType: 'TBW' });
            assert.ok(Math.abs(female.crcl - (male.crcl * 0.85)) < 0.0001, 'Female CrCl must be exactly 85% of Male CrCl');
        });

        test('Explicit weightType override is strictly honored', () => {
            const resTBW = ABX_ENGINE.calcCrCl({ age: 50, sex: 'M', weightKg: 100, heightCm: 170, scr: 1.0, weightType: 'TBW' });
            assert.strictEqual(resTBW.weightType, 'TBW');
            assert.strictEqual(resTBW.weightUsed, 100);

            const resIBW = ABX_ENGINE.calcCrCl({ age: 50, sex: 'M', weightKg: 100, heightCm: 170, scr: 1.0, weightType: 'IBW' });
            assert.strictEqual(resIBW.weightType, 'IBW');
            assert.ok(resIBW.weightUsed < 70);
        });

        test('Severe renal impairment (SCr 6.0 mg/dL) yields CrCl < 15 mL/min', () => {
            const res = ABX_ENGINE.calcCrCl({ age: 72, sex: 'F', weightKg: 60, heightCm: 160, scr: 6.0 });
            assert.ok(res.crcl < 15, `Expected severe renal impairment (<15 mL/min), got ${res.crcl}`);
        });

        test('Missing required patient parameters return null', () => {
            assert.strictEqual(ABX_ENGINE.calcCrCl({ age: null, sex: 'M', weightKg: 70, scr: 1.0 }), null);
            assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 50, sex: null, weightKg: 70, scr: 1.0 }), null);
            assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 50, sex: 'M', weightKg: null, scr: 1.0 }), null);
            assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 50, sex: 'M', weightKg: 70, scr: null }), null);
        });
    });

    describe('1.6 CKD-EPI 2021 Race-Free Refit eGFR (Inker et al. NEJM 2021)', () => {
        test('Male: SCr 1.0 mg/dL, Age 50 yields eGFR ~ 91.2 mL/min/1.73m²', () => {
            // Formula: 142 * (1.0 / 0.9)^(-1.200) * 0.9938^50 * 1.0 = ~91.2
            const egfr = ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 50, 'M');
            const val = Number(egfr);
            assert.ok(val > 88 && val < 95, `Expected ~91.2, got ${val}`);
        });

        test('Female: SCr 0.8 mg/dL, Age 50 yields eGFR ~ 91.7 mL/min/1.73m²', () => {
            // Formula: 142 * (0.8 / 0.7)^(-1.200) * 0.9938^50 * 1.012 = ~91.7
            const egfr = ABX_ENGINE.calcEGFR_CKD_EPI_2021(0.8, 50, 'F');
            const val = Number(egfr);
            assert.ok(val > 88 && val < 95, `Expected ~91.7, got ${val}`);
        });

        test('Severe renal impairment: SCr 4.0 mg/dL, Age 65 drops eGFR < 20 mL/min/1.73m²', () => {
            const egfr = ABX_ENGINE.calcEGFR_CKD_EPI_2021(4.0, 65, 'M');
            assert.ok(Number(egfr) < 20, `Expected eGFR < 20, got ${Number(egfr)}`);
        });

        test('Accepts patient object signature { scr, age, sex }', () => {
            const egfr = ABX_ENGINE.calcEGFR_CKD_EPI_2021({ scr: 1.0, age: 50, sex: 'M' });
            assert.ok(Number(egfr) > 88 && Number(egfr) < 95);
        });

        test('Missing inputs return null', () => {
            assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(null, 50, 'M'), null);
            assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, null, 'M'), null);
            assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 50, null), null);
        });
    });

    describe('1.7 Absolute GFR (De-indexed GFR in mL/min)', () => {
        test('De-indexes eGFR using BSA / 1.73: eGFR 60 with BSA 2.0 -> ~69.36 mL/min', () => {
            const absGfr = ABX_ENGINE.calcAbsoluteGFR(60, 2.0);
            const expected = 60 * (2.0 / 1.73);
            assert.ok(Math.abs(absGfr - expected) < 0.01);
        });

        test('De-indexes eGFR for small BSA: eGFR 60 with BSA 1.5 -> ~52.02 mL/min', () => {
            const absGfr = ABX_ENGINE.calcAbsoluteGFR(60, 1.5);
            const expected = 60 * (1.5 / 1.73);
            assert.ok(Math.abs(absGfr - expected) < 0.01);
        });

        test('Missing inputs return null', () => {
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(null, 1.8), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(60, null), null);
        });

        test('Accepts zero eGFR while rejecting negative or non-finite eGFR values', () => {
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(0, 1.73), 0);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR({ egfr: 0 }, 1.73), 0);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(-10, 1.73), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR({ egfr: -5 }, 1.73), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(Infinity, 1.73), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(-Infinity, 1.73), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(NaN, 1.73), null);
        });

        test('Validates BSA as finite value > 0 and converts numeric string BSA', () => {
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(60, 0), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(60, -1.5), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(60, Infinity), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(60, NaN), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(60, ''), null);
            assert.strictEqual(ABX_ENGINE.calcAbsoluteGFR(60, '   '), null);

            const absGfrStr = ABX_ENGINE.calcAbsoluteGFR(60, "1.73");
            assert.strictEqual(Math.round(absGfrStr), 60);
        });
    });

    describe('1.8 Renal Tier Classification & Discordance Evaluation', () => {
        test('getRenalTier maps boundaries correctly across all 6 tiers', () => {
            assert.strictEqual(ABX_ENGINE.getRenalTier(80), 'crcl_gt_50');
            assert.strictEqual(ABX_ENGINE.getRenalTier(50), 'crcl_gt_50');
            assert.strictEqual(ABX_ENGINE.getRenalTier(49.9), 'crcl_30_50');
            assert.strictEqual(ABX_ENGINE.getRenalTier(30), 'crcl_30_50');
            assert.strictEqual(ABX_ENGINE.getRenalTier(29.9), 'crcl_10_29');
            assert.strictEqual(ABX_ENGINE.getRenalTier(10), 'crcl_10_29');
            assert.strictEqual(ABX_ENGINE.getRenalTier(9.9), 'crcl_lt_10');
            assert.strictEqual(ABX_ENGINE.getRenalTier(0), 'crcl_lt_10');
            assert.strictEqual(ABX_ENGINE.getRenalTier(20, true, false), 'hd');
            assert.strictEqual(ABX_ENGINE.getRenalTier(60, false, true), 'crrt');
        });

        test('evaluateDiscordance flags when CrCl and eGFR put patient in different renal tiers', () => {
            // CrCl = 42 (tier crcl_30_50), eGFR = 25 (tier crcl_10_29) -> Discordant
            const res = ABX_ENGINE.evaluateDiscordance(42, 25);
            const isDisc = typeof res === 'object' ? res.isDiscordant : res;
            assert.strictEqual(isDisc, true, 'CrCl 42 vs eGFR 25 must be flagged as discordant');
        });

        test('evaluateDiscordance returns false when CrCl and eGFR are in the same tier', () => {
            // CrCl = 75 (crcl_gt_50), eGFR = 85 (crcl_gt_50) -> Concordant
            const res = ABX_ENGINE.evaluateDiscordance(75, 85);
            const isDisc = typeof res === 'object' ? res.isDiscordant : res;
            assert.strictEqual(isDisc, false, 'CrCl 75 vs eGFR 85 must be concordant');
        });
    });
});

// ============================================================================
// TIER 2: STANFORD ANTIBIOTIC DOSING TIERS ACROSS >= 5 CORE DRUGS
// ============================================================================
describe('Tier 2: Stanford Antibiotic Dosing Tiers across Core Drugs & All 6 Renal Tiers', () => {
    const ALL_TIERS = ['crcl_gt_50', 'crcl_30_50', 'crcl_10_29', 'crcl_lt_10', 'hd', 'crrt'];

    // Drug 1: Ceftriaxone
    describe('2.1 Ceftriaxone (Dual Elimination - No Renal Adjustment)', () => {
        test('Ceftriaxone exists and contains all 6 renal tiers without dose reductions', () => {
            const drug = ABX_ENGINE.STANFORD_ABX_DB.ceftriaxone;
            assert.ok(drug, 'Ceftriaxone must exist in STANFORD_ABX_DB');
            assert.strictEqual(drug.class, '3rd Gen Cephalosporin');
            
            const tiers = drug.renalTiers || drug.renalDosing;
            assert.ok(tiers, 'Ceftriaxone must have renal tiers defined');
            ALL_TIERS.forEach(t => {
                assert.ok(tiers[t], `Ceftriaxone missing tier ${t}`);
            });

            // HD should explicitly state no supplemental dose needed
            assert.match(tiers.hd.postHD || tiers.hd.notes || '', /no supplemental|not dialyzable/i);
        });

        test('Ceftriaxone calculateDose retains standard dosing across normal, moderate, severe, and HD tiers', () => {
            const dNorm = ABX_ENGINE.calculateDose('ceftriaxone', 'crcl_gt_50', 'cap');
            const dSevere = ABX_ENGINE.calculateDose('ceftriaxone', 'crcl_lt_10', 'cap');
            const dHD = ABX_ENGINE.calculateDose('ceftriaxone', 'hd', 'cap');

            assert.strictEqual(dNorm.recommendedDose, '1-2g');
            assert.strictEqual(dNorm.interval, 'q24h');
            assert.strictEqual(dSevere.recommendedDose, '1-2g');
            assert.strictEqual(dSevere.interval, 'q24h');
            assert.strictEqual(dHD.recommendedDose, '1-2g');
            assert.strictEqual(dHD.interval, 'q24h');
        });
    });

    // Drug 2: Cefepime
    describe('2.2 Cefepime (Neurotoxicity Risk & Stepwise Renal Reduction)', () => {
        test('Cefepime exists and scales down frequency and dose across renal impairment tiers', () => {
            const drug = ABX_ENGINE.STANFORD_ABX_DB.cefepime;
            assert.ok(drug, 'Cefepime must exist');
            const tiers = drug.renalTiers || drug.renalDosing;

            // Tier 1: >50 -> 2g q8h
            assert.strictEqual(tiers.crcl_gt_50.dose, '2g');
            assert.strictEqual(tiers.crcl_gt_50.freq, 'q8h');

            // Tier 2: 30-50 -> 2g q12h
            assert.strictEqual(tiers.crcl_30_50.dose, '2g');
            assert.strictEqual(tiers.crcl_30_50.freq, 'q12h');

            // Tier 3: 10-29 -> 2g q24h
            assert.strictEqual(tiers.crcl_10_29.dose, '2g');
            assert.strictEqual(tiers.crcl_10_29.freq, 'q24h');

            // Tier 4: <10 -> 1g q24h
            assert.strictEqual(tiers.crcl_lt_10.dose, '1g');
            assert.strictEqual(tiers.crcl_lt_10.freq, 'q24h');

            // Tier 5: HD -> 1g q24h post-HD
            assert.strictEqual(tiers.hd.dose, '1g');
            assert.strictEqual(tiers.hd.freq, 'q24h');
            assert.match(tiers.hd.postHD || tiers.hd.notes || '', /post-HD/i);

            // Tier 6: CRRT -> 2g q12h
            assert.strictEqual(tiers.crrt.dose, '2g');
            assert.strictEqual(tiers.crrt.freq, 'q12h');

            // Safety notes must warn of Cefepime-induced neurotoxicity (CIN)
            assert.match(drug.safetyNotes || drug.clinicalNotes, /neurotox/i);
        });
    });

    // Drug 3: Ampicillin
    describe('2.3 Ampicillin (Listeria / Meningitis & Interval Extension)', () => {
        test('Ampicillin extends interval in renal failure and mandates post-HD dosing', () => {
            const drug = ABX_ENGINE.STANFORD_ABX_DB.ampicillin;
            assert.ok(drug, 'Ampicillin must exist');
            const tiers = drug.renalTiers || drug.renalDosing;

            assert.match(tiers.crcl_10_29.freq, /q8-12h|q12h/i);
            assert.match(tiers.crcl_lt_10.freq, /q12-24h|q24h/i);
            assert.strictEqual(tiers.hd.freq, 'q24h');
            assert.match(tiers.hd.postHD || tiers.hd.notes || '', /post-HD/i);
        });
    });

    // Drug 4: Levofloxacin
    describe('2.4 Levofloxacin (Loading Dose Preservation & Interval Extension)', () => {
        test('Levofloxacin retains loading dose of 750mg then shifts to q48h for CrCl < 50', () => {
            const drug = ABX_ENGINE.STANFORD_ABX_DB.levofloxacin;
            assert.ok(drug, 'Levofloxacin must exist');
            const tiers = drug.renalTiers || drug.renalDosing;

            // CrCl > 50: 750mg q24h
            assert.strictEqual(tiers.crcl_gt_50.freq, 'q24h');

            // CrCl 30-50, 10-29, <10: extended interval q48h with loading dose
            assert.strictEqual(tiers.crcl_30_50.freq, 'q48h');
            assert.strictEqual(tiers.crcl_10_29.freq, 'q48h');
            assert.strictEqual(tiers.crcl_lt_10.freq, 'q48h');
            assert.match(tiers.crcl_30_50.dose, /750mg.*500mg/i);

            // Hemodialysis: 750mg initial then 500mg q48h post-HD
            assert.strictEqual(tiers.hd.freq, 'q48h');
            assert.match(tiers.hd.postHD || tiers.hd.notes || '', /post-HD/i);
        });
    });

    // Drug 5: Meropenem
    describe('2.5 Meropenem (Carbapenem Clearance & Valproic Acid Interaction)', () => {
        test('Meropenem scales from 1g q8h down to 500mg q24h across renal tiers', () => {
            const drug = ABX_ENGINE.STANFORD_ABX_DB.meropenem;
            assert.ok(drug, 'Meropenem must exist in STANFORD_ABX_DB');
            const tiers = drug.renalTiers || drug.renalDosing;

            // CrCl > 50: 1g q8h
            assert.strictEqual(tiers.crcl_gt_50.dose, '1g');
            assert.strictEqual(tiers.crcl_gt_50.freq, 'q8h');

            // CrCl 30-50: 1g q12h
            assert.strictEqual(tiers.crcl_30_50.dose, '1g');
            assert.strictEqual(tiers.crcl_30_50.freq, 'q12h');

            // CrCl 10-29: 500mg q12h
            assert.strictEqual(tiers.crcl_10_29.dose, '500mg');
            assert.strictEqual(tiers.crcl_10_29.freq, 'q12h');

            // CrCl < 10: 500mg q24h
            assert.strictEqual(tiers.crcl_lt_10.dose, '500mg');
            assert.strictEqual(tiers.crcl_lt_10.freq, 'q24h');

            // HD: 500mg q24h post-HD
            assert.strictEqual(tiers.hd.dose, '500mg');
            assert.strictEqual(tiers.hd.freq, 'q24h');
            assert.match(tiers.hd.postHD || tiers.hd.notes || '', /post-HD/i);

            // CRRT: 1g q8h or 1g q12h
            assert.strictEqual(tiers.crrt.dose, '1g');

            // Safety warning must flag valproic acid contraindication
            assert.match(drug.safetyNotes || drug.clinicalNotes, /valproic acid/i);
        });
    });

    // Drug 6: Piperacillin / Tazobactam
    describe('2.6 Piperacillin / Tazobactam (Extended Infusion & Vancomycin Synergy)', () => {
        test('Pip/Tazo renal tiers support extended infusion and post-HD redosing', () => {
            const drug = ABX_ENGINE.STANFORD_ABX_DB.pip_tazo;
            assert.ok(drug, 'Piperacillin/Tazobactam must exist in STANFORD_ABX_DB');
            const tiers = drug.renalTiers || drug.renalDosing;

            // CrCl > 50: 4.5g q8h (over 4h) or 3.375g q6h
            assert.match(tiers.crcl_gt_50.dose, /4.5g|3.375g/);
            assert.match(tiers.crcl_gt_50.freq, /q8h|q6h/);

            // CrCl 30-50: 3.375g q8h (over 4h)
            assert.strictEqual(tiers.crcl_30_50.dose, '3.375g');
            assert.strictEqual(tiers.crcl_30_50.freq, 'q8h');

            // CrCl 10-29: 2.25g q8h
            assert.strictEqual(tiers.crcl_10_29.dose, '2.25g');
            assert.strictEqual(tiers.crcl_10_29.freq, 'q8h');

            // CrCl < 10: 2.25g q12h
            assert.strictEqual(tiers.crcl_lt_10.dose, '2.25g');
            assert.strictEqual(tiers.crcl_lt_10.freq, 'q12h');

            // HD: 2.25g q12h post-HD
            assert.strictEqual(tiers.hd.dose, '2.25g');
            assert.match(tiers.hd.postHD || tiers.hd.notes || '', /post-HD/i);

            // Safety: synergistic nephrotoxicity with vancomycin
            assert.match(drug.safetyNotes || drug.clinicalNotes, /vancomycin.*nephrotox|nephrotoxicity/i);
        });
    });

    // Drug 7: Vancomycin
    describe('2.7 Vancomycin (TBW Loading Dose & TDM Targets)', () => {
        test('Vancomycin mandates loading dose based on TBW regardless of renal function', () => {
            const drug = ABX_ENGINE.STANFORD_ABX_DB.vancomycin;
            assert.ok(drug, 'Vancomycin must exist in STANFORD_ABX_DB');
            const tiers = drug.renalTiers || drug.renalDosing;

            // Loading dose rule
            assert.match(drug.safetyNotes || drug.clinicalNotes || tiers.crcl_gt_50.notes || '', /loading dose.*25-30 mg\/kg.*TBW|actual/i);

            // HD post-dialysis dosing
            assert.match(tiers.hd.postHD || tiers.hd.notes || '', /post-HD|post-dialysis/i);
        });
    });
});

// ============================================================================
// TIER 3: DISEASE-SPECIFIC DOSING & INDICATION FILTERING
// ============================================================================
describe('Tier 3: Disease-Specific Dosing & Indication Filtering', () => {

    describe('3.1 Indication Directory Coverage', () => {
        const REQUIRED_INDICATIONS = [
            'cap',
            'hap_vap',
            'uti_cystitis',
            'uti_pyelo',
            'meningitis_ca',
            'osteo_native',
            'intra_abdominal'
        ];

        test('All required clinical indications are registered in DISEASE_PROTOCOLS', () => {
            REQUIRED_INDICATIONS.forEach(indId => {
                const protocol = ABX_ENGINE.DISEASE_PROTOCOLS[indId];
                assert.ok(protocol, `Indication ${indId} must exist in DISEASE_PROTOCOLS`);
                assert.ok(protocol.name, `Indication ${indId} must have a clinical name`);
                assert.ok(protocol.firstLine || protocol.primaryDrugs, `Indication ${indId} must have primary/first-line drugs`);
            });
        });
    });

    describe('3.2 Indication-Specific High-Dose CNS Overrides (Meningitis vs Standard)', () => {
        test('Ceftriaxone in Meningitis mandates 2g q12h (4g/day) vs CAP/UTI standard 1-2g q24h', () => {
            // Meningitis CNS penetrance dosing
            const meningDose = ABX_ENGINE.calculateDose('ceftriaxone', 'crcl_gt_50', 'meningitis_ca');
            assert.strictEqual(meningDose.recommendedDose, '2g', 'Meningitis Ceftriaxone must be 2g');
            assert.strictEqual(meningDose.interval, 'q12h', 'Meningitis Ceftriaxone must be q12h');

            // CAP standard dosing
            const capDose = ABX_ENGINE.calculateDose('ceftriaxone', 'crcl_gt_50', 'cap');
            assert.strictEqual(capDose.recommendedDose, '1-2g');
            assert.strictEqual(capDose.interval, 'q24h');

            // UTI standard dosing
            const utiDose = ABX_ENGINE.calculateDose('ceftriaxone', 'crcl_gt_50', 'uti_pyelo');
            assert.strictEqual(utiDose.recommendedDose, '1-2g');
            assert.strictEqual(utiDose.interval, 'q24h');
        });

        test('Meropenem in Meningitis mandates high-dose 2g q8h vs Sepsis standard 1g q8h', () => {
            // Meningitis CNS dose
            const meningDose = ABX_ENGINE.calculateDose('meropenem', 'crcl_gt_50', 'meningitis_ca');
            assert.strictEqual(meningDose.recommendedDose, '2g', 'Meningitis Meropenem must be 2g');
            assert.strictEqual(meningDose.interval, 'q8h');

            // Sepsis / IAI standard dose
            const sepsisDose = ABX_ENGINE.calculateDose('meropenem', 'crcl_gt_50', 'intra_abdominal');
            assert.strictEqual(sepsisDose.recommendedDose, '1g', 'Standard Meropenem should be 1g');
            assert.strictEqual(sepsisDose.interval, 'q8h');
        });

        test('Ampicillin in Meningitis mandates 2g q4h for Listeria monocytogenes coverage', () => {
            const ampDose = ABX_ENGINE.calculateDose('ampicillin', 'crcl_gt_50', 'meningitis_ca');
            assert.strictEqual(ampDose.recommendedDose, '2g');
            assert.strictEqual(ampDose.interval, 'q4h');
        });

        test('Cefepime in HAP/VAP specifies 2g q8h with extended infusion', () => {
            const cefDose = ABX_ENGINE.calculateDose('cefepime', 'crcl_gt_50', 'hap_vap');
            assert.strictEqual(cefDose.recommendedDose, '2g');
            assert.strictEqual(cefDose.interval, 'q8h');
            assert.match(cefDose.infusion || '', /4-hour|extended|3-4/i);
        });
    });

    describe('3.3 Indication Filtering Engine', () => {
        test('filterByIndication("cap") returns Ceftriaxone as 1st Line and Levofloxacin as Alternative', () => {
            const drugs = ABX_ENGINE.filterByIndication('cap');
            assert.ok(drugs.length >= 2, 'CAP must include multiple antibiotic options');
            
            const ceft = drugs.find(d => d.drugId === 'ceftriaxone');
            assert.ok(ceft, 'Ceftriaxone must be returned for CAP');
            assert.strictEqual(ceft.role, '1st Line');
            assert.strictEqual(ceft.dose, '1-2g');
            assert.strictEqual(ceft.interval, 'q24h');

            const levo = drugs.find(d => d.drugId === 'levofloxacin');
            assert.ok(levo, 'Levofloxacin must be returned for CAP');
            assert.strictEqual(levo.role, 'Alternative');
            assert.strictEqual(levo.dose, '750mg');
            assert.strictEqual(levo.interval, 'q24h');
        });

        test('filterByIndication calculates renal-adjusted doses when renal status is provided', () => {
            // Patient with CrCl 20 mL/min (crcl_10_29) having HAP/VAP
            const drugs = ABX_ENGINE.filterByIndication('hap_vap', 20);
            const cefepime = drugs.find(d => d.drugId === 'cefepime');
            assert.ok(cefepime, 'Cefepime should be present in HAP/VAP');
            // For CrCl 20, Cefepime should be adjusted to 2g q24h
            assert.strictEqual(cefepime.dose, '2g');
            assert.strictEqual(cefepime.interval, 'q24h');
        });

        test('filterByIndication returns empty array for nonexistent indication', () => {
            assert.deepStrictEqual(ABX_ENGINE.filterByIndication('invalid_xyz_indication'), []);
        });
    });
});

// ============================================================================
// TIER 4: REAL-WORLD CLINICAL SCENARIOS, BOUNDARY CONDITIONS & SAFETY INVARIANTS
// ============================================================================
describe('Tier 4: Real-World Clinical Scenarios, Boundary Conditions & Safety Invariants', () => {

    // Scenario 1: Septic Shock with Acute Kidney Injury (AKI) on Pip/Tazo
    test('Scenario 1: Septic shock with acute renal failure preserves loading dose then adjusts interval', () => {
        // 68yo male, 80kg, 175cm, SCr spiked to 2.8 mg/dL (AKI)
        const pt = { age: 68, sex: 'M', weightKg: 80, heightCm: 175, scr: 2.8 };
        const renal = ABX_ENGINE.calcCrCl(pt);
        assert.ok(renal.crcl < 30 && renal.crcl >= 10, `CrCl should be in 10-29 range, got ${renal.crcl}`);

        // Dose for Pip/Tazo in severe sepsis
        const dosing = ABX_ENGINE.calculateDose('pip_tazo', renal.crcl, 'hap_vap');
        assert.strictEqual(dosing.recommendedDose, '2.25g', 'Renal maintenance dose for Pip/Tazo at CrCl 10-29 is 2.25g');
        assert.strictEqual(dosing.interval, 'q8h');
        assert.match(dosing.infusion, /4-hour|extended/i, 'Beta-lactams in septic shock must use extended infusion');
    });

    // Scenario 2: Bacterial Meningitis in Young Adult (CNS Penetrance)
    test('Scenario 2: Bacterial meningitis receives high-dose Ceftriaxone & Meropenem despite normal CrCl', () => {
        // 28yo female, 55kg, 165cm, SCr 0.7 mg/dL
        const pt = { age: 28, sex: 'F', weightKg: 55, heightCm: 165, scr: 0.7 };
        const renal = ABX_ENGINE.calcCrCl(pt);
        assert.ok(renal.crcl > 100, `CrCl should be normal (>100), got ${renal.crcl}`);

        const ceft = ABX_ENGINE.calculateDose('ceftriaxone', renal.crcl, 'meningitis_ca');
        assert.strictEqual(ceft.recommendedDose, '2g');
        assert.strictEqual(ceft.interval, 'q12h');

        const mero = ABX_ENGINE.calculateDose('meropenem', renal.crcl, 'meningitis_ca');
        assert.strictEqual(mero.recommendedDose, '2g');
        assert.strictEqual(mero.interval, 'q8h');
    });

    // Scenario 3: Morbid Obesity with Pyelonephritis (AdjBW Selection)
    test('Scenario 3: Morbidly obese female (BMI > 50) triggers AdjBW, preventing massive overdose', () => {
        // 45yo female, 135kg, 160cm (BMI ~52.7), SCr 1.2 mg/dL
        const pt = { age: 45, sex: 'F', weightKg: 135, heightCm: 160, scr: 1.2 };
        const renal = ABX_ENGINE.calcCrCl(pt);

        // Verify AdjBW is triggered
        assert.strictEqual(renal.weightType, 'ABW', 'BMI > 50 must trigger ABW');
        assert.ok(renal.weightUsed < 95 && renal.weightUsed > 75, `AdjBW should be ~85 kg, got ${renal.weightUsed}`);

        // If TBW (135 kg) were used, CrCl would be falsely high (~126 mL/min); with AdjBW (85.4 kg) it is ~79.8 mL/min
        assert.ok(renal.crcl < 90 && renal.crcl > 70, `CrCl with AdjBW should be ~79.8 mL/min, got ${renal.crcl}`);

        const cefepime = ABX_ENGINE.calculateDose('cefepime', renal.crcl, 'uti_pyelo');
        assert.ok(cefepime, 'Cefepime dosing must be returned');
        assert.match(cefepime.warnings, /neurotox/i, 'Cefepime must carry neurotoxicity warning in impaired renal function');
    });

    // Scenario 4: Sarcopenic Elderly Patient (Low SCr Caveat)
    test('Scenario 4: Cachectic elderly female with low SCr (0.4 mg/dL) uses TBW and identifies low muscle mass', () => {
        // 88yo female, 42kg (< IBW), 150cm, SCr 0.4 mg/dL
        const pt = { age: 88, sex: 'F', weightKg: 42, heightCm: 150, scr: 0.4 };
        const renal = ABX_ENGINE.calcCrCl(pt);

        // Underweight must use TBW (42 kg), not IBW (45.5 kg)
        assert.strictEqual(renal.weightType, 'TBW', 'Underweight cachectic patient must use TBW');
        assert.strictEqual(renal.weightUsed, 42);
        assert.ok(renal.crcl > 0);
    });

    // Scenario 5: End-Stage Renal Disease on Intermittent Hemodialysis
    test('Scenario 5: Hemodialysis patient receives post-HD dosing for dialyzable drugs', () => {
        const cefHD = ABX_ENGINE.calculateDose('cefepime', { rrt: 'hd' }, 'hap_vap');
        assert.strictEqual(cefHD.recommendedDose, '1g');
        assert.strictEqual(cefHD.interval, 'q24h');
        assert.match(cefHD.postHD || cefHD.adjustments, /post-HD/i, 'Must specify post-HD dosing');

        const meroHD = ABX_ENGINE.calculateDose('meropenem', { rrt: 'hd' }, 'hap_vap');
        assert.strictEqual(meroHD.recommendedDose, '500mg');
        assert.strictEqual(meroHD.interval, 'q24h');
        assert.match(meroHD.postHD || meroHD.adjustments, /post-HD/i);
    });

    // Scenario 6: Zero-PHI Prescription Note Audit & Explicit Clinical Units
    test('Scenario 6: formatPrescriptionNote strictly preserves Zero-PHI and includes explicit units', () => {
        const note = ABX_ENGINE.formatPrescriptionNote({
            patient: { age: 65, sex: 'M', weightKg: 75, heightCm: 172, scr: 1.4 },
            weightType: 'IBW',
            crcl: 46.2,
            egfr: 49.5,
            drugId: 'cefepime',
            indicationId: 'hap_vap',
            doseStr: '2g',
            freqStr: 'q12h',
            infStr: 'over 4 hours',
            noteStr: 'Target trough and EEG monitoring if encephalopathic.'
        });

        // Clinical invariants
        assert.match(note, /Stanford Protocol/i);
        assert.match(note, /Cefepime 2g q12h IV over 4 hours/i);
        assert.match(note, /CrCl \(Cockcroft-Gault\): 46.2 mL\/min/i);
        assert.match(note, /eGFR \(CKD-EPI 2021\): 49.5 mL\/min/i);
        assert.match(note, /Age 65 yr \| Sex M \| Wt 75 kg/i);

        // Zero-PHI compliance (HIPAA / PDPA): NO names, hospital numbers, citizen IDs
        assert.doesNotMatch(note, /HN[:\s]/i, 'Prescription note must not contain HN');
        assert.doesNotMatch(note, /CitizenID/i, 'Prescription note must not contain Citizen ID');
        assert.doesNotMatch(note, /PatientName|Full Name/i, 'Prescription note must not contain patient name');
        assert.doesNotMatch(note, /DOB|Birth/i, 'Prescription note must not contain DOB');
    });
});
