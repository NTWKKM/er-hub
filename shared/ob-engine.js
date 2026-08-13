/**
 * shared/ob-engine.js
 * MgSO4 dosing and obstetric emergency calculation engine.
 * Pure functional — no DOM dependency. Follows anticoag-engine.js pattern.
 *
 * References:
 *   - ACOG Practice Bulletin 222 (2020) + Committee Opinion 692 (2017)
 *   - WHO/Pritchard-Zuspan regimen (Cochrane reviews)
 *   - Thai — CMU OB&GYN (รศ.พญ.เกษมศรี ศรีสุพรรณดิฐ, ACOG Task Force 2013 +
 *     Williams Obstetrics 24th ed.)
 *
 * MgSO4 concentrations:
 *   50% MgSO4 = 500 mg/mL  (ampule 10 mL = 5 g)
 *   10% MgSO4 = 100 mg/mL  (diluted from 50%)
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const MGSO4_CONC_50PCT = 500;  // mg/mL
const MGSO4_CONC_10PCT = 100;  // mg/mL
const MGSO4_AMP_VOL_ML = 10;   // standard ampule volume
const MGSO4_AMP_DOSE_G = 5;    // grams per ampule (50% × 10 mL)

/**
 * Maintenance IV drip mixing formulas.
 * Each describes how to mix 50% MgSO4 into an IV bag for continuous infusion.
 */
const MAINTENANCE_FORMULAS = {
    formulaA: {
        label: 'สูตร A (Thai-CMU)',
        mgso4_50pct_mL: 20,
        mgso4_g: 10,
        diluent: 'D5W 1000 mL',
        totalVolume_mL: 1000,
        // final concentration: 10g / 1000 mL = 10 mg/mL (1%)
        finalConc_mg_per_mL: 10,
        rate1g: 100,  // mL/hr for 1 g/hr
        rate2g: 200   // mL/hr for 2 g/hr
    },
    formulaB: {
        label: 'สูตร B (Concentrated)',
        mgso4_50pct_mL: 40,
        mgso4_g: 20,
        diluent: 'D5W/NSS 460 mL',
        totalVolume_mL: 500,
        // final concentration: 20g / 500 mL = 40 mg/mL (4%)
        finalConc_mg_per_mL: 40,
        rate1g: 25,   // mL/hr for 1 g/hr
        rate2g: 50    // mL/hr for 2 g/hr
    }
};

/**
 * Antihypertensive escalation protocols for severe-range BP (≥160/110).
 * Source: Thai-CMU (max ceilings) aligned with ACOG, Tintinalli 9th, and Rosen 10th.
 */
const BP_PROTOCOLS = {
    hydralazine: {
        name: 'Hydralazine IV',
        steps: [
            '5 mg IV (ให้ช้า ≥2 min)',
            'ถ้า BP ยังไม่ลดใน 20 min → 5-10 mg IV ซ้ำ q20min'
        ],
        maxTotal: '20-30 mg',
        note: 'ถ้าครบ max → เปลี่ยนเป็น Labetalol หรือ consult specialist',
        contraindications: 'หลีกเลี่ยงในผู้ป่วยโรคหลอดเลือดหัวใจตีบเฉียบพลัน (ACS) เนื่องจากเกิด reflex tachycardia'
    },
    labetalol: {
        name: 'Labetalol IV',
        steps: [
            '20 mg IV (ให้ช้า ≥2 min)',
            'ถ้าไม่ตอบสนองใน 10 min → 40 mg IV',
            'ถ้ายังไม่ตอบสนอง → 80 mg IV q10min'
        ],
        maxTotal: '220-300 mg',
        note: 'ถ้าครบ max → เปลี่ยนเป็น Hydralazine หรือ consult specialist',
        contraindications: 'ห้ามใช้ใน Active asthma/Severe bronchospasm, Sinus bradycardia, Heart block > 1st degree'
    },
    nifedipine: {
        name: 'Nifedipine Oral',
        steps: [
            '10 mg oral (Immediate-release)',
            'ถ้ายังไม่ลดใน 30 min → repeat 10-20 mg oral q30min'
        ],
        maxTotal: '120 mg/day',
        note: 'ถ้าครบ max → switch IV Labetalol 40 mg',
        contraindications: 'ระวัง Overshoot hypotension และ tachycardia รุนแรง ซึ่งทำให้เกิด uteroplacental hypoperfusion'
    },
    contraindicatedPregnancy: {
        title: '⛔ Absolute Contraindications in Pregnancy',
        drugs: 'ACE inhibitors, ARBs, Direct Renin Inhibitors, Sodium Nitroprusside',
        reason: 'มีพิษร้ายแรงต่อทารกในครรภ์ (Teratogenic / Fetal renal failure / Oligohydramnios)'
    }
};

