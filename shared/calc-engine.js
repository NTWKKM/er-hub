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

// Export for Node testing environment if applicable
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calcDripRate
    };
}
