// Structural regression guard for the BUG-02 class of bug (2026-07-02 audit):
// a "hard stop" branch that visually locks the print button but doesn't
// actually halt execution, leaving a fully-populated contraindicated order
// reachable via native browser print (Ctrl+P) regardless of button state.
//
// This project has no build step and zero npm dependencies (ADR-01), so this
// is a plain source-text guard rather than a full DOM/jsdom test: it asserts
// that every branch which hides #print-btn as a lock-out signal is followed,
// within a few lines, by a `return;` that actually halts the handler.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ORDERS_DIR = path.join(__dirname, '..', 'orders');
const orderFiles = fs.readdirSync(ORDERS_DIR).filter(f => f.endsWith('.html'));

const LOCK_PRINT_BTN_RE = /print-btn'\)\.style\.display\s*=\s*'none'/;
const LOOKAHEAD_LINES = 4; // return is expected within a few lines of the lock

describe('Hard-stop branches must halt execution, not just hide the print button', () => {
  orderFiles.forEach(file => {
    const filePath = path.join(ORDERS_DIR, file);
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');

    const lockLineIndexes = lines
      .map((line, i) => (LOCK_PRINT_BTN_RE.test(line) ? i : -1))
      .filter(i => i !== -1);

    if (lockLineIndexes.length === 0) {
      // No print-btn lock-out pattern in this page — nothing to check.
      return;
    }

    lockLineIndexes.forEach(lockIdx => {
      test(`${file}: line ${lockIdx + 1} lock-out is followed by return`, () => {
        const window = lines.slice(lockIdx, lockIdx + 1 + LOOKAHEAD_LINES).join('\n');
        assert.ok(
          /\breturn\s*;/.test(window),
          `Expected a "return;" within ${LOOKAHEAD_LINES} lines after the print-btn lock-out ` +
          `at ${file}:${lockIdx + 1}, or the "locked" order remains fully calculable/printable ` +
          `via native browser print despite the on-screen warning.`
        );
      });
    });
  });
});
