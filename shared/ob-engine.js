/**
 * shared/ob-engine.js
 * MgSO4 dosing and obstetric emergency calculation engine.
 * Pure functional — no DOM dependency. Follows anticoag-engine.js pattern.
 *
 * References:
 *   - MNRH Standing Order: Severe Preeclampsia (2569) — primary order set
 *   - RTCOG Clinical Practice Guideline OB 69-046: Preeclampsia (Update 2569)
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
 * MNRH Standing Order — Severe Preeclampsia (2569), aligned with RTCOG OB 69-046.
 * This is the primary order set shown on the MgSO4 screen; the legacy formulas
 * below are kept as reference only.
 */
const MNRH_SEVERE_PE_SO = {
    title: 'Standing Order: Severe Preeclampsia',
    source: 'MNRH Standing Order 2569 · RTCOG CPG OB 69-046 (Update 2569)',
    admission: ['Admit LR', 'NPO', 'Retained Foley catheter', 'RLS 1000 mL IV drip (rate ตามแพทย์สั่ง)'],
    labs: ['CBC', 'BUN, Cr', 'AST, ALT', 'LDH', 'UA หรือ UPCR หรือ 24 h urine protein (เลือกข้อใดข้อหนึ่ง)'],
    bedside: ['10% Calcium gluconate 1 g', 'MgSO4 2 g'],
    loading: {
        doseG: 4,
        drug: '10% MgSO4 4 g (40 mL)',
        diluent: '5% D/W 100 mL',
        totalVol_mL: 140,
        durationMin: 20,
        pumpRate_mL_hr: 420
    },
    maintenance: {
        mgso4_g: 40,
        mgso4_50pct_mL: 80,
        diluent: '5% D/N/2 1000 mL',
        totalVol_mL: 1080,
        // Labelled rates per the standing order; actual delivery uses the true 1,080 mL volume.
        rate2g_mL_hr: 50,
        rate1g_mL_hr: 25,
        actual2g_g_hr: 1.85,
        actual1g_g_hr: 0.93,
        reduceTo1gIf: ['BMI < 25 kg/m²', 'Cr > 1.1 mg/dL', 'Urine output < 0.5 mL/kg/h'],
        duration: 'ต่อเนื่อง 24 ชม. หลังคลอด หรือหลังชักครั้งสุดท้าย (expectant < 34 wk: หยุดเมื่อครบ 48 ชม.)'
    },
    monitoring: [
        { what: 'Urine output', every: 'q 4 h', notify: '< 0.5 mL/kg/h' },
        { what: 'Serum Mg', every: 'q 4 h', notify: '< 4.8 หรือ > 8.4 mg/dL' },
        { what: 'DTR', every: 'ต่อเนื่อง', notify: '< 2+' },
        { what: 'Vital signs', every: 'q 4 h', notify: 'BP ≥ 160/110 mmHg, PR < 60/min, RR < 14/min' },
        { what: 'อาการ', every: 'ต่อเนื่อง', notify: 'Severe headache, epigastric pain, blurred vision' }
    ],
    bpLadder: [
        { step: 1, drug: 'Labetalol 20 mg IV', how: 'slow push 2 min', recheck: 'วัด BP ซ้ำใน 10 min' },
        { step: 2, drug: 'Labetalol 40 mg IV', how: 'slow push 2 min', recheck: 'วัด BP ซ้ำใน 10 min' },
        { step: 3, drug: 'Labetalol 80 mg IV', how: 'slow push 2 min', recheck: 'วัด BP ซ้ำใน 10 min' },
        { step: 4, drug: 'Hydralazine 10 mg IV', how: 'slow push 2 min', recheck: 'วัด BP ซ้ำใน 20 min, ถ้ายังสูง consult Med' }
    ],
    labetalolContraindications: 'Asthma, heart failure, severe bradycardia, heart block > first degree, sick sinus syndrome, Prinzmetal’s angina, severe peripheral arterial disease, cardiogenic shock, severe prolonged hypotension',
    bpControlledSchedule: [
        { every: 'q 10 min', times: 6 },
        { every: 'q 15 min', times: 4 },
        { every: 'q 30 min', times: 2 },
        { every: 'q 1 h', times: 4 }
    ]
};

