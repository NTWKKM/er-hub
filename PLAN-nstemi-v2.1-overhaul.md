# Plan: NSTEMI Standing Order — v2.1 Simplification & Bug Fix

**ไฟล์เป้าหมาย:** `orders/nstemi.html`
**ADR ที่เกี่ยวข้อง:** อ้างอิงต่อจาก ADR-19 (NSTEMI UI Overhaul, 2026-07-02) — เอกสารนี้จะกลาย
เป็น **ADR-20** เมื่อ implement เสร็จ และจะ **supersede บางส่วน** ของ ADR-19 (ดูหัวข้อ 3)
**สถานะ:** Draft — รอ review ก่อนลงมือแก้โค้ด

---

## 0. สรุปสิ่งที่พบจากการอ่านโค้ดจริง (audit)

ก่อนวางแผน ผมดึง `orders/nstemi.html` ปัจจุบันจาก `main` มาอ่านทั้งไฟล์ (1060 บรรทัด)
พร้อมเทียบ id ทุกตัวที่ JS เรียกกับ id ที่ประกาศจริงใน DOM เจอสิ่งนี้:

### 🔴 Bug ที่ทำให้ "กดคำนวณแล้วไม่มีอะไรขึ้น" — เจอสาเหตุแล้ว

ใน submit handler (บรรทัด ~990) มีโค้ด:

```js
$('p-h0').textContent = troponinTimeH0 || '...';
$('p-h1').textContent = troponinTimeH1 || '...';
$('p-h3').textContent = troponinTimeH3 || '...';
```

แต่ในทั้งไฟล์ **ไม่มี** element `id="p-h0"`, `id="p-h1"`, `id="p-h3"` อยู่เลย — เป็น dead
reference ที่หลงเหลือจากก่อน ADR-19 (ตอนนั้น troponin timing แสดงผลคนละแบบ) แล้วไม่ได้ถูกลบ
ตอน refactor

ผลคือ `$('p-h0')` → `document.getElementById('p-h0')` → return `null` → `null.textContent = ...`
→ **`TypeError` throw ทันที** ซึ่งบรรทัดนี้อยู่**ก่อน**:
- ส่วนแสดงค่า troponin H0/H1/H3 ในใบสั่งยา (`p-troponin-values`, บรรทัด 994-1007) — เลยไม่เคย
  รันถึง ตรงกับที่พี่สังเกตว่า **"trop ไม่ขึ้นค่าตามที่ใส่"**
- `results-container.classList.remove('hidden')` (บรรทัด 1029) และ `showFloatBar()` — เลย
  ไม่เคยรันถึงเช่นกัน ตรงกับ **"กดคำนวณและสร้าง order ไม่มีอะไรขึ้นมาเลย"**

ทั้งสองอาการที่พี่เจอมาจาก **exception จุดเดียวกัน** — แก้จุดนี้จุดเดียวแก้ได้ทั้งคู่
(รายละเอียดการแก้อยู่หัวข้อ 3)

---

## 1. เป้าหมาย (Goals)

1. ลดจำนวนช่องกรอกและความอัดแน่นของหน้า (minimal, ไม่ใช่ตัดฟีเจอร์คลินิกที่จำเป็น)
2. ผู้ใช้เปิดหน้ามาเจอ "ใบสั่งยาเปล่า" ทันที เพื่อเห็นภาพรวมทั้งใบก่อนเริ่มกรอก
3. ตัดช่องเวลาเจาะ troponin (H0/H1/H3 time) ออก เหลือแค่ "ค่า" ที่ 3 จุดเวลา
4. eGFR แสดงผลทศนิยม 2 ตำแหน่งทุกจุดที่แสดง (ตอนนี้ไม่สม่ำเสมอ — จุดหนึ่ง 1 ตำแหน่ง จุดหนึ่ง
   ไม่ round เลย) และแก้บั๊กกดคำนวณไม่ขึ้น + troponin ไม่ขึ้น
5. อัปเดต `ARCHITECTURE.md` / `CONTEXT.md` / `DESIGN.md` ให้ตรงกับของจริงหลังแก้เสร็จ

## 2. Non-goals

