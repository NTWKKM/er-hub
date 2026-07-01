/**
 * lib/drug-data.ts
 * Structured catalog of concentrations, dose limits, safety ceilings,
 * and titration instructions for all 12 critical emergency IV drugs.
 * TypeScript port of shared/drug-data.js
 */

export interface DrugPreparation {
  label: string
  concentration: number
}

export interface DoseRange {
  min: number
  max: number
  step: number
  default: number
}

export interface EmergencyDrug {
  id: string
  name: string
  thaiName: string
  doseUnit: string
  isWeightBased: boolean
  preparations: DrugPreparation[]
  defaultPreparationIndex: number
  doseRange: DoseRange
  titrationGuide: string
  safetyWarnings: string[]
  showDualUnits?: boolean
  hasBolus?: boolean
}

export const EMERGENCY_DRUG_DATA: EmergencyDrug[] = [
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
    doseRange: { min: 0.05, max: 3.0, step: 0.01, default: 0.1 },
    titrationGuide: 'ปรับเพิ่มครั้งละ 0.01 mcg/kg/min ทุก 15 นาที เพื่อเป้าหมาย MAP ≥ 65 mmHg',
    safetyWarnings: [
      'เป็นยา HAD (High Alert Drug) ต้องจ่ายผ่าน Infusion pump เท่านั้น',
      'สังเกตภาวะ extravasation, ตรวจบริเวณตำแหน่งแทงเข็มเขียวช้ำทุก 4 ชม.',
      'เกณฑ์รายงานแพทย์: BP > 160/110 mmHg หรือ HR > 155 bpm หรือปลายมือปลายเท้าเขียว'
    ]
  },
  {
    id: 'norepinephrine',
    name: 'Norepinephrine (Levophed)',
    thaiName: 'นอร์เอพิเนฟริน (เลโวเฟด)',
    doseUnit: 'mcg/kg/min',
    isWeightBased: true,
    preparations: [
      { label: '4 mg in D5W 100 mL (40 mcg/mL)', concentration: 40 },
      { label: '8 mg in D5W 100 mL (80 mcg/mL)', concentration: 80 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.02, max: 3.0, step: 0.01, default: 0.1 },
    titrationGuide: 'ปรับเพิ่มครั้งละ 0.05 mcg/kg/min ทุก 3 นาที เพื่อเป้าหมาย MAP ≥ 65 mmHg',
    safetyWarnings: [
      'ต้องผสมเจือจางใน D5W เท่านั้น ห้ามผสมใน NSS เปล่าๆ เพื่อเสถียรภาพของยา',
      'ต้องให้ทางหลอดเลือดดำใหญ่ (Central line หรือ Large vein) เพื่อเลี่ยง Extravasation necrosis'
    ]
  },
  {
    id: 'dopamine',
    name: 'Dopamine',
    thaiName: 'โดปามีน',
    doseUnit: 'mcg/kg/min',
    isWeightBased: true,
    preparations: [
      { label: '250 mg in NSS 250 mL (1,000 mcg/mL)', concentration: 1000 },
      { label: '250 mg in NSS 125 mL (2,000 mcg/mL)', concentration: 2000 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 2.0, max: 20.0, step: 0.5, default: 5.0 },
    titrationGuide: 'ปรับขนาดยาตามข้อบ่งใช้ (Inotropic: 2-5 mcg/kg/min, Vasopressor: 10-20 mcg/kg/min)',
    safetyWarnings: [
      'ระวังสับสนชื่อยากับ Heparin หรือ Dobutamine',
      'ติดตาม HR และ EKG สม่ำเสมอ ระวังภาวะ Tachyarrhythmias ในขนาดสูง'
    ]
  },
  {
    id: 'dobutamine',
    name: 'Dobutamine',
    thaiName: 'โดบูตามีน',
    doseUnit: 'mcg/kg/min',
    isWeightBased: true,
    preparations: [
      { label: '250 mg in NSS 250 mL (1,000 mcg/mL)', concentration: 1000 },
      { label: '250 mg in NSS 125 mL (2,000 mcg/mL)', concentration: 2000 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 2.5, max: 20.0, step: 0.5, default: 5.0 },
    titrationGuide: 'ปรับขนาดยาเพิ่มทีละขั้นตามอาการทางคลินิก (Max 20 mcg/kg/min)',
    safetyWarnings: [
      'ใช้สำหรับรักษาภาวะหัวใจล้มเหลว (Heart failure/Cardiogenic shock) ที่มีน้ำเกิน',
      'ติดตาม Vital Signs และ EKG ระวังหัวใจเต้นผิดจังหวะ และภาวะความดันโลหิตต่ำจาก Vasodilation'
    ]
  },
  {
    id: 'midazolam',
    name: 'Midazolam (Dormicum)',
    thaiName: 'ไมดาโซแลม (ดอร์มิคุม)',
    doseUnit: 'mg/kg/hr',
    isWeightBased: true,
    preparations: [
      { label: '100 mg in NSS 100 mL (1 mg/mL)', concentration: 1.0 },
      { label: '50 mg in NSS 100 mL (0.5 mg/mL)', concentration: 0.5 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.02, max: 0.2, step: 0.01, default: 0.05 },
    titrationGuide: 'ปรับตามระดับความลึกในการระงับความรู้สึก (RASS Sedation scale target: -2 to 0)',
    safetyWarnings: [
      'มีฤทธิ์กดการหายใจอย่างรุนแรง ต้องมีอุปกรณ์ช่วยหายใจพร้อมใช้งานข้างเตียงเสมอ',
      'ในหน้าจอ Sedation ของ รพ. จะบังคับเตรียมสูตรผสมเฉพาะ 1 mg/mL เท่านั้น'
    ]
  },
  {
    id: 'esmolol',
    name: 'Esmolol (Brevibloc)',
    thaiName: 'เอสโมลอล (เบรวิบล็อค)',
    doseUnit: 'mg/kg/min',
    isWeightBased: true,
    preparations: [
      { label: '100 mg in 10 mL ampule (10 mg/mL)', concentration: 10.0 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.05, max: 0.3, step: 0.01, default: 0.05 },
    titrationGuide: 'ปรับเพิ่มครั้งละ 0.05 mg/kg/min ทุก 4 นาที, ค่อยๆ ลดขนาดช้าๆ (Tapering) เมื่อต้องการหยุดยา',
    safetyWarnings: [
      'หมายเหตุความปลอดภัย: อัตราการให้ยา 0.05 - 0.3 mg/kg/min เทียบเท่ากับ 50 - 300 mcg/kg/min ในมาตรฐานสากล',
      'ติดตาม BP และ HR ถี่ๆ ทุก 2-5 นาที ระวังภาวะความดันโลหิตต่ำและชีพจรช้าผิดปกติ'
    ],
    showDualUnits: true
  },
  {
    id: 'fentanyl',
    name: 'Fentanyl',
    thaiName: 'เฟนทานิล',
    doseUnit: 'mcg/kg/hr',
    isWeightBased: true,
    preparations: [
      { label: '500 mcg in NSS 100 mL (5 mcg/mL)', concentration: 5.0 },
      { label: '100 mcg in NSS 50 mL (2 mcg/mL)', concentration: 2.0 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.5, max: 10.0, step: 0.1, default: 1.0 },
    titrationGuide: 'ปรับขนาดตามระดับความปวดของผู้ป่วย จำกัดขนาดสูงสุดที่ 500 mcg/hr',
    safetyWarnings: [
      'จำกัดขนาดสูงสุดรวมของ maintenance drip ห้ามเกิน 500 mcg/hr เพื่อป้องกันการดื้อยาและผลข้างเคียง',
      'ระวังภาวะ Chest wall rigidity หากมีการฉีก Bolus เร็วเกินไป'
    ]
  },
  {
    id: 'heparin',
    name: 'Heparin (Unfractionated)',
    thaiName: 'เฮปาริน (ยาฉีดป้องกันลิ่มเลือด)',
    doseUnit: 'units/kg/hr',
    isWeightBased: true,
    preparations: [
      { label: '10,000 units in NSS 100 mL (100 units/mL)', concentration: 100 },
      { label: '5,000 units in NSS 100 mL (50 units/mL)', concentration: 50 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 10, max: 25, step: 1, default: 12 },
    titrationGuide: 'ปรับอัตราหยดตามผลตรวจ aPTT Ratio ตามแนวทางมาตรฐาน',
    safetyWarnings: [
      'ห้ามใช้ในผู้ที่มีภาวะเกล็ดเลือดต่ำรุนแรง (Severe thrombocytopenia) หรือมีภาวะเลือดออกแอคทีฟ',
      'ติดตามระดับเกล็ดเลือด (Platelet count) ทุก 2 วันเพื่อเฝ้าระวังภาวะ HIT (Heparin Induced Thrombocytopenia)'
    ]
  },
  {
    id: 'labetalol',
    name: 'Labetalol',
    thaiName: 'ลาเบทาลอล',
    doseUnit: 'mg/min',
    isWeightBased: false,
    preparations: [
      { label: '100 mg in NSS 50 mL (2 mg/mL)', concentration: 2.0 },
      { label: '200 mg in NSS 200 mL (1 mg/mL)', concentration: 1.0 }
    ],
    defaultPreparationIndex: 0,
    doseRange: { min: 0.5, max: 3.0, step: 0.1, default: 1.0 },
    titrationGuide: 'เริ่มให้ยาในอัตราคงที่ 0.5 - 2 mg/min ปรับเปลี่ยนขนาดยาตามเป้าหมายของความดันโลหิต',
    safetyWarnings: [
      'ขนาดสูงสุดห้ามเกิน 300 mg/วัน (mg/day)',
      'ห้ามใช้ในผู้ป่วยโรคหอบหืดรุนแรง (COPD/Asthma) หรือหัวใจเต้นช้าขั้นรุนแรง (Heart block)'
    ]
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
    doseRange: { min: 5.0, max: 15.0, step: 0.5, default: 5.0 },
    titrationGuide: 'เริ่มต้น 5 mg/hr ปรับเพิ่มขึ้นครั้งละ 2.5 mg/hr ทุก 15 นาที เมื่อคุมความดันโลหิตได้ตามเป้าหมายแล้ว ลดระดับลงเหลือ 3-5 mg/hr',
    safetyWarnings: [
      'เฝ้าระวังภาวะ Phlebitis (หลอดเลือดอักเสบ) แนะนำให้เปลี่ยนตำแหน่งหลอดเลือดดำทุก 12 ชม. หากให้ผ่านทางหลอดเลือดดำส่วนปลาย'
    ]
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
    doseRange: { min: 5.0, max: 400.0, step: 5.0, default: 5.0 },
    titrationGuide: 'เริ่มต้น 5 mcg/min ปรับขึ้นทุกๆ 5 นาที ตามระดับความดันโลหิตและระดับความปวดเจ็บเค้นหน้าอก',
    safetyWarnings: [
      'ห้ามใช้เด็ดขาดในผู้ป่วยที่ได้รับยากลุ่มรักษาภาวะหย่อนสมรรถภาพทางเพศ (Sildenafil/Viagra) ในช่วง 24 ชม. ที่ผ่านมา',
      'ต้องเฝ้าระวังภาวะความดันโลหิตต่ำรุนแรง (Severe hypotension)'
    ]
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
    doseRange: { min: 0.5, max: 10.0, step: 0.1, default: 0.5 },
    titrationGuide: 'เริ่มต้น 0.25 - 0.5 mcg/kg/min ปรับขึ้นทีละขั้นทุกๆ 3-5 นาที ตามเป้าหมายระดับความดันโลหิต',
    safetyWarnings: [
      'ขวดยาและสายให้ยาต้องได้รับการหุ้มกระดาษฟอยล์เพื่อป้องกันแสง เนื่องจากยาสลายตัวได้เมื่อโดนแสง',
      'ระวังภาวะพิษจากสารไซยาไนด์ (Cyanide toxicity) หากหยดยาติดต่อกันเป็นเวลานานกว่า 48 ชม.'
    ]
  }
]
