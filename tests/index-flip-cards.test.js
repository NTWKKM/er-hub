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
            window.requestAnimationFrame = window.requestAnimationFrame || function(cb) { cb(); };
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
            assert.equal(row.getAttribute('aria-hidden'), 'false');
            const link = row.querySelector('.order-link-cover');
            assert.ok(link, 'Front face must have order-link-cover');
            assert.equal(link.getAttribute('href'), expectedV1[idx]);
            assert.equal(link.getAttribute('tabindex'), null); // Default focusable
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
            assert.equal(row.getAttribute('aria-hidden'), 'true');
            const link = row.querySelector('.order-link-cover');
            assert.ok(link, 'Back face must have order-link-cover');
            assert.equal(link.getAttribute('href'), expectedV2[idx]);
            assert.equal(link.getAttribute('tabindex'), '-1'); // Ignored by tab when unflipped
        });
    });

    test('Clicking flip button toggles is-flipped class, swaps aria-hidden, aria-pressed, and tabindex', () => {
        const win = loadIndexDom();
        const doc = win.document;
        const rtpaCard = doc.querySelector('.flip-card-container');
        const inner = rtpaCard.querySelector('.flip-card-inner');
        const frontRow = rtpaCard.querySelector('.flip-card-front');
        const backRow = rtpaCard.querySelector('.flip-card-back');
        const frontLink = frontRow.querySelector('.order-link-cover');
        const backLink = backRow.querySelector('.order-link-cover');
        const frontBtn = frontRow.querySelector('.version-flip-btn');
        const backBtn = backRow.querySelector('.version-flip-btn');

        // Click front flip button -> flip to V2
        frontBtn.click();
        assert.equal(inner.classList.contains('is-flipped'), true, 'Card should have is-flipped class');
        assert.equal(frontRow.getAttribute('aria-hidden'), 'true');
        assert.equal(backRow.getAttribute('aria-hidden'), 'false');
        assert.equal(frontLink.getAttribute('tabindex'), '-1');
        assert.equal(backLink.getAttribute('tabindex'), '0');
        assert.equal(frontBtn.getAttribute('tabindex'), '-1');
        assert.equal(frontBtn.getAttribute('aria-pressed'), 'true');
        assert.equal(backBtn.getAttribute('tabindex'), '0');
        assert.equal(backBtn.getAttribute('aria-pressed'), 'true');

        // Click back flip button -> flip back to V1
        backBtn.click();
        assert.equal(inner.classList.contains('is-flipped'), false, 'Card should not have is-flipped class');
        assert.equal(frontRow.getAttribute('aria-hidden'), 'false');
        assert.equal(backRow.getAttribute('aria-hidden'), 'true');
        assert.equal(frontLink.getAttribute('tabindex'), '0');
        assert.equal(backLink.getAttribute('tabindex'), '-1');
        assert.equal(frontBtn.getAttribute('tabindex'), '0');
        assert.equal(frontBtn.getAttribute('aria-pressed'), 'false');
        assert.equal(backBtn.getAttribute('tabindex'), '-1');
        assert.equal(backBtn.getAttribute('aria-pressed'), 'false');
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

    test('3D Tilt Effect: Both regular order-rows and flip-card-containers respond to mouse movement', () => {
        const win = loadIndexDom();
        const doc = win.document;

        // Verify flip card container has tilt event listeners and updates transform
        const flipContainer = doc.querySelector('.flip-card-container');
        assert.ok(flipContainer, 'Flip container should exist');

        // Mock getBoundingClientRect
        flipContainer.getBoundingClientRect = () => ({
            left: 100,
            top: 100,
            width: 300,
            height: 60,
            right: 400,
            bottom: 160
        });

        // Mouseenter
        flipContainer.dispatchEvent(new win.MouseEvent('mouseenter'));
        assert.equal(flipContainer.style.transitionDuration, '80ms');

        // Mousemove (at right/bottom edge: clientX=370, clientY=145)
        flipContainer.dispatchEvent(new win.MouseEvent('mousemove', { clientX: 370, clientY: 145 }));
        
        assert.ok(flipContainer.style.transform.includes('perspective(600px)'), 'Flip container should have perspective transform on tilt');
        assert.ok(flipContainer.style.transform.includes('translateZ(6px)'), 'Flip container should have 6px Z lift on tilt');

        // Mouseleave -> reset to 0deg and 400ms duration
        flipContainer.dispatchEvent(new win.MouseEvent('mouseleave'));
        assert.equal(flipContainer.style.transitionDuration, '400ms');
        assert.equal(flipContainer.style.transform, 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px)');

        // Verify regular order row also has tilt
        const regularRow = doc.querySelector('.order-item-wrap:not(.flip-card-container) .order-row');
        assert.ok(regularRow, 'Regular order-row should exist');
        regularRow.getBoundingClientRect = () => ({
            left: 100,
            top: 100,
            width: 300,
            height: 60,
            right: 400,
            bottom: 160
        });
        regularRow.dispatchEvent(new win.MouseEvent('mouseenter'));
        regularRow.dispatchEvent(new win.MouseEvent('mousemove', { clientX: 370, clientY: 145 }));
        assert.ok(regularRow.style.transform.includes('perspective(600px)'));
        assert.ok(regularRow.style.transform.includes('translateZ(6px)'));
        regularRow.dispatchEvent(new win.MouseEvent('mouseleave'));
        assert.equal(regularRow.style.transform, 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    });

    test('3D Tilt Effect: queued rAF does not reapply tilt after mouseleave', () => {
        const indexPath = path.join(__dirname, '..', 'index.html');
        const html = fs.readFileSync(indexPath, 'utf8');

        let queuedRaf = [];
        let canceledRafIds = [];
        const dom = new JSDOM(html, {
            url: 'file://' + indexPath,
            runScripts: 'dangerously',
            beforeParse(window) {
                window.requestAnimationFrame = function(cb) {
                    queuedRaf.push(cb);
                    return queuedRaf.length;
                };
                window.cancelAnimationFrame = function(id) {
                    canceledRafIds.push(id);
                };
                window.matchMedia = () => ({
                    matches: false,
                    addListener: function() {},
                    removeListener: function() {},
                    addEventListener: function() {},
                    removeEventListener: function() {}
                });
            }
        });
        dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
        const win = dom.window;
        const flipContainer = win.document.querySelector('.flip-card-container');
        assert.ok(flipContainer, 'Flip container should exist');

        flipContainer.getBoundingClientRect = () => ({
            left: 100,
            top: 100,
            width: 300,
            height: 60,
            right: 400,
            bottom: 160
        });

        // Trigger mousemove to queue rAF
        flipContainer.dispatchEvent(new win.MouseEvent('mousemove', { clientX: 370, clientY: 145 }));
        assert.equal(queuedRaf.length, 1, 'rAF callback should be queued');

        // Pointer leaves before rAF callback executes
        flipContainer.dispatchEvent(new win.MouseEvent('mouseleave'));
        assert.equal(flipContainer.style.transitionDuration, '400ms');
        assert.equal(flipContainer.style.transform, 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
        assert.ok(canceledRafIds.includes(1), 'cancelAnimationFrame should be called with queued rAF id');

        // Execute any callbacks that were queued prior to mouseleave
        queuedRaf.forEach(cb => cb());

        // Transform must preserve reset state and not reapply tilt from stale event
        assert.equal(flipContainer.style.transform, 'perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    });
});
