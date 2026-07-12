# Architecture

ER Standing Order Hub — MNRH Emergency Department clinical standing order system.
100% client-side static site. No backend, no build step, no PHI stored.

## Core Components

### Standing Order Pages (`orders/*.html`)

Seven specialized clinical worksheets, each a self-contained HTML file with inline `<script>` logic:

| File | Clinical role |
| --- | --- |
| `rtpa.html` | rt-PA Stroke FAST TRACK — thrombolytic dosing for acute ischemic stroke |
| `stemi.html` | STEMI Standing Order — TNK/ASA/clopidogrel, age-75 boundary |
| `nstemi.html` | NSTEMI + GRACE Score + anticoagulant dosing (CKD-EPI 2021 eGFR) |
| `pe.html` | Massive PE Fibrinolysis — SK contraindication hard-stop |
| `heparin.html` | Heparin Protocol + aPTT Titration |
| `antivenom.html` | Antivenom Standing Order — hematotoxin/neurotoxin snake categories |
| `sedation.html` | Post-Intubation Sedation |

All 7 use `ED_PRINT_BOOTSTRAP` for page lifecycle and `ED_VALIDATE` for non-blocking validation.
5 pages (stemi, pe, heparin, antivenom, sedation) open source PDFs from `docs/` for blank printing.
2 pages (rtpa, nstemi) render blank HTML templates via `ED_BLANK_PRINT`.
rtpa and nstemi use a floating print action bar as the sole print trigger (no `#print-btn`).
rtpa toolbar includes a "NIHSS เปล่า" button that opens `tools/nihss.html?print-blank-direct=true` in a popup window for instant blank NIHSS printing.

### ER NOTE Tool (`tools/er-note/`)

Seven standalone clinical note worksheets + portal hub, completely decoupled from the standing-order codebase:

| File | Clinical role |
| --- | --- |
| `index.html` | ER NOTE portal hub — lists 7 templates in clinical order |
| `general-er-note.html` | General ER note |
| `sepsis.html` | Sepsis — vital signs + screening scores first, then source infection; vital→score auto-link; float risk box |
| `trauma.html` | Trauma — GCS scoring |
| `mammalian-bite.html` | Mammalian bite — button-group selections, endemic rabies PEP logic, SVG wound illustrations |
| `chest-pain.html` | Chest pain — HEART score |
| `abdominal-pain.html` | Abdominal pain — Alvarado score |
| `eye-injury.html` | Eye injury |

Each file is self-contained: no dependency on `shared/components.js`, `shared/form-validate.js`, or `shared/base.css`.
Shared style/behavior provided by local `er-note.css` and `er-note.js`.
Features: tab-style cross-template navigation, multi-patient draft persistence (localStorage schema v2 registry),
patient strip with HN, floating sidebar draft manager (FAB + slide-in panel),
Investigation/Treatment/Narrative checkbox modules (rendered by `ErNote.renderNarrative`),
Thai-base history labels,
plain-text note generation to clipboard, print via `window.print()` with `@media print` hiding nav/action bars/patient-strip/sidebar,
built-in clinical calculators (NEWS2, SIRS, HEART, Alvarado, GCS, RIG dose),
vital→score auto-linking (sepsis), float sepsis risk status box,
endemic rabies PEP logic with button-group selections and SVG wound illustrations (mammalian-bite).

Each specialized template (sepsis, mammalian-bite) is fully standalone — its HPI/PMH/Allergies/PE
fields are rendered from `NARRATIVE_PRESETS[templateId]` by `ErNote.renderNarrative(container, templateId)`.
CC_FIELDS for sidebar display points to the narrative HPI textarea (`narr-<template>-hpi-free`).
General-er-note is not migrated to renderNarrative (uses the original inline fields as-is).
`NARRATIVE_PRESETS` in `er-note.js` defines per-template: `{ hpi, pmh, allergies, pe }` each with
`{ title, placeholder, checkboxes:[], freeText:bool, autoFocus:bool }`.

### NIHSS Score Tool (`tools/nihss.html`)

Standalone NIHSS (National Institutes of Health Stroke Scale) scoring worksheet.
Cream/paper design system, Thai + English labels, 5-column repeat-assessment table.
Toolbar: "พิมพ์ที่กรอกแล้ว" (print with data), "พิมพ์ NIHSS เปล่า" (clear → recalc → print blank instantly),
"ล้างข้อมูล" (clear with confirm).
`?print-blank-direct=true` auto-triggers `printBlank()` (clear all inputs → recalc() → window.print()) on load.
Accessed from rtpa.html toolbar via "NIHSS เปล่า" popup button, and from the portal hub (T2 Clinical Tools).
Auto-sums totals per assessment column via `recalc()` on every input event.

### Drip Calculator (`tools/drip-calculator.html`)

IV infusion drip rate calculator for 12 high-alert drugs.
Bidirectional weight input (number + slider sync, clamp on blur only),
interactive dose slider and number input coupling, real-time calculation,
safety color categories, generalized dual units display,
dynamic radio button choices for medication formulas (vertical 1-per-line layout),
clinical-indication-based guide rendering with per-drug max dose display,
inline plain text concentration display, sessionStorage weight persistence.
All input fields in English.

