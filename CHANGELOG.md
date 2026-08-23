## [2.11.0] — 2026-08-23

### Interactive 3D Flip Cards for V1/V2 Protocols & Tools (ADR-28)
- **Portal Hub (`index.html`):**
  - **Consolidated Dual-Version Cards:** Merged duplicate V1 and V2 rows for rt-PA (`01`), NSTEMI (`02`), NIHSS (`T2`), and Antivenom (`06`) into unified interactive 3D flip cards (`.flip-card-container`).
  - **Default V1 State:** All flippable cards initialize in **V1 (Classic)** state on page load and refresh by default.
  - **Tactile Braun Version Switch:** Added tactile `.version-flip-btn` (`↺ V2` / `↺ V1`) providing a 520ms `rotateY(180deg)` flip animation (`cubic-bezier(0.2, 0.8, 0.2, 1)`) on click without following the card link. Clicking the card body navigates directly to the active version.
  - **Full Accessibility & Semantic HTML:** Eliminated nested interactive elements using `.order-link-cover` overlays, synchronized dynamic `aria-hidden` (`false` front / `true` back) and `aria-pressed` states across faces, and ensured focus shifting with instant non-animated switching under `@media (prefers-reduced-motion: reduce)`.
  - **Safe 3D Tilt:** Scoped mouse tilt effect to standalone cards to prevent transform conflicts with the flip animation.
- **NSTEMI V2 Worksheet (`orders/nstemi-v2.html`):**
  - **Score Breakdown Roman Numerals:** Standardized Killip Class in GRACE breakdown table to display Roman numerals (`Class I`–`Class IV`) matching the print order sheet.
- **Automated Test Coverage (`tests/`):**
  - Added `tests/index-flip-cards.test.js` validating 4 flip card containers, default V1 state, front/back URL correctness, `aria-hidden`, `aria-pressed`, and keyboard accessibility.
  - Consolidated Service Worker Google Fonts precache validation into `tests/pwa-assets.test.js`, keeping `tests/v2-worksheets.test.js` strictly focused on clinical worksheet DOM behavior (344 tests passing across 62 suites, 100% green).
- **PWA Cache (`service-worker.js`):**
  - Bumped offline cache version to `er-hub-v70` (`23/08/2569`).

## [2.10.0] — 2026-08-21

### UI Simplification, Image Pruning & Direct % TBSA State Hardening
- **Burn Management Hub (`tools/burn-manager.html`, `shared/burn-engine.js`):**
  - **UI Simplification & Cognitive Load Reduction:** Section 1 (Hero Fluid Resuscitation) is now expanded (`open`) by default for immediate emergency resuscitation calculations on page load. Cleaned inline event handlers and replaced with unified JS event delegation.
  - **Figure Pruning:** Removed redundant textbook figures ATLS Fig 9-3 (`burn-depth-atls.png`) and Fig 9-2 (`rule-of-nines-atls.png`) from Section 2, retaining only focused ATLS Fig 9-1 airway compromise photo in a compact container.
  - **Direct % TBSA & `+1% Palm` Persistence:** Fixed bug where direct numerical % TBSA and `+1% Palm` additions reverted on patient weight/age change by introducing an explicit `isDirectMode` state flag.
  - **Ghost Badge Tag Cleanup:** In Direct Entry mode, properly hides empty 1st & 3rd degree badge containers (`display: none`) to eliminate gray rectangular artifacts.
  - **EMR Note Pediatric Maintenance:** Included Holliday-Segar pediatric maintenance fluid order ($D_5LR$ with hourly infusion rate) in the copied EMR clinical note when patient weight $\le 30$ kg.
  - **Formatting Precision:** Cleaned `estimateCOClearanceTime()` string formatting to eliminate trailing whitespace.
- **Automated Test Coverage (`tests/burn-engine.test.js`):**
  - Added Suite 28 verifying default open state, Direct Entry persistence, badge display toggling, and pediatric EMR note generation (324 tests passing across 59 suites, 100% green).
- **PWA Cache (`service-worker.js`):**
  - Removed pruned burn images from static asset cache and bumped cache version to `er-hub-v66` (`21/08/2569`).

## [2.9.0] — 2026-08-21

