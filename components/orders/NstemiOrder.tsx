'use client';

import { useState, useCallback } from 'react';
import PatientInfoForm from '../PatientInfoForm';
import DoseResultCard from '../DoseResultCard';
import { useFormValidation } from '../../lib/form-validate';
import { calcAnticoag } from '../../lib/anticoag-engine';

interface NstemiOrderProps {
  initialHn?: string;
}

export default function NstemiOrder({ initialHn = '' }: NstemiOrderProps) {
  const validation = useFormValidation();

  const [hn, setHn] = useState(initialHn);
  const [weight, setWeight] = useState(70);
  const [age, setAge] = useState(50);
  const [egfr, setEgfr] = useState('');
  const [asaAllergy, setAsaAllergy] = useState<'yes' | 'no'>('no');
  const [calculated, setCalculated] = useState(false);
  const [anticoagResult, setAnticoagResult] = useState<ReturnType<typeof calcAnticoag> | null>(null);

  const handleCalculate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    validation.clearAll();

    const egfrNum = parseFloat(egfr);
    if (isNaN(egfrNum) || egfrNum < 0) {
      validation.fail('egfr', 'กรุณากรอก eGFR');
      return;
    }
    if (weight < 30 || weight > 200) {
      validation.fail('weight', 'กรุณากรอกน้ำหนัก (30–200 kg)');
      return;
    }
    if (age < 18) {
      validation.fail('age', 'กรุณากรอกอายุ (≥ 18 ปี)');
      return;
    }

    setAnticoagResult(calcAnticoag(weight, age, egfrNum));
    setCalculated(true);
  }, [egfr, weight, age, validation]);

  const handleClear = useCallback(() => {
    setHn('');
    setWeight(70);
    setAge(50);
    setEgfr('');
    setAsaAllergy('no');
    setCalculated(false);
    setAnticoagResult(null);
    validation.clearAll();
  }, [validation]);

  const handlePrintOrder = useCallback(() => {
    window.print();
  }, []);

  const handlePrintBlank = useCallback(() => {
    window.print();
  }, []);

  const getAnticoagLabel = () => {
    if (!anticoagResult) return '';
    const { rec, enoxDose, enoxRoute, hepBolus, hepInf, hepRate } = anticoagResult;
    if (rec === 'fondaparinux') return 'Fondaparinux 2.5 mg SC OD × 5d';
    if (rec === 'enoxaparin') return `Enoxaparin ${enoxDose} mg ${enoxRoute} × 5d`;
    if (rec === 'heparin') return `Heparin IV — Bolus ${hepBolus}u → ${hepInf}u/hr`;
    return '';
  };

  return (
    <div className="form-container">
      <div className="header">
        <h1>🫀 NSTEMI Standing Order Generator</h1>
        <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>
          Maharat Nakhon Ratchasima Hospital — Emergency Department
        </p>
        <small style={{ color: '#aaa' }}>
          Guideline: ESC 2023 NSTEMI Guidelines &nbsp;|&nbsp; Version 1.2.0
        </small>
      </div>

      <form id="nstemi-form" onSubmit={handleCalculate}>
        <PatientInfoForm
          hn={hn}
          weight={weight}
          age={age}
          egfr={egfr}
          onHnChange={setHn}
          onWeightChange={setWeight}
          onAgeChange={setAge}
          onEgfrChange={setEgfr}
          showEgfr={true}
          maxWeight={200}
        />

        {validation.getError('egfr') && (
          <div style={{ color: '#dc3545', fontSize: '13px', marginTop: '8px' }}>
            {validation.getError('egfr')}
          </div>
        )}
        {validation.getError('weight') && (
          <div style={{ color: '#dc3545', fontSize: '13px', marginTop: '8px' }}>
            {validation.getError('weight')}
          </div>
        )}
        {validation.getError('age') && (
          <div style={{ color: '#dc3545', fontSize: '13px', marginTop: '8px' }}>
            {validation.getError('age')}
          </div>
        )}

        <div className="card" style={{ marginTop: '16px' }}>
          <h3 className="card-header">ASA Allergy</h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <label style={{ cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="radio"
                name="asa-allergy"
                value="no"
                checked={asaAllergy === 'no'}
                onChange={() => setAsaAllergy('no')}
              />{' '}
              ไม่มี
            </label>
            <label style={{ cursor: 'pointer', fontSize: '14px' }}>
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

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-calculate">
            🧮 คำนวณและสร้างใบสั่งยา
          </button>
          <button type="button" className="btn btn-print" onClick={handlePrintBlank}>
            🖨️ ใบสั่งยาเปล่า (Blank Order)
          </button>
          <button type="button" className="btn btn-clear" onClick={handleClear}>
            🗑️ ล้างข้อมูล (Clear)
          </button>
        </div>
      </form>

      {calculated && anticoagResult && (
        <div id="results-container" className="results-container" style={{ marginTop: '24px' }}>
          <div className="grace-summary" aria-live="polite" style={{
            background: '#fff5f5',
            border: '2px solid #c0392b',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'flex-start'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: '#ffeaa7',
                padding: '10px 18px',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#555' }}>Anticoagulant</div>
                  <div style={{ fontSize: '2.2em', fontWeight: 'bold', color: '#c0392b' }}>
                    {getAnticoagLabel()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3>Anticoagulant Recommendation</h3>

          {asaAllergy === 'yes' && (
            <div style={{ background: '#f5cdcd', border: '1px solid #c0392b', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#c0392b', fontWeight: 'bold' }}>
              ⚠️ ASA ALLERGY — ห้ามให้ ASA (Aspirin) ในผู้ป่วยรายนี้ ใช้ Clopidogrel monotherapy
            </div>
          )}

          {anticoagResult.rec === 'heparin' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <DoseResultCard
                label="Heparin Bolus"
                value={anticoagResult.hepBolus || 0}
                unit="units"
                context="60 units/kg IV bolus"
                ceiling="Max 4000 units"
              />
              <DoseResultCard
                label="Heparin Infusion"
                value={anticoagResult.hepInf || 0}
                unit="units/hr"
                context="12 units/kg/hr"
                ceiling="Max 1000 units/hr"
              />
              <DoseResultCard
                label="Drip Rate"
                value={anticoagResult.hepRate || '0'}
                unit="mL/hr"
                context="Standard concentration: 100 u/mL"
              />
            </div>
          )}

          {anticoagResult.rec === 'enoxaparin' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <DoseResultCard
                label="Enoxaparin Dose"
                value={anticoagResult.enoxDose || 0}
                unit="mg"
                context={anticoagResult.enoxNote}
              />
              <DoseResultCard
                label="Route"
                value={anticoagResult.enoxRoute || ''}
                unit=""
                context="SC × 5 Days"
              />
            </div>
          )}

          {anticoagResult.rec === 'fondaparinux' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <DoseResultCard
                label="Fondaparinux"
                value="2.5"
                unit="mg"
                context="SC OD × 5 Days (Preferred)"
              />
            </div>
          )}

          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
            <strong>Antiplatelet Order:</strong>
            <ul className="order-list" style={{ marginTop: '8px', paddingLeft: '20px' }}>
              {asaAllergy === 'yes' ? (
                <li>
                  <strong style={{ color: '#c0392b' }}>⚠️ ASA ALLERGY — ห้ามให้ ASA</strong><br />
                  ☑ <strong>Clopidogrel (75mg) 4 เม็ด stat</strong> (monotherapy — ASA contraindicated)
                </li>
              ) : (
                <>
                  <li>☑ <strong>ASA 300 mg</strong> 1 เม็ด เคี้ยวและกลืน stat</li>
                  <li>☑ <strong>Clopidogrel (75mg) 4 เม็ด</strong> stat <small style={{ color: '#888' }}>({age <= 75 ? 'อายุ ≤75 ปี' : 'อายุ >75 ปี — ลด loading dose → 1 เม็ด'})</small></li>
                </>
              )}
            </ul>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-print" onClick={handlePrintOrder}>
              🖨️ พิมพ์ Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
