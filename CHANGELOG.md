# Changelog

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