# Architecture Guidelines

## 1. Core Components

| Component | Role | Dependencies |
|---|---|---|
| `app/layout.tsx` | Root layout. Sarabun font via `next/font/google` (no external requests). ThemeProvider (next-themes, dark default + light toggle, `attribute="data-theme"`). `suppressHydrationWarning` on `<html>` to suppress hydration mismatch warnings. | `next/font/google`, `next-themes`, `globals.css` |
| `app/page.tsx` | Home page. DashboardLayout wrapper with welcome card. | `DashboardLayout` |
| `app/globals.css` | Design system. Dark default + light theme tokens via `:root[data-theme='light']`. Single accent #5E6AD2. Sidebar, card, slider, dose-result, sticker-box, clinical-warning, field-error, print styles. `.sr-only` utility for accessible fieldset legends. | None |
| `components/DashboardLayout.tsx` | Layout wrapper: Sidebar + ThemeToggle + main content area. | `Sidebar`, `ThemeToggle` |
| `components/Sidebar.tsx` | Flat sidebar nav (8 items, ordered by clinical urgency: Stroke first). Hospital logo in header (28px). Active item highlighted with accent border. Logo path derived from `NEXT_PUBLIC_BASE_PATH` env var (not hardcoded). | `next/link`, `next/navigation` |
| `components/ThemeToggle.tsx` | Dark/light toggle button (`type="button"`). Uses `next-themes` `useTheme()`. Mounted check to prevent hydration mismatch. | `next-themes` |
| `components/SliderInput.tsx` | Labeled range slider with realtime value display. Auto-generated `id` from label text for `htmlFor` association. Used for weight (continuous 0.1 step) and age (stepped 1 step). Accepts optional `registerRef` + `fieldId` props for focus-on-error wiring. | None |
| `components/DoseResultCard.tsx` | Number + context display: label, value, unit, context (formula), ceiling (range/max). Accent border + accent-bg. | None |
| `components/PatientInfoForm.tsx` | Patient info card: HN text input, eGFR text input (optional), weight slider (configurable `maxWeight` prop, default 200, NSTEMI passes 200), age slider (18-120, 1 step). All labels associated via `htmlFor/id`. Accepts optional `registerRef` callback to wire DOM refs for focus-on-error. | `SliderInput` |
| `components/StickerBox.tsx` | Dashed patient sticker box for print area. Shows HN. | None |
| `components/DripCalculator.tsx` | IV infusion drip calculator. Drug selector (12 drugs, `htmlFor/id` associated), preparation selector, weight + dose sliders, realtime drip rate + bolus volume via calcDripRate/calcBolusVolume. Passes typed flags (`isWeightBased`, `isPerMinute`) to calcDripRate. Bolus volume gated by `hasBolus !== false`. DoseResultCard for results. Dual-units display for Esmolol. | `lib/drug-data`, `lib/calc-engine`, `SliderInput`, `DoseResultCard` |
| `lib/calc-engine.ts` | TypeScript port of calcDripRate() and calcBolusVolume(). Pure functions, fully typed. `DripRateParams` supports optional `isWeightBased` and `isPerMinute` flags (falls back to `doseUnit` string parsing for backward compat). | None |
| `lib/anticoag-engine.ts` | TypeScript port of calcAnticoag(), calcHeparinInitialDose(), getHeparinTitration(), HEPARIN_STANDALONE_PROTOCOLS. Pure functions, fully typed. `calcAnticoag` returns `null` for invalid inputs (fail-closed validation). `calcHeparinInitialDose` accepts `string` protocolKey, validates own-key via `Object.prototype.hasOwnProperty` and requires `Number.isFinite` for weight/concentration (not falsy checks). | None |
| `lib/drug-data.ts` | TypeScript port of EMERGENCY_DRUG_DATA (12 drugs). Interfaces: EmergencyDrug (includes optional `hasBolus` flag), DrugPreparation, DoseRange. Clinical data unchanged from original. | None |
| `lib/form-validate.ts` | React hook `useFormValidation()`. State-based: fail(), clear(), range(), min(), warn(), clearWarn(), clearAll(), registerRef(). Exposes `registerRef(fieldId, el)` API for consumers to register DOM nodes for `fail()` focus-on-error behavior. Replaces DOM-manipulation validation with reactive pattern. | None |
| `app/orders/rtpa/page.tsx` | rt-PA Stroke FAST TRACK page. HTML blank print (window.print). Results render from `submittedOrder` snapshot (not live form state) — ensures printed order matches validated inputs. Blank-order button has separate `handlePrintBlank` handler. | `DashboardLayout`, `RtpaOrder` |
| `app/orders/stemi/page.tsx` | STEMI Standing Order page. PDF pathway (opens source PDF in new tab). Stale results cleared on validation early-return. TNK-specific fields (`elderly`, `bracketIdx`) only stored for TNK orders; SK orders use `false`/`-1`. | `DashboardLayout`, `StemiOrder` |
| `app/orders/nstemi/page.tsx` | NSTEMI Standing Order page. HTML blank print. Uses calcAnticoag for anticoagulant recommendation. ASA allergy wired to antiplatelet order logic (Clopidogrel monotherapy when allergy=yes). Weight max 200kg via `maxWeight` prop. | `DashboardLayout`, `NstemiOrder` |
| `app/orders/pe/page.tsx` | Massive PE Fibrinolysis page. PDF pathway. Regimen cards use fieldset/legend + label-wrapped radios (accessible). | `DashboardLayout`, `PeOrder` |
| `app/orders/heparin/page.tsx` | Heparin Protocol page. PDF pathway. Uses calcHeparinInitialDose + getHeparinTitration. Titration assistant (clears stale result on invalid input). Bag recipe derived from selected concentration (not hardcoded). | `DashboardLayout`, `HeparinOrder` |
| `app/orders/antivenom/page.tsx` | Antivenom Standing Order page. PDF pathway. Snake type selector, indication checkboxes, antibiotic toggle. Radio groups wrapped in fieldset/legend. Labels associated via `htmlFor/id`. Krait auto-indication uses named `KRAIT_INDICATION_INDEX` constant (not magic number). | `DashboardLayout`, `AntivenomOrder` |
| `app/orders/sedation/page.tsx` | Post-Intubation Sedation page. PDF pathway. Fentanyl + Midazolam dual-drug calculator. `handlePrintOrder` uses `window.print()` (not static PDF). | `DashboardLayout`, `SedationOrder` |
| `app/tools/drip-calculator/page.tsx` | IV Infusion Drip Calculator page. Realtime sliders, 12 drugs. | `DashboardLayout`, `DripCalculator` |
| `.github/workflows/deploy.yml` | GitHub Actions: build (npm ci + next build + vitest) → deploy to GitHub Pages via actions/deploy-pages@v4. | `out/` directory |

