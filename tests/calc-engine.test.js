const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcDripRate, calcBolusVolume } = require('../shared/calc-engine.js');

describe('calcDripRate', () => {
  test('weight-based per-minute dose: 0.1 mcg/kg/min, 70kg, 100 mcg/mL', () => {
    // amountPerHour = 0.1 * 70 * 60 = 420 mcg/hr
    // dripRate = 420 / 100 = 4.2 mL/hr
    const rate = calcDripRate({ doseValue: 0.1, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: 100 });
    assert.equal(rate, 4.2);
  });

  test('weight-based per-hour dose: 12 units/kg/hr, 70kg, 100 units/mL', () => {
    // amountPerHour = 12 * 70 * 1 = 840 units/hr
    // dripRate = 840 / 100 = 8.4 mL/hr
    const rate = calcDripRate({ doseValue: 12, doseUnit: 'units/kg/hr', weightKg: 70, concentration: 100 });
    assert.equal(rate, 8.4);
  });

  test('non-weight-based per-minute dose: 1 mg/min, 70kg, 2 mg/mL', () => {
    // amountPerHour = 1 * 1 * 60 = 60 mg/hr
    // dripRate = 60 / 2 = 30 mL/hr
    const rate = calcDripRate({ doseValue: 1, doseUnit: 'mg/min', weightKg: 70, concentration: 2 });
    assert.equal(rate, 30);
  });

  test('non-weight-based per-hour dose: 5 mg/hr, any weight, 0.1 mg/mL', () => {
    // amountPerHour = 5 * 1 * 1 = 5 mg/hr
    // dripRate = 5 / 0.1 = 50 mL/hr
    const rate = calcDripRate({ doseValue: 5, doseUnit: 'mg/hr', weightKg: 70, concentration: 0.1 });
    assert.equal(rate, 50);
  });

  test('returns 0 for zero dose', () => {
    assert.equal(calcDripRate({ doseValue: 0, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: 100 }), 0);
  });

  test('returns 0 for negative dose', () => {
    assert.equal(calcDripRate({ doseValue: -1, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: 100 }), 0);
  });

  test('returns 0 for zero concentration', () => {
    assert.equal(calcDripRate({ doseValue: 0.1, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: 0 }), 0);
  });

  test('returns 0 for undefined params', () => {
    assert.equal(calcDripRate({}), 0);
  });

  test('esmolol: 0.05 mg/kg/min, 70kg, 10 mg/mL', () => {
    // amountPerHour = 0.05 * 70 * 60 = 210 mg/hr
    // dripRate = 210 / 10 = 21 mL/hr
    const rate = calcDripRate({ doseValue: 0.05, doseUnit: 'mg/kg/min', weightKg: 70, concentration: 10 });
    assert.equal(rate, 21);
  });

  test('fentanyl: 1 mcg/kg/hr, 70kg, 5 mcg/mL', () => {
    // amountPerHour = 1 * 70 * 1 = 70 mcg/hr
    // dripRate = 70 / 5 = 14 mL/hr
    const rate = calcDripRate({ doseValue: 1, doseUnit: 'mcg/kg/hr', weightKg: 70, concentration: 5 });
    assert.equal(rate, 14);
  });
});

describe('calcBolusVolume', () => {
  test('per-kg bolus: 0.9 mg/kg, 70kg, 1 mg/mL', () => {
    // totalAmount = 0.9 * 70 = 63 mg
    // volume = 63 / 1 = 63 mL
    const vol = calcBolusVolume({ doseValue: 0.9, perKg: true, weightKg: 70, concentration: 1 });
    assert.equal(vol, 63);
  });

  test('fixed bolus (non-per-kg): 2500 units, 70kg, 1000 units/mL', () => {
    // totalAmount = 2500 * 1 = 2500 units
    // volume = 2500 / 1000 = 2.5 mL
    const vol = calcBolusVolume({ doseValue: 2500, perKg: false, weightKg: 70, concentration: 1000 });
    assert.equal(vol, 2.5);
  });

  test('returns 0 for zero dose', () => {
    assert.equal(calcBolusVolume({ doseValue: 0, perKg: true, weightKg: 70, concentration: 100 }), 0);
  });

  test('returns 0 for zero concentration', () => {
    assert.equal(calcBolusVolume({ doseValue: 30, perKg: true, weightKg: 70, concentration: 0 }), 0);
  });

  test('rt-PA 0.6 mg/kg, 60kg, 1 mg/mL', () => {
    // totalAmount = 0.6 * 60 = 36 mg
    // volume = 36 / 1 = 36 mL
    const vol = calcBolusVolume({ doseValue: 0.6, perKg: true, weightKg: 60, concentration: 1 });
    assert.equal(vol, 36);
  });

  test('rt-PA 0.9 mg/kg, 80kg, 1 mg/mL', () => {
    // totalAmount = 0.9 * 80 = 72 mg
    // volume = 72 / 1 = 72 mL
    const vol = calcBolusVolume({ doseValue: 0.9, perKg: true, weightKg: 80, concentration: 1 });
    assert.equal(vol, 72);
  });
});