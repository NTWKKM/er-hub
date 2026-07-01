'use client';

import SliderInput from './SliderInput';

interface PatientInfoFormProps {
  weight: number;
  age: number;
  hn: string;
  egfr: string;
  onWeightChange: (v: number) => void;
  onAgeChange: (v: number) => void;
  onHnChange: (v: string) => void;
  onEgfrChange: (v: string) => void;
  showEgfr?: boolean;
}

export default function PatientInfoForm({
  weight, age, hn, egfr,
  onWeightChange, onAgeChange, onHnChange, onEgfrChange,
  showEgfr = true,
}: PatientInfoFormProps) {
  return (
    <div className="card">
      <h3 className="card-header">ข้อมูลผู้ป่วย</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="input-group">
          <label>HN</label>
          <input type="text" value={hn} onChange={(e) => onHnChange(e.target.value)} placeholder="กรอก HN" />
        </div>
        {showEgfr && (
          <div className="input-group">
            <label>eGFR (mL/min)</label>
            <input type="text" value={egfr} onChange={(e) => onEgfrChange(e.target.value)} placeholder="กรอก eGFR" />
          </div>
        )}
      </div>
      <SliderInput label="น้ำหนัก (kg)" min={30} max={150} step={0.1} value={weight} onChange={onWeightChange} unit="kg" />
      <SliderInput label="อายุ (ปี)" min={18} max={120} step={1} value={age} onChange={onAgeChange} unit="ปี" />
    </div>
  );
}