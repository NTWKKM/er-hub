/** Every visible form control must have an accessible name (WCAG 1.3.1 / 4.1.2). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const pages = execSync('git ls-files "*.html"', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);

for (const rel of pages) {
    test(`${rel}: all form controls are labelled`, () => {
        const doc = new JSDOM(fs.readFileSync(path.join(ROOT, rel), 'utf8')).window.document;
        const unlabelled = [...doc.querySelectorAll(
            'input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=button]):not([type=submit]),select,textarea'
        )].filter(el =>
            !el.closest('label') &&
            !(el.getAttribute('aria-label') || '').trim() &&
            !el.getAttribute('aria-labelledby') &&
            !(el.id && doc.querySelector(`label[for="${el.id}"]`))
        ).map(el => el.id || el.getAttribute('data-key') || el.outerHTML.slice(0, 60));
        assert.deepEqual(unlabelled, []);
    });
}
