# Domain Context & Glossary

## 1. Domain Glossary

| Term | Definition |
|---|---|
| **rt-PA (Alteplase)** | Recombinant tissue plasminogen activator. High-alert thrombolytic drug used for stroke and pulmonary embolism. |
| **Tenecteplase (TNK)** | Third-generation thrombolytic agent. Weight-dose bracketed; requires 50% dose reduction if age ≥ 75 in STEMI. |
| **Streptokinase (SK)** | Thrombolytic agent with absolute repeat contraindication within 6 months due to neutralizing antibody risk. |
| **GRACE Score** | Global Registry of Acute Coronary Events risk score, used to stratify NSTEMI patients into Very High, High, and Muted risk. |
| **aPTT Ratio** | Activated partial thromboplastin time ratio, used for titration of intravenous Heparin drip. |
| **Hematotoxin** | Snake venom causing systemic bleeding and coagulopathy (e.g., Green Pit Viper, Russell's Viper, Malayan Pit Viper). |
| **Neurotoxin** | Snake venom causing respiratory muscle paralysis (e.g., Cobra, King Cobra, Krait). |
| **IV Drip Rate** | Volumetric rate (mL/hr) calculated based on patient weight (kg), target dose, and drug preparation concentration. |
| **Standing Order** | Standardized medical protocols pre-approved by clinical departments to accelerate urgent treatment. |

---

## 2. Ubiquitous Language

- **Stat Dose / Bolus:** Immediate, single-push IV injection, calculated in milligrams (mg) or micrograms (mcg) and converted to volume (mL).
- **Maintenance Infusion:** Continuous IV administration regulated by infusion pumps in milliliters per hour (mL/hr).
- **Preparation Variant:** Custom dilution recipe (e.g., Fentanyl 5 mcg/mL vs 2 mcg/mL) affecting calculated mL/hr flow rates.
- **Chemotherapeutic / Fibrinolysis Gate:** Safety checklists preventing critical administration errors before drug calculation output is unlocked.

---

## 3. Architectural Decision Records (ADRs)

### ADR-18: NSTEMI Input Layout — 2-Row Reflow

- **Context:** The NSTEMI page (`orders/nstemi.html`) laid out its data-input section as a single 3-column flex row: (1) Patient Info, (2) GRACE Score Variables + Killip Class stacked together, (3) Risk Stratification. The Patient Info column was cramped and the GRACE column was overloaded (score variables + binary flags + a 4-option vertical Killip radio group all stacked).
- **Decision:** Reflowed to 2 rows. Row 1 (`.patient-section`, full width): Patient Info with fields wrapping horizontally via `.patient-fields` (`flex: 1 1 300px` per field, ASA block `1 1 300px`, H0 block `1 1 100%`). Row 2 (`.input-layout`, 3 columns): (1) GRACE Score Variables (HR/SBP/Creatinine + binary flags), (2) Killip Class (promoted to its own column — was previously stacked under GRACE), (3) Risk Stratification. All new CSS is page-local in nstemi.html's `<style>` block — shared `base.css` untouched to avoid affecting the other 7 order pages. `.input-layout` and `.input-column` classes reused as-is.
- **Rationale:** Patient Info as a full-width top row uses horizontal space efficiently (4 numeric fields + ASA + H0 wrap instead of stacking in a narrow column). Separating Killip Class into its own column balances the three-column row — GRACE variables no longer share a column with a tall radio group. Layout-only change: no clinical logic, GRACE calculation, element IDs, or print geometry touched. All 124 tests pass. Verified via browser rendering.

### ADR-20: NSTEMI v2.0 UI Overhaul — 2025 ACC/AHA Guidelines + CKD-EPI 2021 eGFR

- **Context:** NSTEMI face (v1.x) had 5 structural issues: (1) eGFR was manual input instead of derived value — should calculate from creatinine using CKD-EPI 2021 equation; (2) Patient info scattered across multiple rows, wasting vertical space; (3) Anticoagulant dosing used old ESC guidelines (Fonda first-line) instead of 2025 ACC/AHA (age ≥75 → 0.75 mg/kg enox only); (4) Troponin timing was manual HH:MM inputs, not synced to H0 auto-checkbox; (5) Cr input appeared in 2 places without two-way sync.
- **Decision:** Complete UI overhaul:
  1. **Header removal:** Deleted `.form-header` (hospital logo, page title, 2025 ACC/AHA guideline text, version info) and `<hr>` divider. NAV title remains as single source of truth.
  2. **Single-line patient info:** HN, Age, Weight(kg), Sex(M/F radio), Creatinine(mg/dL) in nowrap flexbox. Live eGFR badge (CKD-EPI 2021) displayed to the right. Removed standalone eGFR input field entirely.
  3. **CKD-EPI 2021 engine:** Added `calcEGFR_CKDEPI2021(creatinine, age, sex)` to `shared/anticoag-engine.js`. Formula: `142 × (Scr/κ)^min × (Scr/κ)^max × 0.9938^age × (1.012 if female)` where κ=0.9♂/0.7♀, min/max exponents vary by sex and Cr range. Returns `null` if inputs incomplete → `p-egfr` shows "ไม่สามารถคำนวณได้ (กรอก Creatinine, อายุ, และเลือกเพศ)".
  4. **Two-way Cr sync:** Patient info Creatinine and GRACE Variables Creatinine are two-way synced (editing either updates the other). Single source of truth for GRACE score calculation.
  5. **Troponin timing:** Changed from manual HH:MM inputs to H0 auto-current-time checkbox. H1 = H0+1h, H3 = H0+3h (auto-calculated). Troponin values (ng/L) remain manual input. Print output shows H0 actual time, H1/H3 calculated times.
  6. **Anticoagulant selection:** Replaced auto-fill with 3-bullet doctor-select in Continuation column. Options show calculated dose (based on age, weight, eGFR) as hint text, but doctor must manually select. Removed auto-highlight/auto-fill. Logic: age≥75 → Enoxaparin 0.75 mg/kg; age<75 or eGFR<30 → Enoxaparin 1 mg/kg (renal adjustment); Fondaparinux as alternative.
  7. **Version bump:** 1.2.0 → 2.0.0 (major version for significant clinical logic change).
- **Rationale:** (1) Manual eGFR input violated single-source-of-truth principle — clinicians enter measured values (creatinine), system calculates derived values (eGFR). CKD-EPI 2021 is the current gold-standard formula (replaced older MDRD/CKD-EPI 2009 in most guidelines). (2) Single-line layout reduces vertical scroll, matches ER workflow speed. (3) 2025 ACC/AHA guidelines supersede ESC 2023 for anticoagulant selection — age≥75 gets reduced enox dose, not fondaparinux. (4) H0 auto-checkbox aligns with other order pages (PE, STEMI) and reduces manual typing. (5) Two-way Cr sync prevents data inconsistency between patient info and GRACE calculation. (6) Doctor-select anticoagulant (not auto-fill) preserves clinical judgment — system suggests, clinician decides.
- **Test impact:** All 130 tests pass. Added 6 CKD-EPI verification tests (cross-validated with MDCalc calculator). Updated 8 anticoag tests to match 2025 ACC/AHA logic. No regressions.

### ADR-01: Hub-and-Spoke Migration with Vanilla Stack

- **Context:** Individual standing orders (`stroke`, `stemi`, `nstemi`) suffer from duplicate CSS classes and calculation loops.
- **Decision:** Keep the Vanilla HTML/CSS/JS stack (no compile/bundler steps) to preserve offline access and GitHub Pages compatibility. Migrate duplicate logic into a `shared/` folder structure.
- **Rationale:** A compilation build pipeline (e.g. Vite, Webpack) adds build dependencies that rot over time. Vanilla assets allow immediate hot-swaps and direct filesystem launches in ER terminals.

### ADR-02: Esmolol Unit Preservation

- **Context:** The hospital reference chart records Esmolol maintenance as `0.05–0.3 mg/kg/min`. Normal clinical literature uses `50–300 mcg/kg/min`.
- **Decision:** Preserve the label `mg/kg/min` in UI calculations to maintain 100% alignment with paper reference charts, but add a text tip indicating that `0.05–0.3 mg/kg/min` is mathematically equivalent to `50–300 mcg/kg/min`.
- **Rationale:** Matching the chart ensures clinical staff do not encounter discrepancy friction between their physical reference guides and screen inputs.

### ADR-03: Backward-Compatible Root URL

- **Context:** Overwriting `index.html` with the new ER-Hub portal might disrupt clinical staff accessing the rt-PA Stroke page directly via old links or QR codes.
- **Decision:** Use `index.html` as the ER-Hub portal with a JS redirect script that detects old query/hash parameters (`order=rtpa`, `hn=`, `weight=`) and auto-redirects to `orders/rtpa.html`. The rt-PA card remains the first card in the portal grid for discoverability.
- **Rationale:** Minimizes disruption to emergency pathways while adopting a cleaner hierarchical codebase layout. The JS redirect handles all legacy URL patterns without requiring a visible banner.

### ADR-04: Manual Input Streamlining and Blank Orders

- **Context:** Emergency Room clinical workflow requires maximum speed. Manually typing department and ward details on screen adds friction. Attending staff sometimes need to print blank order templates immediately for manual checkout.
- **Decision:** Remove `Department` and `Ward` screen input fields. Default the printed header to blank dotted lines for manual entry. Introduce a "Print Blank Order" button on all forms that bypasses validation and triggers `window.print()` with an empty order template.
- **Rationale:** Reduces on-screen data-entry overhead and provides a fallback paper workflow for high-velocity emergencies.

### ADR-05: Portal Card Simplification

- **Context:** The original portal displayed detailed Thai descriptions on each card, a yellow alert banner for rt-PA Stroke redirect, and a section title "📄 รายการ Standing Orders สำหรับผู้ป่วยฉุกเฉิน". This created visual clutter and duplicated information already conveyed by the card titles.
- **Decision:** Remove all card descriptions, the yellow alert banner, and the section title. Cards display only icon + name + print-blank button. Cards are center-aligned with reduced padding (18px 20px) and tighter grid (280px min, 16px gap).
- **Rationale:** ER staff already know what each protocol does from the name alone. Compact cards increase scan density and reduce cognitive load during high-pressure situations.

### ADR-06: Lab/IV/O2 Print Hygiene

- **Context:** Previous print output auto-checked (☑) lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders when patient data was entered. This created a clinical risk: pre-checked orders could be misinterpreted as physician-approved.
- **Decision:** All lab investigations, IV fluids, oxygen orders, monitoring instructions, and non-drug continuation orders render as unchecked (☐) in print output regardless of whether patient data has been entered. Only drug-related orders (ASA, Clopidogrel, Fentanyl, Midazolam, Heparin dosing, Antivenom dosing, Antibiotics) auto-check (☑) based on input data.
- **Rationale:** Investigations and supportive care must be explicitly ordered by the attending physician. Pre-checking them creates medico-legal risk. Drug orders that are calculated from patient data are the system's clinical output and should remain checked.

### ADR-07: Status Badge Removal and Hospital Logo

- **Context:** Portal cards displayed status badges ("ใช้งานจริง (Production)" / "อัปเดตใหม่ (New)") and the header used an emoji (🏥) as a logo. The badges added visual noise without clinical utility; the emoji lacked professional branding.
- **Decision:** Remove all status badges from portal cards. Replace the emoji with the official Maharat Nakhon Ratchasima Hospital logo (`docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png`, 52×52). Place logo and title on the same flex row. Remove the Thai subtitle line for a cleaner header.
- **Rationale:** ER staff do not need production/new labels — all protocols in the hub are production-ready. The hospital's official logo conveys clinical authority and institutional identity without relying on platform-dependent emoji rendering.

### ADR-08: A4 Print Standardization

- **Context:** Print output across the 7 order pages was inconsistent — no explicit `@page` directive, `body { display: flex }` from `base.css` broke print flow, the 5-column grid had `min-width: 900px` exceeding A4 width (210mm ≈ 794px), and font sizes varied per page.
- **Decision:** Centralize all print rules in `shared/print.css` with `@page { size: A4; margin: 0 }`. Override `body { width: 210mm; display: block !important }` in print. Results container uses `padding: 5mm` for printable margins. Set grid to `min-width: auto; width: 100%; font-size: 8pt; page-break-inside: avoid`. Unify all print font sizes (grid 8pt, headers 8pt, lists 8pt, fib boxes 8pt). Force black-on-white with `print-color-adjust: exact`. Stroke multi-page documents use `width: 195mm; margin: 0 auto; padding: 3mm 0` with `page-break-before: always`.
- **Rationale:** A single shared print stylesheet ensures all 7 order pages produce consistent, properly-sized A4 output. The `@page` directive gives the browser explicit paper dimensions. Overriding the screen flex layout prevents content from being squeezed into a centered column during print. Zero `@page` margin with `5mm` results-container padding maximizes printable area while keeping content off the paper edge.
- **Update (2026-07-01):** `@page` margin set to `0` with `results-container padding: 5mm` for full A4 area utilization. Stroke pages aligned to original rtpamnrh.vercel.app: `width: 195mm; margin: 0 auto; padding: 3mm 0` (was `width: 100%` with `!important`). Body width set to `210mm` (was `100%`). Sticker box print dimensions changed from `58mm × 35mm` to `60mm × 20mm` to match stroke page sticker size. Grid `page-break-inside` changed from `auto` to `avoid` to prevent splitting. Grid header `line-height` reduced from `1.2` to `1.1` with first-child `padding: 5px` for visual balance. Order list `margin-bottom` increased from `1px` to `3px`. Print area `line-height` reduced from `1.35` to `1.3`. Grid cell padding standardized to `3px` (was `3px 4px`). Back-navigation link hidden in print across all 7 order pages via `.top-nav` and `a[href*="index.html"]` selectors. rt-PA order grid adds `10em` spacer divs before doctor signature lines (tuned: 5em too little, 15em overflowed to 5 pages, 10em = exactly 4 pages). Portal header compacted: padding `32px→16px`, logo `88px→64px`, margin-bottom `30px→16px`, gap `18px→16px`. PDF output verified: 4 pages A4 (210×297mm) — no overflow pages, no back link, vs original's 5 pages US Letter with 2 near-empty overflow pages.

### ADR-09: Portal Redesign — Category Groups, No Emoji, No Print-Blank Buttons

- **Context:** The original portal displayed flat grid of 7 cards with emoji icons (🧠🫀🩸🫁💊🐍🌬️) and "พิมพ์ใบสั่งยาเปล่า" buttons on each card. The emoji icons relied on platform-dependent rendering and the print-blank buttons triggered a double-print race condition (BUG-01): the iframe's `contentWindow.print()` and the child page's own `window.print()` fired simultaneously, producing two print dialogs with empty content. The early-return pattern in all 7 order files prevented event listener registration, so the `.click()` call on `print-blank-btn` was a no-op.
- **Decision:** (1) Remove all emoji from portal cards. Group cards by medical category with color-coded left borders: Cardiac (#c0392b), Pulmonary (#2980b9), Neurology (#8e44ad), Anticoagulation (#16a085), Toxicology (#d35400), Procedural (#27ae60). (2) Remove print-blank buttons from all portal cards — blank printing is accessed from within each order page's own button. (3) Fix the double-print race: move `print-blank-direct` check to the END of `DOMContentLoaded` (after all listeners are registered), call `window.print()` once (no setTimeout), and remove `iframe.contentWindow.print()` from the parent. (4) Enlarge logo from 52×52 to 88×88 with drop-shadow. (5) Add Thai subtitle to portal header.
- **Rationale:** Emoji rendering varies across OS/browsers and can appear unprofessional in a clinical setting. Category groupings improve scannability for ER staff. The print-blank button removal eliminates the race condition at the source — the child page now handles its own print, and the parent only manages iframe lifecycle via `afterprint` event. The 88px logo (native res 379×262) is within safe upscaling zone.

### ADR-10: Blank Print Clinical Safety — Hardcoded Checkbox Reset

- **Context:** When printing blank orders, hardcoded ☑ items (medications like Clopidogrel, Atorvastatin, Ativan, Augmentin) remained pre-checked because the blank print handlers only reset dynamic `id`-tagged elements, missing static HTML items without IDs. A blank order printed for a new patient could arrive with medications already checked, risking the clinician countersigning without crossing them out.
- **Decision:** Tag all non-dynamic ☑ items with unique IDs in the HTML and add explicit resets in each file's blank print handler. Affected: nstemi (12 items including ISDN, Regular diet, Record V/S, Clopidogrel, Omeprazole, Atorvastatin, Senokot, Ativan), antivenom (3 antibiotics + antivenom box `chosen` class removal), sedation (Fentanyl bolus + 2 drip box `chosen` class removal), stemi (3 monitoring items). Also fix: pe.html `p-abs-status` blank dots (was hardcoded "No"), antivenom `p-obs-neuro` display:none on blank (was unconditionally shown).
- **Rationale:** Blank orders are templates for manual clinical entry. Any pre-checked medication creates medico-legal risk if the clinician doesn't notice and countersigns without crossing it out. The fix ensures all ☑ items are explicitly unchecked (☐) when printing blank, matching the paper form's blank state.

### ADR-12: Sticky Nav Bar — injectNavBar Replaces injectTopNav

- **Context:** The previous back-link (`injectTopNav`) was a plain text link `← กลับหน้าหลัก` injected into `.container` with inline styles. It was inconsistent: `tools/drip-calculator.html` had its own separate hardcoded `.back-link` (green-themed, different CSS), and 7 order files used the JS-injected version. No page title was shown in the nav.
- **Decision:** Replace `injectTopNav()` with `injectNavBar()`. The method injects a `<nav class="top-nav">` sticky bar at `document.body` firstChild (full-width). Auto-detects the page title from `document.title` (strips after `—`). "Home" text link (no icon) + title text. Blue gradient (`#1e3c72 → #2a5298`). `body` changed from `display: flex; justify-content: center` to `display: flex; flex-direction: column; align-items: center`. Nav added to `index.html` (portal) for visual unity across all 9 pages. Portal header (logo + title card) removed from `index.html` — nav bar replaces it. `drip-calculator.html` cleaned up: removed hardcoded `.back-link`, added `components.js` + `injectNavBar()`. No `print.css` changes needed.
- **Rationale:** A sticky full-width nav bar improves navigation UX in clinical settings where users scroll through long order forms. Auto-detecting the title from `document.title` (which is already maintained per-page) eliminates 8 hardcoded strings. Using existing `.top-nav` class means zero `print.css` changes. The `flex-direction: column` body change is the minimal CSS fix to stack nav above content — `index.html` overrides body display to `block` in its own inline styles, so the portal is unaffected.

### ADR-11: Portal Single-Grid Layout — Remove Section Titles, 3-Column, Stroke First

- **Context:** The portal used separate `grid-section-title` headers (CARDIAC / หัวใจ & หลอดเลือด, PULMONARY / ปอด, NEUROLOGY / ระบบประสาท, etc.) each followed by its own `portal-grid` container. This fragmented the layout into 7 separate grids with uneven row counts, wasted vertical space on repeated headers, and made the page visually noisy. The Thai subtitle "แผนกฉุกเฉิน โรงพยาบาลมหาราชนครราชสีมา" under the H1 also added redundant information already conveyed by the hospital logo.
- **Decision:** (1) Remove all 7 section title divs and their associated `.grid-section-title` / `.title-*` CSS classes. (2) Merge all 8 cards into a single `portal-grid` with fixed `grid-template-columns: repeat(3, 1fr)`. (3) Move Stroke FAST TRACK to first position (was under NEUROLOGY section, 3rd group). (4) Remove the Thai subtitle `<p>` from portal header. (5) Add tablet breakpoint: `@media (max-width: 900px) and (min-width: 600px)` → 2 columns. Mobile (<600px) retains 1 column. (6) Category identity is preserved via the existing color-coded left border classes (`cat-cardiac`, `cat-neuro`, etc.) — no section titles needed.
- **Rationale:** A single unified grid with 3 columns produces a clean, dense card wall that ER staff can scan in one glance. Stroke FAST TRACK as the first card reflects its clinical priority as the highest-acuity time-sensitive protocol. Removing section titles eliminates 7 header rows of vertical noise. The hospital logo already provides institutional identity, making the Thai subtitle redundant. Fixed 3-column layout ensures consistent card sizing without `auto-fill` fragmentation.
- **Update (2026-07-01):** Card descriptions (`<p class="card-desc">`) removed from all 8 portal cards per the original ADR-05 decision. Card title font size increased from 15px to 17px for improved visibility without the description text. ADR-05 now fully in effect.

### ADR-14: PWA Offline Support, Nav Logo, Card Simplification, ARIA Polish

- **Context:** Five open decisions from the ADR-13 audit required user input. All five were resolved:
  1. ER terminals launch HTML files directly from filesystem (`file://`) — ES modules remain blocked (CORS under `file://`), plain `<script src>` globals stay.
  2. Offline PWA access is genuinely needed (ED wifi outages during stroke workup).
  3. Hospital logo should return — small (28px) in the sticky nav bar.
  4. Card descriptions should be removed (per original ADR-05), card title size increased for visibility.
  5. `aria-label` should be added to the nav title span.
- **Decision:**
  1. **Q1 — `file://` confirmed:** ES modules (`type="module"`) remain incompatible. All shared modules stay as plain `<script src>` globals. No code change needed — documented as a confirmed invariant.
  2. **Q2 — PWA implemented:** Created `service-worker.js` (network-first for navigation, cache-first for static assets, caches all HTML/CSS/JS + Google Fonts). Created `manifest.json` (app name, theme color `#1e3c72`, favicon reference). SW registered on `index.html` only. ARCHITECTURE.md §3 PWA row updated from "not implemented" to real implementation.
  3. **Q3 — Hospital logo in nav bar:** `injectNavBar()` now accepts optional `logoSrc` parameter. Logo rendered as `<img class="nav-logo">` at 28px height in the nav bar. Only `index.html` passes the logo path (`docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png`, 379×262 native res → 41×28 displayed). Order pages and drip calculator render nav without logo (cleaner, less visual noise per page). ADR-07 now fulfilled via nav bar instead of the removed portal header.
  4. **Q4 — Card descriptions removed:** All 8 `<p class="card-desc">` elements removed from `index.html`. `.card-desc` CSS class deleted. Card title font size increased from 15px to 17px, margin removed (was `0 0 4px 0`, now `0`), line-height added (`1.3`). ADR-05 now fully in effect — its supersession note from ADR-13 is itself superseded.
  5. **Q5 — ARIA on nav title:** `injectNavBar()` now adds `aria-label="${title}"` to the `.nav-title` span. Screen readers announce both the Home link and the page title.
- **Rationale:** The `file://` workflow confirms ADR-01's constraint is still load-bearing — ES modules cannot be used. The service worker provides genuine clinical value: during a stroke workup, ED wifi dropping must not prevent access to the rt-PA protocol. The hospital logo in the nav bar restores institutional identity (ADR-07's intent) without the visual weight of the removed portal header. Removing card descriptions simplifies the portal to title-only cards, matching ADR-05's original decision and the user's preference for larger, more visible titles. The ARIA label on the title span completes the accessibility improvements started in ADR-13.

### ADR-15: Shared Behavior Extraction — print-bootstrap.js + blank-print-engine.js

- **Context:** ADR-10 documented that hardcoded-checkbox leaks on blank print had to be patched across 4 files individually because the reset logic was copy-pasted, not shared. The audit (v2, finding A1) identified ~1,308 lines of near-identical inline JS duplicated across 7 order pages, with no shared mechanism for blank-print resets or page lifecycle (show/clear/print-blank-direct).
- **Decision:** Extract shared *behavior*, not shared *markup*. Each protocol page keeps its own HTML/print layout (clinically distinct documents), but the duplicated JS plumbing moves into two new shared modules:
  1. **`shared/print-bootstrap.js` (ED_PRINT_BOOTSTRAP):** Handles the identical page lifecycle pattern across all 7 order pages: `handlePrintBlankDirect(fn)` (URL param check — replaces the 4-line `new URLSearchParams` block), `showResults()` (unhide + float bar + scroll — replaces 3 lines), `clearResults(formId, extraFn)` (form reset + hide + focus — replaces 4-6 lines), `getDateTimeHTML(useTime, date)` and `getBlankDateTimeHTML()` (date/time string generation).
  2. **`shared/blank-print-engine.js` (ED_BLANK_PRINT):** Declarative reset engine. Each order page calls `register(manifest)` with an array of reset rules, then `apply()` in the blank-print handler. Manifest entries: `{ id, value }` → textContent, `{ id, html }` → innerHTML, `{ id, className }` → class override, `{ id, style }` → style props, `{ selector, checked }` → checkbox state. The engine handles both textContent resets (dotted lines), innerHTML resets (structured ☐ content), className resets (remove `.chosen` from fib boxes), and style resets (hide/show elements).
- **Migration:** All 7 order pages migrated (sedation first as pilot, then stemi, antivenom, pe, heparin, nstemi, rtpa). Each page now has: (1) `ED_BLANK_PRINT.register([...])` at the top of DOMContentLoaded, (2) `ED_PRINT_BOOTSTRAP.showResults()` in submit handler, (3) `ED_PRINT_BOOTSTRAP.clearResults(formId, extraFn)` for clear button, (4) `ED_BLANK_PRINT.apply()` + `ED_PRINT_BOOTSTRAP.showResults()` in blank handler, (5) `ED_PRINT_BOOTSTRAP.handlePrintBlankDirect(fn)` at end. Page-specific JS reduced from 1,308 to 1,190 lines; 137 lines added in shared modules. Net +19 lines but the ADR-10 bug class is structurally eliminated — the next protocol page is a manifest array, not a copy-pasted reset block.
- **Rationale:** The ADR-10 incident proved that duplicated reset logic is not a theoretical concern — it caused real medico-legal risk (pre-checked medications on blank orders). The declarative manifest approach means: (1) a new page declares its reset rules once, (2) the engine applies them correctly every time, (3) adding a new field to a protocol is a one-line manifest entry, not a new reset statement that can be forgotten, (4) the engine is testable in isolation. This is the same principle as the existing `calc-engine.js` — extract the repeated logic, test it once, reuse everywhere.

### ADR-16: Non-Blocking Validation — form-validate.js Replaces alert()

- **Context:** All 7 order pages and the drip calculator used native `alert()` for form validation (15 total calls). In a time-critical ED workflow, `alert()` steals focus, blocks the thread, can't be styled, and forces the clinician to dismiss a modal before continuing. The existing `.field-error` CSS class was the right pattern for inline validation but was only used on 2 pages (pe, heparin, nstemi) and never for safety warnings.
- **Decision:** Created `shared/form-validate.js` (ED_VALIDATE) with: `fail(inputId, msg)` — adds `.field-error` to input + inserts `.inline-error-msg` message below the field + focuses the input; `warn(msg)` — inserts `.clinical-warning` banner below the form header for non-blocking safety alerts (SK contraindication, absolute CI, missing indications); `range(inputId, min, max, msg)` and `min(inputId, minVal, msg)` — convenience wrappers for numeric validation; `clearAll()` — resets all errors, called by clear button. Added `.inline-error-msg` and `.clinical-warning` CSS to `base.css`. Migrated all 15 `alert()` calls across 8 files (7 orders + drip calculator). Zero `alert()` calls remain.
- **Migration:** Weight validation (7 calls) → `ED_VALIDATE.fail('weight', msg)` or `ED_VALIDATE.range()`. Age validation (2 calls) → `ED_VALIDATE.min('age', 18, msg)`. eGFR validation (1 call) → `ED_VALIDATE.min('egfr', 0, msg)`. aPTT/rate validation (1 call) → `ED_VALIDATE.warn()`. Indication count (1 call) → `ED_VALIDATE.warn()`. Clinical safety HARD STOPs (3 calls: stemi SK-repeat, pe abs-CI, pe SK-repeat) → `ED_VALIDATE.warn()` — non-blocking banner that still blocks order generation via `return`.
- **Rationale:** Native `alert()` is a workflow interruption in a clinical setting — a clinician entering a weight for a stroke patient shouldn't have their focus stolen by a modal dialog. The inline `.field-error` + `.inline-error-msg` pattern keeps the clinician in the form, shows the error at the point of entry, and doesn't require a dismiss action. Clinical safety warnings (SK contraindication, absolute CI) use `.clinical-warning` banners — visible and persistent but non-blocking. The clinician can still read the warning and correct the input without dismissing a modal first.

### ADR-17: PDF Blank-Order Pathway, Nav Logo on All Pages, Antivenom Antibiotic Fix, SW Precache Update

- **Context:** Three issues identified in a post-ADR-16 audit:
  1. **F2 — Blank print never opens source PDFs:** All 7 order pages used `ED_BLANK_PRINT.apply()` + `window.print()` to generate blank templates from HTML. The original source PDFs in `docs/` were never used, even though 5 of 7 modules have corresponding PDFs with more complete formatting.
  2. **F3 — Antivenom antibiotic bug:** In `antivenom.html`, `p-augmentin` (standard) and `p-cipro-clinda` (penicillin-allergy alternative) were both hardcoded as `☑` in static HTML and both reset to `☐` on blank-print. No penicillin allergy input existed — two mutually exclusive regimens were never toggled by actual input.
  3. **F4 — SW precache list stale:** `service-worker.js` was missing `print-bootstrap.js`, `blank-print-engine.js`, `form-validate.js` (added in ADR-15/16), the logo PNG, and PDFs. Offline-first intent (ADR-14) was leaking.
- **Decision:**
  1. **PDF blank-order pathway (5/7 modules):** Added `ED_PRINT_BOOTSTRAP.openBlankPdf(path)` → `window.open(encodeURI(path), '_blank')` — opens PDF in new tab, browser native viewer handles display, user presses print manually (no cross-tab `.print()` — unstable per ADR-09). Added `handlePrintBlankDirectPdf(path)` for `?print-blank-direct=true` URL param → `window.location.href = encodeURI(path)` (redirect, not new tab — auto-trigger from external link). Removed `ED_BLANK_PRINT.register([...])` + `<script src="blank-print-engine.js">` from 5 pages (dead code per ADR-13 cleanup pattern). rtpa/nstemi keep existing blank-print (no source PDF). PE PDFs merged via `pdfunite`: `PE ใหม่.pdf` + `การผสมยา Streptokinase .pdf` + `ใบประเมินข้อห้าม...Massive PE.pdf` → `PE-Massive-merged.pdf`. Button label changed from "🖨️ ใบสั่งยาเปล่า (Blank Order)" → "🖨️ ใบสั่งยาเปล่า (PDF)".
  2. **Nav logo on all pages (reverses ADR-14 Q3):** All 8 order/tool pages now pass `logoSrc` to `injectNavBar()`. ADR-14 Q3 originally restricted logo to `index.html` only. `.nav-logo` and `.top-nav` already hidden in `@media print` — no print impact.
  3. **Antivenom antibiotic fix:** Added "ประวัติแพ้ยา Penicillin" radio (no/yes) next to existing horse-allergy input. Submit handler now toggles: penicillin allergy → `p-cipro-clinda` = ☑ selected, `p-augmentin` = ☐ not selected (with reason); no allergy → reverse. Follows the "show all, check selected" pattern already used by stemi/pe/nstemi (`fib-order-box` + `☐ ... — ไม่ได้เลือก`).
  4. **SW precache update:** Added 3 shared JS files, logo PNG, 5 PDF paths to `ASSETS` array. Bumped `CACHE_VERSION` from `er-hub-v1` to `er-hub-v2`.
- **Rationale:** Opening source PDFs gives clinicians the exact hospital-formatted document for manual printing — more faithful than HTML reconstruction. The manual-print approach (user presses print in the PDF viewer) avoids the cross-tab print race condition documented in ADR-09. The antivenom antibiotic fix closes a real clinical bug — two mutually exclusive antibiotic regimens were both checked by default with no input to distinguish them. The SW precache update ensures the PWA's offline-first promise (ADR-14) actually holds for all assets added since ADR-15.

### Phase 5 — Config-Driven Order Engine (Deferred)

- **Decision:** Phase 5 (generalizing the `drip-calculator.html` / `EMERGENCY_DRUG_DATA` config-driven pattern to the 7 order forms) is **deferred indefinitely**.
- **Rationale:** (1) Phase 2 already solved the structural problem — blank-print resets are declarative via `ED_BLANK_PRINT`, the ADR-10 bug class is eliminated. (2) Each protocol page is clinically distinct with different form layouts, multi-step workflows (GRACE → risk → anticoag → print), and protocol-specific safety gates — forcing them into a config schema adds abstraction complexity without reducing clinical code. (3) Risk/reward is wrong — a config-driven renderer is a ~500-line shared module that all pages depend on; any bug breaks all 7 protocols. The current approach (shared lifecycle + declarative manifests + page-specific clinical logic) isolates risk per page. (4) The drip calculator works fundamentally differently — one form, one calculation, one output — while order pages have multi-section forms and protocol-specific logic that doesn't generalize cleanly.

### ADR-13: Security Fix, Dead Code Removal, Test Foundation, Accessibility

- **Context:** A deep audit (v2) of the codebase at commit `55e7a7f` identified a critical XSS vulnerability, dead code/CSS, zero test coverage despite module.exports scaffolding, documentation/reality drift (PWA claim), and near-zero ARIA coverage. The emoji inconsistency noted in ADR-09 was also found to extend beyond portal cards to the floating print bar and drip calculator button.
- **Decision:**
  1. **S1 (Critical) — XSS Fix:** `injectStickerBox()` in `components.js` previously set HN (user-entered patient identifier) via `innerHTML` template interpolation, creating an XSS vector. Fixed by building the DOM structure via `innerHTML` first, then setting HN via `textContent` on the `#sticker-hn-text` element. All other patient-identifier writes already used `textContent` — this closes the last gap.
  2. **U2 — Emoji Consistency:** Removed `✅ 🖨️ 👁️` from the floating print bar (`components.js`) and `🧮` from the drip calculator button. ADR-09's rationale ("emoji rendering varies across OS/browsers, unprofessional in clinical setting") now applies consistently across all surfaces.
  3. **A5 — Dead CSS Removal:** Removed `.portal-header`, `.portal-header svg`, `.portal-header-text`, `.portal-header-text h1`, `.portal-header-text p`, `.portal-logo` rules from `index.html` inline `<style>` (unused since ADR-12 removed the portal header). Removed `--border-focus: #ccc` from `base.css` `:root` (defined but never referenced).
  4. **A6 — Dead Code Removal:** Removed `printBlankOrder()` function from `index.html`. ADR-09 eliminated all portal print-blank buttons, making this function dead code. W-09 updated to deprecated status.
  5. **A3 (Critical) — Test Foundation:** Created `package.json` and `tests/` directory with 61 unit tests covering `calc-engine.js` (`calcDripRate`, `calcBolusVolume`), `anticoag-engine.js` (`calcAnticoag`, `calcHeparinInitialDose`, `getHeparinTitration`, `HEPARIN_STANDALONE_PROTOCOLS`), `drug-data.js` (structure validation, specific drug checks, safety ceiling verification), and `components.js` (`fmtDate`, `fmtTime`). Tests use Node's built-in `node:test` — zero new dependencies, doesn't affect ADR-01's build-step constraint since tests never ship to the browser. Run via `npm test`.
  6. **A4 — PWA Documentation Drift:** ARCHITECTURE.md §3 previously claimed a "local service worker enforces version caching." No service worker, manifest, or registration exists. Corrected the documentation to reflect reality.
  7. **A8 — W-08 Count Fix:** ARCHITECTURE.md W-08 stated "4 order files" with `use-current-time` checkbox. Actually 5 files have it (pe, heparin, antivenom, nstemi, rtpa). Corrected.
  8. **U4 — Favicon:** Added `favicon.svg` (medical cross icon, red #c0392b on white) to all 9 pages. Helps clinicians identify tabs when 5+ order pages are open across shifts.
  9. **C1 — Accessibility:** Added `role="navigation"` to the sticky nav bar (via `setAttribute` in `injectNavBar()`). Added `aria-live="polite"` to dose summary banners on all 7 order pages and the stroke results container. Screen readers now announce computed doses without interrupting workflow.
- **Rationale:** The XSS fix closes a real security gap — user-entered HN could execute arbitrary HTML in the page context. The test foundation provides a safety net for future refactoring (Phase 2 shared-behavior extraction) without adding build dependencies. Dead code/CSS removal reduces maintenance surface. Documentation corrections ensure the governance docs match reality. Accessibility improvements bring the codebase closer to its stated design principles without changing visual output or print behavior. No clinical dose logic, safety ceilings, or print geometry were modified.

### ADR-26: NSTEMI v2.1.1 Audit Remediation (2026-07-04)

- **Context:** A post-merge audit of `orders/nstemi.html` (post-ADR-20 / v2.1) identified critical gaps: (1) Dead `.troponin-times` DOM block, (2) Missing blank-first cold load implementation, (3) Patient-safety contradiction where Fondaparinux was auto-selected below eGFR < 30 despite showing a red contraindication warning, and (4) The print button had no event listener.
- **Decision:**
  1. **Finding 1 (Dead DOM):** Removed `.troponin-times` block (`#screen-h0/h1/h3`) and 5 unused CSS rules.
  2. **Finding 2 (Blank-first UX):** Auto-trigger `print-blank-btn.click()` on cold load before initial rendering.
  3. **Finding 3 (Anticoag contradiction):** Sync recommendation cutoff in `shared/anticoag-engine.js` `calcAnticoag()` from `egfr >= 20` to `egfr >= 30` (matching ADR-19). Removed auto-select entirely (no checked option on calc). Added eGFR-bound `ac-disabled` state (opacity 0.45, cursor not-allowed), red `⛔ CI` badge, and green `✅ แนะนำ` badge via `updateAcHints()`. Implemented a 2-click safety override (first click enters pending status with orange outline + warning; second click checks option and sets override label).
  4. **Finding 4 (Print Order):** Added `print-btn` click event listener to run `window.print()`.
  5. **SW Cache:** Bumped `CACHE_VERSION` in `service-worker.js` to `er-hub-v11`.
- **Rationale:** Ensures alignment with ADR-19 and patient safety regarding Fondaparinux renal excretion limitations (CrCl <30 mL/min). Transitioning to manual select with clinical badges preserves physician choice while highlighting guidelines. Wire up missing print event listeners to resolve immediate UX regressions.
- **Test Impact:** 138/138 tests pass. Verified exact alignment between eGFR thresholds and on-screen messages.

### ADR-22: Homepage Design Optimization & Local CSS Scoping (2026-07-04)

- **Context:** The portal homepage (`index.html`) visually felt outdated and flat compared to modern web design standards. The user requested a visual optimization using `/modern-web-guidance` to create a premium clinical dashboard.
- **Decision:**
  1. **Visual Overhaul:** Optimized the layout with a subtle radial gradient background (`#f8fafc` to `#e2e8f0`), glassmorphic portal cards (soft blur, semi-transparent borders, premium drop shadows, `12px` border-radius), and uppercase text tags (e.g., "NEUROLOGY", "CARDIAC") corresponding to the color-coded categories. Tuned card dimensions to be more compact (padding: `16px 20px`, min-height: `80px`, grid gap: `16px`) for an ultra-sleek layout.
  2. **Interactivity & Motion:** Added hover animations including a card vertical translation (`translateY(-4px)`), a color-matched shadow glow, a vertically centered chevron arrow indicator (`→`), and a subtle radial gradient glow inside the card. Implemented a staggered load animation (`fadeInUp`) for the grid cards using CSS animation delays.
  3. **Local Styling Scope:** Scoped all visual styles locally within the `<style>` tag of `index.html` instead of modifying `shared/base.css` to prevent any regressions or layout shifts on the other 7 clinical standing order pages.
  4. **PWA Version Bump:** Bumped the service worker `CACHE_VERSION` to `er-hub-v6` to force immediate client browser updates.
  5. **Favicon Replacement:** Replaced `favicon.svg` with the hospital logo PNG (`docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png`) as the favicon across all 9 pages, updated `manifest.json` icons, and removed `favicon.svg` from the cache list.
- **Rationale:** Scoping styles locally inside `index.html` satisfies the surgical modification rule by completely isolating the homepage visual design, guaranteeing zero regression risk for the clinical order sheets. Branded category labels and interactive chevrons organize the grid without relying on sections or platform-specific emojis. Staggered animations make the interface feel responsive and modern. Using the official hospital logo as the favicon provides unified branding and consistent tab identification. Compact card sizing increases information density and usability on high-pressure ED terminals.

### ADR-23: Enoxaparin Continue Order Checkbox Options (2026-07-04)

- **Context:** Thailand clinical settings support Enoxaparin in pre-filled syringe sizes (0.4 ml [40 mg] and 0.6 ml [60 mg]). The NSTEMI continue order printed layout used manual blank lines, which required manual completion and did not guide clinical selection based on pre-packaged stock sizes.
- **Decision:**
  1. **Print Layout Update:** Replaced blank lines in continue order (`p-anticoag`) with specific checkboxes formatted over 2 lines:
     - Line 1: `☐ Enoxaparin  ☐ 0.4 ml  ☐ 0.6 ml`
     - Line 2: (Indented 5 spaces) `SC  ☐ q 12 hr  ☐ OD  × 5 Days`
  2. **Auto-Checking Dosing Logic:** Added live calculation rules in `orders/nstemi.html`:
     - If patient weight >= 50 kg (dose >= 50 mg), check the `0.6 ml` box.
     - If patient weight < 50 kg (dose < 50 mg), check the `0.4 ml` box.
     - Frequency checkboxes (`q 12 hr` vs `OD`) are checked automatically matching the selected frequency on the screen.
  3. **Refined Guidance Note:** Split the clarification note into 2 lines for readability:
     - Line 1: `(1 mg/kg = [Dose] mg — GFR < 30 → once daily)`
     - Line 2: `(0.4 ml = 40 mg, 0.6 ml = 60 mg)`
- **Rationale:** The updated layout reduces error-prone manual writing on printed forms. Formatting the checkboxes and instructions into 2 lines respectively prevents visual clutter in the narrow continuation column print space while ensuring clear stock size guide references.

---

### ADR-24: Anticoagulant Guideline Hints — Fondaparinux & Heparin (2026-07-04)

- **Context:** The NSTEMI continue order anticoagulant section lacked point-of-care contraindication reminders. Clinicians needed guideline-level alerts on the printed form per 2025 ACC/AHA and ESC NSTE-ACS recommendations.
- **Decision:**
  1. **Fondaparinux hint:** Added `(CI: CrCl <30 mL/min — ถ้าทำ PCI ต้องเสริม UFH bolus)` — covers (a) absolute renal CI and (b) catheter thrombosis risk during PCI requiring UFH bolus.
  2. **Heparin label:** Updated from `(กรณี GFR < 15)` to `(eGFR <15 หรือ CrCl <30 mL/min)` for precision with LMWH crossover thresholds.
  3. **Enoxaparin Line 1:** Removed redundant `SC` from `☐ Enoxaparin SC` → `☐ Enoxaparin` ("SC" already present on Line 2).
  4. Applied to both `getSelectedAnticoagPrintHTML()` (dynamic) and `p-anticoag` blank template.
- **Evidence Base:** 2025 ACC/AHA NSTE-ACS Guidelines; ESC 2023 NSTE-ACS Guidelines (CrCl <30 absolute CI; UFH bolus at PCI for Fondaparinux-treated patients).
- **Rationale:** On-sheet CI reminders prevent prescribing errors at the point of care without external reference lookup during high-acuity resuscitation.

---

### ADR-25: Real-time GRACE Calculation & Always-Visible Print Preview (2026-07-04)

- **Context:** The NSTEMI form previously required pressing a "Calculate" button before any GRACE score, anticoagulant recommendation, or print preview was visible. This created unnecessary friction in time-critical ED scenarios.
- **Decision:**
  1. Extracted all calculation logic into `calculateAndRender()` — fires on every input/radio/checkbox change.
  2. `#results-container` is always visible from page load (removed `class="hidden"`).
  3. Submit button (`type=button`, `onclick=window.print()`) — prints the order sheet only; `@media print` already hides the form/nav.
  4. `form.submit` listener retained but only calls `window.print()`.
  5. Anticoag hints in `updateAcHints()` now show: Fondaparinux 2-line (eGFR + CI/PCI note in red), Enoxaparin 2-line (dose + syringe ref), Heparin plain threshold.
  6. Graceful degradation: missing fields render `--`, auto-select fires only when eGFR is computable.
- **Rationale:** Removing the calculate gate eliminates cognitive overhead during time-critical resuscitation. Real-time preview lets clinicians verify the order as they type. Submit-to-print preserves existing button labels while assigning the correct final action.

---

### ADR-27: NSTEMI v2.1.2 Re-Audit Minimal Design (2026-07-04)

- **Context:** The second-pass audit of NSTEMI standing orders (`PLAN-nstemi-v2.1.1-reaudit-minimal-design.md`) identified three issues: (1) split threshold for Fondaparinux between screen logic (30) and print logic (20); (2) override-confirmation warning messages hardcoded to Fondaparinux, leaving Enoxaparin without safety messaging; (3) Heparin hints containing an obsolete reference to `CrCl <30 mL/min`.
- **Decision:**
  1. **Renal Cutoff Constants:** Hoisted cutoffs to unified constants (`FONDA_MIN_EGFR = 30` and `ENOX_MIN_EGFR = 15`) at the top of the script block.
  2. **Generified Override UI:** Added `#ac-enox-ci-msg` and `#ac-enox-override-msg`. Updated `_applyAcState` to perform dynamic ID lookup and click-handlers to check safety messages dynamically for both drugs.
  3. **Heparin Hint Tidy:** Removed the `หรือ CrCl <30 mL/min` reference, keeping Heparin labels to `(eGFR <15 mL/min)` consistently.
  4. **Regression Guard:** Added `tests/nstemi-thresholds.test.js` to assert constants are used and check for hardcoded threshold literals.
- **Rationale:** Centralizing cutoffs in constants avoids split-logic bugs. Generifying the warning handlers prevents safety bypasses on overridden enoxaparin dosing.

---

### ADR-28: NSTEMI Print Layout A4 Optimization (2026-07-04)

- **Context:** The NSTEMI standing order printed output had excessive blank whitespace when rendered on a standard A4 page. Clinicians required the layout to fill the page cleanly and look professional, with space to write custom additional orders, while strictly fitting on a single page to prevent medical record split errors.
- **Decision:**
  1. **Moderate Typography Scale:** Scaled up the grid font size slightly to `9.5pt` and cells to `9pt` (with `line-height: 1.45;` and `margin-bottom: 4px` for list items) to fill the empty space safely without causing the 1-page document to overflow onto page 2.
  2. **Flexbox-Driven Spacing & Bottom Signature Block:** Enabled Flexbox inside the column grid cells (`display: flex; flex-direction: column; height: 100%;`) and wrapped the doctor signature blocks in `.print-signature-block` with `margin-top: auto;` to anchor them flush to the bottom of the grid row.
  3. **Clean Blank Space:** Inserted a flexible spacer container `.order-blank-space` (`flex-grow: 1; min-height: 20px;`) right before the signature blocks. Left it as clean blank space (no dotted lines) per user request to allow manual additions.
  4. **Column 1 Unit Formatting & Nowrap:** Standardized all unit labels (`น้ำหนัก (kg)`, `eGFR (ml/min)`, `HR (bpm)`, `SBP (mmHg)`, `Cr (mg/dL)`) in parentheses immediately following the headers, removing trailing unit suffixes. Wrapped all demographics and GRACE variable lines in `white-space: nowrap` spans and shortened the blank print dotted line lengths (6 to 12 dots) to prevent the browser print engine from wrapping values to separate lines.
  5. **Version Block Relocation:** Moved the version string to the bottom of Column 1 (Progress Note) and removed the `Generated: ...` date string entirely to clean up the margins.
  6. **Continuation Column Signature:** Synced Column 5's doctor signature block with Column 3's format, leaving it as a single bottom-aligned line `ลงชื่อแพทย์ (ER/ward) <span class="dotted-line"></span>` for ER/ward unification.
  7. **Line Wrapping & Others:** Wrapped `NSS 500 ml IV 40 ml/hr` and `Lt. arm (non-AVF)` into two lines. Wrapped the Fondaparinux PCI warning into two lines: Line 1 `(CI: CrCl <30 mL/min)` and Line 2 `(— ถ้าทำ PCI ต้องเพิ่ม UFH bolus)`. Added `☐ Admit` (bolded and 11pt) as the 6th option under `Others:`.
  8. **Caching & Version:** Bumped version in `orders/nstemi.html` to `2.1.1` and `service-worker.js` `CACHE_VERSION` to `er-hub-v12`.
  9. **GRACE Variables List Layout:** Removed the vertical bar `|` dividers from the GRACE variables. Structured each parameter (Age, HR, SBP, Cr, Killip, and GRACE Score) on its own separate line in the HTML, aligning the live preview and the print layouts perfectly.
- **Rationale:** Scale-up matches clinical readability expectations. Flexbox alignment dynamically pushes signature lines to the bottom edge, using a simple blank container rather than dotted lines to avoid print settings background issues and keep the worksheet uncluttered.
### ADR-29: Braun Redesign & Navigation Refinement (2026-07-04)

- **Context:** Refactoring the portal homepage (`index.html`) to the Braun × Mid-Century Modern layout required visual refinement to maintain clinical utility. The initial redesign used an off-white navigation bar that lacked visual distinction, a "Standing Orders" section title that added vertical height, and STEMI ahead of NSTEMI in the list. Additionally, standing order navigation titles were inconsistent.
- **Decision:**
  1. **Nav Blue Background & Icon Size**: Reverted the `.top-nav` background on `index.html` back to the original blue gradient (`linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)`) with white text, and increased the `.nav-logo` icon height to `38px` globally to restore branding prominence.
  2. **Removed "Standing Orders" Eyebrow**: Removed the section header and its bottom underline from `index.html` to simplify the interface and let the order rows start directly beneath the navigation bar.
  3. **Reordered List**: Swapped NSTEMI and STEMI so NSTEMI is 2nd (02) and STEMI is 3rd (03).
  4. **Standardized Navigation Titles**: Normalised `injectNavBar` parameter usage across all 7 standing order pages to explicitly include the page title, clinical guideline, and release version (matching NSTEMI's layout).
  5. **Clinical Visual Indicator (Signal Orange)**: Documented that the **Signal Orange** `#d84315` dot is reserved strictly for time-critical visual status flags (rt-PA, STEMI, Massive PE) to direct clinician attention instantly to time-critical emergency pathways (door-to-needle/door-to-balloon times) in a busy ED.
  6. **Caching & Updates**: Bumped service worker `CACHE_VERSION` to `er-hub-v14` to clear client-side static caches, and added `reg.update()` inside `index.html` to trigger immediate update checking on every page load.
  7. **Responsive Title Truncation**: Parsed page titles in `injectNavBar` (via name replacements and regex match) to generate full and short titles (e.g., `NSTEMI V2.1.1` instead of the full guideline block), and added responsive toggling classes (`.nav-title-full` / `.nav-title-short`) that toggle at `900px` (tablet/mobile) to prevent nav bar text wrapping.
  8. **Mobile Alignment Synchronization**: Added a media query for max-width 768px in `shared/base.css` to reduce `.top-nav` padding to `0 16px` globally, matching the mobile logo offset of `index.html`.
  9. **Nav Right Metadata Date**: Shortened the homepage's nav-right metadata string to `v13 · Updated 26-07-04` to fit mobile viewports.
- **Rationale:** Restoring the blue navigation bar retains brand consistency. Increasing the logo size elevates professional institutional identity. The Signal Orange dot serves a crucial clinical triage role, highlighting time-critical pathways while keeping the dashboard clean. Responsive titles and synchronized padding prevent multi-line wrapping and layout offsets on actual mobile devices.

### ADR-31: NSTEMI v2.1.1 UX Polish — Mobile Layout, Button Logic & Version Text (2026-07-04)

- **Context:** Three UX defects discovered during post-ADR-28 screen QA: (1) `.patient-fields` 7-field row overflowed and misaligned on mobile (≤600px); (2) top-form button label misrepresented its print-only function, and `print-btn` had duplicate `window.print()` listeners causing a double print dialog; (3) Clear button hid `#results-container` via `clearResults()` instead of resetting the blank preview; (4) print signature used wrong ESC citation word order.
- **Decision:**
  1. **Mobile Responsive Layout:** `@media (max-width: 600px)` added to `nstemi.html` `<style>` block. `.patient-fields` switches to `display: grid; grid-template-columns: 1fr 1fr`. eGFR field gets `egfr-field` class + `grid-column: 1` (col-left). ASA Allergy gets `asa-field` class + `grid-column: 2` (col-right). Troponin inputs stack vertically.
  2. **Button Logic:** Top-form button renamed `id="create-order-btn"`, label → **"🖨️ สร้างใบสั่งยา"**, `onclick` removed, listener in JS only. Duplicate `print-btn` click listener removed; `setupCommonActions()` is sole owner.
  3. **Clear Behaviour:** `ED_PRINT_BOOTSTRAP.clearResults()` replaced by `form.reset()` + `ED_VALIDATE.clearAll()` + GRACE breakdown reset + `print-blank-btn.click()` — restores blank preview without hiding results container.
  4. **Version Text:** `print-signature-block` changed to 3 lines: `Version: 2.1.1` / `2025 ACC/AHA ACS` / `2023 ESC NSTEMI Guideline` (year-first citation order).
- **Rationale:** 2-column grid uses CSS Grid over Flexbox hack for cleaner responsive wrapping. Removing the inline `onclick` keeps all event wiring in JS, preventing future accidental duplicate handlers. Preserving the results container on clear matches the blank-first page-load UX and reduces clinician disorientation.

### ADR-30: Portal Hover Refinement, Nav Braun White & Background Warmth (2026-07-04)

- **Context:** Post-redesign review identified three visual gaps: (1) the order-row hover state used a warm grey (`#ece9df`) that lacked interactive clarity and contrast, providing no directional standout for the physician scanning the list quickly. (2) The navigation bar text was pure white (`#fff`) on a blue gradient, which is technically correct but misses the warmer ivory tone established by the Braun palette. (3) The portal homepage background (`#f4f2ec`) was not visually distinct enough from the warm white default of the browser.
- **Decision:**
  1. **Slate Blue Hover:** Replaced warm-grey hover with `#49628d` — same 218° hue as the nav gradient (`#1e3c72 → #2a5298`) but at 42% lightness and 32% saturation (Braun restraint: brighter and less saturated). All child text elements (`.order-num`, `.order-category`, `.order-title`, `.order-status`, `.order-arrow`) transition to Braun White `#F0EDE5` on hover. WCAG AA contrast: `#F0EDE5` on `#49628d` = **5.23:1** (≥ 4.5:1 required).
  2. **Minimal Left Border Standout:** `border-left: 4px solid transparent` in rest state (padding adjusted from `12px 16px` → `12px 16px 12px 12px` to compensate, preventing text from shifting). On hover, `border-left-color` transitions to `#F0EDE5`. Transition: `background-color 120ms linear, border-left-color 120ms linear, color 120ms linear`.
  3. **Category Text Colors:** Added explicit `.cat-neuro/cardiac/pulmonary/anticoag/tox/procedural/tools` CSS rules wired to the `--cat-*` CSS variables to restore muted text color categories intended by the Braun design token system.
  4. **Navigation Text to Braun White:** Changed `.nav-home` (was `#fff`), `.nav-title` (was `rgba(255,255,255,0.85)`), `.nav-title` border-left (was `rgba(255,255,255,0.3)`) in `shared/base.css` — applies to all standing order pages. Changed `.nav-center` (was `#ffffff`) and `.nav-right` (was `rgba(255,255,255,0.7)`) in `index.html` — homepage only. New value: `#F0EDE5` flat across all nav text.
  5. **Background Warmth:** Darkened `--paper` from `#f4f2ec` → `#ebe7df` for a richer, warmer surface that reads as distinctly warm grey against any white overlaid content and matches the Braun analogue material palette more closely. Portal order lists blend flatly against this background (no white card box).
- **Rationale:** The slate blue hover provides unmistakable interactive feedback matching the nav's chromatic identity, while the Braun White text maintains legibility (5.23:1 contrast). The left border standout is a minimal spatial cue without adding card elevation or drop shadows. The nav text change from pure white to Braun White is a deliberate tonal refinement — warm ivory reads as intentional, not default. The deeper warm grey background adds surface richness and better frames any white content blocks on the page.

### ADR-32: NSTEMI Mobile UX — Column-Correct Grid, Gender Radio Fix, GRACE Short Labels + Nav Short Title Aliases (2026-07-04)

- **Context:** Post-ADR-31 QA on 390px viewport: (1) eGFR rendered in col-2 (DOM child 6, even) but clinically belongs in col-1 (lab values column). (2) ASA Allergy rendered in col-1 (DOM child 7, odd) but belongs in col-2 (demographics column). (3) GRACE labels (`Heart Rate (bpm):`, `SBP (mmHg):`, `Creatinine (mg/dL):`) too long to share a line with inputs on narrow screens. (4) Nav short titles for Sedation (`Sedation Order`) and rt-PA (`rt-PA Dose Calculator`) still exceeded optimal mobile width.
- **Decision:**
  1. **Grid Column Overrides:** Added explicit `grid-column: 1` on `.patient-field.egfr-field` and `grid-column: 2` on `.patient-field.asa-field`, overriding the `nth-child(odd/even)` base rule. Col-1: HN / Age / Cr / eGFR. Col-2: Weight / Sex / ASA Allergy.
  2. **Gender Radio Fix:** `.patient-field .gender-radio` → `font-size: 13px; white-space: nowrap` inside `@media (max-width: 600px)`.
  3. **GRACE Short Labels:** Dual `<span class="grace-label-full">` / `<span class="grace-label-short">` spans in each GRACE label. Short text: `HR:`, `SBP:`, `Cr:`. `.grace-inline-row` forces `flex-direction: row` on mobile. Toggled via `@media (max-width: 600px)` / `(min-width: 601px)` display rules.
  4. **Nav Title Aliases (`shared/components.js`):** `parseTitle()` strips residual `\bOrder\b` (Sedation Order → Sedation) and aliases `rt-PA Dose Calculator → rt-PA Calc`.
- **Rationale:** Class overrides are DOM-order-independent. Short label spans are CSS-only and maintain semantic `<label for>` association. Nav aliases complete the short-title set so all 7 pages display correctly on narrow viewports.

### ADR-33: NSTEMI Sex Radio Overflow Fix (2026-07-04)

- **Context:** Mobile 600px viewport — "ชาย" / "หญิง" radio labels escaped the right edge of the `1fr` grid column due to `white-space: nowrap` and missing `flex-direction: column` on the Sex field container.
- **Decision:**
  1. `.patient-field .gender-radio` → `white-space: normal; display: flex; align-items: center; gap: 4px; overflow: hidden` (inside `@media (max-width: 600px)`).
  2. `.patient-fields > .patient-field:nth-child(4)` → `display: flex; flex-direction: column; align-items: flex-start; overflow: hidden; min-width: 0` (inside same breakpoint).
- **Rationale:** `min-width: 0` allows the flex/grid child to shrink below intrinsic size; `flex-direction: column` stacks ชาย/หญิง vertically inside the narrow column.
