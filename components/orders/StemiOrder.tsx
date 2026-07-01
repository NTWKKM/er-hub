'use client';

import { useState, useCallback } from 'react';
import PatientInfoForm from '../PatientInfoForm';
import DoseResultCard from '../DoseResultCard';
import { useFormValidation } from '../../lib/form-validate';

type FibrinolyticType = 'tnk' | 'sk';

// TNK dose table: <60kg name="30mg, 60-69=35mg, 70-79=40mg, 80-89=45mg, ">=90=50mg
const TNK_TABLE = [
  { label: '<60', min: -Infinity, max: 60, mg: 30 },
  { label: '60-69', min: 60, max: 70, mg: 35 },
  { label: '70-79', min: 70, max: 80, mg: 40 },
  { label: '80-89', min: 80, max: 90, mg: 45 },
  { label: '≥90', min: 90, max: Infinity, mg: 50 },
];

function calcTNK(weight: number, age: number) {
  const idx = TNK_TABLE.findIndex(b => weight >= b.min && weight < b.max);
  const bracket = TNK_TABLE[idx];
  const elderly = age >= 75; // rule: age >= 75 -> halve dose
  const mg = elderly ? bracket.mg / 2 : bracket.mg;
  return { mg, ml: mg / 5, bracketIdx: idx, elderly };
}

