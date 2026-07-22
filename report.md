# Code Review: `tools/score-hub.html` (Clinical Score & Risk Hub)

ตรวจ commit `2673e1f feat(tools): add Clinical Score & Risk Hub tool` — เทียบกับ `ARCHITECTURE.md`/`CONTEXT.md` ที่มีอยู่ และค้นแนวทางคลินิกล่าสุด (SSC 2026, Revised Geneva Score validation studies)

## สรุปผลทดสอบอัตโนมัติ
`npm test` → **276/276 ผ่าน** (รวม `score-hub.test.js` 9/9, `dead-css-guard`, `id-integrity-guard` ครอบคลุมไฟล์นี้แล้ว)
→ ไม่มี dead CSS class, ไม่มี `getElementById` ที่ชี้ไปยัง id ที่ไม่มีจริง, ฟังก์ชันทั้ง 13 ตัวถูกเรียกใช้ครบ (ไม่มี dead function)
**ข้อจำกัด:** test ชุดนี้เช็คแค่ "มี element/keyword ครบไหม" ไม่ได้ assert ความถูกต้องของ scoring threshold เลย — บั๊กเชิงคลินิกด้านล่างจึงหลุดผ่าน CI ได้

---

## 🐞 บั๊ก

### 1. PERC Rule — label กลับด้าน (คำศัพท์คลินิกผิด, ความสำคัญสูง)
`calcPERC()` บรรทัด 1280-1288: ครบ 8/8 ข้อ (ปลอดภัย, rule-out ได้) → badge = **"PERC Positive (PE Ruled Out)"**; ไม่ครบ → default **"PERC Negative (Rule out failed)"**

ตามศัพท์มาตรฐาน: **PERC negative** = เข้าเกณฑ์ครบ 8/8 → rule out ได้; **PERC positive** = มีข้อใดข้อหนึ่งเข้าเกณฑ์ (ไม่ปลอดภัย) → rule out ไม่ได้ ต้องตรวจเพิ่ม — โค้ดนี้ใช้สลับกัน ตัวนับ (`count === 8`) และคำแนะนำทางคลินิกที่ตามมาถูกต้องหมด มีแค่ป้าย Positive/Negative ที่สลับ ซึ่งเสี่ยงให้แพทย์ที่คุ้นศัพท์เดิมตีความผิด
**แก้:** สลับข้อความเป็น `"PERC Negative (8/8 met — PE Ruled Out)"` / `"PERC Positive (Rule-out failed)"`

### 2. Revised Geneva Score — threshold ผิด off-by-one (กระทบ risk stratification)
บรรทัด 1258: `} else if (score >= 3) {` → จัดเป็น **Intermediate (28%)**
ค่ามาตรฐาน (Le Gal et al. 2006, ตรงกับ MDCalc/Medscape/Radiopaedia): **Low 0-3 / Intermediate 4-10 / High ≥11**
คะแนน = 3 พอดี ถูกจัดเป็น Intermediate ทั้งที่ควรเป็น **Low (8%)** — ผลคือแนะนำ CTA/D-dimer เกินจำเป็นเล็กน้อยที่คะแนนนี้
**แก้:** เปลี่ยนเป็น `score >= 4`

### 3. GRACE Score — ค่า default บนหน้าเว็บไม่ตรงกับผลคำนวณจริง
Input default (บรรทัด 692-728): age 60, HR 80, SBP 120, Cr 1.0, Killip I, ✅Elevated enzyme
Static placeholder ก่อน JS รัน (บรรทัด 735/738/742): score **"100"**, badge **"Low Risk (< 109)"**
คำนวณจริงผ่าน `CLINICAL_ENGINE.calcGRACE` ด้วย input เดียวกัน = 58+9+34+7+0+0+0+14 = **122** → ควรเป็น **"Intermediate Risk (109-140)"**
เพราะ `calcGRACEPure()` รันใน `DOMContentLoaded` (บรรทัด 947) ผลจริง (122) จะ flash แทนที่ "100" ทันที — ถ้า JS โหลดช้า/error ผู้ใช้จะเห็นคะแนน+badge ที่ผิดค้างอยู่
**แก้:** อัปเดต static placeholder ให้ตรงกับ default จริง หรือเปลี่ยน default input ให้ตรงกับ placeholder

---

## ⚠️ ความสอดคล้องกับแนวทางล่าสุด / เอกสาร repo

