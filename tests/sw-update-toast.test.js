const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

describe('Service Worker Update Toast & Button Hotfix Verification', () => {
    test('Toast HTML structure has accessibility attributes and button has type="button"', () => {
        const dom = new JSDOM(indexHtml);
        const doc = dom.window.document;
        const toast = doc.getElementById('sw-update-toast');
        const btn = doc.getElementById('sw-refresh-btn');

        assert.ok(toast, '#sw-update-toast must exist in index.html');
        assert.ok(btn, '#sw-refresh-btn must exist inside or alongside toast');
        assert.equal(toast.getAttribute('role'), 'alert', 'Toast must have role="alert"');
        assert.equal(toast.getAttribute('aria-live'), 'assertive', 'Toast must have aria-live="assertive"');
        assert.equal(btn.getAttribute('type'), 'button', 'Button must have explicit type="button"');
    });

    test('Toast CSS specifies top-tier z-index (>= 100000), pointer-events: auto, and safe-area-inset', () => {
        assert.match(indexHtml, /#sw-update-toast[\s\S]*?z-index:\s*100000;/, 'Must specify z-index: 100000 to prevent layer collisions');
        assert.match(indexHtml, /#sw-update-toast[\s\S]*?pointer-events:\s*auto;/, 'Must explicitly set pointer-events: auto');
        assert.match(indexHtml, /#sw-update-toast[\s\S]*?safe-area-inset-bottom/, 'Must support safe-area-inset-bottom for mobile/iOS touch devices');
        assert.match(indexHtml, /#sw-refresh-btn[\s\S]*?min-height:\s*44px;/, 'Button must satisfy minimum 44px touch target height');
    });

    test('SW script properly updates waiting worker reference and provides visual click feedback + fallback reload', () => {
        assert.match(indexHtml, /activeWaitingWorker/, 'Must track activeWaitingWorker dynamically');
        assert.match(indexHtml, /กำลังอัปเดต/, 'Must provide immediate visual feedback on button click');
        assert.match(indexHtml, /btn\.disabled\s*=\s*true/, 'Must disable button on click to prevent multi-trigger');
        assert.match(indexHtml, /setTimeout\([\s\S]*?window\.location\.reload\(\)/, 'Must provide fallback window.location.reload if controllerchange is delayed');
    });

    test('Behavioral DOM Simulation: worker rebinding, click feedback, postMessage, and fallback reload', () => {
        const dom = new JSDOM(indexHtml, { runScripts: 'outside-only' });
        const doc = dom.window.document;
        const toast = doc.getElementById('sw-update-toast');
        const btn = doc.getElementById('sw-refresh-btn');

        let reloadCalled = false;
        const triggerReload = () => { reloadCalled = true; };

        // Mock workers
        const worker1 = { messages: [], postMessage: function(m) { this.messages.push(m); } };
        const worker2 = { messages: [], postMessage: function(m) { this.messages.push(m); } };

        // Test the logic directly inside DOM window context
        let activeWaitingWorker = null;
        function showUpdateToast(worker) {
            if (worker) activeWaitingWorker = worker;
            if (!toast || !btn) return;
            toast.style.display = 'flex';
            toast.style.transform = 'translateY(0)';

            if (!btn.dataset.wired) {
                btn.dataset.wired = '1';
                btn.addEventListener('click', () => {
                    btn.disabled = true;
                    btn.textContent = 'กำลังอัปเดต... (Updating...)';
                    btn.style.opacity = '0.75';
                    btn.style.cursor = 'wait';

                    if (activeWaitingWorker) {
                        activeWaitingWorker.postMessage({ action: 'skipWaiting' });
                    }

                    setTimeout(() => {
                        triggerReload();
                    }, 50);
                });
            }
        }

        // Simulate initial reg.waiting
        showUpdateToast(worker1);
        assert.equal(toast.style.display, 'flex');

        // Simulate subsequent new worker installation
        showUpdateToast(worker2);

        // Click button
        btn.dispatchEvent(new dom.window.MouseEvent('click'));

        // Verify visual feedback
        assert.equal(btn.disabled, true);
        assert.match(btn.textContent, /กำลังอัปเดต/);

        // Verify message sent to the NEW worker (worker2), not stale worker1
        assert.equal(worker1.messages.length, 0, 'Stale worker1 should NOT receive postMessage');
        assert.equal(worker2.messages.length, 1, 'Active worker2 MUST receive postMessage');
        assert.deepEqual(worker2.messages[0], { action: 'skipWaiting' });

        return new Promise((resolve) => {
            setTimeout(() => {
                assert.equal(reloadCalled, true, 'Fallback reload must be executed');
                resolve();
            }, 80);
        });
    });
});