export default function StemiOrder() {
  const [hn, setHn] = useState('');
  const [weight, setWeight] = useState(70);
  const [age, setAge] = useState(60);
  const [asaAllergy, setAsaAllergy] = useState<'yes' | 'no'>('no');
  const [fibrinolytic, setFibrinolytic] = useState<FibrinolyticType>('tnk');
  const [priorSK, setPriorSK] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const validation = useFormValidation();

  const handleCalculate = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Clear any prior warning before re-validation
    validation.clearWarn();

    // Validate weight (30-200 kg)
    if (!validation.range('weight', weight, 30, 200, 'กรุณากรอกน้ำหนัก (30–200 kg)')) return;
    // Validate age (>= 18)
    if (!validation.min('age', age, 18, 'กรุณากรอกอายุ (≥ 18 ปี)')) return;

    // HARD STOP: SK repeat within 6 months (absolute contraindication)
    if (fibrinolytic === 'sk' && priorSK) {
      validation.warn('⚠️ ห้ามให้ Streptokinase ซ้ำภายในเวลา 6 เดือน — ผู้ป่วยรายนี้เคยได้รับ SK มาก่อน กรุณาเปลี่ยนไปเลือก Tenecteplase (TNK) แทน');
      return;
    }

    const tnk = calcTNK(weight, age);
    const clopiTabs = age <= 75 ? 4 : 1; // rule: age <=75 -> 4 tabs, >75 -> 1 tab

    // Store calculated values for display (including bracketIdx for TNK table highlighting)
    setCalculatedDose({
      fibrinolytic,
      tnkMg: tnk.mg,
      tnkMl: tnk.ml,
      clopiTabs,
      elderly: tnk.elderly,
      bracketIdx: tnk.bracketIdx,
    });

    setShowResults(true);
  }, [weight, age, asaAllergy, fibrinolytic, priorSK, validation]);

  const [calculatedDose, setCalculatedDose] = useState<{
    fibrinolytic: FibrinolyticType;
    tnkMg: number;
    tnkMl: number;
    clopiTabs: number;
    elderly: boolean;
    bracketIdx: number;
  } | null>(null);

  const handleClear = useCallback(() => {
    validation.clearAll();
    setHn('');
    setWeight(70);
    setAge(60);
    setAsaAllergy('no');
    setFibrinolytic('tnk');
    setPriorSK(false);
    setShowResults(false);
    setCalculatedDose(null);
  }, [validation]);

  const handlePrintPDF = useCallback(() => {
    window.open('/er-hub/docs/STEMI-PE/STEMI new 26-4doc.pdf', '_blank');
  }, []);

  return (
    <div className="form-container">
      <div className="header">
        <h1>🫀 STEMI Standing Order Generator</h1>
        <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>
          Maharat Nakhon Ratchasima Hospital — Emergency Department
        </p>
        <small style={{ color: '#aaa' }}>
          Guideline: Thai Acute Coronary Syndromes Guidelines 2020 (ปรับปรุง ธ.ค. 2565) | บัญชียาหลักแห่งชาติ 2565
        </small>
      </div>

      <form id="stemi-form" onSubmit={handleCalculate}>
        <div className="input-layout">
          {/* COLUMN 1: Patient & Order Info */}
          <div className="input-column">
            <h3>1. ข้อมูลผู้ป่วย</h3>

            <PatientInfoForm
              weight={weight}
              age={age}
              hn={hn}
              egfr=""
              onWeightChange={setWeight}
              onAgeChange={setAge}
              onHnChange={setHn}
              onEgfrChange={() => {}}
              showEgfr={false}
            />

            <div style={{ marginTop: '14px' }}>
              <strong style={{ fontSize: '14px' }}>ASA Allergy:</strong>
              <label style={{ marginLeft: '10px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="asa-allergy"
                  value="no"
                  checked={asaAllergy === 'no'}
                  onChange={() => setAsaAllergy('no')}
                />{' '}
                ไม่มี
              </label>
              <label style={{ marginLeft: '10px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="asa-allergy"
                  value="yes"
                  checked={asaAllergy === 'yes'}
                  onChange={() => setAsaAllergy('yes')}
                />{' '}
                มี ⚠️
              </label>
            </div>
          </div>

          {/* COLUMN 2: Fibrinolytic Choice */}
          <div className="input-column">
            <h3>2. เลือกยาละลายลิ่มเลือด</h3>

            <div className="fib-choice-group">
              <label className={`fib-card ${fibrinolytic === 'tnk' ? 'selected' : ''}`} id="card-tnk">
                <input
                  type="radio"
                  name="fibrinolytic"
                  value="tnk"
                  checked={fibrinolytic === 'tnk'}
                  onChange={() => setFibrinolytic('tnk')}
                />
                <strong>Tenecteplase (TNK)</strong>
                <small>IV bolus 10 วินาที — คำนวณตามน้ำหนัก+อายุ</small>
              </label>
              <label className={`fib-card ${fibrinolytic === 'sk' ? 'selected' : ''}`} id="card-sk">
                <input
                  type="radio"
                  name="fibrinolytic"
                  value="sk"
                  checked={fibrinolytic === 'sk'}
                  onChange={() => setFibrinolytic('sk')}
                />
                <strong>Streptokinase (SK)</strong>
                <small>1.5 MU IV drip 60 นาที — ห้ามให้ซ้ำใน 6 เดือน</small>
              </label>
            </div>

            {fibrinolytic === 'sk' && (
              <div style={{ marginTop: '12px' }}>
                <label className="flag-label" style={{ fontWeight: 'bold' }}>
                  <input
                    type="checkbox"
                    id="prior-sk"
                    checked={priorSK}
                    onChange={(e) => setPriorSK(e.target.checked)}
                  />
                  ⚠️ ผู้ป่วยเคยได้รับ Streptokinase มาก่อน ภายใน 6 เดือนที่ผ่านมา?
                </label>
                <small style={{ color: '#856404' }}>
                  ถ้าใช่ → ห้ามให้ SK ซ้ำ ระบบจะบล็อกการสร้างคำสั่ง กรุณาเลือก TNK แทน
                </small>
              </div>
            )}

            <div style={{ marginTop: '16px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', fontSize: '12.5px', color: '#555' }}>
              <strong>ตาราง TNK (อ้างอิง):</strong>
              <table className="tnk-table" id="form-tnk-preview">
                <tbody>
                  <tr><th>น้ำหนัก (kg)</th><th>TNK (mg)</th><th>TNK (ml)</th></tr>
                  <tr><td>&lt;60</td><td>30</td><td>6</td></tr>
                  <tr><td>60–69</td><td>35</td><td>7</td></tr>
                  <tr><td>70–79</td><td>40</td><td>8</td></tr>
                  <tr><td>80–89</td><td>45</td><td>9</td></tr>
                  <tr><td>≥90</td><td>50</td><td>10</td></tr>
                </tbody>
              </table>
              <small style={{ color: '#999' }}>* อายุ ≥75 ปี ลดขนาดยา 50% จากตารางนี้</small>
            </div>
          </div>
        </div>

        {validation.warning && (
          <div className="warning-banner" style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', color: '#856404' }}>
            {validation.warning}
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-calculate">
            🧮 คำนวณขนาดยาและสร้างใบสั่งยา
          </button>
          <button type="button" onClick={handlePrintPDF} className="btn btn-print">
            🖨️ พิมพ์ Order (PDF)
          </button>
          <button type="button" onClick={handleClear} className="btn btn-clear">
            🗑️ ล้างข้อมูล
          </button>
        </div>
      </form>

      {/* Results Section */}
      {showResults && calculatedDose && (
        <div id="results-container" className="results-container">
          <div className="summary-banner" aria-live="polite">
            <div className="dose-badge">
              <div>
                <div className="dose-label">ยาที่เลือก / ขนาดยา</div>
                <div className="dose-num">
                  {calculatedDose.fibrinolytic === 'tnk'
                    ? `TNK ${calculatedDose.tnkMg} mg (${calculatedDose.tnkMl} ml)`
                    : `SK 1.5 MU (60 min drip)`}
                </div>
              </div>
            </div>
            <div className="note-pill">Clopidogrel: {calculatedDose.clopiTabs} เม็ด stat</div>
            {calculatedDose.elderly && (
              <div className="note-pill" style={{ display: 'inline-block' }}>อายุ ≥75 ปี — ลดขนาด TNK 50%</div>
            )}
          </div>

          <h3>3. ตรวจสอบและพิมพ์ใบสั่งยา</h3>

          <div id="print-area">
            <div className="order-grid-5col">
              <div className="grid-header">Progress note สหสาขาวิชาชีพ</div>
              <div className="grid-header">Date/<br />Time</div>
              <div className="grid-header">Orders for one day</div>
              <div className="grid-header">Date/<br />Time</div>
              <div className="grid-header">Order for Continuation</div>

              {/* Col 1: Progress Note */}
              <div className="grid-cell">
                <strong>Acute STEMI</strong><br />
                HN: <span className="highlight">{hn || '--'}</span><br />
                BW: <strong className="highlight">{weight.toFixed(1)}</strong> kg
                &nbsp;|&nbsp; Age: <strong>{age}</strong> ปี<br />
                ASA Allergy: <span style={{ color: asaAllergy === 'yes' ? 'red' : 'inherit' }}>
                  {asaAllergy === 'yes' ? 'YES ⚠️' : 'No'}
                </span>

                <div className="divider"></div>
                <strong>ขนาดยา Tenecteplase (อ้างอิง):</strong>
                <table className="tnk-table">
                  <tbody>
                    <tr><th>น้ำหนัก (kg)</th><th>TNK (mg)</th><th>TNK (ml)</th></tr>
                    {TNK_TABLE.map((b, i) => (
                      <tr key={i} className={calculatedDose.fibrinolytic === 'tnk' && i === calculatedDose.bracketIdx ? 'active-row' : ''}>
                        <td>{b.label}</td><td>{b.mg}</td><td>{b.mg / 5}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <small style={{ color: '#888' }}>* ปรับช่วงน้ำหนักจาก &lt;60/61-69 (เอกสารต้นฉบับ) เป็น &lt;60/60-69 ตาม TNK nomogram มาตรฐาน เพื่อปิดช่องว่างที่ 60kg</small>

                <div className="divider"></div>
                ลงชื่อแพทย์ผู้สั่งใช้ยา: <span className="dotted-line"></span><br />
                เลขว.: <span className="dotted-line" style={{ minWidth: '45px' }}></span>
              </div>

              {/* Col 2: Date/Time */}
              <div className="grid-cell">--</div>

              {/* Col 3: Orders for one day */}
              <div className="grid-cell">
                <strong>Antiplatelet:</strong>
                <ul className="order-list">
                  <li>
                    {asaAllergy === 'yes'
                      ? <strong style={{ color: 'red' }}>⚠️ ASA ALLERGY — ห้ามให้ ASA</strong>
                      : '☑ ASA 300 mg 1 เม็ด เคี้ยวและกลืน stat'}
                  </li>
                  <li>
                    ☑ Clopidogrel (75mg) <strong>{calculatedDose.clopiTabs} เม็ด</strong> stat
                    <small style={{ color: '#888' }}> ({age <= 75 ? 'อายุ ≤75 ปี' : 'อายุ >75 ปี — ลด loading dose'})</small>
                  </li>
                </ul>

                <div className="divider"></div>
                <strong>Fibrinolytic:</strong>
                {calculatedDose.fibrinolytic === 'tnk' ? (
                  <div className="fib-order-box chosen">
                    ☑ <strong>Tenecteplase (TNK) {calculatedDose.tnkMg} mg ({calculatedDose.tnkMl} ml)</strong> IV bolus in 10 second
                    {calculatedDose.elderly && (
                      <><br /><small style={{ color: '#c0392b' }}>⚠️ อายุ ≥75 ปี — ลดขนาดยา 50% แล้ว</small></>
                    )}
                  </div>
                ) : (
                  <div className="fib-order-box">☐ Tenecteplase (TNK) — <small style={{ color: '#999' }}>ไม่ได้เลือก</small></div>
                )}
                {calculatedDose.fibrinolytic === 'sk' ? (
                  <div className="fib-order-box chosen">
                    ☑ <strong>Streptokinase 1.5 MU (1 ขวด) dilute in NSS 100 ml IV drip in 60 min</strong><br />
                    ☑ 0.9% NSS 20 cc IV flush หลัง Streptokinase หมด<br />
                    <small style={{ color: '#c0392b' }}>⚠️ ห้ามบริหารยาซ้ำภายในเวลา 6 เดือน</small>
                  </div>
                ) : (
                  <div className="fib-order-box">☐ Streptokinase (SK) — <small style={{ color: '#999' }}>ไม่ได้เลือก</small></div>
                )}

                <div className="divider"></div>
                <strong>Monitoring:</strong>
                <ul className="order-list">
                  <li>☑ Repeat ECG หลังให้ยา 60 นาที</li>
                  <li>☑ Record vital sign q 15 min</li>
                  <li>☑ Observe ภาวะเลือดออกผิดปกติ, อาการซึม, หายใจลำบาก, ผื่น, คัน</li>
                </ul>
                <div className="monitor-alert">
                  ⚠️ If SBP &gt; 180 mmHg, DBP &gt; 105 mmHg, SBP &lt; 90 mmHg, or HR &lt; 50 → <strong>please notify แพทย์ทันที</strong>
                </div>
              </div>

              {/* Col 4: Date/Time */}
              <div className="grid-cell">--</div>

              {/* Col 5: Continuation */}
              <div className="grid-cell">
                <small style={{ color: '#888' }}>
                  แบบฟอร์มต้นฉบับไม่ได้ระบุ continuation order สำหรับ STEMI โดยตรง
                  (ผู้ป่วยมักย้ายไปดูแลต่อที่ CCU/cath lab) — เว้นไว้ให้แพทย์เจ้าของไข้สั่งเพิ่มเติม
                </small>
                <div className="divider"></div>
                <div style={{ height: '90px' }}></div>
                ลงชื่อแพทย์ (ward): <span className="dotted-line"></span><br />
                เลขว.: <span className="dotted-line" style={{ minWidth: '45px' }}></span>
                <br /><br />
                <small style={{ color: '#777', fontSize: '9px' }}>
                  Guideline: Thai ACS 2020 (rev. ธ.ค. 2565) | บัญชียาหลักแห่งชาติ 2565
                </small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
