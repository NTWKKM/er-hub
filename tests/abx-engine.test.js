const { describe, test } = require('node:test');
const assert = require('node:assert');
const ABX_ENGINE = require('../shared/abx-engine');

describe('ABX_ENGINE Anthropometrics', () => {
    test('calcIBW for Male', () => {
        let ibw = ABX_ENGINE.calcIBW(177.8, 'M');
        assert.ok(Math.abs(ibw - (50 + 2.3 * 10)) < 1);
    });

    test('calcIBW for Female', () => {
        let ibw = ABX_ENGINE.calcIBW(165.1, 'F');
        assert.ok(Math.abs(ibw - (45.5 + 2.3 * 5)) < 1);
    });

    test('calcABW', () => {
        let abw = ABX_ENGINE.calcABW(100, 50);
        assert.strictEqual(abw, 50 + 0.4 * 50);
    });

    test('calcBSA Mosteller', () => {
        let bsa = ABX_ENGINE.calcBSA(70, 170);
        assert.ok(Math.abs(bsa - Math.sqrt((170 * 70) / 3600)) < 0.1);
    });
});

describe('ABX_ENGINE Renal Evaluator', () => {
    test('calcCrCl Cockcroft-Gault normal weight', () => {
        let res = ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 70, heightCm: 177.8, scr: 1.0 });
        assert.strictEqual(res.weightType, 'TBW');
        assert.ok(Math.abs(res.crcl - (((140 - 60) * 70) / 72)) < 1);
    });

    test('calcCrCl Cockcroft-Gault obese', () => {
        let res = ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 100, heightCm: 170, scr: 1.0 });
        assert.strictEqual(res.weightType, 'ABW');
        assert.ok(Math.abs(res.crcl - (((140 - 60) * res.abw) / 72)) < 1);
    });

    test('calcEGFR_CKD_EPI_2021', () => {
        let egfr = ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'M');
        assert.ok(egfr > 60 && egfr < 100);

        // Validates and coerces valid strings
        let egfrStr = ABX_ENGINE.calcEGFR_CKD_EPI_2021('1.0', '60', 'M');
        assert.strictEqual(Math.round(Number(egfrStr)), Math.round(Number(egfr)));

        // Rejects non-positive or non-finite numbers
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(0, 60, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(-1, 60, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 0, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, -10, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(NaN, 60, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(Infinity, 60, 'M'), null);

        // Rejects booleans and blank strings
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(true, 60, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, false, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021('', 60, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021('   ', 60, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, '  ', 'M'), null);

        // Rejects invalid sex
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'X'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, null), null);
    });

    test('evaluateDiscordance interprets numeric 3rd argument as BSA and object absGfr directly', () => {
        // Numeric 3rd argument treated strictly as BSA:
        // CrCl 42 (tier 30-50), eGFR 25 mL/min/1.73m², BSA 1.8 m²
        // Absolute GFR = 25 * (1.8 / 1.73) = 26.01 mL/min (tier 10-29) -> Discordant
        const discNumBSA = ABX_ENGINE.evaluateDiscordance(42, 25, 1.8);
        assert.strictEqual(discNumBSA.isDiscordant, true);
        assert.strictEqual(discNumBSA.tierCrCl, 'crcl_30_50');
        assert.strictEqual(discNumBSA.tierEGFR, 'crcl_10_29');

        // Object with absGfr < 4: used directly without recalculating from egfrVal
        // CrCl 20 (crcl_10_29), eGFR 30, absGfr 3 (crcl_lt_10) -> Discordant
        const discLowAbsGfr = ABX_ENGINE.evaluateDiscordance(20, 30, { absGfr: 3 });
        assert.strictEqual(discLowAbsGfr.isDiscordant, true);
        assert.strictEqual(discLowAbsGfr.tierCrCl, 'crcl_10_29');
        assert.strictEqual(discLowAbsGfr.tierEGFR, 'crcl_lt_10');
    });
});

describe('ABX_ENGINE Indications', () => {
    test('getDrugsForIndication CAP', () => {
        let drugs = ABX_ENGINE.getDrugsForIndication('cap');
        assert.ok(drugs.length > 0);
        let ceftriaxone = drugs.find(d => d.drugId === 'ceftriaxone');
        assert.ok(ceftriaxone !== undefined);
        assert.strictEqual(ceftriaxone.indicationInfo.defaultDose, '1-2g');
    });
});

