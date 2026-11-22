/**
 * Guard against V1/V2 drift: every value-bearing form control on an order page
 * must have its value read by the page script. A control that is rendered but
 * never read silently drops clinician input from the printed order
 * (regression: antivenom-v2 horse-allergy-detail).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const PAGES = [
    ...fs.readdirSync(path.join(ROOT, 'orders')).filter(f => f.endsWith('.html')).map(f => 'orders/' + f),
    'tools/nihss.html',
    'tools/nihss-v2.html'
];

// Controls read through a dynamically built id; reviewed manually.
const ALLOWLIST = {
    'orders/antivenom.html': ['hemato-snake-select', 'neuro-snake-select'], // $(selectId)?.value
    'orders/antivenom-v2.html': ['hemato-snake-select', 'neuro-snake-select']
};

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LOOKUP = id => `(?:\\$|(?:[\\w$]+\\.)?getElementById)\\(\\s*['"\`]${esc(id)}['"\`]\\s*\\)`;
const READ = '\\??\\.(?:value|valueAsNumber|selectedIndex|options)\\b';

function isValueRead(js, id) {
    if (new RegExp(LOOKUP(id) + READ).test(js)) return true;
    // Aliased: const x = $('id'); ... x.value
    const alias = new RegExp(`(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${LOOKUP(id)}`, 'g');
    for (const m of js.matchAll(alias)) {
        if (new RegExp(`\\b${esc(m[1])}${READ}`).test(js)) return true;
    }
    return false;
}

describe('Order pages: every form control value is consumed by script', () => {
    for (const rel of PAGES) {
        test(rel, () => {
            const doc = new JSDOM(fs.readFileSync(path.join(ROOT, rel), 'utf8')).window.document;
            const js = [...doc.querySelectorAll('script:not([src])')].map(s => s.textContent).join('\n');
            const allowed = new Set(ALLOWLIST[rel] || []);
            const controls = doc.querySelectorAll(
                'input[id]:not([type=radio]):not([type=checkbox]):not([type=hidden]):not([type=button]):not([type=submit]),select[id],textarea[id]'
            );
            const unread = [...controls].map(el => el.id).filter(id => !allowed.has(id) && !isValueRead(js, id));
            assert.deepEqual(unread, [], `${rel}: controls rendered but never read → ${unread.join(', ')}`);
        });
    }
});
