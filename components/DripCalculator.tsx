'use client';

import { useState, useMemo } from 'react';
import { EMERGENCY_DRUG_DATA } from '@/lib/drug-data';
import { calcDripRate, calcBolusVolume } from '@/lib/calc-engine';
import SliderInput from './SliderInput';
import DoseResultCard from './DoseResultCard';

export default function DripCalculator() {
  const [selectedDrugId, setSelectedDrugId] = useState(EMERGENCY_DRUG_DATA[0].id);
  const [prepIndex, setPrepIndex] = useState(0);
  const [weight, setWeight] = useState(70);
  const [dose, setDose] = useState(EMERGENCY_DRUG_DATA[0].doseRange.default);

  const drug = EMERGENCY_DRUG_DATA.find(d => d.id === selectedDrugId)!;
  const preparation = drug.preparations[prepIndex];
  const concentration = preparation.concentration;

  const dripRate = useMemo(() => {
    return calcDripRate({ doseValue: dose, doseUnit: drug.doseUnit, weightKg: weight, concentration, isWeightBased: drug.isWeightBased, isPerMinute: drug.doseUnit.endsWith('/min') });
  }, [dose, drug.doseUnit, drug.isWeightBased, weight, concentration]);

  const bolusVolume = useMemo(() => {
    return calcBolusVolume({ doseValue: dose, perKg: drug.isWeightBased, weightKg: weight, concentration });
  }, [dose, drug.isWeightBased, weight, concentration]);

  return (
    <div>
      <div className="card">
        <h3 className="card-header">IV Infusion Drip Calculator</h3>
        <div className="input-group">
          <label htmlFor="drug-select">ยา</label>
          <select id="drug-select" value={selectedDrugId} onChange={(e) => {
            setSelectedDrugId(e.target.value);
            setPrepIndex(0);
            const d = EMERGENCY_DRUG_DATA.find(d => d.id === e.target.value)!;
            setDose(d.doseRange.default);
          }}>
            {EMERGENCY_DRUG_DATA.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.thaiName})</option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label htmlFor="prep-select">สูตรผสม</label>
          <select id="prep-select" value={prepIndex} onChange={(e) => setPrepIndex(parseInt(e.target.value))}>
            {drug.preparations.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
        </div>
        <SliderInput label="น้ำหนัก (kg)" min={30} max={150} step={0.1} value={weight} onChange={setWeight} unit="kg" />
        <SliderInput
          label={`Dose (${drug.doseUnit})`}
          min={drug.doseRange.min}
          max={drug.doseRange.max}
          step={drug.doseRange.step}
          value={dose}
          onChange={setDose}
          unit={drug.doseUnit}
        />
      </div>

      <DoseResultCard
        label="Drip Rate"
        value={dripRate.toFixed(2)}
        unit="mL/hr"
        context={`${dose} ${drug.doseUnit}${drug.isWeightBased ? ` × ${weight} kg` : ''}`}
        ceiling={`Range: ${drug.doseRange.min}–${drug.doseRange.max} ${drug.doseUnit}`}
      />

      {drug.isWeightBased && drug.hasBolus !== false && (
        <DoseResultCard
          label="Bolus Volume"
          value={bolusVolume.toFixed(2)}
          unit="mL"
          context={`${dose} ${drug.doseUnit} × ${weight} kg ÷ ${concentration}`}
        />
      )}

      {drug.showDualUnits && (
        <DoseResultCard
          label="Dose (mcg/kg/min)"
          value={(dose * 1000).toFixed(0)}
          unit="mcg/kg/min"
          context={`${dose} mg/kg/min = ${(dose * 1000).toFixed(0)} mcg/kg/min`}
        />
      )}

      <div className="card">
        <h3 className="card-header">คำแนะนำการปรับยา</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{drug.titrationGuide}</p>
        <ul style={{ marginTop: '12px', paddingLeft: '20px' }}>
          {drug.safetyWarnings.map((w, i) => (
            <li key={i} style={{ fontSize: '13px', color: 'var(--warning)', marginBottom: '4px' }}>⚠ {w}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}