### Major Hardening & Feature Enhancement (Burn Event Decoupling, Anatomical Presets, Toxicology & ATLS 11th Cyanide Scoring)
- **Burn Management Hub (`tools/burn-manager.html`, `shared/burn-engine.js`):**
  - **Critical Event Decoupling & Pointer Safety:** Resolved pointerdown/click collision and unpainting race condition on SVG body parts. Seamless support for both single-click toggling and mouse/touch drag-to-paint across all viewports.
  - **Direct TBSA State Synchronization:** Fixed ghosting bug when unpainting all regions to 0% TBSA so direct numerical input cleanly updates to 0.0%.
  - **Rapid Anatomical Region Presets:** Added quick one-click preset buttons (`ทั้งศีรษะ 7%`, `ลำตัวหน้า 13%`, `หลัง/ก้น 13%`, `แขนขวา 9.5%`, `แขนซ้าย 9.5%`, `ขาทั้งสองข้าง 36%`) above the body painter for lightning-fast resuscitation documentation.
  - **Dynamic $COHb$ Elimination Half-life Estimator:** Added dynamic clearance calculation across 4 oxygen delivery modalities (Room Air 21% T½ ~300m, 100% NRB Mask T½ ~60m, 100% ETT T½ ~45m, HBO 3.0 ATA T½ ~23m) estimating time required to reach safe target ($COHb < 5\%$).
  - **ATLS 11th Presumptive Cyanide Toxicity Triad Scoring:** Added interactive checklist and clinical alert badge for early empiric Hydroxocobalamin (Cyanokit) in ED based on enclosed-space fire, GCS < 10 / LOC / CPR, unexplained shock, serum lactate $\ge 8\text{--}10\text{ mmol/L}$, and $COHb > 10\%$ (ATLS 11th Chapter 9 p. 137).
  - **Clinical Engine Hardening:** Corrected shock titration min rate range to $+20\%\text{--}30\%$ (`adjustedRateMin = rate * 1.20`) per ATLS 11th p. 138–139 and guarded zero-weight pediatric maintenance dextrose requirement (`wt > 0 && wt <= 30.0`).
- **Automated Test Coverage (`tests/burn-engine.test.js`):**
  - Added 5 new test suites (Suites 23 to 27, 79 burn engine tests total, 320 total repository tests passing with 0 failures, 100% green).
- **PWA Cache (`service-worker.js`):**
  - Bumped cache version to `er-hub-v64` (`21/08/2569`).

## [2.8.0] — 2026-08-21

### Major UX & Architectural Overhaul (Burn Tool Layout Restructuring, Pediatric Body Model & Paintbrush)
- **Burn Management Hub (`tools/burn-manager.html`, `shared/burn-engine.js`):**
  - **Hero Section Layout Restructure:** Replaced 2-column grid with a full-width stacked layout. The **IV Fluid Resuscitation Schedule** is now the prominent **Hero Section** at the top with enlarged `2.2rem` rate numbers.
  - **Full-Width TBSA Summary Banner:** Compact sticky banner with dynamic severity color transitions (Minor `#0f172a`, Moderate `#78350f`, Major `#9a3412`, Critical `#7f1d1d`), direct numerical % TBSA entry, and a smooth quick-link button (`#link-to-painter`) to the body painter.
  - **Interactive Drag-to-Paint Body Painter (Moved to Bottom):** Relocated the SVG body painter to the bottom of the page with support for both click-to-paint and continuous pointer/mouse drag-to-paint across body parts.
  - **Dynamic 6-Column Lund-Browder Pediatric Model Scaling:** SVG body parts visually scale proportions according to age bracket (`model-col-0` infant to `model-col-adult`) with larger head and shorter limbs for younger patients.
  - **Live % BSA Overlays:** Added real-time text percentage overlays on all SVG anatomical regions dynamically updating with the selected age bracket.
  - **Engine Helper:** Exported `getRegionPercentages(ageColumn)` in `shared/burn-engine.js`.
- **Automated Test Coverage (`tests/burn-engine.test.js`, `tests/dead-css-guard.test.js`):**
  - Expanded test suites to 68 tests across 23 suites covering `getRegionPercentages`, pediatric model scaling, dynamic labels, and dead CSS validation (309 total tests passing across 53 suites, 100% green).
- **PWA Cache (`service-worker.js`):**
  - Bumped cache version to `er-hub-v63` (`21/08/2569`).

