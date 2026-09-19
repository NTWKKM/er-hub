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
});

