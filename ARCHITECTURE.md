# Architecture

ER Standing Order Hub — MNRH Emergency Department clinical standing order system.
100% client-side static site. No backend, no build step, no PHI stored.

## Core Components

### Standing Order Pages (`orders/*.html`)

Eight specialized clinical worksheets, each a self-contained HTML file with inline `<script>` logic:

| File | Clinical role |
| --- | --- |
| `rtpa.html` | rt-PA Stroke FAST TRACK — thrombolytic dosing for acute ischemic stroke |
| `stemi.html` | STEMI Standing Order — TNK/ASA/clopidogrel, age-75 boundary |
| `nstemi.html` | NSTEMI + GRACE Score + anticoagulant dosing (CKD-EPI 2021 eGFR) |
| `pe.html` | Massive PE Fibrinolysis — SK contraindication hard-stop |
| `heparin.html` | Heparin Protocol + aPTT Titration |
| `antivenom.html` | Antivenom Standing Order — hematotoxin/neurotoxin snake categories |
| `sedation.html` | Post-Intubation Sedation |
| `anaphylaxis.html` | Anaphylaxis Standing Order — Epinephrine IM weight-based, WAO/EAACI 2024 |

All 8 use `ED_PRINT_BOOTSTRAP` for page lifecycle and `ED_VALIDATE` for non-blocking validation.
All orders include print-area version/guideline attribution footer (ISMP compliance).
4 pages (stemi, pe, heparin, sedation) open source PDFs from `docs/` for blank printing.
3 pages (rtpa, nstemi, antivenom) render blank HTML templates via `ED_BLANK_PRINT`.
rtpa and nstemi use a floating print action bar as the sole print trigger (no `#print-btn`).
rtpa toolbar includes a "NIHSS เปล่า" button that opens `tools/nihss.html?print-blank-direct=true` in a popup window for instant blank NIHSS printing.

### ER NOTE Tool (`tools/er-note/`)

Seven standalone clinical note worksheets + portal hub, completely decoupled from the standing-order codebase:

| File | Clinical role |
| --- | --- |
| `index.html` | ER NOTE portal hub — lists 7 templates in clinical order |
| `general-er-note.html` | General ER note |
| `sepsis.html` | Sepsis — vital signs + screening scores first, then source infection; vital→score auto-link; float risk box |
| `trauma.html` | Trauma — GCS scoring (Eye/Verbal/Motor radio groups with auto-total) |
| `mammalian-bite.html` | Mammalian bite — button-group selections, endemic rabies PEP logic, SVG wound illustrations, float risk box |
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
built-in clinical calculators (NEWS2, SIRS, HEART, Alvarado, GCS, RIG dose, ERIG/HRIG auto-calc),
vital→score auto-linking (sepsis), float sepsis risk status box,
endemic rabies PEP logic with button-group selections and SVG wound illustrations (mammalian-bite),
float bite risk status box (mammalian-bite — rabies/tetanus/WHO category urgency).

Each specialized template (sepsis, mammalian-bite) is fully standalone — its HPI/PMH/Allergies/PE
fields are rendered from `NARRATIVE_PRESETS[templateId]` by `ErNote.renderNarrative(container, templateId)`.
CC_FIELDS for sidebar display points to the narrative HPI textarea (`narr-<template>-hpi-free`).
General-er-note is not migrated to renderNarrative (uses the original inline fields as-is).
`NARRATIVE_PRESETS` in `er-note.js` defines per-template: `{ hpi, pmh, allergies, pe }` each with
`{ title, placeholder, checkboxes:[], freeText:bool, autoFocus:bool }`.

### NIHSS Score Tool (`tools/nihss.html`)

Standalone NIHSS (National Institutes of Health Stroke Scale) scoring worksheet.
Cream/paper design system, Thai + English labels, 5-column repeat-assessment table.
Per-item max score validation via `itemMax` lookup table (blur clamps out-of-range values, allows 'X' for untestable items).
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
ISMP Tall-man lettering displayed for all drug names (e.g. DOBUTamine, NORePINEPHrine).
"Verify Before Print" confirmation card shows drug/weight/dose/rate/concentration/safety status.

