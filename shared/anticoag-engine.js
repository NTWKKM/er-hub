/**
 * shared/anticoag-engine.js
 * Dosing and titration logic for anticoagulants (Heparin standalone protocols).
 * Note: eGFR calculation (CKD-EPI 2021) is now solely in shared/clinical-engine.js
 * (CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021) — the parallel calcEGFR_CKDEPI2021 copy
 * was removed to eliminate the two-implementation drift risk (ADR-46 parity class).
 * calcAnticoag() was also removed: nstemi.html has its own inline anticoag UI logic
 * and no order page calls it.
 */

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
        calcHeparinInitialDose,
        getHeparinTitration,
        HEPARIN_STANDALONE_PROTOCOLS
    };
}
