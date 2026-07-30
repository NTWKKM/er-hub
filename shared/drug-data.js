const EMERGENCY_DRUG_DATA = [
  {
    id: 'epinephrine',
    name: 'Epinephrine (Adrenaline)',
    thaiName: 'เอพิเนฟริน (อะดรีนาลีน)',
    doseUnit: 'mcg/kg/min',
    isWeightBased: true,
    preparations: [
      { label: '10 mg in NSS 100 mL (100 mcg/mL)', concentration: 100 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.05, max: 3, step: 0.01, default: 0.1 },
    titrationGuide: 'ปรับเพิ่มครั้งละ 0.01 mcg/kg/min ทุก 15 นาที เพื่อเป้าหมาย MAP ≥ 65 mmHg',
    indications: [
      {
        name: 'Septic shock',
        dose: 'เริ่มต้น 0.05 - 2 mcg/kg/min ปรับเพิ่มทีละ 0.02 - 0.05 mcg/kg/min ทุก 10-15 นาที'
      }
    ],
    safetyWarnings: [
      'เป็นยา HAD (High Alert Drug) ต้องจ่ายผ่าน Infusion pump เท่านั้น',
      'สังเกตภาวะ extravasation, ตรวจบริเวณตำแหน่งแทงเข็มเขียวช้ำทุก 4 ชม.',
      'เกณฑ์รายงานแพทย์: BP > 160/110 mmHg หรือ HR > 155 bpm หรือปลายมือปลายเท้าเขียว'
    ],
    group: 'Vasopressors & Inotropes'
  },
  {
    id: 'epinephrine-anaphylaxis',
    name: 'Epinephrine (Refractory Anaphylaxis / Bradycardia)',
    thaiName: 'เอพิเนฟริน (แพ้รุนแรงที่ไม่ตอบสนอง / หัวใจเต้นช้า)',
    doseUnit: 'mcg/min',
    isWeightBased: false,
    preparations: [
      { label: '1 mg in D5W/NSS 250 mL (4 mcg/mL)', concentration: 4 },
      { label: '1 mg in D5W/NSS 500 mL (2 mcg/mL)', concentration: 2 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 1, max: 10, step: 0.5, default: 1 },
    titrationGuide: 'ปรับตามการตอบสนองทางคลินิก/BP เป็นระยะสั้นๆ (ไม่ใช่ทุก 15 นาที); ไม่มีเป้า MAP ตายตัว',
    indications: [
      {
        name: 'Anaphylaxis (IV infusion)',
        dose: 'เริ่มต้น 1 mcg/min (เช่น ผสม 1 mg in 500 mL D5W rate 0.5 mL/min) และ titrate ตามอาการ'
      },
      {
        name: 'Bradycardia (IV infusion)',
        dose: '2 - 10 mcg/min ปรับตามการตอบสนอง (titrate to desired response)'
      }
    ],
    safetyWarnings: [
      'ใช้เมื่อไม่ตอบสนองต่อ IM epinephrine หรือ BP ต่ำมาก',
      'สำหรับเด็กใช้สูตร weight-based แยกต่างหาก (rule of 6, เริ่ม 0.1 mcg/kg/min)',
      'เป็นยา HAD (High Alert Drug) ต้องจ่ายผ่าน Infusion pump เท่านั้น',
      'สังเกตภาวะ extravasation, ตรวจบริเวณตำแหน่งแทงเข็มเขียวช้ำทุก 4 ชม.',
      'เกณฑ์รายงานแพทย์: BP > 160/110 mmHg หรือ HR > 155 bpm หรือปลายมือปลายเท้าเขียว'
    ],
    group: 'Vasopressors & Inotropes'
  },
  {
    id: 'norepinephrine',
    name: 'Norepinephrine (Levophed)',
    thaiName: 'นอร์เอพิเนฟริน (เลโวเฟด)',
    doseUnit: 'mcg/kg/min',
    isWeightBased: true,
    preparations: [
      { label: '4 mg in D5W 100 mL (40 mcg/mL)', concentration: 40 },
      { label: '8 mg in D5W 100 mL (80 mcg/mL)', concentration: 80 },
      { label: '4 mg in D5W 250 mL (16 mcg/mL)', concentration: 16 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.02, max: 3, step: 0.01, default: 0.1 },
    titrationGuide: 'ปรับเพิ่มครั้งละ 0.05 mcg/kg/min ทุก 3 นาที เพื่อเป้าหมาย MAP ≥ 65 mmHg',
    indications: [
      {
        name: 'Septic Shock (First-line vasopressor)',
        dose: 'เริ่มต้น 0.05 mcg/kg/min ปรับเพิ่มทีละ 0.05 mcg/kg/min ทุก 3-5 นาที เพื่อเป้าหมาย MAP ≥ 65 mmHg'
      },
      {
        name: 'Cardiogenic / Vasodilatory Shock (Second-line)',
        dose: 'เริ่มต้น 0.02-0.05 mcg/kg/min ร่วมกับ Inotrope (เช่น Dobutamine) ปรับตาม MAP และ Perfusion'
      }
    ],
    safetyWarnings: [
      'ต้องผสมเจือจางใน D5W เท่านั้น ห้ามผสมใน NSS เปล่าๆ เพื่อเสถียรภาพของยา',
      'ต้องให้ทางหลอดเลือดดำใหญ่ (Central line หรือ Large vein) เพื่อเลี่ยง Extravasation necrosis'
    ],
    group: 'Vasopressors & Inotropes'
  },
  {
    id: 'dopamine',
    name: 'Dopamine',
    thaiName: 'โดปามีน',
    doseUnit: 'mcg/kg/min',
    isWeightBased: true,
    preparations: [
      {
        label: '250 mg in NSS 250 mL (1,000 mcg/mL)',
        concentration: 1000
      },
      {
        label: '250 mg in NSS 125 mL (2,000 mcg/mL)',
        concentration: 2000
      }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 2, max: 20, step: 0.5, default: 5 },
    titrationGuide: 'ปรับขนาดยาตามข้อบ่งใช้ (Inotropic: 2-5 mcg/kg/min, Vasopressor: 10-20 mcg/kg/min)',
    indications: [
      {
        name: 'Symptomatic Bradycardia',
        dose: '5-20 mcg/kg/min ปรับตามการตอบสนอง'
      },
      { name: 'Inotropic support', dose: '2-5 mcg/kg/min (Low dose)' },
      {
        name: 'Vasopressor support',
        dose: '10-20 mcg/kg/min (High dose) *ไม่แนะนำเป็น first-line ใน Septic Shock (SSC 2026)'
      }
    ],
    safetyWarnings: [
      'ระวังสับสนชื่อยากับ Heparin หรือ Dobutamine',
      'ติดตาม HR และ EKG สม่ำเสมอ ระวังภาวะ Tachyarrhythmias ในขนาดสูง'
    ],
    group: 'Vasopressors & Inotropes'
  },
  {
    id: 'dobutamine',
    name: 'Dobutamine',
    thaiName: 'โดบูตามีน',
    doseUnit: 'mcg/kg/min',
    isWeightBased: true,
    preparations: [
      {
        label: '250 mg in NSS 250 mL (1,000 mcg/mL)',
        concentration: 1000
      },
      {
        label: '250 mg in NSS 125 mL (2,000 mcg/mL)',
        concentration: 2000
      }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 2.5, max: 20, step: 0.5, default: 5 },
    titrationGuide: 'ปรับขนาดยาเพิ่มทีละขั้นตามอาการทางคลินิก (Max 20 mcg/kg/min)',
    indications: [
      {
        name: 'Cardiogenic Shock / Severe Heart Failure',
        dose: 'เริ่มต้น 2.5-5 mcg/kg/min ปรับเพิ่มตามอาการทางคลินิก (Max 20 mcg/kg/min)'
      },
      {
        name: 'Septic Shock with Cardiac Dysfunction (SSC 2026)',
        dose: 'พิจารณาเพิ่มร่วมกับ Norepinephrine หากยังมี hypoperfusion และ cardiac dysfunction แม้ให้สารน้ำเพียงพอ'
      }
    ],
    safetyWarnings: [
      'ใช้สำหรับรักษาภาวะหัวใจล้มเหลว (Heart failure/Cardiogenic shock) ที่มีน้ำเกิน',
      'ติดตาม Vital Signs และ EKG ระวังหัวใจเต้นผิดจังหวะ และภาวะความดันโลหิตต่ำจาก Vasodilation'
    ],
    group: 'Vasopressors & Inotropes'
  },
  {
    id: 'vasopressin',
    name: 'Vasopressin',
    thaiName: 'ยากระตุ้นความดัน (Vasopressin)',
    isWeightBased: false,
    doseUnit: 'units/min',
    doseRange: { min: 0.01, max: 0.04, step: 0.01, default: 0.03 },
    absoluteMaxPerHour: 2.4,
    defaultPreparationIndex: 0,
    preparations: [
      { label: '40 units in NSS 100 mL', concentration: 0.4 },
      { label: '20 units in NSS 100 mL', concentration: 0.2 }
    ],
    titrationGuide: 'Fixed dose ที่ 0.03 units/min (ไม่แนะนำให้ปรับขึ้นลง หรือ Titrate ตาม BP)',
    indications: [
      {
        name: 'Septic Shock (SSC 2026)',
        dose: '0.03 units/min เป็นยาตัวที่สอง (Second-line) ร่วมกับ Norepinephrine'
      }
    ],
    safetyWarnings: [
      'เพิ่มความเสี่ยงต่อภาวะขาดเลือดส่วนปลาย (Digital/Mesenteric Ischemia)'
    ],
    group: 'Vasopressors & Inotropes'
  },
  {
    id: 'esmolol',
    name: 'Esmolol (Brevibloc)',
    thaiName: 'เอสโมลอล (เบรวิบล็อค)',
    doseUnit: 'mg/kg/min',
    isWeightBased: true,
    preparations: [
      { label: '100 mg in 10 mL ampule (10 mg/mL)', concentration: 10 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.05, max: 0.3, step: 0.01, default: 0.05 },
    titrationGuide: 'ปรับเพิ่มครั้งละ 0.05 mg/kg/min ทุก 4 นาที, ค่อยๆ ลดขนาดช้าๆ (Tapering) เมื่อต้องการหยุดยา',
    indications: [
      {
        name: 'Aortic Dissection / Tachycardia',
        dose: 'เริ่มต้น 0.05-0.1 mg/kg/min ปรับเพิ่ม 0.05 mg/kg/min ทุก 4 นาที (Max 0.3 mg/kg/min) เพื่อเป้าหมาย HR < 60 bpm'
      }
    ],
    safetyWarnings: [
      'หมายเหตุความปลอดภัย: อัตราการให้ยา 0.05 - 0.3 mg/kg/min เทียบเท่ากับ 50 - 300 mcg/kg/min ในมาตรฐานสากล',
      'ติดตาม BP และ HR ถี่ๆ ทุก 2-5 นาที ระวังภาวะความดันโลหิตต่ำและชีพจรช้าผิดปกติ'
    ],
    showDualUnits: true,
    altUnit: 'mcg/kg/min',
    altUnitFactor: 1000,
    group: 'Antihypertensives'
  },
  {
    id: 'labetalol',
    name: 'Labetalol',
    thaiName: 'ลาเบทาลอล',
    doseUnit: 'mg/min',
    isWeightBased: false,
    preparations: [
      { label: '100 mg in NSS 50 mL (2 mg/mL)', concentration: 2 },
      { label: '200 mg in NSS 200 mL (1 mg/mL)', concentration: 1 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.5, max: 3, step: 0.1, default: 1 },
    titrationGuide: 'เริ่มให้ยาในอัตราคงที่ 0.5 - 2 mg/min ปรับเปลี่ยนขนาดยาตามเป้าหมายของความดันโลหิต',
    indications: [
      {
        name: 'Hypertensive Emergency',
        dose: 'เริ่มต้น 0.5-2 mg/min IV drip ปรับตามเป้าหมาย BP ลดลง 10-20% ใน 1 ชม.แรก (ห้ามลดเร็วเกินไป)'
      },
      {
        name: 'Acute Ischemic Stroke (AHA 2026)',
        dose: 'เป้าหมาย BP < 185/110 ก่อนให้ rtPA และ < 180/105 หลังให้ (หากไม่ได้รับ rtPA ยอมรับได้ถึง 220/120)'
      }
    ],
    safetyWarnings: [
      'ขนาดสูงสุดห้ามเกิน 300 mg/วัน (mg/day)',
      'ห้ามใช้ในผู้ป่วยโรคหอบหืดรุนแรง (COPD/Asthma) หรือหัวใจเต้นช้าขั้นรุนแรง (Heart block)'
    ],
    group: 'Antihypertensives'
  },
  {
    id: 'nicardipine',
    name: 'Nicardipine',
    thaiName: 'นิคาร์ดิปีน',
    doseUnit: 'mg/hr',
    isWeightBased: false,
    preparations: [
      { label: '10 mg in NSS 100 mL (0.1 mg/mL)', concentration: 0.1 },
      { label: '20 mg in NSS 100 mL (0.2 mg/mL)', concentration: 0.2 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 5, max: 15, step: 0.5, default: 5 },
    titrationGuide: 'เริ่มต้น 5 mg/hr ปรับเพิ่มขึ้นครั้งละ 2.5 mg/hr ทุก 15 นาที เมื่อคุมความดันโลหิตได้ตามเป้าหมายแล้ว ลดระดับลงเหลือ 3-5 mg/hr',
    indications: [
      {
        name: 'Hypertensive Emergency',
        dose: 'เริ่มต้น 5 mg/hr ปรับเพิ่มทีละ 2.5 mg/hr ทุก 15 นาที (max 15 mg/hr) เพื่อลด BP 10-20% ใน 1 ชม.แรก'
      },
      {
        name: 'Acute Ischemic Stroke / ICH (AHA 2026)',
        dose: 'ใช้คุมความดันโลหิตอย่างรวดเร็วและนิ่มนวล ปรับเพิ่ม 2.5 mg/hr ทุก 5-15 นาที'
      }
    ],
    safetyWarnings: [
      'เฝ้าระวังภาวะ Phlebitis (หลอดเลือดอักเสบ) แนะนำให้เปลี่ยนตำแหน่งหลอดเลือดดำทุก 12 ชม. หากให้ผ่านทางหลอดเลือดดำส่วนปลาย'
    ],
    group: 'Antihypertensives'
  },
  {
    id: 'nitroglycerin',
    name: 'Nitroglycerin (NTG)',
    thaiName: 'ไนโตรกลีเซอรีน',
    doseUnit: 'mcg/min',
    isWeightBased: false,
    preparations: [
      { label: '50 mg in NSS 250 mL (200 mcg/mL)', concentration: 200 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 5, max: 400, step: 5, default: 5 },
    titrationGuide: 'เริ่มต้น 5 mcg/min ปรับขึ้นทุกๆ 5 นาที ตามระดับความดันโลหิตและระดับความปวดเจ็บเค้นหน้าอก',
    indications: [
      {
        name: 'Acute Coronary Syndrome (ACS)',
        dose: 'เริ่มต้น 5-10 mcg/min ปรับขึ้น 5-10 mcg/min ทุก 5 นาที จนกว่าจะหายปวดหรือเกิดผลข้างเคียง (max 200-400 mcg/min)'
      },
      {
        name: 'Acute Heart Failure / Pulmonary Edema',
        dose: 'เริ่มต้น 10-20 mcg/min อาจปรับเพิ่มเร็วขึ้นเพื่อลด Preload'
      }
    ],
    safetyWarnings: [
      'ห้ามใช้เด็ดขาดในผู้ป่วยที่ได้รับยากลุ่มรักษาภาวะหย่อนสมรรถภาพทางเพศ (Sildenafil/Viagra) ในช่วง 24 ชม. ที่ผ่านมา',
      'ต้องเฝ้าระวังภาวะความดันโลหิตต่ำรุนแรง (Severe hypotension)'
    ],
    group: 'Antihypertensives'
  },
  {
    id: 'nitroprusside',
    name: 'Sodium Nitroprusside',
    thaiName: 'โซเดียม ไนโตรปรัสไซด์',
    doseUnit: 'mcg/kg/min',
    isWeightBased: true,
    preparations: [
      { label: '50 mg in D5W 250 mL (200 mcg/mL)', concentration: 200 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.25, max: 10, step: 0.1, default: 0.25 },
    titrationGuide: 'เริ่มต้น 0.25 - 0.5 mcg/kg/min ปรับขึ้นทีละขั้นทุกๆ 3-5 นาที ตามเป้าหมายระดับความดันโลหิต',
    indications: [
      {
        name: 'Hypertensive Emergency (e.g. Aortic dissection, Hypertensive encephalopathy)',
        dose: 'เริ่มต้น 0.25-0.5 mcg/kg/min ปรับเพิ่มทุก 3-5 นาที เพื่อลด BP 10-20% ใน 1 ชม.แรก'
      },
      {
        name: 'Aortic Dissection',
        dose: 'ใช้ร่วมกับ Beta-blocker (เช่น Esmolol/Labetalol) เพื่อเป้าหมาย SBP 100-120 mmHg และ HR < 60 bpm'
      }
    ],
    safetyWarnings: [
      'ขวดยาและสายให้ยาต้องได้รับการหุ้มกระดาษฟอยล์เพื่อป้องกันแสง เนื่องจากยาสลายตัวได้เมื่อโดนแสง',
      'ระวังภาวะพิษจากสารไซยาไนด์ (Cyanide toxicity) หากหยดยาติดต่อกันเป็นเวลานานกว่า 48 ชม.'
    ],
    group: 'Antihypertensives'
  },
  {
    id: 'amiodarone',
    name: 'Amiodarone',
    thaiName: 'ยารักษาหัวใจเต้นผิดจังหวะ (Amiodarone)',
    isWeightBased: false,
    doseUnit: 'mg/min',
    doseRange: { min: 0.5, max: 1, step: 0.5, default: 1 },
    absoluteMaxPerHour: 60,
    defaultPreparationIndex: 0,
    preparations: [
      { label: '900 mg in D5W 500 mL', concentration: 1.8 },
      { label: '450 mg in D5W 250 mL', concentration: 1.8 }
    ],
    titrationGuide: 'ให้ 1 mg/min นาน 6 ชั่วโมง จากนั้นลดเหลือ 0.5 mg/min นาน 18 ชั่วโมง',
    indications: [
      {
        name: 'ACLS (VT/VF) Post-resuscitation',
        dose: '1 mg/min for 6 hours, then 0.5 mg/min for 18 hours'
      }
    ],
    safetyWarnings: [
      'ใช้เฉพาะ D5W เท่านั้น ห้ามผสมใน NSS',
      'ระวังภาวะ Hypotension และ Bradycardia (ติดตาม ECG เสมอ)'
    ],
    group: 'Antiarrhythmics'
  },
  {
    id: 'lidocaine',
    name: 'Lidocaine',
    thaiName: 'ยาชา/ยาหัวใจ (Lidocaine)',
    isWeightBased: false,
    doseUnit: 'mg/min',
    doseRange: { min: 1, max: 4, step: 0.5, default: 2 },
    absoluteMaxPerHour: 240,
    defaultPreparationIndex: 0,
    preparations: [ { label: '2 g in D5W/NSS 500 mL', concentration: 4 } ],
    titrationGuide: 'ปรับ 1-4 mg/min ประเมินระดับความรู้สึกตัวและระวัง toxicity',
    indications: [
      {
        name: 'ACLS (VT/VF) Refractory',
        dose: '1 - 4 mg/min หลังจากการให้ Bolus'
      }
    ],
    safetyWarnings: [
      'ระวัง Lidocaine toxicity: สับสน, ชัก, ชา, หัวใจเต้นผิดจังหวะ',
      'ลดขนาดยาลง 50% ในผู้ป่วยโรคตับ, หัวใจล้มเหลว หรืออายุ > 70 ปี'
    ],
    group: 'Antiarrhythmics'
  },
  {
    id: 'midazolam',
    name: 'Midazolam (Dormicum)',
    thaiName: 'ไมดาโซแลม (ดอร์มิคุม)',
    doseUnit: 'mg/kg/hr',
    isWeightBased: true,
    preparations: [
      { label: '100 mg in NSS 100 mL (1 mg/mL)', concentration: 1 },
      { label: '50 mg in NSS 100 mL (0.5 mg/mL)', concentration: 0.5 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.02, max: 0.2, step: 0.01, default: 0.05 },
    titrationGuide: 'ปรับตามระดับความลึกในการระงับความรู้สึก (RASS Sedation scale target: -2 to 0)',
    indications: [
      {
        name: 'Sedation in ICU/ER (Mechanically ventilated)',
        dose: 'เริ่มต้น 0.02-0.05 mg/kg/hr ปรับตามเป้าหมาย RASS (-2 ถึง 0)'
      },
      {
        name: 'Status Epilepticus (Refractory)',
        dose: '0.05-0.2 mg/kg/hr ปรับจนหยุดชักหรือปรับตามอาการ'
      }
    ],
    safetyWarnings: [
      'มีฤทธิ์กดการหายใจอย่างรุนแรง ต้องมีอุปกรณ์ช่วยหายใจพร้อมใช้งานข้างเตียงเสมอ',
      'ในหน้าจอ Sedation ของ รพ. จะบังคับเตรียมสูตรผสมเฉพาะ 1 mg/mL เท่านั้น'
    ],
    group: 'Sedation & Analgesia'
  },
  {
    id: 'fentanyl',
    name: 'Fentanyl',
    thaiName: 'เฟนทานิล',
    doseUnit: 'mcg/kg/hr',
    isWeightBased: true,
    preparations: [
      { label: '500 mcg in NSS 100 mL (5 mcg/mL)', concentration: 5 },
      { label: '100 mcg in NSS 50 mL (2 mcg/mL)', concentration: 2 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.5, max: 10, step: 0.1, default: 1 },
    absoluteMaxPerHour: 500,
    titrationGuide: 'ปรับขนาดตามระดับความปวดของผู้ป่วย จำกัดขนาดสูงสุดที่ 500 mcg/hr',
    indications: [
      {
        name: 'Analgesia (Continuous Infusion)',
        dose: 'เริ่มต้น 0.5-1 mcg/kg/hr ปรับตามระดับความปวด'
      },
      {
        name: 'Analgesia with Sedation (Mechanically ventilated)',
        dose: '1-10 mcg/kg/hr (Max 500 mcg/hr)'
      }
    ],
    safetyWarnings: [
      'จำกัดขนาดสูงสุดรวมของ maintenance drip ห้ามเกิน 500 mcg/hr เพื่อป้องกันการดื้อยาและผลข้างเคียง',
      'ระวังภาวะ Chest wall rigidity หากมีการฉีด Bolus เร็วเกินไป'
    ],
    group: 'Sedation & Analgesia'
  },
  {
    id: 'dexmedetomidine',
    name: 'Dexmedetomidine (Precedex)',
    thaiName: 'ยานอนหลับ (Dexmedetomidine)',
    isWeightBased: true,
    doseUnit: 'mcg/kg/hr',
    doseRange: { min: 0.2, max: 1.5, step: 0.1, default: 0.5 },
    absoluteMaxPerHour: 200,
    defaultPreparationIndex: 0,
    preparations: [ { label: '200 mcg in NSS 50 mL', concentration: 4 } ],
    titrationGuide: 'ปรับขนาดยาทุก 30 นาทีทีละ 0.1-0.2 mcg/kg/hr เพื่อให้ได้ RASS 0 ถึง -1',
    indications: [
      {
        name: 'Light Sedation / Delirium avoidance',
        dose: '0.2 - 1.5 mcg/kg/hr ไม่กดการหายใจ'
      }
    ],
    safetyWarnings: [
      'ระวัง Bradycardia และ Hypotension',
      'อาจพิจารณาข้าม Loading dose เพื่อลดโอกาสเกิดผลข้างเคียง'
    ],
    group: 'Sedation & Analgesia'
  },
  {
    id: 'heparin',
    name: 'Heparin (Unfractionated)',
    thaiName: 'เฮปาริน (ยาฉีดป้องกันลิ่มเลือด)',
    doseUnit: 'units/kg/hr',
    isWeightBased: true,
    preparations: [
      {
        label: '10,000 units in NSS 100 mL (100 units/mL)',
        concentration: 100
      },
      {
        label: '5,000 units in NSS 100 mL (50 units/mL)',
        concentration: 50
      }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 10, max: 25, step: 1, default: 12 },
    titrationGuide: 'ปรับอัตราหยดตามผลตรวจ aPTT Ratio ตามแนวทางมาตรฐาน',
    indications: [
      {
        name: 'Acute Coronary Syndrome (ACS) / NSTEMI',
        dose: 'Bolus 60 units/kg (Max 4,000 units) ตามด้วย Drip 12 units/kg/hr (Max 1,000 units/hr) ปรับตาม aPTT'
      },
      {
        name: 'Pulmonary Embolism (PE) / DVT',
        dose: 'Bolus 80 units/kg (Max 10,000 units) ตามด้วย Drip 18 units/kg/hr ปรับตาม aPTT'
      }
    ],
    safetyWarnings: [
      'ห้ามใช้ในผู้ที่มีภาวะเกล็ดเลือดต่ำรุนแรง (Severe thrombocytopenia) หรือมีภาวะเลือดออกแอคทีฟ',
      'ติดตามระดับเกล็ดเลือด (Platelet count) ทุก 2 วันเพื่อเฝ้าระวังภาวะ HIT (Heparin Induced Thrombocytopenia)'
    ],
    group: 'Anticoagulants'
  }
];

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EMERGENCY_DRUG_DATA
    };
}
