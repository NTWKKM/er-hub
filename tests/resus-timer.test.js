const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function loadResusTimerDom() {
    const htmlPath = path.join(__dirname, '..', 'tools', 'resus-timer.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const dir = path.dirname(htmlPath);

    html = html.replace(/<script src="([^"]+)"><\/script>/g, (match, src) => {
        if (src.startsWith('http')) return match;
        const scriptPath = path.resolve(dir, src);
        if (fs.existsSync(scriptPath)) {
            return '<script>' + fs.readFileSync(scriptPath, 'utf8') + '</script>';
        }
        return match;
    });

    const dom = new JSDOM(html, {
        url: 'http://localhost/tools/resus-timer.html',
        runScripts: 'dangerously'
    });

    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return dom.window;
}

describe('Resuscitation Assistant & Timer (tools/resus-timer.html) DOM Execution', () => {
    test('Initializes with default adult patient mode and guidance', () => {
        const win = loadResusTimerDom();
        const doc = win.document;

        const modeSelect = doc.getElementById('patient-mode');
        assert.ok(modeSelect, 'Patient mode selector should exist');
        assert.equal(modeSelect.value, 'adult');

        const guidance = doc.getElementById('guidance-text');
        assert.ok(guidance.innerHTML.includes('Adult CPR Mode'), 'Should display Adult CPR guidance by default');
        assert.ok(guidance.innerHTML.includes('Ratio: 30:2'), 'Should specify 30:2 ratio for adult');
    });

    test('Switching to child/pediatric mode updates guidance to PALS recommendations', () => {
        const win = loadResusTimerDom();
        const doc = win.document;

        const modeSelect = doc.getElementById('patient-mode');
        modeSelect.value = 'pediatric';
        win.updatePatientModeGuidance();

        const guidance = doc.getElementById('guidance-text');
        assert.ok(guidance.innerHTML.includes('Pediatric CPR Mode'), 'Should display Pediatric CPR guidance');
        assert.ok(guidance.innerHTML.includes('Depth: 2 inches (5 cm)'), 'Should specify 2 inches depth');
        assert.ok(guidance.innerHTML.includes('Ratio: 15:2'), 'Should specify 15:2 ratio');
    });

    test('Switching to infant mode updates guidance to 2-thumb encircling technique', () => {
        const win = loadResusTimerDom();
        const doc = win.document;

        const modeSelect = doc.getElementById('patient-mode');
        modeSelect.value = 'infant';
        win.updatePatientModeGuidance();

        const guidance = doc.getElementById('guidance-text');
        assert.ok(guidance.innerHTML.includes('Infant CPR Mode'), 'Should display Infant CPR guidance');
        assert.ok(guidance.innerHTML.includes('2-thumb-encircling'), 'Should specify 2-thumb encircling technique');
        assert.ok(guidance.innerHTML.includes('Depth: 1.5 inches (4 cm)'), 'Should specify 1.5 inches depth');
    });
});
