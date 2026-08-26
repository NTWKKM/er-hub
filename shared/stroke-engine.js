/**
 * shared/stroke-engine.js
 * Core clinical calculation engine for stroke thrombolytic (rt-PA / Alteplase) dosing.
 */

const STROKE_ENGINE = {
    /**
     * Calculates rt-PA dosing parameters.
     * 
     * @param {number} weight - Patient weight in kg
     * @param {number} regimen - Dosing regimen (0.9 or 0.6)
     * @returns {Object|null} Dosing parameters or null if invalid inputs
     */
    calcRtpaDose(weight, regimen) {
        if (!weight || weight <= 0 || isNaN(weight)) return null;
        if (regimen !== 0.9 && regimen !== 0.6) return null;

        let totalDose, pushPercent, dripPercent;
        const calculatedTotal = weight * regimen;

        if (regimen === 0.9) {
            totalDose = Math.min(calculatedTotal, 90);
            pushPercent = 10;
            dripPercent = 90;
        } else { // regimen === 0.6
            totalDose = Math.min(calculatedTotal, 50); // Clinical safety ceiling capped at 50 mg
            pushPercent = 15;
            dripPercent = 85;
        }

        const idealPush = totalDose * (pushPercent / 100);
        const pushDose = Math.floor(idealPush * 10) / 10;
        const dripDose = totalDose - pushDose;

        return { totalDose, pushPercent, dripPercent, pushDose, dripDose };
    },

    /**
     * Calculates Tenecteplase (TNK) dosing for Acute Ischemic Stroke per AHA/ASA 2026 Guidelines.
     * 
     * @param {number} weight - Patient weight in kg
     * @returns {Object|null} TNK dosing parameters or null if invalid inputs
     */
    calcTnkStrokeDose(weight) {
        if (!weight || weight <= 0 || isNaN(weight)) return null;
        const totalDose = Math.min(Math.round(weight * 0.25 * 10) / 10, 25); // 0.25 mg/kg, max 25 mg
        const volumeMl = Math.round((totalDose / 5) * 10) / 10; // 5 mg/mL concentration
        return { totalDose, volumeMl, maxCap: 25, concentration: 5 };
    }
};

// Export for Node testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STROKE_ENGINE };
}
