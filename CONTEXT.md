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
- **Decision:** Use `index.html` as the ER-Hub portal, but implement a prominent visual link at the header and automatic query routing (e.g., checking if the incoming path has a query or hash for stroke, or placing a clear rt-PA badge at the top page fold).
- **Rationale:** Minimizes disruption to emergency pathways while adopting a cleaner hierarchical codebase layout.
