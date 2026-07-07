# PLAN — `tools/er-note` Redesign (branch `er-note-tool`)

Status: **DRAFT — รอ confirm ก่อนเริ่ม implement**
Scope: `tools/er-note/*.html`, `er-note.css`, `er-note.js` (7 templates + index.html)
ไม่กระทบ `orders/*`, `shared/*` (ER NOTE เป็น standalone module อยู่แล้วตาม ARCHITECTURE.md)

---

## 1. Current State (audit)

| จุด | สภาพปัจจุบัน |
|---|---|
| ภาษา | ทุก field ใช้ label ภาษาอังกฤษล้วน (`general-er-note.html` เป็นตัวแทน pattern) ไม่มีการแยก history vs อื่นๆ |
| Investigation | Free-text เดียว (`#general-investigations`) หรือไม่มีเลย (chest-pain, trauma ใช้ note ปนใน risk-factor section) — ไม่มี structure, พิมพ์ผล lab ปนกับสั่ง investigation |
| Treatment | ไม่มี section แยกชัดเจนในหลาย template (รวมอยู่ใน "Plan" free text) ยกเว้น sepsis ที่มี field เฉพาะ (ABx regimen, fluid, vasopressor) |
| Storage | `er-note.js` → `storeKey = 'ernote-draft-' + templateName` → **1 draft ต่อ 1 template เท่านั้น** เปิดคนไข้คนที่ 2 ด้วย template เดียวกันจะทับ draft เดิมทันที (ไม่มี patient identifier ใน schema) |
| Patient ID | ไม่มี field HN ในทุก template |
| Sidebar/Card list | ไม่มี |

**Breaking constraint ที่ต้องแก้ก่อนอื่น:** storage schema ปัจจุบันรองรับได้แค่ 1 draft/template ทำให้ multi-patient sidebar เป็นไปไม่ได้จนกว่าจะ migrate schema (ดู §4).

---

## 2. Requirements (จาก request)

1. **ภาษา** — History-related sections ใช้ Thai-based label/sentence โดยคง medical term เป็นอังกฤษ (inline); ส่วนอื่นทั้งหมด (exam, score, investigation, treatment, disposition) คง pure English medical term ตามเดิม
2. **Investigation** — เปลี่ยนจาก free-text เป็น checkbox เลือกว่าจะส่ง lab/film อะไรบ้าง → note แสดงแค่ "สั่งอะไรบ้าง" ไม่ต้องมีช่องลงผล
3. **Treatment** — ทำแบบเดียวกับ investigation (checkbox เลือกสิ่งที่ให้/ทำ ไม่ลงรายละเอียดผลลัพธ์)
4. **Draft sidebar** — เก็บ draft เป็น card, เพิ่ม field **HN**, card แสดง HN / CC / Time, filter ได้เร็ว, สีต่าง template, เก็บใน localStorage

---

## 3. Design

### 3.1 Language convention (per-section policy)

| Section (ตัวแทนจาก general-er-note) | Policy |
|---|---|
| §1 Chief Complaint & HPI | **Thai-base**: label/instructional text เป็นไทย, chip text คง medical term อังกฤษ (เช่น "เริ่มเป็นทันที (Sudden onset)"), free-text ผู้ใช้พิมพ์เองได้ตามถนัด |
| §2 PMH, Medications & Allergies | **Thai-base** เหมือนกัน (เป็น history) — แต่ chip ย่อ (DM, HT, CKD, CAD…) คงเป็นอังกฤษเสมอ ไม่แปล |
| §3 Vitals & General Appearance | คงอังกฤษ (objective data, ไม่ใช่ history) |
| §4 Review of Systems | **Thai-base** (เป็นส่วนหนึ่งของ history taking) |
| §5 Physical Examination | คงอังกฤษ (objective/exam term) |
| §6 Investigation / Treatment / Disposition | คงอังกฤษล้วน (medical term/plan) |

กฎเดียวกันนี้ apply ไปยัง 6 template อื่น โดยตัดสินจาก "เป็นส่วน history-taking (subjective, patient-reported) หรือ exam/plan (objective)" — เช่น sepsis §1 Infection & Source (มี "Onset/progression") = history → Thai-base; §2 Vitals, §3 Score, §4-7 = คงอังกฤษ

**ยังไม่ finalize:** รายการ chip text ที่ต้องแปลเป็นไทยทั้งหมด (มีหลายสิบ chip ใน 7 ไฟล์) — เสนอทำเป็น pass แยกทีละ template หลัง sign-off แนวทางนี้ก่อน เพื่อลด scope creep ของ PR เดียว

### 3.2 Investigation module (reusable, no-build-step compatible)

เนื่องจากสถาปัตยกรรมนี้ไม่มี build step/import (`er-note/*.html` ตั้งใจไม่ผูกกับ `shared/components.js`) → ทำเป็น **shared render function ใน `er-note.js`** แทนการ copy-paste markup 7 รอบ:

```js
// er-note.js (เพิ่มใหม่)
ErNote.renderInvestigation(containerEl, { labs: [...], imaging: [...] })
```
- แต่ละ template เรียก `ErNote.renderInvestigation(el, ERNOTE_INVESTIGATION_PRESET.sepsis)` โดยส่ง preset list เฉพาะโรค (เช่น sepsis → เน้น blood C/S, lactate, cultures; chest-pain → เน้น Troponin, ECG, CXR)
- Checkbox ถูก group เป็น 2 กลุ่มตาม preset: **Labs** / **Imaging** — เลือกได้หลายรายการ (multi-select)
- เพิ่ม **free-text row แยกต่างหาก** ต่อท้าย 2 กลุ่ม checkbox เสมอ (ไม่ใช่แค่ inline "Other" เล็กๆ ในกลุ่ม) สำหรับแลบ/film ที่ไม่มีใน preset — 2-way input แบบเดียวกับ Treatment module (§3.3):

```html
<div class="field-row"><label>Labs</label>
  <div class="checkbox-group" id="ix-<template>-labs"> ... </div>
</div>
<div class="field-row"><label>Imaging</label>
  <div class="checkbox-group" id="ix-<template>-imaging"> ... </div>
</div>
<div class="field-row"><label>Investigation (free text)</label>
  <input type="text" id="ix-<template>-free" placeholder="แลบ/ฟิล์มอื่นๆ นอกเหนือจากด้านบน">
</div>
```
- Output ผ่าน `copyNote()` เดิม (`extractRow()` อ่านทั้ง checkbox-group 2 แถว + input free-text 1 แถวได้ตรงๆ ไม่ต้อง custom merge) → ได้ 3 บรรทัดแยก เช่น
  `Labs: CBC, BUN/Cr, Troponin` / `Imaging: CXR, ECG` / `Investigation (free text): D-dimer` — ไม่มีช่องกรอกผล lab เลย ตรง requirement ข้อ 2
- Default preset per template (ร่างเริ่มต้น ต้องให้หมอ confirm รายการจริง):

| Template | Labs (default) | Imaging (default) |
|---|---|---|
| General | CBC, BUN/Cr/Electrolyte, LFT, UA | CXR, ECG |
| Sepsis | CBC, BUN/Cr/Electrolyte, Lactate, Blood C/S, Urine C/S, Coag | CXR |
| Chest pain | Troponin, CBC, BUN/Cr/Electrolyte, Coag | ECG, CXR |
| Abdominal pain | CBC, BUN/Cr/Electrolyte, LFT, Lipase, UA, β-hCG | US abdomen, CT abdomen, CXR (erect) |
| Trauma | CBC, Coag, Type & screen, VBG/ABG | FAST US, CXR, Pelvis X-ray, CT (specify) |
| Mammalian bite | CBC (ถ้า severe wound) | — |
| Eye injury | — | — (Seidel test อยู่ใน exam section เดิม) |

### 3.3 Treatment module

โครงสร้างเดียวกับ 3.2 (`ErNote.renderTreatment`) — **2-way input**: checkbox สำหรับ "ทำ/ให้อะไรบ้าง" ที่พบบ่อย + free-text row แยกต่างหากควบคู่กันเสมอ (เหมือน Investigation module ใน §3.2) เพื่อให้ยังพิมพ์รายละเอียด/สิ่งที่ไม่มีใน preset ได้โดยไม่ต้องรอแก้ preset:

```html
<div class="field-row"><label>Treatment given</label>
  <div class="checkbox-group" id="tx-<template>-checks"> ... </div>
</div>
<div class="field-row"><label>Treatment (free text)</label>
  <textarea id="tx-<template>-free" placeholder="เพิ่มเติม/รายละเอียดที่ checkbox ไม่ครอบคลุม"></textarea>
</div>
```
- `copyNote()`/print รวมทั้ง 2 แหล่งเป็นบรรทัดเดียวกัน (checkbox ที่ติ๊กก่อน ตามด้วย free-text ถ้ามีค่า) — ใช้ `extractRow()` เดิมได้ครบ (checkbox-group 1 แถว + textarea อีก 1 แถว, ไม่ต้อง custom merge logic)
- ยังคง **ไม่ลงรายละเอียดผลลัพธ์การรักษา** (เช่นไม่มีช่อง "pain score after treatment") ตามหลักการเดิม — free-text ใช้สำหรับ "ทำอะไรเพิ่ม/ระบุอะไรเพิ่ม" ไม่ใช่ผลลัพธ์