---

## 2. Data Flow

```mermaid
graph TD
    A[User Slider/Input] -->|Weight/Age/eGFR| B[React State useState]
    B -->|Realtime Values| C{Clinical Calculator}
    C -->|Drip Rate| D[lib/calc-engine.ts]
    C -->|Anticoagulant Dose| E[lib/anticoag-engine.ts]
    C -->|Drug Lookup| F[lib/drug-data.ts]
    D -->|Computed Values| G[DoseResultCard]
    E -->|Recommendation| G
    F -->|Drug Info| H[DripCalculator]
    G -->|Screen Display| I[User reads dose]
    I -->|Print button| J[window.print or PDF open]
```

1. **Input (`Src`):** User adjusts sliders (weight, age, dose) and text inputs (HN, eGFR) in React client components. State updates trigger realtime recalculation via `useMemo`.
2. **Clinical Processing (`Transform`):** Input values passed to `lib/calc-engine.ts` (drip rates, bolus volumes — uses typed `isWeightBased`/`isPerMinute` flags) or `lib/anticoag-engine.ts` (heparin/enoxaparin/fondaparinux dosing, titration — fail-closed validation returns null for invalid input). `lib/drug-data.ts` provides drug catalog (concentrations, dose ranges, safety warnings, optional `hasBolus` flag).
3. **Display (`Dest`):** Computed values rendered in `DoseResultCard` (value + unit + context + ceiling). Print via `window.print()` (generated order or HTML blank) or `window.open()` (source PDF in new tab).

---

## 3. Offline & Deployment

| Entity | Strategy |
|---|---|
| **Static Export** | `output: 'export'` in `next.config.ts` → `out/` directory with static HTML/CSS/JS. `basePath: '/er-hub'` for GitHub Pages subpath. `trailingSlash: true` for clean URLs. |
| **PWA** | Removed. No service worker, no manifest.json. (Previously had offline cache for ED wifi outages — dropped per rewrite scope.) |
| **GitHub Actions** | `.github/workflows/deploy.yml`: npm ci → next build → vitest → upload `out/` as Pages artifact → deploy-pages@v4. Triggers on push to main. |
| **Print Pathways** | Three pathways: (1) PDF blank (stemi, heparin, antivenom, sedation) — opens source PDF from `public/docs/` in new tab via `window.open()`. (2) HTML generated order print (rtpa, nstemi, pe, sedation) — `window.print()` on rendered order markup. (3) HTML blank print (rtpa, nstemi) — `window.print()` on rendered blank template. |
| **Font Loading** | `next/font/google` Sarabun loader (self-hosted, no external Google Fonts requests). Font variable `--font-sarabun` consumed by `--font-sans` token in globals.css. |

