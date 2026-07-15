const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { STEMI_ENGINE } = require('../shared/stemi-engine.js');

describe('STEMI TNK Dosing Engine', () => {
    test('invalid inputs return null', () => {
        assert.equal(STEMI_ENGINE.calcTNK(-10, 50), null);
        assert.equal(STEMI_ENGINE.calcTNK(70, -5), null);
        assert.equal(STEMI_ENGINE.calcTNK(0, 50), null);
        assert.equal(STEMI_ENGINE.calcTNK(70, 0), null);
    });

    test('TNK weight brackets mapping for non-elderly (age < 75)', () => {
        // <60 kg -> 30 mg
        const t1 = STEMI_ENGINE.calcTNK(59.9, 50);
        assert.ok(t1);
        assert.equal(t1.mg, 30);
        assert.equal(t1.ml, 6);
        assert.equal(t1.bracketIdx, 0);
        assert.equal(t1.elderly, false);

        // 60-69 kg -> 35 mg
        const t2 = STEMI_ENGINE.calcTNK(60, 50);
        assert.ok(t2);
        assert.equal(t2.mg, 35);
        assert.equal(t2.ml, 7);
        assert.equal(t2.bracketIdx, 1);

        // 70-79 kg -> 40 mg
        const t3 = STEMI_ENGINE.calcTNK(70, 50);
        assert.ok(t3);
        assert.equal(t3.mg, 40);
        assert.equal(t3.ml, 8);
        assert.equal(t3.bracketIdx, 2);

        // 80-89 kg -> 45 mg
        const t4 = STEMI_ENGINE.calcTNK(80, 50);
        assert.ok(t4);
        assert.equal(t4.mg, 45);
        assert.equal(t4.ml, 9);
        assert.equal(t4.bracketIdx, 3);

        // >=90 kg -> 50 mg
        const t5 = STEMI_ENGINE.calcTNK(90, 50);
        assert.ok(t5);
        assert.equal(t5.mg, 50);
        assert.equal(t5.ml, 10);
        assert.equal(t5.bracketIdx, 4);
    });

    test('TNK elderly halving boundary (age >= 75)', () => {
        // age 74 (non-elderly) -> full dose
        const t74 = STEMI_ENGINE.calcTNK(75, 74);
        assert.ok(t74);
        assert.equal(t74.mg, 40);
        assert.equal(t74.ml, 8);
        assert.equal(t74.elderly, false);

        // age 75 (elderly) -> half dose
        const t75 = STEMI_ENGINE.calcTNK(75, 75);
        assert.ok(t75);
        assert.equal(t75.mg, 20);
        assert.equal(t75.ml, 4);
        assert.equal(t75.elderly, true);

        // age 76 (elderly) -> half dose
        const t76 = STEMI_ENGINE.calcTNK(75, 76);
        assert.ok(t76);
        assert.equal(t76.mg, 20);
        assert.equal(t76.ml, 4);
        assert.equal(t76.elderly, true);
    });
});
