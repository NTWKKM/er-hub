const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ED_BLANK_PRINT } = require('../shared/blank-print-engine.js');

describe('ED_BLANK_PRINT', () => {
  test('register stores manifest', () => {
    ED_BLANK_PRINT.register([{ id: 'test', value: 'hello' }]);
    assert.ok(ED_BLANK_PRINT._manifest.length > 0);
  });

  test('apply is a function', () => {
    assert.equal(typeof ED_BLANK_PRINT.apply, 'function');
  });

  test('register is a function', () => {
    assert.equal(typeof ED_BLANK_PRINT.register, 'function');
  });
});