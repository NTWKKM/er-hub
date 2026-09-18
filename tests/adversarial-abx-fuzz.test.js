const { describe, test } = require('node:test');
const assert = require('node:assert');
const ABX_ENGINE = require('../shared/abx-engine');

describe('Adversarial Fuzzing: Anthropometrics & Body Weight', () => {
    test('calcIBW handles extreme, negative, zero, and NaN heights gracefully', () => {
        assert.strictEqual(ABX_ENGINE.calcIBW(0, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcIBW(-170, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcIBW(null, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcIBW(undefined, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcIBW(NaN, 'M'), null);

        // Sub-5ft heights clamp over5ftInches to 0 rather than negative subtraction
        const ibwShortMale = ABX_ENGINE.calcIBW(140, 'M');
        assert.strictEqual(ibwShortMale, 50);

        const ibwShortFemale = ABX_ENGINE.calcIBW(140, 'F');
        assert.strictEqual(ibwShortFemale, 45.5);

        // Massive height (300 cm)
        const ibwGiant = ABX_ENGINE.calcIBW(300, 'M');
        assert.ok(ibwGiant > 150 && ibwGiant < 200);

        // Unknown sex defaults safely to female base (45.5)
        const ibwUnknownSex = ABX_ENGINE.calcIBW(177.8, 'OTHER');
        assert.ok(Math.abs(ibwUnknownSex - (45.5 + 2.3 * 10)) < 0.1);
    });

    test('calcABW handles zero, null, undefined, and extreme body weights', () => {
        assert.strictEqual(ABX_ENGINE.calcABW(null, 70), null);
        assert.strictEqual(ABX_ENGINE.calcABW(70, null), null);
        assert.strictEqual(ABX_ENGINE.calcABW(0, 70), null);
        assert.strictEqual(ABX_ENGINE.calcABW(70, 0), null);
        assert.strictEqual(ABX_ENGINE.calcABW(undefined, undefined), null);
        assert.strictEqual(ABX_ENGINE.calcABW(NaN, 70), null);

        // Massive weight (300 kg TBW with 70 kg IBW)
        const abwMassive = ABX_ENGINE.calcABW(300, 70);
        assert.strictEqual(abwMassive, 70 + 0.4 * (300 - 70)); // 162 kg
    });

    test('calcBMI and calcBSA handle extreme boundaries without division by zero', () => {
        assert.strictEqual(ABX_ENGINE.calcBMI(70, 0), null);
        assert.strictEqual(ABX_ENGINE.calcBMI(0, 170), null);
        assert.strictEqual(ABX_ENGINE.calcBMI(null, 170), null);
        assert.strictEqual(ABX_ENGINE.calcBMI(70, null), null);

        assert.strictEqual(ABX_ENGINE.calcBSA(70, 0), null);
        assert.strictEqual(ABX_ENGINE.calcBSA(0, 170), null);
        assert.strictEqual(ABX_ENGINE.calcBSA(null, 170), null);
        assert.strictEqual(ABX_ENGINE.calcBSA(70, null), null);
    });
});

describe('Adversarial Fuzzing: Dual Renal Clearance Engine', () => {
    test('calcCrCl handles zero, massive, and extreme physiological metrics', () => {
        // Zero SCr must return null to prevent division by zero
        const resZeroSCr = ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 70, heightCm: 170, scr: 0 });
        assert.strictEqual(resZeroSCr, null);

        // Zero age, zero weight must return null
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 0, sex: 'M', weightKg: 70, heightCm: 170, scr: 1.0 }), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 0, heightCm: 170, scr: 1.0 }), null);

        // Massive weight (300 kg) triggers ABW (40%) weightType
        const resObese300 = ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 300, heightCm: 170, scr: 1.0 });
        assert.strictEqual(resObese300.weightType, 'ABW');
        assert.ok(resObese300.crcl > 100);

        // Extremely high SCr (20.0 mg/dL)
        const resHighSCr = ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 70, heightCm: 170, scr: 20.0 });
        assert.ok(resHighSCr.crcl < 5);
        assert.strictEqual(ABX_ENGINE.getRenalTier(resHighSCr.crcl), 'crcl_lt_10');

        // Missing height falls back to TBW
        const resNoHeight = ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 70, scr: 1.0 });
        assert.strictEqual(resNoHeight.weightType, 'TBW');
        assert.strictEqual(resNoHeight.weightUsed, 70);
    });

    test('calcEGFR_CKD_EPI_2021 handles missing and invalid inputs gracefully', () => {
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(null), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(undefined), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021({}), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(null, null, null), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(0, 60, 'M'), null);
        assert.strictEqual(ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 0, 'M'), null);

        // Both object calling convention and 3-parameter convention supported
        const egfrObj = ABX_ENGINE.calcEGFR_CKD_EPI_2021({ scr: 1.0, age: 60, sex: 'M' });
        const egfrParams = ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'M');
        assert.ok(Math.abs(Number(egfrObj) - Number(egfrParams)) < 1e-6);
        assert.strictEqual(egfrObj.units, 'mL/min/1.73m²');
    });

    test('getRenalTier correctly maps boundary thresholds and RRT flags', () => {
        assert.strictEqual(ABX_ENGINE.getRenalTier(null), 'crcl_gt_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(NaN), 'crcl_gt_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(-10), 'crcl_lt_10');
        assert.strictEqual(ABX_ENGINE.getRenalTier(0), 'crcl_lt_10');
        assert.strictEqual(ABX_ENGINE.getRenalTier(9.99), 'crcl_lt_10');
        assert.strictEqual(ABX_ENGINE.getRenalTier(10), 'crcl_10_29');
        assert.strictEqual(ABX_ENGINE.getRenalTier(29.99), 'crcl_10_29');
        assert.strictEqual(ABX_ENGINE.getRenalTier(30), 'crcl_30_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(49.99), 'crcl_30_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(50), 'crcl_gt_50');
        assert.strictEqual(ABX_ENGINE.getRenalTier(150), 'crcl_gt_50');

        // RRT overrides
        assert.strictEqual(ABX_ENGINE.getRenalTier(80, true, false), 'hd');
        assert.strictEqual(ABX_ENGINE.getRenalTier(80, false, true), 'crrt');
    });

    test('evaluateDiscordance flags discrepancies and handles missing arguments', () => {
        // Missing parameters returns non-discordant default
        const missingRes = ABX_ENGINE.evaluateDiscordance(null, null);
        assert.strictEqual(missingRes.isDiscordant, false);

        // Discordant case: CrCl 20 (crcl_10_29) vs eGFR 70 (crcl_gt_50)
        const discRes = ABX_ENGINE.evaluateDiscordance(20, 70, 1.73);
        assert.strictEqual(discRes.isDiscordant, true);
        assert.strictEqual(discRes.tierCrCl, 'crcl_10_29');
        assert.strictEqual(discRes.tierEGFR, 'crcl_gt_50');
        assert.ok(discRes.clinicalAdvice.length > 0);

        // Concordant case: CrCl 60 vs eGFR 65
        const concRes = ABX_ENGINE.evaluateDiscordance(60, 65, 1.73);
        assert.strictEqual(concRes.isDiscordant, false);
    });
});

