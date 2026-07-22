const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SCORE_HUB_PATH = path.join(ROOT_DIR, 'tools', 'score-hub.html');
const INDEX_PATH = path.join(ROOT_DIR, 'index.html');
const SW_PATH = path.join(ROOT_DIR, 'service-worker.js');

describe('Clinical Score Hub (`tools/score-hub.html`) Verification', () => {
    test('score-hub.html exists on disk', () => {
        assert.ok(fs.existsSync(SCORE_HUB_PATH), 'tools/score-hub.html file does not exist');
    });

    test('score-hub.html contains all 6 required core clinical tabs', () => {
        const content = fs.readFileSync(SCORE_HUB_PATH, 'utf8');

        assert.ok(content.includes('tab-btn-aws'), 'AWS tab button missing');
        assert.ok(content.includes('tab-btn-sepsis'), 'Sepsis tab button missing');
        assert.ok(content.includes('tab-btn-abcd2'), 'ABCD2 tab button missing');
        assert.ok(content.includes('tab-btn-heart'), 'HEART tab button missing');
        assert.ok(content.includes('tab-btn-grace'), 'GRACE tab button missing');
        assert.ok(content.includes('tab-btn-pe'), 'PE tab button missing');
    });

    test('score-hub.html includes Lorazepam in AWS protocol guidance', () => {
        const content = fs.readFileSync(SCORE_HUB_PATH, 'utf8');
        assert.ok(content.includes('Lorazepam'), 'Lorazepam missing from AWS protocol text');
        assert.ok(content.includes('Diazepam'), 'Diazepam missing from AWS protocol text');
    });

    test('score-hub.html includes Sepsis Early Warning Scores & Initial Antibiotics by Source', () => {
        const content = fs.readFileSync(SCORE_HUB_PATH, 'utf8');
        assert.ok(!content.includes('qSOFA'), 'qSOFA should be removed per SSC 2026 guidelines');
        assert.ok(content.includes('SIRS'), 'SIRS missing');
        assert.ok(content.includes('NEWS2'), 'NEWS2 missing');
        assert.ok(content.includes('MEWS'), 'MEWS missing');
        assert.ok(content.includes('calcMEWS'), 'calcMEWS function missing');
        assert.ok(content.includes('sepsis-source-select'), 'Initial Empiric Antibiotic source selector missing');
        assert.ok(content.includes('Ceftriaxone'), 'Ceftriaxone empiric antibiotic missing');
        assert.ok(content.includes('Cefepime'), 'Cefepime antibiotic missing');
        assert.ok(content.includes('Meropenem'), 'Meropenem antibiotic missing');
    });

    test('score-hub.html includes HEART Score elements', () => {
        const content = fs.readFileSync(SCORE_HUB_PATH, 'utf8');
        assert.ok(content.includes('heart-history'), 'H - History input missing');
        assert.ok(content.includes('heart-ecg'), 'E - ECG input missing');
        assert.ok(content.includes('heart-age'), 'A - Age input missing');
        assert.ok(content.includes('heart-risk'), 'R - Risk factors input missing');
        assert.ok(content.includes('heart-trop'), 'T - Troponin input missing');
        assert.ok(content.includes('calcHEART'), 'calcHEART function missing');
    });

    test('score-hub.html integrates pure GRACE score using CLINICAL_ENGINE', () => {
        const content = fs.readFileSync(SCORE_HUB_PATH, 'utf8');
        assert.ok(content.includes('CLINICAL_ENGINE.calcGRACE'), 'CLINICAL_ENGINE.calcGRACE call missing');
        assert.ok(content.includes('grace-killip'), 'Killip selector missing');
    });

    test('score-hub.html includes PE Risk tools (Wells, Geneva, PERC)', () => {
        const content = fs.readFileSync(SCORE_HUB_PATH, 'utf8');
        assert.ok(content.includes('calcWells'), 'Wells calculator missing');
        assert.ok(content.includes('calcGeneva'), 'Geneva calculator missing');
        assert.ok(content.includes('calcPERC'), 'PERC calculator missing');
    });

    test('score-hub.html clinical calculations and label correctness', () => {
        const content = fs.readFileSync(SCORE_HUB_PATH, 'utf8');

        // 1. PERC Rule label correctness (8/8 met = PERC Negative / Ruled Out, < 8 = PERC Positive)
        assert.ok(content.includes('PERC Negative (8/8 met — PE Ruled Out)'), 'PERC 8/8 met label should be PERC Negative (Ruled Out)');
        assert.ok(content.includes('PERC Positive (Rule-out failed)'), 'PERC < 8 label should be PERC Positive');

        // 2. Revised Geneva cutoff correctness (score >= 4 is Intermediate, score <= 3 is Low Risk)
        assert.ok(content.includes('score >= 4'), 'Geneva Intermediate risk cutoff must be score >= 4');
        assert.ok(content.includes('Geneva 0-3 (Low Risk)'), 'Geneva Low Risk label must specify 0-3');

        // 3. GRACE Score static placeholder matches initial form calculation (122 / Intermediate Risk)
        assert.ok(content.includes('id="grace-score-val">122</div>'), 'GRACE static score placeholder should be 122');
        assert.ok(content.includes('Intermediate Risk (109-140)'), 'GRACE static risk badge should be Intermediate Risk (109-140)');

        // 4. Sepsis tab default sub-tab is NEWS2 (SSC 2026 primary screen)
        assert.ok(content.includes('id="sub-btn-news2" onclick="switchSepsisSub(\'news2\')"'), 'NEWS2 sub-tab button missing or misconfigured');
        assert.ok(content.includes('NEWS2 Score (SSC 2026 Primary Screen)'), 'NEWS2 button label missing SSC 2026 primary screen designation');

        // 5. Wells PE criteria displays 3-tier classification
        assert.ok(content.includes('3-Tier: High Risk'), 'Wells 3-tier High Risk classification missing');
        assert.ok(content.includes('3-Tier: Moderate Risk'), 'Wells 3-tier Moderate Risk classification missing');
        assert.ok(content.includes('3-Tier: Low Risk'), 'Wells 3-tier Low Risk classification missing');

        // 6. Design system token alignment (uses signal-orange instead of blue #49628d)
        assert.ok(!content.includes('#49628d'), 'Hardcoded blue accent #49628d must be replaced with design token var(--signal-orange)');
        assert.ok(content.includes('var(--signal-orange, #d84315)'), 'Braun analogue signal-orange design token missing');

        // 7. MEWS calculation function definition & Revised Geneva DVT/PE +3 weight
        assert.ok(content.includes('function calcMEWS()'), 'calcMEWS function definition missing in JS');
        assert.ok(content.includes('Previous DVT or PE (+3)'), 'Geneva DVT/PE HTML label should specify (+3)');
        assert.ok(content.includes("if (document.getElementById('geneva-prev').checked) score += 3;"), 'Geneva DVT/PE JS calculation must add 3 points');
    });

    test('index.html links to tools/score-hub.html as prototype item T5', () => {
        const content = fs.readFileSync(INDEX_PATH, 'utf8');
        assert.ok(content.includes('href="tools/score-hub.html"'), 'Link to tools/score-hub.html missing in index.html');
        assert.ok(content.includes('Clinical Score & Risk Hub'), 'Score Hub title missing in index.html');
    });

    test('service-worker.js includes ./tools/score-hub.html in ASSETS array', () => {
        const content = fs.readFileSync(SW_PATH, 'utf8');
        assert.ok(content.includes("'./tools/score-hub.html'"), './tools/score-hub.html missing from service-worker.js ASSETS array');
    });
});
