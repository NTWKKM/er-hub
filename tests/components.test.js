const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ED_COMPONENTS } = require('../shared/components.js');

describe('ED_COMPONENTS.fmtDate', () => {
  test('formats a known date correctly (Thai locale)', () => {
    const d = new Date(2026, 0, 15); // Jan 15, 2026
    const result = ED_COMPONENTS.fmtDate(d);
    assert.ok(result.includes('15'));
    assert.ok(result.includes('2569')); // Thai year 2026 + 543 = 2569
  });

  test('returns "..." for null/undefined', () => {
    assert.equal(ED_COMPONENTS.fmtDate(null), '...');
    assert.equal(ED_COMPONENTS.fmtDate(undefined), '...');
  });
});

describe('ED_COMPONENTS.fmtTime', () => {
  test('formats a known time with Thai น. suffix', () => {
    const d = new Date(2026, 0, 15, 9, 30);
    const result = ED_COMPONENTS.fmtTime(d);
    assert.ok(result.includes('09'));
    assert.ok(result.includes('30'));
    assert.ok(result.includes('น.'));
  });

  test('returns "..." for null', () => {
    assert.equal(ED_COMPONENTS.fmtTime(null), '...');
  });
});