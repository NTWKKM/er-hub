const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    calcMgSO4Loading,
    calcMgSO4MaintenanceIV,
    calcMgSO4IM,
    calcMgSO4RecurrentBolus,
    checkMgSO4Toxicity,
    classifyBPSeverity,
    evalSevereFeatures,
    MAINTENANCE_FORMULAS,
    DIAGNOSTIC_CRITERIA,
    MGSO4_CONC_50PCT,
    MGSO4_CONC_10PCT
} = require('../shared/ob-engine.js');

// ─── calcMgSO4Loading ────────────────────────────────────────────────────────

describe('calcMgSO4Loading', () => {
    test('loading dose is 4g', () => {
        const r = calcMgSO4Loading();
        assert.equal(r.doseG, 4);
        assert.equal(r.doseMg, 4000);
    });

    test('50% MgSO4 volume is 8 mL', () => {
        const r = calcMgSO4Loading();
        assert.equal(r.vol50pct, 8);  // 4000 / 500
    });

    test('10% MgSO4 volume is 40 mL', () => {
        const r = calcMgSO4Loading();
        assert.equal(r.vol10pct, 40);  // 4000 / 100
    });

    test('diluent volume to convert 50%→10% is 32 mL', () => {
        const r = calcMgSO4Loading();
        assert.equal(r.diluentVol, 32);  // 40 - 8
    });

    test('ampule count is 0.8 (≈1 amp)', () => {
        const r = calcMgSO4Loading();
        assert.equal(r.ampCount, 0.8);  // 8 mL / 10 mL per amp
    });

    test('pump rate range is 80-120 mL/hr (40 mL over 20-30 min)', () => {
        const r = calcMgSO4Loading();
        assert.equal(r.pumpRateRange.min, 80);
        assert.equal(r.pumpRateRange.max, 120);
    });

    test('max rate is 1 g/min', () => {
        const r = calcMgSO4Loading();
        assert.equal(r.rateMaxGPerMin, 1);
    });
});

// ─── calcMgSO4MaintenanceIV ──────────────────────────────────────────────────

describe('calcMgSO4MaintenanceIV', () => {
    test('formula A rate for 1 g/hr = 100 mL/hr', () => {
        const r = calcMgSO4MaintenanceIV();
        assert.equal(r.formulaA.rate1g, 100);
    });

    test('formula A rate for 2 g/hr = 200 mL/hr', () => {
        const r = calcMgSO4MaintenanceIV();
        assert.equal(r.formulaA.rate2g, 200);
    });

    test('formula B rate for 1 g/hr = 25 mL/hr', () => {
        const r = calcMgSO4MaintenanceIV();
        assert.equal(r.formulaB.rate1g, 25);
    });

    test('formula B rate for 2 g/hr = 50 mL/hr', () => {
        const r = calcMgSO4MaintenanceIV();
        assert.equal(r.formulaB.rate2g, 50);
    });

    test('formula A uses 20 mL of 50% MgSO4 (10g)', () => {
        const r = calcMgSO4MaintenanceIV();
        assert.equal(r.formulaA.mgso4_50pct_mL, 20);
        assert.equal(r.formulaA.mgso4_g, 10);
    });

    test('formula B uses 40 mL of 50% MgSO4 (20g)', () => {
        const r = calcMgSO4MaintenanceIV();
        assert.equal(r.formulaB.mgso4_50pct_mL, 40);
        assert.equal(r.formulaB.mgso4_g, 20);
    });

    test('formula A final concentration is 10 mg/mL', () => {
        const r = calcMgSO4MaintenanceIV();
        assert.equal(r.formulaA.finalConc_mg_per_mL, 10);
    });

    test('formula B final concentration is 40 mg/mL', () => {
        const r = calcMgSO4MaintenanceIV();
        assert.equal(r.formulaB.finalConc_mg_per_mL, 40);
    });
});

// ─── calcMgSO4IM ─────────────────────────────────────────────────────────────