## [2.7.3] — 2026-08-21

### Enhanced & Hardened (Shock Resuscitation 8h & 24h Total Fluid Volume Synchronization)
- **Burn Management Hub (`tools/burn-manager.html`, `shared/burn-engine.js`):**
  - **Dynamic Shock Volume Totals:** When **ภาวะช็อก/ความดันตก (Shock)** is active, the first 8-hour target and total 24-hour projected volumes in both **Modified Brooke** and **Classic Parkland** formula cards dynamically compute and reflect the total shock fluid plan ($+\text{Bolus volume } 10\text{--}20\text{ mL/kg} + \text{Projected Infusion at } +25\%\text{ rate}$).
  - **Mini-Stat Shock Labels:** Automatically toggles mini-stat labels to *"ยอด 8 ชม. แรก (รวม Bolus)"* and *"ยอดรวม 24 ชม. (แผนกู้ชีพ)"*.
  - **Invalid Wt/TBSA Early-Return Hardening:** Ensured all calculation baseline and shock properties are completely initialized even on empty initial inputs.
- **Automated Test Coverage (`tests/burn-engine.test.js`):**
  - Added mathematical assertions for 8h and 24h shock volume totals and verified DOM label updates (304 tests passing across 51 suites, 100% green).
- **PWA Cache (`service-worker.js`):**
  - Bumped cache version to `er-hub-v62` (`21/08/2569`).

## [2.7.2] — 2026-08-20

### Enhanced & Unified (Formula Card Direct Shock-Adjusted Rate Sync & Direct Entry Persistence)
- **Burn Management Hub (`tools/burn-manager.html`, `shared/burn-engine.js`):**
  - **Single Source of Truth for Shock Rate:** When **ภาวะช็อก/ความดันตก (Shock)** is active, the primary hero rate boxes on the main formula cards (**Modified Brooke** & **Classic Parkland**) directly update to the shock-adjusted rate ($+25\%$) with alert badges (`🚨 Shock +25%`), alert red styling, and clear baseline breakdown, eliminating competing numbers.
  - **Titration Box Streamlining:** Refactored UO Titration box message to confirm that the main formula rates above have been automatically adjusted to the active shock resuscitation rate.
  - **Direct Entry Persistence:** Fixed `recalculateAll` to preserve direct % TBSA entry value when adjusting weight, elapsed hours, or shock toggles without SVG painting.
- **Automated Test Coverage (`tests/burn-engine.test.js`):**
  - Added assertions for `isHypotensive` in `calculateFluidRequirements` and verified DOM hero rate shock adjustment and badge rendering (304 tests passing across 51 suites, 100% green).
- **PWA Cache (`service-worker.js`):**
  - Bumped cache version to `er-hub-v61` (`20/08/2569`).

## [2.7.1] — 2026-08-20

### Enhanced & Hardened (Burn Hub Shock Bolus Selector, Airway Pearls & Audit Fixes)
- **Burn Management Hub (`tools/burn-manager.html`, `shared/burn-engine.js`):**
  - **Interactive Shock / Hypotension Fluid Bolus (ATLS 11th & Tintinalli):** Added real-time bolus dose selector (`10 mL/kg`, `15 mL/kg`, `20 mL/kg`) with dynamic volume computation (e.g., 1,400 mL for 70 kg at 20 mL/kg) and +20–30% ongoing infusion adjustment.
  - **Dynamic Post-8h Catch-up Schedule:** Added `isPost8h` state and dynamic schedule header labeling (*"อัตราชดเชยหลัง 8 ชม. (Remaining Catch-up Rate)"*) when patient presents $\ge 8$ hours post-burn.
  - **Strict Pediatric Maintenance Boundary (ATLS Table 9-1):** Aligned D5LR dextrose maintenance indication strictly to children $\le 30\text{ kg}$.
  - **Direct Entry ABA Referral Sync:** Fixed direct % TBSA entry to immediately sync with ABA 10% TBSA criteria and 3rd-degree burn tracking.
  - **Airway & Drug Safety Pearls:** Added clinical guidance banner for adult ETT size ($\ge 7.5\text{--}8.0\text{ mm}$) and Succinylcholine contraindication $>24\text{h}$ post-burn (Lethal Hyperkalemia risk).
  - **Lund & Browder Nomogram Breakdown Card:** Added dynamic age proportion reference under body painter.
  - **Dead CSS & Whitespace Cleanup:** Purged unreferenced CSS variables in `:root` and formatted markup.
