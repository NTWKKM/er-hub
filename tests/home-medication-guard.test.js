const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const medPath = path.join(__dirname, '..', 'tools', 'Urgent-Clinic-Home-Medication.html');
const html = fs.readFileSync(medPath, 'utf8');

describe('Home Medication — localStorage draft persistence', () => {
  test('uses correct storage key', () => {
    assert.match(html, /const\s+storageKey\s*=\s*['"]er-hub-home-med-draft['"]/);
  });

  test('saveDraft captures text and checkbox inputs', () => {
    assert.match(html, /function\s+saveDraft/);
    assert.match(html, /input\[type="text"\],\s*input\[type="number"\]/);
    assert.match(html, /input\[type="checkbox"\]/);
    assert.match(html, /localStorage\.setItem\(storageKey/);
  });

  test('loadDraft restores saved values', () => {
    assert.match(html, /function\s+loadDraft/);
    assert.match(html, /localStorage\.getItem\(storageKey\)/);
    assert.match(html, /JSON\.parse\(saved\)/);
  });

  test('clearNote removes draft and resets form', () => {
    assert.match(html, /window\.clearNote\s*=/);
    assert.match(html, /localStorage\.removeItem\(storageKey\)/);
    assert.match(html, /confirm\(/);
  });

  test('loadDraft is called on page load', () => {
    assert.match(html, /loadDraft\(\)/);
  });
});

describe('Home Medication — ERIG/HRIG auto-calculation', () => {
  test('weight input listener computes ERIG dose', () => {
    assert.match(html, /home-med-weight.*addEventListener.*input/);
    assert.match(html, /bw\s*\*\s*40/);
  });

  test('weight input listener computes HRIG dose', () => {
    assert.match(html, /bw\s*\*\s*20/);
  });

  test('ERIG max cap is 3000 IU', () => {
    assert.match(html, /Math\.min\(\s*Math\.round\(bw\s*\*\s*40\)\s*,\s*3000\s*\)/);
  });

  test('HRIG max cap is 1500 IU', () => {
    assert.match(html, /Math\.min\(\s*Math\.round\(bw\s*\*\s*20\)\s*,\s*1500\s*\)/);
  });

  test('weight syncs to ERIG weight field', () => {
    assert.match(html, /home-med-erig-weight/);
    assert.match(html, /erigWeight\.value\s*=\s*val/);
  });
});

describe('Home Medication — print blank', () => {
  test('printBlank snapshots, clears, prints, restores', () => {
    assert.match(html, /window\.printBlank\s*=/);
    assert.match(html, /window\.print\(\)/);
    assert.match(html, /saved\[el\.id\]/);
  });
});