/**
 * MgSO4 Contraindications and Safety Warnings.
 */
const MGSO4_CONTRAINDICATIONS = {
    myastheniaGravis: {
        title: 'Myasthenia Gravis (Absolute Contraindication)',
        text: 'ห้ามใช้ MgSO4 เด็ดขาด! แมกนีเซียมยับยั้ง Pre-synaptic Acetylcholine release ที่ Neuromuscular junction ทำให้กล้ามเนื้ออ่อนแรงรุนแรงจนเกิด Respiratory failure เฉียบพลัน',
        action: 'ใช้ Alternative Anticonvulsant แทนทันที (Lorazepam / Diazepam / Phenytoin / Levetiracetam)'
    },
    renalImpairment: {
        title: 'Severe Renal Impairment (Dose Adjustment Required)',
        text: 'MgSO4 ขับออกทางไต 100% หากมี Renal insufficiency / oliguria ยาจะสะสมเกิดพิษร้ายแรง',
        action: 'พิจ็ารณาลด Loading dose เหลือ 2 g IV bolus, เจาะ Serum Mg ก่อนให้, และ Hold/ลด Maintenance dose'
    }
};

/**
 * Alternative Anticonvulsants when MgSO4 is contraindicated or fails (refractory seizures).
 */
const ALTERNATIVE_ANTICONVULSANTS = [
    { name: 'Lorazepam IV', dose: '2-4 mg IV slow over 2-5 min (ซ้ำได้ 1 ครั้งใน 10-15 min)', max: '4 mg' },
    { name: 'Diazepam IV', dose: '5-10 mg IV slow push', max: '10 mg' },
    { name: 'Phenytoin / Fosphenytoin IV', dose: 'Loading 15-20 mg/kg IV (Phenytoin max rate ≤50 mg/min, Fosphenytoin ≤150 mg/min)', max: '20 mg/kg' },
    { name: 'Levetiracetam IV', dose: '20-60 mg/kg IV q12h', max: '60 mg/kg' }
];

/**
 * Antidotes for Magnesium Toxicity (Hypermagnesemia).
 */
const CALCIUM_ANTIDOTES = {
    calciumGluconate: {
        name: 'Calcium gluconate 10%',
        dose: '10 mL (1 g) IV push over 3-5 min',
        route: 'Peripheral IV / Central line',
        note: 'ยาล้างพิษมาตรฐานประจำหอผู้ป่วย'
    },
    calciumChloride: {
        name: 'Calcium chloride 10%',
        dose: '10 mL (1 g) IV slow over 5-10 min',
        route: 'Central line / IO เท่านั้น',
        note: '⚠️ ห้ามให้ทาง Peripheral IV เพราะทำให้เกิด severe thrombophlebitis / tissue necrosis'
    }
};

/**
 * Literature Dosing Variations Reference (Tintinalli, Rosen, Goldfrank).
 */
const TEXTBOOK_VARIATIONS = {
    tintinalli: 'Tintinalli 9th: Loading 4-6g IV (ละลายใน D5W / 0.9% NSS 100 mL) over 15-30 min (หรือ 10g IM Pritchard), Maintenance 2g/h IV',
    rosen: 'Rosen 10th: Loading 4-6g IV over 15-20 min, Maintenance 1-2g/h IV',
    goldfrank: 'Goldfrank 11th: Loading 4g IV (ให้อย่างรวดเร็วใน 5 min หากกำลังชักรุนแรง), Maintenance 1-2g/h IV'
};

/**
 * Diagnostic criteria for pre-eclampsia severity classification.
 */
