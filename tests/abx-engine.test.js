const { describe, test } = require('node:test');
const assert = require('node:assert');
const ABX_ENGINE = require('../shared/abx-engine');

describe('ABX_ENGINE Anthropometrics', () => {
    test('calcIBW for Male', () => {
        let ibw = ABX_ENGINE.calcIBW(177.8, 'M');
        assert.ok(Math.abs(ibw - (50 + 2.3 * 10)) < 1);
    });

    test('calcIBW for Female', () => {
        let ibw = ABX_ENGINE.calcIBW(165.1, 'F');
        assert.ok(Math.abs(ibw - (45.5 + 2.3 * 5)) < 1);
    });

    test('calcABW', () => {
        let abw = ABX_ENGINE.calcABW(100, 50);
        assert.strictEqual(abw, 50 + 0.4 * 50);
    });

    test('calcBSA Mosteller', () => {
        let bsa = ABX_ENGINE.calcBSA(70, 170);
        assert.ok(Math.abs(bsa - Math.sqrt((170 * 70) / 3600)) < 0.1);
    });
});

describe('ABX_ENGINE Renal Evaluator', () => {
    test('calcCrCl Cockcroft-Gault normal weight', () => {
        let res = ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 70, heightCm: 177.8, scr: 1.0 });
        assert.strictEqual(res.weightType, 'TBW');
        assert.ok(Math.abs(res.crcl - (((140 - 60) * 70) / 72)) < 1);
    });

    test('calcCrCl Cockcroft-Gault obese', () => {
        let res = ABX_ENGINE.calcCrCl({ age: 60, sex: 'M', weightKg: 100, heightCm: 170, scr: 1.0 });
        assert.strictEqual(res.weightType, 'ABW');
        assert.ok(Math.abs(res.crcl - (((140 - 60) * res.abw) / 72)) < 1);
    });

    test('calcEGFR_CKD_EPI_2021', () => {
        let egfr = ABX_ENGINE.calcEGFR_CKD_EPI_2021(1.0, 60, 'M');
        assert.ok(egfr > 60 && egfr < 100);
    });
});

describe('ABX_ENGINE Indications', () => {
    test('getDrugsForIndication CAP', () => {
        let drugs = ABX_ENGINE.getDrugsForIndication('cap');
        assert.ok(drugs.length > 0);
        let ceftriaxone = drugs.find(d => d.drugId === 'ceftriaxone');
        assert.ok(ceftriaxone !== undefined);
        assert.strictEqual(ceftriaxone.indicationInfo.defaultDose, '1-2g');
    });
});
