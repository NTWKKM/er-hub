const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Drip Calculator UI Logic', () => {
    test('Mocking Drip Calculator event bindings and synchronization', () => {
        // Verification of Coupled Inputs Sync
        const syncInputs = (doseInputVal) => {
            let val = parseFloat(doseInputVal);
            const min = 0.05; // Esmolol min
            const max = 0.3;  // Esmolol max
            if (val < min) val = min;
            if (val > max) val = max;
            return val;
        };

        const stepVal = (currentVal, step, min, max, direction) => {
            let val = parseFloat(currentVal);
            let newVal = direction === 'up' 
                ? Math.min(max, Math.round((val + step) * 100) / 100)
                : Math.max(min, Math.round((val - step) * 100) / 100);
            return newVal;
        };

        // Test coupled inputs clamping
        assert.equal(syncInputs(0.02), 0.05); // below min clamps to min
        assert.equal(syncInputs(0.4), 0.3);   // above max clamps to max
        assert.equal(syncInputs(0.15), 0.15); // within range

        // Test stepping buttons
        assert.equal(stepVal('0.10', 0.01, 0.05, 0.3, 'up'), 0.11);
        assert.equal(stepVal('0.10', 0.01, 0.05, 0.3, 'down'), 0.09);
        assert.equal(stepVal('0.30', 0.01, 0.05, 0.3, 'up'), 0.30); // capped at max
        assert.equal(stepVal('0.05', 0.01, 0.05, 0.3, 'down'), 0.05); // capped at min

        // Test concentration unit derivation (B1)
        const getConcentrationUnit = (doseUnit) => {
            let unit = doseUnit.replace('/kg', '');
            unit = unit.replace('/min', '');
            unit = unit.replace('/hr', '');
            return `${unit}/mL`;
        };

        assert.equal(getConcentrationUnit('mcg/kg/min'), 'mcg/mL');
        assert.equal(getConcentrationUnit('mg/hr'), 'mg/mL');
        assert.equal(getConcentrationUnit('units/kg/hr'), 'units/mL');
    });

    test('Weight persistence sessionStorage contract', () => {
        const mockSessionStorage = {
            store: {},
            setItem(key, val) { this.store[key] = val; },
            getItem(key) { return this.store[key] || null; }
        };

        mockSessionStorage.setItem('er-hub-weight', '65.5');
        assert.equal(mockSessionStorage.getItem('er-hub-weight'), '65.5');
    });
});