### Urgent Clinic Home Medication (`tools/Urgent-Clinic-Home-Medication.html`)

Standalone Home Medication Checklist (ใบสั่งยาและแผนการรักษากลับบ้าน).
Uses `er-note/er-note.css` for styling, but is completely decoupled from `er-note.js` draft/lifecycle logic.
Features:

- Self-contained local draft auto-saving to `localStorage` key `er-hub-home-med-draft` on change/input events.
- Synchronization of patient weight input with the ERIG dose weight input field.
- Custom clinical plain-text compiler copying checked prescriptions, patient weight, demographics, and immunizations to the clipboard.
- @media print support that formats inputs as dotted underlines and checks (✓) inside square boxes on A4 paper prints.
- Print blank order support that temporarily clears and restores form inputs to print a blank checklist template without losing current session data.

### Shared Engines (`shared/`)

| File | Role | Dependencies |
| --- | --- | --- |
| `base.css` | Design system, CSS custom properties, responsive layout, top-nav styling | None |
| `print.css` | A4 print constraints (`@page`, grid, font sizes, `@media print`) | None |
| `components.js` | UI component injection: sticky nav bar (`injectNavBar`), print header, sticker box, float bar. `setupCommonActions()` wires `print-btn` to `window.print()`. | None |
| `calc-engine.js` | Generic drip rate calculation engine (mL/hr) | None |
| `clinical-engine.js` | GRACE score + eGFR (CKD-EPI 2021). Sole eGFR source of truth. Case-insensitive sex normalization, `Math.round()` return, null-safe. Killip lookup uses direct string key. | None |
| `anticoag-engine.js` | Heparin standalone dosing/titration engine. Exports `calcHeparinInitialDose`, `getHeparinTitration`, `HEPARIN_STANDALONE_PROTOCOLS`. | None |
| `drug-data.js` | 12-drug catalog: concentrations, dose limits, safety ceilings, titration instructions, optional `indications` array for per-drug guide rendering. | None |
| `print-bootstrap.js` | Print/page lifecycle: `handlePrintBlankDirect()`, `handlePrintBlankDirectPdf()`, `openBlankPdf()`, `showResults()`, `clearResults()`, date/time helpers. | `components.js` |
| `blank-print-engine.js` | Declarative blank-print reset. Each page registers a manifest of reset rules (`{ id, value }` for textContent, `{ id, html }` for innerHTML, etc.). `apply()` executes all rules. Used by rtpa and nstemi only. | None |
| `form-validate.js` | Non-blocking form validation. `fail()`, `warn()`, `range()`, `min()`, `clearAll()`. Replaces `alert()` across all order pages. | `components.js` |

### Portal Hub (`index.html`)

Main entry point. Braun × Mid-Century Modern layout.
Divided into two parts: Active releases (rt-PA, NSTEMI, and tools T1 to T3 marked with ACTIVE status, displayed first directly without a header) and a "Prototype" section (containing the remaining standing orders and T4 tool marked with PROTOTYPE status, which is collapsed by default and toggleable via a tactile 3D perspective accordion header).
Uses semantic vertical ordered lists with 1px hairlines, tabular numerals, muted category styles, signal orange indicators for time-critical actions.
Registers service worker for offline PWA support with dynamic reload notification.
Redirect script validates `order` slug against allow-list.

### Service Worker (`service-worker.js`)

PWA offline cache. Network-first for navigation requests, cache-first for static assets.
`CACHE_VERSION` is `er-hub-v27` — must stay in sync with `index.html` nav-right version string.
Precaches all HTML/CSS/JS + shared engines + ER NOTE templates + drip-calculator + nihss.html + 512×512 app icon + source PDFs + Google Fonts.
Per-asset retry with exponential backoff via `fetchWithRetry()`. `Promise.allSettled()` ensures one failure doesn't block others.

### PWA Manifest (`manifest.json`)

App name, theme color (`#f4f2ec` Braun cream), background color (`#ebe7df` Braun paper),
single square 512×512 icon (`docs/icon-512x512.png`, `purpose: any maskable`).

## Data Flow

### Standing Order Pages

```text
User Form Inputs (HN, age, weight, creatinine, clinical flags)
  → UI Input Sanitizer
  → Clinical Calculator (calc-engine.js / anticoag-engine.js / clinical-engine.js)
  → Drug data lookup (drug-data.js)
  → Print Renderer (DOM → A4 via print.css → browser print driver)
```

1. **Input:** User enters patient variables and selects drug/indication options in the active worksheet.
2. **Processing:** Inputs processed by `calc-engine.js` or `anticoag-engine.js`, referencing `drug-data.js`. NSTEMI loads `clinical-engine.js` for eGFR/GRACE.
3. **Output:** Values written to print containers in DOM, converted to A4 medical order sheet via browser print driver using `print.css`.

### ER NOTE Templates