- ไม่แตะ GRACE score formula / anticoag engine logic (ยังถูกต้องตาม ADR-19)
- ไม่เปลี่ยนหน้าอื่น (stemi, pe, heparin ฯลฯ) ในรอบนี้ — ทำ NSTEMI ให้เสร็จและเสถียรก่อน
  ถ้า pattern ไหนใช้ซ้ำได้ (เช่น "blank-first" UX) ค่อยพิจารณาย้ายไปหน้าอื่นเป็นงานถัดไป

---

## 3. รายละเอียดการแก้ไข

### 3.1 🔴 Bug fix: `p-h0` / `p-h1` / `p-h3` ไม่มีจริงใน DOM (priority สูงสุด — ทำก่อนข้ออื่น)

**แก้โดยลบทิ้งทั้ง 3 บรรทัด** (ไม่ใช่เพิ่ม element ใหม่มารองรับ) เพราะ:
- เวลาที่ตั้งใจจะโชว์ตรงนี้ ซ้ำกับ `troponinTimeH0/H1/H3` ที่ถูกฝังแสดงอยู่แล้วใน
  `p-troponin-values` (รูปแบบ `H0: 12 (08:30)`) — เป็นข้อมูลซ้ำ
- ตรงกับข้อ 3.3 ที่จะตัดช่องกรอกเวลาออกทั้งหมดอยู่แล้ว ดังนั้น element เหล่านี้ไม่มีเหตุผล
  ต้องมีอยู่ต่อ

```diff
-        $('p-h0').textContent = troponinTimeH0 || '...';
-        $('p-h1').textContent = troponinTimeH1 || '...';
-        $('p-h3').textContent = troponinTimeH3 || '...';
-        
         // Troponin values + %rising display in print
```

**Regression guard:** เพิ่ม smoke test เล็กๆ ใน `tests/` (เช่นต่อยอด
`order-safety-guard.test.js`) ที่ parse `orders/nstemi.html`, ดึงทุก id ที่ `$('...')` เรียกใน
`<script>`, เทียบกับทุก `id="..."` ที่ประกาศใน DOM แล้ว fail ถ้ามี id เรียกแต่ไม่มีประกาศจริง
— ป้องกัน dead-reference bug คลาสนี้เกิดซ้ำกับหน้าอื่นในอนาคตด้วย (คล้าย pattern ที่ทีมใช้ตรวจ
`GEMINI.md` skill audit)

### 3.2 Minimal / ลดความอัดแน่น

โครงสร้างเดิมตอนนี้: patient info (5 ช่อง) → eGFR/troponin panel (6 ช่อง + 1 checkbox) →
3-column grid (GRACE vars 3 ช่อง + 3 checkbox, Killip 4 radio แบบมีคำอธิบายยาว, Risk strat
9 checkbox แบ่ง 2 กลุ่ม) รวมแล้ว **~25 interactive elements** ก่อนกดคำนวณ

ข้อเสนอ (ไม่ตัดข้อมูลคลินิกที่จำเป็นต่อ GRACE/anticoag — ลดแค่ visual clutter และ redundancy):

| จุด | ปัญหา | แนวทาง |
|---|---|---|
| Creatinine ซ้ำ 2 ช่อง | `#creatinine` (patient info) กับ `#grace-creatinine` sync กันอยู่แล้วด้วย JS สองทาง (บรรทัด 736-744) — เป็นค่าเดียวกัน แต่ผู้ใช้เห็นเป็น 2 ช่องแยก ดูเหมือนต้องกรอก 2 รอบ | เหลือช่องเดียว (`#creatinine` ที่ patient info) แล้วให้ GRACE breakdown อ้างอิงค่าจากช่องนั้นตรงๆ ลบ `#grace-creatinine` และ sync logic ทิ้ง ลดลง 1 ช่อง + ลบโค้ด sync ~8 บรรทัด |
| Killip class | Radio 4 ตัวเลือกพร้อมคำอธิบายเต็มประโยคทุกตัว กินพื้นที่แนวตั้งเยอะ | ใช้ label สั้น + คำอธิบายเต็มเป็น `title` attribute (hover) หรือ collapsible detail — คงข้อมูลครบแต่ไม่บังคับแสดงตลอด |
| Risk stratification (9 checkbox) | แสดงทั้งหมดพร้อมกันเสมอ ทำให้คอลัมน์ 3 ยาวสุด | จัดเป็น checkbox-chip แนวนอน (wrap) แทน full-width label แถวเดียว ลดความสูงลงได้มาก โดยจำนวนตัวเลือกเท่าเดิม |
| eGFR/Troponin panel | เป็นกล่องเดียวใหญ่ ปนทั้ง eGFR badge + rphch checkbox + troponin 3 ช่อง + (จะตัด) เวลา 3 ช่อง | แยก eGFR badge ให้อยู่ติดกับ Creatinine เลย (จุดเดียวกับ input ที่มันคำนวณมาจาก) ส่วน troponin 3 ช่องแยกเป็น sub-block เล็กของตัวเอง |

