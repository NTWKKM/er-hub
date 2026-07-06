# ER NOTE Tool — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> **Updated 2026-07-06:** Clinical guidelines refreshed via grill-me session (6 decisions). See Decision Table.

**Goal:** สร้างเครื่องมือช่วยกรอกประวัติแบบ structured สำหรับ ER (เริ่ม T2 ใน index) ที่ auto-save → copy เป็น plain text ไปลงโปรแกรมบันทึกผู้ป่วยใน

**Architecture:** Per-template split under `tools/er-note/` — no single monolithic HTML. 7 standalone template files plus a hub page, all vanilla JS, localStorage per template, no build step. Copy output = plain text สำหรับ paste. **Standalone from the main site** — no `shared/components.js`, `shared/form-validate.js`, or `shared/base.css`; shared style and common behavior live only inside `tools/er-note/er-note.css` and `tools/er-note/er-note.js` so the ER NOTE folder is fully self-contained. CSS variables copied from `shared/base.css` palette (Braun cream theme matching `index.html`).

**Tech Stack:** Single HTML · vanilla JS · Inter Tight + Sarabun fonts (CDN) · CSS variables inline (Braun-inspired theme matching `index.html` palette: `#f4f2ec`, `#ebe7df`, accent `#5E6AD2`) · **no dependency on `shared/components.js`, `shared/form-validate.js`**

**Data Reference:**
- `docs/wound-mx.md` → ATB adult/ped, RIG dosing, analgesia (Thai protocol)
- **SSC 2026 Guidelines** (Prescott et al., Crit Care Med 2026; doi:10.1097/CCM.0000000000007075) → 129 statements, 46 new — Sepsis stratified ABx, scoring tools
- **ATLS 11 (2025)** (Injury 2026;57(4):113079; PMID:41671886) → xABCDE primary survey, damage control resuscitation
- **ACC/AHA 2025 ACS Guideline** (Circulation 2025;doi:10.1161/CIR.0000000000001309) → Chest pain management, troponin algorithms
- **WHO 2018 Rabies Position Paper** (WER 2018;93:201) → PEP regimens, RIG administration
- **CDC 2024 Tetanus Prophylaxis** → Td/Tdap booster intervals, TIG indications

---

## Decision Table (Final — Updated 2026-07-06)

| # | Decision | Choice | Evidence |
|---|----------|--------|-----------|
| Q1 | ที่อยู่ | `~/er-hub/tools/er-note/index.html` | — |
| Q2 | Tech stack | Per-template split under `tools/er-note/`, **standalone from main site** (shared CSS/JS only inside `tools/er-note/`) | Codebase audit |
| Q3 | Templates | **General ER Note, Sepsis, Trauma, Mammalian Bite, Chest Pain, Abdominal Pain, Eye Injury** | — |
| Q4 | localStorage | Auto-save per field (input event) | — |
| Q5 | Copy format | Plain text `*** HEADER ***`, `## Section`, `• bullet` | — |
| Q6 | Storage keys | แยก key ต่อ template (`er-note:trauma`, etc.) | — |
| Q7 | **Trauma primary survey** | **ATLS 11 xABCDE** (x = exsanguinating hemorrhage control before Airway) + damage control resuscitation | ATLS 11 (2025), Injury 2026 |
| Q8 | Trauma secondary | Key findings + abnormal free text; head-to-toe as optional checklist | — |
| Q9 | Trauma Mx | IV/fluids, **damage control resuscitation** (TXA, MTP, permissive hypotension, 1:1:1 transfusion), imaging, analgesia, ATB, refer, OR/admit/observe/discharge, F/U | ATLS 11 |
| Q10 | **Mammalian bite** | **WHO 2018 rabies PEP** (dropdown: WHO 2018 / Thai Red Cross IPC); naive: 2-site ID D0/3/7 or 1-site IM D0/3/7+D14-28; previously immunized: abridged 1-dose D0+D3 (no RIG); RIG Cat III naive only; no eRIG skin test; **CDC 2024 tetanus** (Td/Tdap 10yr clean / 5yr dirty; TIG for dirty+unknown/incomplete); ATB from `wound-mx.md` | WHO 2018 + CDC 2024 |
| Q11 | Eye injury | VA, external, Seidel, FB, chemical, delay suture, ATB, refer | — |
| Q12 | **Sepsis** | **SSC 2026 — all relevant recs**: ABx timing (shock/probable → 1h strong, possible → 3h conditional, low → defer conditional); anaerobic stewardship (Rec 28); balanced crystalloid > NS (Rec 44) + TBI exception → NS; MAP ≥65 (Rec 13) / 60-65 elderly (Rec 14); IV corticosteroid for septic shock (Rec 79); prolonged beta-lactam infusion (Rec 33); no empiric antifungal (Rec 27); no beta-blocker for septic shock (Rec 64); HFNC P/F<200 (Rec 67); active fluid removal post-acute phase (Rec 89); NEWS/NEWS2/MEWS/SIRS (qSOFA NOT sole screening) | SSC 2026 (129 statements) |
| Q13 | Investigations | Shared component across all templates | — |
| Q14 | Draft after copy | Keep (manual clear only) | — |
| Q15 | Navigation | Tab ใหม่ `/tools/er-note/index.html` | — |
| Q16 | **Chest pain** | **ACC/AHA 2025**: oxygen not routine if SpO2 ≥90%; aspirin 162-325mg loading; ticagrelor/prasugrel preferred over clopidogrel; morphine IV 2-4mg q5-15min (max 10mg) / fentanyl 25-50μg (max 100μg); +fondaparinux; **HEART score** (ED risk tool) + TIMI (NSTEMI); troponin 0/1h or 0/2h algorithm (dropdown per lab) | ACC/AHA 2025 |
| Q17 | Abdominal pain | Location, character, signs, risk score, imaging, Mx + F/U | — |
| Q18 | Wound reference | ATB + RIG from `docs/wound-mx.md`; tetanus from CDC 2024 | — |
| Q19 | **Codebase integration** | **Standalone** — no `components.js`/`form-validate.js`; CSS palette copied from `index.html` (Braun cream `#f4f2ec`, `#ebe7df`, accent `#5E6AD2`, Inter Tight + Sarabun); **must add `tools/er-note/index.html` to `service-worker.js` cache + update `ARCHITECTURE.md`** | Codebase audit |