/**
 * Serum magnesium reference levels (RTCOG OB 69-046).
 */
const SERUM_MG_LEVELS = [
    { effect: 'Therapeutic level', mgdl: '5–9', meql: '4–7', mmoll: '2–3.5' },
    { effect: 'Loss of patellar reflex', mgdl: '> 9', meql: '> 7', mmoll: '> 3.5' },
    { effect: 'Respiratory paralysis', mgdl: '> 12', meql: '> 10', mmoll: '> 5' },
    { effect: 'Cardiac arrest', mgdl: '> 30', meql: '> 25', mmoll: '> 12.5' }
];

/**
 * Second-line antihypertensive infusions (RTCOG OB 69-046).
 */
const BP_SECOND_LINE = [
    { name: 'Nicardipine infusion', mix: '10 mg/10 mL + NSS 90 mL = 100 mL (0.1 mg/mL)', rate: 'เริ่ม 25–50 mL/h (2.5–5 mg/h), เพิ่ม 2.5 mg/h q 15 min', max: '15 mg/h' },
    { name: 'Labetalol infusion', mix: '500 mg/100 mL + 400 mL = 500 mL (1 mg/mL)', rate: 'เริ่ม 20 mg/h, เพิ่ม 20 mg/h q 30 min', max: '160 mg/h' },
    { name: 'Hydralazine infusion', mix: '20 mg in NSS 100 mL (0.2 mg/mL), ห้ามใช้สารละลายที่มี glucose', rate: '0.5–10 mg/h', max: '10 mg/h' }
];

/**
 * Maintenance IV drip mixing formulas.
 * Each describes how to mix 50% MgSO4 into an IV bag for continuous infusion.
 */
