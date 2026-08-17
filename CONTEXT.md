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
| **Active / Prototype Release States** | Classification of portal hub items. Active releases (rt-PA, NSTEMI, Anaphylaxis, T1 Drip Calc, T2 NIHSS, T3 Home Meds, T5 Score Hub, T6 TB Calc, T8 RSI, T9 Resus Timer) are production-ready (displayed directly in the Active section). Prototypes (STEMI, PE, Heparin, Antivenom, Sedation, T4 ER Note, T7 MgSO4) are under evaluation (in the collapsible Prototype section). |
| **Anaphylaxis** | Life-threatening systemic hypersensitivity reaction. First-line therapy is immediate Epinephrine IM (1:1000) 0.01 mg/kg (adult 0.3–0.5 mg, peds max 0.3 mg) into mid-outer thigh. |
| **RSI (Rapid Sequence Intubation)** | High-risk emergency airway management procedure utilizing simultaneous administration of an induction agent and neuromuscular blocking paralytic to rapidly secure the airway while minimizing aspiration risk. |
| **SOAP-ME** | Standardized pre-intubation safety checklist acronym: Suction, Oxygen, Airway, Pharmacy/Positioning, Monitoring, Equipment. |
| **Resuscitation Timer (Code Timer)** | Real-time clinical timer for cardiac arrest resuscitation adhering to ACLS guidelines (2-minute rhythm/pulse checks, q3-5m Epinephrine reminders, defibrillation log). |
| **Tall-Man Lettering** | Practice of using capitalized letters within drug names (e.g., `DOBUTamine` vs `DOPamine`) to highlight differences in look-alike, sound-alike (LASA) high-alert medications and reduce medication errors (ISMP standard). |

## Ubiquitous Language

| Term | Code Symbol | Location |
| --- | --- | --- |
| Patient identifier | `hn` | All order pages, ER NOTE patient strip |
| Weight | `weight` | drip-calculator, nstemi, rtpa |
| Age | `age` | nstemi, stemi |
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
| Blank print manifest | `ED_BLANK_PRINT.apply()` | `shared/blank-print-engine.js` |
| Print lifecycle | `ED_PRINT_BOOTSTRAP` | `shared/print-bootstrap.js` |
| Form validation | `ED_VALIDATE` | `shared/form-validate.js` |
| Nav injection | `ED_COMPONENTS.injectNavBar()` | `shared/components.js` |
| ER NOTE registry | `ernote-registry` (localStorage key) | `tools/er-note/er-note.js` |
| ER NOTE draft | `ernote-draft-{templateId}-{draftId}` (localStorage key) | `tools/er-note/er-note.js` |
| Investigation module | `ErNote.renderInvestigation()` | `tools/er-note/er-note.js` |
| Treatment module | `ErNote.renderTreatment()` | `tools/er-note/er-note.js` |
| Home medication draft | `er-hub-home-med-draft` (localStorage key) | `tools/Urgent-Clinic-Home-Medication.html` |

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