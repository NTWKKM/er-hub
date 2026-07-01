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
- **Decision:** Centralize all print rules in `shared/print.css` with `@page { size: A4; margin: 8mm 10mm 10mm 10mm }`. Override `body { display: block !important }` in print. Set grid to `min-width: auto; width: 100%; font-size: 8pt`. Unify all print font sizes (grid 8pt, headers 8pt, lists 8pt, fib boxes 8pt). Force black-on-white with `print-color-adjust: exact`. Stroke multi-page documents use `width: 100%` with `page-break-before: always`.
- **Rationale:** A single shared print stylesheet ensures all 7 order pages produce consistent, properly-sized A4 output. The `@page` directive gives the browser explicit paper dimensions. Overriding the screen flex layout prevents content from being squeezed into a centered column during print.
- **Update (2026-07-01):** `@page` margins adjusted to `14mm 10mm 12mm 10mm` for better top/bottom spacing. Sticker box print height increased from 20mm to 35mm to match original paper forms. Grid `page-break-inside` changed from `avoid` to `auto` to prevent overflow onto unwanted page 2.

### ADR-09: Portal Redesign — Category Groups, No Emoji, No Print-Blank Buttons
- **Context:** The original portal displayed flat grid of 7 cards with emoji icons (🧠🫀🩸🫁💊🐍🌬️) and "พิมพ์ใบสั่งยาเปล่า" buttons on each card. The emoji icons relied on platform-dependent rendering and the print-blank buttons triggered a double-print race condition (BUG-01): the iframe's `contentWindow.print()` and the child page's own `window.print()` fired simultaneously, producing two print dialogs with empty content. The early-return pattern in all 7 order files prevented event listener registration, so the `.click()` call on `print-blank-btn` was a no-op.
- **Decision:** (1) Remove all emoji from portal cards. Group cards by medical category with color-coded left borders: Cardiac (#c0392b), Pulmonary (#2980b9), Neurology (#8e44ad), Anticoagulation (#16a085), Toxicology (#d35400), Procedural (#27ae60). (2) Remove print-blank buttons from all portal cards — blank printing is accessed from within each order page's own button. (3) Fix the double-print race: move `print-blank-direct` check to the END of `DOMContentLoaded` (after all listeners are registered), call `window.print()` once (no setTimeout), and remove `iframe.contentWindow.print()` from the parent. (4) Enlarge logo from 52×52 to 88×88 with drop-shadow. (5) Add Thai subtitle to portal header.
- **Rationale:** Emoji rendering varies across OS/browsers and can appear unprofessional in a clinical setting. Category groupings improve scannability for ER staff. The print-blank button removal eliminates the race condition at the source — the child page now handles its own print, and the parent only manages iframe lifecycle via `afterprint` event. The 88px logo (native res 379×262) is within safe upscaling zone.

### ADR-10: Blank Print Clinical Safety — Hardcoded Checkbox Reset
- **Context:** When printing blank orders, hardcoded ☑ items (medications like Clopidogrel, Atorvastatin, Ativan, Augmentin) remained pre-checked because the blank print handlers only reset dynamic `id`-tagged elements, missing static HTML items without IDs. A blank order printed for a new patient could arrive with medications already checked, risking the clinician countersigning without crossing them out.
- **Decision:** Tag all non-dynamic ☑ items with unique IDs in the HTML and add explicit resets in each file's blank print handler. Affected: nstemi (12 items including ISDN, Regular diet, Record V/S, Clopidogrel, Omeprazole, Atorvastatin, Senokot, Ativan), antivenom (3 antibiotics + antivenom box `chosen` class removal), sedation (Fentanyl bolus + 2 drip box `chosen` class removal), stemi (3 monitoring items). Also fix: pe.html `p-abs-status` blank dots (was hardcoded "No"), antivenom `p-obs-neuro` display:none on blank (was unconditionally shown).
- **Rationale:** Blank orders are templates for manual clinical entry. Any pre-checked medication creates medico-legal risk if the clinician doesn't notice and countersigns without crossing it out. The fix ensures all ☑ items are explicitly unchecked (☐) when printing blank, matching the paper form's blank state.

### ADR-11: Portal Single-Grid Layout — Remove Section Titles, 3-Column, Stroke First
- **Context:** The portal used separate `grid-section-title` headers (CARDIAC / หัวใจ & หลอดเลือด, PULMONARY / ปอด, NEUROLOGY / ระบบประสาท, etc.) each followed by its own `portal-grid` container. This fragmented the layout into 7 separate grids with uneven row counts, wasted vertical space on repeated headers, and made the page visually noisy. The Thai subtitle "แผนกฉุกเฉิน โรงพยาบาลมหาราชนครราชสีมา" under the H1 also added redundant information already conveyed by the hospital logo.
- **Decision:** (1) Remove all 7 section title divs and their associated `.grid-section-title` / `.title-*` CSS classes. (2) Merge all 8 cards into a single `portal-grid` with fixed `grid-template-columns: repeat(3, 1fr)`. (3) Move Stroke FAST TRACK to first position (was under NEUROLOGY section, 3rd group). (4) Remove the Thai subtitle `<p>` from portal header. (5) Add tablet breakpoint: `@media (max-width: 900px) and (min-width: 600px)` → 2 columns. Mobile (<600px) retains 1 column. (6) Category identity is preserved via the existing color-coded left border classes (`cat-cardiac`, `cat-neuro`, etc.) — no section titles needed.
- **Rationale:** A single unified grid with 3 columns produces a clean, dense card wall that ER staff can scan in one glance. Stroke FAST TRACK as the first card reflects its clinical priority as the highest-acuity time-sensitive protocol. Removing section titles eliminates 7 header rows of vertical noise. The hospital logo already provides institutional identity, making the Thai subtitle redundant. Fixed 3-column layout ensures consistent card sizing without `auto-fill` fragmentation.
