# Changelog

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