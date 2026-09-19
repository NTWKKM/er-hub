const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function loadAbxUiDom() {
    const htmlPath = path.join(__dirname, '..', 'tools', 'abx-renal-dosing.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const dir = path.dirname(htmlPath);

    // Inline local scripts for deterministic node:test execution
    html = html.replace(/<script src="([^"]+)"><\/script>/g, (match, src) => {
        if (src.startsWith('http')) return match;
        const scriptPath = path.resolve(dir, src);
        if (fs.existsSync(scriptPath)) {
            return '<script>' + fs.readFileSync(scriptPath, 'utf8') + '</script>';
        }
        return match;
    });

    const unhandledErrors = [];
    const dom = new JSDOM(html, {
        url: 'file://' + htmlPath,
        runScripts: 'dangerously',
        beforeParse(window) {
            window.addEventListener('error', (e) => {
                unhandledErrors.push(e.error || e.message);
            });
        }
    });

    // Ensure DOMContentLoaded handlers run on window
    dom.window.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    return { win: dom.window, doc: dom.window.document, unhandledErrors };
}

describe('M2 Adversarial UI & PWA Challenge: tools/abx-renal-dosing.html', () => {

    test('1. DOM Initialization & Structural Contract', () => {
        const { doc, unhandledErrors } = loadAbxUiDom();
        assert.equal(unhandledErrors.length, 0, 'No unhandled errors during load');

        // Required Input Elements
        const requiredIds = [
            'in-age', 'in-weight', 'in-height', 'in-scr',
            'btn-sex-m', 'btn-sex-f',
            'btn-rrt-none', 'btn-rrt-hd', 'btn-rrt-crrt',
            'btn-wt-auto', 'btn-wt-tbw', 'btn-wt-ibw', 'btn-wt-abw',
            'out-crcl', 'out-egfr', 'badge-crcl-tier', 'badge-egfr-tier',
            'out-weight-type', 'out-weight-used', 'out-bmi', 'out-ibw', 'out-abw', 'out-bsa', 'out-absgfr',
            'discordance-banner', 'discordance-heading', 'discordance-text',
            'abx-cards-container', 'rx-note-text', 'toast-msg'
        ];

        for (const id of requiredIds) {
            const el = doc.getElementById(id);
            assert.ok(el, `Element #${id} must exist in DOM`);
        }

        // Check initial default calculation
        const crclText = doc.getElementById('out-crcl').textContent;
        const egfrText = doc.getElementById('out-egfr').textContent;
        assert.ok(parseFloat(crclText) > 0, `Initial CrCl should be numeric, got: ${crclText}`);
        assert.ok(parseFloat(egfrText) > 0, `Initial eGFR should be numeric, got: ${egfrText}`);
    });

    test('2. Form Input Resilience: Empty, Zero, Negative, and NaN values do NOT throw uncaught DOM exceptions', () => {
        const { win, doc, unhandledErrors } = loadAbxUiDom();

        const stressValues = [
            '', '0', '-1', '-50', '-999', 'abc', 'NaN', 'undefined', 'null', '0.0000', '99999'
        ];

        const inputs = ['in-age', 'in-weight', 'in-height', 'in-scr'];

        // Fuzz each field individually
        for (const inputId of inputs) {
            for (const val of stressValues) {
                const el = doc.getElementById(inputId);
                el.value = val;
                el.dispatchEvent(new win.Event('input', { bubbles: true }));
                el.dispatchEvent(new win.Event('change', { bubbles: true }));
            }
        }

        // Fuzz all fields simultaneously
        for (const val of stressValues) {
            inputs.forEach(id => { doc.getElementById(id).value = val; });
            win.calculateAll();
        }

        assert.equal(unhandledErrors.length, 0, `Unhandled exceptions occurred during input fuzzing: ${JSON.stringify(unhandledErrors)}`);
    });

    test('3. Tactile Stepper Clamping: Minus buttons do not drive values below biological minimums', () => {
        const { win, doc } = loadAbxUiDom();

        // Step Age down past min (initial 65 -> set to 2 -> step -1 twice -> min 1)
        doc.getElementById('in-age').value = '2';
        win.stepVal('in-age', -1, 1, 120);
        assert.equal(doc.getElementById('in-age').value, '1', 'Age reaches min 1');
        win.stepVal('in-age', -1, 1, 120);
        assert.equal(doc.getElementById('in-age').value, '1', 'Age clamps at min 1');

        // Step Age up past max (set to 119 -> step +1 twice -> max 120)
        doc.getElementById('in-age').value = '119';
        win.stepVal('in-age', 1, 1, 120);
        assert.equal(doc.getElementById('in-age').value, '120', 'Age reaches max 120');
        win.stepVal('in-age', 1, 1, 120);
        assert.equal(doc.getElementById('in-age').value, '120', 'Age clamps at max 120');

        // Step Weight down past min (set to 21 -> step -1 twice -> min 20)
        doc.getElementById('in-weight').value = '21';
        win.stepVal('in-weight', -1, 20, 300);
        win.stepVal('in-weight', -1, 20, 300);
        assert.equal(doc.getElementById('in-weight').value, '20', 'Weight clamps at min 20');

        // Step Height down past min (set to 81 -> step -1 twice -> min 80)
        doc.getElementById('in-height').value = '81';
        win.stepVal('in-height', -1, 80, 250);
        win.stepVal('in-height', -1, 80, 250);
        assert.equal(doc.getElementById('in-height').value, '80', 'Height clamps at min 80');

        // Step SCr down past min (set to 0.2 -> step -0.1 twice -> min 0.1)
        doc.getElementById('in-scr').value = '0.2';
        win.stepVal('in-scr', -0.1, 0.1, 20.0, 1);
        win.stepVal('in-scr', -0.1, 0.1, 20.0, 1);
        assert.equal(doc.getElementById('in-scr').value, '0.1', 'SCr clamps at min 0.1');
    });

    test('4. Discordance Banner Activation: Triggers when CrCl and eGFR place patient in different dosage tiers', () => {
        const { win, doc } = loadAbxUiDom();
        const banner = doc.getElementById('discordance-banner');
        const heading = doc.getElementById('discordance-heading');
        const text = doc.getElementById('discordance-text');

        // Discordant Clinical Case: Elderly, low weight female with borderline high SCr
        // Age 75, Female, Weight 45kg, Height 150cm, SCr 1.2 mg/dL
        // CrCl ~ 28.8 mL/min (Tier 10-29: Severe) vs eGFR ~ 47.2 mL/min/1.73m² (Tier 30-50: Moderate)
        doc.getElementById('in-age').value = '75';
        doc.getElementById('in-weight').value = '45';
        doc.getElementById('in-height').value = '150';
        doc.getElementById('in-scr').value = '1.2';
        win.setSex('F');

        assert.ok(banner.classList.contains('active-discordant'), 'Banner must have active-discordant class');
        assert.notEqual(banner.style.display, 'none', 'Banner must be visible when discordant');
        assert.ok(heading.textContent.includes('Discordance'), 'Heading flags discordance');
        assert.ok(text.textContent.includes('narrow therapeutic index'), 'Guidance includes narrow therapeutic index warning');
        assert.ok(text.textContent.includes('Vancomycin'), 'Guidance mentions Vancomycin conservative clearance');

        // Concordant Clinical Case: Young healthy male with normal parameters
        // Age 30, Male, Weight 70kg, Height 175cm, SCr 0.9 mg/dL
        doc.getElementById('in-age').value = '30';
        doc.getElementById('in-weight').value = '70';
        doc.getElementById('in-height').value = '175';
        doc.getElementById('in-scr').value = '0.9';
        win.setSex('M');

        assert.ok(banner.classList.contains('concordant'), 'Banner must have concordant class');
        assert.ok(heading.textContent.includes('Concordant'), 'Heading confirms concordance');

        // Dialysis Case: HD suppresses discordance banner (fixed clearance mode)
        win.setRRT('hd');
        assert.equal(banner.style.display, 'none', 'HD suppresses discordance banner');

        win.setRRT('crrt');
        assert.equal(banner.style.display, 'none', 'CRRT suppresses discordance banner');
    });

    test('5. Indication Filtering Engine & Overrides in UI', () => {
        const { win, doc } = loadAbxUiDom();

        // 1. Filter by Meningitis
        win.selectIndicationFilter('meningitis_ca');
        assert.equal(doc.getElementById('active-indication-badge').textContent, 'Community-Acquired Meningitis / CNS Infection');
        assert.equal(doc.getElementById('indication-guidance-box').style.display, 'block');

        // Ceftriaxone in Meningitis must show 2g q12h high-dose CNS override
        const ceftCard = doc.getElementById('abx-card-ceftriaxone');
        assert.ok(ceftCard, 'Ceftriaxone card must be displayed in Meningitis');
        const ceftDoseHud = ceftCard.querySelector('.dose-hud-value').textContent;
        const ceftFreqHud = ceftCard.querySelector('.dose-hud-freq').textContent;
        assert.equal(ceftDoseHud, '2g', 'Meningitis overrides Ceftriaxone to 2g');
        assert.equal(ceftFreqHud, 'q12h', 'Meningitis overrides Ceftriaxone frequency to q12h');

        // 2. Filter by CAP
        win.selectIndicationFilter('cap');
        assert.equal(doc.getElementById('active-indication-badge').textContent, 'Community-Acquired Pneumonia (CAP)');
        const capCards = doc.querySelectorAll('.abx-card');
        assert.ok(capCards.length >= 2, 'CAP should display indicated drugs');

        // 3. Filter by All
        win.selectIndicationFilter('all');
        assert.equal(doc.getElementById('active-indication-badge').textContent, 'All Antimicrobials');
        assert.equal(doc.getElementById('indication-guidance-box').style.display, 'none');
        const allCards = doc.querySelectorAll('.abx-card');
        assert.ok(allCards.length >= 12, 'All antimicrobials should show at least 12 drugs');

        // Verify 8 core drugs are all present
        const coreDrugs = ['ceftriaxone', 'cefepime', 'ampicillin', 'levofloxacin', 'meropenem', 'pip_tazo', 'vancomycin', 'ciprofloxacin'];
        for (const cd of coreDrugs) {
            assert.ok(doc.getElementById(`abx-card-${cd}`), `Core drug card #abx-card-${cd} must be rendered`);
        }
    });

    test('6. 6-Tier Stanford Table Expand/Collapse & Dynamic Tier Highlighting', () => {
        const { win, doc } = loadAbxUiDom();

        const btn = doc.getElementById('btn-exp-ceftriaxone');
        const exp = doc.getElementById('exp-ceftriaxone');
        assert.ok(btn && exp, 'Expand trigger and container exist for Ceftriaxone');
        assert.equal(btn.getAttribute('aria-expanded'), 'false');
        assert.ok(!exp.classList.contains('open'));

        // Toggle open
        win.toggleExpand('ceftriaxone');
        assert.equal(btn.getAttribute('aria-expanded'), 'true');
        assert.ok(exp.classList.contains('open'));

        // Check active tier is highlighted
        const activeRow = exp.querySelector('tr.active-tier');
        assert.ok(activeRow, 'Active renal tier row must have class active-tier');

        // Toggle closed
        win.toggleExpand('ceftriaxone');
        assert.equal(btn.getAttribute('aria-expanded'), 'false');
        assert.ok(!exp.classList.contains('open'));
    });

    test('7. Zero-PHI Clinical Prescription Note & Toast Notification Verification', async () => {
        const { win, doc } = loadAbxUiDom();

        // Explicitly select an indication and antimicrobial (per clinical safety gate)
        win.selectIndicationFilter('cap');
        win.selectAndCopyDrug('ceftriaxone');
        const note = doc.getElementById('rx-note-text').textContent;

        // Strict Zero-PHI Check (HIPAA / PDPA invariants)
        const phiPatterns = [
            /\bHN\b/i,
            /\bHospital\s*Number\b/i,
            /\bPatient\s*Name\b/i,
            /\bCitizen\s*ID\b/i,
            /\bDOB\b/i,
            /\bDate\s*of\s*Birth\b/i,
            /\bPhone\b/i,
            /\bAddress\b/i
        ];

        for (const pat of phiPatterns) {
            assert.ok(!pat.test(note), `Prescription note contains forbidden PHI marker matching: ${pat}`);
        }

        // Clinical Units Check (AGENTS.md mandatory explicit units)
        assert.ok(note.includes('CrCl') || note.includes('mL/min'), 'Note includes clearance units');
        assert.ok(note.includes('kg'), 'Note includes weight units');

        // Mock modern navigator.clipboard
        let copiedText = '';
        win.navigator.clipboard = {
            writeText: async (t) => {
                copiedText = t;
                return Promise.resolve();
            }
        };

        win.copyPrescriptionNote();
        // Allow microtasks to execute
        await new Promise(resolve => setTimeout(resolve, 20));

        assert.equal(copiedText, note, 'Clipboard copied exact Zero-PHI note text');
        assert.equal(doc.getElementById('toast-msg').textContent, '✓ Prescription note copied (Zero-PHI compliant)');

        // Test fallback copy when clipboard fails
        const toast = doc.getElementById('toast-msg');
        toast.style.display = 'none';
        toast.textContent = '';
        win.navigator.clipboard.writeText = () => Promise.reject(new Error('Permission denied'));
        win.copyPrescriptionNote();
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.notEqual(toast.style.display, 'none', 'Fallback path shows the toast');
        assert.ok(toast.textContent.length > 0, 'Fallback path sets a toast message');
    });

    test('8. Clinical Ergonomics: 48px Touch Targets & Responsive Layout Design Tokens', () => {
        const htmlPath = path.join(__dirname, '..', 'tools', 'abx-renal-dosing.html');
        const html = fs.readFileSync(htmlPath, 'utf8');

        // Check 48px minimum touch target enforcement in CSS
        assert.ok(html.includes('.btn-step {'), 'CSS defines .btn-step');
        assert.ok(html.includes('height: 48px;'), 'CSS specifies 48px height');
        assert.ok(html.includes('min-height: 48px;'), 'CSS specifies 48px min-height');
        assert.ok(html.includes('min-width: 48px;'), 'CSS specifies 48px min-width');

        // Check Clean White clinical tone tokens (User directive: No dark mode)
        assert.ok(html.includes('--paper: #f8fafc;'), 'Uses clean slate-white paper background');
        assert.ok(html.includes('--surface-card: #ffffff;'), 'Uses pure white card surface');
        assert.ok(html.includes('.theme-neutral'), 'Body uses .theme-neutral');

        // Check mobile responsive breakpoints
        assert.ok(html.includes('@media (max-width: 1024px)'), 'Includes 1024px breakpoint for tablet/mobile stacked columns');
        assert.ok(html.includes('@media (max-width: 480px)'), 'Includes 480px breakpoint for mobile single-column clearance grid');
    });
});
