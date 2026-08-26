const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { STROKE_ENGINE } = require('../shared/stroke-engine.js');

describe('rt-PA Stroke Dosing Engine', () => {
    test('invalid inputs return null', () => {
        assert.equal(STROKE_ENGINE.calcRtpaDose(-10, 0.9), null);
        assert.equal(STROKE_ENGINE.calcRtpaDose(70, 0.5), null);
        assert.equal(STROKE_ENGINE.calcRtpaDose(0, 0.9), null);
        assert.equal(STROKE_ENGINE.calcRtpaDose(70, null), null);
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

        // Cap weight: 83.3 kg (should cap at 50 mg)
        const dose85 = STROKE_ENGINE.calcRtpaDose(85, 0.6);
        assert.ok(dose85);
        assert.equal(dose85.totalDose, 50);
        assert.equal(dose85.pushDose, 7.5);
        assert.equal(dose85.dripDose, 42.5);

        // Over-cap weight: 100 kg
        const dose100 = STROKE_ENGINE.calcRtpaDose(100, 0.6);
        assert.ok(dose100);
        assert.equal(dose100.totalDose, 50);
        assert.equal(dose100.pushDose, 7.5);
        assert.equal(dose100.dripDose, 42.5);
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
    });

    test('Tenecteplase (TNK) 0.25 mg/kg stroke dosing calculations per AHA/ASA 2026', () => {
        assert.equal(STROKE_ENGINE.calcTnkStrokeDose(0), null);
        assert.equal(STROKE_ENGINE.calcTnkStrokeDose(-10), null);

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
});