---

## Guideline Evidence Summary

### ATLS 11 (2025) — Key Changes
- **xABCD**E: x = exsanguinating external hemorrhage control (tourniquets, wound packing, pelvic binders) BEFORE airway
- Damage control resuscitation: permissive hypotension until hemorrhage control, minimize crystalloids, early MTP activation, balanced 1:1:1 component therapy or low-titer O-negative whole blood
- **TXA within 3 hours**: 1g bolus + 1g infusion (2g bolus for TBI)
- Video laryngoscopy preferred as primary intubation tool
- Spinal motion restriction: selective and criteria-based, deemphasis on rigid collars (especially penetrating trauma)
- TBI neuroprotective targets: SBP >100–110 mmHg (age-dependent)
- Source: ACS Sept 2025 launch; Injury 2026;57(4):113079; PMID:41671886

### SSC 2026 — Key Relevant Recommendations
| Rec | Statement | Strength |
|-----|-----------|----------|
| 7 | Blood cultures ASAP, ideally before ABx | Strong |
| 8 | Measure blood lactate | Conditional |
| 10 | 30 mL/kg IV crystalloid first 3hr for hypoperfusion/septic shock | Conditional |
| 13 | MAP target ≥65 mmHg | Strong |
| 14 | MAP 60–65 for ≥65 years | Conditional (New) |
| 16 | Septic shock: ABx immediately, ideally within 1h | Strong |
| 17 | Probable/definite sepsis without shock: ABx immediately, within 1h | Strong |
| 18 | Possible sepsis without shock: ABx within 3h if concern persists | Conditional |
| 20 | Low likelihood: defer ABx, monitor closely | Conditional |
| 27 | Suggest AGAINST empiric antifungal | Conditional |
| 28 | No anaerobic coverage if no risk factors | Conditional (New) |
| 33 | Prolonged beta-lactam infusion (after loading dose) | Strong |
| 36 | De-escalation when pathogen identified | Strong |
| 44 | Balanced crystalloids > 0.9% saline | Conditional |
| 44 remark | TBI: use 0.9% saline instead | — |
| 53 | Norepinephrine first-line (over dopamine/epinephrine) | Strong |
| 67 | HFNC > conventional oxygen (P/F <200 or SpO2/FiO2 <235) | Conditional (New) |
| 70 | Awake proning trial for non-intubated hypoxemia | Conditional (New) |
| 79 | IV corticosteroids for septic shock | Conditional |
| 89 | Active fluid removal post-acute resuscitation phase | Conditional |
| 64 | Suggest AGAINST beta-blockers for septic shock treatment | Conditional (New) |
| 27 | Suggest AGAINST empiric antifungal (case-by-case if immunosuppression, prolonged ABx, intra-abdominal) | Conditional |

### ACC/AHA 2025 ACS — Key Recommendations
- **Oxygen**: Do NOT routinely supplement if SpO2 ≥90% (DETO2X-AMI: no cardiovascular benefit, possible harm)
- **Aspirin**: Loading 162–325 mg ASAP, then daily maintenance
- **P2Y12**: Ticagrelor or prasugrel preferred over clopidogrel (for PCI patients); upstream clopidogrel/ticagrelor if angiography >24h
- **Analgesia**: Morphine IV 2–4 mg, repeat q5–15min (max 10mg); Fentanyl IV 25–50 μg (max 100 μg) — may delay oral P2Y12 absorption
- **Anticoagulation**: UFH, enoxaparin, fondaparinux (enoxaparin preferred over UFH in NSTE-ACS per meta-analyses)
- **Troponin**: ESC 0/1-hour or 0/2-hour algorithm (high-sensitivity cardiac troponin)
- **HEART score**: Not in ACC/AHA guideline but evidence-supported for ED risk stratification — retained as ED tool
- **TIMI**: Used for NSTEMI risk stratification
- **Statins**: High-intensity statin for all ACS; option for concurrent ezetimibe
- Source: Circulation 2025;doi:10.1161/CIR.0000000000001309

### WHO 2018 Rabies — Key Changes
| Category | Exposure | PEP |
|----------|----------|-----|
| Cat I | Touching/feeding, licks on intact skin | None (wash only) |
| Cat II | Minor scratches/abrasions without bleeding | Wash + vaccine (no RIG); treat as Cat III if bat |
| Cat III | Transdermal bite/scratch, mucous membrane contamination, bat contact | Wash + vaccine + **RIG (naive only)** |