describe('Adversarial Fuzzing: Stanford Antimicrobial Database & Protocols', () => {
    test('calculateDose handles invalid drugs, undefined renal states, and unknown tiers', () => {
        assert.strictEqual(ABX_ENGINE.calculateDose('nonexistent_drug', 60), null);
        assert.strictEqual(ABX_ENGINE.calculateDose(null, 60), null);
        assert.strictEqual(ABX_ENGINE.calculateDose(undefined, 60), null);

        // Unknown tier string safely falls back to normal dosing without throwing
        const doseUnknownTier = ABX_ENGINE.calculateDose('ceftriaxone', 'UNKNOWN_TIER_KEY');
        assert.ok(doseUnknownTier !== null);
        assert.strictEqual(doseUnknownTier.recommendedDose, '1-2g');
        assert.strictEqual(doseUnknownTier.interval, 'q24h');

        // Null renal status defaults safely to normal tier
        const doseNullStatus = ABX_ENGINE.calculateDose('cefepime', null);
        assert.ok(doseNullStatus !== null);
        assert.strictEqual(doseNullStatus.recommendedDose, '2g');
        assert.strictEqual(doseNullStatus.interval, 'q8h');

        // Object renal status with HD flag
        const doseHD = ABX_ENGINE.calculateDose('cefepime', { isHD: true });
        assert.strictEqual(doseHD.tier, 'hd');
        assert.strictEqual(doseHD.recommendedDose, '1g');
        assert.strictEqual(doseHD.interval, 'q24h');
    });

    test('Special indication overrides: Meningitis Ceftriaxone, Meropenem, Ampicillin', () => {
        // Ceftriaxone in Meningitis requires mandatory high dose 2g q12h even in severe renal failure
        const ctxMeningitisRenalFailure = ABX_ENGINE.calculateDose('ceftriaxone', 'crcl_lt_10', 'meningitis_ca');
        assert.strictEqual(ctxMeningitisRenalFailure.recommendedDose, '2g');
        assert.strictEqual(ctxMeningitisRenalFailure.interval, 'q12h');

        // Meropenem CNS dosing across renal tiers
        const meroNormal = ABX_ENGINE.calculateDose('meropenem', 'crcl_gt_50', 'meningitis_ca');
        assert.strictEqual(meroNormal.recommendedDose, '2g');
        assert.strictEqual(meroNormal.interval, 'q8h');

        const meroRenalFailure = ABX_ENGINE.calculateDose('meropenem', 'crcl_lt_10', 'meningitis_ca');
        assert.strictEqual(meroRenalFailure.recommendedDose, '1g');
        assert.strictEqual(meroRenalFailure.interval, 'q24h');

        // Ampicillin CNS Listeria dosing
        const ampiNormal = ABX_ENGINE.calculateDose('ampicillin', 'crcl_gt_50', 'meningitis');
        assert.strictEqual(ampiNormal.recommendedDose, '2g');
        assert.strictEqual(ampiNormal.interval, 'q4h');
    });

    test('filterByIndication returns empty array for nonexistent or invalid indications', () => {
        assert.deepStrictEqual(ABX_ENGINE.filterByIndication('invalid_indication_key'), []);
        assert.deepStrictEqual(ABX_ENGINE.filterByIndication(null), []);
        assert.deepStrictEqual(ABX_ENGINE.filterByIndication(undefined), []);
        assert.deepStrictEqual(ABX_ENGINE.filterByIndication(''), []);

        // Valid indication with renal calculation
        const capDrugs = ABX_ENGINE.filterByIndication('cap', 15);
        assert.ok(capDrugs.length > 0);
        capDrugs.forEach(d => {
            assert.ok(d.drugId);
            assert.ok(d.name);
            assert.ok(d.dose);
            assert.ok(d.interval);
            assert.ok(d.calculated);
        });
    });
});

