const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const DAY = 24 * 60 * 60 * 1000;

/** Load a tools page with local scripts inlined and localStorage pre-seeded. */
function loadPage(relPath, seed) {
    const filePath = path.join(__dirname, '..', relPath);
    const dir = path.dirname(filePath);
    const html = fs.readFileSync(filePath, 'utf8').replace(
        /<script src="([^"]+)"><\/script>/g,
        (m, src) => {
            const p = path.resolve(dir, src);
            return fs.existsSync(p) ? '<script>' + fs.readFileSync(p, 'utf8') + '</script>' : m;
        }
    );
    const dom = new JSDOM(html, {
        url: 'http://localhost/' + relPath,
        runScripts: 'dangerously',
        beforeParse(win) {
            for (const [k, v] of Object.entries(seed)) win.localStorage.setItem(k, v);
        }
    });
    return dom.window;
}

describe('ER NOTE draft retention (PHI: HN must not persist > 24 h)', () => {
    const now = Date.now();
    const registry = {
        version: 2,
        drafts: [
            { id: 'd_fresh_1', template: 'sepsis', hn: '111', cc: '', updatedAt: now - 60 * 1000 },
            { id: 'd_old_1', template: 'sepsis', hn: '222', cc: '', updatedAt: now - DAY - 1000 },
            { id: 'd_future_1', template: 'trauma', hn: '333', cc: '', updatedAt: now + 10 * DAY }
        ]
    };
    const seed = {
        'ernote-registry': JSON.stringify(registry),
        'ernote-draft-sepsis-d_fresh_1': JSON.stringify({ 'ernote-hn': '111' }),
        'ernote-draft-sepsis-d_old_1': JSON.stringify({ 'ernote-hn': '222' }),
        'ernote-draft-trauma-d_future_1': JSON.stringify({ 'ernote-hn': '333' }),
        'ernote-draft-chest-pain-d_orphan_1': JSON.stringify({ 'ernote-hn': '444' }),
        'unrelated-key': 'keep'
    };

    test('Expired, future-dated, and orphaned drafts are purged on load; fresh draft survives', () => {
        const win = loadPage('tools/er-note/index.html', seed);
        const ls = win.localStorage;
        const reg = JSON.parse(ls.getItem('ernote-registry'));
        assert.deepEqual(reg.drafts.map(d => d.id), ['d_fresh_1']);
        assert.notEqual(ls.getItem('ernote-draft-sepsis-d_fresh_1'), null);
        assert.equal(ls.getItem('ernote-draft-sepsis-d_old_1'), null);
        assert.equal(ls.getItem('ernote-draft-trauma-d_future_1'), null);
        assert.equal(ls.getItem('ernote-draft-chest-pain-d_orphan_1'), null);
        assert.equal(ls.getItem('unrelated-key'), 'keep');
    });

    test('purgeExpired removes a draft once it crosses the TTL', () => {
        const win = loadPage('tools/er-note/index.html', seed);
        const api = win.ErNote.registry;
        assert.equal(api.TTL_MS, DAY);
        assert.equal(api.purgeExpired(now + DAY), 2); // registry entry + its draft key
        assert.equal(win.localStorage.getItem('ernote-draft-sepsis-d_fresh_1'), null);
    });
});

