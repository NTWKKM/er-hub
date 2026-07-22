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
        assert.ok(content.includes('qSOFA'), 'qSOFA missing');
        assert.ok(content.includes('SIRS'), 'SIRS missing');
        assert.ok(content.includes('NEWS2'), 'NEWS2 missing');
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