### RSI Checklist (`tools/rsi-checklist.html`)

Rapid Sequence Intubation safety checklist and drug dosing calculator.
Features:
- SOAP-ME pre-intubation checklist (Suction, Oxygen, Airway, Pharmacy, Monitors/Equipment).
- Weight-based drug dosing: induction agents (Ketamine 1.5 mg/kg, Etomidate 0.3 mg/kg, Midazolam 0.1-0.3 mg/kg),
  paralytics (Succinylcholine 1.5 mg/kg, Rocuronium 1.2 mg/kg), pre-treatment (Fentanyl, Lidocaine, Atropine).
- Equipment size calculator: ETT size/depth, laryngoscope blade, LMA, suction catheter.
- Post-intubation checklist with ventilator settings and sedation order link.
- Copy-to-clipboard drug dosing summary.
- Real-time auto-calculation on weight/age input change.

### Resuscitation Timer (`tools/resus-timer.html`)

Real-time cardiac arrest management timer with ACLS protocol support.
Dark theme (high-visibility for resus rooms). Features:
- Large elapsed timer (MM:SS) with 2-minute cycle counter.
- Audio alerts via Web Audio API (880Hz square wave, 200ms) at each 2-min mark.
- Silence/mute toggle with localStorage persistence.
- Epinephrine dose logging with q3-5 min auto-reminder.
- Defibrillation tracking with energy selector (120/150/200/360J biphasic).
- Amiodarone tracking (300 mg 1st dose, 150 mg 2nd dose, max 2).
- Rhythm check prompts: Shockable (VF/pVT) / Non-Shockable (Asystole/PEA).
- ROSC documentation with post-ROSC checklist.
- Print summary: full intervention timeline with timestamps.

### TB Calculator (`tools/tb-calculator.html`)

Weight-based anti-tuberculosis medication calculator referencing Thailand CPG 2018 & 2022 guidelines.
Features:
- Braun Analogue precision design with sticky top navigation (`ED_COMPONENTS.injectNavBar()`).
- Ergonomic weight controls: number input, range slider, stepper buttons (-1/+1 kg), and landmark weight preset pills for single drugs & FDC (`25 kg (สูตรแยก mg/kg)`, `35 kg (Tier 1)`, `45 kg (Tier 2)`, `55 kg (H,R Max Cap)`, `71 kg (Max Cap ทั้งหมด)`).
- Age-dependent auto-switching between Adult (≥15 yrs) and Pediatric (<15 yrs) regimens.
- Renal (CrCl < 30 / Hemodialysis) and Liver toxicity warning callouts with dosage adjustment guidance.
- FDC highlight cards for 4-FDC & 2-FDC adult regimens and child dispersible 3-FDC/2-FDC.
- Single drug breakdown tables for Isoniazid, Rifampicin, Pyrazinamide, and Ethambutol with tablet combination suggestions.
- Latent TB infection treatment (TPT) dosage lookup (3HP, 1HP, 3HR, 4R, 6H).
- Standardized EMR clinical note compiler for one-click copy to clipboard.


### Urgent Clinic Home Medication (`tools/Urgent-Clinic-Home-Medication.html`)

Standalone Home Medication Checklist (ใบสั่งยาและแผนการรักษากลับบ้าน).
Uses `er-note/er-note.css` for styling, but is completely decoupled from `er-note.js` draft/lifecycle logic.
Features:

- Self-contained local draft auto-saving to `localStorage` key `er-hub-home-med-draft` on change/input events.
- Synchronization of patient weight input with the ERIG dose weight input field.
- Auto-calculation of ERIG dose (40 IU/kg, max 3000 IU) and HRIG dose (20 IU/kg, max 1500 IU) from patient weight input.
- Custom clinical plain-text compiler copying checked prescriptions, patient weight, demographics, and immunizations to the clipboard.
- @media print support that formats inputs as dotted underlines and checks (✓) inside square boxes on A4 paper prints.
- Print blank order support that temporarily clears and restores form inputs to print a blank checklist template without losing current session data.

### Clinical Score & Risk Hub (`tools/score-hub.html`)

