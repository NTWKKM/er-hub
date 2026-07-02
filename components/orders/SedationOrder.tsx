'use client';

import { useState, useCallback } from 'react';
import SliderInput from '../SliderInput';
import DoseResultCard from '../DoseResultCard';
import { useFormValidation } from '../../lib/form-validate';
import { calcDripRate } from '../../lib/calc-engine';
import { resolveDocUrl } from '../../lib/doc-utils';

export default function SedationOrder() {
  const validation = useFormValidation();

  const [hn, setHn] = useState('');
  const [weight, setWeight] = useState(70);
  const [fenDose, setFenDose] = useState(1.0); // mcg/kg/hr, default 1.0
  const [midDose, setMidDose] = useState(0.05); // mg/kg/hr, default 0.05
  const [calculated, setCalculated] = useState(false);

  const handleCalculate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    validation.clearAll();

    // Weight validation: 30-200 kg
    if (!validation.range('weight', weight, 30, 200, 'กรุณากรอกน้ำหนักให้ถูกต้อง (30-200 kg)')) {
      return;
    }

    setCalculated(true);
  }, [weight, validation]);

  const handleClear = useCallback(() => {
    setHn('');
    setWeight(70);
    setFenDose(1.0);
    setMidDose(0.05);
    setCalculated(false);
    validation.clearAll();
  }, [validation]);

  const handlePrintOrder = useCallback(() => {
    window.print();
  }, []);

  const handlePrintBlank = useCallback(() => {
    window.open(resolveDocUrl('/docs/sedation/fen.pdf'), '_blank');
  }, []);

  // Calculate drip rates using calcDripRate
  // Fentanyl: concentration 5 mcg/mL
  const fenRate = calcDripRate({
    doseValue: fenDose,
    doseUnit: 'mcg/kg/hr',
    weightKg: weight,
    concentration: 5.0,
  });

  // Midazolam: concentration 1 mg/mL
  const midRate = calcDripRate({
    doseValue: midDose,
    doseUnit: 'mg/kg/hr',
    weightKg: weight,
    concentration: 1.0,
  });

  // Fentanyl max ceiling: 500 mcg/hr
  const fenTotalDose = fenDose * weight; // mcg/hr
  const fenExceedsMax = fenTotalDose > 500;

  return (
    <div className="form-container">
      <div className="header">
        <h1>🌬️ Post-Intubation Sedation Generator</h1>
        <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>
          Emergency Department — Maharat Nakhon Ratchasima Hospital
        </p>
        <small style={{ color: '#aaa' }}>
          Guideline: ER Standing Order for Sedation (Fentanyl + Midazolam) | Update 22/04/2026
        </small>
      </div>

      <form id="sedation-form" onSubmit={handleCalculate}>
        <div className="input-layout" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Column 1: Patient Details */}
          <div className="input-column" style={{ flex: '1', minWidth: '300px' }}>
            <h3>1. ข้อมูลผู้ป่วย</h3>

            <div className="inline-input-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="hn" style={{ display: 'block', marginBottom: '4px' }}>HN:</label>
              <input
                type="text"
                id="hn"
                value={hn}
                onChange={(e) => setHn(e.target.value)}
                placeholder="กรอก HN"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
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
            {validation.getError('weight') && (
              <div style={{ color: '#dc3545', fontSize: '13px', marginTop: '4px' }}>
                {validation.getError('weight')}
              </div>
            )}
          </div>

          {/* Column 2: Initial Targets */}
          <div className="input-column" style={{ flex: '1', minWidth: '300px' }}>
            <h3>2. ตั้งขนาดยาบำรุงรักษา (Maintenance)</h3>

            <div className="sedation-card" style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              background: '#fafafa',
              marginBottom: '10px'
            }}>
              <h4 style={{
                marginTop: '0',
                marginBottom: '10px',
                color: 'var(--cardiac-primary)',
                borderBottom: '1px solid #ddd',
                paddingBottom: '5px'
              }}>Fentanyl Drip</h4>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
                สูตรเจือจาง: Fentanyl 500 mcg + NSS 100 mL (5 mcg/mL)
              </div>
              <SliderInput
                label="Dose (mcg/kg/h)"
                min={0.5}
                max={10}
                step={0.1}
                value={fenDose}
                onChange={setFenDose}
                unit="mcg/kg/hr"
              />
              <small style={{ color: '#666' }}>(0.5–10)</small>
            </div>

            <div className="sedation-card" style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              background: '#fafafa'
            }}>
              <h4 style={{
                marginTop: '0',
                marginBottom: '10px',
                color: 'var(--cardiac-primary)',
                borderBottom: '1px solid #ddd',
                paddingBottom: '5px'
              }}>Midazolam Drip</h4>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
                สูตรเจือจาง: Midazolam 100 mg + NSS 100 mL (1 mg/mL)
              </div>
              <SliderInput
                label="Dose (mg/kg/h)"
                min={0.02}
                max={0.2}
                step={0.01}
                value={midDose}
                onChange={setMidDose}
                unit="mg/kg/hr"
              />
              <small style={{ color: '#666' }}>(0.02–0.2)</small>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-calculate">
            คำนวณขนาดยาและสร้างใบสั่งยา
          </button>
          <button type="button" className="btn btn-print" onClick={handlePrintBlank}>
            ใบสั่งยาเปล่า (PDF)
          </button>
          <button type="button" className="btn btn-clear" onClick={handleClear}>
            ล้างข้อมูล (Clear)
          </button>
        </div>
      </form>

      {calculated && (
        <div id="results-container" className="results-container" style={{ marginTop: '24px' }}>
          <div className="summary-banner" aria-live="polite" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div className="dose-badge" style={{
              background: '#e8f8f0',
              border: '1px solid #2cc771',
              padding: '10px 18px',
              borderRadius: '8px'
            }}>
              <div>
                <div className="dose-label" style={{ color: '#27ae60', fontSize: '13px' }}>Fentanyl Infusion Rate</div>
                <div className="dose-num" style={{ color: '#27ae60', fontSize: '2.2em', fontWeight: 'bold' }}>
                  {fenRate.toFixed(1)} mL/hr
                </div>
              </div>
            </div>
            <div className="dose-badge" style={{
              background: '#e8f8f0',
              border: '1px solid #2cc771',
              padding: '10px 18px',
              borderRadius: '8px'
            }}>
              <div>
                <div className="dose-label" style={{ color: '#27ae60', fontSize: '13px' }}>Midazolam Infusion Rate</div>
                <div className="dose-num" style={{ color: '#27ae60', fontSize: '2.2em', fontWeight: 'bold' }}>
                  {midRate.toFixed(1)} mL/hr
                </div>
              </div>
            </div>
          </div>

          <h3>3. ตรวจสอบและพิมพ์ใบสั่งยา</h3>

          <div id="print-area" style={{
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <strong>Post Intubation Sedation (ER)</strong><br />
              HN: <span className="highlight" style={{ fontWeight: 'bold' }}>{hn || '--'}</span><br />
              BW: <strong className="highlight">{weight.toFixed(1)}</strong> kg
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>Sedation Plan:</strong><br />
              - Fentanyl maintenance: {fenDose.toFixed(1)} mcg/kg/hr<br />
              - Midazolam maintenance: {midDose.toFixed(2)} mg/kg/hr
            </div>

            <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', marginBottom: '16px' }}>
              <strong>Continuous Drip:</strong>

              <div style={{
                marginTop: '8px',
                padding: '8px',
                background: '#fafffa',
                borderRadius: '4px',
                border: '2px solid #28a745'
              }}>
                ☑ <strong>Fentanyl 500 mcg + NSS/5%DW 100 mL</strong> (5 mcg/mL)<br />
                IV drip <strong className="highlight">{fenRate.toFixed(1)} mL/hr</strong> ({fenDose.toFixed(1)} mcg/kg/hr)
              </div>

              <div style={{
                marginTop: '8px',
                padding: '8px',
                background: '#fafffa',
                borderRadius: '4px',
                border: '2px solid #28a745'
              }}>
                ☑ <strong>Midazolam 100 mg + NSS/5%DW 100 mL</strong> (1 mg/mL)<br />
                IV drip <strong className="highlight">{midRate.toFixed(1)} mL/hr</strong> ({midDose.toFixed(2)} mg/kg/hr)
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <DoseResultCard
                label="Fentanyl Drip Rate"
                value={fenRate.toFixed(1)}
                unit="mL/hr"
                context={`Dose: ${fenDose.toFixed(1)} mcg/kg/hr`}
                ceiling="Max: 500 mcg/hr"
              />
              <DoseResultCard
                label="Midazolam Drip Rate"
                value={midRate.toFixed(1)}
                unit="mL/hr"
                context={`Dose: ${midDose.toFixed(2)} mg/kg/hr`}
                ceiling="Max: 0.2 mg/kg/hr"
              />
            </div>

            {fenExceedsMax && (
              <div style={{
                background: '#f5cdcd',
                border: '1px solid #c0392b',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
                color: '#c0392b',
                fontWeight: 'bold'
              }}>
                ⚠️ Safety Warning: Fentanyl total dose ({fenTotalDose.toFixed(0)} mcg/hr) exceeds maximum recommended dose of 500 mcg/hr
              </div>
            )}

            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '13px'
            }}>
              <strong>Safety Monitoring:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Monitor respiratory rate and BP q 1 hr</li>
                <li>Keep sedation level (RASS score -2 to 0)</li>
                <li>Adjust infusion rate based on clinical response</li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-print"
              onClick={handlePrintOrder}
            >
              พิมพ์ Order (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