const DIAGNOSTIC_CRITERIA = {
    preeclampsia: {
        label: 'Pre-eclampsia',
        criteria: [
            { id: 'bp_140_90', text: 'BP ≥140/90 mmHg (วัด 2 ครั้ง ห่าง ≥4 ชม.)', category: 'BP' },
            { id: 'proteinuria', text: 'Proteinuria ≥300 mg/24h หรือ protein/creatinine ratio ≥0.3 หรือ dipstick ≥1+', category: 'Lab' },
            { id: 'ga_20wk', text: 'GA ≥20 สัปดาห์ หรือ postpartum', category: 'Clinical' }
        ],
        note: 'ต้องมี BP ≥140/90 + proteinuria (หรือ severe feature แม้ไม่มี proteinuria) หลัง GA 20 สัปดาห์'
    },
    severePreeclampsia: {
        label: 'Pre-eclampsia with Severe Features',
        criteria: [
            { id: 'bp_160_110', text: 'BP ≥160/110 mmHg (คงอยู่ ≥15 นาที)', category: 'BP' },
            { id: 'plt_lt_100k', text: 'Platelet <100,000 /μL (Thrombocytopenia)', category: 'Lab' },
            { id: 'lft_2x', text: 'AST/ALT ≥2× ULN (Elevated liver transaminases)', category: 'Lab' },
            { id: 'cr_gt_1_1', text: 'Cr >1.1 mg/dL หรือ doubling of baseline Cr (Renal insufficiency)', category: 'Lab' },
            { id: 'pulm_edema', text: 'Pulmonary edema', category: 'Clinical' },
            { id: 'headache', text: 'New-onset headache ไม่ตอบสนองต่อยาแก้ปวด (Cerebral symptoms)', category: 'Clinical' },
            { id: 'visual', text: 'Visual disturbances (ตาพร่ามัว, scotomata)', category: 'Clinical' },
            { id: 'ruq_pain', text: 'RUQ / epigastric pain ไม่ตอบสนองต่อยา', category: 'Clinical' }
        ],
        note: 'Pre-eclampsia + severe feature ≥1 ข้อ → ให้ MgSO4 seizure prophylaxis + BP control'
    },
    eclampsia: {
        label: 'Eclampsia',
        criteria: [
            { id: 'seizure', text: 'New-onset tonic-clonic seizure ใน pregnancy/postpartum ที่ไม่มีสาเหตุอื่น', category: 'Clinical' },
            { id: 'preeclampsia_hx', text: 'มีประวัติ pre-eclampsia / severe features นำมาก่อน (อาจไม่มีก็ได้)', category: 'Clinical' }
        ],
        note: 'Eclampsia = pre-eclampsia + seizure → MgSO4 treatment dose (loading 4g IV) + ABC management'
    }
};

// ─── Calculation Functions ───────────────────────────────────────────────────

/**
 * Calculates MgSO4 loading dose (4g IV standard).
 * Returns volumes for 50%, 10%, and 100 mL IV bag dilutions.
 *
 * @returns {Object} Loading dose details
 */
function calcMgSO4Loading() {
    const doseG = 4;
    const doseMg = doseG * 1000;

    // 50% MgSO4: 4000 mg / 500 mg/mL = 8 mL
    const vol50pct = doseMg / MGSO4_CONC_50PCT;
    // 10% MgSO4: 4000 mg / 100 mg/mL = 40 mL
    const vol10pct = doseMg / MGSO4_CONC_10PCT;
    // Number of ampules needed (50% × 10 mL = 5g per amp)
    const ampCount = vol50pct / MGSO4_AMP_VOL_ML;
    // Diluent to add to make 10%: 40 - 8 = 32 mL
    const diluentVol = vol10pct - vol50pct;

    // Alternative: Dilute in 100 mL IV Bag (Tintinalli recommendation)
    const ivBagDiluent = 100;
    const ivBagTotalVol = vol50pct + ivBagDiluent; // 108 mL

    return {
        doseG,
        doseMg,
        vol50pct,       // 8 mL
        vol10pct,       // 40 mL
        ampCount,       // 0.8 amps (≈1 amp)
        diluentVol,     // 32 mL sterile water/NSS to dilute to 10%
        rateMaxGPerMin: 1,
        infusionTimeMin: '20-30',
        // At 40 mL over 20-30 min → pump rate 80-120 mL/hr
        pumpRateRange: { min: 80, max: 120 },
        // IV Bag 100 mL option (Tintinalli): 108 mL over 20-30 min → pump rate 216-324 mL/hr
        ivBagOption: {
            diluentVol: ivBagDiluent, // 100 mL (D5W / 0.9% NSS)
            totalVol: ivBagTotalVol,  // 108 mL
            pumpRateRange: { min: 216, max: 324 },
            note: 'ดูด 50% MgSO4 8 mL (4g) ผสมใน D5W หรือ 0.9% NSS 100 mL (รวม 108 mL) หยดหมดใน 20-30 min (Tintinalli 9th)'
        }
    };
}


