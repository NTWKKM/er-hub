/** Every visible form control must have an accessible name (WCAG 1.3.1 / 4.1.2). */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const pages = execSync('git ls-files "*.html"', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);

const CONTROLS = 'input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=button]):not([type=submit]),select,textarea';

/** Visible naming text of a label-like element, ignoring the control itself. */
function nameText(node, control) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('input,select,textarea,script,style').forEach(n => n.remove());
    const own = clone.textContent.trim();
    if (own) return own;
    // A label may be named only through an image or aria-label inside it
    return [...node.querySelectorAll('[aria-label],img[alt]')]
        .filter(n => n !== control)
        .map(n => (n.getAttribute('aria-label') || n.getAttribute('alt') || '').trim())
        .join(' ').trim();
}

/** True when the control gets a non-empty name from a source that actually resolves. */
function hasAccessibleName(el, doc) {
    if ((el.getAttribute('aria-label') || '').trim()) return true;
    const labelledBy = (el.getAttribute('aria-labelledby') || '').trim();
    if (labelledBy) {
        const text = labelledBy.split(/\s+/).map(id => doc.getElementById(id)).filter(Boolean)
            .map(n => nameText(n, el)).join(' ').trim();
        if (text) return true;
    }
    const wrapping = el.closest('label');
    if (wrapping && nameText(wrapping, el)) return true;
    if (el.id) {
        for (const lbl of doc.querySelectorAll('label[for]')) {
            if (lbl.getAttribute('for') === el.id && nameText(lbl, el)) return true;
        }
    }
    return false;
}

function unlabelled(doc) {
    return [...doc.querySelectorAll(CONTROLS)]
        .filter(el => !hasAccessibleName(el, doc))
        .map(el => el.id || el.getAttribute('data-key') || el.outerHTML.slice(0, 60));
}

describe('accessible-name rule fixtures', () => {
    const check = html => unlabelled(new JSDOM(html).window.document);
    test('rejects a dangling aria-labelledby reference', () => {
        assert.deepEqual(check('<input id="a" aria-labelledby="missing">'), ['a']);
    });
    test('rejects aria-labelledby that resolves to an empty element', () => {
        assert.deepEqual(check('<span id="t"> </span><input id="a" aria-labelledby="t">'), ['a']);
    });
    test('rejects an empty label[for] and an empty wrapping label', () => {
        assert.deepEqual(check('<label for="a"></label><input id="a"><label><input id="b"></label>'), ['a', 'b']);
    });
    test('accepts valid label[for], wrapping label, aria-label, and aria-labelledby', () => {
        assert.deepEqual(check(
            '<label for="a">Weight</label><input id="a">' +
            '<label>Age <input id="b"></label>' +
            '<input id="c" aria-label="HN">' +
            '<span id="t">Creatinine</span><input id="d" aria-labelledby="t">'
        ), []);
    });
});

for (const rel of pages) {
    test(`${rel}: all form controls are labelled`, () => {
        const doc = new JSDOM(fs.readFileSync(path.join(ROOT, rel), 'utf8')).window.document;
        assert.deepEqual(unlabelled(doc), []);
    });
}
