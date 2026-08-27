/**
 * shared/calc-engine.js
 * Core mathematical engine for clinical drug dose and infusion calculations.
 * Assumes pure functional calculations for clinical safety and predictability.
 */

/**
 * Calculates IV infusion drip rate in mL/hr.
 * 
 * @param {Object} params
 * @param {number} params.doseValue - Target dose (e.g. 0.1, 5.0, 15)
 * @param {string} params.doseUnit - Unit label ('mcg/kg/min' | 'mcg/kg/hr' | 'mg/kg/min' | 'mg/kg/hr' | 'units/kg/hr' | 'mcg/min' | 'mg/hr' | 'mg/min')
 * @param {number} params.weightKg - Patient's weight in kilograms
 * @param {number} params.concentration - Mixed drug concentration (units of drug per 1 mL of solution)
 * @returns {number} - Calculated drip rate in mL/hr (rounded or exact)
 */
function calcDripRate({ doseValue, doseUnit, weightKg, concentration }) {
    if (!doseValue || doseValue <= 0 || !concentration || concentration <= 0) return 0;
    if (!doseUnit) return 0;

    const perKg = doseUnit.includes('/kg');
    const perMin = doseUnit.endsWith('/min');

    // For weight-based doses, validate weight is a positive number
    if (perKg && (!weightKg || weightKg <= 0 || isNaN(weightKg))) return 0;
    
    // 1. Calculate amount of drug required per hour
    const amountPerHour = doseValue * (perKg ? weightKg : 1) * (perMin ? 60 : 1);
    
    // 2. Convert to volume rate (mL/hr) = (drug amount per hour) / concentration
    return amountPerHour / concentration;
}

/**
 * Calculates drop rate in gtt/min given flow rate in mL/hr and drop factor (gtt/mL).
 * Formula: gtt/min = (mL/hr * dropFactor) / 60
 * 
 * @param {Object} params
 * @param {number} params.mlPerHour - Infusion pump flow rate in mL/hr
 * @param {number} [params.dropFactor=20] - IV set drop factor (e.g. 60 for microdrip, 20 for standard macrodrip, 15 for blood set)
 * @returns {number} - Calculated drop rate in gtt/min
 */
function calcDropRate({ mlPerHour, dropFactor = 20 }) {
    if (!mlPerHour || mlPerHour <= 0 || !dropFactor || dropFactor <= 0 || isNaN(mlPerHour) || isNaN(dropFactor)) return 0;
    return (mlPerHour * dropFactor) / 60;
}

/**
 * Calculates the seconds between each drop (seconds/drop).
 * Formula: interval = 60 / (gtt/min) = 3600 / (mL/hr * dropFactor)
 * 
 * @param {Object} params
 * @param {number} params.mlPerHour - Infusion pump flow rate in mL/hr
 * @param {number} [params.dropFactor=20] - IV set drop factor
 * @returns {number} - Seconds per drop, or 0 if rate is 0
 */
function calcDropIntervalSeconds({ mlPerHour, dropFactor = 20 }) {
    const gttPerMin = calcDropRate({ mlPerHour, dropFactor });
    if (gttPerMin <= 0) return 0;
    return 60 / gttPerMin;
}

// Attach to window for browser client-side usage
if (typeof window !== 'undefined') {
    window.calcDripRate = calcDripRate;
    window.calcDropRate = calcDropRate;
    window.calcDropIntervalSeconds = calcDropIntervalSeconds;
}

// Export for Node testing environment if applicable
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calcDripRate,
        calcDropRate,
        calcDropIntervalSeconds
    };
}