| Template | Checkbox (quick-select) | Free-text field |
|---|---|---|
| General | Analgesia, Antiemetic, IV fluid, O2 therapy, Wound care, Splint/Immobilize | มี (`tx-general-free`) |
| Sepsis | คง field เฉพาะเดิม (ABx regimen, fluid type, vasopressor) — clinical protocol specific ไม่ downgrade | field free-text เดิม (`sepsis-abx` เป็นต้น) ทำหน้าที่นี้อยู่แล้ว — ไม่เพิ่มซ้ำ |
| Chest pain | Aspirin given, Nitrate given, Anticoagulation started, O2 if hypoxic | มี |
| Abdominal pain | Analgesia, Antiemetic, NPO, IV fluid, Surgical consult | มี |
| Trauma | IV fluid/blood product, Tetanus given, Analgesia, Splint/Immobilize, Wound care | มี |
| Mammalian bite | คง field เดิม (Rabies PEP, Tetanus) — clinical protocol specific | field free-text เดิมทำหน้าที่นี้อยู่แล้ว |
| Eye injury | Topical antibiotic, Cycloplegic, Eye shield, Irrigation (chemical) | มี |

หมายเหตุ: template ที่มี clinical-protocol-specific fields อยู่แล้ว (sepsis ABx/fluid, mammalian-bite PEP) **ไม่แปลงเป็น checkbox ทั่วไป** เพราะจะเสีย clinical precision — เก็บ field เดิมไว้ (field เหล่านั้นเป็น free-text อยู่แล้วโดยธรรมชาติ จึงถือว่าครบ 2-way ในตัวแล้ว) เพิ่มแค่ checkbox สำหรับ "supportive treatment" ที่ยังไม่มี

### 3.4 Patient Draft Sidebar

#### 3.4.1 Storage schema v2 (breaking change, ต้อง migrate)

```
localStorage["ernote-registry"] = {
  version: 2,
  drafts: [
    { id: "d_<uuid>", template: "sepsis", hn: "1234567",
      cc: "Fever 2 days", updatedAt: 1720000000000 }
    // ...
  ]
}
localStorage["ernote-draft-<template>-<id>"] = { ...form field values... }
```

- **Migration on load**: ถ้าเจอ key เก่า `ernote-draft-<template>` (ไม่มี id) และยังไม่มี `ernote-registry` → auto-wrap เป็น draft แรกของ template นั้น (สร้าง id ใหม่, อ่าน `hn`/`cc` field ถ้ามีค่า) แล้วลบ key เก่า ทำครั้งเดียวตอน `er-note.js` โหลด
- ทุก template อ่าน `?draft=<id>` จาก URL query — ถ้าไม่มี query และไม่มี draft ค้างของ template นั้น → สร้าง draft ใหม่อัตโนมัติ (id ใหม่) ทันทีที่พิมพ์ field แรก (lazy-create, ไม่ clutter registry ด้วย draft ว่างเปล่า)

#### 3.4.2 Field เพิ่มใหม่ (ทุก template)

เพิ่ม "patient strip" บนสุดของทุกฟอร์ม (เหนือ card แรก, ไม่นับเป็น section number):
```html
<div class="patient-strip">
  <input id="ernote-hn" placeholder="HN">
  <span class="strip-time" id="ernote-arrival-time"><!-- auto timestamp, editable --></span>
</div>
```
- `HN` → ใช้ผูกกับ card ใน sidebar
- `CC` → ใช้ field ที่มีอยู่แล้วของแต่ละ template (`#cc-text` ใน general, หรือ field แรกสุดของแต่ละ template) ไม่สร้างซ้ำ
- `Time` บน card = `updatedAt` (เวลาบันทึกล่าสุด) ไม่ใช่ arrival time แยก (ตัดความซับซ้อน เว้นแต่หมอต้องการ arrival time จริงแยกจาก last-edited — ถ้าต้องการ แจ้งเพิ่ม)

#### 3.4.3 Sidebar UI

- Toggle button ใน `.top-nav` (icon, ทุกหน้า incl. index.html) → เปิด/ปิด panel เลื่อนจากขวา (`position:fixed; right:0`), ไม่ทับ print layout (`display:none` ใน `@media print`)
- แต่ละ card: `HN · CC (truncate 40 ตัวอักษร) · relative time ("5 นาทีที่แล้ว")`, แถบสีซ้าย 4px ตาม template
- Filter: input ค้นหาแบบ real-time match กับ HN หรือ CC (ไม่ query แยก, filter ฝั่ง client จาก registry array — ปริมาณ draft ใน ED ไม่มากพอที่ต้อง optimize)
- Sort: `updatedAt` desc (ล่าสุดขึ้นก่อน)
- Action ต่อ card: click ตัว card → navigate `<template>.html?draft=<id>`; ปุ่มลบ (🗑) ต่อ card → confirm แล้วลบทั้ง registry entry + form data key
- ปุ่ม "+ New" บน sidebar (แยกตาม template หรือ dropdown เลือก template) → สร้าง draft ใหม่ + navigate ไป template นั้นพร้อม `?draft=<new-id>`