describe('ABX_ENGINE calculateDualDose (CrCl vs eGFR)', () => {
    test('calculateDualDose returns concordant doses when CrCl and eGFR tiers match', () => {
        // Patient with CrCl ~ 75, eGFR ~ 85 (both tier > 50)
        const pt = { age: 45, sex: 'M', weightKg: 70, heightCm: 175, scr: 1.0 };
        const res = ABX_ENGINE.calculateDualDose('meropenem', pt);
        assert.ok(res !== null);
        assert.strictEqual(res.tierCrCl, 'crcl_gt_50');
        assert.strictEqual(res.tierEGFR, 'crcl_gt_50');
        assert.strictEqual(res.isDoseDiscordant, false);
        assert.strictEqual(res.doseCrCl.recommendedDose, '1g');
        assert.strictEqual(res.doseCrCl.interval, 'q8h');
        assert.strictEqual(res.doseEGFR.recommendedDose, '1g');
        assert.strictEqual(res.doseEGFR.interval, 'q8h');
    });

    test('calculateDualDose flags discordant doses and provides clinical guidance', () => {
        // Cachectic elderly female: Age 82, Wt 42kg, Ht 150cm, SCr 1.2
        // CrCl ~ 21.6 mL/min (Tier 10-29) vs eGFR ~ 43.5 mL/min/1.73m² (Tier 30-50)
        const pt = { age: 82, sex: 'F', weightKg: 42, heightCm: 150, scr: 1.2 };
        const res = ABX_ENGINE.calculateDualDose('cefepime', pt);
        assert.ok(res !== null);
        assert.strictEqual(res.tierCrCl, 'crcl_10_29');
        assert.strictEqual(res.tierEGFR, 'crcl_30_50');
        assert.strictEqual(res.isTierDiscordant, true);
        assert.strictEqual(res.isDoseDiscordant, true);
        assert.strictEqual(res.doseCrCl.recommendedDose, '2g');
        assert.strictEqual(res.doseCrCl.interval, 'q24h');
        assert.strictEqual(res.doseEGFR.recommendedDose, '2g');
        assert.strictEqual(res.doseEGFR.interval, 'q12h');
        assert.ok(res.discordanceAdvice.includes('Beta-lactam'));
    });

    test('calculateDualDose tiers eGFR on absolute GFR when available (e.g. eGFR 55 with absGFR 42.6 selecting crcl_30_50)', () => {
        // Patient with CrCl 60 (tier > 50), eGFR 55, absolute GFR 42.6 (tier 30-50)
        const pt = {
            crcl: 60,
            egfr: 55,
            absGfr: 42.6,
            weightKg: 50
        };
        const res = ABX_ENGINE.calculateDualDose('cefepime', pt);
        assert.ok(res !== null);
        assert.strictEqual(res.tierCrCl, 'crcl_gt_50');
        assert.strictEqual(res.tierEGFR, 'crcl_30_50', 'Absolute GFR 42.6 must select crcl_30_50 instead of crcl_gt_50');
        assert.strictEqual(res.isTierDiscordant, true);
        assert.strictEqual(res.isDoseDiscordant, true);
        assert.strictEqual(res.doseCrCl.recommendedDose, '2g');
        assert.strictEqual(res.doseCrCl.interval, 'q8h');
        assert.strictEqual(res.doseEGFR.recommendedDose, '2g');
        assert.strictEqual(res.doseEGFR.interval, 'q12h');
    });

    test('calculateDualDose derives absolute GFR from BSA when absGfr is absent (e.g. eGFR 55 with BSA 1.34 selecting crcl_30_50)', () => {
        // Patient with CrCl 60, eGFR 55, BSA 1.34 (no explicit absGfr)
        // Absolute GFR = (55 * 1.34) / 1.73 ≈ 42.60 mL/min -> selects crcl_30_50
        const pt = {
            crcl: 60,
            egfr: 55,
            bsa: 1.34
        };
        const res = ABX_ENGINE.calculateDualDose('cefepime', pt);
        assert.ok(res !== null);
        assert.strictEqual(res.tierCrCl, 'crcl_gt_50');
        assert.strictEqual(res.tierEGFR, 'crcl_30_50', 'Derived absolute GFR ~42.6 must select crcl_30_50');
        assert.strictEqual(res.isTierDiscordant, true);
        assert.strictEqual(res.isDoseDiscordant, true);
        assert.strictEqual(res.doseCrCl.recommendedDose, '2g');
        assert.strictEqual(res.doseCrCl.interval, 'q8h');
        assert.strictEqual(res.doseEGFR.recommendedDose, '2g');
        assert.strictEqual(res.doseEGFR.interval, 'q12h');
    });

    test('calculateDualDose renders valid zero clearance as 0.0 in discordanceAdvice instead of --', () => {
        const pt = {
            crcl: 60,
            egfr: 0,
            bsa: 1.73
        };
        const res = ABX_ENGINE.calculateDualDose('levofloxacin', pt);
        assert.ok(res !== null);
        assert.strictEqual(res.isDoseDiscordant, true);
        assert.ok(res.discordanceAdvice.includes('CrCl (60.0 mL/min [crcl_gt_50])'));
        assert.ok(res.discordanceAdvice.includes('eGFR (0.0 mL/min/1.73m² [crcl_lt_10])'));
        assert.ok(!res.discordanceAdvice.includes('--'));
    });

    test('calculateDualDose safely parses renal values, rejecting booleans, blank strings, and non-finite values as unknown rather than zero', () => {
        // Patient with booleans and empty strings
        const pt = {
            crcl: false,
            egfr: '   ',
            absGfr: true,
            bsa: ''
        };
        const res = ABX_ENGINE.calculateDualDose('cefepime', pt);
        assert.ok(res !== null);
        assert.strictEqual(res.tierCrCl, 'unknown');
        assert.strictEqual(res.tierEGFR, 'unknown');
        assert.strictEqual(res.doseCrCl, null);
        assert.strictEqual(res.doseEGFR, null);
    });

    test('calcCrCl rejects infinite, boolean, and non-finite values returning null', () => {
        // Infinite values
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: Infinity, sex: 'M', weightKg: 70, scr: 1.0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: Infinity, scr: 1.0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 70, scr: Infinity }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: -Infinity, sex: 'M', weightKg: 70, scr: 1.0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: NaN, sex: 'M', weightKg: 70, scr: 1.0 }), null);

        // Booleans
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: true, sex: 'M', weightKg: 70, scr: 1.0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: false, scr: 1.0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 70, scr: true }), null);

        // Downstream calculation guards
        assert.strictEqual(ABX_ENGINE.calculateDose('meropenem', { age: Infinity, sex: 'M', weightKg: 70, scr: 1.0 }), null);
        const dualRes = ABX_ENGINE.calculateDualDose('meropenem', { age: Infinity, sex: 'M', weightKg: 70, scr: 1.0 });
        assert.strictEqual(dualRes.tierCrCl, 'unknown');
        assert.strictEqual(dualRes.doseCrCl, null);
    });

    test('evaluateDiscordance modern contract validates clearance values, rejects non-finite/booleans/negatives, and preserves fallback to egfrVal', () => {
        // CrCl validation before tier selection:
        // Invalid or negative crcl maps to unknown tier and does not flag discordance
        const invalidCrClBool = ABX_ENGINE.evaluateDiscordance(true, 30);
        assert.strictEqual(invalidCrClBool.tierCrCl, 'unknown');
        assert.strictEqual(invalidCrClBool.isDiscordant, false);
        assert.strictEqual(invalidCrClBool.clinicalAdvice, '');

        const invalidCrClNeg = ABX_ENGINE.evaluateDiscordance(-5, 30);
        assert.strictEqual(invalidCrClNeg.tierCrCl, 'unknown');
        assert.strictEqual(invalidCrClNeg.isDiscordant, false);
        assert.strictEqual(invalidCrClNeg.clinicalAdvice, '');

        const invalidCrClInf = ABX_ENGINE.evaluateDiscordance(Infinity, 30);
        assert.strictEqual(invalidCrClInf.tierCrCl, 'unknown');
        assert.strictEqual(invalidCrClInf.isDiscordant, false);

        // Explicit absGfr validation & fallback preservation:
        // CrCl 20 (tier 10-29), eGFR 30 (tier 30-50)
        // Invalid absGfr values (boolean, negative, blank, non-finite) MUST fallback to eGFR 30 -> discordant with CrCl 20
        const discBool = ABX_ENGINE.evaluateDiscordance(20, 30, { absGfr: true });
        assert.strictEqual(discBool.tierEGFR, 'crcl_30_50', 'Boolean absGfr must fallback to eGFR');
        assert.strictEqual(discBool.isDiscordant, true);

        const discBlank = ABX_ENGINE.evaluateDiscordance(20, 30, { absGfr: '   ' });
        assert.strictEqual(discBlank.tierEGFR, 'crcl_30_50', 'Blank string absGfr must fallback to eGFR');
        assert.strictEqual(discBlank.isDiscordant, true);

        const discNeg = ABX_ENGINE.evaluateDiscordance(20, 30, { absGfr: -10 });
        assert.strictEqual(discNeg.tierEGFR, 'crcl_30_50', 'Negative absGfr must fallback to eGFR');
        assert.strictEqual(discNeg.isDiscordant, true);

        const discInf = ABX_ENGINE.evaluateDiscordance(20, 30, { absGfr: Infinity });
        assert.strictEqual(discInf.tierEGFR, 'crcl_30_50', 'Infinite absGfr must fallback to eGFR');
        assert.strictEqual(discInf.isDiscordant, true);

        // Valid absGfr values (>= 0 and finite numbers or nonblank strings) are accepted:
        const discZero = ABX_ENGINE.evaluateDiscordance(20, 30, { absGfr: 0 });
        assert.strictEqual(discZero.tierEGFR, 'crcl_lt_10', 'absGfr 0 must be accepted as crcl_lt_10');
        assert.strictEqual(discZero.isDiscordant, true);

        const discStr = ABX_ENGINE.evaluateDiscordance(20, 30, { absGfr: '20' });
        assert.strictEqual(discStr.tierEGFR, 'crcl_10_29', 'absGfr string "20" must be parsed as 20');
        assert.strictEqual(discStr.isDiscordant, false);
    });

    test('evaluateDiscordance legacy contract validates values before explicit tier matching and preserves fallback to egfr', () => {
        const tiers = [
            { min: 0, max: 29.99 },
            { min: 30, max: 100 }
        ];

        // CrCl validation rejects booleans, negatives, non-finite
        assert.strictEqual(ABX_ENGINE.evaluateDiscordance(true, 50, null, tiers), false);
        assert.strictEqual(ABX_ENGINE.evaluateDiscordance(-5, 50, null, tiers), false);
        assert.strictEqual(ABX_ENGINE.evaluateDiscordance(Infinity, 50, null, tiers), false);

        // Legacy absGfr validation: invalid absGfr must fallback to egfr
        // CrCl 40 (tier 1), eGFR 40 (tier 1). If absGfr is true, without fallback it would coerce to 1 (tier 0) and falsely report discordance.
        assert.strictEqual(
            ABX_ENGINE.evaluateDiscordance(40, 40, { absGfr: true }, tiers),
            false,
            'Boolean absGfr must fallback to eGFR and remain concordant'
        );
        assert.strictEqual(
            ABX_ENGINE.evaluateDiscordance(40, 40, { absGfr: -5 }, tiers),
            false,
            'Negative absGfr must fallback to eGFR and remain concordant'
        );
        assert.strictEqual(
            ABX_ENGINE.evaluateDiscordance(40, 40, { absGfr: '   ' }, tiers),
            false,
            'Blank string absGfr must fallback to eGFR and remain concordant'
        );

        // Valid absGfr in legacy is honored: absGfr 20 (tier 0) vs CrCl 40 (tier 1) -> discordant
        assert.strictEqual(
            ABX_ENGINE.evaluateDiscordance(40, 40, { absGfr: 20 }, tiers),
            true,
            'Valid explicit absGfr 20 must produce discordance with CrCl 40'
        );
    });
});