describe('Adversarial Fuzzing: Prescription Note Formatter & Zero-PHI Guard', () => {
    test('formatPrescriptionNote handles empty / missing arguments safely', () => {
        assert.strictEqual(ABX_ENGINE.formatPrescriptionNote(null), '');
        assert.strictEqual(ABX_ENGINE.formatPrescriptionNote(undefined), '');
        assert.strictEqual(ABX_ENGINE.formatPrescriptionNote(''), '');
        assert.ok(ABX_ENGINE.formatPrescriptionNote({}).length > 0);
    });

    test('formatPrescriptionNote enforces absolute Zero-PHI compliance', () => {
        const mockPayload = {
            patient: {
                age: 65,
                sex: 'M',
                weightKg: 72,
                heightCm: 175,
                scr: 1.2,
                // Mock identifiers that should NEVER be rendered
                name: 'PATIENT_MOCK_NAME',
                hn: 'PATIENT_MOCK_HN_12345',
                cid: 'PATIENT_MOCK_CID_99999',
                phone: 'PATIENT_MOCK_PHONE',
                address: 'PATIENT_MOCK_ADDRESS'
            },
            drugId: 'meropenem',
            indicationId: 'sepsis_unknown'
        };

        const note = ABX_ENGINE.formatPrescriptionNote(mockPayload);
        assert.ok(note.includes('Meropenem'));
        assert.ok(note.includes('Age 65 yr'));
        assert.ok(note.includes('Wt 72 kg'));
        assert.ok(note.includes('CrCl (Cockcroft-Gault)'));

        // Zero-PHI Verification
        assert.strictEqual(note.includes('PATIENT_MOCK_NAME'), false, 'Leaked patient name into note');
        assert.strictEqual(note.includes('PATIENT_MOCK_HN_12345'), false, 'Leaked HN into note');
        assert.strictEqual(note.includes('PATIENT_MOCK_CID_99999'), false, 'Leaked CID into note');
        assert.strictEqual(note.includes('PATIENT_MOCK_PHONE'), false, 'Leaked phone into note');
        assert.strictEqual(note.includes('PATIENT_MOCK_ADDRESS'), false, 'Leaked address into note');
    });
});

