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

describe('CLINICAL_ENGINE.calcGRACE — edge cases', () => {
  test('age 0 → 0 age points', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 0, hr: 80, sbp: 120, cr: 1.0, cardArr: false, stDev: false, elevMk: false, killip: '1' });
    assert.equal(r.bd.ageP, 0);
  });

  test('HR 0 → 0 HR points', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 60, hr: 0, sbp: 120, cr: 1.0, cardArr: false, stDev: false, elevMk: false, killip: '1' });
    assert.equal(r.bd.hrP, 0);
  });

  test('SBP 0 → 58 points (highest SBP score)', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 60, hr: 80, sbp: 0, cr: 1.0, cardArr: false, stDev: false, elevMk: false, killip: '1' });
    assert.equal(r.bd.sbpP, 58);
  });

  test('creatinine 0 → 1 point (lowest CR score)', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 60, hr: 80, sbp: 120, cr: 0, cardArr: false, stDev: false, elevMk: false, killip: '1' });
    assert.equal(r.bd.crP, 1);
  });

  test('all boolean flags false → no extra points', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 60, hr: 80, sbp: 120, cr: 1.0, cardArr: false, stDev: false, elevMk: false, killip: '1' });
    assert.equal(r.bd.arrP, 0);
    assert.equal(r.bd.stP, 0);
    assert.equal(r.bd.mkP, 0);
  });

  test('all boolean flags true → 39+28+14 = 81 extra points', () => {
    const r = CLINICAL_ENGINE.calcGRACE({ age: 60, hr: 80, sbp: 120, cr: 1.0, cardArr: true, stDev: true, elevMk: true, killip: '1' });
    assert.equal(r.bd.arrP, 39);
    assert.equal(r.bd.stP, 28);
    assert.equal(r.bd.mkP, 14);
  });

  test('score at boundary 140 → non-high risk', () => {
    // riskLevel uses > 140 (strict), so exactly 140 should be non-high
    assert.equal(CLINICAL_ENGINE.riskLevel(140, false, false), 'non-high');
  });

  test('score at 141 → high risk', () => {
    assert.equal(CLINICAL_ENGINE.riskLevel(141, false, false), 'high');
  });

  test('anyH1 flag → high risk even with low score', () => {
    assert.equal(CLINICAL_ENGINE.riskLevel(50, false, true), 'high');
  });

  test('anyVH flag → very-high risk overrides everything', () => {
    assert.equal(CLINICAL_ENGINE.riskLevel(50, true, true), 'very-high');
    assert.equal(CLINICAL_ENGINE.riskLevel(50, true, false), 'very-high');
  });

  test('score 0 with no flags → non-high', () => {
    assert.equal(CLINICAL_ENGINE.riskLevel(0, false, false), 'non-high');
  });
});