### 4. Sepsis tab — qSOFA ยังเป็น default/primary screen, ไม่ตรง SSC 2026
SSC 2026 (guideline เดียวกับที่ ER NOTE sepsis template อ้างอิงอยู่แล้วใน repo นี้) แนะนำระดับ moderate-certainty ให้ใช้ **NEWS/NEWS2/MEWS/SIRS แทน qSOFA เดี่ยวๆ** ในการ screen (qSOFA sensitivity ต่ำกว่า, เหมาะกับทำนาย deterioration มากกว่า screen)
ในไฟล์นี้: sub-tab แรกที่เปิด default คือ **"qSOFA & SIRS"** (บรรทัด 379-385), NEWS2 เป็น sub-tab รอง และ `calcSepsis()` (บรรทัด 1019-1040) ใช้ `qsofaScore >= 2 || sirsScore >= 2` เป็นตัวชี้ HIGH RISK เดียว — NEWS2 ไม่ถูกดึงเข้ามาร่วมตัดสินเลย ทำให้ qSOFA มีน้ำหนักเท่า/เหนือ NEWS2 ในทางปฏิบัติ สวนทางกับ guideline ปัจจุบันและกับแนวทางที่ ER NOTE module ใช้อยู่แล้วในโค้ดเดียวกัน
**เสนอ:** สลับให้ NEWS2 เป็น default sub-tab หรือรวม NEWS2 เข้า badge สรุปเดียว, ปรับ framing qSOFA เป็น "ตัวช่วยพยากรณ์" มากกว่า "เกณฑ์ screen หลัก"

### 5. Wells' Criteria — เอกสารกับโค้ดไม่ตรงกัน
`ARCHITECTURE.md` บรรทัด 106 ระบุ "Integrated Wells' Criteria **(2-tier & 3-tier)**" แต่ `calcWells()` (บรรทัด 1213-1236) มีแค่ 2-tier (>4.0 Likely / ≤4.0 Unlikely) — ไม่มี 3-tier (Low <2 / Moderate 2-6 / High >6) ในโค้ดจริงเลย
**ต้องเลือก:** เพิ่ม 3-tier badge ในโค้ด หรือแก้เอกสารให้ตรงกับสิ่งที่ implement จริง

### 6. Design system — ใช้สี blue แทน Braun signal-orange
`#49628d` (blue) hardcode 5 จุด (บรรทัด 60, 62, 126, 134, 172) สำหรับ active tab / focus ring / result-banner border ขณะที่ `#d84315` (`var(--signal-orange)` ที่นิยามใน `shared/base.css`) ถูกใช้แค่ 1 จุด (risk-vhigh badge)
`ARCHITECTURE.md` เรียก tool นี้ว่าใช้ "Braun analogue design system" แต่สี accent ที่เห็นบ่อยที่สุดกลับเป็นสีที่ไม่มีอยู่ใน design token ใดของ repo — ควรเปลี่ยนเป็น `var(--signal-orange)` ให้ตรง pattern ของ `index.html`/`orders/*.html`

### 7. ไม่มี print / clipboard copy / persistence
ต่างจากทุก tool อื่นใน `tools/` (`nihss.html`, `drip-calculator.html`, `Urgent-Clinic-Home-Medication.html`, `er-note/*`) ที่มีอย่างน้อยหนึ่งใน localStorage/sessionStorage persistence หรือ print/clipboard export — `score-hub.html` ไม่มีทั้งสามอย่าง ข้อมูล/ผลคะแนนหายทันทีที่ reload และ copy ไปแปะ EMR แบบ plain-text ตาม pattern เดิมของ hub ไม่ได้
ถ้าตั้งใจให้เป็นแค่ quick-reference calculator ก็โอเค แต่ถ้าจะใช้บันทึกลง note จริงควรพิจารณาเพิ่ม

---

## แนะนำเพิ่ม test coverage
`score-hub.test.js` ปัจจุบัน assert แค่การมีอยู่ของ element/keyword ไม่มี test ยืนยันค่าตัวเลขที่ threshold เลย — แนะนำเพิ่ม case: Geneva score=3 → ต้องได้ Low, GRACE default input → ต้องได้ 122/Intermediate (แล้วอัปเดต placeholder ให้ตรง), และ PERC label ให้ตรงกับพฤติกรรมที่ต้องการ เพื่อกัน regression
