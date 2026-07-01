# MNRH-ED Standing Order Hub

Emergency Department clinical standing order system for **Maharat Nakhon Ratchasima Hospital** (โรงพยาบาลมหาราชนครราชสีมา). 100% client-side static site — no backend, no build step, no PHI stored.

## Architecture

**Static multi-page site** (vanilla HTML/CSS/JS, no framework, no bundler):

```
index.html                  ← Portal hub (3-column card grid, 8 modules, SW registration)
├── orders/
│   ├── rtpa.html           ← rt-PA Stroke FAST TRACK
│   ├── stemi.html          ← STEMI Standing Order
│   ├── nstemi.html         ← NSTEMI + GRACE Score + Anticoag
│   ├── pe.html             ← Massive PE Fibrinolysis
│   ├── heparin.html        ← Heparin Protocol + aPTT Titration
│   ├── antivenom.html      ← Antivenom Standing Order
│   └── sedation.html       ← Post-Intubation Sedation
├── tools/
│   └── drip-calculator.html ← IV Infusion Drip Calculator (12 HAD drugs)
├── shared/
│   ├── base.css            ← Design system, variables, responsive layout
│   ├── print.css           ← A4 print constraints (@page, grid, font sizes)
│   ├── components.js       ← UI component injection (sticky nav + logo, print header, sticker box, float bar)
│   ├── calc-engine.js      ← Drip rate calculation engine
│   ├── anticoag-engine.js  ← Heparin/LMWH dose logic
│   ├── drug-data.js        ← 12-drug catalog (concentrations, dose limits, safety warnings)
│   ├── print-bootstrap.js  ← Shared page lifecycle (show/clear/print-blank-direct)
│   ├── blank-print-engine.js ← Declarative blank-print reset (ADR-10 bug class fix)
│   └── form-validate.js   ← Non-blocking validation (replaces alert())
├── tests/                  ← Unit tests (node:test, zero deps)
│   ├── calc-engine.test.js
│   ├── anticoag-engine.test.js
│   ├── drug-data.test.js
│   └── components.test.js
├── service-worker.js       ← PWA offline cache (network-first nav, cache-first assets)
├── manifest.json           ← PWA manifest (installable app)
└── favicon.svg             ← Medical cross icon (all 9 pages)
```

## Deployment

GitHub Pages at **NTWKKM/er-hub**. Push to `main` → live. No CI build needed.

## Key Design Decisions

- **ADR-01:** Vanilla stack (no Vite/Webpack) — offline-capable, GitHub Pages compatible, zero build dependencies
- **ADR-04:** Blank order printing bypasses validation for emergency manual-fill workflows
- **ADR-08:** A4 print standardization via shared `print.css` — `@page { size: A4; margin: 0 }`
- **ADR-12:** Sticky nav bar (`injectNavBar`) — auto-detects page title from `document.title`, hidden in print

See `ARCHITECTURE.md`, `DESIGN.md`, and `CONTEXT.md` for full specifications and ADR history.

## Testing

```bash
npm test
```

Runs 61 unit tests via Node's built-in `node:test` (zero dependencies). Covers `calc-engine.js` (drip rate + bolus volume), `anticoag-engine.js` (heparin dosing + titration + NSTEMI anticoag), `drug-data.js` (12-drug catalog validation), and `components.js` (date/time formatting). Tests are dev-only — they never ship to the browser and don't affect the ADR-01 no-build-step constraint.