```text
User enters history, exam, investigations, scoring variables
  → Template-specific JS computes scores (HEART, Alvarado, NEWS2, GCS, RIG)
  → Results to read-only display fields (data-copy attribute)
  → Plain-text note to clipboard + print via window.print()
  → Draft auto-saves to localStorage (schema v2 registry)
```

1. **Input:** User enters clinical findings per template. Drafts auto-save to `localStorage` under `ernote-draft-{templateId}-{draftId}`, registry index at `ernote-registry` holds `{ id, template, hn, cc, updatedAt }` per draft. URL `?draft={id}` selects active draft.
2. **Processing:** Embedded template-specific JS computes scores and writes to read-only `.score-box.score-line` elements with `data-copy` attributes synced by inline `updateScores()`.
3. **Output:** Plain-text note via `navigator.clipboard` + print-friendly document via `window.print()` with `@media print` hiding navigation, action bars, patient strip, and sidebar.

## Offline Behavior

| Entity | Strategy |
| --- | --- |
| Patient form state | Client-only. Resets on navigation/tab close. No server sync. |
| Calculation engines | Pure functional. Deterministic. Loaded from local disk. |
| PWA asset cache | Service worker registered on `index.html`. Network-first for navigation, cache-first for assets. Cache version bumped on deploy. Per-asset retry on install failure. |
| ER NOTE drafts | `localStorage` persistence. Schema v2 registry. v1 keys auto-migrate. Survive browser restarts until explicit clear/delete. Never uploaded. |

## Clinical & System Warnings

- **SK Contraindication:** Prior SK within 6 months permanently blocks order generation. Must use TNK.
- **Individualized Dosing Bypass:** Heparin/Antivenom risk factors (active bleeding, platelet <50K) disable auto-calc, force attending consultation.
- **Max Dose Ceilings:** Engine caps at clinical upper limit (Fentanyl 500 mcg/hr, rt-PA 90mg/50mg) to prevent overdose.
- **Print Blank Bypass:** Both pathways (PDF open / HTML blank) bypass screen validation for emergency manual-fill.
- **Lab/IV/O2 Hygiene:** Non-drug orders always render ☐ in print. Only drug orders auto-check ☑ based on input data.
- **A4 Print Fit:** `@page { size: A4 portrait; margin: 0 }`. 5-column grid, `page-break-inside: avoid`. Nav hidden in print.
- **Hardcoded Checkbox Reset:** Non-dynamic ☑ items reset to ☐ on blank print (rtpa: 10 items, nstemi: 12 items).
- **Use-Current-Time Checkbox:** 5 pages (pe, heparin, antivenom, nstemi, rtpa) have it. Default: checked (auto-fill) on pe/heparin/antivenom/rtpa; unchecked (blank) on nstemi.
- **Hard-Stop Pattern:** Pages with contraindication gating (e.g. pe.html) must `return;` after `ED_VALIDATE.warn()` to halt execution — not just hide the print button. Enforced by `tests/order-safety-guard.test.js`.
- **Non-blocking Validation:** `ED_VALIDATE.range()`/`min()` highlight invalid fields but do NOT hard-block calculation/print — preserves clinician override in emergency workflows.

## Standing Constraints

These are invariant rules the codebase follows. They are not decisions with dates — they are the current contract.

- **No build step.** Vanilla HTML/CSS/JS. No Vite, Webpack, bundler, or transpiler. GitHub Pages compatible.
- **No npm dependencies.** Tests use `node:test` (Node built-in). Zero `node_modules`.
- **No shared component files across er-note/orders.** ER NOTE templates use local `er-note.css`/`er-note.js` only. Standing orders use `shared/` modules. The two families are decoupled.
- **Braun cream theme.** Portal/order pages use Braun palette: `#f4f2ec` background, `#ebe7df` paper, `#F0EDE5` Braun White nav text, `#1a1a1a` ink. ER NOTE uses dark glassmorphism (`#0f1115` bg, `#5E6AD2` accent).
- **Existing field `id`s preserved.** DOM IDs are the stable contract between HTML and JS. Renaming an ID requires updating all references and running `tests/id-integrity-guard.test.js`.
- **Print output is plain text.** Print renders black-on-white A4. No color, no shadows, no screen-only UI. `@media print` hides nav, float bar, forms, sidebar.
- **`CACHE_VERSION` sync.** `service-worker.js` `CACHE_VERSION` must match `index.html` nav-right version string. Bump both together on deploy.
- **SW precache must include all pages.** Every HTML page + every shared JS/CSS + ER NOTE templates + drip-calculator + nihss.html must be in the `ASSETS` array. Offline-first is a stated goal.
- **No `alert()` calls in `orders/*.html`.** Use `ED_VALIDATE` non-blocking validation instead. (Out of scope: `tools/er-note/` and `tools/nihss.html` are decoupled from `ED_VALIDATE` per the Asset Isolation Rule and legitimately use native `alert()`/`confirm()` for copy-failure and destructive-clear confirmations.)
- **No `@media print` or `#print-area` changes** without a specific bug fix requiring it.
- **Tests are dev-only.** `tests/` never ship to the browser and don't affect the no-build-step constraint.