- **Automated Test Coverage (`tests/burn-engine.test.js`):**
  - Expanded test suite to 61 tests across 20 suites covering customizable shock bolus, post-8h schedule, strict $\le 30\text{ kg}$ maintenance boundary, and interactive DOM buttons (302 total tests passing across 32 suites with 100% green pass rate).
- **PWA Cache (`service-worker.js`):**
  - Bumped cache version to `er-hub-v60` (`20/08/2569`).

## [2.7.0] — 2026-08-20

### Added & Hardened (T10 Burn Management & Resuscitation Hub — ATLS 11th / ABA 2023)
- **Burn Management Hub (`tools/burn-manager.html`, `shared/burn-engine.js`):**
  - **Lund & Browder Dynamic Nomogram:** Pure 6-age-column calculation engine across 32 anatomical sub-regions with strict sum-to-100% mathematical invariant. Real-time SVG interactive body painter + direct % TBSA input override.
  - **1st Degree Burn Exclusion:** Explicitly tracks superficial burns visually while strictly excluding them from resuscitative fluid calculations per ATLS 11th Box 9-1.
  - **Dual Resuscitation Schedules:** Side-by-side comparison of **Modified Brooke / ATLS 11th (2 mL/kg/%)** consensus recommendation vs **Classic Parkland (4 mL/kg/%)** with 8h/16h breakdown, prehospital fluid deduction, and elapsed time adjustment.
  - **Pediatric Maintenance Fluid:** Integrated Holliday-Segar (4-2-1 Rule) D5LR/D5 0.45% NaCl infusion rate for children $\le 30$ kg.
  - **EMS Prehospital Initial Rate:** Dynamic display of age-based initial crystalloid rates (125/250/500 mL/hr) per ATLS Table 8-3.
  - **Urine Output & Shock Titration:** Real-time feedback and hourly rate adjustment ($\pm 10\text{--}30\%$) based on measured UO ($0.5\text{--}1.0$ mL/kg/hr for adults, $1.0\text{--}2.0$ mL/kg/hr for pediatrics/pigmenturia) and $10\text{--}20$ mL/kg warm crystalloid bolus recommendations for hypotensive burn shock.
  - **Inhalation Injury Decision Matrix:** 11-point risk checklist (stridor, hoarseness, deep facial/perioral burns, carbonaceous sputum, circumferential neck burn, large burn $>40\%$ TBSA) providing definitive airway triage and ETT sizing guidance.
  - **Smoke Toxicology Module:**
    - **Carbon Monoxide (CO):** Half-life comparison across room air ($\sim 4\text{--}5$h), 100% $\text{O}_2$ ($40\text{--}80$ min), and HBO ($20\text{--}30$ min); severity grading; and 5-point interactive Hyperbaric Oxygen (HBO) indication evaluation ($\text{COHb} \ge 25\%$, $\ge 15\%$ pregnant, syncope, neuro deficit, cardiac ischemia, refractory acidosis).
    - **Cyanide (CN):** Weight-adjusted Hydroxocobalamin (Cyanokit) dosing ($70$ mg/kg up to $5$ g IV over 15 min), alternative Sodium Thiosulfate 25% dosing ($412.5$ mg/kg up to $12.5$ g IV), and toxicologic clinical pearls (nitrite contraindication).
  - **Circumferential Burns & ABA Referral:** Escharotomy incision reference diagrams (chest, extremities, digits) and dynamic 10-point American Burn Association (ABA 2023) transfer criteria with automated clinical state triggers.
- **Automated Test Coverage (`tests/burn-engine.test.js`):**
  - 48 automated test cases covering Lund-Browder invariants, fluid calculations, titration paths, toxicology dosing boundaries, and DOM integration (292 total tests passing across 32 test suites with zero failures).
- **PWA Cache (`service-worker.js`):**
  - Bumped cache version to `er-hub-v59` (`20/08/2569`) ensuring automatic client cache busting on deployment.

## [2.6.5] — 2026-08-19

