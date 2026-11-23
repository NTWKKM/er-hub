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

    test('100 mL IV bag dilution option calculates total volume 108 mL and pump rate 216-324 mL/hr', () => {
        const r = calcMgSO4Loading();
        assert.ok(r.ivBagOption);
        assert.equal(r.ivBagOption.diluentVol, 100);
        assert.equal(r.ivBagOption.totalVol, 108);
        assert.equal(r.ivBagOption.pumpRateRange.min, 216);
        assert.equal(r.ivBagOption.pumpRateRange.max, 324);
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

    // RTCOG OB 69-046 (2569) and the MNRH standing order use RR < 14/min.
    test('RR <14 triggers critical flag', () => {
        const r = checkMgSO4Toxicity({ rr: 13, dtrAbsent: false, urineOutput: 50 });
        assert.equal(r.isToxic, true);
        assert.ok(r.flags.some(f => f.id === 'rr' && f.severity === 'critical'));
    });

    test('RR exactly 14 does not trigger', () => {
        const r = checkMgSO4Toxicity({ rr: 14, dtrAbsent: false, urineOutput: 50 });
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
    test('BP_PROTOCOLS has hydralazine, labetalol, nifedipine, and nicardipine with contraindications', () => {
        const { BP_PROTOCOLS, NURSING_CARE_ORDERS } = require('../shared/ob-engine.js');
        assert.ok(BP_PROTOCOLS.hydralazine);
        assert.ok(BP_PROTOCOLS.labetalol);
        assert.ok(BP_PROTOCOLS.nifedipine);
        assert.ok(BP_PROTOCOLS.nicardipine);
        assert.ok(BP_PROTOCOLS.contraindicatedPregnancy);
        assert.ok(BP_PROTOCOLS.hydralazine.contraindications.includes('ACS'));
        assert.ok(BP_PROTOCOLS.labetalol.contraindications.includes('astma') || BP_PROTOCOLS.labetalol.contraindications.includes('asthma'));
        assert.ok(BP_PROTOCOLS.nifedipine.contraindications.includes('hypotension'));
        assert.ok(BP_PROTOCOLS.nicardipine.contraindications.includes('shock') || BP_PROTOCOLS.nicardipine.contraindications.includes('Cardiogenic'));
        assert.ok(NURSING_CARE_ORDERS.location.includes('Labour Room'));
    });

    test('Loading dose mathematical identities holds', () => {
        const load = calcMgSO4Loading();
        assert.equal(load.diluentVol, load.vol10pct - load.vol50pct);
        assert.equal(load.vol50pct * MGSO4_CONC_50PCT, load.doseMg);
        assert.equal(load.vol10pct * MGSO4_CONC_10PCT, load.doseMg);
    });

    test('Maintenance formulas concentration math is precise', () => {
        const m = calcMgSO4MaintenanceIV();
        assert.ok(m.formulaC);
        assert.equal(m.formulaC.mgso4_g, 20);
        assert.equal(m.formulaC.rate1g, 50);
        assert.equal(m.formulaC.rate2g, 100);
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


// ─── MNRH Standing Order: Severe Preeclampsia (2569) ────────────────────────
describe('MNRH_SEVERE_PE_SO', () => {
    const { MNRH_SEVERE_PE_SO: so, SERUM_MG_LEVELS, BP_SECOND_LINE, MGSO4_CONTRAINDICATIONS } = require('../shared/ob-engine.js');

    test('loading: 10% MgSO4 4 g (40 mL) + D5W 100 mL over 20 min = 420 mL/hr', () => {
        assert.equal(so.loading.doseG * 1000 / MGSO4_CONC_10PCT, 40);
        assert.equal(so.loading.totalVol_mL, 40 + 100);
        assert.equal(so.loading.pumpRate_mL_hr, so.loading.totalVol_mL / so.loading.durationMin * 60);
    });

    test('maintenance: 40 g in 1,080 mL; labelled 50/25 mL/h deliver 1.85/0.93 g/h', () => {
        const m = so.maintenance;
        assert.equal(m.mgso4_50pct_mL * MGSO4_CONC_50PCT / 1000, m.mgso4_g);
        assert.equal(m.totalVol_mL, m.mgso4_50pct_mL + 1000);
        const gPerMl = m.mgso4_g / m.totalVol_mL;
        assert.equal(Math.round(gPerMl * m.rate2g_mL_hr * 100) / 100, m.actual2g_g_hr);
        assert.equal(Math.round(gPerMl * m.rate1g_mL_hr * 100) / 100, m.actual1g_g_hr);
    });

    test('1 g/h criteria include BMI < 25, Cr > 1.1 mg/dL, UO < 0.5 mL/kg/h', () => {
        assert.deepEqual(so.maintenance.reduceTo1gIf, ['BMI < 25 kg/m²', 'Cr > 1.1 mg/dL', 'Urine output < 0.5 mL/kg/h']);
    });

    test('BP ladder is labetalol 20 → 40 → 80 mg then hydralazine 10 mg', () => {
        assert.deepEqual(so.bpLadder.map(s => s.drug), ['Labetalol 20 mg IV', 'Labetalol 40 mg IV', 'Labetalol 80 mg IV', 'Hydralazine 10 mg IV']);
    });

    test('controlled-BP recheck schedule totals 16 readings', () => {
        assert.equal(so.bpControlledSchedule.reduce((n, s) => n + s.times, 0), 16);
    });

    test('renal impairment no longer reduces the loading dose', () => {
        assert.ok(!MGSO4_CONTRAINDICATIONS.renalImpairment.action.includes('2 g IV bolus'));
        assert.ok(MGSO4_CONTRAINDICATIONS.renalImpairment.action.includes('1 g/h'));
    });

    test('serum Mg table and second-line infusions are present', () => {
        assert.equal(SERUM_MG_LEVELS[0].mgdl, '5–9');
        assert.deepEqual(BP_SECOND_LINE.map(d => d.max), ['15 mg/h', '160 mg/h', '10 mg/h']);
    });
});

describe('BP escalation sequences and recurrent-seizure step-up (CodeRabbit PR 21)', () => {
    const { BP_PROTOCOLS: P } = require('../shared/ob-engine.js');
    test('hydralazine total including the 1 mg test dose stays within 20 mg', () => {
        assert.match(P.hydralazine.maxTotal, /20 mg \(รวม test dose\)/);
        assert.match(P.hydralazine.steps[2], /5–10 mg/);
        assert.match(P.hydralazine.steps[2], /1 \+ 5 \+ 10 mg/);
        // Repeat dose → 20 min recheck → labetalol only if still severe-range
        assert.match(P.hydralazine.steps[2], /วัด BP ซ้ำใน 20 min; ให้ Labetalol เฉพาะเมื่อ SBP ยัง ≥ 160 หรือ DBP ≥ 110 mmHg/);
        assert.match(P.hydralazine.steps[2], /monitor BP ต่อ/);
    });
    test('labetalol 80 mg is followed by a 10 min recheck before conditional hydralazine', () => {
        assert.match(P.labetalol.steps[2], /80 mg IV, วัด BP ซ้ำใน 10 min; ให้ Hydralazine 10 mg IV เฉพาะเมื่อ SBP ยัง ≥ 160 หรือ DBP ≥ 110/);
    });
    test('final nifedipine 20 mg is followed by a 20 min recheck before conditional labetalol', () => {
        assert.match(P.nifedipine.steps[2], /20 mg oral, วัด BP ใน 20 min; ให้ Labetalol 20 mg IV เฉพาะเมื่อ BP ยัง ≥ 160\/110/);
    });
    test('1.5 g/h step-up is scoped to patients currently on 1 g/h', () => {
        const rec = calcMgSO4RecurrentBolus();
        assert.equal(rec.infusionStepUpFromG_hr, 1);
        assert.match(rec.infusionStepUp, /1\.5 g\/h/);
    });
});

describe('tools/mgso4-calculator.html recurrent step-up display', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const { JSDOM } = require('jsdom');
    function load() {
        const file = path.join(__dirname, '..', 'tools/mgso4-calculator.html');
        const html = fs.readFileSync(file, 'utf8').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
            const p = path.resolve(path.dirname(file), src);
            return fs.existsSync(p) ? '<script>' + fs.readFileSync(p, 'utf8') + '</script>' : m;
        });
        return new JSDOM(html, { url: 'file://' + file, runScripts: 'dangerously' }).window;
    }
    test('hidden at 2 g/h, shown once a 1 g/h criterion is ticked', () => {
        const win = load();
        const out = win.document.getElementById('recurrent-stepup');
        assert.doesNotMatch(out.textContent, /1\.5 g\/h/);
        const cb = win.document.getElementById('crit-cr');
        cb.checked = true;
        cb.dispatchEvent(new win.Event('change'));
        assert.match(out.textContent, /1\.5 g\/h/);
    });
    test('urine-output threshold shows the exact comparison boundary', () => {
        const win = load();
        const w = win.document.getElementById('ob-weight');
        const show = (kg) => {
            w.value = kg;
            w.dispatchEvent(new win.Event('input'));
            return win.document.getElementById('uo-threshold').textContent;
        };
        // 65 kg × 0.5 = 32.5 mL/h, 4 h = 130 mL
        assert.match(show('65'), /< 32\.5 mL\/h.*< 130 mL/);
        // 64.5 kg → 32.25 mL/h: must not display "< 32", which would miss a 32 mL/h output
        assert.match(show('64.5'), /< 32\.25 mL\/h.*< 129 mL/);
    });
});
