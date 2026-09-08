const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

// Extract the production Service Worker registration block directly from index.html
const swScriptMatch = indexHtml.match(/if \('serviceWorker' in navigator\) \{[\s\S]*?catch\(function\(e\) \{ console\.warn\('SW registration failed:', e\); \}\);\s*\}/);
assert.ok(swScriptMatch, 'Must find production serviceWorker registration block in index.html');
const productionSwCode = swScriptMatch[0];

function createMockWorker() {
    return {
        state: 'installed',
        messages: [],
        listeners: {},
        addEventListener(event, cb) {
            this.listeners[event] = cb;
        },
        postMessage(msg) {
            this.messages.push(msg);
        }
    };
}

function setupProductionSwEnv({ initialWaitingWorker = null, installingWorker = null } = {}) {
    let reloadTriggered = false;
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (err) => {
        if (err.message && err.message.includes('Not implemented: navigation')) {
            reloadTriggered = true;
        }
    });

    const dom = new JSDOM(indexHtml, {
        url: 'http://localhost/',
        runScripts: 'outside-only',
        virtualConsole
    });
    const win = dom.window;

    const regListeners = {};
    const mockReg = {
        waiting: initialWaitingWorker,
        installing: installingWorker,
        update: () => Promise.resolve(),
        addEventListener(event, cb) {
            regListeners[event] = cb;
        }
    };

    const swListeners = {};
    Object.defineProperty(win.navigator, 'serviceWorker', {
        value: {
            controller: {},
            addEventListener(event, cb) {
                swListeners[event] = cb;
            },
            register: () => Promise.resolve(mockReg)
        },
        configurable: true
    });

    // Execute the actual production Service Worker handler in the DOM window context
    vm.runInContext(productionSwCode, dom.getInternalVMContext());

    return {
        win,
        doc: win.document,
        mockReg,
        regListeners,
        swListeners,
        didReload: () => reloadTriggered
    };
}

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

    test('Toast CSS specifies top-tier z-index (>= 100000), pointer-events: auto, and safe-area-inset scoped to rule blocks', () => {
        // 1. Scoped inspection of #sw-update-toast rule block
        const toastCssMatch = indexHtml.match(/#sw-update-toast\s*\{([^}]+)\}/);
        assert.ok(toastCssMatch, 'Must find #sw-update-toast CSS rule block');
        const toastCss = toastCssMatch[1];
        assert.match(toastCss, /z-index:\s*100000;/, 'Must specify z-index: 100000 in #sw-update-toast block');
        assert.match(toastCss, /pointer-events:\s*auto;/, 'Must specify pointer-events: auto in #sw-update-toast block');
        assert.match(toastCss, /safe-area-inset-bottom/, 'Must support safe-area-inset-bottom in #sw-update-toast block');

        // 2. Scoped inspection of #sw-refresh-btn rule block
        const btnCssMatch = indexHtml.match(/#sw-refresh-btn\s*\{([^}]+)\}/);
        assert.ok(btnCssMatch, 'Must find #sw-refresh-btn CSS rule block');
        const btnCss = btnCssMatch[1];
        assert.match(btnCss, /min-height:\s*44px;/, 'Button must specify min-height: 44px in #sw-refresh-btn block');
        assert.match(btnCss, /pointer-events:\s*auto;/, 'Button must specify pointer-events: auto in #sw-refresh-btn block');
    });

    test('SW script properly updates waiting worker reference and provides visual click feedback + fallback reload scoped to script block', () => {
        // Scoped inspection of the module script containing service worker registration
        const scriptMatch = indexHtml.match(/<script type="module">([\s\S]*?navigator\.serviceWorker\.register[\s\S]*?)<\/script>/);
        assert.ok(scriptMatch, 'Must find SW module script block in index.html');
        const swScript = scriptMatch[1];

        assert.match(swScript, /activeWaitingWorker\s*=\s*worker/, 'Must track activeWaitingWorker dynamically');
        assert.match(swScript, /กำลังอัปเดต/, 'Must provide immediate visual feedback on button click');
        assert.match(swScript, /btn\.disabled\s*=\s*true/, 'Must disable button on click to prevent multi-trigger');
        assert.match(swScript, /setTimeout\([\s\S]*?window\.location\.reload\(\)[\s\S]*?1200\)/, 'Must provide fallback window.location.reload with 1200ms delay');
    });

    test('Production SW update flow: initial reg.waiting displays toast and click dispatches skipWaiting to waiting worker', (t, done) => {
        const worker = createMockWorker();
        const env = setupProductionSwEnv({ initialWaitingWorker: worker });

        // Wait for microtasks/registration resolution
        setTimeout(() => {
            const toast = env.doc.getElementById('sw-update-toast');
            const btn = env.doc.getElementById('sw-refresh-btn');

            assert.equal(toast.style.display, 'flex', 'Toast must be displayed when reg.waiting exists');
            assert.equal(btn.disabled, false, 'Button must initially be enabled');

            btn.click();

            assert.equal(btn.disabled, true, 'Button must be disabled after click');
            assert.match(btn.textContent, /กำลังอัปเดต/, 'Button text must indicate updating');
            assert.equal(worker.messages.length, 1, 'Waiting worker must receive exactly one message');
            assert.equal(worker.messages[0].action, 'skipWaiting', 'Message action must be skipWaiting');
            done();
        }, 50);
    });

    test('Production SW update flow: worker rebinding when updatefound fires with new worker', (t, done) => {
        const staleWorker = createMockWorker();
        const newWorker = createMockWorker();
        const env = setupProductionSwEnv({
            initialWaitingWorker: staleWorker,
            installingWorker: newWorker
        });

        setTimeout(() => {
            const toast = env.doc.getElementById('sw-update-toast');
            const btn = env.doc.getElementById('sw-refresh-btn');

            assert.equal(toast.style.display, 'flex');

            // Dispatch updatefound on reg and statechange on newWorker
            assert.ok(env.regListeners['updatefound'], 'reg must have updatefound listener');
            env.regListeners['updatefound']();

            assert.ok(newWorker.listeners['statechange'], 'newWorker must have statechange listener');
            newWorker.listeners['statechange']();

            // Click button
            btn.click();

            assert.equal(btn.disabled, true);
            assert.match(btn.textContent, /กำลังอัปเดต/);

            // Verify message was delivered to the NEW worker, NOT the stale worker
            assert.equal(staleWorker.messages.length, 0, 'Stale worker must NOT receive postMessage');
            assert.equal(newWorker.messages.length, 1, 'New worker MUST receive postMessage');
            assert.equal(newWorker.messages[0].action, 'skipWaiting');
            done();
        }, 50);
    });

    test('Production SW update flow: fallback reload executes if controllerchange is delayed', (t, done) => {
        const worker = createMockWorker();
        const env = setupProductionSwEnv({ initialWaitingWorker: worker });

        setTimeout(() => {
            const btn = env.doc.getElementById('sw-refresh-btn');
            assert.equal(env.didReload(), false, 'Reload should not have fired before click');

            btn.click();
            assert.equal(env.didReload(), false, 'Reload should not have fired immediately after click');

            // Wait past the 1200ms fallback timeout
            setTimeout(() => {
                assert.equal(env.didReload(), true, 'Fallback window.location.reload must execute after 1200ms');
                done();
            }, 1250);
        }, 50);
    });
});