- **Naive PEP (WHO 2018):** (a) 2-site ID on days 0, 3, 7 OR (b) 1-site IM on days 0, 3, 7 + final dose D14–28
- **Previously immunized** (documented PrEP or ≥2 prior PEP): **Abridged PEP — 1 dose D0 + 1 dose D3, NO RIG**
- **RIG:** Cat III naive only; administer once, preferably at PEP initiation, not >7 days after first vaccine dose
- **No eRIG skin testing** (unreliable per WHO 2018)
- **No distant IM RIG injection** — fractionate residual for other patients if aseptic
- **Thai Red Cross IPC** regimen still used in Thailand — provide as dropdown alternative

### CDC 2024 Tetanus Prophylaxis
| Vaccination History | Clean Wound | Dirty Wound |
|---------------------|-------------|-------------|
| ≥3 doses tetanus-containing | Td/Tdap if >10yr since last | Td/Tdap if >5yr since last |
| <3 doses or unknown | Td/Tdap + TIG | Td/Tdap + TIG |

- **TIG**: 250 IU IM (for dirty wound + unknown/incomplete vaccination)
- **Td/Tdap**: Tdap preferred if never received; otherwise Td or Tdap

---

## File Structure

```
er-hub/
├── tools/
│   └── er-note/
│       ├── index.html          ← hub / portal
│       ├── general-er-note.html
│       ├── sepsis.html
│       ├── trauma.html
│       ├── mammalian-bite.html
│       ├── chest-pain.html
│       ├── abdominal-pain.html
│       ├── eye-injury.html
│       ├── er-note.css         ← shared within er-note only
│       └── er-note.js          ← shared within er-note only
```
│   ├── wound-mx.md             ← ATB/RIG/analgesia reference data (Thai protocol)
│   └── wound-mx.jpg            ← visual reference (not read by tool)
├── shared/
│   └── base.css                ← NOT imported (palette copied inline)
├── service-worker.js           ← MUST UPDATE: add tools/er-note/index.html to cache list
├── index.html                  ← MUST UPDATE: add T2 entry
└── ARCHITECTURE.md             ← MUST UPDATE: add er-note component + data flow
```

---

## Template Data Architecture

### localStorage Keys

| Key | Content |
|-----|---------|
| `er-note:current-template` | active template id |
| `er-note:trauma` | full trauma draft as JSON |
| `er-note:bite` | full mammalian bite draft as JSON |
| `er-note:eye` | full eye injury draft as JSON |
| `er-note:sepsis` | full sepsis draft as JSON |
| `er-note:chest` | full chest pain draft as JSON |
| `er-note:abdomen` | full abdominal pain draft as JSON |
| `er-note:general` | full general draft as JSON |

Each draft: `JSON.stringify({ timestamp, fields: { fieldId: value, ... } })`

### Shared Investigations Component

Every template includes this section (rendered identically, different field namespacing):

```
## Investigations
- CBC: Hct____ WBC____ Plt____
- BUN/Cr: ____ / ____
- Electrolytes: Na____ K____ Cl____ HCO3____
- LFT: ____
- Imaging: [CXR / X-ray / CT-A/P]
- Cultures: [Blood / Urine / Wound] → pending / resulted
- Other: ____
```

---

## Template Breakdown

### T2 — ER NOTE Tool (index.html)

#### Shell & Navigation
- Top nav: MNRH logo + "ER NOTE" title + version
- Template tabs: 7 buttons (Trauma | Mammalian Bite | Eye Injury | Sepsis | Chest Pain | Abdominal Pain | General)
- Active tab highlighted
- Template content area below tabs

#### Each Template = same layout pattern:
1. **Header:** Template title + patient sticker area (HN / ชื่อ / อายุ / เพศ / น้ำหนัก / วันที่)
2. **Sections** (template-specific)
3. **Investigations** (shared)
4. **Action bar:** [Copy Note] [Clear Draft] [Print]

#### Copy Output Format
```
*** [TEMPLATE TITLE] ***
HN: ___ | ชื่อ: ___ | อายุ: ___ | เพศ: ___ | BW: ___ kg | วันที่: ___

## CHIEF COMPLAINT
[...]

## PHYSICAL EXAMINATION
[...]

## INVESTIGATIONS
[...]

## TREATMENT / MANAGEMENT
[...]

