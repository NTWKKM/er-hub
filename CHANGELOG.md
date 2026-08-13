## [2.5.1] — 2026-08-13

### Changed / Refactored
- **MgSO4 Calculator (`tools/mgso4-calculator.html`):**
  - Refactored page to dynamically populate all dosing protocols, infusion rates, diagnostic criteria, recurrent seizure guidance, and severe BP control steps directly from `ob-engine.js`.
  - Redesigned interface into a compact, scannable layout featuring glanceable top-level cards for Loading Dose, Maintenance IV/IM Infusions, and Toxicity Monitoring (default expanded), alongside accordion sections for Diagnostic Criteria, Recurrent Seizures, BP Control, and Lab Orders (default collapsed).
  - Optimized CSS and responsiveness for desktop displays and mobile screen reflow.
  - Added unit test suites for `BP_PROTOCOLS` and mathematical cross-validation assertions in `tests/ob-engine.test.js`.
  - Bumped PWA offline cache version to `v44` (`service-worker.js` and `index.html` synchronized).

## [2.5.0] — 2026-08-13

### Added
- **MgSO4 Calculator (`tools/mgso4-calculator.html`):**
  - Standalone clinical tool for MgSO4 dosing calculation and diagnostic reference in Pre-eclampsia, Severe Pre-eclampsia, and Eclampsia.
  - Supports dual concentration preparation & infusion rate calculations for both 50% MgSO4 (ampule) and 10% MgSO4 (diluted).
  - Provides dual maintenance IV infusion guides (Thai-CMU 10g/1000mL & Concentrated 20g/500mL) displaying both 1 g/hr and 2 g/hr rates, plus IM Pritchard alternative.
  - Features diagnostic criteria cards, 2g IV recurrent seizure protocol, severe-range BP control reference, and toxicity monitoring with Calcium gluconate antidote instructions.
- **OB Engine (`shared/ob-engine.js`):**
  - Pure functional calculation engine for MgSO4 loading, maintenance IV/IM, recurrent seizure, toxicity check, BP severity classification, and severe feature evaluation.
- Added 48 unit tests (`tests/ob-engine.test.js`).
- Linked as prototype tool `T7` in `index.html` and precached in `service-worker.js`.
- Bumped PWA cache version to `v43`.

## [2.4.0] — 2026-08-01

### Fixed & Aligned with Official Thailand CPG (2018 Table 3.1 & 2022 Table 5.1 / 7.1 / 9.2)
- **TB Weight-Based Dosing Calculator (`tools/tb-calculator.html`):**
  - **Adult First-Line Regimen Weight Bands:** Fixed weight band tablet & single-drug mapping to strictly match official Thailand CPG 2018 Table 3.1 & CPG 2022 Table 5.1:
    * `< 35 kg`: Individualized per-kg single-drug calculation (H 5, R 10, Z 25, E 15 mg/kg).
    * `35 – 49 kg`: H 300 mg, R 450 mg, Z 1,000 mg, E 800 mg (≈ 3 tabs 4-FDC).
    * `50 – 69 kg`: H 300 mg, R 600 mg, Z 1,500 mg, E 1,000 mg (≈ 4 tabs 4-FDC).
    * `> 70 kg`: Individualized per-kg single-drug calculation (Ref H 300 / R 600 / Z 2,000 / E 1,200 mg).
  - **Pediatric Levofloxacin Max Cap:** Corrected H-monoresistance pediatric Levofloxacin max cap to `1,500 mg/day` (15-20 mg/kg, max 1.5 g) per CPG 2022 Table 7.1.
  - **TPT 3HP Pediatric Age Branch:** Added explicit age condition (`age <= 14`) for 3HP regimen so pediatric patients > 30 kg correctly receive `H 700 mg + Rpt 750 mg` (CPG 2022 Table 9.2) rather than adult fixed `900 mg / 900 mg`.
  - **Landmark Weight Presets:** Updated preset weight buttons to official Thai CPG landmarks: `25 kg (คำนวณรายบุคคล)`, `35 kg (35–49 kg)`, `50 kg (50–69 kg)`, and `71 kg (> 70 kg)`.

## [2.3.0] — 2026-07-31

### Changed / Refactored
- **TB Weight-Based Dosing Calculator (`tools/tb-calculator.html`):**
  - Redesigned visual layout adhering to Braun Analogue precision aesthetics, replacing emoji headers with clean typography and clinical micro-badges (`CPG 2022`, `Adult / Pediatric / TPT`).
  - Integrated sticky top navigation bar (`ED_COMPONENTS.injectNavBar()`).
  - Added ergonomic weight controls with `-1` / `+1` kg steppers, range slider, and 5 landmark weight preset pills mapped directly to single-drug and FDC dosage step tiers: `25 kg (สูตรแยก mg/kg)`, `35 kg (Tier 1)`, `45 kg (Tier 2)`, `55 kg (H,R Max Cap)`, `71 kg (Max Cap ทั้งหมด)`.
  - Added explicit `Max [cap] mg` dose ceiling indicators (H 300 mg, R 600 mg, Z 2,000 mg, E 1,200 mg) to Adult and Pediatric Single Drug Breakdown tables.
  - Formatted EMR clinical note output block with one-click copy and toast notification feedback.
  - Bumped PWA offline cache version to `v39` (`service-worker.js` and `index.html` synchronized).

