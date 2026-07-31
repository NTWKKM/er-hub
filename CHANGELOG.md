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