**ผลลัพธ์คาดหวัง:** จาก ~25 elements เหลือ ~19-20 elements (ลบ creatinine ซ้ำ + เวลาสามช่อง
ตามข้อ 3.3) และความสูงหน้าจอ (vertical space) ลดลงจาก Killip/Risk-strat compaction

### 3.3 ตัดช่องเวลาเจาะ troponin ออก (H0/H1/H3 เหลือแค่ค่า)

**หมายเหตุ:** นี่คือการ**ย้อน (revert) บางส่วนของ ADR-19** ซึ่งตอนนั้นตั้งใจเพิ่มช่องเวลา
manual เพื่อให้ตรงกับ workflow จริง (เจาะไม่ตรงเวลาเป๊ะ) — ตอนนี้ตัดสินใจว่าค่าตัวเลขที่ 3 จุด
(0h/1h/3h) พอแล้ว ไม่ต้อง track เวลาจริงในระบบนี้ ให้บันทึกในเวชระเบียนแทน

การเปลี่ยนแปลง:
- ลบ input `#trop-time-h0`, `#trop-time-h1`, `#trop-time-h3` ออกจาก DOM
- ลบตัวแปร `troponinTimeH0/H1/H3` และการอ่านค่าจาก DOM ใน submit handler
- ลบ badge แสดงเวลา `screen-h0`/`screen-h1`/`screen-h3` และ div `.troponin-times` ทั้งก้อน
  (เพราะไม่มีเวลาให้โชว์แล้ว) — ถ้าต้องการคงกรอบไว้โชว์แค่ "มี/ไม่มีค่า" ก็ปรับเป็น badge
  ง่ายๆ ว่า H0 ✓ / H1 ✓ / H3 ✓ แทน
- `p-troponin-values` (ในใบพิมพ์) เหลือแสดงแค่ `H0: 12`, `H1: 15 → +25.0%`, `H3: 20 → +66.7%`
  (ตัดวงเล็บเวลาออก)
- อัปเดต `ED_BLANK_PRINT.register([...])` manifest ให้ตัด entry ของ `p-h0/p-h1/p-h3` (ซึ่งจะ
  ไม่มีอยู่แล้วหลังข้อ 3.1) และเอา reset rule ของช่องเวลาที่ลบออกไปด้วย

### 3.4 eGFR ทศนิยม 2 ตำแหน่ง (ทุกจุดที่แสดง) + ผูกกับ bug fix ข้อ 3.1

พบว่าปัจจุบัน eGFR แสดงผล**ไม่สม่ำเสมอ**กันเองในหน้าเดียว:

| จุดที่แสดง | โค้ดปัจจุบัน | ปัญหา |
|---|---|---|
| `#screen-egfr` (live badge ตอนกรอก) | `egfr.toFixed(1)` | 1 ตำแหน่ง |
| Anticoag hint (`ac-fonda-hint` ฯลฯ) | `egfrLive.toFixed(1)` | 1 ตำแหน่ง |
| `#p-egfr` (ในใบสั่งยาที่พิมพ์จริง) | `egfr` (raw, **ไม่ round เลย**) | พิมพ์ทศนิยมยาวๆ ลงใบสั่งยาจริง เช่น `87.43219...` — ไม่เหมาะกับเอกสารทางคลินิก |

