const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcDripRate } = require('../shared/calc-engine.js');

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

  test('returns 0 for null doseValue', () => {
    assert.equal(calcDripRate({ doseValue: null, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: 100 }), 0);
  });

  test('returns 0 for undefined doseValue', () => {
    assert.equal(calcDripRate({ doseValue: undefined, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: 100 }), 0);
  });

  test('returns 0 for NaN doseValue', () => {
    assert.equal(calcDripRate({ doseValue: NaN, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: 100 }), 0);
  });

  test('returns 0 for null weightKg on weight-based dose', () => {
    assert.equal(calcDripRate({ doseValue: 0.1, doseUnit: 'mcg/kg/min', weightKg: null, concentration: 100 }), 0);
  });

  test('returns 0 for undefined weightKg on weight-based dose', () => {
    assert.equal(calcDripRate({ doseValue: 0.1, doseUnit: 'mcg/kg/min', weightKg: undefined, concentration: 100 }), 0);
  });

  test('returns 0 for null concentration', () => {
    assert.equal(calcDripRate({ doseValue: 0.1, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: null }), 0);
  });

  test('returns 0 for undefined concentration', () => {
    assert.equal(calcDripRate({ doseValue: 0.1, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: undefined }), 0);
  });

  test('returns 0 for negative concentration', () => {
    assert.equal(calcDripRate({ doseValue: 0.1, doseUnit: 'mcg/kg/min', weightKg: 70, concentration: -5 }), 0);
  });

  test('returns 0 for NaN weightKg', () => {
    assert.equal(calcDripRate({ doseValue: 0.1, doseUnit: 'mcg/kg/min', weightKg: NaN, concentration: 100 }), 0);
  });

  test('returns 0 for missing doseUnit', () => {
    assert.equal(calcDripRate({ doseValue: 0.1, doseUnit: undefined, weightKg: 70, concentration: 100 }), 0);
  });

  test('non-weight-based dose ignores weightKg when null', () => {
    // mg/hr is not weight-based, so null weightKg should still calculate
    const rate = calcDripRate({ doseValue: 5, doseUnit: 'mg/hr', weightKg: null, concentration: 0.1 });
    assert.equal(rate, 50);
  });
});