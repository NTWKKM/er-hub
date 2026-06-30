# ED Standing Order Generator Hub — Implementation Plan

**Project:** ขยาย rTPAMNRH ให้เป็น Standing Order Generator Hub สำหรับ ER
**Base:** https://github.com/NTWKKM/rTPAMNRH (`index.html` = rt-PA Stroke FAST TRACK, ใช้งานจริงแล้ว)
**Status:** Approved & Production Ready (ผ่านการตรวจทานและสรุปประเด็นความปลอดภัยทางคลินิกแล้ว)
**Stack:** Vanilla HTML/CSS/JS, no build step (คงรูปแบบเดิมที่ deploy ผ่าน GitHub Pages ได้โดยตรง)

---

## สารบัญ

1. [Scope](#1-scope)
2. [Source Material Audit & Clinical Safety Resolutions](#2-source-material-audit--clinical-safety-resolutions) — ⚠️ แก้ไขข้อสังเกตความปลอดภัย 3 จุดเรียบร้อยแล้ว
3. [Architecture](#3-architecture)
4. [Drug Infusion Engine](#4-drug-infusion-engine) — สูตรคำนวณคำควบคุมยา IV ทั้ง 12 ตัว
5. [Drug Data Catalogue](#5-drug-data-catalogue)
6. [New Standing Order Specs](#6-new-standing-order-specs)
7. [File Structure](#7-file-structure)
8. [Phased Roadmap](#8-phased-roadmap)
9. [Safety / QA Checklist](#9-safety--qa-checklist)
10. [Architecture & Clinical Decisions Summary](#10-architecture--clinical-decisions-summary) — สรุปการตัดสินใจในจุดเปิดกว้างของระบบ
11. [Next Step](#11-next-step)

---

## 1. Scope

สร้างเว็บ static (GitHub Pages) ที่เป็น **hub** รวม Standing Order generator หลายตัวของ ER เข้าด้วยกัน โดย:

- กรอกข้อมูลผู้ป่วย → ระบบคำนวณ (GRACE score, TNK/SK dose, drip rate ฯลฯ) → แสดงผลบนจอ → พิมพ์เป็นใบ Doctor Order/Progress Note ตามฟอร์มจริงของ รพ.
- รองรับ standing order ใหม่ในอนาคตโดยไม่ต้อง copy-paste CSS/JS ซ้ำทุกไฟล์ (แก้ปัญหาปัจจุบันของ `index.html`/`nstemi.html`/`stemi.html` เดิม)
- มี **IV Drip Calculator** แบบ interactive แยกเป็นเครื่องมือกลาง ใช้ซ้ำได้ทั้งเป็นหน้า reference เดี่ยวๆ และฝังใน standing order อื่น (เช่น Post-intubation sedation ต้องใช้ Fentanyl+Midazolam calculator ตัวเดียวกัน)

**Order ที่มีอยู่แล้ว (พร้อม migrate เข้าโครงสร้างใหม่):** rt-PA, STEMI, NSTEMI
**Order ใหม่ที่มีข้อมูลต้นทางครบจาก PDF:** Post-Intubation Sedation, Massive PE, Antivenom, Heparin/LMWH (standalone)

---

## 2. Source Material Audit & Clinical Safety Resolutions

จากการตรวจสอบไฟล์ข้อมูลต้นทางและประเมินความเสี่ยงทางคลินิก (Clinical Risk Assessment) ได้สรุปการดำเนินการดังนี้:

| ไฟล์ | ใช้สำหรับ | สถานะ |
|---|---|---|
| `stroke fast tract.html` | rt-PA Stroke FAST TRACK (4 หน้าพิมพ์: order + inclusion/exclusion + consent + timeline) | ใช้งานจริงแล้ว, จะทำการย้ายไป `/orders/rtpa.html` |
| `stemi.html` | STEMI (TNK/SK) | ทำงานสมบูรณ์, ตรงกับ `STEMI_new_26-4doc.pdf` |
| `nstemi.html` | NSTEMI (GRACE + anticoag) | ทำงานสมบูรณ์, logic anticoag ตรงกับ `Heparin.pdf` |
| `fen.pdf` | **Post-Intubation Sedation** (ใหม่) | Fentanyl + Midazolam drip order |
| `PE_ใหม่.pdf` | **Massive PE** (ใหม่) | SK (2 regimen) / rt-PA (2 regimen) fibrinolysis |
| `Standing_order_for_Antivenom_update.pdf` | **Antivenom** (ใหม่) | Hematotoxin/Neurotoxin, fixed-vial dosing |
| `Heparin.pdf` (12 หน้า) | **Heparin/LMWH protocol** (ใหม่, standalone) | Risk factor checklist, initial dose, aPTT titration table, complication grading form |
| 10 รูป (Adrenaline, Dopa/Dobu, Dormicum, Esmolol, Fentanyl, Heparin, Labetalol, NE, Nicardipine, NTG/Nitroprusside) | IV Drip reference charts | ตรวจสอบสูตรคำนวณและช่วงขนาดยาแล้ว ตรงกับตารางมาตรฐาน |

### ⚠️ การแก้ไขข้อสังเกตด้านความปลอดภัย (Clinical Safety Resolutions)

#### (A) ประเด็นหน่วยของ Esmolol (Esmolol unit label)
- **ข้อสังเกตเดิม:** แผนภูมิ Esmolol เขียนหน่วยช่วงบำรุงรักษา (Maintenance Dose) เป็น `mg/kg/min` (0.05–0.3) ซึ่งในตำราสากลมักใช้หน่วย `mcg/kg/min` (50–300 µg/kg/min) อย่างไรก็ตาม เลขการคำนวณในตารางคำนวณของ รพ. (เช่น weight 40kg × 0.1 = 4.0 mg/min) สอดคล้องกับเลขที่พิมพ์ไว้หากคำนวณตามหน่วย `mg/kg/min`
- **ข้อยุติในระบบ:** 0.05–0.3 mg/kg/min นั้นมีค่าเทียบเท่ากับ 50–300 mcg/kg/min พอดี (แค่สเกลหน่วยต่างกัน 1,000 เท่า) ระบบจะทำการประมวลผลคำนวณใน Engine ด้วยหน่วย **`mg/kg/min`** ตามหน้ากระดาษของ รพ. เพื่อคงความเข้ากันได้กับตารางเดิม 100% แต่จะทำการแสดงผลข้อความคำอธิบายเตือนบนหน้าจอ UI ตัวอย่างเช่น:
  > **หมายเหตุความปลอดภัย:** อัตราการหยด 0.05 - 0.3 mg/kg/min เป็นค่าเทียบเท่ากับ 50 - 300 mcg/kg/min ตามมาตรฐานสากล เพื่อป้องกันการสับสนของแพทย์และพยาบาลผู้บริหารยา

#### (B) ความต่างของระยะเวลาการให้ Streptokinase ใน STEMI กับ Massive PE
- **ข้อสังเกตเดิม:** STEMI ใช้ SK 1.5 MU IV drip ใน **60 นาที**, ส่วน Massive PE ใช้ SK 1.5 MU IV drip ใน **120 นาที** (หรือ Regimen 2: load 250k U/30min และต่อด้วย drip 100k U/hr)
- **ข้อยุติในระบบ:** ห้ามใช้ component หรือชุดคำสั่งยาร่วมกันเด็ดขาด ระบบจะกำหนดโครงสร้างของยา Streptokinase แยกออกจากกันเป็น 2 ชุดข้อมูล (STEMI Regimen และ PE Regimen) เพื่อป้องกันข้อผิดพลาดในการตั้งอัตราการหยดยา (Drip Rate) และการจับเวลา (Timing)

#### (C) Fentanyl/Midazolam concentration ใน Post-Intubation Sedation ต่างจากตารางอ้างอิงทั่วไป
- **ข้อสังเกตเดิม:** ใน `fen.pdf` ระบุความเข้มข้นของการผสมพิเศษที่คนละระดับกับตารางทั่วไป:
  - Fentanyl: ผสมได้ความเข้มข้น **5 µg/mL** (500µg/100mL) ในขณะที่แผนภูมิอ้างอิงทั่วไปคือ 2 µg/mL หรือ 1 µg/mL
  - Midazolam: ผสมได้ความเข้มข้น **1 mg/mL** (100mg/100mL) ในขณะที่แผนภูมิอ้างอิงทั่วไปคือ 0.2 mg/mL หรือ 0.5 mg/mL
- **ข้อยุติในระบบ:** ใน Schema `drug-data.js` จะออกแบบให้รองรับ `preparations` array สำหรับยาหนึ่งตัว โดยในหน้าจอคำนวณทั่วไปแพทย์สามารถเลือกสูตรผสมแบบมาตรฐานได้ และใน Standing Order หน้าจอ Sedation จะบังคับเลือกสูตรการเตรียมยาเฉพาะตาม `fen.pdf` เพื่อป้องกันการสับสนและคำนวณปริมาตรยาผิดพลาด

---

## 3. Architecture

### 3.1 ทำไมยังใช้ vanilla JS ไม่ใช้ framework
การใช้งาน Standing Order ในห้องฉุกเฉินต้องการความรวดเร็วและความเสถียรสูงสุด การเลือกใช้ Vanilla HTML/CSS/JS (ไม่มีขั้นตอนการ Compile หรือ Bundling) ช่วยให้มั่นใจได้ว่า:
1. การเปิดใช้งานไม่ขึ้นกับระบบเครือข่ายอินเทอร์เน็ตที่ช้า (สามารถดาวน์โหลดเป็น Static File เก็บไว้ในเครื่องคอมพิวเตอร์ของแผนกและเปิดตรงๆ ผ่าน Web Browser ได้)
2. อุปกรณ์พกพาและ PC รุ่นเก่าในแผนกสามารถเปิดหน้าเว็บคำนวณได้ทันทีโดยไม่มี Overhead ของ JavaScript Framework
3. **การหลีกเลี่ยง Code Duplication:** นำโค้ด CSS, ตารางพิมพ์ และคำนวณกลาง (Shared Assets) มาแยกเป็นไฟล์แยกส่วน แล้วใช้กลไกการ `<link>` และ `<script src>` มายังแต่ละ Standing Order แทน

### 3.2 รูปแบบโครงสร้างระบบ (Hub-and-Spoke Pattern)

```
index.html  (Hub Portal — รวบรวมทางเข้า Standing Order ทั้งหมด และการตรวจสอบ URL ดั้งเดิม)
   │
   ├── orders/rtpa.html        (ย้ายจากหน้าเดิม เพื่อให้โครงสร้างโฟลเดอร์เป็นสัดส่วน)
   ├── orders/stemi.html       (หน้าเดิม, ปรับปรุงให้ดึง CSS และ Component กลางมาใช้)
   ├── orders/nstemi.html      (หน้าเดิม, ปรับปรุงให้ดึง CSS และ Component กลางมาใช้)
   ├── orders/pe.html          (ใหม่ — ใบสั่งและการประเมิน Massive PE)
   ├── orders/antivenom.html   (ใหม่ — Standing order การให้เซรุ่มต้านพิษงู)
   ├── orders/heparin.html     (ใหม่ — ระบบจัดการ Heparin แบบ standalone พร้อม Titration Assistant)
   ├── orders/sedation.html    (ใหม่ — ใบสั่งยาเพื่อการระงับความรู้สึกหลังใส่ท่อช่วยหายใจ)
   └── tools/drip-calculator.html  (ใหม่ — เครื่องมือคำนวณการหยดยากลาง 12 ชนิดยา)

shared/
   ├── base.css           (การจัดหน้าฟอร์ม, input, ปุ่มกด, สไตล์แบบมินิมอลและสะอาด)
   ├── print.css          (คุมสไตล์สำหรับการพิมพ์หน้า A4, ซ่อนปุ่มกดและ UI ส่วนเกินเมื่อพิมพ์)
   ├── components.js      (สร้าง HTML elements ซ้ำ เช่น หัวกระดาษ รพ., ข้อมูลคนไข้, กรอบสติกเกอร์)
   ├── calc-engine.js     (สูตรคำนวณทางคณิตศาสตร์หลัก Drip Rate และ Bolus Volume)
   ├── anticoag-engine.js (คำนวณปริมาณยา Heparin และ LMWH ตาม Indication ต่างๆ)
   └── drug-data.js       (ศูนย์ข้อมูลการเตรียมยา, Dose Range, และข้อความเตือนของยาทั้ง 12 ชนิด)
```

---

## 4. Drug Infusion Engine

สูตรคำนวณอัตราการหยดยา (Drip Rate) และปริมาณการฉีดยานำ (Bolus Volume) จะได้รับการรวบรวมไว้ที่ `shared/calc-engine.js` โดยไม่มีการ Hardcode lookup table เพื่อความยืดหยุ่นในการคำนวณตามน้ำหนักและขนาดยาของผู้ป่วยจริง:

```javascript
// shared/calc-engine.js

/**
 * คำนวณอัตราการให้ยาทางหลอดเลือดดำ (mL/hr)
 * รองรับทั้งยาที่คิดตามน้ำหนัก (Weight-based) และยาที่ให้ในอัตราคงที่ (Flat-rate)
 * 
 * @param {number} doseValue - ขนาดของยาที่ต้องการให้ (เช่น 0.1, 5, 12)
 * @param {string} doseUnit - หน่วยของยา ('mcg/kg/min' | 'mcg/kg/hr' | 'mg/kg/min' | 'mg/kg/hr' | 'mcg/min' | 'mg/hr')
 * @param {number} weightKg - น้ำหนักของผู้ป่วย (kg)
 * @param {number} concentration - ความเข้มข้นของยาหลังจากผสมแล้ว (หน่วยเดียวกับยา / mL)
 * @returns {number} - อัตราการบริหารยา (mL/hr)
 */
function calcDripRate({ doseValue, doseUnit, weightKg, concentration }) {
    const perKg  = doseUnit.includes('/kg/');
    const perMin = doseUnit.endsWith('/min');
    
    // แปลงขนาดที่ต้องการให้เป็น ปริมาณยาต่อชั่วโมง
    const amountPerHour = doseValue * (perKg ? weightKg : 1) * (perMin ? 60 : 1);
    
    // อัตราการหยด (mL/hr) = ปริมาณยาต่อชั่วโมง / ความเข้มข้นของยาต่อ mL
    return amountPerHour / concentration;
}

/**
 * คำนวณปริมาตรการฉีดยาแบบ Bolus หรือ Loading Dose (mL)
 * 
 * @param {number} doseValue - ขนาดของยาที่ต้องการฉีด (เช่น 0.5, 30)
 * @param {boolean} perKg - คิดตามน้ำหนักตัวหรือไม่
 * @param {number} weightKg - น้ำหนักผู้ป่วย (kg)
 * @param {number} concentration - ความเข้มข้นของยา (หน่วยยา / mL)
 * @returns {number} - ปริมาตรยาที่ต้องดูดมาฉีด (mL)
 */
function calcBolusVolume({ doseValue, perKg = true, weightKg, concentration }) {
    const amount = doseValue * (perKg ? weightKg : 1);
    return amount / concentration;
}
```

---

## 5. Drug Data Catalogue (ยาทั้ง 12 ชนิด)

ข้อมูลและขอบเขตขนาดยาใน `shared/drug-data.js` ถูกกำหนดไว้ดังนี้:

| ยา | ความเข้มข้นมาตรฐาน (Prep) | ช่วงขนาดยา (Range) | หน่วยขนาดยา | Weight-based | คู่มือการปรับยา (Titration & Targets) |
|---|---|---|---|---|---|
| **Epinephrine** | 100 µg/mL (10mg/100mL) | 0.05–3 | `mcg/kg/min` | ✓ | ปรับเพิ่มครั้งละ 0.01 q 15 min เพื่อเป้าหมาย MAP ≥ 65 mmHg |
| **Norepinephrine** | 40 µg/mL (4mg/100mL D5W) | 0.02–3 | `mcg/kg/min` | ✓ | ปรับเพิ่มครั้งละ 0.05 q 3 min เพื่อเป้าหมาย MAP ≥ 65 mmHg |
| **Dopamine** | 1,000 หรือ 2,000 µg/mL | 2–20 | `mcg/kg/min` | ✓ | ปรับตามการตอบสนอง (Cardiac: 2-5, Vasopressor: 10-20) |
| **Dobutamine** | 1,000 หรือ 2,000 µg/mL | 2.5–20 | `mcg/kg/min` | ✓ | ปรับเพิ่มตามอาการทางคลินิก (Max 20 mcg/kg/min) |
| **Midazolam** | 1,000 µg/mL (100mg/100mL) | 0.02–0.2 | `mg/kg/hr` | ✓ | ปรับตามระดับความรู้สึกตัว (Sedation scale target) |
| **Esmolol** | 10,000 µg/mL (10mg/mL) | 0.05–0.3 | `mg/kg/min` | ✓ | ปรับเพิ่มครั้งละ 0.05 q 4 min, tapering ช้าๆ เมื่อจะหยุด |
| **Fentanyl** | 1, 2, หรือ 5 µg/mL | 0.5–10 | `mcg/kg/hr` | ✓ | ปรับระดับยาเพื่อระงับปวด, จำกัดขนาดสูงสุดที่ 500 µg/hr |
| **Heparin** | 100 units/mL | อ้างอิงตามข้อ 6.3 | `units/kg/hr` | ✓ | ปรับอัตราการให้ยาตามตารางผลตรวจ aPTT Ratio |
| **Labetalol** | 1, 2, หรือ 3 mg/mL | 0.5–3 | `mg/min` | ✗ | ให้ยาแบบอัตราคงที่ (Flat-rate) ไม่คิดตามน้ำหนัก, Max 300mg/day |
| **Nicardipine** | 0.1 หรือ 0.2 mg/mL | 5–15 | `mg/hr` | ✗ | เริ่ม 5 mg/hr ปรับเพิ่ม 2.5 mg/hr q 15 min, คุมได้ลดเหลือ 3-5 |
| **Nitroglycerin (NTG)**| 200 µg/mL | 5–400 | `mcg/min` | ✗ | เริ่ม 5 mcg/min ปรับ q 5 min ตามระดับอาการเจ็บหน้าอก/BP |
| **Nitroprusside** | 200 µg/mL | 0.5–10 | `mcg/kg/min` | ✓ | เริ่ม 0.25-0.5 mcg/kg/min ปรับ q 3-5 min เพื่อเป้าหมาย BP |

---

## 6. New Standing Order Specs

### 6.1 Post-Intubation Sedation (`orders/sedation.html`)
- **ข้อมูลขาเข้า:** HN, น้ำหนัก (BW kg)
- **Fentanyl drip:** ความเข้มข้นบังคับ **5 µg/mL** (500µg/100mL) ช่วงให้ยา 0.5–1.0 µg/kg/hr
- **Midazolam drip:** ความเข้มข้นบังคับ **1 mg/mL** (100mg/100mL) ช่วงให้ยา 0.02–0.2 mg/kg/hr
- **รูปแบบพิมพ์:** แสดงผลลัพธ์เป็น Progress Note และ Doctor Order ใน 1 แผ่นกระดาษ A4

### 6.2 Massive PE (`orders/pe.html`)
- **การประเมินความเสี่ยง:** คัดกรอง High risk / Intermediate-to-high risk PE
- **ทางเลือกยาละลายลิ่มเลือด:**
  1. **Streptokinase Regimen A (120 min):** SK 1.5 MU dilute NSS 100 mL IV drip ใน **120 นาที**
  2. **Streptokinase Regimen B (Syringe Pump):** Load 250,000 U/30 min → ต่อด้วย drip 100,000 U/hr (ยาหมดอายุ 8 ชม. หลังผสม)
     - *ฟีเจอร์เพิ่มเติม:* ระบบคำนวณและปั๊ม Expiry Timestamp ลงในใบสั่งยาโดยอัตโนมัติ (เช่น "ยาผสมเมื่อ 10:00 น. หมดอายุเวลา 18:00 น.")
  3. **rt-PA Regimen A:** rt-PA 100 mg IV drip ใน 120 นาที
  4. **rt-PA Regimen B (Fast Drip):** rt-PA 0.6 mg/kg IV drip ใน 15 นาที (Max 50 mg)
- **การติดตามอาการ:** ตรวจสัญญาณชีพทุก 15 นาที และแจ้งแพทย์ทันทีหาก SBP > 180, DBP > 105, SBP < 90 หรือ HR < 50 bpm

### 6.3 Heparin / LMWH Standalone Protocol (`orders/heparin.html`)
- **การคัดเลือก Indication:** ACS, AF, Intracardiac Thrombosis, PE, DVT, Acute Ischemic Stroke, Bridging Therapy
- **Initial Dosing (คำนวณตั้งต้น):** ย้ายตารางคำนวณ Bolus และ Infusion rate ของแต่ละข้อบ่งใช้ไปที่ `shared/anticoag-engine.js` เพื่อเรียกใช้ร่วมกันกับ NSTEMI Standing Order
- **aPTT Titration Assistant:**
  แพทย์/พยาบาลกรอกค่าผลตรวจ aPTT Ratio ปัจจุบัน → ระบบประมวลผลคำแนะนำจากตารางปรับยาดังนี้:

| aPTT Ratio | คำสั่งดำเนินการ (Action) | การปรับอัตราการหยด (Rate Change) | เจาะตรวจซ้ำ (Recheck) |
|---|---|---|---|
| **> 7.0** | หยุดให้ยา 180 นาที | ปรับลดอัตราลง -500 units/hr | เจาะซ้ำใน 3 ชม. |
| **5.1 – 7.0** | หยุดให้ยา 60 นาที | ปรับลดอัตราลง -500 units/hr | เจาะซ้ำใน 6 ชม. |
| **4.1 – 5.0** | หยุดให้ยา 60 นาที | ปรับลดอัตราลง -300 units/hr | เจาะซ้ำใน 6 ชม. |
| **3.1 – 4.0** | หยุดให้ยา 60 นาที | ปรับลดอัตราลง -200 units/hr | เจาะซ้ำใน 6 ชม. |
| **2.6 – 3.0** | หยุดให้ยา 60 นาที | ปรับลดอัตราลง -100 units/hr | เจาะซ้ำใน 6 ชม. |
| **1.5 – 2.5** | **(Therapeutic Range) ให้ยาอัตราเดิม** | ไม่มีการปรับอัตรา (Rate = 0) | เจาะซ้ำเช้าวันถัดไป |
| **1.2 – 1.4** | ฉีด Bolus ซ้ำ 2,500 units ทันที | ปรับเพิ่มอัตรา +100 ถึง +200 units/hr | เจาะซ้ำใน 6 ชม. |
| **< 1.2** | ฉีด Bolus ซ้ำ 5,000 units ทันที | ปรับเพิ่มอัตรา +400 units/hr | เจาะซ้ำใน 6 ชม. |

- *ตัวบล็อกความปลอดภัย:* รายการประเมินปัจจัยเสี่ยง (Risk factors) 12 ข้อ หากทำเครื่องหมายว่ามีข้อห้ามใช้แม้แต่ข้อเดียว ระบบจะแสดงกล่องแจ้งเตือนสีแดง "Individualized dose — กรุณาปรึกษาแพทย์เฉพาะทาง/Staff" และไม่อนุญาตให้ใช้ระบบคำนวณอัตโนมัติ

### 6.4 Antivenom (`orders/antivenom.html`)
- **การเลือกกลุ่มพิษงู:** Hematotoxin (งูกะปะ, งูเขียวหางไหม้, งูแมวเซา, พิษต่อระบบโลหิตไม่ทราบชนิด) หรือ Neurotoxin (งูเห่า, งูจงอาง, งูสามเหลี่ยม, งูทับสมิงคลา, พิษต่อระบบประสาทไม่ทราบชนิด)
- **เกณฑ์การให้เซรุ่ม (Indication Checklist Gate):** แพทย์ต้องทำเครื่องหมายยืนยันข้อบ่งใช้อย่างน้อย 1 ข้อ ระบบจึงจะเปิดปุ่มคำนวณยา
- **การสืบค้นปริมาณยา (Vial Lookup):**
  - งูเขียวหางไหม้: 3 ขวด (drip 30 min)
  - งูกะปะ / งูแมวเซา / พิษต่อระบบโลหิตทั่วไป: 5 ขวด (drip 30 min)
  - งูเห่า / งูจงอาง / พิษต่อระบบประสาททั่วไป: 10 ขวด (drip 60 min)
  - งูทับสมิงคลา: 5 ขวด (drip 30 min)
- **ข้อมูลเสริมประกอบใบสั่ง:** ประวัติบาดทะยัก, ประวัติการแพ้เซรุ่มจากม้า, คำเตือนการเตรียมยา Adrenaline 1:1000 0.5mg ไว้ข้างเตียงเพื่อรักษาภาวะแพ้รุนแรง (Anaphylaxis)

---

## 7. File Structure (โฟลเดอร์สำหรับส่งขึ้น Production)

```
rTPAMNRH/
├── index.html                      # Portal Portal — ลิงก์ทุกหน้า + ตรวจสอบ Backward Routing
├── shared/
│   ├── base.css                    # รวม CSS สไตล์ฟอร์มและปุ่ม
│   ├── print.css                   # รวม CSS สำหรับหน้าพิมพ์ A4
│   ├── calc-engine.js              # โค้ดวิเคราะห์ Drip/Bolus math
│   ├── anticoag-engine.js          # โค้ดคำนวณ Heparin/LMWH
│   ├── drug-data.js                # โค้ดกำหนดค่ารายละเอียด 12 ยาหลัก
│   └── components.js               # โค้ดสร้าง UI Widgets ซ้ำๆ
├── orders/
│   ├── rtpa.html                   # ย้ายจากหน้า index.html เดิม
│   ├── stemi.html                  # ปรับปรุงโครงสร้าง (STEMI)
│   ├── nstemi.html                 # ปรับปรุงโครงสร้าง (NSTEMI)
│   ├── pe.html                     # ใบสั่ง Massive PE (ใหม่)
│   ├── antivenom.html              # ใบสั่ง Antivenom (ใหม่)
│   ├── heparin.html                # ใบสั่ง Heparin/LMWH (ใหม่)
│   └── sedation.html               # ใบสั่ง Post-intubation Sedation (ใหม่)
└── tools/
    └── drip-calculator.html        # หน้าคำนวณ IV Drip 12 ชนิดยาเดี่ยว (ใหม่)
```

---

## 8. Phased Roadmap

| Phase | หัวข้องาน | ผลลัพธ์ที่จับต้องได้ | ความเสี่ยงและแนวทางควบคุม |
|---|---|---|---|
| **Phase 0** | วางโครงสร้าง Shared Files | สร้าง `shared/` css/js ทั้งหมด และพอร์ทสูตรคำนวณคณิตศาสตร์เข้า `calc-engine.js` | **ต่ำ** — แยกการคำนวณเป็นฟังก์ชันบริสุทธิ์ (Pure function) เพื่อให้ตรวจสอบผลลัพธ์ง่าย |
| **Phase 1** | ไมเกรตระบบเดิม | ย้าย rt-PA ไป `orders/rtpa.html`, และปรับปรุง `stemi.html`/`nstemi.html` ให้ใช้ Shared CSS/Components | **ต่ำ** — มีการตรวจสอบผลการคำนวณ (Regression Test) ให้ตรงกับของเดิมทุกประการ |
| **Phase 2** | พัฒนา IV Drip Calculator | สร้างหน้าจอคำนวณยารวม 12 ชนิด (`tools/drip-calculator.html`) | **ปานกลาง** — เป็นกลุ่มยาอันตรายสูง (High-Alert Drugs) ต้องตรวจสอบกับแผนภูมิ รพ. อย่างละเอียด |
| **Phase 3a** | พัฒนาระบบ Sedation | หน้าจอคำนวณ Fentanyl + Midazolam สำหรับ Post-Intubation Sedation | **ต่ำ-ปานกลาง** — โครงสร้างคำนวณเชิงเส้นตรง ปริมาตรยาสัมพันธ์กับน้ำหนักตัว |
| **Phase 3b** | พัฒนาระบบ Massive PE | หน้าจอคำนวณยาละลายลิ่มเลือด 4 Regimen พร้อมระบบนับเวลาหมดอายุยา SK | **สูง** — ปริมาณยา SK และ rt-PA แตกต่างกับสูตรทั่วไป ต้องแยกกล่องแสดงผลชัดเจน |
| **Phase 3c** | พัฒนาระบบ Heparin Standalone | หน้าจอคำนวณ Heparin แยกเฉพาะพร้อม Titration Assistant คำนวณจาก aPTT Ratio | **สูง** — ยามีความละเอียดในการปรับอัตราสูง ต้องจำกัดขนาดสูงสุดไม่เกิน 48,000 units/day |
| **Phase 3d** | พัฒนาระบบ Antivenom | หน้าจอจ่ายเซรุ่มแก้พิษงูตามการวินิจฉัยและเกณฑ์อาการคัดกรอง | **สูง** — ข้อบ่งชี้ต้องเป็นไปตามเกณฑ์เชิงรุก ป้องกันการคีย์ผิดกลุ่มชนิดพิษงู |
| **Phase 4** | ขัดเกลาและเก็บงาน (Hardening) | ตรวจสอบ Edge Case ของน้ำหนักตัวที่น้อย/มากเป็นพิเศษ, การใช้งานบนมือถือ, และเพิ่มระบบ PWA Offline | **ต่ำ** — เพิ่มเสถียรภาพของการใช้งานออฟไลน์ในห้องฉุกเฉิน |

---

## 9. Safety / QA Checklist

ก่อนการส่งมอบและใช้งานจริงบน Production ทุก Standing Order และเครื่องมือต้องผ่านเกณฑ์ดังนี้:

- [ ] **Clinical Reference Commenting:** ค่าคงที่ยาทุกตัว (ขนาดยา, อัตราสูงสุด, ปริมาตรผสม) ต้องระบุหมายเหตุแหล่งอ้างอิงเป็นคำสั่งบรรทัด (Comment) ลิงก์ไปยัง PDF ต้นฉบับ
- [ ] **Cross-Check Verification:** สุ่มเลือกจุดทดสอบอย่างน้อย 3 จุดต่อน้ำหนักตัว (เช่น 45kg, 70kg, 95kg) และเปรียบเทียบผลลัพธ์กับแผ่นกระดาษของโรงพยาบาล ผลคำนวณ Drip Rate ต้องตรงกัน
- [ ] **Soft Warning vs Hard Stop:** การเตือนทั่วไป (เช่น ขนาดเกินเป้าหมายแนะนำ) ต้องแยกออกจากข้อห้ามใช้เด็ดขาด (เช่น SK ภายใน 6 เดือน) ซึ่งตัวระบบจะทำลายปุ่มสั่งพิมพ์เพื่อป้องกันความผิดพลาด
- [ ] **Print A4 Constraints:** ตรวจสอบโหมด Print Preview ของ Google Chrome และ Safari บนแท็บเล็ต หน้า Progress Note และ Doctor Order ต้องจัดวางลงใน 1 หน้ากระดาษ A4 เสมอ (ยกเว้น rt-PA ที่มีโครงสร้าง 4 หน้าตามความซับซ้อน)
- [ ] **Mobile responsive Check:** หน้าจอกรอกข้อมูลและปุ่มคำนวณต้องจัดเรียงคอลัมน์ใหม่เมื่อเปิดด้วยสมาร์ทโฟนหรือ iPad เพื่ออำนวยความสะดวกให้แพทย์ข้างเตียงผู้ป่วย
- [ ] **Audit Trail Generation:** บนใบสั่งยาพิมพ์ทุกฉบับ ต้องมีแท็กระบุเวอร์ชันระบบ วันและเวลาที่มีการคำนวณ (Generated: [DD/MM/YYYY HH:MM] น.) พิมพ์อยู่บริเวณท้ายกระดาษ

---

## 10. Architecture & Clinical Decisions Summary

ในการเตรียมแผนงานสำหรับระดับ Production ได้มีการสรุปข้อตกลงและตัดสินใจสถาปัตยกรรมดังนี้:

### (1) URL Redirection & Entrypoint Strategy
- **ข้อสรุป:** เราเลือกทางเลือก **(ก)** โดยกำหนดให้ root `index.html` กลายสภาพเป็น Hub Portal หลักที่รวบรวมลิงก์เข้าสู่เครื่องมือต่างๆ เพื่อสุขอนามัยที่ดีของโค้ดในระยะยาว ส่วน rt-PA หน้าเดิมจะถูกย้ายโครงสร้างไปที่ `/orders/rtpa.html`
- **การคงความเข้ากันได้ย้อนหลัง (Backward Compatibility):** เพื่อไม่ให้เกิดความสับสนหรือกระทบต่อเจ้าหน้าที่ที่บันทึก URL ตรงของ rt-PA หรือสแกน QR Code เดิมหน้าระเบียงแผนกฉุกเฉิน:
  - ในส่วนหัวของ Hub portal จะมีกล่องเด่นชัดสีน้ำเงินระบุคำว่า **"rt-PA Stroke FAST TRACK (หน้าคำนวณเดิม)"** สำหรับสลับเข้าใช้งานได้ในคลิกเดียว
  - จะมีการเพิ่มสคริปต์ JavaScript ในหน้า `index.html` เพื่อตรวจสอบ URL Query/Hash หากตรวจพบข้อมูลนำเข้าในรูปแบบอดีต เช่น `?order=rtpa` หรือมีการระบุแฮชของหน้าเดิม จะนำทางเบราว์เซอร์ไปที่ `/orders/rtpa.html` ทันที

### (2) การแปลงหน่วยความเข้มข้นของยา Esmolol
- **ข้อสรุป:** อิงสูตรการประมวลผลและการตั้งค่าในฐานข้อมูล `shared/drug-data.js` เป็นหน่วย **`mg/kg/min`** ด้วยพิสัย `0.05 – 0.3` เพื่อรักษาความถูกต้องกับแผนภูมิทางกายภาพของโรงพยาบาล แต่ทำการพิมพ์แจ้งเตือนในเชิงวิชาการให้แพทย์ทราบถึงความสอดคล้องกันของหน่วย `mg` และ `mcg` เพื่อลดความสับสนและยกระดับความปลอดภัยของผู้ป่วย

### (3) ลำดับความสำคัญในการส่งมอบ Phase 3
- **ข้อสรุป:** ดำเนินการพัฒนาระบบคำนวณ Standing Order ตัวใหม่เรียงลำดับตามความซับซ้อนของ Clinical Logic และการออกแบบ:
  1. **Sedation (`sedation.html`):** เพื่อทดสอบความเสถียรของ Shared Calculator Engine
  2. **Massive PE (`pe.html`):** เพื่อทดสอบ Branching ของ Regimen ในกลุ่มยาละลายลิ่มเลือดและการจำกัดความปลอดภัย
  3. **Heparin Standalone (`heparin.html`):** เพื่อติดตั้งโมดูล Interactive aPTT Titration Assistant
  4. **Antivenom (`antivenom.html`):** เป็นขั้นตอนสุดท้ายเนื่องจากมีโครงสร้างตัดสินใจที่ไม่ขึ้นกับน้ำหนักตัวและการตรวจสอบข้อบ่งใช้ที่มีเงื่อนไขจำเพาะ

---

## 11. Next Step

1. **สร้างไฟล์ตามสถาปัตยกรรมกลาง:** จัดเตรียมโฟลเดอร์ `shared/` และวางระบบ CSS ไฟล์ `base.css` และ `print.css`
2. **การทำ Code Extraction:** ดึงโค้ด CSS ของเดิมจากหน้า `stemi.html` และ `nstemi.html` มารวมศูนย์ เพื่อป้องกันสไตล์คลาดเคลื่อน
3. **การนำแผนเข้าสู่ Phase 0 และ Phase 1:** เริ่มสลับตำแหน่งไฟล์ rt-PA และเชื่อมสคริปต์การคำนวณกลาง พร้อมนำแผนการย้ายหน้าเว็บเสนอผู้เกี่ยวข้อง