### Enhanced & Reordered (Drip Calculator Layout & PWA Cache Bump)
- **IV Infusion Drip Calculator (`tools/drip-calculator.html`):**
  - Reordered `#verify-card` ("Verify Before Print" confirmation block) to the bottom of the calculation result container (`#result-container`), placing it below the recommendation guide and safety warnings for a cleaner clinical flow.
- **PWA Cache (`service-worker.js`, `ARCHITECTURE.md`, `DESIGN.md`):**
  - Bumped cache version to `er-hub-v52` (`19/08/2569`) ensuring automatic client cache busting on deployment.

## [2.6.4] — 2026-08-19

### Fixed & Hardened (Top Navigation Dynamic SW Version & Release Date Sync)
- **Top Navigation Version Color Alignment (`shared/base.css`, `shared/components.js`):**
  - Fixed dark/black text color bug on standing orders and tool pages by explicitly applying Braun White (`#F0EDE5`) to `.top-nav`, `.nav-right`, and `#nav-ver-display` in both `base.css` and `components.js`.
- **Dynamic Release Date Display (`service-worker.js`, `shared/components.js`, `index.html`):**
  - Added `CACHE_DATE` constant (`19/08/2569`) to `service-worker.js`.
  - Updated runtime version parser on portal (`index.html`) and worksheets (`shared/components.js`) to extract both `CACHE_VERSION` and `CACHE_DATE`, formatting the badge as `v51 · 19/08/2569`.
  - Persisted combined version and date string to `localStorage` (`er-hub-cached-version`) for cold-load offline resilience.
- **Automated Test Coverage (`tests/components.test.js`, `tests/dead-css-guard.test.js`):**
  - Added test assertions for explicit Braun White `#F0EDE5` (`rgb(240, 237, 229)`) text color and version+date display formatting.
  - Updated CSS selector dead-code guard to bypass shared `nav-right` rules (239 total tests passing across 30 suites).

## [2.6.3] — 2026-08-18

### Fixed & Hardened (Full Codebase 4-Week Audit & Resilience Improvements)
- **Antivenom Standing Order (`orders/antivenom.html`):**
  - Added optional chaining `?.value` to `horse-allergy` change listener, fixing unhandled `TypeError` when no option is selected.
- **Top Navigation Bar & Portal Status Indicator (`shared/components.js` & `index.html`):**
  - Refactored dynamic Service Worker version injection to write into dedicated `#nav-ver-text` span, preventing the `#online-status` network connectivity dot from being deleted.
- **NIHSS Scoring Tool (`tools/nihss.html`):**
  - Fixed hardcoded online GitHub Pages URL to relative path `../index.html`, ensuring 100% offline PWA compatibility.
- **RSI Checklist (`tools/rsi-checklist.html`):**
  - Fixed escaped `\\n` literals in copy note clipboard compiler to real newline breaks (`\n`).
- **Heparin Standing Order (`orders/heparin.html`):**
  - Removed duplicate `id="use-current-time"` checkbox from Column 1.
- **Sedation Standing Order (`orders/sedation.html`):**
  - Aligned `#fen-dose` input `max="3.0"` with clinical validation range.
- **Storage Resilience (`tools/er-note/er-note.js`, `tools/drip-calculator.html`, `tools/Urgent-Clinic-Home-Medication.html`):**
  - Wrapped `localStorage` and `sessionStorage` access in `try/catch` safety blocks to guarantee zero crashes in sandboxed iframes, private browsing, or opaque origins.
- **Calculation Engine Hardening (`shared/calc-engine.js`):**
  - Generalized `doseUnit.includes('/kg')` detection.
- **Automated Test Coverage (`tests/score-hub.test.js`, `tests/antivenom.test.js`):**
  - Added full test suites for Clinical Score Hub (10 calculators) and Antivenom Standing Order (238 total unit tests passing across 30 suites).
- **PWA Cache:** Bumped cache version to `er-hub-v51` in `service-worker.js`.

## [2.6.2] — 2026-08-17

### Fixed & Enhanced (Resuscitation Timer Drawer Bug Fix & Braun Theme Alignment)
- **Resuscitation Timer Drawers (`tools/resus-timer.html`):**
  - Fixed accordion drawer toggle issue where `toggleDrawer` ID string replacement produced invalid element IDs (`drug-guide-body` instead of `body-drug-guide`). Refactored to query child elements (`.drawer-body`, `.drawer-toggle-icon`) directly from the container drawer element.
  - Added accessibility attributes (`role="button"`, `tabindex="0"`, `aria-expanded="false/true"`) and keyboard navigation support (`Enter`/`Space`).
