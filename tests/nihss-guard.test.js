const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const nihssPath = path.join(__dirname, '..', 'tools', 'nihss.html');
const html = fs.readFileSync(nihssPath, 'utf8');

describe('NIHSS — input validation guards', () => {
  test('itemMax lookup table is defined', () => {
    assert.match(html, /const\s+itemMax\s*=/);
  });

  test('all 15 row keys have max values defined', () => {
    const keys = ['1a','1b','1c','2','3','4','5a','5b','6a','6b','7','8','9','10','11'];
    keys.forEach(k => {
      assert.match(html, new RegExp(`"${k}"\\s*:\\s*\\d+`), `itemMax missing key ${k}`);
    });
  });

  test('blur validation clamps out-of-range values', () => {
    assert.match(html, /addEventListener\(\s*['"]blur['"]/);
    assert.match(html, /n\s*>\s*max/);
  });

  test('inputmode numeric is set on cells', () => {
    assert.match(html, /setAttribute\(\s*['"]inputmode['"]\s*,\s*['"]numeric['"]/);
  });

  test('X is allowed for untestable items', () => {
    assert.match(html, /\/\^x\$\/i/);
  });

  test('total row shows max 42 label', () => {
    assert.match(html, /max\s*42/i);
  });
});

describe('NIHSS — auto-sum structure', () => {
  test('rowKeys array has all 15 items', () => {
    assert.match(html, /const\s+rowKeys\s*=\s*\[["']1a["']/);
    keys = ['1a','1b','1c','2','3','4','5a','5b','6a','6b','7','8','9','10','11'];
    keys.forEach(k => {
      assert.ok(html.includes(`"${k}"`), `rowKeys missing ${k}`);
    });
  });

  test('recalc function sums 3 columns', () => {
    assert.match(html, /function\s+recalc/);
    assert.match(html, /col\s*<=\s*3/);
    assert.match(html, /total-\$\{col\}/);
  });

  test('printBlank snapshots and restores values', () => {
    assert.match(html, /function\s+printBlank/);
    assert.match(html, /saved\[inp\.dataset\.key\]/);
  });

  test('clearAll confirms before clearing', () => {
    assert.match(html, /function\s+clearAll/);
    assert.match(html, /confirm\(/);
  });

  test('print-blank-direct URL param triggers printBlank', () => {
    assert.match(html, /print-blank-direct/);
    assert.match(html, /printBlank\(\)/);
  });
});

describe('NIHSS — print @media', () => {
  test('toolbar is hidden in print', () => {
    assert.match(html, /@media\s+print/);
    assert.match(html, /\.no-print/);
  });

  test('A4 portrait page size is set', () => {
    assert.match(html, /size:\s*A4\s+portrait/);
  });
});