describe('ER NOTE v1 migration and concurrent purge', () => {
    test('v1 draft with no edit time is discarded, not given a fresh 24 h window', () => {
        const win = loadPage('tools/er-note/index.html', {
            'ernote-draft-sepsis': JSON.stringify({ 'ernote-hn': '888' })
        });
        const ls = win.localStorage;
        assert.equal(ls.getItem('ernote-draft-sepsis'), null);
        const reg = JSON.parse(ls.getItem('ernote-registry') || '{"drafts":[]}');
        assert.equal(reg.drafts.length, 0);
    });

    test('v1 draft keeps a stored edit time and expires on it', () => {
        const edited = Date.now() - 60 * 1000;
        const win = loadPage('tools/er-note/index.html', {
            'ernote-draft-trauma': JSON.stringify({ 'ernote-hn': '999', savedAt: edited })
        });
        const reg = JSON.parse(win.localStorage.getItem('ernote-registry'));
        assert.equal(reg.drafts.length, 1);
        assert.equal(reg.drafts[0].updatedAt, edited);
        assert.equal(win.ErNote.registry.purgeExpired(edited + DAY), 2);
    });

    test('a draft another tab adds during the purge keeps its registry entry and content', () => {
        const win = loadPage('tools/er-note/index.html', {});
        const ls = win.localStorage;
        const now = Date.now();
        const added = { id: 'd_new_1', template: 'sepsis', hn: '123', cc: '', updatedAt: now };
        ls.setItem('ernote-registry', JSON.stringify({ version: 2, drafts: [] }));
        ls.setItem('ernote-draft-sepsis-d_new_1', '{}');   // content written, registry not yet read
        // Simulate the other tab registering the draft after the purge's first registry read
        const proto = Object.getPrototypeOf(ls);
        const realGet = proto.getItem;
        let reads = 0;
        proto.getItem = function (k) {
            if (k === 'ernote-registry' && ++reads === 2) {
                realGet.call(this, k);
                ls.setItem('ernote-registry', JSON.stringify({ version: 2, drafts: [added] }));
            }
            return realGet.call(this, k);
        };
        try { win.ErNote.registry.purgeExpired(now); } finally { proto.getItem = realGet; }
        assert.notEqual(ls.getItem('ernote-draft-sepsis-d_new_1'), null);
        assert.deepEqual(JSON.parse(ls.getItem('ernote-registry')).drafts.map(d => d.id), ['d_new_1']);
    });
});

describe('ER NOTE purge keeps drafts written after its clock reading', () => {
    test('a draft another tab saved after the purge read the clock survives', () => {
        const win = loadPage('tools/er-note/index.html', {});
        const ls = win.localStorage;
        const purgeNow = Date.now();
        const later = { id: 'd_later_1', template: 'sepsis', hn: '321', cc: '', updatedAt: purgeNow + 50 };
        ls.setItem('ernote-registry', JSON.stringify({ version: 2, drafts: [later] }));
        ls.setItem('ernote-draft-sepsis-d_later_1', '{}');
        assert.equal(win.ErNote.registry.purgeExpired(purgeNow), 0);
        assert.notEqual(ls.getItem('ernote-draft-sepsis-d_later_1'), null);
        assert.deepEqual(JSON.parse(ls.getItem('ernote-registry')).drafts.map(d => d.id), ['d_later_1']);
    });
});

describe('Home Medication draft retention', () => {
    const key = 'er-hub-home-med-draft';

    test('Fresh timestamped draft is restored', () => {
        const win = loadPage('tools/Urgent-Clinic-Home-Medication.html', {
            [key]: JSON.stringify({ savedAt: Date.now() - 1000, fields: { 'ernote-hn': '555' } })
        });
        assert.equal(win.document.getElementById('ernote-hn').value, '555');
    });

    test('Draft older than 24 h is discarded and removed', () => {
        const win = loadPage('tools/Urgent-Clinic-Home-Medication.html', {
            [key]: JSON.stringify({ savedAt: Date.now() - DAY - 1000, fields: { 'ernote-hn': '666' } })
        });
        assert.equal(win.document.getElementById('ernote-hn').value, '');
        assert.equal(win.localStorage.getItem(key), null);
    });

    test('Legacy un-timestamped draft is discarded', () => {
        const win = loadPage('tools/Urgent-Clinic-Home-Medication.html', {
            [key]: JSON.stringify({ 'ernote-hn': '777' })
        });
        assert.equal(win.document.getElementById('ernote-hn').value, '');
        assert.equal(win.localStorage.getItem(key), null);
    });
});
