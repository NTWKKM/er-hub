# Plan: Review `tools/score-hub.html` — Clinical Accuracy + Theme Colors

Repo: `github.com/NTWKKM/er-hub` · ไฟล์: `tools/score-hub.html` (+ `shared/clinical-engine.js`)

---

## 1. Clinical Accuracy — เรียงตามความสำคัญ

### 🔴 Critical — `calcMEWS()` ไม่มีอยู่จริง (ReferenceError)
- `mews-*` selects ทุกตัวเรียก `onchange="calcMEWS()"` และ init script เรียก `calcMEWS()` ตอน `DOMContentLoaded` (บรรทัด ~998) แต่ **ไม่มี `function calcMEWS()` ในไฟล์เลย**
- ผลกระทบ:
  - ตอนโหลดหน้า `calcMEWS()` throw ทันที → `DOMContentLoaded` callback หยุดกลางคัน → `calcABCD2/calcHEART/calcGRACEPure/calcWells/calcGeneva/calcPERC` ที่เรียกต่อจากมัน **ไม่ทำงานตอน initial load** (ผลลัพธ์ที่เห็นตอนแรกเป็นค่า hardcoded ใน HTML เท่านั้น ไม่ใช่ค่าที่คำนวณจริง)
  - เวลาผู้ใช้เปลี่ยนค่าใน MEWS tab → error ทุกครั้ง, badge/guidance ค้างที่ "Low Risk (0-1)" เสมอ ไม่ว่าใส่ vitals แบบไหน → **ความเสี่ยงทางคลินิก**: หมอเห็น "Low Risk" ทั้งที่ vitals แย่จริง
- แก้: เขียน `calcMEWS()` (pattern เดียวกับ `calcNEWS2`: sum ค่า option ของ `mews-sbp/hr/rr/temp/avpu`) + confirm cutoff risk tier ที่จะใช้ (ดู open question ด้านล่าง)

### 🟡 Moderate — Revised Geneva Score: "Previous DVT/PE" ผิด weight
- โค้ดปัจจุบัน (`calcGeneva`, id `geneva-prev`) ให้ **+2**
- ค่ามาตรฐาน (Le Gal 2006 / MDCalc): Previous DVT or PE = **+3**
- จุดอื่นถูกหมดแล้ว (age>65=+1, HR75-94=+3, HR≥95=+5, surgery/fracture=+2, malignancy=+2, unilateral leg pain=+3, hemoptysis=+2, palpation+edema=+4)
- ผลกระทบ: คนไข้ที่มีประวัติ DVT/PE จะได้คะแนนต่ำกว่าจริง 1 แต้ม → เสี่ยงจัดกลุ่มความเสี่ยงผิด (เช่น ควรอยู่ intermediate/high แต่ตกไป low)
- แก้: เปลี่ยน `+2` → `+3` ในโค้ด และ label `(+2)` → `(+3)`

### ⚪ Minor / low-impact — GRACE lookup boundary rounding
- `lookupPts` ใช้ `val < threshold`; ที่ค่าขอบพอดี (เช่น HR = 50 เป๊ะ) จะได้คะแนนของช่วงถัดไปแทนช่วงปัจจุบัน (HR 50 ควรได้ 0 แต่ได้ 3)
- Impact ต่ำมาก (vitals ตรงขอบพอดีเจอไม่บ่อย) แต่ถ้าอยากให้ตรง MDCalc/GRACE ต้นฉบับเป๊ะ ต้องปรับ boundary logic (`<=` vs `<`) ให้ตรงกับนิยามช่วงจริง
- eGFR CKD-EPI 2021 formula ตรวจแล้ว: ถูกต้อง (kappa/alpha/exponent ตรง 2021 race-free equation)

### ✅ ตรวจแล้วถูกต้อง (cross-check กับ literature)
AWS/CIWA-Ar (10 items, cutoff <10/10-19/≥20), SIRS (≥2 = positive), NEWS2 (point table + escalation ≥7/5-6/0-4 ตรง RCP NEWS2 เป๊ะ), ABCD2 (cutoff + % ตรง Johnston 2007), HEART (cutoff + %MACE ตรง Six 2008), GRACE risk tiers (>140/109-140/<109), Wells (2-tier >4 + 3-tier >6/2-6/<2), PERC (checkbox ใช้ phrasing เชิงลบ "No prior DVT" ฯลฯ ซึ่งถูกต้องแล้ว — count=8 = rule-out จริง ไม่ใช่ bug)