## ADMIT / PLAN
[...]
```

---

### Template 1: Trauma (ATLS 11 — xABCDE)

**Sections:**

1. **Chief Complaint** — free text
2. **HPI** — onset, mechanism, location, symptom evolution
3. **Primary Survey (ATLS 11 xABCDE)** — full
   - **x: Exsanguinating hemorrhage control** — tourniquet applied? wound packing? pelvic binder? (BEFORE airway)
   - A: Airway (selective c-spine motion restriction — NOT routine rigid collar per ATLS 11; GCS, voice/pain/unresponsive; video laryngoscopy preferred)
   - B: RR, SpO2, breath sounds, chest injury signs
   - C: Circulation — **damage control resuscitation**:
     - HR, BP, CRT, bleeding sites, IV access
     - **Permissive hypotension** (SBP target documented; no aggressive fluid until hemorrhage controlled)
     - **Minimize crystalloids** — blood products preferred
     - **Massive transfusion protocol (MTP) activated?** (Y/N)
     - **1:1:1 component therapy** or low-titer O-negative whole blood
     - **TXA within 3h?** (1g bolus + 1g infusion; 2g bolus if TBI)
   - D: GCS, pupils (size/react), limb movement
     - **TBI neuroprotective target: SBP >100–110 mmHg** (age-dependent)
   - E: Temp, full exposure, log-roll done (Y/N), hidden injuries
4. **Secondary Survey** — optional full head-to-toe checklist:
   - Head/scalp, Face, Neck (c-spine tenderness, trachea, JVP)
   - Chest (ribs, heart sounds)
   - Abdomen (tenderness, distension)
   - Pelvis (instability)
   - Extremities (deformity, pulse, sensation)
   - Back (log-roll, spinal tenderness)
   - → abnormal findings free text
5. **Local Wound Exam** — site, size, depth, contamination level, neurovascular status
6. **Investigations** (shared)
7. **Management:**
   - IV access / fluids (damage control: minimize crystalloid, blood products)
   - Blood products (MTP, 1:1:1, TXA)
   - Imaging orders (X-ray, CT, FAST)
   - Wound care / dressing
   - Immobilization (selective spinal motion restriction per ATLS 11)
   - Analgesia
   - ATB prophylaxis
   - Tetanus: **CDC 2024** — Td/Tdap booster (10yr clean / 5yr dirty) + TIG if dirty + unknown/incomplete
8. **Decision:**
   - [ ] OR
   - [ ] Admit: รพ. / ICU / SICU / Ward / Observation
   - [ ] Refer: ___ (specialty)
   - [ ] Discharge + F/U: วันที่ ___ / รพ. ต้นสังกัด
9. **Consult Note** — free text (record specialist response)

---

### Template 2: Mammalian Bite (WHO 2018 + CDC 2024)

**Sections:**

1. **Animal Type** — [Dog / Cat / Human / Other: ___]
2. **Circumstances** — unprovoked? / pet? / stray?
3. **Wound Location** — free text
4. **WHO Rabies Exposure Category:**
   - [ ] Cat I — แตะ/ให้อาหาร/สัตว์เลีย intact skin → ล้างทำความสะอาด, ไม่ต้องวัคซีน
   - [ ] Cat II — งับ/ข่วนไม่มีเลือดออก → ล้างแผล + วัคซีน, ไม่ต้อง RIG (treat as Cat III if bat exposure)
   - [ ] Cat III — กัดทะลุผิว/มีเลือดออก/น้ำลายเข้าเยื่อบุ/สัมผัสค้างคาว → ล้างแผล + วัคซีน + RIG (naive only)
5. **Wound Classification (Cat I/II/III):**
   - Cat I: clean → ไม่ต้อง ATB
   - Cat II: contaminated, no devitalized tissue → ATB prophylaxis
   - Cat III: dirty, puncture, devitalized, crush, >6h untreated → ATB + TIG consideration
6. **Wound characteristics:**
   - [ ] Puncture / [ ] Laceration / [ ] Crush / [ ] Avulsion
   - [ ] Devitalized tissue / [ ] Contaminated (soil/saliva/faeces)
   - [ ] >6 hours untreated
7. **Tetanus Risk Assessment (CDC 2024):**
   - Vaccination history: [ ] ≥3 doses / [ ] <3 doses or unknown / [ ] Last dose ___ years ago
   - Wound type: [ ] Clean / [ ] Dirty (tetanus-prone)
   - → **Clean wound + ≥3 doses**: Td/Tdap if >10yr since last dose
   - → **Dirty wound + ≥3 doses**: Td/Tdap if >5yr since last dose
   - → **<3 doses or unknown + any wound**: Td/Tdap + TIG (250 IU IM)
   - → **<3 doses or unknown + dirty wound**: Td/Tdap + TIG
   - Tdap preferred if never received; otherwise Td or Tdap
8. **Rabies PEP Regimen Selector:**
   - Dropdown: [ ] WHO 2018 / [ ] Thai Red Cross IPC
   - **WHO 2018 — Naive (not previously immunized):**
     - [ ] 2-site ID on days 0, 3, 7
     - [ ] 1-site IM on days 0, 3, 7 + final dose D14–28
   - **WHO 2018 — Previously immunized** (documented PrEP or ≥2 prior PEP):
     - [ ] Abridged PEP: 1 dose D0 + 1 dose D3 (**no RIG**)
   - **Thai Red Cross IPC** (alternative):
     - [ ] 2-site ID on days 0, 3, 7, 28
     - [ ] 4-site ID on day 0 (2-sites per arm), then 2-site D3, D7
9. **RIG Administration (Cat III, naive only):**
   - Type: [ ] ERIG (max 40 IU/kg) / [ ] HRIG (max 20 IU/kg)
   - **No eRIG skin test** (unreliable per WHO 2018)
   - Dose: ___ IU/kg → Total: ___ IU → ___ mL
   - Injection: infiltrate around wound (SC) — **no distant IM injection**; fractionate residual for other patients if aseptic
   - Administer once, preferably at PEP initiation, not >7 days after first vaccine dose
10. **ATB (from wound-mx.md):**
    - Non-penicillin allergy:
      - Dog bite (hand/deep): Co-amoxiclav 1g × 2 วัน, ก่อนอาหาร (10 tab)
      - Cat/fingers/general bite: Co-amoxiclav 1g × 2 (10 tab)
      - Simple bite: Amoxicillin 500mg × 3 (15 cap)
    - Penicillin allergy: Doxycycline 100mg × 2 (10 cap) หรือ Ciprofloxacin 500mg × 2 + Clindamycin 300mg × 3
    - ATB auto-selects based on animal + location + wound type
11. **Investigations** (shared)
12. **Management / Plan:**
    - Wound toilet + irrigation
    - Delayed closure if needed
    - Suture: [ ] Yes / [ ] No / [ ] Delayed (___ days)
    - F/U: วันที่ ___ + ward/ clinic
    - Admit if: Cat III + devitalized / crush / hand location / immunocompromised

---

### Template 3: Eye Injury

**Sections:**

1. **Mechanism** — [Blunt / Sharp / Chemical / FB / Thermal / Radiation]
2. **Visual Acuity** — Right: ___ Left: ___ (with pinhole)
3. **External Eye Exam:**
   - Lids: [ ] Normal / [ ] Laceration / [ ] Contusion / [ ] Emphysema
   - Conjunctiva: [ ] Normal / [ ] Subconj hemorrhage / [ ] Laceration
   - Cornea: [ ] Clear / [ ] Abrasion / [ ] Foreign body / [ ] Laceration
   - Anterior chamber: [ ] Deep / [ ] Shallow / [ ] Hyphema / [ ] Hypopyon
   - Pupil: [ ] Round / [ ] Irregular / [ ] RAPD
4. **Seidel Test** — [ ] Negative / [ ] Positive (open globe?)
5. **Foreign Body:**
   - [ ] Corneal FB / [ ] Intraocular FB (IOFB suspected)
   - [ ] Superficial FB → remove at bedside
6. **Chemical Injury:**
   - [ ] Alkali / [ ] Acid
   - Irrigation: [ ] Done / [ ] Not done
   - Duration: ___ min, Volume: ___ L
   - pH post-irrigation: ___
7. **Delay Suture Criteria (any = delay):**
   - [ ] Cornea laceration involving visual axis
   - [ ] >24h old dirty wound
   - [ ] Intraocular foreign body
   - [ ] Open globe suspected
8. **ATB:**
   - [ ] Topical: Ciprofloxacin / Ofloxacin drops
   - [ ] Systemic: Oral Ciprofloxacin / Co-amoxiclav
9. **Plan:**
   - [ ] Eye pad / shield
   - [ ] Topical cycloplegic
   - [ ] Topical ATB
   - [ ] Systemic ATB
   - [ ] Ophthalmology consult NOW
   - [ ] Ophthalmology consult (next available)
   - [ ] F/U: ___ days
10. **Investigations** (shared)

---

### Template 4: Sepsis (SSC 2026 — Full Compliance)

**Sections:**

1. **Presentation** — HPI + source suspected
2. **Screening Tools (SSC 2026 — NOT qSOFA as sole screening tool):**
   - NEWS Score: ___ / 20
   - NEWS2 Score: ___ / 20
   - MEWS: ___ / 15
   - SIRS Criteria: T___ HR___ RR___ WBC___ → SIRS ≥2: [ ] Yes / [ ] No
   - → Display all 4 scores; form highlights HIGH RISK if any tool above threshold
   - Note: qSOFA should NOT be used as the sole screening tool (SSC 2026)
3. **Stratified Antibiotic Strategy (SSC 2026 Rec 16-20):**
   - [ ] **Septic shock OR probable/definite sepsis** → ABx immediately, within 1 hour (STRONG)
   - [ ] **Possible sepsis (no shock)** → rapid investigation, ABx within 3 hours if concern persists (CONDITIONAL)
   - [ ] **Low likelihood of infection** → defer ABx, monitor closely (CONDITIONAL)
4. **Hour-1 Bundle (SSC 2026):**
   - [ ] Lactate drawn (result: ___) — serial lactate to guide resuscitation (Rec 51)
   - [ ] Blood cultures × 2 sets — ideally before ABx, but do NOT delay ABx (Rec 7)
   - [ ] Broad-spectrum ABx: [agent + dose + route] → within 1h (Rec 16/17)
   - [ ] **Prolonged beta-lactam infusion** (after loading dose) (Rec 33 — STRONG)
   - [ ] Crystalloids 30 mL/kg if hypotension/lactate >2 (Rec 10)
   - [ ] Vasopressors if MAP <65 after fluids (norepinephrine preferred — Rec 53 STRONG)
     - [ ] Central line / [ ] Peripheral line (permitted for early resuscitation)
5. **ABx Selection (SSC 2026 Stewardship — Rec 25-36):**
   - Source unknown: [Broad-spectrum carbapenem / Piperacillin-tazobactam / 3rd-gen cephalosporin]
   - Community pneumonia: [Ceftriaxone + Azithromycin / Ampicillin-sulbactam]
   - Intra-abdominal: [Pip-tazo / Ceftriaxone + Metronidazole] ← anaerobic coverage indicated (Rec 29)
   - UTI: [Ceftriaxone / Cefotaxime]
   - Skin/soft tissue: [Clindamycin + Ceftriaxone / Co-amoxiclav]
   - **Anaerobic stewardship (Rec 28):** [ ] No anaerobic coverage needed (no risk factors) / [ ] Anaerobic coverage required (intra-abdominal, deep gynecological, necrotizing soft tissue)
   - **Empiric antifungal (Rec 27):** [ ] NO — suggest against (default; consider case-by-case if immunosuppression, prolonged ABx, intra-abdominal)
   - **De-escalation (Rec 36-37):** [ ] When pathogen identified → narrow spectrum (STRONG) / [ ] No pathogen found → consider de-escalation (CONDITIONAL)
6. **Fluid Management (SSC 2026 Rec 43-48):**
   - Crystalloid: [ ] Normal Saline / [ ] Balanced crystalloid (Ringer's lactate / Plasmalyte) — **preferred (Rec 44)**
   - **Exception: TBI → use 0.9% saline (Rec 44 remark)**
   - [ ] Against starches (Rec 46 STRONG) / [ ] Against gelatin (Rec 47)
   - Cumulative input: ___ mL
   - **Dynamic measures to guide fluids** (Rec 49): [ ] Passive leg raise / [ ] Fluid bolus response / [ ] SVV/PPV
   - **Capillary refill time** as adjunct (Rec 52): CRT: ___ sec
   - **Active fluid removal** post-acute resuscitation phase (Rec 89): [ ] Required → Target: ___ mL/day diuresis
7. **Vasopressor / Haemodynamics (SSC 2026 Rec 53-58):**
   - **Norepinephrine first-line** (Rec 53 STRONG — over dopamine/epinephrine)
   - MAP target: [ ] ≥65 mmHg (Rec 13 STRONG) / [ ] 60–65 mmHg if ≥65 years (Rec 14 CONDITIONAL)
   - Norepinephrine dose: ___ mcg/min
   - Add-on: [ ] Vasopressin (Rec 56 — on escalating NE) / [ ] Epinephrine (Rec 57 — if NE+vasopressin inadequate)
   - **Cardiac dysfunction + persistent hypoperfusion** (Rec 60-61): [ ] Inotrope (dobutamine added to NE, or epinephrine alone)
   - **IV corticosteroids for septic shock** (Rec 79 CONDITIONAL): [ ] Given / [ ] Not indicated
   - **AGAINST beta-blockers for septic shock treatment** (Rec 64 — do NOT use esmolol/landiolol for septic shock)
   - **AGAINST terlipressin** (Rec 54)
8. **Respiratory Support (SSC 2026 Rec 65-70):**
   - [ ] HFNC trial → FiO2 ___ L/min
     - **Indication: P/F <200 or SpO2/FiO2 <235** (Rec 67)
     - HFNC preferred over conventional oxygen (Rec 67) AND over NIV (Rec 68)
   - [ ] Awake proning (Rec 70 — do NOT sedate for proning tolerance)
   - SpO2 target: ___% (conservative vs liberal — Rec 66, individualized)
   - [ ] Intubation if HFNC failure
9. **Investigations** (shared) + Lactate trend (0h / 6h) — serial lactate (Rec 51)
10. **Source Control (Rec 24):** [ ] Drain placed / [ ] OR (ideally within 6h) / [ ] Antibiotics alone adequate
11. **Disposition:**
    - [ ] ICU
    - [ ] High dependency / Intermediate care
    - [ ] Ward
    - [ ] Discharge with OP ATB + F/U: วันที่ ___
12. **Post-Sepsis Care (SSC 2026 — Rec 108-119, Continuity):**
    - [ ] Critical care transition program on ICU → floor transfer (Rec 108)
    - [ ] Handoff process at transitions of care (Rec 109)
    - [ ] Medication reconciliation at discharge (Rec 111-112)
    - [ ] Rehab referral for new impairments (Rec 115)
    - [ ] Sepsis education (written + verbal) before discharge (Rec 119)
    - [ ] Cognitive/psychological follow-up discussed
    - [ ] Sepsis survivor clinic referral (if available)

---

### Template 5: Chest Pain (ACC/AHA 2025)

**Sections:**

1. **HPI** — onset, character (crushing/pressure/tearing), radiation, severity (0-10), associated symptoms (diaphoresis, SOB, nausea)
2. **ECG Findings:**
   - [ ] Normal / [ ] ST elevation / [ ] ST depression / [ ] T-wave inversion / [ ] New LBBB
   - Rhythm: [ ] SR / [ ] AF / [ ] Other: ___
3. **HEART Score** (ED risk stratification tool — evidence-supported despite not in ACC/AHA guideline):
   - History: [ ] 0 (typical) / 1 / 2 (atypical) → score ___
   - ECG: [ ] 0 (normal) / 1 (non-specific) / 2 (significant) → score ___
   - Age: [ ] 0 (<45) / 1 (45-64) / 2 (≥65) → score ___
   - Risk factors: [ ] 0-1 / 1 (2-3 RF) / 2 (>3 RF) → score ___
   - Troponin: [ ] 0 (normal×2) / 1 (borderline) / 2 (elevated) → score ___
   - **Total HEART: ___ / 10** → Risk: [ ] Low (<4) / [ ] Moderate (4-6) / [ ] High (>6)
4. **Troponin Trend (ESC 0/1h or 0/2h algorithm — dropdown per lab protocol):**
   - Algorithm: [ ] ESC 0/1-hour / [ ] ESC 0/2-hour
   - 0h: ___ ng/L
   - 1h: ___ ng/L (if 0/1h algorithm)
   - 2h: ___ ng/L (if 0/2h algorithm)
5. **Risk Stratification:**
   - [ ] STEMI → activate cath lab
   - [ ] NSTEMI → TIMI risk score: ___ / 14
   - [ ] Unstable angina
   - [ ] Non-ACS chest pain
6. **Initial Management (ACC/AHA 2025):**
   - [ ] **Oxygen: ONLY if SpO2 <90%** (do NOT routinely supplement if ≥90% — DETO2X-AMI)
   - [ ] **ASA 162–325mg** chew (loading dose)
   - [ ] **P2Y12 (ticagrelor/prasugrel PREFERRED over clopidogrel):**
     - [ ] Ticagrelor 180mg loading
     - [ ] Prasugrel 60mg loading (if ≤75yr; 5mg if >75yr)
     - [ ] Clopidogrel 300–600mg loading (if upstream needed and angiography >24h)
   - [ ] Anticoagulation: [ ] UFH / [ ] Enoxaparin / [ ] Fondaparinux
   - [ ] **Analgesia (with dose):**
     - [ ] Morphine IV 2–4mg, repeat q5–15min (max 10mg)
     - [ ] Fentanyl IV 25–50μg, repeat if needed (max 100μg)
     - ⚠️ May delay oral P2Y12 absorption
   - [ ] Beta-blocker (if no contraindication — no Killip ≥II, no bradycardia, no hypotension)
   - [ ] High-intensity statin loading (atorvastatin 80mg or rosuvastatin 40mg)
   - [ ] ACE inhibitor (if LVEF ≤40%, HTN, DM, anterior STEMI)
7. **Investigations** (shared) + Cardiac enzymes + BNP
8. **Decision:**
   - [ ] Cath lab activation
   - [ ] ICU/CCU
   - [ ] Ward admission
   - [ ] Observation unit
   - [ ] Discharge with F/U: วันที่ ___ / รพ. ต้นสังกัด
   - [ ] Refer: ___
9. **Consult Note** — specialist response

---

### Template 6: Abdominal Pain

**Sections:**

1. **HPI** — location (RUQ/LUQ/RLQ/LLQ/epigastric/periumbilical/suprapubic), onset, character (colicky/constant/aching), severity, aggravating/relieving factors
2. **Associated Symptoms:**
   - [ ] Nausea / [ ] Vomiting (type + frequency)
   - [ ] Diarrhea / [ ] Constipation
   - [ ] Fever (temp ___ °C)
   - [ ] Melena / [ ] Hematochezia
   - [ ] Dysuria / [ ] Hematuria
   - [ ] Vaginal discharge / [ ] Missed period (female)
   - [ ] Jaundice
3. **Physical Exam:**
   - Tenderness: location ___
   - [ ] Rebound / [ ] Guarding (voluntary/involuntary)
   - Murphy's sign: [ ] Positive / [ ] Negative
   - Psoas sign: [ ] Positive / [ ] Negative
   - Obturator sign: [ ] Positive / [ ] Negative
   - Bowel sounds: [ ] Normal / [ ] Hyperactive / [ ] Absent
   - Mass: [ ] Yes (___) / [ ] No
   - [ ] Jaundice
   - [ ] Costovertebral angle tenderness
4. **Risk Stratification:**
   - Alvarado Score: ___ / 10
   - AIR (Age >50 + WBC >12 + CRP >50): [ ] Low / [ ] Moderate / [ ] High
5. **Investigations** (shared) + Urinalysis + Amylase/Lipase + β-hCG (female)
6. **Imaging:**
   - [ ] CXR (erect) / [ ] X-ray abdomen (erect + supine)
   - [ ] Abdominal US / [ ] CT-A/P
   - [ ] Pelvic US (female)
7. **Management:**
   - [ ] NPO
   - [ ] NG tube / [ ] Foley catheter
   - [ ] IV fluids
   - [ ] Analgesia: [ ] Paracetamol / [ ] NSAIDs / [ ] Opioid
   - [ ] ATB: [ ] Not indicated / [ ] Yes (agent + dose)
   - [ ] Surgical consult → [ ] Acute abdomen requiring OR / [ ] Medically managed
8. **Disposition:**
   - [ ] OR
   - [ ] Admit: ICU / Ward / Observation
   - [ ] Refer: ___
   - [ ] Discharge + F/U: วันที่ ___
9. **Consult Note** — specialist response

---

### Template 7: General ER Note

Generic free-form ER note:

1. **Chief Complaint** — free text
2. **HPI** — free text
3. **Past History** — free text (PMH, allergies, medications)
4. **Physical Examination:**
   - Vitals
   - General
   - HEENT
   - Neck
   - Chest / Cardiovascular
   - Abdomen
   - Extremities / Musculoskeletal
   - Neurological
   - Skin
5. **Investigations** (shared)
6. **Assessment & Plan** — free text (with structured fields: Diagnosis, Treatment, Disposition, F/U)

---

## Implementation Tasks

### Task 1: Create directory structure
- Create: `tools/er-note/` directory

### Task 2: Write `tools/er-note/index.html` — Hub Page
- HTML boilerplate (Inter Tight + Sarabun CDN)
- Link to shared `er-note.css` and `er-note.js` (self-contained inside `tools/er-note/`) — do NOT import `shared/base.css` or any other main-site shared file
- Top nav (MNRH logo + "ER NOTE")
- Template list and tab bar pointing to each per-template file
- Action bar (Copy / Clear / Print)
- Footer

### Task 3: Write `tools/er-note/er-note.css` — Common Styles
- CSS variables copied from `index.html` / `shared/base.css` palette (Braun cream `#f4f2ec`, `#ebe7df`, accent `#5E6AD2`, Inter Tight + Sarabun fonts)
- Styles used by all 7 templates and the hub; never imported by the main site

