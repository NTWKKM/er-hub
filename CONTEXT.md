# Domain Context & Glossary

## 1. Domain Glossary

| Term | Definition |
|---|---|
| **rt-PA (Alteplase)** | Recombinant tissue plasminogen activator. High-alert thrombolytic drug used for stroke and pulmonary embolism. Dosing: 10% bolus (truncated to 1 decimal, floor) + remainder as infusion over 60 min. Reference: AHA/ASA 2026 Guideline. |
| **Tenecteplase (TNK)** | Third-generation thrombolytic agent. Weight-dose bracketed; requires 50% dose reduction if age ≥ 75 in STEMI. Weight bracket index stored for table highlighting. |
| **Streptokinase (SK)** | Thrombolytic agent with absolute repeat contraindication within 6 months due to neutralizing antibody risk. |
| **GRACE Score** | Global Registry of Acute Coronary Events risk score, used to stratify NSTEMI patients into Very High, High, and Muted risk. |
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
- **ADR-17: PDF Pathway** — Evolved. 4 pages open source PDFs (stemi, heparin, antivenom), 3 pages use `window.print()` on generated order markup (rtpa, pe, sedation), 2 pages use `window.print()` on blank template (rtpa, nstemi).

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