const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { CLINICAL_ENGINE } = require('../shared/clinical-engine.js');

describe('CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021', () => {
  test('male, age 60, Scr 1.0 → 86 (matches anticoag-engine parity)', () => {
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'male'), 86);
  });

  test('female, age 60, Scr 1.0 → 64', () => {
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'female'), 64);
  });

  test('elderly male with high Scr (age 80, Scr 1.5 → 47)', () => {
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.5, 80, 'male'), 47);
  });

  test('returns null when creatinine invalid', () => {
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(0, 60, 'male'), null);
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(-1, 60, 'male'), null);
  });

  test('returns null when age invalid', () => {
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 0, 'male'), null);
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, -5, 'male'), null);
  });

  test('returns null when sex missing/invalid', () => {
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, null), null);
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, undefined), null);
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, ''), null);
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'x'), null);
  });

  // F2: Case-insensitivity + whitespace trim tests
  test('case-insensitive: "Female" and "FEMALE" produce same result as "female"', () => {
    const expected = CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'female');
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'Female'), expected);
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'FEMALE'), expected);
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'Male'), CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'male'));
  });

  test('whitespace-trimmed: " female " produces same result as "female"', () => {
    const expected = CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'female');
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, ' female '), expected);
    assert.equal(CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, '  male  '), CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'male'));
  });

  test('rounds to integer (parity with anticoag-engine)', () => {
    // Before F1 fix, clinical-engine returned raw float. Now should return rounded integer.
    const result = CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021(1.2, 55, 'male');
    assert.equal(result, Math.round(result));
  });
});

describe('CLINICAL_ENGINE.calcGRACE — Killip lookup (F3)', () => {
  test('Killip 1 → 0 points (direct string key, no String() coercion)', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 60, hr: 80, sbp: 120, cr: 1.0, cardArr: false, stDev: false, elevMk: false, killip: '1' });
    assert.equal(r.bd.kilP, 0);
  });

  test('Killip 4 → 59 points', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 60, hr: 80, sbp: 120, cr: 1.0, cardArr: false, stDev: false, elevMk: false, killip: '4' });
    assert.equal(r.bd.kilP, 59);
  });

  test('Killip null → 0 points (no String(null) "null" key footgun)', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 60, hr: 80, sbp: 120, cr: 1.0, cardArr: false, stDev: false, elevMk: false, killip: null });
    assert.equal(r.bd.kilP, 0);
  });

  test('Killip undefined → 0 points', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 60, hr: 80, sbp: 120, cr: 1.0, cardArr: false, stDev: false, elevMk: false, killip: undefined });
    assert.equal(r.bd.kilP, 0);
  });

  test('full GRACE score calculation with Killip 3', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 75, hr: 100, sbp: 110, cr: 1.5, cardArr: true, stDev: true, elevMk: true, killip: '3' });
    assert.ok(r.score > 100, `Expected high GRACE score, got ${r.score}`);
    assert.equal(r.bd.kilP, 39);
  });
});