/**
 * shared/anticoag-engine.js
 * Dosing and titration logic for anticoagulants (Heparin, Enoxaparin, Fondaparinux).
 */

/**
 * Estimates GFR using the 2021 CKD-EPI Creatinine equation (race-free).
 * Reference: Inker LA et al. NEJM 2021; https://www.mdcalc.com/calc/3939
 *
 *   eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^(-1.200)
 *              × 0.9938^Age × (1.012 if female)
 *   κ = 0.7 (female) / 0.9 (male);  α = -0.241 (female) / -0.302 (male)
 *
 * @param {number} scr - Serum creatinine in mg/dL
 * @param {number} age - Age in years
 * @param {string} sex - 'male' | 'female'
 * @returns {number|null} eGFR in mL/min/1.73m² (rounded), or null if inputs invalid
 */
function calcEGFR_CKDEPI2021(scr, age, sex) {
    if (!(scr > 0) || !(age > 0) || (sex !== 'male' && sex !== 'female')) return null;
    const female = sex === 'female';
    const kappa = female ? 0.7 : 0.9;
    const alpha = female ? -0.241 : -0.302;
    const ratio = scr / kappa;
    const egfr = 142
        * Math.pow(Math.min(ratio, 1), alpha)
        * Math.pow(Math.max(ratio, 1), -1.200)
        * Math.pow(0.9938, age)
        * (female ? 1.012 : 1);
    return Math.round(egfr);
}

/**
 * Calculates NSTEMI anticoagulant recommendation based on weight, age, and eGFR.
 * Enoxaparin dosing per 2025 ACC/AHA/ACEP/NAEMSP/SCAI ACS Guideline (NSTEMI, non-fibrinolytic):
 *   1 mg/kg SC q12h; reduce to 1 mg/kg SC q24h if eGFR/CrCl < 30. Age-based 0.75 mg/kg
 *   cut applies only to STEMI + fibrinolytic, so it is intentionally NOT used here.
 *
 * @param {number} weight - Patient's weight in kg
 * @param {number} age - Patient's age in years (retained for signature/compat)
 * @param {number} egfr - Patient's eGFR in mL/min
 * @returns {Object} Recommendation details
 */
function calcAnticoag(weight, age, egfr) {
    const r = { egfr };

    if (egfr < 15) {
        r.rec = 'heparin';
        r.hepBolus = Math.min(Math.round(weight * 60), 4000);
        r.hepInf = Math.min(Math.round(weight * 12), 1000);
        r.hepRate = (r.hepInf / 100).toFixed(1); // Default standard conc: 100 u/mL
    } else if (egfr >= 20) {
        r.rec = 'fondaparinux';
    } else {
        r.rec = 'enoxaparin'; // GFR 15-19: fondaparinux CI
    }

    // Enoxaparin dose (computed regardless, for display) — 2025 ACC/AHA NSTEMI
    if (egfr >= 15) {
        r.enoxDose = Math.round(weight * 1.0); // 1 mg/kg regardless of age
        if (egfr < 30) {
            r.enoxRoute = 'SC q24h';
            r.enoxNote = '1 mg/kg — GFR < 30 → once daily';
        } else {
            r.enoxRoute = 'SC q12h';
            r.enoxNote = '1 mg/kg — GFR ≥ 30';
        }
    }

    return r;
}

/**
 * Heparin Standalone Protocol initial dosing definitions.
 */
const HEPARIN_STANDALONE_PROTOCOLS = {
    'ami_fibrinolytic': {
        name: 'Acute MI treated with fibrinolytic',
        bolusPerKg: 60,
        maxBolus: 4000,
        infPerKg: 12,
        maxInf: 1000
    },
    'acs_valve': {
        name: 'ACS / Unstable Angina / Mechanical Heart Valve',
        bolusPerKg: 70,
        maxBolus: 5000,
        infPerKg: 15,
        maxInf: 1200
    },
    'pe_thrombus': {
        name: 'Pulmonary Embolism (PE) / Intracardiac Thrombus / AF / Bridging',
        bolusPerKg: 80,
        maxBolus: 10000,
        infPerKg: 18,
        maxInf: 1800
    },
    'dvt_arterial': {
        name: 'Peripheral Arterial Occlusion / Deep Vein Thrombosis (DVT)',
        bolusPerKg: 80,
        maxBolus: 5000,
        infPerKg: 18,
        maxInf: 1000
    }
};

/**
 * Calculates initial Heparin bolus and infusion rates for the standalone protocol.
 * 
 * @param {string} protocolKey - Key matching HEPARIN_STANDALONE_PROTOCOLS
 * @param {number} weight - Patient's weight in kg
 * @param {number} concentration - Mixed concentration (units/mL, e.g., 50 or 100)
 * @returns {Object} Dosing output
 */