const MAINTENANCE_FORMULAS = {
    formulaA: {
        label: 'สูตร A (Thai-CMU / 10g in 1000 mL)',
        mgso4_50pct_mL: 20,
        mgso4_g: 10,
        diluent: 'D5W 1000 mL',
        totalVolume_mL: 1020,
        // final concentration: ~10 mg/mL (1%)
        finalConc_mg_per_mL: 10,
        rate1g: 100,  // mL/hr for 1 g/hr
        rate2g: 200   // mL/hr for 2 g/hr
    },
    formulaB: {
        label: 'สูตร B (Concentrated 20g in 500 mL)',
        mgso4_50pct_mL: 40,
        mgso4_g: 20,
        diluent: 'D5W/NSS 460 mL',
        totalVolume_mL: 500,
        // final concentration: 20g / 500 mL = 40 mg/mL (4%)
        finalConc_mg_per_mL: 40,
        rate1g: 25,   // mL/hr for 1 g/hr
        rate2g: 50    // mL/hr for 2 g/hr
    },
    formulaC: {
        label: 'สูตร C (CPG 20g in 1000 mL)',
        mgso4_50pct_mL: 40,
        mgso4_g: 20,
        diluent: 'D5W 1000 mL',
        totalVolume_mL: 1040,
        // final concentration: 20g / 1040 mL ≈ 19.2 mg/mL (2%)
        finalConc_mg_per_mL: 20,
        rate1g: 50,   // mL/hr for 1 g/hr
        rate2g: 100   // mL/hr for 2 g/hr
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
            'Test dose 1 mg IV นาน > 1 min',
            '5–10 mg IV นาน 2 min, วัด BP ใน 20 min',
            'ถ้ายังสูง → 5–10 mg IV ซ้ำ โดยยอดรวมทั้งหมด (รวม test dose) ไม่เกิน 20 mg (เช่น 1 + 5 + 10 mg) แล้วเปลี่ยนเป็น Labetalol'
        ],
        maxTotal: '20 mg (รวม test dose)',
        note: 'ถ้าครบ max → เปลี่ยนเป็น Labetalol หรือ consult specialist',
        contraindications: 'หลีกเลี่ยงในผู้ป่วยโรคหลอดเลือดหัวใจตีบเฉียบพลัน (ACS) เนื่องจากเกิด reflex tachycardia'
    },
    labetalol: {
        name: 'Labetalol IV',
        steps: [
            '20 mg IV (ให้ช้า ≥2 min)',
            'ถ้าไม่ตอบสนองใน 10 min → 40 mg IV',
            'ถ้ายังไม่ตอบสนอง → 80 mg IV, วัด BP ซ้ำใน 10 min; ให้ Hydralazine 10 mg IV เฉพาะเมื่อ SBP ยัง ≥ 160 หรือ DBP ≥ 110 mmHg'
        ],
        maxTotal: '300 mg',
        note: 'ถ้าครบ max → เปลี่ยนเป็น Hydralazine หรือ consult specialist',
        contraindications: 'ห้ามใช้ใน Active asthma/Severe bronchospasm, Sinus bradycardia, Heart block > 1st degree'
    },
    nifedipine: {
        name: 'Nifedipine Oral',
        steps: [
            '10 mg oral (Immediate-release), วัด BP ใน 20 min',
            'ถ้ายังสูง → 20 mg oral, วัด BP ใน 20 min',
            'ถ้ายังสูง → 20 mg oral, วัด BP ใน 20 min; ให้ Labetalol 20 mg IV เฉพาะเมื่อ BP ยัง ≥ 160/110 mmHg'
        ],
        maxTotal: '180 mg/day',
        note: 'ห้ามเจาะแคปซูลหรืออมใต้ลิ้น',
        contraindications: 'ระวัง Overshoot hypotension เมื่อใช้ร่วมกับ MgSO4 และ tachycardia'
    },
    nicardipine: {
        name: 'Nicardipine IV',
        steps: [
            'IV Push: 1 amp (2 mg/2mL) + NSS 2 mL = 4 mL (0.5 mg/mL) → ให้ 1-2 mL (0.5-1 mg) IV push q15-20min (ถ้า DBP ≥ 110 mmHg)',
            'IV Drip: 5 amp (10 mg/10mL) + NSS 90 mL = 100 mL (0.1 mg/mL) → เริ่ม 25-50 mL/hr (2.5-5 mg/hr), ปรับขึ้นครั้งละ 2.5 mg/hr q15min'
        ],
        maxTotal: '≤ 15 mg/hr (150 mL/hr)',
        note: 'เป้าหมาย: Maintain Diastolic BP 90-100 mmHg',
        contraindications: 'ห้ามใช้ใน Cardiogenic shock, Recent MI / Acute unstable angina, Severe aortic stenosis, หรือแพ้ยา'
    },
    contraindicatedPregnancy: {
        title: '⛔ Absolute Contraindications in Pregnancy',
        drugs: 'ACE inhibitors, ARBs, Direct Renin Inhibitors, Sodium Nitroprusside',
        reason: 'มีพิษร้ายแรงต่อทารกในครรภ์ (Teratogenic / Fetal renal failure / Oligohydramnios)'
    }
};

/**
 * Labour Room Care & Monitoring Orders.
 */