describe('calcMgSO4IM', () => {
    test('loading dose is 10g total (5g per buttock)', () => {
        const r = calcMgSO4IM();
        assert.equal(r.loadDoseG, 10);
        assert.equal(r.dosePerSideG, 5);
    });

    test('volume per buttock is 10 mL (50% MgSO4)', () => {
        const r = calcMgSO4IM();
        assert.equal(r.volPerSide, 10);  // 5000 / 500
    });

    test('maintenance IM is 5g (10 mL) q4h', () => {
        const r = calcMgSO4IM();
        assert.equal(r.maintDoseG, 5);
        assert.equal(r.maintVol, 10);
        assert.equal(r.maintInterval, 'q4h');
    });

    test('includes lidocaine mixing note', () => {
        const r = calcMgSO4IM();
        assert.ok(r.lidocaineNote.includes('Lidocaine 2%'));
    });
});

// ─── calcMgSO4RecurrentBolus ─────────────────────────────────────────────────

describe('calcMgSO4RecurrentBolus', () => {
    test('recurrent dose is 2g', () => {
        const r = calcMgSO4RecurrentBolus();
        assert.equal(r.doseG, 2);
        assert.equal(r.doseMg, 2000);
    });

    test('50% volume is 4 mL', () => {
        const r = calcMgSO4RecurrentBolus();
        assert.equal(r.vol50pct, 4);  // 2000 / 500
    });

    test('10% volume is 20 mL', () => {
        const r = calcMgSO4RecurrentBolus();
        assert.equal(r.vol10pct, 20);  // 2000 / 100
    });

    test('diluent volume is 16 mL', () => {
        const r = calcMgSO4RecurrentBolus();
        assert.equal(r.diluentVol, 16);  // 20 - 4
    });

    test('includes second-line benzodiazepine note', () => {
        const r = calcMgSO4RecurrentBolus();
        assert.ok(r.secondLine.includes('Benzodiazepine'));
    });
});

// ─── checkMgSO4Toxicity ──────────────────────────────────────────────────────

describe('checkMgSO4Toxicity', () => {
    test('no toxicity when all parameters normal', () => {
        const r = checkMgSO4Toxicity({ rr: 16, dtrAbsent: false, urineOutput: 50 });
        assert.equal(r.isToxic, false);
        assert.equal(r.flags.length, 0);
    });

    test('DTR absent triggers critical flag', () => {
        const r = checkMgSO4Toxicity({ rr: 16, dtrAbsent: true, urineOutput: 50 });
        assert.equal(r.isToxic, true);
        assert.ok(r.flags.some(f => f.id === 'dtr' && f.severity === 'critical'));
    });

    test('RR <12 triggers critical flag', () => {
        const r = checkMgSO4Toxicity({ rr: 10, dtrAbsent: false, urineOutput: 50 });
        assert.equal(r.isToxic, true);
        assert.ok(r.flags.some(f => f.id === 'rr' && f.severity === 'critical'));
    });

    test('RR exactly 12 does not trigger', () => {
        const r = checkMgSO4Toxicity({ rr: 12, dtrAbsent: false, urineOutput: 50 });
        assert.equal(r.isToxic, false);
    });

    test('UO <25 mL/hr triggers warning flag', () => {
        const r = checkMgSO4Toxicity({ rr: 16, dtrAbsent: false, urineOutput: 20 });
        assert.equal(r.isToxic, true);
        assert.ok(r.flags.some(f => f.id === 'uo' && f.severity === 'warning'));
    });

    test('multiple toxicity flags stack', () => {
        const r = checkMgSO4Toxicity({ rr: 8, dtrAbsent: true, urineOutput: 10 });
        assert.equal(r.isToxic, true);
        assert.equal(r.flags.length, 3);
    });

    test('null parameters are safe', () => {
        const r = checkMgSO4Toxicity({ rr: null, dtrAbsent: false, urineOutput: null });
        assert.equal(r.isToxic, false);
    });

    test('includes antidote note (Calcium gluconate)', () => {
        const r = checkMgSO4Toxicity({ rr: 16, dtrAbsent: false, urineOutput: 50 });
        assert.ok(r.antidoteNote.includes('Calcium gluconate'));
    });
});

