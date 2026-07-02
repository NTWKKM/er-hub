# Domain Context & Glossary

## 1. Domain Glossary

| Term | Definition |
|---|---|
| **rt-PA (Alteplase)** | Recombinant tissue plasminogen activator. High-alert thrombolytic drug used for stroke and pulmonary embolism. Dosing: 10% bolus (truncated to 1 decimal, floor) + remainder as infusion over 60 min. Reference: AHA/ASA 2026 Guideline. |
| **Tenecteplase (TNK)** | Third-generation thrombolytic agent. Weight-dose bracketed; requires 50% dose reduction if age ≥ 75 in STEMI. Weight bracket index stored for table highlighting. |
| **Streptokinase (SK)** | Thrombolytic agent with absolute repeat contraindication within 6 months due to neutralizing antibody risk. |
| **GRACE Score** | Global Registry of Acute Coronary Events risk score, used to stratify NSTEMI patients into High, Intermediate, and Low risk. |
| **aPTT Ratio** | Activated partial thromboplastin time ratio, used for titration of intravenous Heparin drip. |
| **Hematotoxin** | Snake venom causing systemic bleeding and coagulopathy (e.g., Green Pit Viper, Russell's Viper, Malayan Pit Viper). |
| **Neurotoxin** | Snake venom causing respiratory muscle paralysis (e.g., Cobra, King Cobra, Krait). Krait species auto-check indication; non-krait explicitly unchecks. |
| **IV Drip Rate** | Volumetric rate (mL/hr) calculated based on patient weight (kg), target dose, and drug preparation concentration. Uses typed `isWeightBased`/`isPerMinute` flags (not string parsing). |
| **Standing Order** | Standardized medical protocols pre-approved by clinical departments to accelerate urgent treatment. |
| **DoseResultCard** | UI component displaying computed dose: value + unit + context (formula) + ceiling (range/max). Data-heavy pattern. |
| **SliderInput** | UI component: range slider with realtime value display. Continuous (weight) or stepped (age) depending on field. Auto-generated id for label association. |
| **useFormValidation** | React hook replacing DOM-manipulation validation. State-based: fail(), clear(), range(), min(), warn(), clearWarn(), clearAll(), registerRef(). Non-blocking. `registerRef()` exposes ref-registration API for focus-on-error. |
| **Static Export (SSG)** | Next.js `output: 'export'` generates static HTML/CSS/JS in `out/` for GitHub Pages hosting. No SSR at runtime. |
| **next-themes** | Theme management library. Dark default + light toggle via `data-theme` attribute on `<html>`. |
| **next/font/google** | Next.js font loader. Self-hosts Sarabun font (no external Google Fonts requests). Generates `--font-sarabun` CSS variable consumed by `--font-sans` token. |
| **Fail-Closed Validation** | Pattern in calcAnticoag: returns `null` for non-finite or out-of-range inputs instead of producing NaN/negative doses. |
| **Bolus Truncation** | rt-PA dosing: bolus = `Math.floor(total * 0.10 * 10) / 10` (truncate, not round). Remainder goes to infusion. Ensures bolus + infusion = total exactly. |

---

## 2. Ubiquitous Language

- **Stat Dose / Bolus:** Immediate, single-push IV injection, calculated in milligrams (mg) or micrograms (mcg) and converted to volume (mL). For rt-PA: 10% of total dose, truncated to 1 decimal place.
- **Maintenance Infusion:** Continuous IV administration regulated by infusion pumps in milliliters per hour (mL/hr). For rt-PA: total dose minus bolus, infused over 60 minutes.
- **Preparation Variant:** Custom dilution recipe (e.g., Fentanyl 5 mcg/mL vs 2 mcg/mL) affecting calculated mL/hr flow rates. Heparin bag recipe derived from selected concentration state.
- **Fibrinolysis Gate:** Safety checklists preventing critical administration errors before drug calculation output is unlocked.
- **Number + Context:** Data-heavy display pattern — computed value shown with formula (how it was derived) and ceiling (clinical max). Example: "42 mL/hr | 0.1 mcg/kg/min × 70 kg ÷ 100 | Range: 0.05–3.0".
- **Flat Nav:** Sidebar navigation without category grouping, ordered by clinical urgency (Stroke first).
- **ASA Allergy Gate:** NSTEMI page — ASA allergy radio switches antiplatelet from dual (ASA + Clopidogrel) to monotherapy (Clopidogrel only) with warning banner.

---

## 3. Architectural Decision Records (ADRs)

### ADR-01 through ADR-17: Historical (Legacy Static HTML Era)

ADRs 01–17 document decisions made during the original vanilla HTML/CSS/JS implementation. These are preserved for historical context but the codebase has been fully rewritten to Next.js (ADR-18). Key historical decisions that carry forward:

- **ADR-02: Esmolol Unit Preservation** — Still applies. Esmolol dose label uses `mg/kg/min` (matching hospital chart) with dual-unit display (`showDualUnits` flag in drug-data.ts).
- **ADR-09: No Emoji in UI** — Partially relaxed in Next.js rewrite. Emoji removed from nav and buttons per user preference (minimal UI), but clinical warning indicators (⚠️) retained for safety.
- **ADR-10: Blank Print Manifest** — Replaced by React state-based reset (useFormValidation.clearAll + component state reset). No more DOM-manipulation reset rules.
- **ADR-16: Non-blocking Validation** — Carried forward as `useFormValidation` hook. Zero `alert()` calls. Now includes `registerRef()` API for focus-on-error.
- **ADR-17: PDF Pathway** — Evolved. 3 pages open source PDFs (stemi, heparin, antivenom), 3 pages use `window.print()` on generated order markup (rtpa, pe, sedation), 2 pages use `window.print()` on blank template (rtpa, nstemi).

### ADR-18: Next.js Rewrite (2026-07-01)

- **Context:** Legacy static HTML/CSS/JS site (index.html + orders/*.html + shared/*.js) reached maintenance ceiling. 64 node:test tests, PWA service worker, no TypeScript, no component reuse.
- **Decision:** Full rewrite to Next.js 15 (App Router) with TypeScript, static export (`output: 'export'`), dark-mode data-heavy UI, sidebar navigation, realtime slider-based dose calculation.
- **Key choices:**
  - Static export (SSG) — GitHub Pages only supports static files
  - Dark default + light toggle via `next-themes` (not dark-only — user preference for toggle)
  - Sarabun font via `next/font/google` (self-hosted, no external requests — updated from manual `<link>` tags)
  - Sidebar flat nav (no category grouping, ordered by clinical urgency)
  - Single accent color (#5E6AD2 indigo — no category color borders)
  - Number + context dose display (value + unit + formula + ceiling)
  - Mixed slider types: continuous (weight 0.1 step), stepped (age 1 step), text input (HN, eGFR)
  - Print pathways: PDF blank (stemi, heparin, antivenom) + generated order print (rtpa, pe, sedation) + HTML blank (rtpa, nstemi)
  - PWA removed (no service worker, no manifest)
  - Backward compatibility redirect removed (no legacy URL support)
  - Fresh vitest tests (not ported from node:test)
  - `peaceiris/actions-gh-pages` replaced by `actions/deploy-pages@v4` (GitHub official)
- **Rationale:** Modern framework enables component reuse, TypeScript safety, test infrastructure, and CI/CD integration while maintaining static hosting compatibility. Dark mode + data-heavy UI aligns with clinical workflow (night shifts, data clarity).

### ADR-19: PR#1 Review Fixes (2026-07-01)

- **Context:** CodeRabbitAI PR review identified 25 issues across clinical bugs, accessibility, code quality, and test coverage.
- **Decision:** Fix all valid findings — clinical safety bugs first, then accessibility, then code quality, then test enhancement.
- **Key changes:**
  - **rt-PA dosing:** Corrected 15%/85% → 10%/90% split (AHA/ASA 2026 Guideline). Bolus truncated to 1 decimal (floor), remainder to infusion.
  - **STEMI:** Warning cleared on recalculation. TNK bracket index stored for table highlighting.
  - **Antivenom:** Krait auto-indication explicitly cleared on non-krait selection. Fieldset/legend + htmlFor/id for all controls.
  - **Heparin:** Stale titration result cleared on invalid input. Bag recipe derived from concentration state.
  - **NSTEMI:** ASA allergy wired to antiplatelet order logic (Clopidogrel monotherapy). eGFR blank = no result (not 0). Weight max 200kg via `maxWeight` prop. `anticoagResult` stored in state (not inline `parseFloat(egfr) || 0`).
  - **PE/Sedation:** `handlePrintOrder` uses `window.print()` instead of opening static PDF. PE regimen cards refactored to fieldset/legend + label-wrapped radios.
  - **calc-engine:** Typed `isWeightBased`/`isPerMinute` flags (not string parsing).
  - **anticoag-engine:** `calcAnticoag` fail-closed validation (returns null). `calcHeparinInitialDose` accepts `string` protocolKey with runtime validation.
  - **drug-data:** Optional `hasBolus` flag on EmergencyDrug.
  - **form-validate:** `registerRef()` API for focus-on-error.
  - **Accessibility:** All form controls have `htmlFor/id` association. Radio groups in fieldset/legend. ThemeToggle `type="button"`. `.sr-only` utility class added.
  - **Font:** `next/font/google` replaces manual Google Fonts `<link>` tags.
  - **Sidebar:** Logo path from `NEXT_PUBLIC_BASE_PATH` (not hardcoded).
  - **Tests:** 145 → 157 tests. Interaction tests added for DripCalculator, RtpaOrder dose regression, AntivenomOrder flow, PeOrder blocking, NstemiOrder ASA allergy, drug-data invariants.
- **Rationale:** Clinical safety bugs could cause patient harm. Accessibility fixes ensure screen reader compatibility. Test enhancement catches regressions in dose calculations.

### ADR-20: PR#1 Review Round 2 Fixes (2026-07-01)

- **Context:** CodeRabbitAI second review pass identified 15 additional issues across clinical safety, bugs, accessibility, and test coverage.
- **Decision:** Fix 14 of 15 findings (1 skipped: `hasBolus` fail-open — see rationale below).
- **Key changes:**
  - **NstemiOrder clopidogrel dose text:** Was always "4 เม็ด" even for age >75. Now derives from `age <= 75 ? '4' : '1'` matching the inline note.
  - **NstemiOrder eGFR validation:** `parseFloat('75abc')` accepted malformed input. Replaced with `trim()` + `Number.isFinite()` strict check.
  - **StemiOrder stale state:** `setCalculatedDose(null)` + `setShowResults(false)` added before validation early-returns to prevent stale order data.
  - **StemiOrder TNK-only fields:** `elderly` and `bracketIdx` only stored for TNK orders; SK uses `false`/`-1`. Prevents SK orders from showing "ลดขนาด TNK 50%" note.
  - **calcHeparinInitialDose guards:** Added `Object.prototype.hasOwnProperty` check for protocolKey (blocks prototype pollution) and `Number.isFinite` validation (not falsy checks).
  - **RtpaOrder submitted snapshot:** Results render from `submittedOrder` state frozen at validation time, not live form inputs. Prevents post-submit edits from altering printable order.
  - **RtpaOrder blank button:** `handlePrintBlank` now clears `showResults`/`submittedOrder` before `window.print()` so blank order prints an empty template, not the last computed snapshot.
  - **NstemiOrder blank button:** `handlePrintBlank` now clears `calculated`/`anticoagResult` before `window.print()` to prevent reprinting computed results as a blank order.
  - **Centralized doc URL helper:** Added `lib/doc-utils.ts` with `resolveDocUrl()` used by SedationOrder, PeOrder, HeparinOrder, and StemiOrder for consistent `NEXT_PUBLIC_BASE_PATH` handling.
  - **PeOrder CI accessibility:** Absolute/Relative CI checkbox groups now use `<fieldset>/<legend>` instead of plain `<div>` for screen reader group announcement.
  - **RtpaOrder radio label association:** Dose-regimen radio labels now use explicit `htmlFor`/`id` pairs matching the existing fieldset/legend structure.
  - **PatientInfoForm maxWeight:** Default changed from 150 → 200 to match STEMI validation range.
  - **registerRef wiring:** PatientInfoForm, SliderInput, RtpaOrder, HeparinOrder, PeOrder wired `validation.registerRef(fieldId, el)` to DOM inputs.
  - **AntivenomOrder krait constant:** Magic number `3` replaced with `KRAIT_INDICATION_INDEX` named constant.
  - **globals.css sr-only:** `clip: rect(0,0,0,0)` → `clip-path: inset(50%)` (modern pattern).
  - **Tests:** 157 → 159 tests. Rewrote DripCalculator reset test (proper non-default state → drug switch → verify reset). Added NstemiOrder age >75 clopidogrel regression test. Added AntivenomOrder krait auto-toggle regression test.
- **Skipped (#15 hasBolus fail-open):** The `hasBolus !== false` gate is technically fail-open, but all 12 weight-based drugs benefit from showing bolus volume (which is the current dose × weight ÷ concentration, not a separate bolus dose). Making it opt-in would require adding `hasBolus: true` to every weight-based drug — noise without behavior change. No drug is mislabeled.
- **Rationale:** Clinical safety fixes prevent incorrect dosing (clopidogrel, eGFR, heparin). Submitted snapshot prevents silent order changes after validation. registerRef wiring enables focus-on-error accessibility.

### ADR-21: PR#1 Review Round 2 Residual Fixes (2026-07-01)

- **Context:** CodeRabbitAI round 2 review had 14 findings. 8 were already fixed in commit `9c83c96` (ADR-20). Of the remaining 6: 3 valid (stale state on validation fail, HeparinOrder accessibility + base-path + emoji, PeOrder accessibility + emoji), 2 skipped (test already exists, RtpaOrder blank-print mode out of scope), 1 already resolved (RtpaOrder blank-print — ADR-20 had already changed `handlePrintBlank` to clear results before printing, so the reviewer's concern was stale). Additional items addressed: AGENTS.md PHI wording, CONTEXT.md PDF count.
- **Decision:** Fix all 3 valid findings. Skip 2. 1 already resolved by ADR-20.
- **Key changes:**
  - **AGENTS.md:** "zero PHI" → "no PHI stored or transmitted" with explicit HN sensitivity guidance.
  - **NstemiOrder:** `handleCalculate` now clears `calculated`/`anticoagResult` before validation to prevent stale recommendations. Decorative emoji removed from all buttons.
  - **RtpaOrder:** `handleSubmit` now clears `showResults`/`submittedOrder` before validation to prevent stale order snapshot. Decorative emoji removed from all buttons.
  - **HeparinOrder:** `<strong>` → `<label htmlFor>` for protocol-select and concentration-select (accessibility). Decorative emoji removed from all buttons (🧮🖨️🔄). `handlePrintBlank` PDF URL now uses `NEXT_PUBLIC_BASE_PATH` prefix.
  - **PeOrder:** Indication radio group wrapped in `<fieldset>/<legend>` with explicit `htmlFor/id` pairs. Decorative emoji removed from all buttons (🧮🖨️🗑️).
  - **SedationOrder + StemiOrder:** Decorative emoji removed from all buttons for full AGENTS.md §11 compliance across all order pages.
  - **CONTEXT.md:** ADR-17 PDF count corrected from "4 pages" to "3 pages" (stemi, heparin, antivenom).
- **Rationale:** Stale state after validation failure could mislead clinicians with outdated dose recommendations. Accessibility fixes ensure screen reader compatibility. Base-path fix prevents 404 on GitHub Pages deployment. Full emoji cleanup ensures consistent minimal clinical UI across all order pages.
