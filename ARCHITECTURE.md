# Architecture Guidelines

## 1. Core Components

| Component | Role | Dependencies |
| --- | --- | --- |
| `calc-engine.js` | Generic mathematical engine computing infusion drip rates (mL/hr). | None |
| `clinical-engine.js` | Shared clinical logic engine containing lookup tables and formulas for GRACE score and eGFR (CKD-EPI 2021) calculations. eGFR function includes input validation, case-insensitive sex normalization, and `Math.round()` return. Sole eGFR source of truth in the repo (ADR-46 parity achieved by removing the duplicate copy from anticoag-engine.js). Killip lookup uses direct string key (no `String()` coercion). | None |
| `anticoag-engine.js` | Heparin standalone dosing/titration engine. Exports `calcHeparinInitialDose`, `getHeparinTitration`, and `HEPARIN_STANDALONE_PROTOCOLS` (used by `orders/heparin.html`). The dead `calcAnticoag` and duplicate `calcEGFR_CKDEPI2021` were removed (ADR-46): eGFR now lives solely in `clinical-engine.js` and `calcAnticoag` was never called by any order page. | None |
| `drug-data.js` | Structured catalog of concentrations, dose limits, safety ceilings, and titration instructions for all 12 IV drugs. Optional `indications` array (per-drug) provides clinical-indication-specific dosing guidance for the drip calculator guide box. | None |
| `components.js` | Renders common UI elements: patient info blocks, sticker boxes (HN set via `textContent` for XSS safety), date-time inputs, sticky top navigation bar (`injectNavBar`), floating print action bar (`showFloatBar`/`hideFloatBar`). Float bar uses text-only labels (no emoji per ADR-09). Negative margin math reads `--page-pad` CSS var for flexible breakout from body padding. `setupCommonActions()` wires `print-btn` to `window.print()` — used by most order pages. `print-btn` removed from rtpa.html and nstemi.html (ADR-44); float bar (`showFloatBar()`) is the sole print trigger on those pages. | None |
| `print-bootstrap.js` | Shared print/page lifecycle: `handlePrintBlankDirect()` (URL param detection for HTML blank print — calls the page's blank-print callback which already invokes `window.print()`, so no second `window.print()` here per ADR-49), `handlePrintBlankDirectPdf(path)` (URL param detection → redirect to source PDF), `openBlankPdf(path)` (opens source PDF in new tab — user presses print manually, no cross-tab `.print()` per ADR-09), `showResults()` (unhide + float bar + scroll), `clearResults(formId, extraFn)` (reset + hide + focus), `getDateTimeHTML(useTime, date)`, `getBlankDateTimeHTML()`. 5 of 7 order pages use the PDF pathway (ADR-17); rtpa/nstemi keep HTML blank print. | `components.js` |
| `blank-print-engine.js` | Declarative blank-print reset engine. Each order page registers a manifest of reset rules (`{ id, value }` for textContent, `{ id, html }` for innerHTML, `{ id, className }` for class override, `{ id, style }` for style props, `{ selector, checked }` for checkboxes). `apply()` executes all rules. Used by rtpa.html and nstemi.html only (ADR-17 — 5 other pages now open source PDFs instead). Fixes the ADR-10 bug class at the root — adding a new protocol page is now a manifest array, not a hand-written reset block. | None |
| `form-validate.js` | Non-blocking form validation — replaces `alert()` calls across all order pages. `fail(inputId, msg)` highlights field + inline message. `warn(msg)` shows clinical warning banner. `range(inputId, min, max, msg)` and `min(inputId, minVal, msg)` for numeric validation. `clearAll()` resets all errors. Uses existing `.field-error` CSS + new `.inline-error-msg` and `.clinical-warning` classes. | `components.js` |
| `orders/*.html` | Specialized clinical worksheets (rt-PA, STEMI, NSTEMI, PE, Antivenom, Heparin, Sedation). All 7 files use `ED_PRINT_BOOTSTRAP` for page lifecycle and `ED_VALIDATE` for non-blocking validation. All in-page title/guideline headers and dividers are deleted; forms start directly below the sticky top nav, relying on it as the single source of truth. 5 pages (stemi, pe, heparin, antivenom, sedation) use `ED_PRINT_BOOTSTRAP.openBlankPdf()` to open source PDFs from `docs/` in a new tab (ADR-17). 2 pages (rtpa, nstemi) keep `ED_BLANK_PRINT` for HTML blank-print (no source PDF). rtpa and nstemi no longer have `#print-btn` — the floating print action bar (`showFloatBar()`) is the sole print trigger (ADR-44). Page-specific JS reduced to: form submit handler (clinical logic) + event listeners for protocol-specific UI. `nstemi.html` loads `shared/clinical-engine.js` (eGFR/GRACE logic); `anticoag-engine.js` removed from nstemi.html (ADR-45 — was dead include, all anticoag logic in nstemi uses `CLINICAL_ENGINE`). | `shared/base.css`, `shared/print.css`, `shared/calc-engine.js` or `shared/anticoag-engine.js`, `shared/components.js`, `shared/print-bootstrap.js`, `shared/form-validate.js`, `shared/clinical-engine.js` (rtpa/nstemi also load `shared/blank-print-engine.js`) |
| `tools/drip-calculator.html` | IV infusion drip rate calculator for 12 high-alert drugs featuring bidirectional weight input (number + slider sync, clamp on blur only per ADR-49) positioned below Concentration in Column 2, interactive dose slider and number input coupling, real-time calculation, safety color categories, generalized dual units display, dynamic radio button choices for medication formulas (vertical 1-per-line layout per ADR-44), clinical-indication-based guide rendering with per-drug max dose display (ADR-45), inline plain text concentration display, and sessionStorage weight persistence. All input fields are translated to English. Dose input clamp-on-blur (ADR-49 fix — clamping on `input` destroyed manual number entry). | `shared/base.css`, `shared/calc-engine.js`, `shared/drug-data.js`, `shared/components.js` |
| `index.html` | Portal hub with custom Braun × Mid-Century Modern layout. Displays active and prototype clinical standing orders and calculators in a semantic vertical ordered list with 1px hairlines, tabular numerals, muted category styles, and signal orange indicators for time-critical actions. Implements header wordmark, hospital logo, and footer. Registers service worker for offline PWA support with dynamic reload notification (idempotent listener guard). Redirect script validates `order` slug against allow-list. Body uses custom typography and colors. | `shared/base.css`, `service-worker.js`, `manifest.json` |
| `service-worker.js` | PWA offline cache. Network-first for navigation, cache-first for assets. Caches all HTML/CSS/JS + 5 shared behavior modules (incl. `clinical-engine.js` per ADR-49) + logo PNG + 5 source PDFs + Google Fonts (including `Inter Tight`). `CACHE_VERSION` bumped to `er-hub-v20`. Enables full offline access during ED wifi outages. | None |
| `manifest.json` | PWA manifest. App name, theme color (`#f4f2ec` Braun cream), background color (`#ebe7df` Braun paper), logo icon reference. Enables installable app + offline. | `docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png` |

---

## 2. Data Flow

```mermaid
graph TD
    A[User Form Inputs] -->|Weight/Age/Clinical Flags| B(UI Input Sanitizer)
    B -->|Sanitized Variables| C{Clinical Calculator}
    C -->|Calculates Drip Rate & Dose| D[shared/calc-engine.js]
    C -->|Calculates Anticoagulant Dose| E[shared/anticoag-engine.js]
    D -->|Dose Values| F(Print Renderer)
    E -->|Dose Values| F
    F -->|CSS Media Print Formatting| G[A4 Paper / Hospital Record PDF]
```

1. **Input Collection (`Src`):** User inputs patient variables (HN, age, weight, creatinine — eGFR derived automatically via CKD-EPI 2021 from Cr+age+sex in shared/anticoag-engine.js) and selects drug/indication options in the active worksheet.
2. **Clinical Processing (`Transform`):** Sanitized inputs are processed by `shared/calc-engine.js` or `shared/anticoag-engine.js` referencing data structures in `shared/drug-data.js`.
3. **Print Output (`Dest`):** Output values are written directly to target print containers in the DOM, then converted into an official A4 medical order sheet via the browser print driver using `shared/print.css`.

---

## 3. Offline Decisions

| Entity | Conflict Resolution | Sync Strategy |
| --- | --- | --- |
| `Patient Form State` | Client-only state. Form resets immediately on navigation or tab close. | No server sync. Strictly offline-first. |
| `Calculation Engine` | Pure functional operations. Standard math guarantees deterministic outcomes. | Stored as local `.js` scripts. Loaded from disk. |
| `PWA Assets Cache` | Service worker (`service-worker.js`) registered on index.html. Network-first for navigation, cache-first for static assets. Caches all HTML/CSS/JS + Google Fonts for offline access. | Assets cached in browser via Cache API. Cache version bumped on deploy. |

---

## 4. Clinical & System Warnings

- **W-01: Absolute SK Contraindication:** Users selecting Streptokinase (SK) who flag a prior SK administration within 6 months are permanently blocked from generating the order. They must use Tenecteplase (TNK).
- **W-02: Individualized Dosing Bypass:** For Heparin and Antivenom protocols, matching any pre-defined clinical risk factors (e.g., active bleeding, platelet count < 50,000) disables automatic calculations, forcing user consultation with the attending staff.
- **W-03: Max Dose Ceilings:** The calculation engine automatically caps values at the clinical upper limit (e.g., Fentanyl drip maxed at 500 mcg/hr, rt-PA maxed at 90mg or 50mg based on regimen) to prevent accidental overdosage.
- **W-04: Print Blank Order Bypass:** Two pathways (ADR-17): (1) 5 pages (stemi, pe, heparin, antivenom, sedation) open the source PDF from `docs/` in a new browser tab via `ED_PRINT_BOOTSTRAP.openBlankPdf(path)` — the clinician presses print manually in the native PDF viewer (no cross-tab `.print()` per ADR-09). (2) 2 pages (rtpa, nstemi) render a blank HTML template on-screen via `ED_BLANK_PRINT.apply()` — clinician prints via the floating print action bar (ADR-44 removed the redundant `#print-btn` from both pages). Both pathways bypass all screen validation. The home portal no longer has print-blank buttons (removed per ADR-09). `?print-blank-direct=true` URL param works for both: PDF pages redirect to the PDF, HTML pages trigger blank print.
- **W-05: Lab/IV/O2 Hygiene:** Lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders are always rendered as unchecked (☐) in the print output — even when patient data has been entered. Only drug-related orders (ASA, Clopidogrel, Fentanyl, Midazolam, Heparin dosing, Antivenom dosing, Antibiotics) auto-check (☑) based on input data. This prevents accidental pre-checking of investigations that must be ordered by the attending physician.
- **W-06: A4 Print Fit:** All order pages use `@page { size: A4 portrait; margin: 0 }` with `body { width: 210mm; display: block !important }` to override the screen flex layout. Results container uses `padding: 5mm` for print margins. The 5-column order grid drops `min-width: 900px` in print, uses font-size: `8pt` / `8.5pt` (scaled to `9.5pt` / `9pt` for NSTEMI), and `page-break-inside: avoid` to keep the grid intact on one page. Stroke-specific pages (rt-PA) use `width: 195mm; margin: 0 auto; padding: 3mm 0` with `page-break-before: always` for multi-page documents — matching the original rtpamnrh.vercel.app layout. Sticker box: 60mm × 20mm (compact, matching stroke page sticker dimensions). The sticky top navigation bar is hidden in print across all 7 order pages via `nav`, `.top-nav`, and `a[href*="index.html"]` selectors in `@media print`. rt-PA order grid includes `10em` spacer divs before doctor signature lines to fill the height. NSTEMI page uses a flex-grow blank space container (`.order-blank-space`) and `margin-top: auto` on signatures (`.print-signature-block`) inside the column cells to automatically stretch content to the bottom of the page. Portal header padding reduced for compact portal.
- **W-07: Hardcoded Checkbox Reset on Blank Print:** All non-dynamic ☑ items (medications, monitoring instructions, diet orders) in the results area are tagged with IDs and explicitly reset to ☐ when printing a blank order. This prevents pre-checked medications (Clopidogrel, Ativan, Atorvastatin, Augmentin, etc.) from appearing on blank orders intended for new patients. Affected files: rtpa (10 items), nstemi (12 items) — the 2 pages that still use HTML blank-print. The 5 PDF-pathway pages (stemi, pe, heparin, antivenom, sedation) no longer use `ED_BLANK_PRINT` (ADR-17). Antivenom antibiotic toggle (F3 fix, ADR-17): `p-augmentin` and `p-cipro-clinda` now toggle based on penicillin-allergy radio input — no longer both hardcoded ☑.
- **W-08: Use-Current-Time Checkbox:** All 5 order files with the `use-current-time` checkbox (pe, heparin, antivenom, nstemi, rtpa) wire it to the date/time generation logic — when unchecked, date/time fields render as dotted lines instead of the current time. Default state varies by page: pe, heparin, antivenom, rtpa default to **checked** (auto-fill current time); nstemi defaults to **unchecked** (blank dotted lines) per ADR-47, with the checkbox rendered inline on the same row as the "1. ข้อมูลผู้ป่วย" heading.
- **W-09: Iframe Print Cleanup (Deprecated):** The home portal's `printBlankOrder()` function was removed (ADR-13). ADR-09 eliminated all portal print-blank buttons, making the function dead code. The `afterprint` + 5-minute timeout pattern is documented for historical reference only.
- **W-10: Nav Overflow Fix (2026-07-02, Phase 1 — BUG-01):** Introduced CSS custom property `--page-pad` to decouple `.top-nav` breakout math from hardcoded body padding. Pages set `body { --page-pad: 0px }` (index.html) or inherit default `--page-pad: 20px` (order pages). Nav margin calculations now read `calc(var(--page-pad) * -1)` instead of `-20px`. Responsive breakpoints update `--page-pad` cleanly at media query boundaries (10px at 900px, 8px at 600px). Eliminates 20px overflow on pages where body padding differs from default.
- **W-11: PE Hard-Stop Doesn't Stop Fix (2026-07-02, Phase 1 — BUG-02):** Added `return;` statement immediately after both `ED_VALIDATE.warn()` calls (lines 316 & 322) in `pe.html` for absolute-CI and SK-repeat checks. Also retracts stale order on re-submission via `classList.add('hidden')` on results-container. Prevents clinician from accidentally printing contraindicated PE standing order via Ctrl+P despite print-button being visually locked. New structural regression guard: `tests/order-safety-guard.test.js` (30 tests) scans all order files for this hard-stop pattern and asserts `return;` follows `warn()` within 4 lines.
- **W-12: injectNavBar pageTitle Parameter (2026-07-02, Phase 3 — BUG-04):** Extended `injectNavBar()` signature to accept optional third parameter `pageTitle`. Can be `undefined` (auto-detect from `document.title`), empty string `''` (suppress title, show only logo + "Home"), or explicit string (override title). `index.html` passes `''` → homepage shows only logo + Home link, no redundant "MNRH-ED Standing Order Hub" title. Eliminates visual redundancy on the portal page.
- **W-13: SW Precache Robustness + Retry Logic (2026-07-02, Phase 3 — BUG-05):** Replaced `cache.addAll(ASSETS)` with custom `fetchWithRetry()` helper (2 retry attempts, 100ms exponential backoff) + `Promise.allSettled()` precache loop. Individual asset fetch failures no longer block the entire install event. Failed assets logged as warnings but don't prevent SW activation. Next fetch will auto-retry missing assets. Resilient to transient network issues during offline access cache setup. Bumped `CACHE_VERSION` from `er-hub-v1` to `er-hub-v2`.
- **W-14: NSTEMI Dead ID Reference Safety (2026-07-04):** All elements queried in standing order handlers must be statically validated against DOM declarations. The ID integrity guard regression suite enforces that no queried IDs in `$()` or registry manifests are missing in the HTML source, ensuring zero runtime TypeErrors on execution.
- **W-15: Homepage Braun × Mid-Century Modern Redesign & SW v14 (2026-07-04):** Revamped the portal dashboard with a Braun-restrained aesthetic. Replaced the 3-column card grid with semantic vertical lists using tabular-nums ordering, hairline separators, and muted text category badges. The Signal Orange dot is reserved strictly for time-critical items. The top-nav has a blue gradient background, 38px logo height, and supports dynamic responsive title parsing inside `injectNavBar()` which splits and truncates page titles (e.g., `NSTEMI V2.1.1` instead of the full guideline block) on viewports <=900px to prevent text wrapping. Synchronized top-nav padding to `0 16px` at <=768px in base.css to ensure horizontal alignment of the logo on mobile. Shortened the homepage's nav-right update date metadata to `26-07-04`. Added `reg.update()` in `index.html` to force immediate SW update checks, and bumped `CACHE_VERSION` to `er-hub-v14`.
- **W-16: Portal Hover Refinement, Nav Braun White & Background Warmth (2026-07-04):** Replaced the portal order-row warm-grey hover (`#ece9df`) with a slate blue hover (`#49628d` — same 218° hue as the nav gradient, lower saturation/higher lightness per Braun restraint). All hovered row text (num, category, title, status, arrow) transitions to Braun White `#F0EDE5`. A `4px` left border sentinel (`border-left: 4px solid transparent` at rest → `#F0EDE5` on hover) provides a minimal standout without layout shift — achieved by widening rest-state padding from `12px 16px` to `12px 16px 12px 12px`. Transition now covers `background-color`, `border-left-color`, and `color`. Muted category text colors (`.cat-neuro/cardiac/pulmonary/anticoag/tox/procedural/tools`) explicitly wired to CSS vars. Portal background `--paper` darkened from `#f4f2ec` → `#ebe7df` for a warmer, richer surface. Navigation text (`nav-home`, `nav-title`, `nav-center`, `nav-right`) changed from `#fff` / `rgba(255,255,255,0.85/0.7)` to flat Braun White `#F0EDE5` across `shared/base.css` (all standing order pages) and `index.html` overrides (homepage). WCAG AA verified: `#F0EDE5` on `#49628d` = **5.23:1** contrast ratio.
- **W-17: NSTEMI Audit Fixes & Layout Reflow (2026-07-06):** Comprehensive audit remediation across 6 files. (1) `nstemi.html` `print-blank-btn` now calls `window.print()` when clicked by user (was only applying blank template, never printing). Cold-load and clear-btn use `applyBlankTemplate()` (DOM-only, no print dialog) — separates programmatic blank-template application from user-triggered print. (2) Clear button resets anticoag + DAPT panel state (CI badges, override outlines, hint boxes, radio selections) — previously left stale state from prior patient. (3) `ED_VALIDATE.range()` calls added for weight (30–200), age (18–120), creatinine (0.1–20) — previously no functional validation despite loading `form-validate.js`. Dead `form.submit` listener removed (unreachable since ADR-25 button-type change). (4) eGFR rounding inconsistency fixed: Enoxaparin frequency auto-select now uses unrounded `egfr` instead of `Math.round(egfr)`, eliminating boundary bug at eGFR 29.5–29.99 where frequency contradicted CI text. (5) `updateLiveEGFR()` now has `age >= MIN_AGE` guard matching `calcEGFR()`, preventing pediatric-age eGFR display. (6) Drip-calculator soft-clamp writes back to `doseInput.value`. (7) Dead scripts removed: `index.html` no longer loads `components.js`, `drip-calculator.html` no longer loads `form-validate.js`. (8) `index.html` redirect validates `order` slug against allow-list. (9) `showUpdateToast()` idempotent via `dataset.wired` guard. (10) `manifest.json` theme colors aligned to Braun palette. (11) `dead-css-guard.test.js` extended to cover `index.html`. (12) Results area reflowed: `.grace-summary` (Row 1: Score + Breakdown) closes before new `.dapt-anticoag-row` grid (Row 2: DAPT left, Anticoagulant right), stacks to 1 column at ≤900px. (13) Stat Medications print block uses `.order-list-plain` (no bullets) with 2-line layout (drug name on line 1, dose details indented on line 2 via `<br><span style="padding-left:2em">`); Prasugrel print line uses normal... [truncated]
- **W-18: Clinical Engine Hardening (2026-07-06, ADR-46):** Five fixes from dual-report audit: (1) eGFR parity — both `clinical-engine.js` and `anticoag-engine.js` now produce identical results (input validation, `Math.round()`, case-insensitive sex via `.toLowerCase().trim()`). Previously `clinical-engine` returned raw float with no null guards; `anticoag-engine` returned rounded int with validation. (2) Case-insensitive sex — `'Female'`, `'FEMALE'`, `' female '` all normalize correctly. Prevents silent male-math default that would overestimate eGFR → potential overdose. (3) Killip lookup — removed `String(killip)` coercion; direct key lookup `KILLIP_PTS[killip] || 0` eliminates `String(null)` → `"null"` → no match → silent 0 footgun. (4) Weight slider ARIA — added `aria-valuenow`/`aria-valuetext` to weight slider in drip calculator `recalculate()`, mirroring dose slider pattern. (5) Single-prep radio auto-check — drugs with 1 preparation (Nitroglycerin, Nitroprusside, Esmolol) auto-check their radio + `readOnly` flag prevents accidental deselect. SW `CACHE_VERSION` → `er-hub-v19`. 199/199 tests pass (+16 new).
- **W-19: Deep Audit Remediation (2026-07-06, ADR-49):** Ten fixes from full-clone static audit. (1) Drip calculator keystroke-clamp moved from `'input'` to `'blur'` — clamping on every keystroke destroyed manual number entry (typing weight `45` → clamped to `250`). `recalculate()` also stopped writing clamped value back to input during typing. (2) NSTEMI `updateLiveEGFR()` now delegates to null-safe `calcEGFR()` instead of calling `calcEGFR_CKD_EPI_2021` directly without null guard — typing `0.9` (starts with `0`) previously crashed with `null.toFixed()` TypeError. (3) `handlePrintBlankDirect()` no longer calls a second `window.print()` — the page's button handler already prints. (4) `shared/clinical-engine.js` added to SW `ASSETS` precache (was missing — would fail offline for NSTEMI GRACE/eGFR engine). `CACHE_VERSION` → `er-hub-v20`. (5) Dead `calcAnticoag` + duplicate `calcEGFR_CKDEPI2021` removed from `anticoag-engine.js` — `clinical-engine.js` is now the sole eGFR source of truth, eliminating the two-implementation drift class. 17 dead tests removed. (6) Dead `ED_COMPONENTS.updateDeptWard()` removed. (7) Dead CSS (`.flag-group`, `.nav-home-icon`, `.stroke-table` in shared files) removed. `dead-css-guard.test.js` extended to scan `shared/base.css` + `shared/print.css` against the full repo. (8) eGFR false precision `.toFixed(2)` → `.toFixed(0)` in 3 NSTEMI sites (engine returns integer). (9) STEMI age-75 boundary (TNK `age≥75` vs clopidogrel `age≤75`) confirmed intentional per clinical review — documented + 6 boundary tests added. (10) Vestigial `pnpm-lock.yaml` deleted (zero dependencies). 193/193 tests pass.

---

## 5. Architectural Decision Records (ADRs) — Part 2

### ADR-46: Clinical Engine Hardening — eGFR Parity, Case-Insensitive Sex, Killip Lookup, ARIA, Single-Prep Radio (2026-07-06)

**Context:** A dual-report audit (external clinical audit + ADR-validated recheck) verified against ground truth identified 5 open findings. Both `clinical-engine.js` and `anticoag-engine.js` implemented CKD-EPI 2021 eGFR independently with different behavior (clinical-engine returned raw float, anticoag-engine returned rounded int + null guards). Both used strict `=== 'female'` sex comparison (case-sensitive — `'Female'` or `' female '` would silently default to male math, overestimating eGFR). Killip lookup used `String(killip)` coercion creating `"null"`/`"undefined"` footgun. Drip calculator weight slider lacked `aria-valuenow` (dose slider had it). Single-preparation drugs (Nitroglycerin, Nitroprusside, Esmolol) still rendered an unselected radio button requiring an unnecessary click.

**Decision:**

1. **F1 — eGFR parity (Q1>C):** Both `calcEGFR_CKD_EPI_2021` implementations upgraded to identical behavior: input validation (`null` return for invalid Scr/age/sex), case-insensitive sex normalization (`.toLowerCase().trim()`), `Math.round()` on return (clinical-engine previously returned raw float — now matches anticoag-engine). Both files kept (heparin.html loads anticoag-engine, nstemi.html loads clinical-engine — separate script includes, no module bridge needed). 16 new tests added (`tests/clinical-engine.test.js` + case-sensitivity tests in `anticoag-engine.test.js`).
2. **F2 — Case-insensitive sex (Q2>A):** Both engines now normalize sex via `String(sex).toLowerCase().trim()` before comparison. Prevents future callers from silently getting male math if they pass `'Female'`, `'F'`, or `' female '`. Current UI radio buttons pass clean lowercase `'male'`/`'female'` so no behavior change for existing pages.
3. **F3 — Killip lookup (Q3>A):** Removed `String()` coercion: `this.KILLIP_PTS[killip] || 0`. Direct string-key lookup works for radio values (`'1'`–`'4'`). If `null`/`undefined` passed, `KILLIP_PTS[null]` is `undefined` → `|| 0` catches it cleanly. Eliminates `String(null)` → `"null"` → no match → silent 0 footgun.
4. **F4 — Weight slider ARIA (Q4>A):** Added `aria-valuenow` + `aria-valuetext` to weight slider in `recalculate()`, mirroring the existing dose slider pattern. 2 lines.
5. **F5 — Single-prep radio auto-check (Q5>B):** When `preparations.length === 1`, radio is auto-checked and set `readOnly` (prevents accidental deselect). Radio stays visible for UI consistency. Eliminates unnecessary click for Nitroglycerin, Nitroprusside, Esmolol.

**Rationale:** Clinical safety — eGFR drives anticoagulant dosing (Enoxaparin q12h vs q24h). A case-sensitivity or null-eGFR bug could silently overdose a renal-impaired patient. Killip drives GRACE risk stratification — silent 0 points could miss high-risk classification. The eGFR parity fix ensures both engines produce identical results, preventing the drift class that caused ADR-26's screen-vs-engine contradiction. ARIA parity ensures visually impaired users get the same live feedback from both sliders. Single-prep auto-check reduces friction in time-critical ED settings.

**Tests:** 199/199 pass (was 183, +16 new). New file `tests/clinical-engine.test.js` (12 tests). Added 4 case-sensitivity tests to `anticoag-engine.test.js`. SW `CACHE_VERSION` → `er-hub-v19`.

---

### ADR-49: Deep Audit Remediation — Keystroke Clamp, eGFR Null-Crash, Double Print, SW Precache, Dead Code, CSS Guard (2026-07-06)

**Context:** A full-clone static audit of every file in `shared/`, `orders/`, `tools/`, `index.html`, `service-worker.js` — cross-referenced against all 199 tests and ADR history — identified 10 findings: 2 critical (patient-data-entry-breaking), 2 high (silent double-print + offline-availability gap), 3 medium (dead code), 3 low (cosmetic/clinical-review). All findings were validated against actual code before fixing.

**Decision:**

1. **#1 (Critical) — Drip calculator keystroke-clamp:** `doseInput`/`weightInput` `'input'` listeners clamped `parseFloat(el.value)` to `[min, max]` on every keystroke and wrote the clamped value back, destroying manual number entry (e.g. typing weight `45` → `4` clamped to `30` → `45` appended to `30` → `3045` clamped to `250`). Fixed: clamp moved to `'blur'` listener; `'input'` listener only syncs slider + triggers calculation. `recalculate()` also stopped writing clamped value back to `doseInput.value` during typing (same bug class — was line 577).
2. **#2 (Critical) — NSTEMI `updateLiveEGFR()` null-crash:** `CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021` returns `null` for `creatinine <= 0`, but `updateLiveEGFR()` only guarded `!isNaN(cr)` — typing `0.9` starts with `0` → `cr = 0` → `null.toFixed(2)` throws `TypeError`. Fixed: `updateLiveEGFR()` now delegates to the null-safe `calcEGFR()` (single source of truth, eliminates the two-parallel-implementations drift class) + null-guards before display.
3. **#3 (High) — Double `window.print()`:** `handlePrintBlankDirect()` called `printBlankFn()` (which triggers the page's own `print-blank-btn` handler including `window.print()`) then called `window.print()` again. Fixed: removed the second `window.print()` from `handlePrintBlankDirect` — the page's button handler is the sole print trigger.
4. **#4 (High) — SW precache missing `clinical-engine.js`:** `orders/nstemi.html` loads `shared/clinical-engine.js` (GRACE + eGFR — core clinical logic of the NSTEMI worksheet, flagged ACTIVE on homepage) but it was absent from the `ASSETS` precache list. A clinician opening nstemi.html for the first time during a genuine wifi outage would get a page whose GRACE/eGFR engine fails to load. Fixed: added `'./shared/clinical-engine.js'` to `ASSETS`, bumped `CACHE_VERSION` v19→v20, synced `index.html` nav-right.
5. **#5 (Medium) — Dead `calcAnticoag` + duplicate `calcEGFR_CKDEPI2021`:** `anticoag-engine.js` carried two eGFR implementations that were byte-for-byte logically identical today but had no shared source of truth — a future coefficient tweak applied to one and not the other would silently reintroduce the "two engines drift apart" bug class. `calcAnticoag` was also never called by any order page. Fixed: deleted both from `anticoag-engine.js` (made `clinical-engine.js` the sole eGFR source of truth). Removed 17 dead tests.
6. **#6 (Medium) — Dead `ED_COMPONENTS.updateDeptWard()`:** Defined in `components.js` but never called by any order page. Removed.
7. **#7 (Medium) — Dead CSS + guard test gap:** `.flag-group`, `.nav-home-icon` (`base.css`), `.stroke-table` (`print.css`) were unreferenced. The existing `dead-css-guard.test.js` only scanned inline `<style>` blocks — it missed shared CSS files entirely. Fixed: removed 3 dead selectors. Extended `dead-css-guard.test.js` to also scan `shared/base.css` and `shared/print.css` against all `.html`/`.js` files in the repo (strips `@import url(...)`, handles compound class strings).
8. **#8 (Low) — eGFR false precision:** 3 sites in `nstemi.html` displayed eGFR as `.toFixed(2)` while `calcEGFR_CKD_EPI_2021` returns `Math.round(egfr)` — an integer. Fixed: all 3 sites now use `.toFixed(0)` (bundled with #2 fix).
9. **#9 (Low) — STEMI age-75 boundary:** At exactly age 75, TNK dose is halved (`age >= 75`, ASSENT-2/ESC) but clopidogrel loading stays at full 4 tabs (`age <= 75`, PLATO-derived). Confirmed intentional per clinical review — the two rules use different source-guideline cutoffs. Added code comment documenting the intentional discrepancy + 6 boundary tests (age 74/75/76).
10. **#10 (Low) — Vestigial `pnpm-lock.yaml`:** 9-line lockfile with zero dependencies. Deleted.

**Rationale:** #1 and #2 are patient-safety-critical — a clinician typing a patient's weight or a creatinine value could silently end up with a wildly wrong infusion rate or an uncaught exception breaking the live eGFR display. #4 defeats the app's stated offline-safety purpose for the active NSTEMI page. #5 eliminates the exact "two engines drift apart" bug class this repo has fixed before. #7 hardens the CSS guard to catch the drift class automatically going forward.

**Tests:** 193/193 pass (was 199, −17 dead function tests removed, +11 new guard/boundary tests added). SW `CACHE_VERSION` → `er-hub-v20`. `pnpm-lock.yaml` deleted (zero dependencies).

---

### ADR-18: Test Coverage & CSS Custom Properties (2026-07-02 Audit)

**Context:** Post-ADR-17 audit (v3, 2026-07-02) identified three infrastructure gaps: (1) zero test coverage for shared behavior modules (`form-validate.js`, `print-bootstrap.js`), (2) nav bar hard-coded to `20px` margins breaks on pages with custom body padding (BUG-01), (3) PE hard-stop warn doesn't actually stop (BUG-02 — returns false but execution continues), (4) homepage displays redundant title in nav bar (BUG-04), (5) service-worker precache is brittle (BUG-05).

**Decision:**

  1. **Phase 1 — Clinical Safety (BUG-01 & BUG-02 + Regression Guard):**
     - BUG-01 (Nav Overflow): Introduced `--page-pad` CSS custom property. `index.html` sets `body { --page-pad: 0px }`, order pages inherit/default `--page-pad: 20px`. `.top-nav` margin calculations now read `calc(var(--page-pad) * -1)` instead of hardcoded `-20px`. Responsive breakpoints update `--page-pad` (10px at 900px, 8px at 600px). Eliminates overflow on pages with non-default body padding.
     - BUG-02 (PE Hard-Stop No-Op): Added `return;` immediately after both `ED_VALIDATE.warn()` calls in `pe.html` (lines 316 & 322). Also retracts stale order via `classList.add('hidden')`. Now matches correct pattern in `stemi.html`/`antivenom.html`.
     - Regression Guard: Added `tests/order-safety-guard.test.js` (30 tests) — structural guard that scans all order pages for the hard-stop pattern, asserts `return;` follows `warn()` within 4 lines. **Catches BUG-02 if accidentally reverted.**
  2. **Phase 2 — Test Coverage:**
     - `tests/form-validate.test.js` (63 tests) — contract tests for ED_VALIDATE module. Covers: `fail()`, `clear()`, `range()`, `min()`, `warn()`, `clearWarn()`, `clearAll()`. Tests non-blocking behavior, boundary values, PE weight 30–200kg protocol, hard-stop pattern.
     - `tests/print-bootstrap.test.js` (31 tests) — contract tests for ED_PRINT_BOOTSTRAP module. Covers: `handlePrintBlankDirect()`, `handlePrintBlankDirectPdf()`, `openBlankPdf()`, `showResults()`, `clearResults()`, date/time helpers. Tests print-pathway detection, URL params, blank-order workflow, results hide/show, form reset.
     - All 60 new tests pass (124/124 total suite).
  3. **Phase 3 — Polish (BUG-04 & BUG-05):**
     - BUG-04 (Homepage Title): Extended `injectNavBar()` signature to accept optional `pageTitle` param. `undefined` = auto-detect from `document.title`, `''` = suppress title, explicit string = override. `index.html` passes `''` → homepage shows only logo + "Home", no redundant title.
     - BUG-05 (SW Precache Robustness): Replaced `cache.addAll(ASSETS)` with custom `fetchWithRetry()` helper (2 retries, 100ms exponential backoff) + `Promise.allSettled()` loop. Individual fetch failures no longer block install. Failed assets logged as warnings. Next fetch auto-retries. Bumped `CACHE_VERSION` from `er-hub-v1` to `er-hub-v2`.

**Rationale:** The CSS custom property approach isolates nav layout logic from page-specific body padding, making it resilient to future pages with custom layouts. The hard-stop `return;` fix is a critical patient-safety change — it closes the risk of contraindicated orders being printable. The regression guard ensures this class of bug cannot reappear without test failure. Test coverage on shared modules provides a safety net for future refactoring. The `pageTitle` param eliminates redundant nav titles on pages where auto-detect duplicates content. The SW precache robustness ensures offline access works reliably even with transient network issues during cache setup.

---

### ADR-20: NSTEMI Clinical Dosing Safety & Performance Optimization (2026-07-05 Audit)

**Context:** Following a comprehensive codebase audit, several clinical safety and code maintainability issues were addressed: (1) clinicians could select/print anticoagulants without providing renal data (Cr/age/sex), creating a dosing risk; (2) two separate creatinine inputs existed (#creatinine and #grace-creatinine) with a fragile event-based two-way sync; (3) rendering the GRACE breakdown table and print header/sticker box on every keystroke via innerHTML was highly inefficient; (4) duplicate alias functions and unused code existed in the worksheet logic; and (5) the navigation bar was constructed using unsanitized innerHTML values.

**Decision:**

1. **Phase 1 — Clinical Safety:**
   - Hoisted eGFR recommendation flags and safety overrides.
   - Removed the silent `egfrForCalc = 90` fallback to prevent downstream errors.
   - Wired the print date/time generation logic to stamp the current date and time on active order generation using `ED_PRINT_BOOTSTRAP.getDateTimeHTML()`.

2. **Phase 2 — Dead Code Elimination:**
   - Removed duplicate event listeners, unused CSS selectors (`.killip-group`, `.anticoag-banner`, `.section-header`), and unused CSS variables.
   - Added support for direct `shortTitle` navigation bar configurations to bypass fragile title parser regex lookups.

3. **Phase 3 — Performance & Modularization:**
   - Synchronized creatinine inputs by maintaining separate inputs for patient info Creatinine (`#creatinine`) and GRACE Creatinine (`#grace-creatinine`) to support standalone calculations, but implementing a robust two-way input synchronization handler so they always match.
   - Pre-rendered static table rows for the GRACE score breakdown on load and updated only the `textContent` of targeted cells in `calculateAndRender()` instead of wiping and replacing the innerHTML.
   - Extracted all clinical lookup tables and equations into a new shared engine module: `shared/clinical-engine.js`.
   - Refactored and decomposed the `calculateAndRender()` monolith into isolated calculation and rendering helper functions.
   - Rewrote navigation bar generation using native browser DOM APIs instead of `innerHTML` strings to prevent potential XSS vectors.

**Rationale:** Clinical safety is guaranteed by safety override warnings. Print blocks and panel gates were removed to allow emergency clinicians to print blank or partially completed standing orders for manual clinical completion. Performance is dramatically improved by replacing raw innerHTML string concatenation and parsing with targeted DOM element updates and static element caching. Extrapolating logic to the clinical engine prevents duplicate code and establishes a modular framework for future standing orders. Dom sanitization enforces strict security hygiene.

---

### ADR-19: NSTEMI UI Overhaul — 2025 ACC/AHA Guideline + CKD-EPI 2021 (2026-07-02)

**Context:** NSTEMI Standing Order page (v1.x) had structural issues: (1) eGFR was a manual input field instead of derived value, violating single-source-of-truth principle — creatinine is the measured value, eGFR should be calculated; (2) anticoagulant dosing used outdated age-based criteria (age ≥75 → 0.75 mg/kg) from CR-NSTEMI document, which is STEMI+fibrinolytic-specific and NOT applicable to NSTEMI per 2025 ACC/AHA guideline; (3) troponin kinetics lacked manual time input capability for %rising calculation; (4) header/nav redundancy with ESC 2023 reference only.

**Decision:**

  1. **Engine Updates (shared/anticoag-engine.js):**
     - Added `calcEGFR_CKDDEPI2021(creatinine, age, sex)` — implements CKD-EPI 2021 creatinine equation (race-free): `eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^-1.200 × 0.9938^Age × (1.012 if female)` where κ = 0.7 (female) / 0.9 (male), α = -0.241 (female) / -0.302 (male). Returns eGFR in mL/min/1.73m².
     - Rewrote `calcAnticoag()` — removed age ≥75 branch (was 0.75 mg/kg, incorrect for NSTEMI). New logic: eGFR ≥30 → Fondaparinux 2.5 mg SC OD + Enoxaparin 1 mg/kg SC q12h; eGFR 15-29 → Enoxaparin 1 mg/kg SC q24h; eGFR <15 → Heparin drip. Aligns with 2025 ACC/AHA/ACEP/NAEMSP/SCAI Guideline for Management of Patients With Acute Coronary Syndromes.
     - Added 6 unit tests for `calcEGFR_CKDEPI2021()` (male/female, age/Scr ranges, invalid inputs) + updated 8 anticoag tests to remove age-based assertions.
  2. **UI Simplification (orders/nstemi.html):**
     - Removed header block (h1 + hospital name + ESC 2023 + version string) — redundant with nav bar. Removed hr divider.
     - Patient info row: collapsed to single-line flexbox (`.patient-fields` nowrap): HN, Age, Weight(kg), Sex(M/F), Creatinine(mg/dL). eGFR derived live and displayed in `.egfr-derived` badge.
     - Added 3-column troponin kinetics section: H0 ng/L, H1 ng/L, H3 ng/L (each with manual time input HH:MM). %rising auto-calculated as ((H1-H0)/H0 × 100) and ((H3-H0)/H0 × 100).
     - GRACE Variables: Creatinine input synced with Patient Info Creatinine (same `id="creatinine"` referenced in both sections). eGFR no longer an input — removed to prevent data conflict.
     - Continuation column (Col 5): Replaced hardcoded "Enoxaparin 40 mg SC OD" checkbox with 3 anticoagulant options (Fondaparinux / Enoxaparin / Heparin). Each shows calculated dose from engine + hint text (eGFR-based indication). Only the doctor-selected medication receives ☑ check in print output.
     - Nav bar: passed explicit title with 2025 ACC/AHA reference: `"NSTEMI Standing Order — MNRH | 2025 ACC/AHA Anticoag Guideline + CKD-EPI 2021 eGFR"`.
  3. **Removed auto-time features:** Deleted troponin draw-time auto-calculation (`h1t`/`h3t` computed time logic) and the original `use-current-time` checkbox. Troponin times now manual-only for clinical accuracy. *(Note: The `use-current-time` checkbox for order date/time was later restored by ADR-47, as the ADR-20 rationale applied only to troponin draw times, not order timestamps. NSTEMI defaults to unchecked, unlike the other 4 pages.)*

**Rationale:** eGFR is a derived clinical value, not an input — deriving it from creatinine via CKD-EPI 2021 (gold-standard equation) prevents data entry errors and ensures guideline compliance. The 2025 ACC/AHA guideline supersedes the outdated age-based enoxaparin dosing from CR-NSTEMI document (which applies only to STEMI fibrinolysis). Manual troponin times align with real-world ED workflow where draw times vary by patient and are not always at fixed intervals. The single-line patient info layout reduces vertical space, allowing more room for clinical data below.

**Tests:** All 130 tests pass (6 new CKD-EPI tests + 8 updated anticoag tests). No regressions.

**Consequences:** Older NSTEMI orders printed with v1.x will have different enoxaparin dosing than v2.0 for patients age ≥75 (was 0.75 mg/kg, now 1 mg/kg q24h if renal impairment). This is clinically correct per 2025 guideline.

---

### ADR-20: NSTEMI Standing Order v2.1 — Simplification, Safe eGFR Formatting, and Regression Guards (2026-07-04)

**Context:**
A post-implementation audit of NSTEMI standing order page (v2.0) revealed:

1. Dead DOM element references (`p-h0`, `p-h1`, `p-h3`) left from previous versions caused a Javascript `TypeError` upon calculation execution, preventing result generation and float bar display.
2. Troponin timing inputs (`trop-time-h0`/`1`/`3`) were redundant as the draws are logged in the EMR rather than the standalone sheet.
3. eGFR formatting was inconsistent (some places 1 decimal, some unformatted raw floats) and lacked null guards.
4. The blank order template preview had to be manually toggled.

**Decision:**

1. **DOM & JS Cleanup:**
   - Deleted dead `p-h0`/`p-h1`/`p-h3` print references and screen timing update lines from Javascript.
   - Removed manual troponin timing inputs `#trop-time-h0`/`1`/`3` and `.troponin-times` DOM block.
   - Simplified printed troponin section `#p-troponin-values` to display only static results (e.g. `H0: 12`, `H1: 15 → +25.0%`).
   - Retained the duplicate `#grace-creatinine` input and implemented two-way sync with `#creatinine` to prevent data entry friction.
   - Renamed print Column 1 header to "Progress note" and removed the pharmacist signature block ("ลงชื่อเภสัช:").
2. **eGFR Badge & Layout Repositioning:**
   - Moved the screen eGFR badge `#screen-egfr` directly next to the Creatinine input in the patient demographics row.
   - Relocated the `#troponin-from-rphch` checkbox to the header of the Troponin section.
   - Reverted Risk Stratification back to the original vertical list layout using standard labels.
   - Moved interactive anticoagulant selection radio buttons out of print preview (Column 5) and into the screen results container, adding Enoxaparin frequency q12h vs OD sub-selections with GFR-only hint text "(1 mg/kg — GFR < 30 → once daily)".
   - Relocated print anticoagulant output (`#p-anticoag`) from print Column 3 (One Day Orders) to print Column 5 (Continuation).
3. **eGFR Safe Formatting:**
   - Standardised all eGFR outputs to 2 decimal places (`.toFixed(2)`).
   - Safe-guarded printed output: `egfr !== null ? egfr.toFixed(2) : '___'` to prevent null crashes on form resets.
4. **Blank-First UX:**
   - Auto-trigger the blank print layout by clicking `print-blank-btn` on page load.
5. **Precache Robustness & Testing:**
   - Bumped `CACHE_VERSION` to `er-hub-v3` in `service-worker.js`.
   - Created `tests/id-integrity-guard.test.js` to parse all forms and verify query ID existence in the DOM, preventing dead reference crashes.
   - Bumped NSTEMI version to `2.1.0`.

**Rationale:**
Manual troponin draw times added layout complexity without clinical benefit. Two-way creatinine sync is retained to maintain consistent data entry between demographic and GRACE variables. Reverting Risk Stratification to the original vertical layout keeps layout styling consistent with other order sheets. Separating the calculated eGFR badge next to the creatinine input visually links the input and derived outputs. Safe-guarding formatting and removing dead DOM references prevents runtime TypeErrors. Auto-triggering the blank print preview ensures clinicians see the standing order layout immediately. Bumping SW cache versions ensures quick client updates. The ID integrity guard prevents future dead reference regressions across the suite.

**Tests:**
All 138 tests pass, including the new regression guard testing all 8 interactive files.

---

### ADR-22: Homepage Design Optimization & Local CSS Scoping (2026-07-04)

**Context:** The portal homepage (`index.html`) visually felt outdated and flat compared to modern web design standards. The user requested a visual optimization using `/modern-web-guidance` to create a premium clinical dashboard.

**Decision:**

  1. **Visual Overhaul:** Optimized the layout with a subtle radial gradient background (`#f8fafc` to `#e2e8f0`), glassmorphic portal cards (soft blur, semi-transparent borders, premium drop shadows, `12px` border-radius), and uppercase text tags (e.g., "NEUROLOGY", "CARDIAC") corresponding to the color-coded categories. Tuned card dimensions to be more compact (padding: `16px 20px`, min-height: `80px`, grid gap: `16px`) for an ultra-sleek layout.
  2. **Interactivity & Motion:** Added hover animations including a card vertical translation (`translateY(-4px)`), a color-matched shadow glow, a vertically centered chevron arrow indicator (`→`), and a subtle radial gradient glow inside the card. Implemented a staggered load animation (`fadeInUp`) for the grid cards using CSS animation delays.
  3. **Local Styling Scope:** Scoped all visual styles locally within the `<style>` tag of `index.html` instead of modifying `shared/base.css` to prevent any regressions or layout shifts on the other 7 clinical standing order pages.
  4. **PWA Version Bump:** Bumped the service worker `CACHE_VERSION` to `er-hub-v6` to force immediate client browser updates.
  5. **Favicon Replacement:** Replaced `favicon.svg` with the hospital logo PNG (`docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png`) as the favicon across all 9 pages, updated `manifest.json` icons, and removed `favicon.svg` from the cache list.

**Rationale:** Scoping styles locally inside `index.html` satisfies the surgical modification rule by completely isolating the homepage visual design, guaranteeing zero regression risk for the clinical order sheets. Branded category labels and interactive chevrons organize the grid without relying on sections or platform-specific emojis. Staggered animations make the interface feel responsive and modern. Using the official hospital logo as the favicon provides unified branding and consistent tab identification. Compact card sizing increases information density and usability on high-pressure ED terminals.

---

### ADR-23: Enoxaparin Continue Order Checkbox Options (2026-07-04)

**Context:** Thailand clinical settings support Enoxaparin in pre-filled syringe sizes (0.4 ml [40 mg] and 0.6 ml [60 mg]). The NSTEMI continue order printed layout used manual blank lines, which required manual completion and did not guide clinical selection based on pre-packaged stock sizes.

**Decision:**

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

**Rationale:** The updated layout reduces error-prone manual writing on printed forms. Formatting the checkboxes and instructions into 2 lines respectively prevents visual clutter in the narrow continuation column print space while ensuring clear stock size guide references.

---

### ADR-24: Anticoagulant Guideline Hints — Fondaparinux & Heparin (2026-07-04)

**Context:** The continue order anticoagulant section lacked explicit contraindication reminders for Fondaparinux and Heparin. Clinicians needed on-sheet guidance per 2025 ACC/AHA and ESC NSTE-ACS guidelines at the point of order writing, without opening an external reference.

**Decision:**

  1. **Fondaparinux — Added 2-line clinical hint:**
     - `(CI: CrCl <30 mL/min — ถ้าทำ PCI ต้องเสริม UFH bolus)`
     - Reflects: (a) absolute contraindication at CrCl <30 mL/min due to renal accumulation and bleeding risk; (b) catheter thrombosis risk when Fondaparinux used as sole anticoagulant during PCI — guideline mandates a UFH bolus at the time of PCI.
  2. **Heparin IV — Updated indication label:**
     - Changed from `(กรณี GFR < 15)` → `(eGFR <15 หรือ CrCl <30 mL/min)` to clarify the two complementary thresholds used in LMWH/Fondaparinux crossover decision.
  3. **Enoxaparin label — Removed redundant "SC" from Line 1:**
     - `☐ Enoxaparin SC  ☐ 0.4 ml  ☐ 0.6 ml` → `☐ Enoxaparin  ☐ 0.4 ml  ☐ 0.6 ml`
     - "SC" is already stated explicitly on Line 2 (`SC  ☐ q 12 hr  ☐ OD × 5 Days`), making it redundant on Line 1.
  4. **Scope:** All changes applied to both dynamic print output (`getSelectedAnticoagPrintHTML()`) and blank print template (`p-anticoag` item in `ED_BLANK_PRINT`).

**Rationale:** Point-of-care guideline hints reduce cognitive load and prevent prescribing errors without requiring clinicians to recall guidelines from memory during a high-acuity resuscitation. The CrCl <30 absolute CI for Fondaparinux is the most consequential prescribing boundary and warrants explicit on-sheet notation. The PCI/UFH bolus note prevents a common gap where a patient managed conservatively on Fondaparinux is transitioned to PCI without anticoagulant bridging.

**Evidence Base:** 2025 ACC/AHA NSTE-ACS Guidelines; ESC 2023 NSTE-ACS Guidelines.

**Tests:** 138/138 pass post-change (DOM ID integrity guard confirmed).

---

### ADR-25: Real-time GRACE Calculation & Always-Visible Print Preview (2026-07-04)

**Context:** Previously, the NSTEMI order form required the clinician to press a "Calculate" button before the GRACE score, anticoagulant recommendation, and print preview were rendered. This created friction during time-critical resuscitations and required two steps to see the standing order layout.

**Decision:**

  1. **`calculateAndRender()` extracted:** The entire calculation + DOM update block was moved out of the `form.submit` event handler into a standalone `calculateAndRender()` function called on every input/radio/checkbox change event.
  2. **Real-time wiring:** All form inputs are wired via `addEventListener('input'/'change', calculateAndRender)`:
     - Text/number inputs: `hn`, `weight`, `age`, `creatinine`, `hr`, `sbp`, `troponin-h0/h1/h3`
     - Radio groups: `sex`, `asa-allergy`, `killip`, `anticoag-choice`, `enox-freq`
     - Checkboxes: `.vh-flag`, `.h1-flag`, `#cardiac-arrest`, `#st-deviation`, `#elevated-markers`, `#troponin-from-rphch`
  3. **Always-visible results panel:** `class="hidden"` removed from `#results-container`; panel is visible immediately on page load.
  4. **Submit button → Print:** Changed `type="submit"` to `type="button" onclick="window.print()"`. The `form.submit` listener now only calls `window.print()`. `@media print` CSS already hides the form and nav, so only the order sheet is printed.
  5. **Graceful degradation:** Missing inputs render as `--` instead of causing crashes. Auto-select of anticoagulant only fires when eGFR is computable, preventing overwrite of manual selection.
  6. **Anticoag hint improvements in `updateAcHints()`:**
     - Fondaparinux: 2-line hint `(Preferred — eGFR xx)` + `(CI: CrCl <30 — PCI requires UFH bolus)` in red
     - Enoxaparin: `(1 mg/kg = xx mg — GFR < 30 → once daily)` + `(0.4 ml = 40 mg, 0.6 ml = 60 mg)`
     - Heparin: plain `(eGFR <15 หรือ CrCl <30 mL/min)` — no eGFR value suffix

**Rationale:** Removing the calculate gate eliminates a cognitive step under time pressure. The standing order preview updating in real-time lets clinicians verify accuracy as they type, reducing transcription errors. The submit-to-print conversion preserves the existing button label without confusing the user while changing its purpose to the correct final action.

**Tests:** 138/138 pass post-change (DOM ID integrity guard confirmed).

---

### ADR-26: NSTEMI v2.1.1 Audit Remediation (2026-07-04)

**Context:** A post-merge audit of `orders/nstemi.html` (post-ADR-20 / v2.1) identified four findings, two of which had patient-safety implications. Documented in `PLAN-nstemi-v2.1.1-audit.md`.

**Decision — Finding 1 (Dead DOM):**

- Removed `.troponin-times` HTML block (`#screen-h0/h1/h3`) and its five CSS rules. The block was permanently frozen at `--:--` with no JS writer — dead weight from the pre-v2.0 design. ADR-20 claimed removal; this closes the gap.

**Decision — Finding 2 (Blank-first UX):**

- On cold page load (no `?print-blank-direct` URL param), `$('print-blank-btn').click()` is now called before `calculateAndRender()`. Implements the blank-first behaviour that ADR-20 documented as shipped but never implemented.

**Decision — Finding 3 (Anticoag contradiction — patient safety):**

1. **Cutoff corrected: 20 → 30.** `shared/anticoag-engine.js` `calcAnticoag()` now uses `egfr >= 30` for Fondaparinux recommendation, consistent with ADR-19 and the `CI: CrCl <30` label text. The old 20-cutoff caused the engine to auto-select Fondaparinux for eGFR 20–29 while simultaneously displaying a red contraindication for that range.
2. **Auto-select removed.** `calculateAndRender()` no longer pre-checks any anticoagulant radio button. Clinician selection is fully manual.
3. **CI disable + recommendation badge.** `updateAcHints()` now calls `_applyAcState()` which: marks Fondaparinux `ac-disabled` when eGFR < 30; marks Enoxaparin `ac-disabled` when eGFR < 15; shows `⛔ CI` badge on disabled options; shows `✅ แนะนำ` badge on the recommended option.
4. **Safety override (two-click).** First click on a CI option enters `ac-override-pending` state (orange dashed outline + warning); second click grants selection and shows `⚠️ Override — ใช้นอก guideline`.
5. **Enox frequency** auto-set by eGFR (q12h if ≥30, q24h if <30) — informational pre-fill only, not auto-selection.

**Decision — Finding 4 (print-btn missing listener):**

- `$('print-btn').addEventListener('click', () => window.print())` added. The button is outside `<form id="nstemi-form">` so the form's submit handler never fired when clicked.

**Test Gap Note:** `tests/id-integrity-guard.test.js` does not catch orphaned DOM elements or clinical-logic consistency bugs. A same-source consistency test for `calcAnticoag()` output vs. hint-label thresholds is a recommended next step.

**Evidence Base:** ADR-19 (cutoff = 30); OASIS-5 trial; 2025 ACC/AHA NSTE-ACS Guidelines; ESC 2023 NSTE-ACS Guidelines.

**Tests:** 138/138 pass post-change.

---

### ADR-27: NSTEMI v2.1.2 Re-Audit Minimal Design (2026-07-04)

**Context:** The second-pass audit of NSTEMI standing orders (`PLAN-nstemi-v2.1.1-reaudit-minimal-design.md`) identified three issues:

1. A split threshold for Fondaparinux between the screen logic (cutoff at 30) and the print logic (cutoff at 20) due to independent, disagreeing inline implementations.
2. The override-confirmation warning messages were hardcoded to Fondaparinux, leaving Enoxaparin without safety messaging when overridden.
3. Heparin hint text and print labels contained an obsolete reference to `CrCl <30 mL/min` that did not match the recommendation logic.

The duplicate Creatinine field two-way sync was explicitly retained per user request.

**Decision:**

1. **Renal Cutoff Constants:** Hoisted cutoffs to unified constants block (`FONDA_MIN_EGFR = 30` and `ENOX_MIN_EGFR = 15`) at the top of `orders/nstemi.html` script. Used these constants throughout the file (screen checks, print output, enoxaparin frequency selection, and labels).
2. **Generified Override UI:** Added `#ac-enox-ci-msg` and `#ac-enox-override-msg` elements. Updated `_applyAcState` to perform dynamic ID lookup (`ac-${drug}-ci-msg` / `ac-${drug}-override-msg`). Updated the click handler to query `[id$="-override-msg"]` within the selected label to make safety override warning messages function dynamically for both drugs.
3. **Heparin Hint Tidy:** Removed the `หรือ CrCl <30 mL/min` reference, updating Heparin labels to `(eGFR <15 mL/min)` consistently.
4. **Regression Guard:** Added a new test suite (`tests/nstemi-thresholds.test.js`) asserting constants are used and checking for hardcoded threshold literals.

**Tests:** 139/139 pass.

---

### ADR-28: NSTEMI Print Layout A4 Optimization (2026-07-04)

**Context:** The NSTEMI standing order printed output had excessive blank whitespace when rendered on a standard A4 page. Clinicians required the layout to fill the page cleanly and look professional, with space to write custom additional orders, while strictly fitting on a single page to prevent medical record split errors.

**Decision:**

1. **Moderate Typography Scale:** Scaled up the grid font size slightly to `9.5pt` and cells to `9pt` (with `line-height: 1.45;` and `margin-bottom: 4px` for list items) to fill the empty space safely without causing the 1-page document to overflow onto page 2.
2. **Flexbox-Driven Spacing & Bottom Signature Block:** Enabled Flexbox inside the column grid cells (`display: flex; flex-direction: column; height: 100%;`) and wrapped the doctor signature blocks in `.print-signature-block` with `margin-top: auto;` to anchor them flush to the bottom of the grid row.
3. **Clean Blank Space:** Inserted a flexible spacer container `.order-blank-space` (`flex-grow: 1; min-height: 20px;`) right before the signature blocks. Left it as clean blank space (no dotted lines) per user request to allow manual additions.
4. **Column 1 Unit Formatting & Nowrap:** Standardized all unit labels (`น้ำหนัก (kg)`, `eGFR (ml/min)`, `HR (bpm)`, `SBP (mmHg)`, `Cr (mg/dL)`) in parentheses immediately following the headers, removing trailing unit suffixes. Wrapped all demographics and GRACE variable lines in `white-space: nowrap` spans and shortened the blank print dotted line lengths (6 to 12 dots) to prevent the browser print engine from wrapping values to separate lines.
5. **Version Block Relocation:** Moved the version string to the bottom of Column 1 (Progress Note) and removed the `Generated: ...` date string entirely to clean up the margins.
6. **Continuation Column Signature:** Synced Column 5's doctor signature block with Column 3's format, leaving it as a single bottom-aligned line `ลงชื่อแพทย์ (ER/ward) <span class="dotted-line"></span>` for ER/ward unification.
7. **Line Wrapping & Others:** Wrapped `NSS 500 ml IV 40 ml/hr` and `Lt. arm (non-AVF)` into two lines. Wrapped the Fondaparinux PCI warning into two lines: Line 1 `(CI: CrCl <30 mL/min)` and Line 2 `(— ถ้าทำ PCI ต้องเพิ่ม UFH bolus)`. Added `☐ Admit` (bolded and 11pt) as the 6th option under `Others:`.
8. **Caching & Version:** Bumped version in `orders/nstemi.html` to `2.1.1` and `service-worker.js` `CACHE_VERSION` to `er-hub-v12`.
9. **GRACE Variables List Layout:** Removed the vertical bar `|` dividers from the GRACE variables. Structured each parameter (Age, HR, SBP, Cr, Killip, and GRACE Score) on its own separate line in the HTML, aligning the live preview and the print layouts perfectly.

**Tests:** 139/139 pass.

---

### ADR-29: NSTEMI v2.1.1 UX Polish — Mobile Layout, Button Logic & Version Text (2026-07-04)

**Context:** Three UX defects discovered during post-ADR-28 screen review:

1. The data-input section (`.patient-fields`) was unreadable on mobile viewports (≤600px) — all 7 patient fields crammed into a single flex row causing overflow and misalignment.
2. The top form button was labelled "🧮 คำนวณ GRACE Score และสร้างใบสั่งยา" but its sole function was `window.print()`. Additionally, the `print-btn` inside `#results-container` had **two** `click → window.print()` listeners wired: one in `setupCommonActions()` (`components.js`) and a duplicate in `nstemi.html` — causing two consecutive print dialogs on every press.
3. The "ล้างข้อมูล" (Clear) button called `ED_PRINT_BOOTSTRAP.clearResults()` which hides `#results-container`, making the blank print preview disappear — unexpected blank-page UX that didn't match the "reset to fresh load" expectation.
4. The print signature version block used `ESC 2023 NSTEMI Guideline` (wrong citation order per standard ESC format).

**Decision:**

1. **Mobile Responsive Layout (`@media (max-width: 600px)`):** Added to `orders/nstemi.html` `<style>` block:
   - `.patient-fields` switches from `flex` → `display: grid; grid-template-columns: 1fr 1fr` — 2-column auto-wrapping grid.
   - `.patient-field input` → `max-width: none; width: 100%` (removes the 120px cap that caused overflow).
   - Added semantic `egfr-field` class to the eGFR display field; in mobile breakpoint, `grid-column: 1` (col-left, same column as HN/Age/Cr). CSS selector uses `.patient-field.egfr-field` (not brittle inline-style attribute selector).
   - `.patient-field.asa-field` → `grid-column: 2` (col-right, same column as Weight/Sex — not spanning full row).
   - Troponin header checkbox `margin-left: auto` reset to 0 — wraps below the title instead of overflowing right.
   - Troponin H0/H1/H3 inputs (`inline-input-group`) → `flex-direction: column; width: 100%` — stack vertically on mobile.
2. **Button Logic:**
   - Renamed top-form button to `id="create-order-btn"`, label → **"🖨️ สร้างใบสั่งยา"** (reflects its sole function: trigger print). Removed `onclick="window.print()"` inline attribute; listener added in JS.
   - Removed the duplicate `$('print-btn').addEventListener('click', () => window.print())` in `nstemi.html` — `setupCommonActions()` in `components.js` is the sole owner. Resolves double-print-dialog bug.
3. **Clear Button Behaviour:** Replaced `ED_PRINT_BOOTSTRAP.clearResults()` (which hides `#results-container`) with a direct sequence: `form.reset()` → `ED_VALIDATE.clearAll()` → reset GRACE breakdown HTML → `updateLiveEGFR()` → `$('print-blank-btn').click()`. This restores the blank print preview immediately after clear, matching a cold-load experience without hiding the preview area.
4. **Version Text:** `print-signature-block` updated from 1 line (`Version: 2.1.1 | ESC 2023 NSTEMI Guidelines`) to 3 lines: `Version: 2.1.1` / `2025 ACC/AHA ACS` / `2023 ESC NSTEMI Guideline` (year-first ESC citation order).

**Evidence Base:** User QA session (2026-07-04). ESC citation format convention.

**Tests:** 139/139 pass (no logic changes — layout and UX only).

---

### ADR-32: NSTEMI Mobile UX — Column-Correct Grid Placement, Gender Radio Fix, GRACE Short Labels (2026-07-04)

**Context:** Post-ADR-31 screen QA on a 390px viewport identified three residual issues:

1. `egfr-field` (6th DOM child, even) was placed in col-2 by the `nth-child(even) { grid-column: 2 }` rule — wrong; clinically it belongs with HN / Age / Cr in col-1 (all numeric patient identifiers / lab values).
2. `asa-field` (7th DOM child, odd) was placed in col-1 by `nth-child(odd) { grid-column: 1 }` — wrong; it belongs with Weight / Sex in col-2.
3. GRACE Score Variables section (`Heart Rate (bpm)`, `SBP (mmHg)`, `Creatinine (mg/dL)`) labels were too long to share a line with the input on narrow viewports, forcing a stacked layout.

**Decision:**

1. **Grid Column Correction (`orders/nstemi.html`):** Removed dead `order` properties (not meaningful in CSS Grid). Replaced `grid-column: span 2` with explicit `grid-column: 1` on `.patient-field.egfr-field` and `grid-column: 2` on `.patient-field.asa-field`. Base rule `nth-child(odd) { grid-column: 1 }` / `nth-child(even) { grid-column: 2 }` handles the five standard fields; class overrides handle the two exceptions. Result: col-1 = HN / Age / Cr / eGFR, col-2 = Weight / Sex / ASA Allergy.
2. **Gender Radio Overflow Fix:** `.patient-field .gender-radio` set to `font-size: 13px; white-space: nowrap` inside the `@media (max-width: 600px)` block, preventing the radio labels from breaking out of the grid cell.
3. **GRACE Short Labels:** Added dual `<span class="grace-label-full">` / `<span class="grace-label-short">` pairs inside each GRACE row label. `grace-label-full` (e.g., `Heart Rate (bpm):`) shown at ≥601px; `grace-label-short` (e.g., `HR:`, `SBP:`, `Cr:`) shown at ≤600px. `.grace-inline-row` sets `flex-direction: row` on mobile so label and input stay on one line.
4. **Nav Short Title Aliases (`shared/components.js`):** `parseTitle()` now strips residual `Order` word (regex `\bOrder\b`) so `Sedation Order → Sedation`, and aliases `rt-PA Dose Calculator → rt-PA Calc`.

**Rationale:** The explicit `grid-column` class overrides are more robust than relying solely on `nth-child` parity — they are immune to DOM reordering. Dual span approach for GRACE labels avoids JavaScript and keeps the label element semantically tied to its input. Short nav title aliases eliminate the last two labels that were still too long on narrow viewports.

**Tests:** 139/139 pass (CSS and label changes only — no JS logic changed).

### ADR-33: NSTEMI Sex Radio Overflow Fix — Mobile Grid Cell Containment (2026-07-04)

**Context:** Post-ADR-32 screen QA on mobile viewport (≤600px) revealed that the "Sex" field (`patient-field:nth-child(4)`) radio labels "ชาย" / "หญิง" overflowed the right edge of the grid cell and clipped outside the page boundary. Root cause: `.patient-field .gender-radio` had `white-space: nowrap` which prevented line-wrapping, and the Sex field itself had no `flex-direction: column` constraint, allowing both radio rows to sit side-by-side beyond the `1fr` column width.

**Decision:**

1. **`.patient-field .gender-radio` rule updated** (inside `@media (max-width: 600px)`): Replaced `white-space: nowrap` with `white-space: normal`. Added `display: flex; align-items: center; gap: 4px; overflow: hidden` — each radio+label pair is now a flex row that wraps text and is clipped at the cell boundary.
2. **New `.patient-fields > .patient-field:nth-child(4)` rule** (inside `@media (max-width: 600px)`): `display: flex; flex-direction: column; align-items: flex-start; overflow: hidden; min-width: 0` — Sex field container stacks its two radio labels vertically instead of horizontally, eliminating the overflow.

**Rationale:** `min-width: 0` on a flex/grid child is required to allow the child to shrink below its intrinsic content size (browser default is `min-width: auto`). `overflow: hidden` clips any residual text that exceeds the cell. Stacking vertically (`flex-direction: column`) is the correct layout for two mutually exclusive binary options (ชาย / หญิง) in a narrow column.

**Tests:** No logic changes — CSS layout only. 139/139 pass.

### ADR-34: Drip-Calculator Redesign, SW v15, and Audit Bug Fixes (2026-07-05)

**Context:** The IV Infusion Drip Calculator (`tools/drip-calculator.html`) was revised to match stress-resistant, time-critical clinical needs. Additionally, security/UI bugs B1–B6 were identified and resolved, and the PWA update skipping model was integrated.

**Decision:**

1. **Coupled Controls & Dynamic calculations:** Replaced form submission with interactive `<input type="range">` slider and `<input type="number">` number inputs coupled together. Values are clamped to `doseRange` on input and update in real-time with 60ms debounce. Stepping buttons (`[-]` / `[+]`) enable fine touch adjustments.
2. **Safety Color Zones:** Infusion pump rate readout color changes based on max ceiling proximity: `<60%` = green (`safe`), `60-85%` = amber (`warning`), `>85%` = red (`critical` with a visual warning badge).
3. **Dynamic Concentration Units (B1) & Generalized Dual Units (B6):** Concentration labels derive the correct denominator dynamically (e.g. `mcg/mL`, `mg/mL`, `units/mL`). Drive dual-unit display from the `showDualUnits` flag coupled with `altUnit` + `altUnitFactor` in `drug-data.js`.
4. **Nitroprusside Dose alignment (B3):** Lowered Sodium Nitroprusside's minimum and default range from 0.5 to 0.25 to sync with titration guide instructions.
5. **Backward redirection (B4) & SW Update notifier (B5):** Broadened redirection to dynamic routing `?order=<slug>` $\rightarrow$ `orders/<slug>.html`. Implemented an update toast in `index.html` allowing skipWaiting command dispatch when service worker v15 updates.
6. **Dead Code removal:** Removed unused `calcBolusVolume` function from `calc-engine.js` and removed unused category classes in `index.html`.

**Rationale:** The slider coupling + safety zones ensure immediate legibility and rapid clinical interaction without page reloads. Skip-waiting toasts prevent serving stale guidelines cached in previous SW versions.

**Tests:** Removed `calcBolusVolume` tests. Added Esmolol altUnit asserts in `tests/drug-data.test.js`. Created unit contract tests for coupled UI logic and weight storage in `tests/drip-calculator-ui.test.js`. All 145/145 tests pass.

### ADR-35: Drip-Calculator Control & Layout Customizations (2026-07-05)

**Context:** The emergency medicine clinical team requested further UX updates to `tools/drip-calculator.html` to optimize emergency room cognitive load and usability: (1) change the patient weight number field to a slider range of 30–250 kg with 1 decimal place, default to 50 kg; (2) remove Thai script annotations from the drug dropdown options, and make select inputs more compact; (3) default the active selection to Norepinephrine (Levophed) 4:100; (4) add Epinephrine refractory anaphylaxis preparation (1 mg/100 mL); (5) rename the titration guide to "Recommend Guide" and give it the same visual prominence as the primary result card.

**Decision:**

1. **Weight Slider:** Replaced the numeric input field with a range slider (`<input type="range" min="30" max="250" step="0.1" value="50.0">`). Added a dynamic `#weight-val` element in the label block to display the weight value.
2. **Compact Dropdowns & Clean Names:** Removed the `(${drug.thaiName})` interpolation inside option population script. Constrained `#drug-select` and `#prep-select` max-width to `250px`. Pre-selected `norepinephrine` on load.
3. **Epinephrine Refractory Anaphylaxis:** Appended `{ label: '1 mg in NSS 100 mL (10 mcg/mL) [Refractory Anaphylaxis]', concentration: 10 }` to epinephrine preparations in `shared/drug-data.js`.
4. **Recommend Guide:** Changed text header to `📝 แนวทางการบริหารยา (Recommend Guide)` and rewrote `.guide-box` styles to display a full-padding border container matching the results display layout.

**Rationale:** Using a weight slider prevents keystroke errors and decreases entry latency on touch devices. Setting Levophed as the default dropdown option and adding the refractory anaphylaxis concentration directly targets the two most common ED continuous infusion preparations, optimizing clinical response times.

**Tests:** The unit test suite asserts this logic correctly. All 145/145 tests pass.

---

### ADR-36: Audit Cleanup, Dead CSS Elimination & Regression Guard (2026-07-05)

**Context:** Following the 2026-07-05 repository deep audit, several codebase maintenance issues were identified: (1) multiple dead/unreferenced CSS rules lingered from previous layout iterations; (2) `index.html` displayed a hardcoded service worker version string mismatching `CACHE_VERSION` in `service-worker.js`; and (3) no automated testing checks existed to verify CSS code cleanliness.

**Decision:**

1. **CSS Cleanup:** Deleted unreferenced rules `.stroke-table` in [rtpa.html](file:///Users/ntwkkm/er-hub/orders/rtpa.html), `.ac-panel-disabled`, `.ac-badge-warn`, and `.patient-fields` sub-blocks in [nstemi.html](file:///Users/ntwkkm/er-hub/orders/nstemi.html), `.calculator-card` in [drip-calculator.html](file:///Users/ntwkkm/er-hub/tools/drip-calculator.html), `.ac-opt` in [heparin.html](file:///Users/ntwkkm/er-hub/orders/heparin.html), and `.sedation-card-container` in [sedation.html](file:///Users/ntwkkm/er-hub/orders/sedation.html).
2. **Braun Tokens & Tabular Numerals:** Moved Braun analogue color variables to [base.css](file:///Users/ntwkkm/er-hub/shared/base.css) and updated real-time screens ([nstemi.html](file:///Users/ntwkkm/er-hub/orders/nstemi.html) and [drip-calculator.html](file:///Users/ntwkkm/er-hub/tools/drip-calculator.html)) to use `font-variant-numeric: tabular-nums` to stabilize layout rendering.
3. **PWA Version Alignments:** Synchronized version strings to `v16` and bumped `CACHE_VERSION` in [service-worker.js](file:///Users/ntwkkm/er-hub/service-worker.js) to `er-hub-v16` to clear cached assets.
4. **Regression Guard:** Added a new test suite [dead-css-guard.test.js](file:///Users/ntwkkm/er-hub/tests/dead-css-guard.test.js) checking all worksheets and calculators for orphaned/unused CSS selector classes.

**Rationale:** Removing dead code prevents code rot and confusion for future developers. Standardizing design tokens into a shared stylesheet reduces design divergence. The `dead-css-guard` test automatically captures orphaned CSS classes, preventing regressions from shipping.

**Tests:** Added the regression guard suite [dead-css-guard.test.js](file:///Users/ntwkkm/er-hub/tests/dead-css-guard.test.js). All 153/153 tests pass.

---

### ADR-37: Drip-Calculator Input Translating, Spacing, and Bullet Choices (2026-07-05)

**Context:** The emergency medicine team requested a series of updates to `tools/drip-calculator.html` and `index.html` to improve English localization, simplify layout headings, convert select boxes to bullet choices, and fix the concentration input display.

**Decision:**

1. **Nav Spacing:** Reduced spacing between top-nav and main list content in `index.html` by decreasing `.portal-container` padding from `48px` to `16px` and `.top-nav` margin-bottom from `32px` to `16px`.
2. **Remove Headers:** Deleted redundant `<h3>` grouping titles: "1. เลือกยาและข้อมูลคนไข้" and "2. กำหนดขนาดของยา (Target Dose)", removing the dividing borders to save vertical space.
3. **English Translation:** Translated all input section labels and placeholders to English: Patient Weight (BW), Select IV Drug, Medication Formula, Target Dose, Enter dose, and Concentration.
4. **Medication Formula Bullet Choice:** Replaced the dropdown select box (`#prep-select`) with a dynamic radio button layout container (`#prep-radio-container`), and registered interactive event listeners directly on radio option creations.
5. **Concentration Display Span:** Replaced the uneditable text input box (`#concentration-display`) with a bold text span element, modifying JavaScript `.value` mutations to `.textContent`.

**Rationale:** Translating data inputs to English ensures universal terminology compliance. Dynamic radio button choices for formula selection provide faster, one-click options for clinicians compared to dropdowns. Displaying post-mix concentration as simple text (instead of a disabled input box) clarifies that the value is read-only. Removing headers eliminates redundant visual anchors, making the interface more compact.

---

### ADR-38: NSTEMI Anticoagulant Selection UX Polish & Safety Override Improvements (2026-07-05)

**Context:** The emergency room clinicians requested four updates to the NSTEMI standing order worksheet (`orders/nstemi.html`) to improve safety override interactions, clarify contraindication limits, and enable resetting selections:

1. Once selected, clinicians had no way to deselect or reset the anticoagulant radio group choice.
2. The safety override confirmed state for Fondapalinux and Enoxaparin had styling bugs: it failed to keep the on-screen and print preview checkboxes checked.
3. The override warning messages did not explicitly mention the guideline thresholds.
4. Fondapalinux used an obsolete `CrCl <30 mL/min` label while eGFR was the calculated metric in use, and Enoxaparin lacked a clear `eGFR <15 mL/min` hint in its options list.

**Decision:**

1. **Reset Option:** Added a small red "ล้างตัวเลือก" (Reset Option) button next to the "Anticoagulant Selection" card header, wired to clear radio selections, hide sub-inputs, and trigger UI and print preview updates.
2. **Checked Override Bullets & highlights:** Configured the override handler to retain checked states (`☑` / selected radio) on-screen and in print preview, and kept the `.recommended` class on the print container to display normal color-fill/border highlights.
3. **Specific Override Warnings:** Replaced generic override texts with custom warnings: `"ใช้นอกGuideline ไม่ควรให้เมื่อ eGFR < 30"` for Fondapalinux, and `"ใช้นอกGuideline ไม่ควรให้เมื่อ eGFR < 15"` for Enoxaparin.
4. **eGFR Terminology & Hints:** Replaced `CrCl <30` with `eGFR <30` inside the Fondapalinux hints and print templates, and added a red `(CI: eGFR <15 mL/min)` label to Enoxaparin's on-screen options and print blocks.

**Rationale:** Enabling option resetting reduces workflow friction when a clinician decides to omit anticoagulants. Showing the checkmark (☑) and highlights ensures the selected option is clearly marked and visually distinct on the printout. Standardizing labels around eGFR keeps terms aligned with the CKD-EPI 2021 live calculations.

**Tests:** All 153/153 tests pass.

---

### ADR-40: NSTEMI DAPT Pre-treatment Loading Selection & Warnings (2026-07-05)

**Context:** The NSTEMI standing order page auto-selected the DAPT loading dose (ASA 300 mg + Clopidogrel 300 mg) by default in both screen rendering and printed output. Current clinical guidelines (ESC 2023 and ACC/AHA 2025) recommend against routine pre-treatment loading of P2Y12 inhibitors in NSTEMI patients who are planned for early invasive strategy (<24 hours) to prevent bleeding risks. Clinicians requested manual control, support for multiple P2Y12 drug types (Clopidogrel, Ticagrelor, Prasugrel), dynamic guideline hints, and warning indicators.

**Decision:**

1. **DAPT Selection UI Panel:** Added an interactive "Antiplatelet Loading (DAPT)" card next to the Anticoagulant Selection card. Integrated a "ล้างตัวเลือก" button to reset antiplatelet settings.
2. **Dynamic Clinical Recommendations:** Added logic checking patient risk (Very High/High Risk). If early invasive timeline is flagged, the panel displays a guideline alert advising holding/deferring P2Y12 loading to the Cath Lab.
3. **Prasugrel Safety Banner:** Wired warning text if Prasugrel is selected, notifying users that Prasugrel is contraindicated in prior Stroke/TIA and must not be loaded in ER.
4. **Dynamic Print Layout and Dosage Adjustments:** Updated the print output to list and dynamically check all antiplatelet loading/continuation options based on screen selection. Automatically calculated Prasugrel continuation dose (reduced to 5 mg if weight < 60 kg or age >= 75).

**Rationale:** Restraining routine pre-treatment of P2Y12 prevents bleeding complications prior to coronary angiography. Providing clear options, warning states, and dynamic advice ensures safe and guideline-compliant care in time-critical emergency scenarios.

---

### ADR-42: NSTEMI GRACE Summary 3-Column Layout & DAPT Default State Fix (2026-07-06)

**Context:** Two issues identified on the NSTEMI results panel: (1) The `.grace-summary` results row used a 2-column flex layout (Score+Risk stacked left, Breakdown right) — the risk badge was cramped beneath the score badge and the visual hierarchy was unclear. (2) The DAPT P2Y12 radio group had `Hold to Cath Lab` pre-checked by default, meaning the form was never truly blank on cold load — violating the "default = empty" principle established in ADR-41. Additionally, `p2y12Val` was referenced in `calculateAndRender()` DAPT hint logic without being declared in that scope (latent bug — worked only because `updatePrintArea` declared it separately).

**Decision:**

1. **GRACE Summary 3-Column Grid:** Changed `.grace-summary` from `display: flex; flex-wrap: wrap` to `display: grid; grid-template-columns: 1fr 3fr 2fr` — three explicit columns: (1) GRACE Score badge (1 part), (2) Risk badge (3 parts), (3) Score Breakdown table (2 parts). Risk badge `margin-top` reduced from `8px` to `0` (no longer stacked under score). Mobile breakpoint (`≤900px`) stacks to `grid-template-columns: 1fr`.

2. **DAPT Default = Empty:** Removed `checked` attribute from the `Hold to Cath Lab` P2Y12 radio. Default state is now fully unselected — no P2Y12 radio checked, ASA checkbox unchecked. `reset-dapt-btn` and `clear-btn` now set all P2Y12 radios to `r.checked = false` (was `r.checked = (r.value === 'hold')`).

3. **`p2y12Val` Scope Bug Fix:** Added `const p2y12Val = document.querySelector('input[name="dapt-p2y12"]:checked')?.value || 'hold';` at the top of the DAPT hint block in `calculateAndRender()`, before it's referenced in the hint logic. Previously the variable was only declared in `updatePrintArea()` and the hint block silently referenced an undefined variable.

4. **ASA Print Logic Unchanged:** `p-asa-stat` and `p-asa-cont` remain bound to the `daptAsa` checkbox only. Selecting a P2Y12 inhibitor does NOT auto-check ASA — the clinician must explicitly check ASA in the DAPT panel. This preserves the manual clinical decision for ASA loading.

**Rationale:** The 3-column grid gives each result component its own visual space with a clear 1:3:2 ratio — the risk badge (largest, 3 parts) is the primary clinical decision driver, the score (1 part) is the numeric input, and the breakdown (2 parts) provides the audit trail. Removing the default `checked` on Hold makes the cold-load state truly blank, matching the blank-print template and the "default = empty" UX principle. The `p2y12Val` fix prevents a potential `ReferenceError` if the hint logic is ever refactored.

**Tests:** 183/183 pass.

---

### ADR-43: NSTEMI Clear-Render Fix, Print Dedup, GRACE Summary Auto-Center Layout (2026-07-06)

**Context:** Three issues found during QA of NSTEMI results area: (1) Pressing "ล้างข้อมูล" (Clear) left the GRACE Score and risk badge showing stale values (e.g., "GRACE Score 165 🔴 HIGH RISK — coro < 24h") — the `clear-btn` handler called `form.reset()` but never re-invoked `calculateAndRender()`, so `#screen-grace` and `#screen-risk-label` kept their last-computed text. (2) Pressing "🖨️ พิมพ์ใบสั่งยา (Print Order)" triggered the print dialog twice — `print-btn` was wired via both the inline listener in `nstemi.html` (line ~1529) AND `ED_COMPONENTS.setupCommonActions()` (called at end of DOMContentLoaded in `components.js`), each adding a `click → window.print()` listener. (3) The GRACE summary results row used a fixed `grid-template-columns: 1fr 3fr 2fr` (ADR-42) which locked the three components into rigid proportions; user requested auto-centering instead.

**Decision:**

1. **Clear-Render Fix:** Added `calculateAndRender()` call in the `clear-btn` handler, positioned after `updateLiveEGFR()` and before `applyBlankTemplate()`. This re-runs the full render pipeline with empty inputs, resetting `#screen-grace` → `--`, `#screen-risk-label` → `--`, and clearing the GRACE breakdown table rows. Root cause: `form.reset()` clears input values but does not fire `input`/`change` events, so the real-time render pipeline was never triggered.

2. **Print Listener Dedup:** Removed the `ED_COMPONENTS.setupCommonActions()` call from the NSTEMI DOMContentLoaded init block (was the last line). `setupCommonActions()` in `components.js` wires `print-btn → window.print()`, which duplicated the inline listener already present in `nstemi.html`. The inline listener (wired earlier in the script block, line ~1529) is now the sole owner. `create-order-btn` listener retained (it was never in `setupCommonActions`). This is the same bug class as ADR-29 Finding 2 and ADR-31 — the duplicate was re-introduced when `setupCommonActions()` was added back during a later refactor.

3. **GRACE Summary Auto-Center Layout:** Replaced the fixed `display: grid; grid-template-columns: 1fr 3fr 2fr` (ADR-42) with `display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 24px` on `.grace-summary`. Child `<div>`s use `flex: 0 1 auto` — each component (GRACE Score badge, Risk badge, Score Breakdown table) sizes to its natural width and the row centers them as a group. Removed the stale `.grace-summary { grid-template-columns: 1fr }` rule from the `@media (max-width: 900px)` block (no longer applicable — flex wraps naturally on narrow screens). Margin changed from `20px 0` to `20px auto` for horizontal centering of the container itself.

**Rationale:** The clear-render bug is the same pattern as ADR-41 Finding 2 (reset path not re-running all render functions) — `form.reset()` is not a substitute for re-rendering. The double-print is a recurring regression: `setupCommonActions()` was designed for pages that don't wire their own print listener, but NSTEMI wires its own explicitly, making the shared call redundant and harmful. The flex auto-center layout gives the three GRACE components natural-width placement centered as a group — more flexible than the rigid 1:3:2 grid, and wraps gracefully on narrow viewports without a dedicated media query.

**Verification:** Playwright headless test confirmed: (a) `screen-grace` returns `--` and `screen-risk-label` returns `--` after clear, (b) `print-btn` click calls `window.print()` exactly 1 time (was 2 before fix). All 183 tests pass.

---

### ADR-44: Print Button Removal — Float Bar as Sole Print Trigger (2026-07-06)

**Context:** Two order pages (rtpa.html, nstemi.html) had redundant print controls: a `#print-btn` button inside `#results-container` AND the floating print action bar (`#float-print-bar` via `showFloatBar()`). Both triggered `window.print()`. On nstemi.html this caused recurring double-fire regressions (ADR-29, ADR-31, ADR-43) because `setupCommonActions()` and inline listeners both wired `#print-btn`. Separately, the drip calculator's Medication Formula radio choices displayed in a horizontal row (`flex-direction: row; flex-wrap: wrap; gap: 16px`), causing multiple preparation options to crowd onto one line — hard to scan in time-critical ED settings.

**Decision:**

1. **rtpa.html — Remove `#print-btn`:** Deleted `<button id="print-btn" class="btn btn-print">🖨️ พิมพ์ใบสั่งยา (Print Order)</button>`. The floating print action bar (shown via `showFloatBar()` in the submit handler, line 731) is now the sole print trigger. `setupCommonActions()` is still called (line 757) but its `getElementById('print-btn')` finds nothing — harmless no-op.

2. **nstemi.html — Remove `#print-btn` + dead JS wiring:** Deleted `<button type="button" id="print-btn" class="btn btn-print">🖨️ พิมพ์ใบสั่งยา (Print Order)</button>`. Deleted the inline `const pBtn = $('print-btn'); if (pBtn) pBtn.addEventListener('click', () => window.print());` wiring. Added `ED_COMPONENTS.showFloatBar()` after `calculateAndRender()` on page load — since nstemi is a real-time preview page (results always visible, no hidden state), the float bar shows immediately on load. `create-order-btn` ("🖨️ สร้างใบสั่งยา") still calls `window.print()` independently. The `setupCommonActions()` call was already removed in ADR-43.

3. **drip-calculator.html — Vertical Medication Formula layout:** Changed `#prep-radio-container` from `display: flex; flex-direction: row; flex-wrap: wrap; gap: 16px` to `display: flex; flex-direction: column; gap: 4px`. Each preparation option now appears on its own line — 1 bullet = 1 choice. Easier visual scanning when multiple preparations exist for a drug.

**Rationale:** The `#print-btn` button was redundant with the float bar on pages that already call `showFloatBar()`. Removing it eliminates the recurring double-fire bug class at the root — no button means no duplicate listener can be wired. The float bar is always visible (fixed bottom, `z-index: 1000`) and provides both "พิมพ์ทันที" and "ดู Order" actions. On nstemi.html (real-time preview), showing the float bar on page load is correct because results are always visible — there's no "generate" step to trigger `showFloatBar()`. The vertical radio layout for drip calculator preparations reduces horizontal scanning — each option is a distinct line item, matching the "1 bullet 1 ตัวเลือก" request.

**Tests:** 183/183 pass — no test changes needed (no test referenced `#print-btn` on rtpa/nstemi directly; `order-safety-guard.test.js` checks for `print-btn` lock-out patterns which don't exist on these pages).

---

### ADR-45: Drip Calculator Feature Expansion + Audit Fixes (2026-07-06)

**Context:** A comprehensive audit of `orders/rtpa.html`, `orders/nstemi.html`, and `tools/drip-calculator.html` identified several issues: (A1) `nstemi.html` loaded `anticoag-engine.js` but never called any of its functions — a dead include creating maintenance confusion (same drift root-cause class as prior anticoagulant bugs). (B1) `rtpa.html` weight input had no `min`/`max` attributes and no `ED_VALIDATE.range()` call — a typo like "655" instead of "65.5" would silently cap at 90mg with no warning. (D1) `nstemi.html` version was still 2.1.1 despite pending fixes. Separately, three feature requests for `drip-calculator.html` were pending: Levophed 16 mcg/mL preparation, bidirectional weight input (number + slider sync), and clinical-indication-based guide rendering with max dose display.

**Decision:**

1. **A1 — Remove dead `anticoag-engine.js` include from `nstemi.html`:** Deleted `<script src="../shared/anticoag-engine.js"></script>` (line 909). All anticoag/eGFR logic in nstemi uses `CLINICAL_ENGINE.calcEGFR_CKD_EPI_2021` from `clinical-engine.js` — the anticoag-engine.js functions (`calcAnticoag`, `calcEGFR_CKDEPI2021`, etc.) were never called. Eliminates 1 HTTP request and the "which file is the real source of truth?" confusion. The file remains in `shared/` and is still loaded by `orders/heparin.html` (line 260) and cached by `service-worker.js`.

2. **B1 — Add weight range validation to `rtpa.html`:** Added `min="20" max="250"` to the weight input (line 218) and `ED_VALIDATE.range('weight', 20, 250, 'Weight ต้องอยู่ในช่วง 20–250 kg')` after the existing NaN/zero check (line 678). `form-validate.js` was already loaded but its `.range()` method was never called on this page. Now matches the validation pattern used by `nstemi.html` (which uses 30–200 kg).

3. **D1 — Bump nstemi.html version 2.1.1 → 2.1.2:** Updated both the print signature block (line 796) and the navbar title (line 1657). Also bumped `drip-calculator.html` version 1.0 → 1.1 for the feature additions below.

4. **Feature 1 — Levophed 16 mcg/mL preparation:** Added `{ label: '4 mg in D5W 250 mL (16 mcg/mL)', concentration: 16 }` as the third preparation option for Norepinephrine in `shared/drug-data.js` (4,000 mcg ÷ 250 mL = 16 mcg/mL). Radio button appears as the 3rd choice after 40 and 80 mcg/mL.

5. **Feature 2 — Bidirectional weight input:** Replaced the slider-only weight control with a coupled number input (`#weight-input`) + slider (`#weight`) pair, mirroring the existing Target Dose pattern. Both inputs soft-clamp to 30–250 kg and sync bidirectionally. `triggerCalculation()` fires from either input without affecting the debounce logic.

6. **Feature 3 — Clinical indication guide + max dose display:** Added optional `indications` array field to 4 drugs (Norepinephrine, Labetalol, Nicardipine, Sodium Nitroprusside). When present, the guide box renders a `<ul>` with per-indication `<li>` entries; otherwise falls back to the existing `titrationGuide` single-line `<p>`. Every drug now shows an explicit max dose line (`⬆️ Max dose: {max} {unit}`) in red below the guide content. Changed `#guide-text` element from `<p>` to `<div>` to support the `<ul>` block content. No new data fields required beyond `indications` — max dose derives from existing `doseRange.max` + `doseUnit`.

**Rationale:** A1 eliminates a maintenance hazard — the "two eGFR/anticoag logic sets, one unused" pattern that previously caused screen-vs-print drift bugs. B1 closes a real validation gap where a weight typo produces a silently-capped dose with no user warning. The three drip calculator features add clinical utility (more preparation choices, easier weight entry, indication-specific dosing guidance) without breaking existing drugs — `indications` is optional and falls back gracefully.

**Tests:** 183/183 pass — no test changes needed. `drug-data.test.js` checks `EMERGENCY_DRUG_DATA.length === 12` (unchanged — no new drug added, only a preparation + optional field). No test asserts norepinephrine preparation count or the absence of `indications`. Syntax verified via `node --check` on both `drug-data.js` and the inline drip-calculator script.

---

### ADR-47: NSTEMI Use-Current-Time Checkbox & Troponin Box Layout (2026-07-06)

**Context:** NSTEMI was the only order page among the 5 `use-current-time` pages (pe, heparin, antivenom, nstemi, rtpa) that had the checkbox deleted in ADR-20 §3 ("Removed auto-time features") — but the ADR-20 rationale (removing auto-time for *troponin draw times*) did not apply to the *order date/time* field. The other 4 pages had the checkbox restored in a later audit (A8, W-08), but nstemi remained without it, forcing clinicians to manually write the date/time on the printed order. Additionally, the ER clinical workflow for NSTEMI prefers blank date/time by default (the order is prepared before patient arrival or vitals are confirmed), unlike the other 4 pages where auto-fill is the expected default. Separately, the troponin box layout was cramped on desktop (attempted single-line with all title + checkbox + 3 inputs in one flex row) and didn't display well.

**Decision:**

1. **Restored `use-current-time` checkbox** to `orders/nstemi.html`, placed inside the `<h3>` heading element (inline with "1. ข้อมูลผู้ป่วย") using `float:right`, with distinct typography (`font-size:12px; font-weight:normal; color:#555`) to visually separate it from the heading. No separate border-bottom — uses the h3's existing `.theme-cardiac` border.
2. **Default unchecked** — unlike pe/heparin/antivenom/rtpa (which default to `checked`), nstemi defaults to unchecked, rendering dotted lines (`....................`) in the print order date/time fields until the clinician explicitly checks the box.
3. **Wired to `updatePrintArea()`** — changed `ED_PRINT_BOOTSTRAP.getDateTimeHTML(true, now)` to `ED_PRINT_BOOTSTRAP.getDateTimeHTML($('use-current-time')?.checked, now)`, respecting the checkbox state. The optional chaining (`?.`) ensures graceful fallback if the element is absent.
4. **Wired to `change` event** — added `#use-current-time` to the `calculateAndRender` change listener querySelector, so toggling the checkbox triggers an immediate real-time preview re-render.
5. **Troponin box 2-row layout (desktop):** Row 1 (`.troponin-header`) holds the title "🧪 hs-Troponin I (ng/L)" + "เจาะ Troponin จาก รพช. แล้ว" checkbox. Row 2 (`.troponin-inputs`) holds H0/H1/H3 inputs in a single flex row (`flex-wrap:nowrap`, each `flex:1`). Shortened labels from "Troponin H0 (แรกรับ):" to "H0 (แรกรับ):" etc. since the title already says "hs-Troponin I".
6. **Troponin box 4-row layout (tablet/mobile ≤900px):** Row 1 = title + รพช. checkbox (same as desktop). Rows 2–4 = H0, H1, H3 inputs stacked vertically (`flex-direction:column`), full-width inputs.

**Rationale:** Restores parity with the other 4 pages (W-08 compliance) while respecting the NSTEMI clinical workflow preference for blank-by-default date/time. The inline-in-h3 layout with float:right saves vertical space and avoids border-bottom overlap. The 2-row troponin layout is cleaner than the cramped single-line attempt — title/checkbox on row 1, inputs on row 2 — and short labels eliminate redundant "Troponin" prefix since the title already provides context. The 4-row mobile layout (1 header + 3 stacked inputs) gives each input full width on narrow screens.

**Tests:** 199/199 pass — no test changes needed. The `use-current-time` checkbox and troponin layout are UI-only; no calculation or print logic test asserts their structure.
