'use client';

import { useState } from 'react';
import SliderInput from '@/components/SliderInput';
import DoseResultCard from '@/components/DoseResultCard';
import StickerBox from '@/components/StickerBox';
import { useFormValidation } from '@/lib/form-validate';
import {
  calcHeparinInitialDose,
  getHeparinTitration,
  HEPARIN_STANDALONE_PROTOCOLS,
} from '@/lib/anticoag-engine';

const BLEEDING_RISK_FACTORS = [
  'Active bleeding / potential bleeding site',
  'Peptic ulcer disease / Hx GI bleeding',
  'มีประวัติเลือดออกในสมอง (ICH) หรือ Large cerebral infarct',
  'ได้รับยา NSAIDs, antiplatelets หรือ fibrinolytic',
  'Severe hypertension (SBP > 180 / DBP > 110)',
  'โรคการแข็งตัวของเลือดบกพร่อง (Hemostatic defect)',
  'ไตวายรุนแรง (Severe renal failure)',
  'ตับวายรุนแรง (Severe hepatic failure)',
  'มีภาวะโลหิตจางรุนแรง (Severe anemia)',
  'เพิ่งได้รับการผ่าตัดใหญ่หรือประสบอุบัติเหตุรุนแรง',
  'อายุมากกว่า 60 ปี (Age > 60 years)',
  'Platelet < 100,000/mm³',
];

type ProtocolKey = keyof typeof HEPARIN_STANDALONE_PROTOCOLS;