// ─── classifyBPSeverity ──────────────────────────────────────────────────────

describe('classifyBPSeverity', () => {
    test('≥160/110 is severe', () => {
        const r = classifyBPSeverity(160, 110);
        assert.equal(r.isSevere, true);
        assert.equal(r.category, 'severe');
    });

    test('SBP ≥160 alone is severe', () => {
        const r = classifyBPSeverity(170, 90);
        assert.equal(r.isSevere, true);
    });

    test('DBP ≥110 alone is severe', () => {
        const r = classifyBPSeverity(140, 115);
        assert.equal(r.isSevere, true);
    });

    test('140-159/90-109 is mild (non-severe)', () => {
        const r = classifyBPSeverity(150, 100);
        assert.equal(r.isSevere, false);
        assert.equal(r.category, 'mild');
    });

    test('<140/90 is normal', () => {
        const r = classifyBPSeverity(120, 80);
        assert.equal(r.isSevere, false);
        assert.equal(r.category, 'normal');
    });

    test('null input returns safe defaults', () => {
        const r = classifyBPSeverity(null, null);
        assert.equal(r.isSevere, false);
        assert.equal(r.label, '');
    });
});

// ─── evalSevereFeatures ──────────────────────────────────────────────────────

describe('evalSevereFeatures', () => {
    test('no features selected → count 0, not severe', () => {
        const r = evalSevereFeatures({});
        assert.equal(r.count, 0);
        assert.equal(r.hasSevereFeature, false);
    });

    test('single feature positive → count 1, is severe', () => {
        const r = evalSevereFeatures({ bp_160_110: true });
        assert.equal(r.count, 1);
        assert.equal(r.hasSevereFeature, true);
        assert.equal(r.positive[0].id, 'bp_160_110');
    });

    test('multiple features positive → correct count', () => {
        const r = evalSevereFeatures({ bp_160_110: true, plt_lt_100k: true, headache: true });
        assert.equal(r.count, 3);
        assert.equal(r.hasSevereFeature, true);
    });

    test('unknown feature IDs are ignored', () => {
        const r = evalSevereFeatures({ unknown_feature: true });
        assert.equal(r.count, 0);
        assert.equal(r.hasSevereFeature, false);
    });

    test('null input returns safe defaults', () => {
        const r = evalSevereFeatures(null);
        assert.equal(r.count, 0);
        assert.equal(r.hasSevereFeature, false);
    });

    test('false features are not counted', () => {
        const r = evalSevereFeatures({ bp_160_110: false, plt_lt_100k: true });
        assert.equal(r.count, 1);
        assert.equal(r.positive[0].id, 'plt_lt_100k');
    });
});

// ─── BP_PROTOCOLS & Engine Cross-Validation ────────────────────────────────────────

describe('BP_PROTOCOLS & Engine Cross-Validation', () => {
    test('BP_PROTOCOLS has hydralazine, labetalol, and nifedipine with contraindications', () => {
        const { BP_PROTOCOLS } = require('../shared/ob-engine.js');
        assert.ok(BP_PROTOCOLS.hydralazine);
        assert.ok(BP_PROTOCOLS.labetalol);
        assert.ok(BP_PROTOCOLS.nifedipine);
        assert.ok(BP_PROTOCOLS.contraindicatedPregnancy);
        assert.ok(BP_PROTOCOLS.hydralazine.contraindications.includes('ACS'));
        assert.ok(BP_PROTOCOLS.labetalol.contraindications.includes('astma') || BP_PROTOCOLS.labetalol.contraindications.includes('asthma'));
        assert.ok(BP_PROTOCOLS.nifedipine.contraindications.includes('hypotension'));
    });

    test('Loading dose mathematical identities holds', () => {
        const load = calcMgSO4Loading();
        assert.equal(load.diluentVol, load.vol10pct - load.vol50pct);
        assert.equal(load.vol50pct * MGSO4_CONC_50PCT, load.doseMg);
        assert.equal(load.vol10pct * MGSO4_CONC_10PCT, load.doseMg);
    });

    test('Maintenance formulas concentration math is precise', () => {
        const m = calcMgSO4MaintenanceIV();
        assert.equal((m.formulaA.mgso4_g * 1000) / m.formulaA.totalVolume_mL, m.formulaA.finalConc_mg_per_mL);
        assert.equal((m.formulaB.mgso4_g * 1000) / m.formulaB.totalVolume_mL, m.formulaB.finalConc_mg_per_mL);
    });

    test('Recurrent bolus volume math is precise', () => {
        const r = calcMgSO4RecurrentBolus();
        assert.equal(r.vol50pct * MGSO4_CONC_50PCT, r.doseMg);
        assert.equal(r.vol10pct * MGSO4_CONC_10PCT, r.doseMg);
        assert.equal(r.diluentVol, r.vol10pct - r.vol50pct);
    });
});