function calcHeparinInitialDose(protocolKey, weight, concentration) {
    const proto = HEPARIN_STANDALONE_PROTOCOLS[protocolKey];
    if (!proto || !weight || weight <= 0 || !concentration || concentration <= 0) return null;

    const bolus = Math.min(Math.round(weight * proto.bolusPerKg), proto.maxBolus);
    const infusion = Math.min(Math.round(weight * proto.infPerKg), proto.maxInf);
    
    // drip rate (mL/hr) = infusion (units/hr) / concentration (units/mL)
    const dripRate = parseFloat((infusion / concentration).toFixed(1));

    return {
        protocolName: proto.name,
        bolus,
        infusion,
        dripRate,
        maxDoseLimit: 48000 // units/day ceiling
    };
}

/**
 * Evaluates the next titration step based on aPTT Ratio for Heparin standalone.
 * 
 * @param {number} apttRatio - Current measured aPTT Ratio
 * @param {number} currentRateUnitsHr - Current infusion rate in units/hr
 * @param {number} concentration - Mixed concentration (units/mL, e.g. 50 or 100)
 * @returns {Object} Titration instructions
 */
function getHeparinTitration(apttRatio, currentRateUnitsHr, concentration) {
    let action = '';
    let rateChangeUnits = 0;
    let recheckText = '';
    let stopTimeMin = 0;
    let bolusUnits = 0;

    if (apttRatio > 7.0) {
        stopTimeMin = 180;
        rateChangeUnits = -500;
        action = 'หยุดให้ยา 180 นาที';
        recheckText = 'เจาะซ้ำใน 3 ชม.';
    } else if (apttRatio >= 5.1) {
        stopTimeMin = 60;
        rateChangeUnits = -500;
        action = 'หยุดให้ยา 60 นาที';
        recheckText = 'เจาะซ้ำใน 6 ชม.';
    } else if (apttRatio >= 4.1) {
        stopTimeMin = 60;
        rateChangeUnits = -300;
        action = 'หยุดให้ยา 60 นาที';
        recheckText = 'เจาะซ้ำใน 6 ชม.';
    } else if (apttRatio >= 3.1) {
        stopTimeMin = 60;
        rateChangeUnits = -200;
        action = 'หยุดให้ยา 60 นาที';
        recheckText = 'เจาะซ้ำใน 6 ชม.';
    } else if (apttRatio >= 2.6) {
        stopTimeMin = 60;
        rateChangeUnits = -100;
        action = 'หยุดให้ยา 60 นาที';
        recheckText = 'เจาะซ้ำใน 6 ชม.';
    } else if (apttRatio >= 1.5) {
        // Therapeutic Range
        stopTimeMin = 0;
        rateChangeUnits = 0;
        action = 'ให้ยาอัตราเดิม (Therapeutic Range)';
        recheckText = 'เจาะซ้ำเช้าวันถัดไป';
    } else if (apttRatio >= 1.2) {
        stopTimeMin = 0;
        bolusUnits = 2500;
        rateChangeUnits = 150; // Plan specifies "+100 ถึง +200 units/hr", we choose +150 as default midpoint
        action = 'ฉีด Bolus ซ้ำ 2,500 units stat';
        recheckText = 'เจาะซ้ำใน 6 ชม.';
    } else {
        // < 1.2
        stopTimeMin = 0;
        bolusUnits = 5000;
        rateChangeUnits = 400;
        action = 'ฉีด Bolus ซ้ำ 5,000 units stat';
        recheckText = 'เจาะซ้ำใน 6 ชม.';
    }

    const nextRateUnitsHr = Math.max(0, currentRateUnitsHr + rateChangeUnits);
    // Cap at maximum 2,000 units/hr (48,000 units/day)
    const cappedRateUnitsHr = Math.min(2000, nextRateUnitsHr);
    const cappedText = nextRateUnitsHr > 2000 ? ' (Capped at 2,000 u/hr max limit)' : '';

    const nextRateMlHr = parseFloat((cappedRateUnitsHr / concentration).toFixed(1));
    const rateChangeMlHr = parseFloat((rateChangeUnits / concentration).toFixed(1));

    return {
        action,
        bolusUnits,
        stopTimeMin,
        rateChangeUnits,
        rateChangeMlHr,
        nextRateUnitsHr: cappedRateUnitsHr,
        nextRateMlHr,
        recheckText,
        cappedText
    };
}

// Export for Node testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calcAnticoag,
        calcEGFR_CKDEPI2021,
        calcHeparinInitialDose,
        getHeparinTitration,
        HEPARIN_STANDALONE_PROTOCOLS
    };
}