- **Braun Theme Alignment (`tools/resus-timer.html`):**
  - Overhauled theme to match `index.html` (warm cream paper background `--paper: #ebe7df`, deep charcoal ink `--ink: #1a1a1a`, graphite `--graphite: #4a4a4a`, hairline rules `--rule: #d8d4c8`, and Braun white `#F0EDE5`).
  - Redesigned main dashboard and action panels to use clean white surface cards with high-contrast emergency typography and large tabular digital LCD clocks.
  - Aligned sticky top-nav bar with the deep blue gradient (`#1e3c72` to `#2a5298`) and hospital branding.
- **PWA Cache:** Bumped cache version to `er-hub-v50` in `service-worker.js`.
- **Test Suite:** Added test assertions for theme tokens and drawer toggle accessibility in `tests/resus-timer-acls2025.test.js`.

## [2.6.1] — 2026-08-17

### Fixed & Enhanced (ACLS 2026 Resuscitation Hub & Prototype Alignment)
- **Portal Bug Fix (`index.html`):** Removed stray literal `\n` character in the tool list DOM around item T5.
- **Anaphylaxis Standing Order (`orders/anaphylaxis.html`):** Corrected Epinephrine IV drip calculation link path from `drip-calculator.html` to `../tools/drip-calculator.html`.
- **Prototype Classification:** Reclassified Anaphylaxis Standing Order (08), RSI Checklist (T8), and Resuscitation Timer (T9) under the **Prototype** collapsible section in `index.html` with `PROTOTYPE` badge status.
- **ACLS 2025/2026 Resuscitation Timer Overhaul (`tools/resus-timer.html`):**
  - Integrated **CPR Metronome 110 bpm** (within 100–120 bpm guideline range) with synthesized audio click and rhythmic visual pulse dot.
  - Enhanced **2-Minute CPR Cycle Alarm** with high-priority audio chime and visual strobe reminding the team to pause CPR (<10s), check rhythm/pulse, switch compressors, and monitor ETCO2.
  - Built dynamic **Epinephrine 3–5 min Interval Indicator** (Green 0–3m, Amber 3–5m due soon, Red flashing >5m overdue) with smart rhythm-based timing advice.
  - Added antiarrhythmic support with **Amiodarone** (300 mg → 150 mg) and **Lidocaine** (1–1.5 mg/kg → 0.5–0.75 mg/kg) tracking.
  - Added **Vector Change (AP Pads)** and **DSED** prompts for persisting/refractory VF (≥3 shocks).
  - Added **Special Resuscitation Drugs Quick-Log & Indications Guide**: detailed clinical guidance on when and how to administer Calcium Gluconate (Hyperkalemia/CCB toxicity), Sodium Bicarbonate (Acidosis/Hyperkalemia/TCA), Magnesium Sulfate (Torsades), Push-Dose Epinephrine (Peri-arrest shock), 20% Lipid Emulsion (LAST), and Naloxone (Opioids).
  - Added interactive **5 H's & 5 T's Checklist** and **Part 11 Post-ROSC Care Bundle** (SpO2 90–98%, MAP ≥ 65, 12-lead ECG, TTM 32–37.5°C ≥36h, EEG, Blood Sugar 140–180 mg/dL).
  - Implemented one-click **Copy EMR Progress Note** (standardized Thai/English format) and formatted A4 print sheet.
- **PWA Cache:** Bumped cache version to `er-hub-v49` in `service-worker.js`.
- **Test Suite:** Added `tests/resus-timer-acls2025.test.js` (total 362 tests passing across 72 test suites).

## [2.6.0] — 2026-08-17

### Added & Enhanced (ER Department Deep Audit & International Standards Aligned)
- **Anaphylaxis Standing Order (`orders/anaphylaxis.html`):**
  - Added new standing order (08 - ACTIVE) based on WAO/EAACI 2024 & ACEP 2024 guidelines.
  - Weight-based Epinephrine IM 1:1000 calculation (adult 0.3–0.5 mg, peds 0.01 mg/kg max 0.3 mg) with 3-dose repeat tracking and timestamps.
  - Second-line adjunct medication selection (IVF, H1/H2 blockers, Corticosteroids, Salbutamol) and auto-expanding Glucagon guidance for patients on Beta-blockers.
  - Standardized 5-column A4 print grid with patient sticker and hospital header.
