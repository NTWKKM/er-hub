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
