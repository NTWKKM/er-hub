/**
 * shared/stemi-engine.js
 * Core clinical calculation engine for STEMI thrombolytic (Tenecteplase / TNK) dosing.
 */

const STEMI_ENGINE = {
    TNK_TABLE: [
        { label: '<60',   min: -Infinity, max: 60,        mg: 30 },
        { label: '60-69', min: 60,        max: 70,        mg: 35 },
        { label: '70-79', min: 70,        max: 80,        mg: 40 },
        { label: '80-89', min: 80,        max: 90,        mg: 45 },
        { label: '≥90',   min: 90,        max: Infinity,  mg: 50 },
    ],

    /**
     * Calculates TNK dose based on weight and age.
     * 
     * @param {number} weight - Patient weight in kg
     * @param {number} age - Patient age in years
     * @returns {Object|null} Dosing parameters or null if invalid inputs
     */
    calcTNK(weight, age) {
        if (!weight || weight <= 0 || isNaN(weight)) return null;
        if (!age || age <= 0 || isNaN(age)) return null;

        const idx = this.TNK_TABLE.findIndex(b => weight >= b.min && weight < b.max);
        if (idx === -1) return null;
        const bracket = this.TNK_TABLE[idx];
        const elderly = age >= 75;
        const mg = elderly ? bracket.mg / 2 : bracket.mg;
        return {
            mg,
            ml: mg / 5,
            bracketIdx: idx,
            elderly
        };
    }
};

// Export for Node testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STEMI_ENGINE };
}