Unified emergency medicine scoring and risk stratification tool. Self-contained HTML worksheet with isolated dark / monochrome-safe design system (optimized for JVC greyscale displays), sticky top navigation bar (`ED_COMPONENTS.injectNavBar()`), and tab switching interface.
Modules:
- **AWS Score (CIWA-Ar):** 10 clinical items (0-67 total) with Mild (<10), Moderate (10-19), and Severe (≥20) risk tiers, plus symptom-triggered Benzodiazepine protocol including Lorazepam (2-4 mg PO/IV) & Diazepam dosing regimens.
- **Sepsis Warning Signs & Screening:** NEWS2 (SSC 2026 Primary Screen), MEWS (0-1 Low / 2-4 Med / ≥5 High), and SIRS early warning calculators, Sepsis 1-Hour resuscitation bundle checklist, and initial empiric antibiotics selection categorized by infection source (Unknown, Pulmonary, Intra-abdominal, UTI, Skin/Soft Tissue, CNS).
- **ABCD2 Score:** TIA 2-day stroke risk calculation (0-7 total, Low/Moderate/High risk).
- **HEART Score:** ER Chest Pain MACE risk evaluation (0-10 total: Low 0-3 / Mod 4-6 / High 7-10).
- **GRACE Score:** Pure standalone interface consuming `CLINICAL_ENGINE.calcGRACE()` for NSTEMI mortality risk stratification.
- **PE Risk & Probability:** Integrated Wells' Criteria (2-tier & 3-tier), Revised Geneva Score, and PERC Rule (8 criteria rule-out for low-risk PE).

### Tuberculosis Weight-Based Dosing Calculator (`tools/tb-calculator.html`)

Standalone weight-based TB dosing calculation tool built strictly to Thailand CPG 2018 & CPG 2022 guidelines.
Features:
- **Adult Regimens (2HRZE/4HR):** Single drug mg/kg calculations (H: 4-6 mg/kg, R: 8-12 mg/kg, Z: 20-30 mg/kg, E: 15-20 mg/kg) and Adult FDC 4-FDC (HRZE 75/150/400/275) & 2-FDC (HR 150/300) tablet count mapping by weight bands (35-49kg, 50-69kg, ≥70kg).
- **Pediatric Regimens (< 15 y/o):** Single drug exact mg/kg/day dosing (H 10-15, R 10-20, Z 30-40, E 15-25) and Child Dispersible FDCs (RHZ 75/50/150 and RH 75/50) by weight bands (4-7kg, 8-11kg, 12-15kg, 16-24kg).
- **Renal Impairment Adjustments (CrCl < 30 mL/min / HD):** Maintains daily H & R; adjusts Z (20-30 mg/kg) and E (15-20 mg/kg) to 3 times per week post-hemodialysis.
- **Hepatotoxicity & Special Cases:** Alternative 2-hepatotoxic (2HRE/7HR, 6-9 RZE) and 1-hepatotoxic (2 SHE/16 HE, 18-24 HE + Lfx) regimens, AST/ALT monitoring/re-challenge protocols, pregnancy Pyridoxine (B6) supplementation rules, H-monoresistance 6(H)RZELfx regimen dosing table (R, Z, E, Lfx 750/1000mg, optional High-dose H), and non-blocking additive multi-warning stacking (`#clinical-warning`).
- **Latent TB Preventive Treatment (TPT):** 3HP (weekly H + Rifapentine x 12 doses by weight band), 1HP (daily H 300 + RPT 600 x 1 month), 4R, 3HR, 6-9H.
- **MDR-TB Regimens (CPG 2022 Tables 6.3–6.6):** Shorter All-Oral Bedaquiline-containing regimen (weight bands 30-35, 36-45, 46-55, 56-70, >70 kg for Bdq, Lfx/Mfx, Pto, Cfz, Z, High-dose H, E) and Individualized Longer Regimen (interactive WHO Group A/B/C drug selector with 4 / (3+1-2) / (2+3) selection-rule validator, Amikacin nephrotoxicity safety gating, and weight-band tablet lookup).
- **Clinical Prescription Clipboard Integration:** Copy-to-clipboard clinical prescription note compiler supporting Adult, Pediatric, TPT, Renal, H-monoresistance, and MDR-TB regimens with universal renal/liver warning appends.

