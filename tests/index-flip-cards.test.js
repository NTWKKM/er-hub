const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function loadIndexDom() {
    const indexPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    const dom = new JSDOM(html, {
        url: 'file://' + indexPath,
        runScripts: 'dangerously',
        beforeParse(window) {
            window.matchMedia = window.matchMedia || function() {
                return {
                    matches: false,
                    addListener: function() {},
                    removeListener: function() {},
                    addEventListener: function() {},
                    removeEventListener: function() {}
                };
            };
        }
    });
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return dom.window;
}

describe('Portal Index 3D Flip Cards (index.html)', () => {
    test('Contains exactly 4 flippable card containers (01 rt-PA, 02 NSTEMI, T2 NIHSS, 06 Antivenom)', () => {
        const win = loadIndexDom();
        const doc = win.document;
        const containers = doc.querySelectorAll('.flip-card-container');
        assert.equal(containers.length, 4, `Expected 4 flip-card-containers, found ${containers.length}`);
    });

    test('All flippable cards initialize in V1 (Classic) state by default', () => {
        const win = loadIndexDom();
        const doc = win.document;
        const inners = doc.querySelectorAll('.flip-card-inner');
        assert.equal(inners.length, 4);
        inners.forEach((inner, idx) => {
            assert.equal(inner.classList.contains('is-flipped'), false, `Card ${idx} must not be flipped by default`);
        });

        // Verify front links are V1
        const expectedV1 = [
            'orders/rtpa.html',
            'orders/nstemi.html',
            'tools/nihss.html',
            'orders/antivenom.html'
        ];
        const frontRows = doc.querySelectorAll('.flip-card-front');
        assert.equal(frontRows.length, 4);
        frontRows.forEach((row, idx) => {
            assert.equal(row.getAttribute('href'), expectedV1[idx]);
            assert.equal(row.getAttribute('tabindex'), null); // Default focusable
        });

        // Verify back links are V2 and initially inert
        const expectedV2 = [
            'orders/rtpa-v2.html',
            'orders/nstemi-v2.html',
            'tools/nihss-v2.html',
            'orders/antivenom-v2.html'
        ];
        const backRows = doc.querySelectorAll('.flip-card-back');
        assert.equal(backRows.length, 4);
        backRows.forEach((row, idx) => {
            assert.equal(row.getAttribute('href'), expectedV2[idx]);
            assert.equal(row.getAttribute('tabindex'), '-1'); // Ignored by tab when unflipped
        });
    });

    test('Clicking flip button toggles is-flipped class and swaps tabindex', () => {
        const win = loadIndexDom();
        const doc = win.document;
        const rtpaCard = doc.querySelector('.flip-card-container');
        const inner = rtpaCard.querySelector('.flip-card-inner');
        const frontRow = rtpaCard.querySelector('.flip-card-front');
        const backRow = rtpaCard.querySelector('.flip-card-back');
        const frontBtn = frontRow.querySelector('.version-flip-btn');
        const backBtn = backRow.querySelector('.version-flip-btn');

        // Click front flip button -> flip to V2
        frontBtn.click();
        assert.equal(inner.classList.contains('is-flipped'), true, 'Card should have is-flipped class');
        assert.equal(frontRow.getAttribute('tabindex'), '-1', 'Front row should be tabindex -1');
        assert.equal(backRow.getAttribute('tabindex'), '0', 'Back row should be tabindex 0');
        assert.equal(frontBtn.getAttribute('tabindex'), '-1');
        assert.equal(backBtn.getAttribute('tabindex'), '0');

        // Click back flip button -> flip back to V1
        backBtn.click();
        assert.equal(inner.classList.contains('is-flipped'), false, 'Card should not have is-flipped class');
        assert.equal(frontRow.getAttribute('tabindex'), '0', 'Front row should be tabindex 0');
        assert.equal(backRow.getAttribute('tabindex'), '-1', 'Back row should be tabindex -1');
        assert.equal(frontBtn.getAttribute('tabindex'), '0');
        assert.equal(backBtn.getAttribute('tabindex'), '-1');
    });

    test('All non-flippable items retain their active and prototype statuses', () => {
        const win = loadIndexDom();
        const doc = win.document;

        // Check single tools in active section
        const dripCalc = doc.querySelector('a[href="tools/drip-calculator.html"]');
        assert.ok(dripCalc, 'Drip calculator should exist');
        assert.equal(dripCalc.closest('.flip-card-container'), null, 'Drip calculator is not flippable');

        const tbCalc = doc.querySelector('a[href="tools/tb-calculator.html"]');
        assert.ok(tbCalc, 'TB calculator should exist');

        // Check single orders in prototype section
        const stemi = doc.querySelector('a[href="orders/stemi.html"]');
        assert.ok(stemi, 'STEMI should exist');

        const burn = doc.querySelector('a[href="tools/burn-manager.html"]');
        assert.ok(burn, 'Burn manager should exist');
    });
});