### Task 4: Write `tools/er-note/er-note.js` — Common Utilities
- `localStorage.getDraft(templateId)` / `setDraft(templateId, data)`
- `autoSave(fieldId, value)` — auto-save on input
- `copyNote()` — generate plain text + copy to clipboard
- `clearDraft(templateId)` — clear localStorage for template
- `printNote()` — window.print()
- **Do NOT use `shared/components.js`, `shared/form-validate.js`** — all JS inside this file

### Tasks 5–11: Implement one HTML file per template
- Each file links `er-note.css` and `er-note.js` plus a template-specific inline init
- Each template contains its own form sections, Investigations shared markup, and action bar
- `General ER Note` must appear first in any list/tab order, followed by `Sepsis`, `Trauma`, `Mammalian Bite`, `Chest Pain`, `Abdominal Pain`, `Eye Injury`

### Task 12: Add T2 to index.html
- Insert in Clinical Tools section (before closing `</ol></div>`)
- Style: `T2` badge, "ER NOTE Tool", "PROTOTYPE" status
- Match existing T1 styling

### Task 13: Update `service-worker.js`
- Add **all** per-template HTMLs, `er-note.css`, and `er-note.js` to cache list
- Bump `CACHE_VERSION` (e.g., `er-hub-v21`)

### Task 14: Update `ARCHITECTURE.md`
- Add `tools/er-note/*` to Component table (role: ER structured note tool; deps: standalone, no shared JS, intra-folder CSS/JS only)
- Add to Data Flow section (user input → localStorage → clipboard plain text)
- Add warning: ER NOTE tool standalone (no shared JS dependency — CSS/JS self-contained inside `tools/er-note/`)
- Add ADR entry for per-template split + self-contained assets

