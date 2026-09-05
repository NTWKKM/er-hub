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
        if (!weight || weight <= 0 || !Number.isFinite(weight)) return null;
        if (regimen !== 0.9 && regimen !== 0.6) return null;

        const isStandard = regimen === 0.9;
        const maxDose = isStandard ? 90 : 60;
        const pushPercent = isStandard ? 10 : 15;
        const dripPercent = isStandard ? 90 : 85;

        const rawTotal = Math.min(weight * regimen, maxDose);
        const totalDose = Math.round(rawTotal * 100) / 100;
        const idealPush = totalDose * (pushPercent / 100);
        const pushDose = Math.floor((idealPush + 1e-9) * 10) / 10;
        const dripDose = Math.round((totalDose - pushDose) * 100) / 100;

        return { totalDose, pushPercent, dripPercent, pushDose, dripDose };
    },

    /**
     * Calculates Tenecteplase (TNK) dosing for Acute Ischemic Stroke per AHA/ASA 2026 Guidelines.
     * 
     * @param {number} weight - Patient weight in kg
     * @returns {Object|null} TNK dosing parameters or null if invalid inputs
     */
    calcTnkStrokeDose(weight) {
        if (!weight || weight <= 0 || !Number.isFinite(weight)) return null;
        const totalDose = Math.min(Math.round(weight * 0.25 * 10) / 10, 25); // 0.25 mg/kg, max 25 mg
        const volumeMl = Math.round((totalDose / 5) * 10) / 10; // 5 mg/mL concentration
        return { totalDose, volumeMl, maxCap: 25, concentration: 5 };
    }
};

// Export for Node testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STROKE_ENGINE };
}