---

## 4. Clinical & System Warnings

- **W-01: SK Contraindication:** STEMI + PE pages block SK order generation if prior SK within 6 months is checked. Clinical warning shown, no order generated. Warning cleared on recalculation (`validation.clearWarn()` at start of handler).
- **W-02: Individualized Dosing:** Heparin page — if any bleeding risk checkbox is checked, individualized dosing warning displayed instead of auto-calculated dose.
- **W-03: Max Dose Ceilings:** calc-engine and anticoag-engine enforce clinical max doses (e.g., Heparin bolus caps, rt-PA max 90mg/50mg, Fentanyl max 500 mcg/hr). DoseResultCard shows ceiling value.
- **W-04: Antivenom Indication Gate:** At least 1 indication checkbox must be checked before antivenom order can be generated. Warning shown if none checked.
- **W-05: Antibiotic Allergy Toggle:** Antivenom page — penicillin allergy radio toggles between Augmentin (default) and Ciprofloxacin+Clindamycin (allergy alternative).
- **W-06: Krait Auto-Indication:** Antivenom page — selecting Malayan krait or Banded krait auto-checks the "krait bite" indication via named `KRAIT_INDICATION_INDEX` constant. Non-krait selection explicitly unchecks it.
- **W-07: TNK Age Dose Reduction:** STEMI page — age ≥ 75 halves TNK dose. Clopidogrel: age ≤ 75 → 4 tabs, age > 75 → 1 tab. TNK table highlights only the patient's weight bracket (`bracketIdx` stored in calculated state).
- **W-08: Print Layout:** `@media print` in globals.css hides sidebar, theme toggle, and `.no-print` elements. `@page { size: A4 portrait; margin: 0 }` for hospital record format.
- **W-09: ASA Allergy (NSTEMI):** NSTEMI page — ASA allergy radio switches antiplatelet order from ASA + Clopidogrel dual therapy to Clopidogrel monotherapy. Warning banner displayed when allergy=yes.
- **W-10: rtPA Dose Rounding:** rt-PA page — total dose at 2 decimal places, bolus truncated to 1 decimal (floor, not round), remainder goes to infusion. Reference: AHA/ASA 2026 Guideline.
- **W-11: Heparin Titration Stale State:** Heparin page — invalid aPTT/rate input clears previous titration result (`setTitrationResult(null)`) to prevent stale dosing advice.
- **W-12: Heparin Bag Recipe:** Heparin page — printed order derives bag recipe from selected concentration state (not hardcoded 10,000 units).
- **W-13: NSTEMI eGFR Validation:** NSTEMI page — eGFR input trimmed and validated with `Number.isFinite` (rejects malformed strings like "75abc"). Blank/non-numeric values return `null` (anticoagResult stays null), not 0. Prevents accidental heparin plan from invalid input.
- **W-14: Fail-Closed Anticoag:** `calcAnticoag` returns `null` for non-finite or out-of-range weight, age, or eGFR inputs. No negative or NaN outputs possible.
- **W-15: RtpaOrder Submitted Snapshot:** RtpaOrder page — results section renders from `submittedOrder` state (frozen at validation time), not live form inputs. Prevents post-submit edits from altering the printable order. Cleared on reset.
- **W-16: StemiOrder Stale State Clear:** StemiOrder page — `setCalculatedDose(null)` + `setShowResults(false)` called before validation early-returns, ensuring stale order data is never visible after a failed re-calculation.
- **W-17: calcHeparinInitialDose Own-Key Guard:** `calcHeparinInitialDose` validates `protocolKey` via `Object.prototype.hasOwnProperty` (blocks `__proto__`/`constructor` injection) and requires `Number.isFinite` for weight/concentration (not falsy checks).
- **W-18: registerRef Wiring:** PatientInfoForm, SliderInput, RtpaOrder, HeparinOrder, PeOrder wire `validation.registerRef(fieldId, el)` to DOM inputs, enabling `fail()` focus-on-error behavior.
- **W-19: StemiOrder TNK-Only Fields:** `elderly` and `bracketIdx` in calculated state are only set for TNK orders; SK orders use `false`/`-1`. Prevents SK orders from inheriting TNK metadata.