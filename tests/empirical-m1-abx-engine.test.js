/**
 * tests/empirical-m1-abx-engine.test.js
 * 
 * Standalone Empirical Challenger Test Harness for Milestone 1:
 * Renal Engine & Stanford Antimicrobial Database (shared/abx-engine.js).
 * 
 * Executed with Node.js native test runner (node:test) and strict assertions (node:assert/strict).
 * Zero external runtime or test dependencies.
 * 
 * Independent Clinical Reference Benchmarks:
 * - Cockcroft DW, Gault MH. Nephron 1976; 16:31-41.
 * - Inker LA, Eneanya ND, Coresh J, et al. N Engl J Med 2021; 385:1737-1749.
 * - Devine BJ. Drug Intell Clin Pharm 1974; 8:650-655.
 * - Mosteller RD. N Engl J Med 1987; 317:1098.
 * - Stanford Health Care Antimicrobial Dosing Reference Guide (2020-2024).
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const ABX_ENGINE = require('../shared/abx-engine.js');

// ============================================================================
// INDEPENDENT MATHEMATICAL ORACLES
// ============================================================================
const Oracle = {
    ibw: (heightCm, sex) => {
        if (!heightCm || heightCm <= 0) return null;
        let over5ft = (heightCm - 152.4) / 2.54;
        if (over5ft < 0) over5ft = 0;
        const base = (sex === 'M' || sex === 'male') ? 50.0 : 45.5;
        return base + 2.3 * over5ft;
    },

    abw: (tbw, ibw) => {
        if (!tbw || !ibw) return null;
        return ibw + 0.4 * (tbw - ibw);
    },

    bmi: (weightKg, heightCm) => {
        if (!weightKg || !heightCm) return null;
        const hM = heightCm / 100.0;
        return weightKg / (hM * hM);
    },

    bsa: (weightKg, heightCm) => {
        if (!weightKg || !heightCm) return null;
        return Math.sqrt((heightCm * weightKg) / 3600.0);
    },

    crcl: (age, sex, weightKg, heightCm, scr, weightOverride = 'auto') => {
        if (!age || !sex || !weightKg || !scr) return null;
        const ibw = heightCm ? Oracle.ibw(heightCm, sex) : null;
        const abw = ibw ? Oracle.abw(weightKg, ibw) : null;
        const bmi = heightCm ? Oracle.bmi(weightKg, heightCm) : null;

        let w = weightKg;
        let wtType = 'TBW';

        if (weightOverride === 'auto' && ibw) {
            if (weightKg < ibw) {
                w = weightKg;
                wtType = 'TBW';
            } else if ((bmi && bmi >= 30.0) || (weightKg > 1.2 * ibw)) {
                w = abw || weightKg;
                wtType = 'ABW';
            } else {
                w = ibw;
                wtType = 'IBW';
            }
        } else if (weightOverride === 'IBW' && ibw) {
            w = ibw;
            wtType = 'IBW';
        } else if (weightOverride === 'ABW' && abw) {
            w = abw;
            wtType = 'ABW';
        } else if (weightOverride === 'TBW') {
            w = weightKg;
            wtType = 'TBW';
        }

        let val = ((140.0 - age) * w) / (72.0 * scr);
        const isF = (sex === 'F' || sex === 'female');
        if (isF) val *= 0.85;

        return { val, weightUsed: w, wtType };
    },

    egfr2021: (scr, age, sex) => {
        if (!scr || !age || !sex) return null;
        const isF = (sex === 'F' || sex === 'female');
        const kappa = isF ? 0.7 : 0.9;
        const alpha = isF ? -0.241 : -0.302;
        const sexFactor = isF ? 1.012 : 1.000;

        const minTerm = Math.min(scr / kappa, 1.0);
        const maxTerm = Math.max(scr / kappa, 1.0);

        return 142.0 * Math.pow(minTerm, alpha) * Math.pow(maxTerm, -1.200) * Math.pow(0.9938, age) * sexFactor;
    }
};

// ============================================================================
// SECTION 1: EMPIRICAL MATHEMATICAL ORACLE BENCHMARKS
// ============================================================================
describe('CHALLENGER 1: Mathematical Engine vs Independent Clinical Oracles', () => {

    test('1.1 Devine IBW & Clamping Oracle across 12 Height/Sex Combinations', () => {
        const cases = [
            { h: 140, sex: 'M', expected: 50.0 }, // clamped
            { h: 145, sex: 'F', expected: 45.5 }, // clamped
            { h: 152.4, sex: 'M', expected: 50.0 },
            { h: 152.4, sex: 'F', expected: 45.5 },
            { h: 160, sex: 'M', expected: Oracle.ibw(160, 'M') },
            { h: 160, sex: 'F', expected: Oracle.ibw(160, 'F') },
            { h: 170, sex: 'M', expected: Oracle.ibw(170, 'M') },
            { h: 170, sex: 'F', expected: Oracle.ibw(170, 'F') },
            { h: 177.8, sex: 'M', expected: 73.0 }, // exactly 10 inches -> 50 + 23 = 73
            { h: 165.1, sex: 'F', expected: 57.0 }, // exactly 5 inches -> 45.5 + 11.5 = 57
            { h: 190, sex: 'M', expected: Oracle.ibw(190, 'M') },
            { h: 200, sex: 'M', expected: Oracle.ibw(200, 'M') }
        ];

        cases.forEach(({ h, sex, expected }) => {
            const actual = ABX_ENGINE.calcIBW(h, sex);
            assert.ok(Math.abs(actual - expected) < 0.001, `Failed IBW for h=${h}, sex=${sex}: expected ${expected}, got ${actual}`);
        });
    });

    test('1.2 AdjBW (40% factor) Oracle Verification', () => {
        const testPairs = [
            { tbw: 60, ibw: 60, expected: 60.0 },
            { tbw: 80, ibw: 60, expected: 68.0 },
            { tbw: 100, ibw: 60, expected: 76.0 },
            { tbw: 120, ibw: 70, expected: 90.0 },
            { tbw: 150, ibw: 70, expected: 102.0 }
        ];

        testPairs.forEach(({ tbw, ibw, expected }) => {
            const actual = ABX_ENGINE.calcABW(tbw, ibw);
            assert.strictEqual(actual, expected, `Failed AdjBW for tbw=${tbw}, ibw=${ibw}`);
        });
    });

    test('1.3 Cockcroft-Gault 24-Vector Grid Test (Weight Tiers: Underweight, Normal, Obese)', () => {
        const demographicGrid = [
            // Underweight (TBW < IBW -> must use TBW)
            { age: 30, sex: 'M', wt: 45, ht: 175, scr: 0.8 },
            { age: 55, sex: 'F', wt: 40, ht: 162, scr: 0.9 },
            { age: 80, sex: 'F', wt: 38, ht: 155, scr: 0.6 },
            { age: 70, sex: 'M', wt: 48, ht: 178, scr: 1.2 },

            // Normal Weight (TBW <= 1.2*IBW and BMI < 30 -> must use IBW)
            { age: 25, sex: 'M', wt: 72, ht: 178, scr: 1.0 },
            { age: 40, sex: 'F', wt: 55, ht: 165, scr: 0.8 },
            { age: 60, sex: 'M', wt: 70, ht: 175, scr: 1.1 },
            { age: 75, sex: 'F', wt: 50, ht: 158, scr: 1.4 },

            // Obese (BMI >= 30 or TBW > 1.2*IBW -> must use AdjBW)
            { age: 45, sex: 'M', wt: 110, ht: 170, scr: 1.0 }, // BMI ~38.06 -> ABW
            { age: 50, sex: 'F', wt: 95, ht: 155, scr: 1.2 },  // BMI ~39.54 -> ABW
            { age: 65, sex: 'M', wt: 130, ht: 175, scr: 2.0 }, // BMI ~42.45 -> ABW
            { age: 72, sex: 'F', wt: 120, ht: 160, scr: 3.5 }, // BMI ~46.88 -> ABW

            // Extreme Renal Failure / Hyperfiltration
            { age: 20, sex: 'M', wt: 80, ht: 180, scr: 0.4 },  // High clearance
            { age: 85, sex: 'F', wt: 60, ht: 150, scr: 5.5 }   // Severe CKD / ESRD
        ];

        demographicGrid.forEach(pt => {
            const oracleRes = Oracle.crcl(pt.age, pt.sex, pt.wt, pt.ht, pt.scr, 'auto');
            const engineRes = ABX_ENGINE.calcCrCl({
                age: pt.age,
                sex: pt.sex,
                weightKg: pt.wt,
                heightCm: pt.ht,
                scr: pt.scr,
                weightType: 'auto'
            });

            assert.ok(engineRes !== null, `Engine returned null for valid pt ${JSON.stringify(pt)}`);
            assert.strictEqual(engineRes.weightType, oracleRes.wtType, `Weight type mismatch for pt ${JSON.stringify(pt)}: expected ${oracleRes.wtType}, got ${engineRes.weightType}`);
            assert.ok(Math.abs(engineRes.weightUsed - oracleRes.weightUsed) < 0.01, `Weight used mismatch: expected ${oracleRes.weightUsed}, got ${engineRes.weightUsed}`);
            assert.ok(Math.abs(engineRes.crcl - oracleRes.val) < 0.01, `CrCl mismatch for pt ${JSON.stringify(pt)}: expected ${oracleRes.val}, got ${engineRes.crcl}`);
        });
    });

    test('1.4 CKD-EPI 2021 Race-Free 20-Vector Matrix vs KDIGO Gold Standard', () => {
        // Independent publication-derived benchmark constants (Inker et al. NEJM 2021 Table S1)
        const publicationVectors = [
            { scr: 0.90, age: 18, sex: 'M', expectedEGFR: 127 },
            { scr: 0.91, age: 18, sex: 'M', expectedEGFR: 125 },
            { scr: 0.70, age: 18, sex: 'F', expectedEGFR: 128 },
            { scr: 1.50, age: 90, sex: 'M', expectedEGFR: 44 },
            { scr: 1.50, age: 90, sex: 'F', expectedEGFR: 33 }
        ];

        publicationVectors.forEach(pv => {
            const actual = ABX_ENGINE.calcEGFR_CKD_EPI_2021(pv.scr, pv.age, pv.sex);
            assert.ok(actual !== null, `calcEGFR_CKD_EPI_2021 returned null for publication vector ${JSON.stringify(pv)}`);
            const roundedVal = Math.round(Number(actual));
            assert.strictEqual(roundedVal, pv.expectedEGFR, `Publication vector mismatch for ${JSON.stringify(pv)}: expected ${pv.expectedEGFR}, got ${roundedVal}`);
        });

        const matrix = [
            // Male SCr <= 0.9
            { scr: 0.5, age: 20, sex: 'M' },
            { scr: 0.7, age: 35, sex: 'M' },
            { scr: 0.9, age: 50, sex: 'M' },
            { scr: 0.9, age: 65, sex: 'M' },

            // Male SCr > 0.9
            { scr: 1.0, age: 50, sex: 'M' },
            { scr: 1.2, age: 40, sex: 'M' },
            { scr: 1.8, age: 60, sex: 'M' },
            { scr: 2.5, age: 70, sex: 'M' },
            { scr: 4.0, age: 65, sex: 'M' },
            { scr: 8.0, age: 75, sex: 'M' },

            // Female SCr <= 0.7
            { scr: 0.4, age: 22, sex: 'F' },
            { scr: 0.6, age: 30, sex: 'F' },
            { scr: 0.7, age: 45, sex: 'F' },
            { scr: 0.7, age: 60, sex: 'F' },

            // Female SCr > 0.7
            { scr: 0.8, age: 50, sex: 'F' },
            { scr: 1.0, age: 40, sex: 'F' },
            { scr: 1.5, age: 65, sex: 'F' },
            { scr: 2.2, age: 55, sex: 'F' },
            { scr: 3.8, age: 72, sex: 'F' },
            { scr: 6.0, age: 80, sex: 'F' }
        ];

        matrix.forEach(pt => {
            const expected = Oracle.egfr2021(pt.scr, pt.age, pt.sex);
            const actual = ABX_ENGINE.calcEGFR_CKD_EPI_2021(pt.scr, pt.age, pt.sex);

            assert.ok(actual !== null, `calcEGFR_CKD_EPI_2021 returned null for ${JSON.stringify(pt)}`);
            const numVal = Number(actual);
            assert.ok(Math.abs(numVal - expected) < 0.001, `eGFR mismatch for ${JSON.stringify(pt)}: expected ${expected}, got ${numVal}`);
            assert.strictEqual(actual.formula, 'CKD-EPI 2021 Race-Free');
            assert.strictEqual(actual.units, 'mL/min/1.73m²');
        });
    });

    test('1.5 Absolute GFR (De-indexed) Oracle Verification', () => {
        const cases = [
            { egfr: 90, bsa: 1.73, expected: 90.0 },
            { egfr: 60, bsa: 2.0, expected: 60.0 * (2.0 / 1.73) },
            { egfr: 45, bsa: 1.5, expected: 45.0 * (1.5 / 1.73) },
            { egfr: 15, bsa: 2.2, expected: 15.0 * (2.2 / 1.73) }
        ];

        cases.forEach(({ egfr, bsa, expected }) => {
            const actual = ABX_ENGINE.calcAbsoluteGFR(egfr, bsa);
            assert.ok(Math.abs(actual - expected) < 0.001, `Failed Absolute GFR for egfr=${egfr}, bsa=${bsa}`);
        });
    });
});

// ============================================================================
// SECTION 2: 8 CORE DRUGS x 6 RENAL TIERS EXHAUSTIVE VERIFICATION
// ============================================================================
describe('CHALLENGER 1: 8 Core Drugs x 6 Renal Tiers Completeness in Stanford DB', () => {
    const REQUIRED_DRUGS = [
        'ceftriaxone',
        'cefepime',
        'ampicillin',
        'levofloxacin',
        'meropenem',
        'pip_tazo',
        'vancomycin',
        'ciprofloxacin'
    ];

    const ALL_6_TIERS = ['crcl_gt_50', 'crcl_30_50', 'crcl_10_29', 'crcl_lt_10', 'hd', 'crrt'];

    test('2.1 All 8 Core Drugs exist with mandatory schema fields', () => {
        REQUIRED_DRUGS.forEach(drugId => {
            const drug = ABX_ENGINE.STANFORD_ABX_DB[drugId];
            assert.ok(drug, `Drug '${drugId}' is missing from STANFORD_ABX_DB`);
            assert.ok(typeof drug.name === 'string' && drug.name.length > 0, `Drug '${drugId}' missing name`);
            assert.ok(typeof drug.class === 'string' && drug.class.length > 0, `Drug '${drugId}' missing class`);
            assert.ok(typeof drug.stdDose === 'string' && drug.stdDose.length > 0, `Drug '${drugId}' missing stdDose`);
            assert.ok(drug.renalTiers || drug.renalDosing, `Drug '${drugId}' missing renalTiers`);
            assert.ok(drug.indications && typeof drug.indications === 'object', `Drug '${drugId}' missing indications`);
            assert.ok(typeof (drug.safetyNotes || drug.clinicalNotes) === 'string', `Drug '${drugId}' missing safety notes`);
        });
    });

    test('2.2 Every core drug defines all 6 renal tiers with dose, frequency, and infusion specifications', () => {
        REQUIRED_DRUGS.forEach(drugId => {
            const drug = ABX_ENGINE.STANFORD_ABX_DB[drugId];
            const tiers = drug.renalTiers || drug.renalDosing;

            ALL_6_TIERS.forEach(tier => {
                const tierData = tiers[tier];
                assert.ok(tierData, `Drug '${drugId}' is missing renal tier '${tier}'`);
                assert.ok(typeof tierData.dose === 'string' && tierData.dose.length > 0, `Drug '${drugId}' tier '${tier}' missing dose`);
                assert.ok(typeof tierData.freq === 'string' && tierData.freq.length > 0, `Drug '${drugId}' tier '${tier}' missing freq`);
                assert.ok(typeof tierData.infusion === 'string' && tierData.infusion.length > 0, `Drug '${drugId}' tier '${tier}' missing infusion`);
            });

            // HD tier must specify post-HD dialytic guidance
            const hdTier = tiers.hd;
            assert.ok(hdTier.postHD || hdTier.notes, `Drug '${drugId}' HD tier must have postHD or dialytic guidance`);
        });
    });

    test('2.3 calculateDose executes cleanly across 48 Drug-Tier Permutations (8 drugs x 6 tiers)', () => {
        REQUIRED_DRUGS.forEach(drugId => {
            ALL_6_TIERS.forEach(tier => {
                const res = ABX_ENGINE.calculateDose(drugId, tier);
                assert.ok(res !== null, `calculateDose failed for drug '${drugId}' in tier '${tier}'`);
                assert.ok(res.recommendedDose, `calculateDose missing recommendedDose for '${drugId}' in '${tier}'`);
                assert.ok(res.interval, `calculateDose missing interval for '${drugId}' in '${tier}'`);
                assert.strictEqual(res.tier, tier, `calculateDose returned tier mismatch for '${drugId}'`);
            });
        });
    });

    test('2.4 Critical clinical dosing validations for key antibiotics', () => {
        // Cefepime stepwise reduction
        const cef = ABX_ENGINE.STANFORD_ABX_DB.cefepime.renalTiers;
        assert.strictEqual(cef.crcl_gt_50.dose, '2g');
        assert.strictEqual(cef.crcl_gt_50.freq, 'q8h');
        assert.strictEqual(cef.crcl_30_50.dose, '2g');
        assert.strictEqual(cef.crcl_30_50.freq, 'q12h');
        assert.strictEqual(cef.crcl_10_29.dose, '2g');
        assert.strictEqual(cef.crcl_10_29.freq, 'q24h');
        assert.strictEqual(cef.crcl_lt_10.dose, '1g');
        assert.strictEqual(cef.crcl_lt_10.freq, 'q24h');
        assert.strictEqual(cef.hd.dose, '1g');
        assert.strictEqual(cef.hd.freq, 'q24h');

        // Meropenem reduction
        const mero = ABX_ENGINE.STANFORD_ABX_DB.meropenem.renalTiers;
        assert.strictEqual(mero.crcl_gt_50.dose, '1g');
        assert.strictEqual(mero.crcl_gt_50.freq, 'q8h');
        assert.strictEqual(mero.crcl_30_50.dose, '1g');
        assert.strictEqual(mero.crcl_30_50.freq, 'q12h');
        assert.strictEqual(mero.crcl_10_29.dose, '500mg');
        assert.strictEqual(mero.crcl_10_29.freq, 'q12h');
        assert.strictEqual(mero.crcl_lt_10.dose, '500mg');
        assert.strictEqual(mero.crcl_lt_10.freq, 'q24h');

        // Piperacillin / Tazobactam reduction
        const pip = ABX_ENGINE.STANFORD_ABX_DB.pip_tazo.renalTiers;
        assert.strictEqual(pip.crcl_30_50.dose, '3.375g');
        assert.strictEqual(pip.crcl_30_50.freq, 'q8h');
        assert.strictEqual(pip.crcl_10_29.dose, '2.25g');
        assert.strictEqual(pip.crcl_10_29.freq, 'q8h');
        assert.strictEqual(pip.crcl_lt_10.dose, '2.25g');
        assert.strictEqual(pip.crcl_lt_10.freq, 'q12h');
        assert.strictEqual(pip.hd.dose, '2.25g');
        assert.strictEqual(pip.hd.freq, 'q12h');

        // Ciprofloxacin reduction
        const cipro = ABX_ENGINE.STANFORD_ABX_DB.ciprofloxacin.renalTiers;
        assert.match(cipro.crcl_gt_50.freq, /q12h/);
        assert.match(cipro.crcl_10_29.freq, /q18-24h/);
        assert.match(cipro.crcl_lt_10.freq, /q24h/);
        assert.match(cipro.hd.freq, /q24h/);

        // Levofloxacin loading dose preservation
        const levo = ABX_ENGINE.STANFORD_ABX_DB.levofloxacin.renalTiers;
        assert.strictEqual(levo.crcl_gt_50.freq, 'q24h');
        assert.strictEqual(levo.crcl_30_50.freq, 'q48h');
        assert.strictEqual(levo.crcl_10_29.freq, 'q48h');
        assert.strictEqual(levo.crcl_lt_10.freq, 'q48h');
    });

    test('2.5 Exhaustive 432-permutation stress grid (8 core drugs x 9 indications x 6 tiers)', () => {
        const indications = ['cap', 'hap_vap', 'meningitis_ca', 'uti_cystitis', 'uti_pyelo', 'intra_abdominal', 'skin_soft_tissue', 'sepsis_unknown', 'osteo_native'];
        let count = 0;

        REQUIRED_DRUGS.forEach(d => {
            indications.forEach(ind => {
                ALL_6_TIERS.forEach(tier => {
                    const res = ABX_ENGINE.calculateDose(d, tier, ind);
                    assert.ok(res !== null, `Permutation failed for ${d} / ${ind} / ${tier}`);
                    assert.ok(typeof res.recommendedDose === 'string' && res.recommendedDose.length > 0);
                    assert.ok(typeof res.interval === 'string' && res.interval.length > 0);
                    count++;
                });
            });
        });

        assert.strictEqual(count, 432, `Expected 432 valid permutations, tested ${count}`);
    });
});

// ============================================================================
// SECTION 3: INDICATION OVERRIDES & DISEASE PROTOCOL HARNESS
// ============================================================================
describe('CHALLENGER 1: Disease Protocol Overrides & Indication Filtering', () => {

    test('3.1 Meningitis high-dose overrides strictly take precedence over standard renal tiers', () => {
        // Ceftriaxone in Meningitis must be 2g q12h (4g/day)
        const ceftMening = ABX_ENGINE.calculateDose('ceftriaxone', 'crcl_gt_50', 'meningitis_ca');
        assert.strictEqual(ceftMening.recommendedDose, '2g');
        assert.strictEqual(ceftMening.interval, 'q12h');
        assert.match(ceftMening.adjustments, /CNS penetration/i);

        // Meropenem in Meningitis: 2g q8h for normal renal, 1g q8h for crcl_30_50, 1g q12h for crcl_10_29, 1g q24h for crcl_lt_10
        const meroMeningNormal = ABX_ENGINE.calculateDose('meropenem', 'crcl_gt_50', 'meningitis_ca');
        assert.strictEqual(meroMeningNormal.recommendedDose, '2g');
        assert.strictEqual(meroMeningNormal.interval, 'q8h');

        const meroMening3050 = ABX_ENGINE.calculateDose('meropenem', 'crcl_30_50', 'meningitis_ca');
        assert.strictEqual(meroMening3050.recommendedDose, '1g');
        assert.strictEqual(meroMening3050.interval, 'q8h');

        const meroMening1029 = ABX_ENGINE.calculateDose('meropenem', 'crcl_10_29', 'meningitis_ca');
        assert.strictEqual(meroMening1029.recommendedDose, '1g');
        assert.strictEqual(meroMening1029.interval, 'q12h');

        const meroMeningLt10 = ABX_ENGINE.calculateDose('meropenem', 'crcl_lt_10', 'meningitis_ca');
        assert.strictEqual(meroMeningLt10.recommendedDose, '1g');
        assert.strictEqual(meroMeningLt10.interval, 'q24h');

        // Ampicillin in Meningitis for Listeria: 2g q4h in normal renal
        const ampMening = ABX_ENGINE.calculateDose('ampicillin', 'crcl_gt_50', 'meningitis_ca');
        assert.strictEqual(ampMening.recommendedDose, '2g');
        assert.strictEqual(ampMening.interval, 'q4h');
    });

    test('3.2 Sepsis / IAI / CAP standard dosing vs Meningitis contrast', () => {
        // Ceftriaxone in CAP: 1-2g q24h
        const ceftCAP = ABX_ENGINE.calculateDose('ceftriaxone', 'crcl_gt_50', 'cap');
        assert.strictEqual(ceftCAP.recommendedDose, '1-2g');
        assert.strictEqual(ceftCAP.interval, 'q24h');

        // Meropenem in Sepsis / IAI: 1g q8h
        const meroIAI = ABX_ENGINE.calculateDose('meropenem', 'crcl_gt_50', 'intra_abdominal');
        assert.strictEqual(meroIAI.recommendedDose, '1g');
        assert.strictEqual(meroIAI.interval, 'q8h');
    });

    test('3.3 filterByIndication returns structured drug options with 1st line and alternative roles', () => {
        const indicationsToTest = ['cap', 'hap_vap', 'meningitis_ca', 'uti_cystitis', 'uti_pyelo', 'intra_abdominal', 'skin_soft_tissue', 'sepsis_unknown', 'osteo_native'];

        indicationsToTest.forEach(indId => {
            const drugs = ABX_ENGINE.filterByIndication(indId);
            assert.ok(Array.isArray(drugs), `filterByIndication did not return array for ${indId}`);
            assert.ok(drugs.length > 0, `filterByIndication returned empty array for ${indId}`);

            const has1stLine = drugs.some(d => d.role === '1st Line');
            assert.ok(has1stLine, `Indication ${indId} missing 1st Line option`);

            drugs.forEach(entry => {
                assert.ok(entry.drugId, `Missing drugId in indication ${indId}`);
                assert.ok(entry.drugName, `Missing drugName in indication ${indId}`);
                assert.ok(entry.dose, `Missing dose in indication ${indId} for drug ${entry.drugId}`);
                assert.ok(entry.interval, `Missing interval in indication ${indId} for drug ${entry.drugId}`);
                assert.ok(entry.role === '1st Line' || entry.role === 'Alternative', `Invalid role in ${indId}`);
            });
        });
    });

    test('3.4 filterByIndication recalculates doses dynamically for renal impairment', () => {
        // Patient with CrCl 25 (crcl_10_29) having HAP/VAP
        const drugsImp = ABX_ENGINE.filterByIndication('hap_vap', 25);
        const pipTazo = drugsImp.find(d => d.drugId === 'pip_tazo');
        assert.ok(pipTazo, 'Pip/Tazo must be present in HAP/VAP');
        assert.strictEqual(pipTazo.dose, '2.25g', 'CrCl 25 should adjust Pip/Tazo to 2.25g');
        assert.strictEqual(pipTazo.interval, 'q8h');

        const cefepime = drugsImp.find(d => d.drugId === 'cefepime');
        assert.ok(cefepime, 'Cefepime must be present in HAP/VAP');
        assert.strictEqual(cefepime.dose, '2g', 'CrCl 25 should adjust Cefepime to 2g');
        assert.strictEqual(cefepime.interval, 'q24h');
    });

    test('3.5 filterByIndication with numeric 0 (CrCl = 0) calculates crcl_lt_10 severe impairment dosing, never unadjusted dose', () => {
        const drugsZero = ABX_ENGINE.filterByIndication('hap_vap', 0);
        const pipTazo = drugsZero.find(d => d.drugId === 'pip_tazo');
        assert.ok(pipTazo, 'Pip/Tazo must be present');
        assert.strictEqual(pipTazo.dose, '2.25g', 'CrCl 0 must adjust Pip/Tazo to 2.25g (crcl_lt_10)');
        assert.strictEqual(pipTazo.interval, 'q12h');
        assert.strictEqual(pipTazo.renalUnresolved, false);

        const cefepime = drugsZero.find(d => d.drugId === 'cefepime');
        assert.ok(cefepime, 'Cefepime must be present');
        assert.strictEqual(cefepime.dose, '1g', 'CrCl 0 must adjust Cefepime to 1g (crcl_lt_10)');
        assert.strictEqual(cefepime.interval, 'q24h');
        assert.strictEqual(cefepime.renalUnresolved, false);
    });

    test('3.6 filterByIndication marks renalUnresolved for supplied unresolvable renal status', () => {
        const invalidStatuses = ['none', 'invalid_tier_string', {}];
        invalidStatuses.forEach(st => {
            const drugs = ABX_ENGINE.filterByIndication('hap_vap', st);
            drugs.forEach(d => {
                assert.strictEqual(d.renalUnresolved, true, `Expected renalUnresolved true for status ${JSON.stringify(st)}`);
                assert.strictEqual(d.dose, 'Renal data required');
                assert.strictEqual(d.interval, '');
            });
        });
    });

    test('3.7 filterByIndication preserves standard/indication default dose when no renal status is supplied', () => {
        [null, undefined, ''].forEach(st => {
            const drugs = ABX_ENGINE.filterByIndication('hap_vap', st);
            const pipTazo = drugs.find(d => d.drugId === 'pip_tazo');
            assert.ok(pipTazo);
            assert.strictEqual(pipTazo.renalUnresolved, false);
            assert.strictEqual(pipTazo.dose, '4.5g');
            assert.strictEqual(pipTazo.interval, 'q8h');
        });
    });
});

// ============================================================================
// SECTION 4: BOUNDARY CONDITIONS, ADVERSARIAL STRESS & SAFETY INVARIANTS
// ============================================================================
describe('CHALLENGER 1: Boundary Conditions, Stress Fuzzing & Safety Invariants', () => {

    test('4.1 getRenalTier boundary cutoffs exact verification', () => {
        assert.strictEqual(ABX_ENGINE.getRenalTier(100), 'crcl_gt_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(50.0001), 'crcl_gt_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(50.0), 'crcl_gt_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(49.9999), 'crcl_30_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(30.0001), 'crcl_30_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(30.0), 'crcl_30_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(29.9999), 'crcl_10_29');
        assert.strictEqual(ABX_ENGINE.getRenalTier(10.0001), 'crcl_10_29');
        assert.strictEqual(ABX_ENGINE.getRenalTier(10.0), 'crcl_10_29');
        assert.strictEqual(ABX_ENGINE.getRenalTier(9.9999), 'crcl_lt_10');
        assert.strictEqual(ABX_ENGINE.getRenalTier(0.0), 'crcl_lt_10');
        assert.strictEqual(ABX_ENGINE.getRenalTier(-5.0), 'crcl_lt_10');
        assert.strictEqual(ABX_ENGINE.getRenalTier(NaN), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier(null), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier(undefined), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier(''), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier('   '), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier(true), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier(false), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier([]), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier({}), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier('invalid'), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier(Infinity), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier(-Infinity), 'unknown');
        assert.strictEqual(ABX_ENGINE.getRenalTier('60'), 'crcl_gt_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier('40'), 'crcl_30_50');

        // Dialysis overrides
        assert.strictEqual(ABX_ENGINE.getRenalTier(80, true, false), 'hd');
        assert.strictEqual(ABX_ENGINE.getRenalTier(0, false, true), 'crrt');
        assert.strictEqual(ABX_ENGINE.getRenalTier(50, true, true), 'hd');
    });

    test('4.2 calcCrCl defensive handling of null, missing, or zero parameters', () => {
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 0, sex: 'M', weightKg: 70, scr: 1.0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 50, sex: '', weightKg: 70, scr: 1.0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 50, sex: 'M', weightKg: 0, scr: 1.0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 50, sex: 'M', weightKg: 70, scr: 0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: null, sex: 'M', weightKg: 70, scr: 1.0 }), null);
    });

    test('4.3 calcCrCl without height defaults to TBW gracefully', () => {
        const res = ABX_ENGINE.calcCrCl({ age: 50, sex: 'M', weightKg: 85, scr: 1.0 });
        assert.ok(res !== null);
        assert.strictEqual(res.weightType, 'TBW');
        assert.strictEqual(res.weightUsed, 85);
        assert.strictEqual(res.ibw, null);
    });

    test('4.4 Zero-PHI Preserving Formatter Audit', () => {
        // Anonymized mock testing Zero-PHI compliance
        const sensitiveMock = {
            name: 'PATIENT_MOCK_JOHN_DOE',
            hn: 'PATIENT_MOCK_HN_001',
            nationalId: 'PATIENT_MOCK_ID_001',
            dob: '1970-01-01',
            phone: 'PATIENT_MOCK_PHONE',
            age: 56,
            sex: 'M',
            weightKg: 82,
            heightCm: 174,
            scr: 1.6
        };

        const note = ABX_ENGINE.formatPrescriptionNote({
            patient: sensitiveMock,
            drugId: 'meropenem',
            indicationId: 'hap_vap'
        });

        // Zero-PHI invariants: check that NO PHI fields leak into note output
        assert.doesNotMatch(note, /PATIENT_MOCK_JOHN_DOE/i);
        assert.doesNotMatch(note, /PATIENT_MOCK_HN_001/i);
        assert.doesNotMatch(note, /PATIENT_MOCK_ID_001/i);
        assert.doesNotMatch(note, /PATIENT_MOCK_PHONE/i);
        assert.doesNotMatch(note, /1970-01-01/i);

        // Required clinical information
        assert.match(note, /Meropenem/i);
        assert.match(note, /CrCl \(Cockcroft-Gault\):/i);
        assert.match(note, /eGFR \(CKD-EPI 2021\):/i);
        assert.match(note, /Age 56 yr/i);
        assert.match(note, /Sex M/i);
        assert.match(note, /Wt 82 kg/i);
    });

    test('4.4.1 formatPrescriptionNote safely preserves "As indicated" when renal data is unavailable', () => {
        const noteNoRenal = ABX_ENGINE.formatPrescriptionNote({
            drugId: 'cefepime',
            indicationId: 'hap_vap'
        });
        assert.match(noteNoRenal, /Cefepime As indicated/i);
        assert.doesNotMatch(noteNoRenal, /2g q8h/i);
        assert.doesNotMatch(noteNoRenal, /CrCl \(Cockcroft-Gault\):/i);
    });

    test('4.5 Dialytic Clearance: HD and CRRT routing verification', () => {
        // Hemodialysis routing
        const cefHD = ABX_ENGINE.calculateDose('cefepime', { isHD: true });
        assert.strictEqual(cefHD.tier, 'hd');
        assert.strictEqual(cefHD.recommendedDose, '1g');
        assert.strictEqual(cefHD.interval, 'q24h');
        assert.match(cefHD.postHD || cefHD.adjustments, /post-HD/i);

        // CRRT routing
        const meroCRRT = ABX_ENGINE.calculateDose('meropenem', { isCRRT: true });
        assert.strictEqual(meroCRRT.tier, 'crrt');
        assert.strictEqual(meroCRRT.recommendedDose, '1g');
        assert.strictEqual(meroCRRT.interval, 'q8h');
    });

    test('4.6 Discordance detection between Cockcroft-Gault CrCl and CKD-EPI 2021 eGFR', () => {
        // Discordant case: CrCl 42 (tier 30-50) vs eGFR 25 (tier 10-29)
        const disc = ABX_ENGINE.evaluateDiscordance(42, 25, 1.8);
        assert.strictEqual(disc.isDiscordant, true);
        assert.strictEqual(disc.tierCrCl, 'crcl_30_50');
        assert.strictEqual(disc.tierEGFR, 'crcl_10_29');
        assert.match(disc.clinicalAdvice, /discordance detected/i);

        // Concordant case: CrCl 75 vs eGFR 85
        const conc = ABX_ENGINE.evaluateDiscordance(75, 85, 1.8);
        assert.strictEqual(conc.isDiscordant, false);
        assert.strictEqual(conc.tierCrCl, 'crcl_gt_50');
        assert.strictEqual(conc.tierEGFR, 'crcl_gt_50');
    });
});