// ─── Safety & Contraindications ─────────────────────────────────────────────

describe('checkMgSO4Safety & Clinical Constants', () => {
    const {
        checkMgSO4Safety,
        MGSO4_CONTRAINDICATIONS,
        ALTERNATIVE_ANTICONVULSANTS,
        CALCIUM_ANTIDOTES,
        TEXTBOOK_VARIATIONS
    } = require('../shared/ob-engine.js');

    test('Myasthenia Gravis triggers absolute contraindication and lists alternative drugs', () => {
        const res = checkMgSO4Safety({ hasMyasthenia: true });
        assert.equal(res.isSafe, false);
        assert.equal(res.isContraindicated, true);
        assert.ok(res.warnings.some(w => w.id === 'myasthenia' && w.severity === 'critical'));
        assert.equal(res.alternatives.length, 4);
    });

    test('Renal impairment adds warning flag', () => {
        const res = checkMgSO4Safety({ isRenalImpaired: true });
        assert.equal(res.isSafe, true); // Not contraindicated per se, but has warning
        assert.ok(res.warnings.some(w => w.id === 'renal' && w.severity === 'warning'));
    });

    test('Toxicity and contraindication warnings stack correctly', () => {
        const res = checkMgSO4Safety({ hasMyasthenia: true, isRenalImpaired: true, rr: 10, dtrAbsent: true });
        assert.equal(res.isSafe, false);
        assert.equal(res.isContraindicated, true);
        assert.equal(res.isToxic, true);
        assert.equal(res.warnings.length, 4); // myasthenia + dtr + rr + renal
    });

    test('CALCIUM_ANTIDOTES has both gluconate and chloride', () => {
        assert.ok(CALCIUM_ANTIDOTES.calciumGluconate);
        assert.ok(CALCIUM_ANTIDOTES.calciumChloride);
        assert.ok(CALCIUM_ANTIDOTES.calciumChloride.route.includes('Central line'));
    });

    test('ALTERNATIVE_ANTICONVULSANTS contains 4 first-line choices', () => {
        assert.equal(ALTERNATIVE_ANTICONVULSANTS.length, 4);
        assert.ok(ALTERNATIVE_ANTICONVULSANTS.some(a => a.name.includes('Lorazepam')));
        assert.ok(ALTERNATIVE_ANTICONVULSANTS.some(a => a.name.includes('Diazepam')));
        assert.ok(ALTERNATIVE_ANTICONVULSANTS.some(a => a.name.includes('Phenytoin')));
        assert.ok(ALTERNATIVE_ANTICONVULSANTS.some(a => a.name.includes('Levetiracetam')));
    });

    test('TEXTBOOK_VARIATIONS documents Tintinalli, Rosen, and Goldfrank', () => {
        assert.ok(TEXTBOOK_VARIATIONS.tintinalli.includes('Tintinalli 9th'));
        assert.ok(TEXTBOOK_VARIATIONS.rosen.includes('Rosen 10th'));
        assert.ok(TEXTBOOK_VARIATIONS.goldfrank.includes('Goldfrank 11th'));
    });
});
