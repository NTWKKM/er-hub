const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calcAnticoag, calcHeparinInitialDose, getHeparinTitration, HEPARIN_STANDALONE_PROTOCOLS } = require('../shared/anticoag-engine.js');

describe('calcAnticoag', () => {
  test('eGFR < 15 → heparin recommendation with bolus/infusion', () => {
    const r = calcAnticoag(70, 65, 10);
    assert.equal(r.rec, 'heparin');
    assert.equal(r.hepBolus, Math.min(Math.round(70 * 60), 4000)); // 4200 → capped 4000
    assert.equal(r.hepInf, Math.min(Math.round(70 * 12), 1000));   // 840
    assert.equal(r.hepRate, (840 / 100).toFixed(1));               // 8.4
  });

  test('eGFR ≥ 20 → fondaparinux recommendation', () => {
    const r = calcAnticoag(70, 65, 30);
    assert.equal(r.rec, 'fondaparinux');
  });

  test('eGFR 15-19 → enoxaparin recommendation (fondaparinux CI)', () => {
    const r = calcAnticoag(70, 65, 17);
    assert.equal(r.rec, 'enoxaparin');
  });

  test('enoxaparin: eGFR < 30 → 1 mg/kg regardless of age', () => {
    const r = calcAnticoag(70, 80, 25);
    assert.equal(r.enoxDose, 70);  // 70 * 1.0 = 70
    assert.equal(r.enoxRoute, 'SC q24h');
    assert.match(r.enoxNote, /GFR 15–29/);
  });

  test('enoxaparin: age ≥ 75, eGFR ≥ 30 → 0.75 mg/kg', () => {
    const r = calcAnticoag(70, 80, 50);
    assert.equal(r.enoxDose, Math.round(70 * 0.75));  // 53
    assert.equal(r.enoxRoute, 'SC q12h (no bolus)');
    assert.match(r.enoxNote, /Age ≥75/);
  });

  test('enoxaparin: age < 75, eGFR ≥ 30 → 1 mg/kg', () => {
    const r = calcAnticoag(70, 60, 50);
    assert.equal(r.enoxDose, 70);  // 70 * 1.0 = 70
    assert.equal(r.enoxRoute, 'SC q12h');
    assert.match(r.enoxNote, /Age <75/);
  });

  test('heparin bolus ceiling: weight 100kg → capped at 4000', () => {
    const r = calcAnticoag(100, 65, 10);
    assert.equal(r.hepBolus, 4000);  // 100*60=6000 → capped 4000
  });

  test('heparin infusion ceiling: weight 100kg → capped at 1000', () => {
    const r = calcAnticoag(100, 65, 10);
    assert.equal(r.hepInf, 1000);  // 100*12=1200 → capped 1000
  });
});

describe('calcHeparinInitialDose', () => {
  test('ami_fibrinolytic: 70kg, 100 units/mL', () => {
    const r = calcHeparinInitialDose('ami_fibrinolytic', 70, 100);
    assert.equal(r.bolus, Math.min(70 * 60, 4000));   // 4200 → 4000
    assert.equal(r.infusion, Math.min(70 * 12, 1000)); // 840
    assert.equal(r.dripRate, parseFloat((840 / 100).toFixed(1))); // 8.4
    assert.equal(r.maxDoseLimit, 48000);
  });

  test('pe_thrombus: 70kg, 100 units/mL — high-dose protocol', () => {
    const r = calcHeparinInitialDose('pe_thrombus', 70, 100);
    assert.equal(r.bolus, Math.min(70 * 80, 10000));   // 5600
    assert.equal(r.infusion, Math.min(70 * 18, 1800));  // 1260
    assert.equal(r.dripRate, parseFloat((1260 / 100).toFixed(1))); // 12.6
  });

  test('acs_valve: 70kg, 50 units/mL', () => {
    const r = calcHeparinInitialDose('acs_valve', 70, 50);
    assert.equal(r.bolus, Math.min(70 * 70, 5000));    // 4900
    assert.equal(r.infusion, Math.min(70 * 15, 1200));  // 1050
    assert.equal(r.dripRate, parseFloat((1050 / 50).toFixed(1))); // 21.0
  });

  test('bolus ceiling: pe_thrombus, 200kg → capped at 10000', () => {
    const r = calcHeparinInitialDose('pe_thrombus', 200, 100);
    assert.equal(r.bolus, 10000);  // 200*80=16000 → capped 10000
  });

  test('infusion ceiling: pe_thrombus, 200kg → capped at 1800', () => {
    const r = calcHeparinInitialDose('pe_thrombus', 200, 100);
    assert.equal(r.infusion, 1800);  // 200*18=3600 → capped 1800
  });

  test('returns null for invalid protocol', () => {
    assert.equal(calcHeparinInitialDose('nonexistent', 70, 100), null);
  });

  test('returns null for zero weight', () => {
    assert.equal(calcHeparinInitialDose('ami_fibrinolytic', 0, 100), null);
  });

  test('returns null for zero concentration', () => {
    assert.equal(calcHeparinInitialDose('ami_fibrinolytic', 70, 0), null);
  });
});