### MgSO4 Dosing & Pre-eclampsia/Eclampsia Calculator (`tools/mgso4-calculator.html`)

Standalone obstetric emergency calculation tool and diagnostic reference for Pre-eclampsia, Severe Pre-eclampsia, and Eclampsia. Built with Braun Analogue precision design system (`theme-neutral`). Dynamically populated via `shared/ob-engine.js`.
Features:
- **Glanceable Primary Cards (Default Expanded):** Prominent MgSO4 4g IV loading dose banner (with 40 mL 10% syringe, 100 mL IV bag, and 10% 4-6g slow IV push options), pump rate table (80-120 mL/hr & 216-324 mL/hr), triple maintenance infusion formula guides (Thai-CMU 10g/1000mL, Concentrated 20g/500mL, and CPG 20g/1000mL) displaying 1 g/hr and 2 g/hr rates, IM Pritchard alternative, toxicity monitoring parameters (DTR, RR, UO + 1st line Calcium Gluconate & 2nd line Calcium Chloride central/IO antidotes), and Myasthenia Gravis absolute contraindication banner with alternative anticonvulsants (Lorazepam, Diazepam, Phenytoin, Levetiracetam).
- **Compact Accordions (Default Collapsed):** Accessible toggling for Diagnostic Criteria, Recurrent Seizures (2g bolus + 2nd-line Benzos & Phenytoin), Severe BP Control (Hydralazine, Labetalol, Nifedipine, Nicardipine IV Push/Drip + contraindications and ACEi/ARB pregnancy warnings), and Labour Room Care & Lab Orders checklist (Admit LR, Foley's, VS/UO q1h, DTR q2h).
- **Dual Concentration Support:** Explicit prep, volume, and pump rate calculations for both 50% MgSO4 (500 mg/mL ampule) and 10% MgSO4 (100 mg/mL diluted form).

### Shared Engines (`shared/`)

| File | Role | Dependencies |
| --- | --- | --- |
| `base.css` | Design system, CSS custom properties, responsive layout, top-nav styling | None |
| `print.css` | A4 print constraints (`@page`, grid, font sizes, `@media print`) | None |
| `components.js` | UI component injection: sticky nav bar (`injectNavBar`), print header, sticker box, float bar. `setupCommonActions()` wires `print-btn` to `window.print()`. | None |
| `calc-engine.js` | Generic drip rate calculation engine (mL/hr). Guards against null/undefined/NaN params. | None |
| `clinical-engine.js` | GRACE score + eGFR (CKD-EPI 2021). Sole eGFR source of truth. Case-insensitive sex normalization, `Math.round()` return, null-safe. Killip lookup uses direct string key. | None |
| `anticoag-engine.js` | Heparin standalone dosing/titration engine. Exports `calcHeparinInitialDose`, `getHeparinTitration`, `HEPARIN_STANDALONE_PROTOCOLS`. | None |
| `stroke-engine.js` | Stroke rt-PA thrombolytic dosing engine. Exports `calcRtpaDose` for 0.9 mg/kg and 0.6 mg/kg regimens. | None |
| `stemi-engine.js` | STEMI TNK weight-bracket dosing engine. Exports `calcTNK`. | None |
| `ob-engine.js` | MgSO4 dosing & pre-eclampsia severity classification engine. Exports functions: `calcMgSO4Loading`, `calcMgSO4MaintenanceIV`, `calcMgSO4IM`, `calcMgSO4RecurrentBolus`, `checkMgSO4Toxicity`, `checkMgSO4Safety`, `classifyBPSeverity`, `evalSevereFeatures`. Exports constants: `MAINTENANCE_FORMULAS`, `BP_PROTOCOLS`, `DIAGNOSTIC_CRITERIA`, `MGSO4_CONTRAINDICATIONS`, `ALTERNATIVE_ANTICONVULSANTS`, `CALCIUM_ANTIDOTES`, `TEXTBOOK_VARIATIONS`, `NURSING_CARE_ORDERS`, `MGSO4_CONC_50PCT`, `MGSO4_CONC_10PCT`. | None |
| `drug-data.js` | 12-drug catalog: concentrations, dose limits, safety ceilings, titration instructions, optional `indications` array for per-drug guide rendering, optional `absoluteMaxPerHour` for weight-based drugs with clinical hourly ceilings (e.g. Fentanyl 500 mcg/hr). | None |
| `print-bootstrap.js` | Print/page lifecycle: `handlePrintBlankDirect()`, `handlePrintBlankDirectPdf()`, `openBlankPdf()`, `showResults()`, `clearResults()`, date/time helpers. | `components.js` |
| `blank-print-engine.js` | Declarative blank-print reset. Each page registers a manifest of reset rules (`{ id, value }` for textContent, `{ id, html }` for innerHTML, etc.). `apply()` executes all rules. Used by rtpa and nstemi only. | None |
| `form-validate.js` | Non-blocking form validation. `fail()`, `warn()`, `range()`, `clearAll()`. Replaces `alert()` across all order pages. | `components.js` |

### Portal Hub (`index.html`)

Main entry point. Braun × Mid-Century Modern layout.
Divided into two parts: Active releases (rt-PA, NSTEMI, and tools T1 to T3 marked with ACTIVE status, displayed first directly without a header) and a "Prototype" section (containing the remaining standing orders and T4 tool marked with PROTOTYPE status, which is collapsed by default and toggleable via a tactile 3D perspective accordion header).
Uses semantic vertical ordered lists with 1px hairlines, tabular numerals, muted category styles, signal orange indicators for time-critical actions.
Each `.order-row` has a mouse-tracking 3D tilt effect (`perspective(600px)` + `rotateX/Y` + `translateZ`). The collapsible content container toggles `overflow: hidden` during the expand/collapse animation, then switches to `overflow: visible` after the transition completes so the 3D tilt on child rows is not clipped.
Registers service worker for offline PWA support with dynamic reload notification.
Redirect script validates `order` slug against allow-list.

### Service Worker (`service-worker.js`)

PWA offline cache. Network-first for navigation requests, cache-first for static assets.
`CACHE_VERSION` is `er-hub-v29` — must stay in sync with `index.html` nav-right version string.
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
- **Max Dose Ceilings:** Engine caps at clinical upper limit (Fentanyl 500 mcg/hr, rt-PA 90mg/50mg, TB single drugs: H 300mg, R 600mg, Z 2000mg, E 1200mg, pediatric LFX 1500mg) to prevent overdose.
- **TB Dose Calculator (Thailand CPG 2018/2022):** Implements official Thailand adult 4-FDC weight bands (<35kg per-kg, 35-49kg ≈3 tabs H300/R450/Z1000/E800, 50-69kg ≈4 tabs H300/R600/Z1500/E1000, >70kg per-kg ref H300/R600/Z2000/E1200), pediatric dispersible FDCs, pediatric LFX max 1500mg, and age-branched TPT 3HP (pediatric >30kg H700/Rpt750 vs adult ≥30kg H900/Rpt900).
- **Print Blank Bypass:** Both pathways (PDF open / HTML blank) bypass screen validation for emergency manual-fill.
- **Lab/IV/O2 Hygiene:** Non-drug orders always render ☐ in print. Only drug orders auto-check ☑ based on input data.
- **A4 Print Fit:** `@page { size: A4 portrait; margin: 0 }`. 5-column grid, `page-break-inside: avoid`. Nav hidden in print.
- **Hardcoded Checkbox Reset:** Non-dynamic ☑ items reset to ☐ on blank print (rtpa: 10 items, nstemi: 12 items, antivenom: 3 items).
- **Use-Current-Time Checkbox:** 5 pages (pe, heparin, antivenom, nstemi, rtpa) have it. Default: checked (auto-fill) on pe/heparin/antivenom/rtpa; unchecked (blank) on nstemi.
- **Hard-Stop Pattern:** Pages with contraindication gating (e.g. pe.html) must `return;` after `ED_VALIDATE.warn()` to halt execution — not just hide the print button. Enforced by `tests/order-safety-guard.test.js`.
- **Non-blocking Validation:** `ED_VALIDATE.range()` highlights invalid fields but does NOT hard-block calculation/print — preserves clinician override in emergency workflows.

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