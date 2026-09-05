const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { STROKE_ENGINE } = require('../shared/stroke-engine.js');

describe('rt-PA Stroke Dosing Engine', () => {
    test('invalid inputs return null', () => {
        assert.equal(STROKE_ENGINE.calcRtpaDose(-10, 0.9), null);
        assert.equal(STROKE_ENGINE.calcRtpaDose(70, 0.5), null);
        assert.equal(STROKE_ENGINE.calcRtpaDose(0, 0.9), null);
        assert.equal(STROKE_ENGINE.calcRtpaDose(70, null), null);
        assert.equal(STROKE_ENGINE.calcRtpaDose(Infinity, 0.9), null);
        assert.equal(STROKE_ENGINE.calcRtpaDose(-Infinity, 0.9), null);
        assert.equal(STROKE_ENGINE.calcRtpaDose(NaN, 0.9), null);
    });

    test('0.9 mg/kg regimen calculations', () => {
        // Normal weight: 50 kg
        const dose50 = STROKE_ENGINE.calcRtpaDose(50, 0.9);
        assert.ok(dose50);
        assert.equal(dose50.totalDose, 45);
        assert.equal(dose50.pushPercent, 10);
        assert.equal(dose50.pushDose, 4.5);
        assert.equal(dose50.dripDose, 40.5);

        // Cap weight: 100 kg (max 90 mg)
        const dose100 = STROKE_ENGINE.calcRtpaDose(100, 0.9);
        assert.ok(dose100);
        assert.equal(dose100.totalDose, 90);
        assert.equal(dose100.pushDose, 9.0);
        assert.equal(dose100.dripDose, 81.0);

        // Over-cap weight: 120 kg (max 90 mg)
        const dose120 = STROKE_ENGINE.calcRtpaDose(120, 0.9);
        assert.ok(dose120);
        assert.equal(dose120.totalDose, 90);
        assert.equal(dose120.pushDose, 9.0);
        assert.equal(dose120.dripDose, 81.0);
    });

    test('0.9 mg/kg remainder/rounding logic', () => {
        // Rounding floor checks: 55 kg
        // calculatedTotal = 49.5 mg
        // idealPush = 4.95 mg -> pushDose = 4.9 mg
        // remainder = 0.05 mg -> dripDose = (49.5 * 0.9) + 0.05 = 44.55 + 0.05 = 44.6 mg
        const dose55 = STROKE_ENGINE.calcRtpaDose(55, 0.9);
        assert.ok(dose55);
        assert.equal(dose55.totalDose, 49.5);
        assert.equal(dose55.pushDose, 4.9);
        assert.equal(dose55.dripDose, 44.6);
        assert.equal(dose55.pushDose + dose55.dripDose, 49.5);

        // 55.55 kg: 55.55 * 0.9 = 49.995 -> totalDose = 50.00
        // idealPush derived from totalDose (50.00 * 0.10 = 5.0) -> pushDose = 5.0 mg, dripDose = 45.0 mg
        const dose55_55 = STROKE_ENGINE.calcRtpaDose(55.55, 0.9);
        assert.ok(dose55_55);
        assert.equal(dose55_55.totalDose, 50);
        assert.equal(dose55_55.pushDose, 5.0, '55.55kg 0.9 regimen push dose must be strictly 5.0 mg (not 4.9 mg)');
        assert.equal(dose55_55.dripDose, 45.0, '55.55kg 0.9 regimen drip dose must be strictly 45.0 mg');
        assert.equal(dose55_55.pushDose + dose55_55.dripDose, 50);
    });

    test('0.6 mg/kg regimen calculations', () => {
        // Normal weight: 50 kg
        // calculatedTotal = 30 mg
        // idealPush = 4.5 mg -> pushDose = 4.5 mg
        // remainder = 0 mg -> dripDose = 25.5 mg
        const dose50 = STROKE_ENGINE.calcRtpaDose(50, 0.6);
        assert.ok(dose50);
        assert.equal(dose50.totalDose, 30);
        assert.equal(dose50.pushPercent, 15);
        assert.equal(dose50.pushDose, 4.5);
        assert.equal(dose50.dripDose, 25.5);

        // Non-capped weight above 83.3 kg: 85 kg (85 * 0.6 = 51.0 mg)
        // idealPush = 51 * 0.15 = 7.65 -> pushDose = 7.6 mg
        // dripDose = 51.0 - 7.6 = 43.4 mg
        const dose85 = STROKE_ENGINE.calcRtpaDose(85, 0.6);
        assert.ok(dose85);
        assert.equal(dose85.totalDose, 51.0);
        assert.equal(dose85.pushDose, 7.6);
        assert.equal(dose85.dripDose, 43.4);

        // Non-capped weight: 90 kg (90 * 0.6 = 54.0 mg)
        // idealPush = 54 * 0.15 = 8.1 mg -> pushDose = 8.1 mg
        // dripDose = 54.0 - 8.1 = 45.9 mg
        const dose90 = STROKE_ENGINE.calcRtpaDose(90, 0.6);
        assert.ok(dose90);
        assert.equal(dose90.totalDose, 54.0);
        assert.equal(dose90.pushDose, 8.1);
        assert.equal(dose90.dripDose, 45.9);

        // Max cap boundary: 100 kg (100 * 0.6 = 60.0 mg, max ceiling)
        // idealPush = 60 * 0.15 = 9.0 mg -> pushDose = 9.0 mg
        // dripDose = 60.0 - 9.0 = 51.0 mg
        const dose100 = STROKE_ENGINE.calcRtpaDose(100, 0.6);
        assert.ok(dose100);
        assert.equal(dose100.totalDose, 60.0);
        assert.equal(dose100.pushDose, 9.0);
        assert.equal(dose100.dripDose, 51.0);

        // Over-cap weight: 110 kg (should clamp at 60.0 mg)
        const dose110 = STROKE_ENGINE.calcRtpaDose(110, 0.6);
        assert.ok(dose110);
        assert.equal(dose110.totalDose, 60.0);
        assert.equal(dose110.pushDose, 9.0);
        assert.equal(dose110.dripDose, 51.0);
    });

    test('0.6 mg/kg remainder/rounding logic', () => {
        // Rounding floor checks: 55 kg
        // calculatedTotal = 33 mg
        // idealPush = 33 * 0.15 = 4.95 mg -> pushDose = 4.9 mg
        // remainder = 0.05 mg -> dripDose = (33 * 0.85) + 0.05 = 28.05 + 0.05 = 28.1 mg
        const dose55 = STROKE_ENGINE.calcRtpaDose(55, 0.6);
        assert.ok(dose55);
        assert.equal(dose55.totalDose, 33);
        assert.equal(dose55.pushDose, 4.9);
        assert.equal(dose55.dripDose, 28.1);
        assert.equal(dose55.pushDose + dose55.dripDose, 33);

        // IEEE 754 precision checks: 60 kg (36 * 0.15 = 5.3999999999999995)
        const dose60 = STROKE_ENGINE.calcRtpaDose(60, 0.6);
        assert.ok(dose60);
        assert.equal(dose60.totalDose, 36);
        assert.equal(dose60.pushDose, 5.4, '60kg push dose must be exact 5.4 mg, not 5.3 mg');
        assert.equal(dose60.dripDose, 30.6, '60kg drip dose must be exact 30.6 mg, not 30.7 mg');
        assert.equal(dose60.pushDose + dose60.dripDose, 36);

        // IEEE 754 precision checks: 30 kg (18 * 0.15 = 2.6999999999999997)
        const dose30 = STROKE_ENGINE.calcRtpaDose(30, 0.6);
        assert.ok(dose30);
        assert.equal(dose30.totalDose, 18);
        assert.equal(dose30.pushDose, 2.7, '30kg push dose must be exact 2.7 mg, not 2.6 mg');
        assert.equal(dose30.dripDose, 15.3, '30kg drip dose must be exact 15.3 mg, not 15.4 mg');
        assert.equal(dose30.pushDose + dose30.dripDose, 18);
    });

    test('Tenecteplase (TNK) 0.25 mg/kg stroke dosing calculations per AHA/ASA 2026', () => {
        assert.equal(STROKE_ENGINE.calcTnkStrokeDose(0), null);
        assert.equal(STROKE_ENGINE.calcTnkStrokeDose(-10), null);
        assert.equal(STROKE_ENGINE.calcTnkStrokeDose(Infinity), null);
        assert.equal(STROKE_ENGINE.calcTnkStrokeDose(-Infinity), null);
        assert.equal(STROKE_ENGINE.calcTnkStrokeDose(NaN), null);

        // 60 kg: 60 * 0.25 = 15 mg (3 mL of 5 mg/mL)
        const tnk60 = STROKE_ENGINE.calcTnkStrokeDose(60);
        assert.ok(tnk60);
        assert.equal(tnk60.totalDose, 15);
        assert.equal(tnk60.volumeMl, 3);
        assert.equal(tnk60.maxCap, 25);

        // 80 kg: 80 * 0.25 = 20 mg (4 mL)
        const tnk80 = STROKE_ENGINE.calcTnkStrokeDose(80);
        assert.ok(tnk80);
        assert.equal(tnk80.totalDose, 20);
        assert.equal(tnk80.volumeMl, 4);

        // 120 kg: Capped at 25 mg (5 mL)
        const tnk120 = STROKE_ENGINE.calcTnkStrokeDose(120);
        assert.ok(tnk120);
        assert.equal(tnk120.totalDose, 25);
        assert.equal(tnk120.volumeMl, 5);
    });

    test('rt-PA precision verification: Push Dose + Drip Dose === Total Dose across 10,000 physiological weights', () => {
        // Known edge cases where raw float previously caused 0.01 mg mismatch
        const edge2085 = STROKE_ENGINE.calcRtpaDose(20.85, 0.9);
        assert.equal(edge2085.totalDose, 18.77);
        assert.equal(edge2085.pushDose, 1.8);
        assert.equal(edge2085.dripDose, 16.97);
        assert.equal(edge2085.pushDose + edge2085.dripDose, edge2085.totalDose);

        const edge2145 = STROKE_ENGINE.calcRtpaDose(21.45, 0.9);
        assert.equal(edge2145.totalDose, 19.31);
        assert.equal(edge2145.pushDose, 1.9);
        assert.equal(edge2145.dripDose, 17.41);
        assert.equal(edge2145.pushDose + edge2145.dripDose, edge2145.totalDose);

        // Exhaustive test across 10,000 weight points (20.00 to 120.00 kg)
        for (let w = 2000; w <= 12000; w++) {
            const weight = w / 100;
            for (const regimen of [0.9, 0.6]) {
                const res = STROKE_ENGINE.calcRtpaDose(weight, regimen);
                const sum = Math.round((res.pushDose + res.dripDose) * 100) / 100;
                assert.equal(sum, res.totalDose, `Mismatch at weight ${weight} kg with regimen ${regimen}`);
            }
        }
    });
});