export default function HeparinOrder() {
  const [hn, setHn] = useState('');
  const [weight, setWeight] = useState(70);
  const [protocol, setProtocol] = useState<ProtocolKey>('acs_valve');
  const [concentration, setConcentration] = useState<number>(100);
  const [bleedingRisks, setBleedingRisks] = useState<Record<string, boolean>>({});
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [showResults, setShowResults] = useState(false);

  // Titration assistant state
  const [apttRatio, setApttRatio] = useState<string>('');
  const [currentRateMl, setCurrentRateMl] = useState<string>('');
  const [titrationResult, setTitrationResult] = useState<ReturnType<typeof getHeparinTitration> | null>(null);

  const validation = useFormValidation();

  const hasAnyRisk = Object.values(bleedingRisks).some((v) => v);

  const handleRiskToggle = (factor: string) => {
    setBleedingRisks((prev) => ({
      ...prev,
      [factor]: !prev[factor],
    }));
  };

  const calculateDose = () => {
    if (!hn.trim()) {
      validation.fail('hn', 'กรุณากรอก HN');
      return;
    }
    validation.clear('hn');

    if (isNaN(weight) || weight < 30 || weight > 200) {
      validation.fail('weight', 'น้ำหนักต้องอยู่ระหว่าง 30-200 kg');
      return;
    }
    validation.clear('weight');

    setShowResults(true);
  };

  const handleTitrate = () => {
    const ratio = parseFloat(apttRatio);
    const rateMl = parseFloat(currentRateMl);

    if (isNaN(ratio) || ratio <= 0 || isNaN(rateMl) || rateMl < 0) {
      validation.warn('กรุณากรอก aPTT Ratio และอัตราการหยดเดิมให้ถูกต้อง');
      setTitrationResult(null);
      return;
    }
    validation.clearWarn();

    const currentRateUnits = rateMl * concentration;
    const result = getHeparinTitration(ratio, currentRateUnits, concentration);
    setTitrationResult(result);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintBlank = () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    window.open(`${basePath}/docs/HAD/Heparin.pdf`, '_blank');
  };

  const handleReset = () => {
    setHn('');
    setWeight(70);
    setProtocol('acs_valve');
    setConcentration(100);
    setBleedingRisks({});
    setUseCurrentTime(true);
    setShowResults(false);
    setApttRatio('');
    setCurrentRateMl('');
    setTitrationResult(null);
    validation.clearAll();
  };

  const now = new Date();
  const dateStr = useCurrentTime ? now.toLocaleDateString('th-TH') : '....................';
  const timeStr = useCurrentTime ? now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '....................';
  const dtStr = `${dateStr}<br/>${timeStr}`;

  let doseResult: ReturnType<typeof calcHeparinInitialDose> | null = null;
  if (!hasAnyRisk && showResults) {
    doseResult = calcHeparinInitialDose(protocol, weight, concentration);
  }

  const protocolObj = HEPARIN_STANDALONE_PROTOCOLS[protocol];

  return (
    <div className="order-page">
      <div className="form-container">
        <div className="header">
          <h1>🩸 Heparin Standing Order Generator &amp; Titration Assistant</h1>
          <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>
            Emergency Department — Maharat Nakhon Ratchasima Hospital
          </p>
          <small style={{ color: '#aaa' }}>
            Guideline: Siriraj Guideline for Adult Patients with Heparin Administration (Modified)
          </small>
        </div>

        <form id="heparin-form">
          <div className="input-layout">
            {/* Column 1: Patient Details & Indication */}
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
                label="น้ำหนัก (BW kg)"
                min={30}
                max={200}
                step={0.1}
                value={weight}
                onChange={setWeight}
                unit="kg"
                registerRef={validation.registerRef}
                fieldId="weight"
              />

              <div style={{ marginTop: '14px', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                <label htmlFor="protocol-select" style={{ fontSize: '13.5px', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                  เลือกข้อบ่งชี้ (Indication):
                </label>
                <select
                  id="protocol-select"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as ProtocolKey)}
                  required
                  style={{ width: '100%' }}
                >
                  <option value="acs_valve">ACS / Unstable Angina / Mechanical Valve</option>
                  <option value="ami_fibrinolytic">Acute MI treated with Fibrinolytic</option>
                  <option value="pe_thrombus">PE / Intracardiac Thrombus / AF / Bridging</option>
                  <option value="dvt_arterial">DVT / Peripheral Arterial Occlusion</option>
                </select>
              </div>

              <div style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                <label htmlFor="concentration-select" style={{ fontSize: '13.5px', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                  ความเข้มข้นของการเจือจาง:
                </label>
                <select
                  id="concentration-select"
                  value={concentration}
                  onChange={(e) => setConcentration(parseInt(e.target.value))}
                  required
                  style={{ width: '100%' }}
                >
                  <option value="100">10,000 units in NSS 100 mL (100 units/mL) [แนะนำ]</option>
                  <option value="50">5,000 units in NSS 100 mL (50 units/mL)</option>
                </select>
              </div>

              <div style={{ marginTop: '10px' }}>
                <label className="flag-label" style={{ fontWeight: 'normal' }}>
                  <input
                    type="checkbox"
                    checked={useCurrentTime}
                    onChange={(e) => setUseCurrentTime(e.target.checked)}
                  />
                  บันทึกเวลาปัจจุบัน (Use Current Time)
                </label>
              </div>
            </div>

            {/* Column 2: Bleeding Risk Factors */}
            <div className="input-column">
              <h3>2. คัดกรองปัจจัยเสี่ยงภาวะเลือดออก (Bleeding Risk Factors)</h3>
              <div style={{ fontSize: '12px', color: '#c0392b', marginBottom: '8px', fontWeight: 'bold' }}>
                * หากมีข้อบ่งชี้หรือความเสี่ยงแม้แต่วข้อเดียว ระบบจะจำกัดการคำนวณอัตโนมัติ (บังคับสั่งปรับยาเฉพาะราย)
              </div>
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px', background: '#fdfdfd' }}>
                {BLEEDING_RISK_FACTORS.map((factor) => (
                  <label key={factor} className="flag-label">
                    <input
                      type="checkbox"
                      className="risk-ci"
                      checked={!!bleedingRisks[factor]}
                      onChange={() => handleRiskToggle(factor)}
                    />
                    {factor}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Danger Alert Box */}
          {hasAnyRisk && (
            <div id="danger-ci-box" className="danger-ci-box" style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', padding: '15px', borderRadius: '6px', marginTop: '15px' }}>
              <strong>🚫 Individualized Dosing Required:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px' }}>
                ผู้ป่วยรายนี้มีปัจจัยเสี่ยงทางคลินิก ไม่สามารถคำนวณขนาดเริ่มต้นแบบมาตรฐานได้ กรุณาปรึกษาแพทย์เฉพาะทาง หรือ Staff เพื่อสั่งใช้ยารายบุคคล
              </p>
            </div>
          )}

          <button type="button" onClick={calculateDose} className="btn btn-calculate">
            ตรวจสอบและสร้างใบสั่งยาเริ่มต้น
          </button>
          <button type="button" id="print-blank-btn" className="btn btn-print" onClick={handlePrintBlank}>
            ใบสั่งยาเปล่า (PDF)
          </button>
          <button type="button" id="clear-btn" className="btn btn-clear" onClick={handleReset}>
            ล้างข้อมูล (Clear)
          </button>
        </form>

        {/* aPTT Interactive Titration Assistant */}
        <div className="assistant-section" style={{ background: '#fff8f2', border: '2px dashed #e67e22', borderRadius: '8px', padding: '20px', marginTop: '15px' }}>
          <h3>📈 เครื่องมือช่วย titration ด้วยค่า aPTT (Titration Assistant)</h3>
          <p style={{ margin: '2px 0 10px 0', color: '#555', fontSize: '12.5px' }}>
            สำหรับคนไข้ที่นอนรักษาอยู่ (IPD) เพื่อสั่งปรับระดับอัตรายา Heparin
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div className="inline-input-group" style={{ marginBottom: '0', flex: '1', minWidth: '180px' }}>
              <label htmlFor="aptt-ratio" style={{ width: '120px' }}>aPTT Ratio ปัจจุบัน:</label>
              <input
                type="number"
                id="aptt-ratio"
                step="0.1"
                min="0.1"
                max="15.0"
                value={apttRatio}
                onChange={(e) => setApttRatio(e.target.value)}
                placeholder="เช่น 2.0"
              />
            </div>
            <div className="inline-input-group" style={{ marginBottom: '0', flex: '1', minWidth: '180px' }}>
              <label htmlFor="current-rate-ml" style={{ width: '120px' }}>อัตราหยดเดิม (mL/hr):</label>
              <input
                type="number"
                id="current-rate-ml"
                step="0.1"
                min="0"
                value={currentRateMl}
                onChange={(e) => setCurrentRateMl(e.target.value)}
                placeholder="เช่น 10.0"
              />
            </div>
            <button
              type="button"
              id="titrate-btn"
              className="btn"
              onClick={handleTitrate}
              style={{ background: '#e67e22', width: 'auto', marginTop: '0', padding: '9px 18px' }}
            >
              คำนวณการปรับยา
            </button>
          </div>

          {titrationResult && (
            <div id="titration-result" className="titration-badge" style={{ background: '#ffeaa7', borderLeft: '5px solid #e67e22', padding: '10px 15px', borderRadius: '4px', marginTop: '12px', fontSize: '14px' }}>
              <strong>📋 ผลคำนวณการปรับขนาดยา:</strong>
              <div id="titrate-text" style={{ marginTop: '6px', lineHeight: '1.5' }}>
                <strong>การจัดการ (Action):</strong>{' '}
                <span style={{ color: '#c0392b', fontWeight: 'bold' }}>{titrationResult.action}</span>
                <br />
                <strong>การปรับขนาด (Dose Change):</strong>{' '}
                {titrationResult.rateChangeUnits > 0 ? '+' : ''}
                {titrationResult.rateChangeUnits} units/hr ({titrationResult.rateChangeMlHr > 0 ? '+' : ''}
                {titrationResult.rateChangeMlHr} mL/hr)
                <br />
                <strong>อัตราการจ่ายยาใหม่ (New Rate):</strong>{' '}
                <span style={{ fontSize: '1.1em', color: '#27ae60', fontWeight: 'bold' }}>
                  {titrationResult.nextRateMlHr} mL/hr
                </span>{' '}
                ({titrationResult.nextRateUnitsHr} units/hr)
                {titrationResult.cappedText}
                <br />
                <strong>การติดตามผล (Recheck):</strong>{' '}
                <span style={{ fontWeight: 'bold' }}>{titrationResult.recheckText}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {showResults && (
        <div id="results-container" className="results-container" aria-live="polite">
          <div className="summary-banner">
            <div className="dose-badge">
              <div>
                <div className="dose-label">Dosing / Infusion rate เริ่มต้น</div>
                <div className="dose-num" id="screen-dose">
                  {hasAnyRisk
                    ? 'Individualized dosing required (สั่งแพทย์เฉพาะราย)'
                    : doseResult
                    ? `Bolus: ${doseResult.bolus} units | Infusion: ${doseResult.infusion} units/hr (${doseResult.dripRate} mL/hr)`
                    : '--'}
                </div>
              </div>
            </div>
          </div>

          <h3>3. ตรวจสอบและพิมพ์ใบสั่งยา</h3>

          <div id="print-area">
            <div id="print-header-container">
              <div className="print-header">
                <strong>Maharat Nakhon Ratchasima Hospital</strong>
                <br />
                Emergency Department
              </div>
            </div>

            <StickerBox hn={hn || '....................'} />

            <div className="order-grid-5col">
              <div className="grid-header">Progress note สหสาขาวิชาชีพ</div>
              <div className="grid-header">Date/<br />Time</div>
              <div className="grid-header">Orders for one day</div>
              <div className="grid-header">Date/<br />Time</div>
              <div className="grid-header">Order for Continuation</div>

              {/* Col 1: Progress Note */}
              <div className="grid-cell">
                <strong>Heparin Protocol (Standalone)</strong>
                <br />
                HN: <span id="p-hn" className="highlight">{hn || '--'}</span>
                <br />
                BW: <strong id="p-weight" className="highlight">{weight.toFixed(1)}</strong> kg
                <br />
                Indication: <span id="p-indication">{protocolObj.name}</span>

                <div className="divider"></div>
                <strong>ผลการประเมินความเสี่ยงตกเลือด:</strong>
                <br />
                - Bleeding Risk Factor:{' '}
                <span id="p-risk-status">
                  {hasAnyRisk ? (
                    <strong style={{ color: 'red' }}>YES ⚠️ (ความเสี่ยงสูง)</strong>
                  ) : (
                    'No'
                  )}
                </span>
                <br />
                <span id="p-risk-blocked-note" style={{ color: 'red', fontWeight: 'bold', fontSize: '10px' }}>
                  {hasAnyRisk ? '⚠️ พิมพ์ใบสั่งยาสำหรับการปรับรายบุคคล (ห้ามใช้ standard initial dose)' : ''}
                </span>

                <div className="divider"></div>
                ลงชื่อแพทย์ผู้ประเมิน: <span className="dotted-line"></span>
                <br />
                เลขว.: <span className="dotted-line" style={{ minWidth: '45px' }}></span>
              </div>

              {/* Col 2: Date/Time */}
              <div className="grid-cell" id="p-dt-1" dangerouslySetInnerHTML={{ __html: dtStr }} />

              {/* Col 3: One day orders */}
              <div className="grid-cell">
                <strong>Initial Heparin Administration:</strong>

                {!hasAnyRisk && doseResult && (
                  <div id="p-hep-calculation-box" className="fib-order-box chosen">
                    ☑ <strong>Heparin {concentration === 100 ? '10,000 units + NSS 100 mL' : '5,000 units + NSS 100 mL'}</strong> ({concentration} units/mL)
                    <br />
                    - IV bolus <strong><span id="p-bolus-dose">{doseResult.bolus}</span> units</strong> ({protocolObj.bolusPerKg} units/kg)
                    <br />
                    - IV drip <strong><span id="p-inf-dose">{doseResult.infusion}</span> units/hr</strong> = <strong><span id="p-inf-rate">{doseResult.dripRate}</span> mL/hr</strong> ({protocolObj.infPerKg} units/kg/hr)
                    <br />
                    - flushing with 0.9% NSS 20 cc after infusion stopped
                  </div>
                )}

                {hasAnyRisk && (
                  <div id="p-individualized-box" className="fib-order-box hidden" style={{ border: '1px solid red', background: '#fff8f8', padding: '10px' }}>
                    ⚠️ <strong>Individualized Drip (แพทย์สั่งใช้ยาเป็นรายบุคคล):</strong>
                    <br />
                    - IV bolus: <span className="dotted-line" style={{ minWidth: '50px' }}></span> units
                    <br />
                    - IV drip: Heparin <span className="dotted-line" style={{ minWidth: '50px' }}></span> units + NSS <span className="dotted-line" style={{ minWidth: '40px' }}></span> mL
                    <br />
                    IV drip rate: <span className="dotted-line" style={{ minWidth: '50px' }}></span> mL/hr
                  </div>
                )}

                <div className="divider"></div>
                <strong>Labs:</strong>
                <ul className="order-list">
                  <li>☐ Check baseline CBC, PT, PTT, INR before Heparin</li>
                  <li>☐ Repeat aPTT ratio <strong>every 6 hours</strong> after starting or altering drip rate</li>
                  <li>☐ Check CBC/Platelet <strong>every 2 days</strong> (watch for HIT if given &gt; 3 days)</li>
                </ul>
              </div>

              {/* Col 4: Date/Time */}
              <div className="grid-cell" id="p-dt-2" dangerouslySetInnerHTML={{ __html: dtStr }} />

              {/* Col 5: Continuation */}
              <div className="grid-cell">
                <strong>Titration Reference (aPTT):</strong>
                <table style={{ width: '100%', fontSize: '8px', borderCollapse: 'collapse', marginTop: '4px' }} border={1}>
                  <thead>
                    <tr style={{ background: '#eee' }}>
                      <th>aPTT</th>
                      <th>Action</th>
                      <th>Rate</th>
                      <th>Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>&gt;7.0</td><td>Stop 180m</td><td>-500 u/h</td><td>3h</td></tr>
                    <tr><td>5.1-7.0</td><td>Stop 60m</td><td>-500 u/h</td><td>6h</td></tr>
                    <tr><td>4.1-5.0</td><td>Stop 60m</td><td>-300 u/h</td><td>6h</td></tr>
                    <tr><td>3.1-4.0</td><td>Stop 60m</td><td>-200 u/h</td><td>6h</td></tr>
                    <tr><td>2.6-3.0</td><td>Stop 60m</td><td>-100 u/h</td><td>6h</td></tr>
                    <tr style={{ background: '#e8f8f0', fontWeight: 'bold' }}><td>1.5-2.5</td><td>เดิม</td><td>0</td><td>เช้า</td></tr>
                    <tr><td>1.2-1.4</td><td>Bolus 2.5k</td><td>+150 u/h</td><td>6h</td></tr>
                    <tr><td>&lt;1.2</td><td>Bolus 5k</td><td>+400 u/h</td><td>6h</td></tr>
                  </tbody>
                </table>
                <div className="divider"></div>
                ลงชื่อแพทย์ (ward): <span className="dotted-line"></span>
                <br />
                เลขว.: <span className="dotted-line" style={{ minWidth: '45px' }}></span>
                <br />
                <br />
                <small style={{ color: '#777', fontSize: '9px' }}>
                  Generated: <span id="p-generated">{now.toLocaleString('th-TH')}</span>
                </small>
              </div>
            </div>

            <div id="print-sticker-container"></div>
          </div>

          <button id="print-btn" className="btn btn-print" onClick={handlePrint}>
            พิมพ์ Order (Print Order)
          </button>
        </div>
      )}
    </div>
  );
}
