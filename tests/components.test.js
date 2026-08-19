const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ED_COMPONENTS } = require('../shared/components.js');

describe('ED_COMPONENTS.fmtDate', () => {
  test('formats a known date correctly (Thai locale)', () => {
    const d = new Date(2026, 0, 15); // Jan 15, 2026
    const result = ED_COMPONENTS.fmtDate(d);
    assert.ok(result.includes('15'));
    assert.ok(result.includes('2569')); // Thai year 2026 + 543 = 2569
  });

  test('returns "..." for null/undefined', () => {
    assert.equal(ED_COMPONENTS.fmtDate(null), '...');
    assert.equal(ED_COMPONENTS.fmtDate(undefined), '...');
  });
});

describe('ED_COMPONENTS.fmtTime', () => {
  test('formats a known time with Thai น. suffix', () => {
    const d = new Date(2026, 0, 15, 9, 30);
    const result = ED_COMPONENTS.fmtTime(d);
    assert.ok(result.includes('09'));
    assert.ok(result.includes('30'));
    assert.ok(result.includes('น.'));
  });

  test('returns "..." for null', () => {
    assert.equal(ED_COMPONENTS.fmtTime(null), '...');
  });
});

describe('ED_COMPONENTS.parseTitle', () => {
  test('correctly parses and truncates NSTEMI title', () => {
    const title = 'NSTEMI Standing Order — MNRH-ED Guideline: ESC 2023 NSTEMI Guidelines | Anticoag: 2025 ACC/AHA ACS | eGFR: CKD-EPI 2021 | Version 2.1.1';
    const parsed = ED_COMPONENTS.parseTitle(title);
    assert.equal(parsed.titleFull, title);
    assert.equal(parsed.titleShort, 'NSTEMI V2.1.1');
  });

  test('correctly parses and truncates rt-PA Stroke title', () => {
    const title = 'rt-PA Stroke FAST TRACK — MNRH-ED Guideline: Thai Stroke Society 2020 | Version 2.0';
    const parsed = ED_COMPONENTS.parseTitle(title);
    assert.equal(parsed.titleShort, 'rt-PA Stroke V2.0');
  });

  test('correctly parses and truncates STEMI title', () => {
    const title = 'STEMI Standing Order — MNRH-ED Guideline: Thai ACS 2020 (rev. Dec 2022) | Version 1.0';
    const parsed = ED_COMPONENTS.parseTitle(title);
    assert.equal(parsed.titleShort, 'STEMI V1.0');
  });

  test('correctly parses and truncates Massive PE title', () => {
    const title = 'Massive PE Fibrinolysis — MNRH-ED Guideline: ESC 2019 PE Guidelines (rev. Dec 2022) | Version 1.0';
    const parsed = ED_COMPONENTS.parseTitle(title);
    assert.equal(parsed.titleShort, 'Massive PE V1.0');
  });

  test('correctly parses and truncates Heparin title', () => {
    const title = 'Heparin Protocol — MNRH-ED Guideline: Siriraj Heparin Guideline (Modified) | Version 1.0';
    const parsed = ED_COMPONENTS.parseTitle(title);
    assert.equal(parsed.titleShort, 'Heparin V1.0');
  });

  test('correctly parses and truncates Antivenom title', () => {
    const title = 'Antivenom Standing Order — MNRH-ED Guideline: MNRH Antivenom Guideline | Version 1.0';
    const parsed = ED_COMPONENTS.parseTitle(title);
    assert.equal(parsed.titleShort, 'Antivenom V1.0');
  });

  test('correctly parses and truncates Sedation title', () => {
    const title = 'Post-Intubation Sedation — MNRH-ED Guideline: ER Standing Order for Sedation | Version 1.0';
    const parsed = ED_COMPONENTS.parseTitle(title);
    assert.equal(parsed.titleShort, 'Sedation V1.0');
  });

  test('correctly parses and truncates Drip Calculator title', () => {
    const title = 'IV Infusion Drip Calculator — MNRH-ED Clinical Tool | Version 1.0';
    const parsed = ED_COMPONENTS.parseTitle(title);
    assert.equal(parsed.titleShort, 'Drip Calc V1.0');
  });

  test('returns original title if no em-dash is present', () => {
    const title = 'Some Other Title';
    const parsed = ED_COMPONENTS.parseTitle(title);
    assert.equal(parsed.titleFull, title);
    assert.equal(parsed.titleShort, title);
  });
});

describe('ED_COMPONENTS.injectNavBar', () => {
  test('injects top-nav, logo, title, and nav-ver-display with online indicator and white text', () => {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="main-content"></div></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    Object.defineProperty(dom.window.navigator, 'onLine', { value: true, configurable: true });
    global.navigator = dom.window.navigator;
    global.localStorage = { getItem: () => 'v52 · 19/08/2569', setItem: () => {} };

    ED_COMPONENTS.injectNavBar('../index.html', '../docs/logo.png', 'Test Title — Detail | Version 1.0', 'Test V1.0');

    const nav = document.querySelector('nav.top-nav');
    assert.ok(nav, 'Top nav element should be injected');

    const homeLink = nav.querySelector('.nav-home');
    assert.equal(homeLink.getAttribute('href'), '../index.html');

    const verDisplay = nav.querySelector('#nav-ver-display');
    assert.ok(verDisplay, '#nav-ver-display should exist');
    assert.equal(verDisplay.style.color, 'rgb(240, 237, 229)');

    const verText = nav.querySelector('#nav-ver-text');
    assert.ok(verText, '#nav-ver-text should exist');
    assert.equal(verText.textContent, 'v52 · 19/08/2569');

    const statusDot = nav.querySelector('#online-status');
    assert.ok(statusDot, '#online-status should exist');
    assert.equal(statusDot.style.backgroundColor, 'rgb(39, 174, 96)'); // #27ae60
  });
});