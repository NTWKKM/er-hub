const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { EMERGENCY_DRUG_DATA } = require('../shared/drug-data.js');

describe('EMERGENCY_DRUG_DATA structure', () => {
  test('has 18 drugs', () => {
    assert.equal(EMERGENCY_DRUG_DATA.length, 18);
  });

  test('every drug has required fields', () => {
    EMERGENCY_DRUG_DATA.forEach(drug => {
      assert.ok(drug.id, `drug missing id`);
      assert.ok(drug.name, `${drug.id} missing name`);
      assert.ok(drug.thaiName, `${drug.id} missing thaiName`);
      assert.ok(drug.doseUnit, `${drug.id} missing doseUnit`);
      assert.ok(typeof drug.isWeightBased === 'boolean', `${drug.id} isWeightBased not boolean`);
      assert.ok(Array.isArray(drug.preparations), `${drug.id} missing preparations`);
      assert.ok(drug.preparations.length > 0, `${drug.id} has no preparations`);
      assert.ok(typeof drug.defaultPreparationIndex === 'number', `${drug.id} missing defaultPreparationIndex`);
      assert.ok(drug.doseRange, `${drug.id} missing doseRange`);
      assert.ok(drug.titrationGuide, `${drug.id} missing titrationGuide`);
      assert.ok(Array.isArray(drug.safetyWarnings), `${drug.id} missing safetyWarnings`);
    });
  });

  test('every preparation has label and concentration', () => {
    EMERGENCY_DRUG_DATA.forEach(drug => {
      drug.preparations.forEach((prep, i) => {
        assert.ok(prep.label, `${drug.id} prep[${i}] missing label`);
        assert.ok(typeof prep.concentration === 'number', `${drug.id} prep[${i}] missing concentration`);
        assert.ok(prep.concentration > 0, `${drug.id} prep[${i}] concentration must be positive`);
      });
    });
  });

  test('every doseRange has min, max, step, default', () => {
    EMERGENCY_DRUG_DATA.forEach(drug => {
      const r = drug.doseRange;
      assert.ok(typeof r.min === 'number', `${drug.id} doseRange missing min`);
      assert.ok(typeof r.max === 'number', `${drug.id} doseRange missing max`);
      assert.ok(typeof r.step === 'number', `${drug.id} doseRange missing step`);
      assert.ok(typeof r.default === 'number', `${drug.id} doseRange missing default`);
      assert.ok(r.min < r.max, `${drug.id} doseRange min >= max`);
      assert.ok(r.default >= r.min && r.default <= r.max, `${drug.id} default out of range`);
    });
  });

  test('defaultPreparationIndex is valid', () => {
    EMERGENCY_DRUG_DATA.forEach(drug => {
      assert.ok(
        drug.defaultPreparationIndex >= 0 && drug.defaultPreparationIndex < drug.preparations.length,
        `${drug.id} defaultPreparationIndex out of bounds`
      );
    });
  });
});

describe('EMERGENCY_DRUG_DATA specific drugs', () => {
  test('epinephrine exists with correct unit', () => {
    const epi = EMERGENCY_DRUG_DATA.find(d => d.id === 'epinephrine');
    assert.ok(epi);
    assert.equal(epi.doseUnit, 'mcg/kg/min');
    assert.equal(epi.isWeightBased, true);
  });

  test('epinephrine-anaphylaxis exists with correct unit', () => {
    const epiAnaph = EMERGENCY_DRUG_DATA.find(d => d.id === 'epinephrine-anaphylaxis');
    assert.ok(epiAnaph);
    assert.equal(epiAnaph.doseUnit, 'mcg/min');
    assert.equal(epiAnaph.isWeightBased, false);
    assert.equal(epiAnaph.doseRange.min, 1);
    assert.equal(epiAnaph.doseRange.max, 10);
  });

  test('heparin has two preparations (100 and 50 units/mL)', () => {
    const hep = EMERGENCY_DRUG_DATA.find(d => d.id === 'heparin');
    assert.ok(hep);
    assert.equal(hep.preparations.length, 2);
    assert.equal(hep.preparations[0].concentration, 100);
    assert.equal(hep.preparations[1].concentration, 50);
  });

  test('esmolol has showDualUnits flag and alt unit config', () => {
    const esm = EMERGENCY_DRUG_DATA.find(d => d.id === 'esmolol');
    assert.ok(esm);
    assert.equal(esm.showDualUnits, true);
    assert.equal(esm.altUnit, 'mcg/kg/min');
    assert.equal(esm.altUnitFactor, 1000);
  });

  test('nitroprusside has updated min range 0.25', () => {
    const nip = EMERGENCY_DRUG_DATA.find(d => d.id === 'nitroprusside');
    assert.ok(nip);
    assert.equal(nip.doseRange.min, 0.25);
    assert.equal(nip.doseRange.default, 0.25);
  });

  test('fentanyl max dose 10 mcg/kg/hr but safety ceiling 500 mcg/hr', () => {
    const fen = EMERGENCY_DRUG_DATA.find(d => d.id === 'fentanyl');
    assert.ok(fen);
    assert.equal(fen.doseRange.max, 10.0);
    assert.equal(fen.absoluteMaxPerHour, 500, 'fentanyl should have absoluteMaxPerHour = 500');
    // Safety warning mentions 500 mcg/hr ceiling
    const hasCeiling = fen.safetyWarnings.some(w => w.includes('500'));
    assert.ok(hasCeiling, 'fentanyl safety warning should mention 500 mcg/hr ceiling');
  });

  test('all weight-based drugs have /kg/ in doseUnit', () => {
    EMERGENCY_DRUG_DATA.filter(d => d.isWeightBased).forEach(drug => {
      assert.ok(drug.doseUnit.includes('/kg/'), `${drug.id} isWeightBased=true but doseUnit lacks /kg/`);
    });
  });

  test('non-weight-based drugs do NOT have /kg/ in doseUnit', () => {
    EMERGENCY_DRUG_DATA.filter(d => !d.isWeightBased).forEach(drug => {
      assert.ok(!drug.doseUnit.includes('/kg/'), `${drug.id} isWeightBased=false but doseUnit has /kg/`);
    });
  });

  test('unique IDs across all drugs', () => {
    const ids = EMERGENCY_DRUG_DATA.map(d => d.id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, 'duplicate drug IDs found');
  });
});