describe('Empirical Vulnerability Findings: Uncaught TypeErrors under Pathological Inputs', () => {
    test('Finding 1: calcCrCl(null) and calcCrCl() return null gracefully without throwing', () => {
        assert.strictEqual(ABX_ENGINE.calcCrCl(), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl(null), null);
        assert.strictEqual(ABX_ENGINE.calcCrCl(undefined), null);
    });

    test('Finding 2: formatPrescriptionNote({ patient: null }) handles null patient safely', () => {
        assert.doesNotThrow(() => {
            const note = ABX_ENGINE.formatPrescriptionNote({ patient: null });
            assert.ok(typeof note === 'string' && note.length > 0);
        });
    });

    test('Finding 3: evaluateDiscordance with malformed tiers array returns false gracefully', () => {
        assert.doesNotThrow(() => {
            const res = ABX_ENGINE.evaluateDiscordance(50, 50, 1.8, [null]);
            assert.strictEqual(res, false);
        });
    });
});

describe('Randomized Fuzzing Stress Harness (1,000 Cycles)', () => {
    test('1,000 iterations of fuzzed inputs across all core engine methods', () => {
        const fuzzTypes = [
            null, undefined, NaN, Infinity, -Infinity,
            '', 'unknown_random_key', -100, -1, 0, 0.001, 1, 15, 30, 50, 120, 300, 1000,
            true, false, {}, { crcl: 25 }, { isHD: true }, { isCRRT: true }
        ];

        const drugs = Object.keys(ABX_ENGINE.STANFORD_ABX_DB).concat(['bogus_drug', null, undefined]);
        const indications = Object.keys(ABX_ENGINE.DISEASE_PROTOCOLS).concat(['bogus_ind', null, undefined]);

        let exceptions = 0;
        for (let i = 0; i < 1000; i++) {
            const fVal1 = fuzzTypes[Math.floor(Math.random() * fuzzTypes.length)];
            const fVal2 = fuzzTypes[Math.floor(Math.random() * fuzzTypes.length)];
            const drug = drugs[Math.floor(Math.random() * drugs.length)];
            const ind = indications[Math.floor(Math.random() * indications.length)];

            try {
                ABX_ENGINE.calcIBW(fVal1, fVal2);
                ABX_ENGINE.calcABW(fVal1, fVal2);
                ABX_ENGINE.calcBMI(fVal1, fVal2);
                ABX_ENGINE.calcBSA(fVal1, fVal2);
                ABX_ENGINE.getRenalTier(fVal1);
                ABX_ENGINE.calcAbsoluteGFR(fVal1, fVal2);
                ABX_ENGINE.calculateDose(drug, fVal1, ind);
                ABX_ENGINE.filterByIndication(ind, fVal1);
            } catch (e) {
                exceptions++;
            }
        }

        // The core calculation and query methods should achieve zero exceptions across 1000 fuzzed iterations
        assert.strictEqual(exceptions, 0, `Expected 0 exceptions during randomized fuzzing, but got ${exceptions}`);
    });
});