**แก้:** เปลี่ยนทุกจุดเป็น `.toFixed(2)` ให้ตรงกันหมด รวมถึง `$('p-egfr').textContent` ที่
ตอนนี้ไม่ได้ format เลย (จุดนี้คือบั๊กจริงที่ต้องแก้ ไม่ใช่แค่ preference)

```diff
- $('screen-egfr').textContent = egfr.toFixed(1);
+ $('screen-egfr').textContent = egfr.toFixed(2);
```//  ทำแบบเดียวกันกับอีก 3 จุด (ac-fonda-hint, ac-enox-hint, ac-hep-hint, p-egfr)

### 3.5 ให้เห็น "ใบสั่งยาเปล่า" ทันทีที่เปิดหน้า

ตอนนี้ `#results-container` เริ่มด้วย class `hidden` และ user ต้องกด "🖨️ ใบสั่งยาเปล่า
(Blank Order)" เองถึงจะเห็น layout เต็ม (ปุ่มนี้มีอยู่แล้ว ผูกกับ `ED_BLANK_PRINT.apply()`
ที่บรรทัด 1042-1048)

**แก้:** trigger ปุ่มนี้อัตโนมัติตอน `DOMContentLoaded` (คล้าย pattern ที่มีอยู่แล้วสำหรับ
`?print-blank-direct=true` URL param ที่บรรทัด 1051) แทนที่จะรอ user กด:

```diff
     // Auto-run print-blank-direct from home page portal
     if (ED_PRINT_BOOTSTRAP.handlePrintBlankDirect(() => $('print-blank-btn').click())) return;

+    // Show blank order preview by default on page load (no query param needed)
+    $('print-blank-btn').click();
+
     ED_COMPONENTS.injectNavBar(...);
```

ผลคือผู้ใช้เห็นใบสั่งยาเปล่าเต็มรูปแบบต่อจากฟอร์มทันที เห็นภาพรวมทั้งหมดว่ามี order อะไรบ้าง
ก่อนเริ่มกรอกข้อมูล พอกด "คำนวณ" จริง ค่าจะ overwrite ใบเปล่านั้นตามปกติ (ใช้กลไก
`ED_BLANK_PRINT` / submit handler เดิม ไม่ต้องเขียนใหม่)

**ข้อควรระวัง:** ต้อง apply การแก้ 3.1 ก่อน ไม่งั้น auto-trigger นี้จะไปชนบั๊กเดิมทันทีที่โหลด
หน้า (แม้จะเป็น blank print path ไม่ใช่ submit path ก็ควร verify ว่า `ED_BLANK_PRINT.apply()`
ไม่ได้พึ่งพา element ที่ถูกลบไปในข้อ 3.3 ด้วย — ต้องอัปเดต manifest ให้สอดคล้องกัน)

---

## 4. ลำดับการทำงานที่แนะนำ (implementation order)

1. **3.1** bug fix ก่อนเสมอ (แก้ crash) + เพิ่ม regression test
2. **3.3** ตัดช่องเวลา troponin (ต้องทำคู่กับ 3.1 เพราะแก้ manifest พร้อมกัน)
3. **3.4** eGFR 2 ตำแหน่งทศนิยมทุกจุด
4. **3.5** blank-order-first (ทำหลังสุด เพราะพึ่งพาว่า 3.1/3.3 เสถียรแล้ว)
5. **3.2** compact layout — ทำเป็นลำดับสุดท้ายเพราะเป็น visual-only ไม่กระทบ logic

## 5. หลังแก้โค้ดเสร็จ — อัปเดตเอกสาร (บังคับ ตาม convention ของโปรเจกต์)

โปรเจกต์นี้ยึดหลัก ADR ใน `ARCHITECTURE.md` ทุกครั้งที่มีการเปลี่ยนโครงสร้าง/พฤติกรรมของหน้า
order — งานนี้ต้อง:

- **`ARCHITECTURE.md`**
  - เพิ่ม **ADR-20: NSTEMI v2.1 — Bug Fix + Minimalist Layout + Blank-First UX
    (วันที่ implement จริง)** ตามฟอร์แมตเดียวกับ ADR-19 (Context / Decision / Rationale /
    Tests / Consequences) — ระบุชัดว่า **supersede ADR-19 ข้อ "Added 3-column troponin
    kinetics section ... each with manual time input"** เพราะตอนนี้ตัดเวลาออกแล้ว
  - อัปเดตแถว `orders/*.html` ในตาราง Core Components ถ้าคำอธิบายพฤติกรรม blank-print
    เปลี่ยนไป (ตอนนี้บอกว่า "2 pages (rtpa, nstemi) keep ED_BLANK_PRINT" — ยังจริงอยู่ แต่
    ควรเพิ่มโน้ตว่า nstemi แสดง blank อัตโนมัติตอนโหลดหน้าด้วย ไม่ใช่แค่ตอนกด "3.5")
  - เพิ่ม bug entry ใน "Clinical & System Warnings" (section 4) สำหรับ 3.1 คล้าย W-04/W-07
    ที่มีอยู่แล้ว เพื่อบันทึกไว้ว่าเคยมี dead-reference crash นี้ (ประโยชน์เชิง postmortem)
- **`CONTEXT.md`** — อัปเดตส่วนที่อธิบายฟีเจอร์ troponin timing ของ nstemi (ถ้ามีบรรยายไว้)
  ให้ตรงกับสภาพจริงหลังตัดช่องเวลาออก
- **`DESIGN.md`** — ถ้ามีการพูดถึง layout/spacing convention ของหน้า order ให้ปรับให้สอดคล้อง
  กับแนวทาง "compact / chip-based" ที่ใช้ใน 3.2 เผื่อหน้าอื่นจะหยิบไปใช้ต่อ
- **Version string ในตัวหน้าเอง** — พบว่าปัจจุบันมี **ความไม่ตรงกัน**: nav bar footer บอก
  `Version 2.0.0` (บรรทัด ~1054) แต่ใบพิมพ์จริงบอก `Version: 1.2.0` (บรรทัด ~600) — สอง
  string นี้ต้อง sync กันเป็นเลขเดียว และ bump เป็น **2.1.0** ทั้งคู่ตอน merge งานนี้

## 6. Test coverage ที่ควรเพิ่ม/ปรับ

- Regression test สำหรับ 3.1 (id-existence smoke test ตามหัวข้อ 3.1)
- ปรับ/ลบ test case ใดๆ ใน `tests/` ที่ยัง assert พฤติกรรมของช่องเวลา troponin ที่ถูกลบ
- เพิ่ม test สำหรับ eGFR formatting (`.toFixed(2)`) ถ้ามี test file ที่ cover
  `calcEGFR_CKD_EPI_2021` อยู่แล้ว (`tests/anticoag-engine.test.js`) — เพิ่ม assertion เรื่อง
  string format ที่จุดแสดงผล ไม่ใช่แค่ราคาตัวเลข
- รัน full suite (`tests/*.test.js`) ให้ผ่านหมดก่อน merge เหมือนที่ ADR-19 ทำ (130 tests
  ผ่านหมด ไม่มี regression)

---

## 7. สรุป checklist สั้นๆ

- [ ] ลบ `$('p-h0')/$('p-h1')/$('p-h3')` reference (แก้ crash)
- [ ] เพิ่ม id-existence smoke test
- [ ] ลบ input + badge เวลาเจาะ troponin ทั้ง 3 จุด (H0/H1/H3)
- [ ] ปรับ manifest `ED_BLANK_PRINT.register([...])` ให้ตรงกับ DOM ใหม่
- [ ] `.toFixed(2)` ทุกจุดที่แสดง eGFR (4 จุด: screen-egfr, 3× anticoag hint, p-egfr)
- [ ] ลบช่อง `#grace-creatinine` ซ้ำ + sync logic
- [ ] Compact Killip radio + risk-stratification checkbox layout
- [ ] Auto-trigger blank order preview ที่ `DOMContentLoaded`
- [ ] Sync version string เป็น 2.1.0 ทั้ง nav footer และใบพิมพ์
- [ ] เขียน ADR-20 ใน `ARCHITECTURE.md` (supersede ส่วนของ ADR-19)
- [ ] อัปเดต `CONTEXT.md` / `DESIGN.md` ตามที่เปลี่ยนจริง
- [ ] รัน test suite ทั้งหมดให้ผ่าน