## [2.2.0] — 2026-07-31

### Added
- **TB Weight-Based Dosing Calculator Prototype (`tools/tb-calculator.html`):**
  - Standalone clinical tool calculating TB medication dosages based on body weight strictly to Thailand CPG 2018 & CPG 2022 guidelines.
  - Supports Adult First-Line Regimens (2HRZE/4HR), Single drug mg/kg formulas, and Adult FDC (4-FDC & 2-FDC) weight band tablet mapping.
  - Supports Pediatric First-Line Regimens (< 15 y/o), mg/kg/day dosing caps, and Child Dispersible FDCs (RHZ 75/50/150 and RH 75/50) by weight bands.
  - Supports Severe Renal Failure (CrCl < 30 mL/min / HD) post-dialysis dosing adjustments (Z and E 3x/week).
  - Supports Hepatoxicity alternative regimens (2HRE/7HR, 6-9 RZE, 2 SHE/16 HE, 18-24 HE + Lfx), AST/ALT monitoring/re-challenge rules, pregnancy Pyridoxine B6 supplementation, and H-monoresistance 6(H)RZELfx Levofloxacin dosing.
  - Supports Latent TB Preventive Treatment (TPT: 3HP, 1HP, 4R, 3HR, 6-9H) and MDR-TB Shorter All-Oral Bedaquiline regimen overview.
  - Linked as prototype item `T6` in `index.html` and registered for offline PWA caching in `service-worker.js`.

### Changed
- Bumped PWA offline cache version to `v37` (`service-worker.js` and `index.html` nav badge updated and synchronized).

## [2.1.0] — 2026-07-30

### Added
- **Epinephrine Anaphylaxis / Fixed-rate Dosing Split:**
  - Added `epinephrine-anaphylaxis` entry with fixed-rate `mcg/min` non-weight-based dosing (1–10 mcg/min range) covering anaphylaxis, severe asthma, and symptomatic bradycardia.
  - Retained `epinephrine` for Septic Shock / Cardiac Arrest weight-based `mcg/kg/min` dosing (MAP ≥ 65 mmHg target).

### Removed
- **Propofol Removal:**
  - Fully removed Propofol from `shared/drug-data.js`, `tools/drip-calculator.html`, portal listings, service worker asset list, and unit test suites.
- **Optgroup UI Cleanup:**
  - Removed `<optgroup>` wrappers in `tools/drip-calculator.html` select dropdowns for cleaner layout and cross-browser consistency.

### Changed
- Bumped PWA offline cache version to `v36` (`service-worker.js` and `index.html` nav badge updated and synchronized).

## [2.0.0] — 2026-07-16

### Added
- **Antivenom Standing Order Interactive Calculator:**
  - Migrated `orders/antivenom.html` to a fully interactive, real-time recalculating UI.
  - Implemented real-time form calculations and range validation (weight 10-200 kg, age 1-120 years).
  - Introduced live results display panel featuring computed recommended vials, infusion duration, venom type badge (`HEMATOTOXIN` / `NEUROTOXIN`), and horse serum allergy alerts.
  - Added detailed real-time `Order Summary` breakdown card.
  - Implemented dynamic A4 print layouts including auto-expanding neuro observation/lab lists, custom penicillin allergy alternatives, and custom printed tetanus immunization order cards.
  - Created `.gender-radio` layout classes in `shared/base.css` to handle responsive gender selections.
  - Integrated `shared/blank-print-engine.js` and registered the reset manifest to support high-fidelity HTML-based blank order prints (`ED_BLANK_PRINT.apply()`), removing the old static PDF pathway redirect.

### Changed
- Bumped PWA offline cache version to `v31` (updated `service-worker.js` and `index.html` nav badges, synchronized unit tests).

## [1.0.1] — 2026-07-14

### Fixed
- Prototype collapsible section: 3D tilt effect on order rows was clipped by `overflow: hidden` when expanded. Now toggles to `overflow: visible` after the expand animation completes (and back to `hidden` during collapse) so the mouse-tracking 3D perspective renders fully.

### Changed
- Bumped cache version v28 → v29.

## [1.0.0] — 2026-07-08

First production release. ER Standing Order Hub for Maharat Nakhon Ratchasima Hospital Emergency Department.

- 7 standing order pages (rt-PA, STEMI, NSTEMI, PE, Antivenom, Heparin, Sedation)
- IV drip calculator (12 high-alert drugs)
- ER NOTE tool (7 clinical note templates with draft persistence)
- PWA offline support (service worker precache with per-asset retry)
- 209 unit tests (node:test, zero dependencies)
- 100% client-side static site — no backend, no build step, no PHI stored