- **RSI Checklist (`tools/rsi-checklist.html`):**
  - Added new high-risk procedure safety tool (T8 - ACTIVE).
  - Interactive SOAP-ME pre-intubation checklist and post-intubation / ventilator setting checklist.
  - Real-time weight-based dosing calculator for induction agents (Ketamine, Etomidate, Midazolam), paralytics (Succinylcholine, Rocuronium), and pre-treatment agents with safety contraindication alerts.
  - Automatic equipment sizing (ETT size/depth, blade, LMA, suction catheter) and IBW calculator.
  - One-click copy-to-clipboard for the clinical drug dosing summary.
- **Resuscitation Timer (`tools/resus-timer.html`):**
  - Added real-time cardiac arrest management timer (T9 - ACTIVE) with dark theme optimized for ER resuscitation room displays.
  - 2-minute cycle timer with visual flash and Web Audio API beep alert (880Hz square wave) with localStorage-persisted silence/mute toggle.
  - Interactive tracking for Rhythm checks (Shockable vs Non-Shockable), Defibrillation energy levels, Epinephrine (with auto q3–5m reminder), and Amiodarone (max 2 doses).
  - ROSC documentation with post-ROSC checklist and comprehensive printable code event timeline.
- **ISMP High-Alert Drug Safety & Tall-Man Lettering:**
  - Added `displayName` with ISMP Tall-Man lettering to all 12 HAD entries in `shared/drug-data.js` (e.g. `DOBUTamine`, `DOPamine`, `NORePINEPHrine`, `ePINEPHrine`, `fentaNYL`).
  - Rendered Tall-Man names across `tools/drip-calculator.html` dropdown, headings, and clinical guide cards.
  - Injected non-blocking "Verify Before Print" confirmation card in Drip Calculator showing calculation inputs, rates, concentrations, and safety ceilings.
  - Added unit test coverage in `tests/drug-data.test.js` (358 total tests passing).
- **Clinical Version Attribution Footer:**
  - Added standardized print-visible version and CPG guideline attribution footers across all 7 standing order worksheets (`orders/*.html`).
- **Accessibility & PWA Hardening (WCAG 2.2):**
  - Injected accessible "Skip to content" link into `shared/components.js` and styled in `shared/base.css`.
  - Added `@media (prefers-reduced-motion: reduce)` resets in `shared/base.css` and `index.html` (including disabling 3D card tilt).
  - Added `role="img"` and descriptive `aria-label`s to `.signal-dot` indicators in `index.html`.
  - Upgraded `manifest.json` with `id`, `categories`, and multi-size icon definitions, and added iOS PWA meta tags in `index.html`.
  - Integrated dynamic online/offline connectivity indicator dot in top navigation across `shared/components.js` and `index.html`.
- **Promotion to ACTIVE:**
  - Promoted Clinical Score & Risk Hub (`tools/score-hub.html`, T5) and TB Weight-Based Dosing Calculator (`tools/tb-calculator.html`, T6) from PROTOTYPE to ACTIVE in `index.html`.
- **Offline Cache Sync:**
  - Synchronized PWA offline cache version to `er-hub-v48` with new assets precached in `service-worker.js`.

## [2.5.4] — 2026-08-13

### Added & Enhanced (Departmental CPG Protocol Aligned)
- **OB Engine (`shared/ob-engine.js`) & MgSO4 Calculator (`tools/mgso4-calculator.html`):**
  - **Formula C Maintenance Drip:** Added Formula C (50% MgSO4 40 mL [20 g] in 5% D5W 1000 mL: 1 g/hr = 50 mL/hr, 2 g/hr = 100 mL/hr) to maintenance infusion grid.
  - **10% MgSO4 Direct IV Push Loading:** Added explicit instructions for 10% MgSO4 4–6 g (40–60 mL) slow IV push > 5 min.
  - **100 mL IV Bag Dilution Option (Tintinalli 9th):** Added 50% MgSO4 8 mL (4 g) diluted in D5W/0.9% NSS 100 mL IV bag with pump rate 216–324 mL/hr over 20–30 min as loading dose alternative.
  - **Recurrent Seizure Protocol:** Added 10% MgSO4 2–4 g (20–40 mL) slow IV push half-dose and 3rd line refractory seizure options (Diazepam 5 mg IV push, Phenytoin IV push).
