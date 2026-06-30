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
- **Decision:** Remove all card descriptions, the yellow alert banner, and the section title. Cards display only icon + name + status badge + print-blank button. Cards are center-aligned with reduced padding (18px 20px) and tighter grid (280px min, 16px gap).
- **Rationale:** ER staff already know what each protocol does from the name alone. Compact cards increase scan density and reduce cognitive load during high-pressure situations.

### ADR-06: Lab/IV/O2 Print Hygiene
- **Context:** Previous print output auto-checked (☑) lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders when patient data was entered. This created a clinical risk: pre-checked orders could be misinterpreted as physician-approved.
- **Decision:** All lab investigations, IV fluids, oxygen orders, monitoring instructions, and non-drug continuation orders render as unchecked (☐) in print output regardless of whether patient data has been entered. Only drug-related orders (ASA, Clopidogrel, Fentanyl, Midazolam, Heparin dosing, Antivenom dosing, Antibiotics) auto-check (☑) based on input data.
- **Rationale:** Investigations and supportive care must be explicitly ordered by the attending physician. Pre-checking them creates medico-legal risk. Drug orders that are calculated from patient data are the system's clinical output and should remain checked.
