'use client';

import { useState } from 'react';
import SliderInput from '@/components/SliderInput';
import DoseResultCard from '@/components/DoseResultCard';
import StickerBox from '@/components/StickerBox';
import { useFormValidation } from '@/lib/form-validate';

export default function RtpaOrder() {
  const [hn, setHn] = useState('');
  const [weight, setWeight] = useState(70);
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [doseRegimen, setDoseRegimen] = useState<'0.9' | '0.6'>('0.9');
  const [showResults, setShowResults] = useState(false);

  // Submitted snapshot — printable order frozen at validation time
  interface SubmittedRtpaOrder {
    hn: string;
    weight: number;
    doseRegimen: '0.9' | '0.6';
    totalDose: number;
    bolus: number;
    infusion: number;
    dateStr: string;
    timeStr: string;
  }
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedRtpaOrder | null>(null);

  const validation = useFormValidation();

  // Clinical logic: rt-PA dose calculation
  // Reference: AHA/ASA 2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke
  // 0.9 mg/kg regimen: max 90mg total, 10% bolus IV push over 1 min + 90% infusion over 60 min
  // 0.6 mg/kg regimen: max 50mg total, 10% bolus IV push over 1 min + 90% infusion over 60 min
  // Rounding: total dose at 2 decimal places, bolus truncated to 1 decimal (floor, not round), remainder goes to infusion
  const dosePerKg = doseRegimen === '0.9' ? 0.9 : 0.6;
  const maxDose = doseRegimen === '0.9' ? 90 : 50;

  const calculatedTotalDose = Math.min(weight * dosePerKg, maxDose);
  const bolus = Math.floor(calculatedTotalDose * 0.10 * 10) / 10;
  const infusion = parseFloat((calculatedTotalDose - bolus).toFixed(2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(false);
    setSubmittedOrder(null);

    if (!hn.trim()) {
      validation.fail('hn', 'กรุณากรอก HN');
      return;
    }
    validation.clear('hn');

    if (isNaN(weight) || weight < 30 || weight > 150) {
      validation.fail('weight', 'น้ำหนักต้องอยู่ระหว่าง 30-150 kg');
      return;
    }
    validation.clear('weight');

    // Snapshot the validated order
    const now = new Date();
    const dateStr = useCurrentTime ? now.toLocaleDateString('th-TH') : '...';
    const timeStr = useCurrentTime ? now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '...';
    setSubmittedOrder({
      hn: hn.trim(),
      weight,
      doseRegimen,
      totalDose: calculatedTotalDose,
      bolus,
      infusion,
      dateStr,
      timeStr,
    });
    setShowResults(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintBlank = () => {
    window.print();
  };

  const handleReset = () => {
    setHn('');
    setWeight(70);
    setUseCurrentTime(true);
    setDoseRegimen('0.9');
    setShowResults(false);
    setSubmittedOrder(null);
    validation.clearAll();
  };

  return (
    <div className="order-page">
      <div className="form-container">
        <div className="header">
          <h1>🧠 rt-PA Stroke FAST TRACK (Standing Order)</h1>
          <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>
            Maharat Nakhon Ratchasima Hospital — Emergency Department
          </p>
        </div>

        <form id="rtpa-form" onSubmit={handleSubmit}>
          <div className="input-layout">
            {/* Left Column */}
            <div className="input-column">
              <h3>1. ข้อมูลผู้ป่วย</h3>

              <div className="inline-input-group">
                <label htmlFor="hn">HN:</label>
                <input
                  type="text"
                  id="hn"
                  value={hn}
                  onChange={(e) => setHn(e.target.value)}
                  required
                  placeholder="กรอก HN"
                  ref={(el) => validation.registerRef('hn', el)}
                />
              </div>

              <SliderInput
                label="น้ำหนัก (kg)"
                min={30}
                max={150}
                step={0.1}
                value={weight}
                onChange={setWeight}
                unit="kg"
                registerRef={validation.registerRef}
                fieldId="weight"
              />

              <div className="checkbox-time-group">
                <label htmlFor="use-current-time" className="flag-label" style={{ fontWeight: 'normal' }}>
                  <input
                    id="use-current-time"
                    type="checkbox"
                    checked={useCurrentTime}
                    onChange={(e) => setUseCurrentTime(e.target.checked)}
                  />
                  บันทึกเวลาปัจจุบัน (Use Current Time)
                </label>
              </div>
            </div>

            {/* Right Column */}
            <div className="input-column">
              <h3>2. เลือกขนาดยา (Dosage Regimen)</h3>
              <fieldset className="button-dose-group" style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend className="sr-only">Dose Regimen</legend>
                <label className={`dose-button ${doseRegimen === '0.9' ? 'active' : ''}`}>
                  <input
                    id="dose-regimen-09"
                    type="radio"
                    name="doseRegimen"
                    value="0.9"
                    checked={doseRegimen === '0.9'}
                    onChange={() => setDoseRegimen('0.9')}
                    style={{ marginRight: '8px' }}
                  />
                  Standard Dose: 0.9 mg/kg (Max 90 mg)
                </label>
                <label className={`dose-button ${doseRegimen === '0.6' ? 'active' : ''}`}>
                  <input
                    id="dose-regimen-06"
                    type="radio"
                    name="doseRegimen"
                    value="0.6"
                    checked={doseRegimen === '0.6'}
                    onChange={() => setDoseRegimen('0.6')}
                    style={{ marginRight: '8px' }}
                  />
                  Alternative Dose: 0.6 mg/kg (Max 50 mg)
                </label>
              </fieldset>
            </div>
          </div>

          <button type="submit" className="btn btn-calculate">
            คำนวณและสร้างใบสั่งยา
          </button>
          <button
            type="button"
            id="print-blank-btn"
            className="btn btn-print"
            onClick={handlePrintBlank}
          >
            ใบสั่งยาเปล่า (Blank Order)
          </button>
          <button
            type="button"
            id="clear-btn"
            className="btn btn-clear"
            onClick={handleReset}
          >
            ล้างข้อมูล (Clear)
          </button>
        </form>
      </div>

      {/* Results Section — renders from submitted snapshot, not live form state */}
      {showResults && submittedOrder && (
        <div id="results-container" className="results-container" aria-live="polite">
          <h3>3. ตรวจสอบและพิมพ์ใบสั่งยา</h3>

          <div id="print-area">
            <div id="print-header-container">
              <div className="print-header">
                <strong>Maharat Nakhon Ratchasima Hospital</strong>
                <br />
                Emergency Department
              </div>
            </div>

            <StickerBox hn={submittedOrder.hn || '....................'} />

            <div className="order-grid-5col">
              <div className="grid-header">
                Progress note สหสาขาวิชาชีพ
                <br />
                <small>(ต้องบันทึก 3 วันหลัง admit และทุกครั้งที่มีการเปลี่ยนแปลง)</small>
              </div>
              <div className="grid-header">Date/Time</div>
              <div className="grid-header">Orders for one day</div>
              <div className="grid-header">Date/Time</div>
              <div className="grid-header">Order for Continuation</div>

              <div className="grid-cell">
                <strong>HN: <span id="result-hn" className="highlight">{submittedOrder.hn || '...'}</span></strong>
                <br />
                น้ำหนัก <strong id="result-weight" className="highlight">{submittedOrder.weight.toFixed(2)}</strong> Kg
                <br />
                <br />
                ลงชื่อเภสัช: <span className="dotted-line"></span>
              </div>
              <div className="grid-cell" id="order-date">
                {submittedOrder.dateStr}
                <br />
                {submittedOrder.timeStr}
              </div>
              <div className="grid-cell">
                <ul className="order-list">
                  <li>ก่อนให้ rt-PA if SBP ≥ 185 or DBP ≥ 110 mmHg notify แพทย์ทันที</li>
                  <li>
                    <strong>Alteplase (dose <span id="result-regimen" className="highlight">{submittedOrder.doseRegimen}</span> mg/kg, Max {submittedOrder.doseRegimen === '0.9' ? 90 : 50} mg)</strong>
                    <ul style={{ paddingLeft: '15px' }}>
                      <li>Total dose = <span id="total-dose" className="highlight">{submittedOrder.totalDose.toFixed(2)}</span> mg (Max {submittedOrder.doseRegimen === '0.9' ? 90 : 50} mg)</li>
                      <li>- <span id="push-percent" className="highlight">10</span>% of total dose = <span id="push-dose" className="highlight">{submittedOrder.bolus.toFixed(1)}</span> mg IV push in 1 min (Max {submittedOrder.doseRegimen === '0.9' ? 9.0 : 5.0} mg)</li>
                      <li>- Remaining <span id="drip-percent" className="highlight">90</span>% of total dose = <span id="drip-dose" className="highlight">{submittedOrder.infusion.toFixed(2)}</span> mg IV drip in 60 min (Max {submittedOrder.doseRegimen === '0.9' ? 81.0 : 45.0} mg)</li>
                    </ul>
                  </li>
                  <li>หลังให้ rt-PA if SBP &gt; 180 or DBP &gt; 105 mmHg notify แพทย์ทันที</li>
                  <li>ห้ามใส่ NG ภายใน 24 hr แรก ถ้าไม่มีเหตุจำเป็นฉุกเฉิน</li>
                  <li>ห้ามใส่ Foley&apos;s catheter หรือ central line ภายใน 8 hr ถ้าไม่มีเหตุจำเป็นฉุกเฉิน</li>
                  <li>
                    notify แพทย์ if
                    <ul style={{ paddingLeft: '15px' }}>
                      <li>มีอาการแพ้ยา: มีผื่นขึ้น ปากบวม เพื่อพิจารณา stop rt-PA</li>
                      <li>มีเลือดออก, ปวดศีรษะรุนแรง, GCS drop, อาเจียนรุนแรง</li>
                    </ul>
                  </li>
                  <li>CXR ก่อน admit</li>
                  <li>Admit</li>
                </ul>
                <div style={{ height: '10em' }}></div>
                ลงชื่อแพทย์(ER/MED) <span className="dotted-line"></span>
              </div>
              <div className="grid-cell" id="order-date-cont">
                {submittedOrder.dateStr}
                <br />
                {submittedOrder.timeStr}
              </div>
              <div className="grid-cell">
                <ul className="order-list">
                  <li>NPO</li>
                  <li>Bed rest 24 hr</li>
                  <li>Record BP ระหว่างให้ rt-PA</li>
                  <ul style={{ listStyleType: 'none', paddingLeft: '10px' }}>
                    <li>q 15 min x 2 hr then</li>
                    <li>q 30 min x 6 hr then</li>
                    <li>q 1 hr จนครบ 24 hr then</li>
                    <li>record as usual</li>
                  </ul>
                  <li>Record NIHSS ก่อน/หลังให้ rt-PA<br />Then OD หรือ เมื่อมีอาการเปลี่ยนแปลง</li>
                  <li>Record other VS, I/O(ml), GCS, Warning sign as usual</li>
                </ul>
              </div>

              <div className="grid-cell">&nbsp;</div>
              <div className="grid-cell">...</div>
              <div className="grid-cell">
                <strong>หลังจากได้ rt-PA และ admit แล้ว</strong>
                <br />
                <br />
                <ul className="order-list">
                  <li>
                    record V/S และ NS ตาม order continuation
                    <ul style={{ paddingLeft: '15px' }}>
                      <li>
                        if SBP &gt;= 180 mmHg or DBP &gt; 105 mmHg ให้ Notify แพทย์ให้ Nicardipine 20 mg + 5DW up to 100 ml iv drip 25 ml/hr titrate ทีละ 10 ml/hr ทุก 5-15 min keep SBP &lt; 180 mmHg or DBP &lt; 105 mmHg
                      </li>
                    </ul>
                  </li>
                  <li>CT Brain NC หลังได้ rt-PA 24 hr</li>
                  <li>if GCS drop, ปวดศีรษะมาก, อาเจียน, ชัก, เลือดออกตำแหน่งใดๆ ให้ Notify แพทย์ทันที</li>
                  <li>Serial DTX q 6 hr keep 80 – 180 mg%</li>
                  <li>Blood for FBS HbA1C Lipid profile พรุ่งนี้</li>
                  <li>Consult PM&R พรุ่งนี้</li>
                </ul>
                <div style={{ height: '10em' }}></div>
                ลงชื่อแพทย์(MED) <span className="dotted-line"></span>
              </div>
              <div className="grid-cell">&nbsp;</div>
              <div className="grid-cell">&nbsp;</div>
            </div>

            <div id="print-sticker-container"></div>
          </div>

          <button id="print-btn" className="btn btn-print" onClick={handlePrint}>
            พิมพ์ใบสั่งยา (Print Order)
          </button>
        </div>
      )}
    </div>
  );
}
