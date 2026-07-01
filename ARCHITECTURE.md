# Architecture Guidelines

## 1. Core Components

| Component | Role | Dependencies |
|---|---|---|
| `Hub (index.html)` | Application portal listing all ER Standing Orders and calculators. Cards grouped by medical category (Cardiac, Pulmonary, Neurology, Anticoagulation, Toxicology, Procedural, Tools) with color-coded left borders. No emoji icons, no print-blank buttons (removed per ADR-09). Header features hospital logo (88×88) with Thai subtitle. Backward-compatible redirect for legacy rTPA URLs. | None |
| `calc-engine.js` | Generic mathematical engine computing infusion drip rates (mL/hr) and loading doses (mL). | None |
| `anticoag-engine.js` | Logic engine determining Heparin/LMWH doses and titration changes based on clinical indications. | None |
| `drug-data.js` | Structured catalog of concentrations, dose limits, safety ceilings, and titration instructions for all 12 IV drugs. | None |
| `components.js` | Renders common UI elements: patient info blocks, sticker boxes, date-time inputs, top navigation bar (`injectTopNav`), floating print action bar (`showFloatBar`/`hideFloatBar`). | None |
| `orders/*.html` | Specialized clinical worksheets (rt-PA, STEMI, NSTEMI, PE, Antivenom, Heparin, Sedation) displaying forms and generating print layouts. All 7 files share a unified DOMContentLoaded pattern: listener registration → `print-blank-direct` check at end (not early-return). | `shared/base.css`, `shared/print.css`, `shared/calc-engine.js`, `shared/components.js` |

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

1. **Input Collection (`Src`):** User inputs patient variables (HN, age, weight, eGFR) and selects drug/indication options in the active worksheet.
2. **Clinical Processing (`Transform`):** Sanitized inputs are processed by `shared/calc-engine.js` or `shared/anticoag-engine.js` referencing data structures in `shared/drug-data.js`.
3. **Print Output (`Dest`):** Output values are written directly to target print containers in the DOM, then converted into an official A4 medical order sheet via the browser print driver using `shared/print.css`.

---

## 3. Offline Decisions

| Entity | Conflict Resolution | Sync Strategy |
|---|---|---|
| `Patient Form State` | Client-only state. Form resets immediately on navigation or tab close. | No server sync. Strictly offline-first. |
| `Calculation Engine` | Pure functional operations. Standard math guarantees deterministic outcomes. | Stored as local `.js` scripts. Loaded from disk. |
| `PWA Assets Cache` | Local service worker enforces version caching. | Assets cached in browser. Auto-updates on cache-busting tag change. |

---

## 4. Clinical & System Warnings

- **W-01: Absolute SK Contraindication:** Users selecting Streptokinase (SK) who flag a prior SK administration within 6 months are permanently blocked from generating the order. They must use Tenecteplase (TNK).
- **W-02: Individualized Dosing Bypass:** For Heparin and Antivenom protocols, matching any pre-defined clinical risk factors (e.g., active bleeding, platelet count < 50,000) disables automatic calculations, forcing user consultation with the attending staff.
- **W-03: Max Dose Ceilings:** The calculation engine automatically caps values at the clinical upper limit (e.g., Fentanyl drip maxed at 500 mcg/hr, rt-PA maxed at 90mg or 50mg based on regimen) to prevent accidental overdosage.
- **W-04: Print Blank Order Bypass:** Users can print empty orders via the worksheet's own "🖨️ ใบสั่งยาเปล่า (Blank Order)" button. This renders a blank preview on-screen without auto-printing; the clinician reviews and prints via the standard green print button or the floating action bar. The home portal no longer has print-blank buttons (removed per ADR-09). Both pathways bypass all screen validation constraints and output standard checklists with empty dotted lines for manual clinical entries.
- **W-05: Lab/IV/O2 Hygiene:** Lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders are always rendered as unchecked (☐) in the print output — even when patient data has been entered. Only drug-related orders (ASA, Clopidogrel, Fentanyl, Midazolam, Heparin dosing, Antivenom dosing, Antibiotics) auto-check (☑) based on input data. This prevents accidental pre-checking of investigations that must be ordered by the attending physician.
- **W-06: A4 Print Fit:** All order pages use `@page { size: A4 portrait; margin: 14mm 10mm 12mm 10mm }` with `body { display: block !important }` to override the screen flex layout. The 5-column order grid drops `min-width: 900px` in print and uses `font-size: 8pt` to fit within printable width. Grid `page-break-inside: auto` allows content to flow across pages. Stroke-specific pages (rt-PA) use `width: 100%` with `page-break-before: always` for multi-page documents. Sticker box: 58mm × 35mm (matching original paper forms).
- **W-07: Hardcoded Checkbox Reset on Blank Print:** All non-dynamic ☑ items (medications, monitoring instructions, diet orders) in the results area are tagged with IDs and explicitly reset to ☐ when printing a blank order. This prevents pre-checked medications (Clopidogrel, Ativan, Atorvastatin, Augmentin, etc.) from appearing on blank orders intended for new patients. Affected files: nstemi (12 items), antivenom (3 antibiotics + antivenom box class), sedation (Fentanyl bolus + 2 drip box classes), stemi (3 monitoring items).
- **W-08: Use-Current-Time Checkbox:** All 4 order files with the `use-current-time` checkbox (pe, heparin, antivenom, nstemi) now wire it to the date/time generation logic — when unchecked, date/time fields render as dotted lines instead of the current time. rtpa.html already implemented this pattern correctly.
- **W-09: Iframe Print Cleanup:** The home portal's `printBlankOrder()` function (retained for backward compatibility) uses `afterprint` event listener with a 5-minute fallback timeout, replacing the previous fixed 60-second timer that could destroy the iframe mid-print.