- **Dynamic SW Version Sync (`shared/components.js`, `index.html`):**
  - Refactored `injectNavBar` to dynamically fetch `CACHE_VERSION` from `service-worker.js` at runtime, eliminating hardcoded version strings across all order and tool pages.
  - `index.html` top bar version badge now auto-syncs from service-worker.js with generic `'Offline'` fallback.
  - Fixed `tests/tb-calculator-ui.test.js` CACHE_VERSION assertion to use regex pattern instead of hardcoded version string.
  - Updated `ARCHITECTURE.md` `ob-engine.js` export list (8 functions + 10 constants).
  - Synchronized PWA offline cache version to `v47` across `service-worker.js`.

## [2.5.3] — 2026-08-13

### Added & Enhanced (Departmental CPG Protocol Aligned)
- **OB Engine (`shared/ob-engine.js`) & MgSO4 Calculator (`tools/mgso4-calculator.html`):**
  - **Nicardipine Antihypertensive Protocol:** Integrated Nicardipine IV Push (1–2 mL of 0.5 mg/mL q15–20m) and Continuous IV Drip (25–50 mL/hr of 0.1 mg/mL, titrate 2.5 mg/hr q15m up to max 15 mg/hr) targeting DBP 90–100 mmHg.
  - **Nicardipine Contraindications:** Documented specific contraindications (Cardiogenic shock, recent MI / acute unstable angina, severe aortic stenosis).
  - **Labour Room Nursing & Monitoring Care Orders Card:** Added explicit care guidelines card (Admit Labour Room, Absolute Bed Rest, Retain Foley's catheter, Record VS & UO q1h, DTR q2h, and departmental toxicity thresholds RR < 14, UO < 30 mL/hr, absent DTR).
  - Added unit test assertions in `tests/ob-engine.test.js` (351 tests passed).
  - Bumped PWA offline cache version to `v46` (`service-worker.js` and `index.html` synchronized).

## [2.5.2] — 2026-08-13

### Added & Enhanced (Clinical Safety Guidelines)
- **OB Engine (`shared/ob-engine.js`) & MgSO4 Calculator (`tools/mgso4-calculator.html`):**
  - **Absolute Contraindication Alert:** Added Myasthenia Gravis safety callout (MgSO4 inhibits pre-synaptic Acetylcholine release → severe respiratory muscle failure).
  - **Alternative Anticonvulsants:** Added secondary protocol guidance for MgSO4 contraindications or treatment failure: Lorazepam 2–4 mg IV (2–5 min), Diazepam 5–10 mg IV, Phenytoin/Fosphenytoin 15–20 mg/kg IV, and Levetiracetam 20–60 mg/kg IV.
  - **Renal Impairment Dosing Adjustment:** Added renal insufficiency warning (Cr > 1.1 mg/dL / oliguria): reduce Loading dose to 2 g IV bolus, check Serum Mg, and hold/reduce Maintenance infusion.
  - **Textbook Dosing Variations:** Added reference note box detailing Tintinalli 9th (4–6g over 15–30m, 2g/h), Rosen 10th (4–6g over 15–20m, 1–2g/h), and Goldfrank 11th (4g in 5m for active seizure, 1–2g/h).
  - **Antidote Options:** Added 1st line Calcium Gluconate 10% 1g IV (3–5 min) and 2nd line Calcium Chloride 10% 1g IV (5–10 min, Central line/IO only to avoid thrombophlebitis).
  - **Antihypertensive Contraindications:** Added specific warnings for Labetalol (Active asthma / Bradycardia / Heart block), Hydralazine (ACS / Reflex tachycardia), Nifedipine (Overshoot hypotension), and highlighted absolute contraindications in pregnancy (ACEi, ARBs, Nitroprusside).
  - Added unit test suite `checkMgSO4Safety & Clinical Constants` in `tests/ob-engine.test.js` (54 tests passed).
  - Bumped PWA offline cache version to `v45` (`service-worker.js` and `index.html` synchronized).

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