const NURSING_CARE_ORDERS = {
    location: 'Admit ห้องคลอด (Labour Room)',
    activity: 'Absolute bed rest',
    catheter: 'Retain Foley’s catheter',
    monitoring: [
        'Record Vital signs & Urine output ทุก 1 ชม.',
        'Record Deep tendon reflexes (DTR) ทุก 2 ชม.'
    ],
    toxicityTriggers: [
        'RR < 14/min (หรือ < 12/min)',
        'DTR หายไป (Absent DTR)',
        'Urine output < 30 mL/hr (หรือ < 25 mL/hr)'
    ],
    labs: [
        'CBC & Platelet count',
        'Coagulogram (PT/INR, aPTT)',
        'LFT (AST/ALT)',
        'Uric acid & LDH',
        'Creatinine & Urine protein/albumin ratio',
        'Serum Magnesium (หาก Cr > 1.0 mg/dL หรือมีสัญญาณพิษ)'
    ]
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
        action: 'Loading 4 g ตามปกติ แล้วให้ maintenance 1 g/h และตรวจ serum Mg q 4 h (Cr > 1.1 mg/dL หรือ UO < 0.5 mL/kg/h); IM regimen ลด maintenance 50%'
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
            { id: 'bp_160_110', text: 'BP ≥160/110 mmHg วัด 2 ครั้งห่าง ≥4 ชม. (เว้นแต่เริ่มยาลดความดันแล้ว)', category: 'BP' },
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
 * Calculates MgSO4 maintenance IV drip for formulas A, B, and C,
 * showing both 1 g/hr and 2 g/hr rates.
 *
 * @returns {Object} Maintenance drip details for formulas and rates
 */
function calcMgSO4MaintenanceIV() {
    return {
        formulaA: { ...MAINTENANCE_FORMULAS.formulaA },
        formulaB: { ...MAINTENANCE_FORMULAS.formulaB },
        formulaC: { ...MAINTENANCE_FORMULAS.formulaC },
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
        rateNote: 'Slow IV push ≤1 g/min (ให้ช้าๆ อย่างน้อย 2-5 นาที)',
        cpgHalfDoseNote: '10% MgSO4 2-4 g (half dose) IV push slowly',
        // Applies only when maintenance is currently 1 g/h; never a reduction for patients at >= 1.5 g/h.
        infusionStepUp: 'เพิ่ม maintenance เป็น 1.5 g/h หลัง bolus (เฉพาะผู้ที่ได้ 1 g/h อยู่)',
        infusionStepUpFromG_hr: 1,
        secondLine: 'ถ้ายังชักหลัง bolus 2 ครั้ง → Benzodiazepine หรือ anticonvulsant อื่น: Phenytoin 125 mg IV (เพิ่มได้ถึง 250 mg, ฉีดนาน 3–5 min), Diazepam 5 mg IV, หรือ Midazolam 5–10 mg IV/IM (RTCOG 2569)'
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
    if (rr != null && rr < 14) {
        flags.push({ id: 'rr', text: `RR ${rr}/min (<14) — หยุด maintenance ทันที`, severity: 'critical' });
    }
    if (urineOutput != null && urineOutput < 25) {
        flags.push({ id: 'uo', text: `UO ${urineOutput} mL/hr (<25 mL/hr) — หยุด maintenance`, severity: 'warning' });
    }

    return {
        isToxic: flags.length > 0,
        flags,
        antidoteNote: 'Calcium gluconate 10% 10 mL (1 g) IV push over 3-5 min — เตรียมพร้อมเสมอ',
        serumMgNote: 'Notify ถ้า serum Mg < 4.8 หรือ > 8.4 mg/dL (ตรวจ q 4 h); RTCOG therapeutic 5–9 mg/dL (4–7 mEq/L)'
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
            text: 'Renal impairment — Loading 4 g ตามปกติ, maintenance 1 g/h, ตรวจ serum Mg q 4 h',
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
        MNRH_SEVERE_PE_SO,
        SERUM_MG_LEVELS,
        BP_SECOND_LINE,
        BP_PROTOCOLS,
        DIAGNOSTIC_CRITERIA,
        MGSO4_CONTRAINDICATIONS,
        ALTERNATIVE_ANTICONVULSANTS,
        CALCIUM_ANTIDOTES,
        TEXTBOOK_VARIATIONS,
        NURSING_CARE_ORDERS,
        MGSO4_CONC_50PCT,
        MGSO4_CONC_10PCT
    };
}