/**
 * Calculates MgSO4 maintenance IV drip for both formulas A and B,
 * showing both 1 g/hr and 2 g/hr rates.
 *
 * @returns {Object} Maintenance drip details for both formulas and both rates
 */
function calcMgSO4MaintenanceIV() {
    return {
        formulaA: { ...MAINTENANCE_FORMULAS.formulaA },
        formulaB: { ...MAINTENANCE_FORMULAS.formulaB },
        duration: '24 ชม. หลังคลอด หรือหลัง last seizure'
    };
}

/**
 * Calculates MgSO4 IM (Pritchard regimen) doses.
 *
 * @returns {Object} IM dosing details
 */
function calcMgSO4IM() {
    // Loading: 10g total = 5g per buttock using 50% MgSO4
    const loadDoseG = 10;
    const dosePerSideG = 5;
    const volPerSide = (dosePerSideG * 1000) / MGSO4_CONC_50PCT; // 10 mL

    // Maintenance: 5g IM q4h
    const maintDoseG = 5;
    const maintVol = (maintDoseG * 1000) / MGSO4_CONC_50PCT; // 10 mL

    return {
        loadDoseG,
        dosePerSideG,
        volPerSide,         // 10 mL per buttock
        lidocaineNote: 'ผสม Lidocaine 2% 1 mL ต่อ injection ลดปวดจากการฉีด',
        injectionSite: 'Upper outer quadrant of buttock, deep IM',
        maintDoseG,
        maintVol,           // 10 mL q4h
        maintInterval: 'q4h'
    };
}

/**
 * Calculates MgSO4 recurrent seizure bolus dose (2g IV).
 *
 * @returns {Object} Recurrent bolus details
 */
function calcMgSO4RecurrentBolus() {
    const doseG = 2;
    const doseMg = doseG * 1000;
    const vol50pct = doseMg / MGSO4_CONC_50PCT;  // 4 mL
    const vol10pct = doseMg / MGSO4_CONC_10PCT;  // 20 mL
    const diluentVol = vol10pct - vol50pct;       // 16 mL

    return {
        doseG,
        doseMg,
        vol50pct,       // 4 mL
        vol10pct,       // 20 mL
        diluentVol,     // 16 mL NSS to dilute
        rateNote: 'Slow IV push ≤1 g/min (ให้ช้าๆ อย่างน้อย 2 นาที)',
        secondLine: 'ถ้ายังชักหลัง repeat MgSO4 bolus → พิจารณา Benzodiazepine second-line (Lorazepam 4 mg IV / Diazepam 5-10 mg IV / Midazolam 10 mg IM)'
    };
}

/**
 * Evaluates MgSO4 toxicity criteria.
 * Any positive criterion → recommend HOLD maintenance + consider antidote.
 *
 * @param {Object} params
 * @param {number|null} params.rr - Respiratory rate
 * @param {boolean} params.dtrAbsent - Deep tendon reflexes absent?
 * @param {number|null} params.urineOutput - Urine output in mL/hr
 * @returns {Object} Toxicity assessment
 */
function checkMgSO4Toxicity({ rr, dtrAbsent, urineOutput }) {
    const flags = [];

    if (dtrAbsent === true) {
        flags.push({ id: 'dtr', text: 'DTR absent — หยุด maintenance ทันที', severity: 'critical' });
    }
    if (rr != null && rr < 12) {
        flags.push({ id: 'rr', text: `RR ${rr}/min (<12) — หยุด maintenance ทันที`, severity: 'critical' });
    }
    if (urineOutput != null && urineOutput < 25) {
        flags.push({ id: 'uo', text: `UO ${urineOutput} mL/hr (<25 mL/hr) — หยุด maintenance`, severity: 'warning' });
    }

    return {
        isToxic: flags.length > 0,
        flags,
        antidoteNote: 'Calcium gluconate 10% 10 mL (1 g) IV push over 3-5 min — เตรียมพร้อมเสมอ',
        serumMgNote: 'Therapeutic range: 4-7 mEq/L (4.8-8.4 mg/dL) — เจาะ serum Mg เมื่อ Cr >1.0 mg/dL'
    };
}