describe('getHeparinTitration', () => {
  test('therapeutic range (aPTT 1.5-2.5): no change', () => {
    const r = getHeparinTitration(1.8, 1000, 100);
    assert.equal(r.action, 'ให้ยาอัตราเดิม (Therapeutic Range)');
    assert.equal(r.rateChangeUnits, 0);
    assert.equal(r.nextRateUnitsHr, 1000);
    assert.equal(r.bolusUnits, 0);
    assert.equal(r.stopTimeMin, 0);
  });

  test('aPTT > 7.0: stop 180min, -500 units', () => {
    const r = getHeparinTitration(8.0, 1000, 100);
    assert.equal(r.stopTimeMin, 180);
    assert.equal(r.rateChangeUnits, -500);
    assert.equal(r.nextRateUnitsHr, 500);
  });

  test('aPTT 5.1-7.0: stop 60min, -500 units', () => {
    const r = getHeparinTitration(6.0, 1000, 100);
    assert.equal(r.stopTimeMin, 60);
    assert.equal(r.rateChangeUnits, -500);
    assert.equal(r.nextRateUnitsHr, 500);
  });

  test('aPTT 4.1-5.0: stop 60min, -300 units', () => {
    const r = getHeparinTitration(4.5, 1000, 100);
    assert.equal(r.stopTimeMin, 60);
    assert.equal(r.rateChangeUnits, -300);
    assert.equal(r.nextRateUnitsHr, 700);
  });

  test('aPTT 3.1-4.0: stop 60min, -200 units', () => {
    const r = getHeparinTitration(3.5, 1000, 100);
    assert.equal(r.stopTimeMin, 60);
    assert.equal(r.rateChangeUnits, -200);
    assert.equal(r.nextRateUnitsHr, 800);
  });

  test('aPTT 2.6-3.0: stop 60min, -100 units', () => {
    const r = getHeparinTitration(2.8, 1000, 100);
    assert.equal(r.stopTimeMin, 60);
    assert.equal(r.rateChangeUnits, -100);
    assert.equal(r.nextRateUnitsHr, 900);
  });

  test('aPTT 1.2-1.4: bolus 2500, +150 units', () => {
    const r = getHeparinTitration(1.3, 1000, 100);
    assert.equal(r.bolusUnits, 2500);
    assert.equal(r.rateChangeUnits, 150);
    assert.equal(r.nextRateUnitsHr, 1150);
  });

  test('aPTT < 1.2: bolus 5000, +400 units', () => {
    const r = getHeparinTitration(1.0, 1000, 100);
    assert.equal(r.bolusUnits, 5000);
    assert.equal(r.rateChangeUnits, 400);
    assert.equal(r.nextRateUnitsHr, 1400);
  });

  test('rate cap at 2000 units/hr', () => {
    // currentRate 1800 + 400 = 2200 → capped at 2000
    const r = getHeparinTitration(1.0, 1800, 100);
    assert.equal(r.nextRateUnitsHr, 2000);
    assert.ok(r.cappedText.includes('Capped'));
  });

  test('rate does not go negative', () => {
    // currentRate 300 - 500 = -200 → clamped to 0
    const r = getHeparinTitration(8.0, 300, 100);
    assert.equal(r.nextRateUnitsHr, 0);
  });

  test('mL/hr conversion correct for 50 units/mL concentration', () => {
    const r = getHeparinTitration(1.8, 1000, 50);
    assert.equal(r.nextRateMlHr, parseFloat((1000 / 50).toFixed(1))); // 20.0
  });
});

describe('HEPARIN_STANDALONE_PROTOCOLS', () => {
  test('has 4 protocol definitions', () => {
    assert.equal(Object.keys(HEPARIN_STANDALONE_PROTOCOLS).length, 4);
  });

  test('each protocol has required fields', () => {
    for (const [key, proto] of Object.entries(HEPARIN_STANDALONE_PROTOCOLS)) {
      assert.ok(proto.name, `${key} missing name`);
      assert.ok(typeof proto.bolusPerKg === 'number', `${key} missing bolusPerKg`);
      assert.ok(typeof proto.maxBolus === 'number', `${key} missing maxBolus`);
      assert.ok(typeof proto.infPerKg === 'number', `${key} missing infPerKg`);
      assert.ok(typeof proto.maxInf === 'number', `${key} missing maxInf`);
    }
  });
});