### Task 15: Verify
- Open hub → click each template → no console errors
- Fill a field → close tab → reopen → draft restored
- Click Copy → paste in text editor → correct format
- Clear draft → localStorage cleared
- Test Print → clean print layout
- **Verify standalone**: no `shared/components.js`, `shared/form-validate.js`, or `shared/base.css` loaded by any `tools/er-note/` page in Network tab
- **Verify offline**: service worker caches all `tools/er-note/` assets

---

## Validation Checklist

- [ ] All 7 templates accessible and switch without page reload
- [ ] Auto-save per field works (reload test)
- [ ] Copy generates correct plain text format
- [ ] **Trauma template shows xABCDE** (x = hemorrhage control BEFORE airway) — NOT ABCDE
- [ ] Trauma template includes damage control resuscitation (TXA, MTP, permissive hypotension, 1:1:1)
- [ ] Trauma tetanus uses CDC 2024 (Td/Tdap 10yr clean / 5yr dirty, TIG for dirty+unknown/incomplete) — NOT "TT >5yr" blanket
- [ ] Sepsis form shows 4 scoring tools (NEWS/NEWS2/MEWS/SIRS) — qSOFA NOT shown as sole screening
- [ ] Sepsis ABx timing: "Septic shock OR probable/definite sepsis → 1h (strong)" — NOT "Shock / Definite Sepsis"
- [ ] Sepsis includes: anaerobic stewardship (Rec 28), TBI fluid exception, MAP 60-65 elderly (Rec 14), IV corticosteroid (Rec 79), prolonged beta-lactam infusion (Rec 33), no beta-blocker (Rec 64), HFNC P/F<200 (Rec 67)
- [ ] Sepsis post-sepsis care includes: transition program, handoff, med reconciliation, rehab, education
- [ ] **Chest pain: oxygen ONLY if SpO2 <90%** — NOT "if SpO2 <94%"
- [ ] Chest pain: ASA 162–325mg (not just 300mg)
- [ ] Chest pain: ticagrelor/prasugrel ranked preferred over clopidogrel
- [ ] Chest pain: analgesia with specific doses (morphine 2–4mg q5–15min max 10mg, fentanyl 25–50μg max 100μg)
- [ ] Chest pain: fondaparinux available as anticoag option
- [ ] Chest pain: troponin dropdown — ESC 0/1h or 0/2h algorithm (not fixed 0/1/3h)
- [ ] Mammalian bite: PEP regimen dropdown (WHO 2018 / Thai Red Cross IPC)
- [ ] Mammalian bite: WHO 2018 naive = 2-site ID D0/3/7 or 1-site IM D0/3/7+D14-28 (NOT 5-dose Essen)
- [ ] Mammalian bite: previously immunized = abridged 1-dose D0+D3 (no RIG) — NOT "booster 1-2 dose"
- [ ] Mammalian bite: RIG for Cat III naive only (NOT all Cat III)
- [ ] Mammalian bite: no eRIG skin test; no distant IM RIG injection
- [ ] Wound ATB auto-populates based on animal + wound characteristics
- [ ] T2 appears in index.html Clinical Tools section
- [ ] **Standalone verified**: no `shared/components.js`, `shared/form-validate.js`, or `shared/base.css` loaded by any `tools/er-note/` page
- [ ] **Service worker caches all `tools/er-note/` assets** (offline test)
- [ ] **ARCHITECTURE.md updated** with er-note component + data flow + warning
- [ ] Print layout is clean (no dark background)
- [ ] No console errors