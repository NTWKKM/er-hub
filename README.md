# MNRH-ED Standing Order Hub

Emergency Department clinical standing order system for **Maharat Nakhon Ratchasima Hospital** (โรงพยาบาลมหาราชนครราชสีมา). 100% client-side static site — no backend, no build step, no PHI stored.

## Architecture

**Static multi-page site** (vanilla HTML/CSS/JS, no framework, no bundler):

```
index.html                       ← Portal hub (Braun × Mid-Century Modern, SW registration)
├── orders/
│   ├── rtpa.html                ← rt-PA Stroke FAST TRACK
│   ├── stemi.html               ← STEMI Standing Order
│   ├── nstemi.html              ← NSTEMI + GRACE Score + Anticoag
│   ├── pe.html                  ← Massive PE Fibrinolysis
│   ├── heparin.html             ← Heparin Protocol + aPTT Titration
│   ├── antivenom.html           ← Antivenom Standing Order
│   └── sedation.html            ← Post-Intubation Sedation
├── tools/
│   ├── drip-calculator.html     ← IV Infusion Drip Calculator (12 HAD drugs)
│   ├── nihss.html               ← NIHSS Stroke Scale Score Sheet
│   ├── Urgent-Clinic-Home-Medication.html ← Home Medication Checklist (ERIG/HRIG auto-calc)
│   ├── score-hub.html           ← Clinical Score & Risk Hub (AWS, Sepsis, ABCD2, HEART, GRACE, PE)
│   ├── tb-calculator.html       ← TB Weight-Based Dosing Calculator (Thailand CPG 2018/2022)
│   ├── mgso4-calculator.html    ← MgSO4 Dosing & Pre-eclampsia/Eclampsia Calculator
│   └── er-note/
│       ├── index.html           ← ER NOTE portal hub (7 templates)
│       ├── general-er-note.html ← General ER Note
│       ├── sepsis.html          ← Sepsis (NEWS2/SIRS/qSOFA)
│       ├── trauma.html          ← Trauma (GCS)
│       ├── mammalian-bite.html  ← Mammalian Bite (RIG dose)
│       ├── chest-pain.html      ← Chest Pain (HEART score)
│       ├── abdominal-pain.html  ← Abdominal Pain (Alvarado score)
│       ├── eye-injury.html       ← Eye Injury
│       ├── er-note.css          ← ER NOTE local styles (dark glassmorphism)
│       └── er-note.js           ← ER NOTE local behavior (drafts, clipboard, modules)
├── shared/
│   ├── base.css                 ← Design system, CSS variables, responsive layout
│   ├── print.css                ← A4 print constraints (@page, grid, font sizes)
│   ├── components.js            ← UI injection (sticky nav, print header, sticker box, float bar)
│   ├── calc-engine.js           ← Drip rate calculation engine
│   ├── clinical-engine.js       ← GRACE score + eGFR (CKD-EPI 2021)
│   ├── anticoag-engine.js       ← Heparin dosing/titration
│   ├── stroke-engine.js         ← Stroke rt-PA thrombolytic dosing engine
│   ├── stemi-engine.js          ← STEMI TNK weight-bracket dosing engine
│   ├── ob-engine.js             ← MgSO4 dosing & pre-eclampsia severity classification engine
│   ├── drug-data.js             ← 12-drug catalog (concentrations, limits, warnings)
│   ├── print-bootstrap.js       ← Print/page lifecycle (show/clear/print-blank-direct)
│   ├── blank-print-engine.js    ← Declarative blank-print reset (rtpa/nstemi)
│   └── form-validate.js         ← Non-blocking validation (replaces alert())
├── tests/                       ← Unit tests (node:test, zero deps)
│   ├── calc-engine.test.js
│   ├── anticoag-engine.test.js
│   ├── clinical-engine.test.js
│   ├── stroke-engine.test.js
│   ├── stemi-engine.test.js
│   ├── ob-engine.test.js
│   ├── drug-data.test.js
│   ├── components.test.js
│   ├── form-validate.test.js
│   ├── print-bootstrap.test.js
│   ├── blank-print-engine.test.js
│   ├── nstemi-audit-fixes.test.js
│   ├── nstemi-thresholds.test.js
│   ├── score-hub.test.js
│   ├── tb-calculator-ui.test.js
│   ├── drip-calculator-ui.test.js
│   ├── nihss-guard.test.js
│   ├── home-medication-guard.test.js
│   ├── dead-css-guard.test.js
│   ├── id-integrity-guard.test.js
│   ├── order-safety-guard.test.js
│   └── pwa-assets.test.js
├── service-worker.js            ← PWA offline cache (network-first nav, cache-first assets)
├── manifest.json                ← PWA manifest (installable app)
├── ARCHITECTURE.md              ← System architecture & standing constraints
├── CONTEXT.md                   ← Domain glossary & ubiquitous language
├── DESIGN.md                    ← Design system & UI components
└── CHANGELOG.md                 ← Version history
```

## Deployment

GitHub Pages at **NTWKKM/er-hub**. Push to `main` → live. No CI build needed.

## Key Design Rules

- **Vanilla stack** — no Vite/Webpack/bundler. Offline-capable, GitHub Pages compatible, zero build dependencies.
- **No npm dependencies** — tests use `node:test` (Node built-in).
- **ER NOTE is standalone** — uses local `er-note.css`/`er-note.js`, not `shared/` modules.
- **Braun cream theme** for orders/portal; dark glassmorphism for ER NOTE.
- **Print output is plain text** — black-on-white A4, no screen-only UI.
- **`CACHE_VERSION` sync** — `service-worker.js` must match `index.html` nav-right string.
- **No `alert()`** — use `ED_VALIDATE` non-blocking validation.

See `ARCHITECTURE.md`, `DESIGN.md`, and `CONTEXT.md` for full specifications. See `CHANGELOG.md` for version history.

## Testing

```bash
npm test
```

Runs 344 unit tests via Node's built-in `node:test` (zero dependencies). Covers `calc-engine.js` (drip rate), `anticoag-engine.js` (heparin dosing + titration), `stroke-engine.js` (rt-PA dosing), `stemi-engine.js` (TNK dosing), `ob-engine.js` (MgSO4 loading, maintenance IV/IM, recurrent seizure, toxicity check, BP severity, severe feature evaluation), `clinical-engine.js` (eGFR + GRACE score + Killip lookup + riskLevel boundaries), `drug-data.js` (12-drug catalog validation + absoluteMaxPerHour), `components.js` (date/time formatting), `form-validate.js`, `print-bootstrap.js`, `blank-print-engine.js`, and structural regression guards (dead-css, id-integrity, order-safety, PWA assets, score-hub, TB calculator UI, drip-calculator UI, NIHSS validation, home medication). Tests are dev-only — they never ship to the browser.