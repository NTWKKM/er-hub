# Domain Context & Glossary

Domain model and ubiquitous language for the ER Standing Order Hub — MNRH Emergency Department clinical standing order system.

## Domain Glossary

| Term | Definition |
| --- | --- |
| **Standing Order** | Standardized medical protocol pre-approved by a clinical department to accelerate urgent treatment without waiting for individual physician orders. |
| **rt-PA (Alteplase)** | Recombinant tissue plasminogen activator. High-alert thrombolytic for acute ischemic stroke and pulmonary embolism. |
| **Tenecteplase (TNK)** | Third-generation thrombolytic. Weight-based dosing; 50% dose reduction if age ≥ 75 in STEMI. |
| **Streptokinase (SK)** | Thrombolytic with absolute repeat contraindication within 6 months (neutralizing antibody risk). |
| **GRACE Score** | Global Registry of Acute Coronary Events risk score. Stratifies NSTEMI patients into Very High, High, and lower risk. |
| **CKD-EPI 2021** | Race-free creatinine-based eGFR equation. `eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^-1.200 × 0.9938^Age × (1.012 if female)`. κ = 0.7 (female) / 0.9 (male), α = -0.241 (female) / -0.302 (male). |
| **eGFR** | Estimated Glomerular Filtration Rate. Derived from creatinine + age + sex via CKD-EPI 2021. Drives anticoagulant dosing (Enoxaparin q12h vs q24h, Fondaparinux CI <30). Sole source of truth: `shared/clinical-engine.js`. |
| **aPTT Ratio** | Activated partial thromboplastin time ratio. Used for IV Heparin drip titration. |
| **Killip Class** | Heart failure severity classification (I–IV) used in GRACE score. Direct string-key lookup in `clinical-engine.js`. |
| **Hematotoxin** | Snake venom causing systemic bleeding/coagulopathy (Green Pit Viper, Russell's Viper, Malayan Pit Viper). |
| **Neurotoxin** | Snake venom causing respiratory muscle paralysis (Cobra, King Cobra, Krait). |
| **IV Drip Rate** | Volumetric rate (mL/hr) calculated from patient weight (kg), target dose, and drug preparation concentration. |
| **High-Alert Drug (HAD)** | Medication with elevated risk of patient harm. 17 HAD drugs cataloged in `shared/drug-data.js`. |
| **DAPT** | Dual Antiplatelet Therapy — ASA + P2Y12 inhibitor (Clopidogrel, Ticagrelor, Prasugrel). Used in NSTEMI/STEMI. |
| **ED NOTE** | Narrative emergency department clinical note tool (`tools/er-note/`). Per-template worksheets for structured documentation and plain-text output. |
| **NEWS2** | National Early Warning Score. 7-physiological-parameter bedside score for clinical deterioration. Embedded in sepsis template. |
| **HEART Score** | History, ECG, Age, Risk factors, Troponin. Major Adverse Cardiac Event risk stratification. Embedded in chest-pain template. |
| **Alvarado Score** | Appendicitis scoring system. Embedded in abdominal-pain template. |
| **qSOFA** | Quick Sequential Organ Failure Assessment. Per SSC 2026 guidelines, NOT recommended as a single screening tool due to low sensitivity (NEWS2/SIRS preferred for primary screening). Removed from Score Hub screening tab. |
| **RIG Dose** | Rabies Immunoglobulin dose ≈ 2 mL/kg wound infiltration, max 100 mL per episode (WHO Thailand rabies guidance). Embedded in mammalian-bite template. |
| **GCS** | Glasgow Coma Scale. Consciousness assessment (Eye 1-4, Verbal 1-5 or T, Motor 1-6; total 3-15). Embedded in trauma template with auto-total and auto-selection of disability range radio. |
| **NIHSS** | National Institutes of Health Stroke Scale. 11-item neurological deficit score (0–42). Standalone scoring worksheet (`tools/nihss.html`), linked from rtpa.html toolbar via "NIHSS เปล่า" popup button. |
| **Blank Print** | Pre-formatted standing order sheet with all calculated fields as dotted lines and all checkboxes as ☐. Four pathways: PDF open (4 pages: stemi, pe, heparin, sedation), HTML blank via `ED_BLANK_PRINT.apply()` (rtpa/nstemi/antivenom), popup print via `tools/nihss.html?print-blank-direct=true` (NIHSS), or non-destructive print blank button (Home Medication). |
| **Urgent Clinic Home Medication** | Standalone home medication and emergency immunization checklist worksheet (`tools/Urgent-Clinic-Home-Medication.html`) for discharge clinical documentation, with auto-save, plain-text clipboard copy, and A4 print blank support. |
| **Active / Prototype Release States** | Classification of portal hub items. Active releases (01 rt-PA, 02 NSTEMI, T1 Drip Calc, T2 NIHSS, T3 Electrolyte Hub, T4 Burn Hub, T5 TB Calc, T6 MgSO4, T7 Home Meds, T8 Score Hub) are production-ready (displayed directly in the Active section). Prototypes (03 STEMI, 04 PE, 05 Heparin, 06 Antivenom, 07 Sedation, 08 Anaphylaxis, T9 ER Note, T10 RSI, T11 Resus Timer) are under evaluation (in the collapsible Prototype section). |
| **Anaphylaxis** | Life-threatening systemic hypersensitivity reaction. First-line therapy is immediate Epinephrine IM (1:1000) 0.01 mg/kg (adult 0.3–0.5 mg, peds max 0.3 mg) into mid-outer thigh. |
| **RSI (Rapid Sequence Intubation)** | High-risk emergency airway management procedure utilizing simultaneous administration of an induction agent and neuromuscular blocking paralytic to rapidly secure the airway while minimizing aspiration risk. |
| **SOAP-ME** | Standardized pre-intubation safety checklist acronym: Suction, Oxygen, Airway, Pharmacy/Positioning, Monitoring, Equipment. |
| **Resuscitation Timer (Code Timer)** | Real-time clinical timer for cardiac arrest resuscitation adhering to ACLS guidelines (2-minute rhythm/pulse checks, q3-5m Epinephrine reminders, defibrillation log). |
| **Tall-Man Lettering** | Practice of using capitalized letters within drug names (e.g., `DOBUTamine` vs `DOPamine`) to highlight differences in look-alike, sound-alike (LASA) high-alert medications and reduce medication errors (ISMP standard). |
| **Lund & Browder Chart** | Age-adjusted burn surface area mapping with 6 age columns (`0`, `1`, `5`, `10`, `15`, `adult`). Primary standard for pediatric & adult %TBSA calculation. |
| **1st Degree Burn Exclusion** | Superficial burns (epidermal erythema without blisters) are excluded from resuscitative fluid calculations per ATLS 11th Edition Box 9-1. |
| **Modified Brooke / ATLS 11th Consensus** | Standard crystalloid resuscitation formula: $2\text{ mL/kg/\% TBSA}$ for adults & adolescents $\ge 13\text{y}$, $3\text{ mL/kg/\% TBSA}$ for pediatric burns $\le 12\text{y}$, and $4\text{ mL/kg/\% TBSA}$ for electrical burns across all ages. Half given in first 8 hours, half in next 16 hours. |
| **Parkland Formula** | Classic burn resuscitation formula: $4\text{ mL/kg/\% TBSA}$ of Lactated Ringer's over 24 hours. |
| **Pediatric Maintenance (D5LR / D5 0.45% NaCl)** | Mandatory dextrose-containing maintenance fluid for burned children $\le 30\text{ kg}$ calculated via Holliday-Segar (4-2-1 rule) due to limited glycogen stores. |
| **Hydroxocobalamin (Cyanokit)** | First-line cyanide antidote: $5\text{ g}$ IV over 15 min for adults; $70\text{ mg/kg}$ up to $5\text{ g}$ for pediatrics (weight cap boundary $>71.43\text{ kg}$). |
| **Hyperbaric Oxygen (HBO) Criteria** | Indicated for acute CO poisoning with $COHb > 25\%$ (non-pregnant), $COHb > 15\%$ (pregnant), loss of consciousness, severe acidosis ($pH < 7.1$), or cardiac ischemia. |

## Ubiquitous Language

| Term | Code Symbol | Location |
| --- | --- | --- |
| Patient identifier | `hn` | All order pages, ER NOTE patient strip |
| Weight | `weight` | drip-calculator, nstemi, rtpa, burn-manager |
| Age | `age` | nstemi, stemi, burn-manager |
| Sex | `sex` (radio: `male`/`female`) | nstemi |
| Creatinine | `creatinine` / `grace-creatinine` | nstemi (two-way sync) |
| eGFR | `calcEGFR()` | `shared/clinical-engine.js` |
| GRACE Score | `calcGRACE()` | `shared/clinical-engine.js` |
| Killip Class | `KILLIP_PTS` | `shared/clinical-engine.js` |
| Snake type | `snake-type` (radio: `hematotoxin`/`neurotoxin`) | `orders/antivenom.html` |
| Drip rate | `calcDripRate()` | `shared/calc-engine.js` |
| Absolute dose ceiling | `absoluteMaxPerHour` | `shared/drug-data.js` (enforced in `tools/drip-calculator.html`) |
| Heparin initial dose | `calcHeparinInitialDose()` | `shared/anticoag-engine.js` |
| Heparin titration | `getHeparinTitration()` | `shared/anticoag-engine.js` |
| Burn TBSA Calculation | `calculateTBSA()` | `shared/burn-engine.js` |
| Burn Fluid Requirements | `calculateFluidRequirements()` | `shared/burn-engine.js` |
| Pediatric Burn Maintenance | `calculatePediatricMaintenance()` | `shared/burn-engine.js` |
| Urine Output Titration | `getUrineOutputTitration()` | `shared/burn-engine.js` |
| Cyanide Antidote Dosing | `getCyanideAntidoteDosing()` | `shared/burn-engine.js` |
| CO Assessment & HBO | `getCOAssessment()` | `shared/burn-engine.js` |
| Inhalation Risk Triage | `evaluateInhalationRisk()` | `shared/burn-engine.js` |
| Sodium Correction (Hillier/Katz) | `calcCorrectedSodium()` | `shared/electrolyte-engine.js` |
| Hyponatremia Adrogué-Madias | `calcAdrogueMadias()` | `shared/electrolyte-engine.js` |
| Free Water Deficit (FWD) | `calcFreeWaterDeficit()` | `shared/electrolyte-engine.js` |
| Spot UK/UCr Ratio (ex-TTKG) | `calcSpotUKCr()` | `shared/electrolyte-engine.js` |
| Bicarbonate Deficit | `calcBicarbonateDeficit()` | `shared/electrolyte-engine.js` |
| Direct Ionized Calcium Eval | `evaluateCalcium()` | `shared/electrolyte-engine.js` |
| Modern Anion Gap & Delta-Delta | `calcAnionGap()`, `calcDeltaDelta()` | `shared/electrolyte-engine.js` |
| Blank print manifest | `ED_BLANK_PRINT.apply()` | `shared/blank-print-engine.js` |
| Print lifecycle | `ED_PRINT_BOOTSTRAP` | `shared/print-bootstrap.js` |
| Form validation | `ED_VALIDATE` | `shared/form-validate.js` |
| Nav injection | `ED_COMPONENTS.injectNavBar()` | `shared/components.js` |
| ER NOTE registry | `ernote-registry` (localStorage key) | `tools/er-note/er-note.js` |
| ER NOTE draft | `ernote-draft-{templateId}-{draftId}` (localStorage key) | `tools/er-note/er-note.js` |
| Investigation module | `ErNote.renderInvestigation()` | `tools/er-note/er-note.js` |
| Treatment module | `ErNote.renderTreatment()` | `tools/er-note/er-note.js` |
| Home medication draft | `er-hub-home-med-draft` (localStorage key) | `tools/Urgent-Clinic-Home-Medication.html` |
| Cached SW version & release date | `er-hub-cached-version` (localStorage key) | `shared/components.js`, `index.html` |

## Clinical Decision Boundaries

| Boundary | Rule | Source |
| --- | --- | --- |
| Fondaparinux CI | eGFR < 30 → contraindicated | 2025 ACC/AHA NSTE-ACS |
| Enoxaparin frequency | eGFR ≥ 30 → q12h; eGFR < 30 → q24h; eGFR < 15 → use Heparin | 2025 ACC/AHA NSTE-ACS |
| TNK age cutoff | age ≥ 75 → 50% dose reduction | ASSENT-2 / ESC |
| Clopidogrel age cutoff | age ≤ 75 → full 4 tabs (300/600 mg); age > 75 → 1 tab | PLATO-derived |
| SK repeat CI | within 6 months → absolute contraindication | Neutralizing antibody risk |
| Prasugrel restriction | Cath Lab only (workflow, not contraindication) | Clinical workflow rule |
| RIG dose | ≈ 2 mL/kg, max 100 mL per episode | WHO Thailand rabies guidance |
| ERIG auto-calc | 40 IU/kg, max 3000 IU | WHO EML + MIMS Thailand |
| HRIG auto-calc | 20 IU/kg, max 1500 IU | WHO EML + MIMS Thailand |
| Fentanyl absolute ceiling | 500 mcg/hr regardless of weight | Drug safety ceiling in `drug-data.js` `absoluteMaxPerHour` |
| Burn Fluid Age Cutoff | Age $< 13\text{y} \to 3\text{ mL/kg/\%}$; Age $\ge 13\text{y} \to 2\text{ mL/kg/\%}$ | ATLS 11th Edition Table 9-1 |
| Burn Peds Maintenance | Weight $\le 30\text{ kg} \to$ Add $D_5LR$ via 4-2-1 rule | ATLS 11th p. 139 & Table 9-1 |
| Adult Urine Output Target | $0.5\text{ mL/kg/hr}$ ($30\text{--}50\text{ mL/hr}$) | ATLS 11th Table 9-1 |
| Child Urine Output Target | $1.0\text{ mL/kg/hr}$ | ATLS 11th Table 9-1 |
| Electrical Burn Target UO | $100\text{ mL/hr}$ (Adult), $1.0\text{--}2.0\text{ mL/kg/hr}$ (Child) until pigment clears | ATLS 11th Table 9-1 |
| Hydroxocobalamin Dosing | $70\text{ mg/kg}$ up to $5000\text{ mg}$ (Capped when weight $>71.43\text{ kg}$) | Goldfrank's Toxicologic Emergencies |
| Hyponatremia 24h Ceiling | Max $\le 8\text{ mEq/L/24h}$ (Standard) / $4\text{--}6\text{ mEq/L/24h}$ (High ODS risk) | ESE/ERBP & US Hyponatremia Guidelines |
| Hyponatremia Emergency Bolus | $3\%\text{ NaCl } 100\text{--}150\text{ mL IV}$ over 10-20m (target acute $+4\text{--}6\text{ mEq/L}$) | European / US Hyponatremia Guidelines |
| Peripheral Potassium Limit | Max rate $\le 20\text{ mEq/hr}$, Max concentration $\le 40\text{ mEq/L}$ | ISMP & Clinical Practice Guidelines |
| Central Line Potassium Limit | Max rate $\le 40\text{ mEq/hr}$, Max concentration $\le 100\text{ mEq/L}$ (Telemetry) | ISMP High-Alert Drug Standards |
| DKA Bicarbonate Threshold | Bicarbonate CONTRAINDICATED if $pH \ge 6.90$; only given if $pH < 6.90$ | ADA 2024/2025 Standards of Care |
| Lactic Acidosis Bicarbonate | SSC recommends against if $pH > 7.15$; Indicated in Severe Acidemia + AKI Stage 2-3 | BICAR-ICU (Lancet 2018) & SSC 2026 |
| Calcium Measurement Standard | Direct Ionized Calcium ($iCa^{2+}$) is gold standard; Payne formula deprecated | IFCC/IOF/EFLM 2026 & KDIGO 2024 |
| Modern ISE Anion Gap Baseline | Normal reference range is $4\text{--}10\text{ mEq/L}$ ($6 \pm 3\text{ mEq/L}$) | Modern ISE Analyzers (Sadler 2020) |
| Sodium Bicarbonate Formulation | Thailand standard: $7.5\%\text{ NaHCO}_3$ ($44.6\text{ mEq} / 50\text{ mL}$ ampule, $0.893\text{ mEq/mL}$); International: $8.4\%\text{ NaHCO}_3$ ($50\text{ mEq} / 50\text{ mL}$ ampule, $1.0\text{ mEq/mL}$) | Thai GPO Drug Monograph / MIMS Thailand |
| Magnesium Repletion Rate | Max infusion rate $\le 1.0\text{ g/hr}$ (except TdP/Arrest) to prevent renal loss | Clinical Pharmacokinetics & Nephrology |
| Phosphate Precipitation Gate | $[Ca \times PO_4] \text{ product } < 55\text{ mg}^2/\text{dL}^2$ | Critical Care Nephrology Standards |

## Print Conventions

| Convention | Rule |
| --- | --- |
| Drug orders | Auto-check ☑ based on input data |
| Lab/IV/O2/monitoring | Always ☐ — never auto-checked |
| Blank print — 4 pages (stemi, pe, heparin, sedation) | Open PDF from `docs/` |
| Blank print — rtpa/nstemi/antivenom | `ED_BLANK_PRINT.apply()` → `ED_PRINT_BOOTSTRAP.showResults()` → `window.print()` |
| Blank print — NIHSS | `tools/nihss.html?print-blank-direct=true` popup → `printBlank()` (clear inputs → `recalc()` → `window.print()`) |
| rtpa "NIHSS เปล่า" button | `window.open('tools/nihss.html?print-blank-direct=true', '_blank', ...)` popup print |
| NSTEMI use-current-time | Defaults unchecked (blank dotted lines) |
| Other 4 pages use-current-time | Default checked (auto-fill current time) |
| A4 page | `@page { size: A4 portrait; margin: 0 }`, `page-break-inside: avoid` |
| Nav in print | Hidden via `@media print` |
| Home Medication print | Formats input values as dotted underlines, converting checkbox inputs into custom printed boxes with checks (✓) or blank squares. Features a "Print Blank Order" mode which saves, clears, and restores user inputs dynamically. |

## Asset Isolation Rule

ER NOTE pages must not import `shared/base.css`, `shared/components.js`, or `shared/form-validate.js`.
Shared style and behavior are provided only by `tools/er-note/er-note.css` and `tools/er-note/er-note.js`.
This keeps the narrative-note UX decoupled from the standing-order print/float-bar lifecycle.
Similarly, standalone tools in `tools/` (like `nihss.html` and `Urgent-Clinic-Home-Medication.html`) are isolated from the standing order validation and lifecycle engines, handling their own printing, copy-to-clipboard, and local draft persistence.

## ADR-27: UI/UX Unification & V2 Standalone Worksheets

- **Context**: The clinical team required a unified, simple, and elegant UI/UX across all clinical calculators, scoring tools, and standing order worksheets.
- **Decision**: 
  1. Default all clinical calculators, scoring tools, and standing orders to the Braun Warm Paper palette (`#ebe7df` background, `#ffffff` card containers, `#1a1a1a` typography, `#d8d4c8` borders).
  2. Preserved all classic original files (`rtpa.html`, `nstemi.html`, `antivenom.html`, `nihss.html`) completely untouched.
  3. Created standalone V2 worksheets (`rtpa-v2.html`, `nstemi-v2.html`, `antivenom-v2.html`, `nihss-v2.html`) equipped with responsive demographic strips, live HUDs, tactile selectors, and zero-drift A4 medical print grids.
  4. Updated `service-worker.js` cache manifest to `er-hub-v68` with complete Google Fonts stylesheet and subresource precaching to ensure 100% offline availability across all V2 assets.

## ADR-28: Interactive 3D Flip Cards for Multi-Version Protocols and Tools

- **Context**: The addition of separate V1 and V2 listings on `index.html` introduced visual clutter and duplicate numbers (01/01-O, 02/02-O, T2/T2-O, 06/06-O).
- **Decision**:
  1. Consolidated duplicate items into a single, interactive 3D flippable card component (`.flip-card-container`) for rt-PA (`01`), NSTEMI (`02`), NIHSS (`T2`), and Antivenom (`06`).
  2. Enforced that all flippable cards initialize in **V1 (Classic)** state on page load and refresh by default.
  3. Provided a tactile Braun version switch button (`.version-flip-btn`) on each card face that triggers a 520ms 3D flip animation (`rotateY(180deg)`) while preserving direct navigation on clicking the card body.
  4. Maintained full accessibility via dynamic `tabindex` and `aria-label` updates, with instant non-animated switching under `prefers-reduced-motion: reduce`.
  5. Updated `service-worker.js` offline cache version to `er-hub-v70`.

## ADR-29: Electrolyte & Acid-Base Hub Clinical Safety, Reactive Sync & Indication-Based Orders

- **Context**: Deep audit of [`tools/electrolyte-hub.html`](file:///Users/ntwkkm/er-hub/tools/electrolyte-hub.html) and [`shared/electrolyte-engine.js`](file:///Users/ntwkkm/er-hub/shared/electrolyte-engine.js) identified state desync in hypernatremia, unconditioned IV medication prescribing on print worksheets, incomplete normal lab templates for fractional excretions, and ambiguous potassium deficit displays during hyperkalemia.
- **Decision**:
  1. **Unified Reactive Hypernatremia Sync**: Integrated `hyperna-val` into the universal 2-way sync map (`syncMap`) and auto-calculated Free Water Deficit (FWD) and D5W infusion rates whenever $\text{Na}^+ > 140\text{ mEq/L}$.
  2. **Smart Indication-Based Doctor's Orders**: Replaced hardcoded print orders with dynamic clinical algorithms that only generate IV orders (3% NaCl, D5W, KCl, $\text{NaHCO}_3$, $\text{MgSO}_4$, Calcium Gluconate) when verified clinical indications exist, preventing accidental order errors.
  3. **Complete Normal Labs & Fractional Excretion Auto-Derivation**: Populated `fe-s-urea`, `fe-s-urate`, and `fe-u-ca` in normal template, with automatic fallback $\text{Serum Urea} \approx \text{BUN} \times 2.14$.
  4. **Hyperkalemia Safeguard**: Updated `calcPotassiumDeficit` to explicitly return `Hyperkalemia (>5.0 mEq/L)` with a direct pointer to the emergency protocol instead of returning normal deficit.
  5. **Smooth In-Page Reset**: Replaced `location.reload()` with non-destructive in-memory DOM reset.

## ADR-30: Electrolyte Hub Cross-Condition Contraindication Safety Gates

- **Context**: Entering hypernatremic values (e.g. $\text{Na}^+ = 160\text{ mEq/L}$) still generated active 3% NaCl bolus and Adrogué-Madias infusion rates without warning that sodium replacement is contraindicated in hypernatremia. Similar hazards existed in other tabs (e.g. IV potassium auto-calculating during hyperkalemia, IV bicarbonate calculating during alkalemia).
- **Decision**:
  1. **Sodium Safety Gate**: When $\text{Na}^+ \ge 135\text{ mEq/L}$, Part A (Hyponatremia) blocks 3% NaCl bolus (`CONTRAINDICATED`) and infusion rates (`Blocked`), displaying a prominent alert directing users to Part B for Hypernatremia Free Water Deficit.
  2. **Potassium Safety Gate**: In Part A, if $\text{K}^+ < 3.5\text{ mEq/L}$, displays a strict warning that insulin/salbutamol are contraindicated. In Part B, if $\text{K}^+ \ge 5.0\text{ mEq/L}$, blocks the IV Drip Auto-Generator with a red contraindication alert.
  3. **Acid-Base Safety Gate**: If blood $\text{pH} \ge 7.45$ (or $\text{HCO}_3^- \ge 28\text{ mEq/L}$ with $\text{pH} \ge 7.40$), blocks IV $\text{NaHCO}_3$ dosing with an alkalemia contraindication warning.
  4. **Mineral Safety Gates**: Explicitly mark IV Calcium, Magnesium, and Phosphate as strictly contraindicated when corresponding hyper-states ($\text{Hypercalcemia}$, $\text{Hypermagnesemia}$, $\text{Hyperphosphatemia}$) are present.
  5. Updated `service-worker.js` cache version to `er-hub-v84`.

## ADR-31: Promotion of T7 (MgSO4), T10 (Burn Hub), and T11 (Electrolyte Hub) to Production Active

- **Context**: Deep clinical and software audit was completed for `T7` (Obstetric MgSO4 Calculator), `T10` (Burn Management & Resuscitation Hub), and `T11` (Electrolyte & Acid-Base Hub) to verify mathematical precision, zero dead code, Zero-PHI privacy compliance, and alignment with August 2026 international guidelines (ACOG, ATLS 11th, ABA 2023, KDIGO 2024, IFCC/IOF/EFLM 2026, ADA 2024/2025, BICAR-ICU).
- **Decision**:
  1. Promoted `T7`, `T10`, and `T11` from the collapsible Prototype section to the main Active Tools list in `index.html`.
  2. Set their visual status badges to `ACTIVE`.
  3. Bumped `service-worker.js` cache version to `er-hub-v85` to ensure immediate client cache synchronization.

## ADR-32: Clinical Tools Numbering Reorganization and Priority Realignment

- **Context**: Following production promotion of the Electrolyte & Acid-Base Hub and Burn Hub, tool identifiers were fragmented across discontinuous slots. A clinically prioritized sequential reordering was requested to place high-acuity critical care tools at the forefront.
- **Decision**:
  1. **Active Tools Realigned**:
     - `T1`: IV Infusion Drip Calculator (`tools/drip-calculator.html`)
     - `T2`: NIHSS Score Sheet (`tools/nihss.html` / `tools/nihss-v2.html`)
     - `T3`: Electrolyte & Acid-Base Hub (`tools/electrolyte-hub.html`, previously T11)
     - `T4`: Burn Management & Resuscitation Hub (`tools/burn-manager.html`, previously T10)
     - `T5`: TB Weight-Based Dosing Calculator (`tools/tb-calculator.html`, previously T6)
     - `T6`: MgSO4 Calculator (`tools/mgso4-calculator.html`, previously T7)
     - `T7`: Urgent Clinic Home Medication (`tools/Urgent-Clinic-Home-Medication.html`, previously T3)
     - `T8`: Clinical Score & Risk Hub (`tools/score-hub.html`, previously T5)
  2. **Prototype Tools Realigned**:
     - `T9`: ER NOTE Tool (`tools/er-note/index.html`, previously T4)
     - `T10`: RSI Checklist (`tools/rsi-checklist.html`, previously T8)
     - `T11`: Resuscitation Timer (`tools/resus-timer.html`, previously T9)
  3. Updated `service-worker.js` cache version to `er-hub-v86` (`25/08/2569`).

## ADR-33: Clinical Guidance Refresh (BPaL/BPaLM TB Regimen, Resuscitation Patient Modes, and SSC 2026 Guidelines)

- **Context**: Recent international clinical updates (WHO 2025/2026 TB consolidated guidelines, PALS/AHA 2025/2026 resuscitation standards, and Surviving Sepsis Campaign 2026 recommendations) required integration across emergency tools without disrupting existing workflows.
- **Decision**:
  1. **MDR/RR-TB BPaL / BPaLM 6-Month Regimen**:
     - Integrated the WHO 2025/2026 6-month all-oral BPaL/BPaLM regimen into `tools/tb-calculator.html` with explicit Bedaquiline (400mg OD x2w then 200mg 3x/w), Pretomanid (200mg OD), Linezolid (600mg OD with 300mg reduction guidance), and Moxifloxacin (400mg OD for BPaLM) dosing.
     - Added mandatory ECG monitoring clinical advisory and universal EMR HIS prescription note builder support.
  2. **Resuscitation Assistant Real-time Patient Modes**:
     - Added `#patient-mode` dropdown (`Adult`, `Pediatric`, `Infant`) in `tools/resus-timer.html`.
     - Provided instant, real-time dynamic guidance: 2-thumb-encircling compressions & 1.5-inch (4 cm) depth for infants, 2-inch (5 cm) depth for children, 15:2 ratio for 2-rescuer pediatric/infant CPR, and updated respiratory arrest ventilation intervals.
  3. **Sepsis 1-Hour Bundle SSC 2026 Alignment**:
     - Updated `tools/score-hub.html` Sepsis resuscitation bundle: cautious 30 mL/kg crystalloid administration in elderly/CHF, target MAP 60–65 mmHg in patients $\ge 65$ years on Norepinephrine, and proactive Active Fluid Removal (De-resuscitation) following shock resolution.
  4. Updated `service-worker.js` offline cache version to `er-hub-v87` (`26/08/2569`).