#### 3.4.4 Color mapping (ตาม template)

| Template | สี (ต่อยอดจาก accent เดิม, ไม่ทับ token ระบบ) |
|---|---|
| General | `--accent` (น้ำเงิน-ม่วงเดิม) |
| Sepsis | แดง (สอดคล้อง risk-high ที่มีอยู่แล้ว) |
| Trauma | ส้ม (signal orange, ตรงกับ convention "time-critical" ใน index.html) |
| Mammalian bite | เขียวเข้ม |
| Chest pain | ม่วงเข้ม |
| Abdominal pain | เหลืองน้ำตาล (`risk-medium` tone) |
| Eye injury | ฟ้าอมเขียว (teal) |

ต้องเพิ่ม CSS var ใหม่ 7 ตัวใน `er-note.css` (`--tpl-general`, `--tpl-sepsis`, …) — ไม่กระทบ token เดิม

---

## 4. Data flow (สรุปการเปลี่ยนแปลงจาก ARCHITECTURE.md §2)

เดิม: 1 draft/template, key เดียว, ไม่มี patient identity
ใหม่: registry (index) + per-draft data key, patient identity ผ่าน HN, multi-patient concurrent ต่อ template ได้จริง — ตรงโจทย์ "ED ดูคนไข้หลายคนพร้อมกัน"

---

## 5. Implementation phases (เสนอลำดับ)

| Phase | งาน | เหตุผลลำดับ |
|---|---|---|
| P0 | Storage schema v2 + migration script ใน `er-note.js` | ต้องทำก่อนสุด ไม่งั้น sidebar ต่อยอดไม่ได้ และเสี่ยง data loss ถ้าทำทีหลัง |
| P1 | HN field (patient strip) ทุก template + wiring เข้า registry | ต้องมี HN ก่อนถึงจะสร้าง card ได้ |
| P2 | Sidebar UI (list, filter, color, new/delete) — ยังไม่แตะ investigation/treatment | แยก PR ให้ test ง่าย, ไม่ปนกับการเปลี่ยน field ทางคลินิก |
| P3 | Investigation checkbox module (`ErNote.renderInvestigation`) — เริ่มที่ general + sepsis (มี pattern อยู่แล้วบางส่วน) แล้วขยายอีก 5 | ทีละ template ลด regression risk ต่อ note ที่ใช้งานจริงหน้างาน |
| P4 | Treatment checkbox module — เริ่มที่ template ที่ยังไม่มี treatment section (general, chest-pain, abdominal-pain) | เหมือน P3 |
| P5 | ภาษา: แปล label/chip section history เป็น Thai-base ทีละ template | ทำหลังสุดเพราะเป็น cosmetic/text-only, risk ต่ำสุด แต่ปริมาณงาน copy เยอะสุด — แยก sign-off คำแปลก่อนแก้จริง |
| P6 | Bump `CACHE_VERSION` ใน `service-worker.js`, cache ไฟล์ที่แก้, update `ARCHITECTURE.md` (ADR ใหม่ต่อจาก ADR-52) | ปิดท้ายตาม convention เดิมของ repo |

---

## 6. Open questions (ต้อง confirm ก่อน implement)

1. รายการ lab/imaging preset ต่อ template (§3.2 table) — ใช่ตามที่ ER ที่นี่ practice จริงไหม หรือมีรายการเพิ่ม/ตัด
2. รายการ treatment checkbox ต่อ template (§3.3) — เช่นเดียวกัน
3. Arrival time แยกจาก "last edited time" บน card หรือไม่ (ตอนนี้ plan ใช้ last-edited เป็น default เพื่อลด field ซ้ำซ้อน)
4. Sidebar เปิดจาก icon ใน top-nav ทุกหน้า หรือจะให้เป็น floating button แยก (นอก nav)
5. เมื่อลบ draft จาก sidebar — ต้องการ confirm dialog แบบเดียวกับ `clearNote()` (`confirm()`) หรือ toast + undo
6. คำแปลไทยสำหรับ chip แต่ละอันใน §1/§2/§4 (P5) — เสนอให้ทำเป็น phase แยก ส่ง draft คำแปลมาให้ตรวจก่อน merge เข้า template จริง

---

## 7. Non-goals (ระบุชัดกันขอบเขตบาน)

- ไม่เพิ่ม server sync / cross-device draft (คง localStorage-only ตาม ARCHITECTURE.md §3 offline-first)
- ไม่แก้ scoring logic (qSOFA/SIRS/NEWS2/HEART/Alvarado/AIR) ที่มีอยู่แล้ว
- ไม่รวม `tools/er-note` เข้ากับ `shared/components.js` (คง standalone ตาม design เดิม)