### 📝 Scope note (ไม่ใช่ bug)
NEWS2 ใช้ SpO2 Scale 1 อย่างเดียว ไม่มี Scale 2 (สำหรับผู้ป่วย COPD/hypercapnic ที่ target SpO2 88-92%) — เหมาะกับการใช้งานทั่วไปใน ED แต่ถ้าอยากครบสามารถเพิ่มเป็น toggle ในอนาคต

---

## 2. ปรับสีให้เข้ากับ Theme เว็บ (Braun design system ตาม `DESIGN.md`)

พาเลตหลักของ score-hub ใกล้เคียง Braun tokens อยู่แล้ว (`#ebe7df`, `#d8d4c8`, `#1a1a1a`, signal-orange) แต่ครึ่งหนึ่งเขียนเป็น raw hex ซ้ำค่าที่มี CSS variable ให้แล้วใน `base.css` แทนที่จะอ้างอิง var — ตอนนี้หน้าตาเหมือนกันแต่จะ drift ถ้า token เปลี่ยนในอนาคต (เช่นที่เคยเปลี่ยน background จาก `#f4f2ec` → `#ebe7df` มาแล้วครั้งหนึ่ง)

### แทน raw hex ด้วย shared var (ไม่เปลี่ยนหน้าตา แค่ผูกกับ token)
| ตำแหน่ง | ปัจจุบัน | ควรเป็น |
|---|---|---|
| `.tab-btn` background | `#f4f2ec` | ยืนยันว่ายังต้องการอ่อนกว่า `#ebe7df` หรือ map เข้า token เดียวกัน |
| `.calc-card` border | `#d8d4c8` | `var(--rule)` |
| `.calc-card-title` color | `#1a1a1a` | `var(--ink)` |
| `.input-group label` color | `#2b2b2b` | `var(--ink)` หรือ token ใกล้เคียง |
| focus/border ใน input | `#bbb` | `var(--rule)` |

### ⚠️ จุดที่ต้องตัดสินใจ ไม่ใช่แค่ rename
- **`.risk-vhigh` badge ใช้ signal-orange (`#d84315`) เต็มพื้น** สำหรับ "very high/severe/high risk" ในหลาย tab (AWS severe, NEWS2 high, ABCD2 high, HEART high)
  - `DESIGN.md` ระบุชัดว่า signal-orange **สงวนไว้เฉพาะ time-critical status dot บน portal** (rt-PA/STEMI/Massive PE) เท่านั้น
  - ข้อเสนอ: เปลี่ยน `.risk-vhigh` ไปใช้ `#c0392b` (สี "danger/critical" ที่ใช้ทั่วไปในหน้าอื่นอยู่แล้ว เช่น cardiac theme, field-error, clear button) แทน เพื่อให้ signal-orange คงความหมายพิเศษเฉพาะ portal ไว้ — **ต้องการคำยืนยันจาก Plan ว่าจะเปลี่ยนหรือคงไว้แบบเดิม**
- **`.sub-btn` (sub-nav ใต้ Sepsis/PE tab)** ใช้โทน slate `#eef2f7 / #cbd5e1 / #334155` ซึ่งเป็นคนละสไตล์กับ Braun ไปเลย (ดูเหมือน Tailwind slate ที่หลุดเข้ามา) ไม่ตรงกับ `.tab-btn` ที่อยู่ระดับบนสุดของหน้าเดียวกัน
  - ข้อเสนอ: restyle `.sub-btn` ให้ใช้ pattern เดียวกับ `.tab-btn` (graphite/rule ปกติ, signal-orange ตอน active) เพื่อให้ sub-nav รู้สึกเป็นส่วนเดียวกับหน้า ไม่ใช่ component แปลกปลอม
- `.tab-btn.active` ใช้ signal-orange ทั้งพื้นหลัง — อันนี้ **สอดคล้องกับ precedent ที่มีอยู่แล้วในไฟล์เดียวกัน** (input focus border ก็ใช้ signal-orange) → เก็บไว้แบบเดิมได้ ไม่ต้องแก้

---

## Open questions (ต้องการคำตอบก่อนลงมือแก้จริง)
1. MEWS risk cutoff จะใช้เกณฑ์ไหน — HTML ปัจจุบันตั้ง default text ไว้ที่ "Low Risk (0-1)" แสดงว่าตั้งใจ ≤1=low แต่ยังไม่มีเกณฑ์ medium/high ที่ชัดเจนในโค้ด (คำแนะนำทั่วไปที่ใช้กันคือ 0-2 Low / 3-4 Medium / ≥5 High แต่ต่างกันไปตาม protocol ของแต่ละ รพ.)
2. คงหรือเลิกใช้ signal-orange สำหรับ `.risk-vhigh` badge
3. Restyle `.sub-btn` ให้เข้าธีมตอนนี้เลย หรือปล่อยไว้ก่อน