/**
 * Classifies blood pressure severity for obstetric emergencies.
 *
 * @param {number} sbp - Systolic blood pressure
 * @param {number} dbp - Diastolic blood pressure
 * @returns {Object} Classification result
 */
function classifyBPSeverity(sbp, dbp) {
    if (sbp == null || dbp == null) return { isSevere: false, label: '', category: '' };

    if (sbp >= 160 || dbp >= 110) {
        return {
            isSevere: true,
            label: 'Severe range',
            category: 'severe',
            target: 'เป้าหมาย: 140-150 / 90-100 mmHg',
            urgency: 'ต้องรักษาภายใน 30-60 นาที'
        };
    }
    if (sbp >= 140 || dbp >= 90) {
        return {
            isSevere: false,
            label: 'Non-severe (Mild)',
            category: 'mild',
            target: 'เป้าหมาย: <140/90 mmHg',
            urgency: ''
        };
    }
    return {
        isSevere: false,
        label: 'Normal',
        category: 'normal',
        target: '',
        urgency: ''
    };
}

/**
 * Evaluates severe features checklist and returns count + list of positive criteria.
 *
 * @param {Object} features - Map of feature ID → boolean
 * @returns {Object} Evaluation result
 */
function evalSevereFeatures(features) {
    if (!features || typeof features !== 'object') {
        return { count: 0, positive: [], hasSevereFeature: false };
    }

    const allCriteria = DIAGNOSTIC_CRITERIA.severePreeclampsia.criteria;
    const positive = allCriteria.filter(c => features[c.id] === true);

    return {
        count: positive.length,
        positive: positive.map(c => ({ id: c.id, text: c.text, category: c.category })),
        hasSevereFeature: positive.length > 0
    };
}

/**
 * Comprehensive MgSO4 safety check combining toxicity monitoring,
 * contraindications (e.g. Myasthenia Gravis), and renal adjustments.
 *
 * @param {Object} params
 * @param {boolean} [params.hasMyasthenia] - Patient has Myasthenia Gravis?
 * @param {boolean} [params.isRenalImpaired] - Severe renal impairment (Cr > 1.1 or CrCl < 30)?
 * @param {number|null} [params.rr] - Respiratory rate
 * @param {boolean} [params.dtrAbsent] - DTR absent?
 * @param {number|null} [params.urineOutput] - Urine output in mL/hr
 * @returns {Object} Comprehensive safety result
 */
function checkMgSO4Safety({ hasMyasthenia, isRenalImpaired, rr, dtrAbsent, urineOutput } = {}) {
    const tox = checkMgSO4Toxicity({ rr, dtrAbsent, urineOutput });
    const warnings = [...tox.flags];
    let isContraindicated = false;

    if (hasMyasthenia === true) {
        isContraindicated = true;
        warnings.unshift({
            id: 'myasthenia',
            text: '⛔ MYASTHENIA GRAVIS — ห้ามใช้ MgSO4 เด็ดขาด! (เสี่ยง Respiratory failure รุนแรง)',
            severity: 'critical'
        });
    }

    if (isRenalImpaired === true) {
        warnings.push({
            id: 'renal',
            text: '⚠️ Severe Renal Impairment — ปรับลด Loading dose เป็น 2 g IV, เจาะ Serum Mg, และ Hold/ลด Maintenance',
            severity: 'warning'
        });
    }

    return {
        isSafe: !isContraindicated && !tox.isToxic,
        isContraindicated,
        isToxic: tox.isToxic,
        warnings,
        antidoteNote: tox.antidoteNote,
        serumMgNote: tox.serumMgNote,
        alternatives: ALTERNATIVE_ANTICONVULSANTS
    };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

// Export for Node testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calcMgSO4Loading,
        calcMgSO4MaintenanceIV,
        calcMgSO4IM,
        calcMgSO4RecurrentBolus,
        checkMgSO4Toxicity,
        checkMgSO4Safety,
        classifyBPSeverity,
        evalSevereFeatures,
        MAINTENANCE_FORMULAS,
        BP_PROTOCOLS,
        DIAGNOSTIC_CRITERIA,
        MGSO4_CONTRAINDICATIONS,
        ALTERNATIVE_ANTICONVULSANTS,
        CALCIUM_ANTIDOTES,
        TEXTBOOK_VARIATIONS,
        MGSO4_CONC_50PCT,
        MGSO4_CONC_10PCT
    };
}

