const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const RESUS_PATH = path.join(ROOT_DIR, 'tools', 'resus-timer.html');
const ANAPHY_PATH = path.join(ROOT_DIR, 'orders', 'anaphylaxis.html');
const INDEX_PATH = path.join(ROOT_DIR, 'index.html');

describe('Resuscitation Timer & ACLS 2026 Verification', () => {
    test('resus-timer.html exists and loads correctly', () => {
        assert.ok(fs.existsSync(RESUS_PATH), 'tools/resus-timer.html must exist on disk');
    });

    test('resus-timer.html contains core ACLS 2026 clinical features', () => {
        const content = fs.readFileSync(RESUS_PATH, 'utf8');

        // Metronome 110 bpm
        assert.ok(content.includes('Metronome 110 bpm'), 'Should include 110 bpm CPR metronome');
        assert.ok(content.includes('toggleMetronome'), 'Should have toggleMetronome function');

        // Epinephrine 3-5 min interval logic
        assert.ok(content.includes('Epinephrine 1 mg IV/IO'), 'Should include Epinephrine 1 mg');
        assert.ok(content.includes('epi-pill'), 'Should include dynamic Epi interval indicator');

        // Antiarrhythmics (Amiodarone & Lidocaine)
        assert.ok(content.includes('Amiodarone'), 'Should include Amiodarone');
        assert.ok(content.includes('Lidocaine'), 'Should include Lidocaine');
        assert.ok(content.includes('300 mg'), 'Should support Amiodarone 300 mg dose');

        // Persisting VF & Vector Change / DSED
        assert.ok(content.includes('Vector Change'), 'Should include Vector Change prompt for refractory VF');
        assert.ok(content.includes('DSED'), 'Should include DSED option');

        // Special Resuscitation Drugs with indications
        assert.ok(content.includes('Calcium Gluconate'), 'Should include Calcium Gluconate');
        assert.ok(content.includes('Sodium Bicarbonate'), 'Should include Sodium Bicarbonate');
        assert.ok(content.includes('Magnesium Sulfate'), 'Should include Magnesium Sulfate');
        assert.ok(content.includes('Push-Dose Epinephrine'), 'Should include Push-Dose Epinephrine');
        assert.ok(content.includes('20% Lipid Emulsion'), 'Should include 20% Lipid Emulsion (Intralipid)');
        assert.ok(content.includes('Naloxone'), 'Should include Naloxone');

        // 5 H's and 5 T's checklist
        assert.ok(content.includes('Hypovolemia') && content.includes('Hypoxia') && content.includes('Hypothermia'), 'Should include 5 H\'s');
        assert.ok(content.includes('Tension Pneumothorax') && content.includes('Tamponade') && content.includes('Toxins'), 'Should include 5 T\'s');

        // Post-ROSC Protocol (Part 11)
        assert.ok(content.includes('SpO2 90–98%') || content.includes('SpO2 90-98%'), 'Should target SpO2 90-98%');
        assert.ok(content.includes('MAP') && content.includes('65'), 'Should target MAP >= 65 mmHg');
        assert.ok(content.includes('32°C – 37.5°C') || content.includes('32-37.5'), 'Should include TTM 32-37.5°C for >= 36h');
    });

    test('resus-timer.html adopts Braun analogue palette matching index.html', () => {
        const content = fs.readFileSync(RESUS_PATH, 'utf8');

        // Theme variables from index.html
        assert.ok(content.includes('--paper: #ebe7df;'), 'Must define --paper: #ebe7df matching index.html');
        assert.ok(content.includes('--ink: #1a1a1a;'), 'Must define --ink: #1a1a1a matching index.html');
        assert.ok(content.includes('--graphite: #4a4a4a;'), 'Must define --graphite: #4a4a4a');
        assert.ok(content.includes('--rule: #d8d4c8;'), 'Must define --rule: #d8d4c8 matching index.html');
        assert.ok(content.includes('--signal-orange: #d84315;'), 'Must define --signal-orange: #d84315 matching index.html');
        assert.ok(content.includes('linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'), 'Must style top-nav with blue gradient matching index.html');
    });

    test('resus-timer.html collapsible drawers have valid IDs, aria attributes, and toggle logic', () => {
        const content = fs.readFileSync(RESUS_PATH, 'utf8');

        // Drawer 1: Drug Guide
        assert.ok(content.includes('id="drug-guide-drawer"'), 'Drug guide drawer container must exist');
        assert.ok(content.includes('id="body-drug-guide"'), 'Drug guide body must exist');
        assert.ok(content.includes('toggleDrawer(\'drug-guide-drawer\')'), 'Must toggle drug-guide-drawer');

        // Drawer 2: 5H5T Checklist
        assert.ok(content.includes('id="ht-drawer"'), '5H5T drawer container must exist');
        assert.ok(content.includes('id="body-ht"'), '5H5T body must exist');
        assert.ok(content.includes('toggleDrawer(\'ht-drawer\')'), 'Must toggle ht-drawer');

        // Drawer 3: Post-ROSC Protocol
        assert.ok(content.includes('id="rosc-drawer"'), 'Post-ROSC drawer container must exist');
        assert.ok(content.includes('id="body-rosc"'), 'Post-ROSC body must exist');
        assert.ok(content.includes('toggleDrawer(\'rosc-drawer\')'), 'Must toggle rosc-drawer');

        // Accessibility attributes
        assert.ok(content.includes('role="button"'), 'Drawer headers must have role="button"');
        assert.ok(content.includes('tabindex="0"'), 'Drawer headers must have tabindex="0"');
        assert.ok(content.includes('aria-expanded'), 'Drawer headers must have aria-expanded');

        // JS logic matches DOM elements via querySelector without broken string replace
        assert.ok(content.includes('drawer.querySelector(\'.drawer-body\')'), 'toggleDrawer must find body via querySelector');
    });

    test('anaphylaxis.html links correctly to tools/drip-calculator.html', () => {
        const content = fs.readFileSync(ANAPHY_PATH, 'utf8');
        assert.ok(
            content.includes('href="../tools/drip-calculator.html"'),
            'anaphylaxis.html must link to ../tools/drip-calculator.html'
        );
        assert.ok(
            !content.includes('href="drip-calculator.html"'),
            'anaphylaxis.html must not contain broken relative link href="drip-calculator.html"'
        );
    });

    test('index.html has no literal \\n and places 08, T8, T9 in Prototype section', () => {
        const content = fs.readFileSync(INDEX_PATH, 'utf8');

        // No literal \n
        assert.ok(!content.includes('\\n'), 'index.html must not contain literal \\n strings');

        // Prototype section contains 08, T8, T9
        const protoStart = content.indexOf('id="prototype-content"');
        assert.ok(protoStart !== -1, 'Prototype content section must exist in index.html');
        const protoSection = content.slice(protoStart, content.indexOf('</ol>', protoStart));

        assert.ok(protoSection.includes('orders/anaphylaxis.html'), '08 Anaphylaxis should be in Prototype section');
        assert.ok(protoSection.includes('tools/rsi-checklist.html'), 'T8 RSI Checklist should be in Prototype section');
        assert.ok(protoSection.includes('tools/resus-timer.html'), 'T9 Resuscitation Timer should be in Prototype section');
    });
});
