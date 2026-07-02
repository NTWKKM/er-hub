'use client';

import { useState, useCallback } from 'react';
import SliderInput from '../SliderInput';
import DoseResultCard from '../DoseResultCard';
import { useFormValidation } from '../../lib/form-validate';
import { resolveDocUrl } from '../../lib/doc-utils';

type PeRiskType = 'high' | 'intermediate-high';
type PeRegimen = 'sk_a' | 'sk_b' | 'rtpa_a' | 'rtpa_b';

interface AbsoluteCI {
  id: string;
  label: string;
}

interface RelativeCI {
  id: string;
  label: string;
}

const ABSOLUTE_CI: AbsoluteCI[] = [
  { id: 'hemorrhagic-stroke', label: 'ประวัติเลือดออกในสมอง (Hemorrhagic stroke/Stroke of unknown origin)' },
  { id: 'ischemic-stroke', label: 'ประวัติสมองขาดเลือด (Ischemic stroke) ภายใน 6 เดือน' },
  { id: 'trauma-surgery', label: 'ได้รับการบาดเจ็บรุนแรงหรือผ่าตัดใหญ่ภายใน 3 สัปดาห์' },
  { id: 'active-bleeding', label: 'Active bleeding' },
  { id: 'cns-neoplasm', label: 'Central nervous system neoplasm' },
];

const RELATIVE_CI: RelativeCI[] = [
  { id: 'tia', label: 'มีประวัติเป็น TIA ภายใน 6 เดือน' },
  { id: 'anticoagulant', label: 'ได้รับยาป้องกันการแข็งตัวของเลือด (Anticoagulant therapy)' },
  { id: 'recent-puncture', label: 'ได้รับการเจาะในตำแหน่งที่หยุดเลือดไม่ได้ภายใน 24 ชม. (เช่น เจาะเนื้อตับ/เจาะน้ำไขสันหลัง)' },
  { id: 'traumatic-resus', label: 'Traumatic resuscitation' },
  { id: 'hypertension', label: 'มีความดันโลหิตสูงรุนแรง > 180 mmHg' },
  { id: 'endocarditis', label: 'มีการติดเชื้อที่ลิ้นหัวใจ (Infective endocarditis)' },
  { id: 'pregnancy', label: 'ผู้ป่วยตั้งครรภ์ หรือ First post-partum week' },
  { id: 'liver-disease', label: 'Advanced liver disease' },
  { id: 'peptic-ulcer', label: 'Active peptic ulcer' },
];

const REGIMEN_LABELS: Record<PeRegimen, string> = {
  sk_a: 'SK 1.5 MU (120 min)',
  sk_b: 'SK Loading + Syringe Pump',
  rtpa_a: 'rt-PA 100 mg (120 min)',
  rtpa_b: 'rt-PA 0.6 mg/kg',
};

export default function PeOrder() {
  const validation = useFormValidation();

  const [hn, setHn] = useState('');
  const [weight, setWeight] = useState(70);
  const [riskType, setRiskType] = useState<PeRiskType>('high');
  const [regimen, setRegimen] = useState<PeRegimen>('sk_a');
  const [priorSk, setPriorSk] = useState(false);
  const [absCI, setAbsCI] = useState<Set<string>>(new Set());
  const [relCI, setRelCI] = useState<Set<string>>(new Set());
  const [calculated, setCalculated] = useState(false);

  const handleCalculate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    validation.clearAll();

    // Weight validation: 30-200 kg
    if (!validation.range('weight', weight, 30, 200, 'กรุณากรอกน้ำหนักให้ถูกต้อง (30-200 kg)')) {
      return;
    }

    // Check absolute contraindications
    const hasAbsCI = absCI.size > 0;
    const isSK = regimen === 'sk_a' || regimen === 'sk_b';
    const hasPriorSK = priorSk;

    if (hasAbsCI) {
      validation.warn('⚠️ ผู้ป่วยมีข้อห้ามเด็ดขาด (Absolute Exclusion Criteria) ในการให้ยาละลายลิ่มเลือด ห้ามทำรายการต่อ!');
    } else if (isSK && hasPriorSK) {
      validation.warn('⚠️ ผู้ป่วยเคยได้รับ Streptokinase มาก่อนภายใน 6 เดือน ห้ามใช้ยา SK ซ้ำเด็ดขาด! กรุณาเลือก rt-PA แทน');
    } else {
      validation.clearWarn();
    }

    setCalculated(true);
  }, [weight, regimen, absCI, priorSk, validation]);

  const handleClear = useCallback(() => {
    setHn('');
    setWeight(70);
    setRiskType('high');
    setRegimen('sk_a');
    setPriorSk(false);
    setAbsCI(new Set());
    setRelCI(new Set());
    setCalculated(false);
    validation.clearAll();
  }, [validation]);

  const handlePrintOrder = useCallback(() => {
    window.print();
  }, []);

  const handlePrintBlank = useCallback(() => {
    window.open(resolveDocUrl('/docs/STEMI-PE/PE-Massive-merged.pdf'), '_blank');
  }, []);

  const toggleAbsCI = (id: string) => {
    setAbsCI(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleRelCI = (id: string) => {
    setRelCI(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate rt-PA weight-based dose (0.6 mg/kg, max 50mg)
  const rtpaDoseVal = Math.min(weight * 0.6, 50);

  const hasAbsCI = absCI.size > 0;
  const hasRelCI = relCI.size > 0;
  const isSK = regimen === 'sk_a' || regimen === 'sk_b';
  const isBlocked = hasAbsCI || (isSK && priorSk);

  const getRegimenDisplayName = () => {
    if (regimen === 'rtpa_b') {
      return `${REGIMEN_LABELS[regimen]} (${rtpaDoseVal.toFixed(1)} mg)`;
    }
    return REGIMEN_LABELS[regimen];
  };

  return (
    <div className="form-container">
      <div className="header">
        <h1>🫁 Massive PE Fibrinolysis Order Generator</h1>
        <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>
          Emergency Department — Maharat Nakhon Ratchasima Hospital
        </p>
        <small style={{ color: '#aaa' }}>
          Guideline: ESC 2019 Pulmonary Embolism Guidelines | แก้ไข ธันวาคม 2565
        </small>
      </div>

      <form id="pe-form" onSubmit={handleCalculate}>
        <div className="input-layout" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Column 1: Patient and Clinical Screening */}
          <div className="input-column" style={{ flex: '1', minWidth: '300px' }}>
            <h3>1. ข้อมูลผู้ป่วยและข้อบ่งใช้</h3>

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

            <div className="slider-group">
              <label htmlFor="weight-slider">
                <span>น้ำหนัก (BW kg)</span>
                <span className="slider-value">{weight} kg</span>
              </label>
              <input
                id="weight-slider"
                type="range"
                min={30}
                max={200}
                step={0.1}
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value))}
                ref={(el) => validation.registerRef('weight', el)}
              />
            </div>

            <fieldset style={{ marginTop: '14px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', border: 'none' }}>
              <legend style={{ fontSize: '14.5px', fontWeight: 'bold', padding: 0 }}>ข้อบ่งใช้ทางคลินิก (Indication):</legend>
              <label className="flag-label" style={{ marginTop: '6px', display: 'block' }} htmlFor="pe-risk-high">
                <input
                  type="radio"
                  id="pe-risk-high"
                  name="pe-risk"
                  value="high"
                  checked={riskType === 'high'}
                  onChange={() => setRiskType('high')}
                />{' '}
                High-risk PE (Hemodynamic instability)
              </label>
              <label className="flag-label" style={{ display: 'block' }} htmlFor="pe-risk-intermediate">
                <input
                  type="radio"
                  id="pe-risk-intermediate"
                  name="pe-risk"
                  value="intermediate-high"
                  checked={riskType === 'intermediate-high'}
                  onChange={() => setRiskType('intermediate-high')}
                />{' '}
                Intermediate-to-high risk PE (RV dysfunction + Troponin positive)
              </label>
            </fieldset>
          </div>

          {/* Column 2: Contraindications Check */}
          <div className="input-column" style={{ flex: '1', minWidth: '300px' }}>
            <h3>2. ประเมินข้อห้ามใช้ยาละลายลิ่มเลือด</h3>

            <fieldset className="checklist-group" style={{ marginBottom: '12px', border: 'none', padding: 0 }}>
              <legend style={{ background: '#f5cdcd', color: '#c0392b', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px', fontWeight: 'bold' }}>
                🔴 Absolute Exclusion Criteria (ข้อห้ามเด็ดขาด)
              </legend>
              {ABSOLUTE_CI.map((ci) => (
                <label key={ci.id} htmlFor={`abs-ci-${ci.id}`} className="flag-label" style={{ display: 'block', marginBottom: '4px' }}>
                  <input
                    id={`abs-ci-${ci.id}`}
                    type="checkbox"
                    checked={absCI.has(ci.id)}
                    onChange={() => toggleAbsCI(ci.id)}
                  />{' '}
                  {ci.label}
                </label>
              ))}
              <label htmlFor="prior-sk" className="flag-label" style={{ display: 'block', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  id="prior-sk"
                  checked={priorSk}
                  onChange={(e) => setPriorSk(e.target.checked)}
                />{' '}
                เคยได้รับ Streptokinase มาก่อน ภายใน 6 เดือนที่ผ่านไป? <small style={{ color: '#d35400' }}>(ห้ามใช้ SK)</small>
              </label>
            </fieldset>

            <fieldset className="checklist-group" style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ background: '#ffeaa7', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px', fontWeight: 'bold' }}>
                🟡 Relative Contraindications (ข้อควรระวัง)
              </legend>
              {RELATIVE_CI.map((ci) => (
                <label key={ci.id} htmlFor={`rel-ci-${ci.id}`} className="flag-label" style={{ display: 'block', marginBottom: '4px' }}>
                  <input
                    id={`rel-ci-${ci.id}`}
                    type="checkbox"
                    checked={relCI.has(ci.id)}
                    onChange={() => toggleRelCI(ci.id)}
                  />{' '}
                  {ci.label}
                </label>
              ))}
            </fieldset>
          </div>
        </div>

        {/* Column 3: Regimen Selection */}
        <h3>3. เลือกสูตรการบริหารยาละลายลิ่มเลือด (Fibrinolytic Regimen)</h3>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="sr-only">เลือกสูตร Fibrinolytic Regimen</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <label
              htmlFor="pe-regimen-sk-a"
              className={`pe-regimen-card${regimen === 'sk_a' ? ' selected' : ''}`}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                background: regimen === 'sk_a' ? '#fff5f5' : 'transparent',
                borderColor: regimen === 'sk_a' ? 'var(--cardiac-primary, #c0392b)' : '#ddd',
                borderWidth: regimen === 'sk_a' ? '2px' : '1px',
              }}
            >
              <input
                id="pe-regimen-sk-a"
                type="radio"
                name="pe-regimen"
                value="sk_a"
                checked={regimen === 'sk_a'}
                onChange={() => setRegimen('sk_a')}
              />{' '}
              <strong>Streptokinase (SK) Regimen A: 1.5 MU IV drip in 120 min</strong>
              <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>1.5 MU dilute in NSS 100 mL IV drip ใน 120 นาที</small>
            </label>

            <label
              htmlFor="pe-regimen-sk-b"
              className={`pe-regimen-card${regimen === 'sk_b' ? ' selected' : ''}`}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                background: regimen === 'sk_b' ? '#fff5f5' : 'transparent',
                borderColor: regimen === 'sk_b' ? 'var(--cardiac-primary, #c0392b)' : '#ddd',
                borderWidth: regimen === 'sk_b' ? '2px' : '1px',
              }}
            >
              <input
                id="pe-regimen-sk-b"
                type="radio"
                name="pe-regimen"
                value="sk_b"
                checked={regimen === 'sk_b'}
                onChange={() => setRegimen('sk_b')}
              />{' '}
              <strong>Streptokinase (SK) Regimen B: Syringe Pump (Loading + Infusion)</strong>
              <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>Load 250,000 U in NSS 100 mL IV drip in 30 min → then maintenance 100,000 U/hr (4 mL/hr of 25,000 U/mL conc) via syringe pump (หมดอายุ 8 ชม. หลังผสม)</small>
            </label>

            <label
              htmlFor="pe-regimen-rtpa-a"
              className={`pe-regimen-card${regimen === 'rtpa_a' ? ' selected' : ''}`}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                background: regimen === 'rtpa_a' ? '#fff5f5' : 'transparent',
                borderColor: regimen === 'rtpa_a' ? 'var(--cardiac-primary, #c0392b)' : '#ddd',
                borderWidth: regimen === 'rtpa_a' ? '2px' : '1px',
              }}
            >
              <input
                id="pe-regimen-rtpa-a"
                type="radio"
                name="pe-regimen"
                value="rtpa_a"
                checked={regimen === 'rtpa_a'}
                onChange={() => setRegimen('rtpa_a')}
              />{' '}
              <strong>rt-PA Regimen A: 100 mg IV drip in 120 min</strong>
              <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>rt-PA 100 mg IV drip ใน 120 นาที</small>
            </label>

            <label
              htmlFor="pe-regimen-rtpa-b"
              className={`pe-regimen-card${regimen === 'rtpa_b' ? ' selected' : ''}`}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                background: regimen === 'rtpa_b' ? '#fff5f5' : 'transparent',
                borderColor: regimen === 'rtpa_b' ? 'var(--cardiac-primary, #c0392b)' : '#ddd',
                borderWidth: regimen === 'rtpa_b' ? '2px' : '1px',
              }}
            >
              <input
                id="pe-regimen-rtpa-b"
                type="radio"
                name="pe-regimen"
                value="rtpa_b"
                checked={regimen === 'rtpa_b'}
                onChange={() => setRegimen('rtpa_b')}
              />{' '}
              <strong>rt-PA Regimen B: Fast Drip 0.6 mg/kg (Max 50 mg) in 15 min</strong>
              <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>คำนวณตามน้ำหนักจริงของคนไข้ x 0.6 mg/kg (ห้ามเกิน 50 mg) drip ใน 15 นาที</small>
            </label>
          </div>
        </fieldset>

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-calculate">
            ตรวจสอบและสร้างใบสั่งยา
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
                  <div style={{ fontSize: '13px', color: '#555' }}>ยาและสูตรการละลายลิ่มเลือดที่เลือก</div>
                  <div style={{ fontSize: '2.2em', fontWeight: 'bold', color: '#c0392b' }}>
                    {getRegimenDisplayName()}
                  </div>
                </div>
              </div>
            </div>
            {isBlocked && (
              <div className="note-pill warn" style={{
                background: '#f5cdcd',
                color: '#c0392b',
                padding: '8px 12px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                ⚠️ มีข้อห้ามใช้เด็ดขาด! ห้ามพิมพ์ใบสั่งยานี้
              </div>
            )}
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
              <strong>Massive Pulmonary Embolism (PE)</strong><br />
              HN: <span className="highlight" style={{ fontWeight: 'bold' }}>{hn || '--'}</span><br />
              BW: <strong className="highlight">{weight.toFixed(1)}</strong> kg<br />
              Indication: <strong>{riskType === 'high' ? 'High-risk PE' : 'Intermediate-to-high risk PE'}</strong>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>เกณฑ์ข้อห้ามใช้ยา (Contraindications):</strong><br />
              - Absolute Exclusion: <span style={{ color: hasAbsCI ? 'red' : 'inherit', fontWeight: hasAbsCI ? 'bold' : 'normal' }}>{hasAbsCI ? 'YES ⚠️ (ห้ามใช้)' : 'No'}</span><br />
              - Relative Exclusion: <span style={{ color: hasRelCI ? 'orange' : 'inherit', fontWeight: hasRelCI ? 'bold' : 'normal' }}>{hasRelCI ? 'Yes ⚠️' : 'No'}</span><br />
              - Prior SK history: <span style={{ color: priorSk ? 'red' : 'inherit', fontWeight: priorSk ? 'bold' : 'normal' }}>{priorSk ? 'Yes ⚠️ (ห้ามใช้ SK)' : 'No'}</span>
            </div>

            <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', marginBottom: '16px' }}>
              <strong>Fibrinolysis Orders:</strong>

              {regimen === 'sk_a' && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#fff5f5', borderRadius: '4px', border: '1px solid #c0392b' }}>
                  ☑ <strong>Streptokinase (SK) 1.5 MU</strong> dilute in NSS 100 mL IV drip in 120 min<br />
                  - 0.9% NSS 20 cc IV flush หลังยาหมด
                </div>
              )}
              {regimen === 'sk_b' && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#fff5f5', borderRadius: '4px', border: '1px solid #c0392b' }}>
                  ☑ <strong>Streptokinase (SK) Loading &amp; Infusion:</strong><br />
                  - <strong>Load:</strong> SK 250,000 U in NSS 100 mL IV drip in 30 min<br />
                  - <strong>Infusion:</strong> SK (25,000 U/mL) IV drip 4 mL/hr (100,000 U/hr) via syringe pump<br />
                  <span style={{ color: '#c0392b', fontWeight: 'bold' }}>* ยาหมดอายุ 8 ชม. หลังผสม</span>
                </div>
              )}
              {regimen === 'rtpa_a' && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#fff5f5', borderRadius: '4px', border: '1px solid #c0392b' }}>
                  ☑ <strong>rt-PA (Alteplase) 100 mg</strong> IV drip in 120 min
                </div>
              )}
              {regimen === 'rtpa_b' && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#fff5f5', borderRadius: '4px', border: '1px solid #c0392b' }}>
                  ☑ <strong>rt-PA (Alteplase) weight-based:</strong><br />
                  - dose 0.6 mg/kg = <strong className="highlight">{rtpaDoseVal.toFixed(1)}</strong> mg IV drip in 15 min (Max 50 mg)
                </div>
              )}
            </div>

            {regimen === 'rtpa_b' && (
              <div style={{ marginBottom: '16px' }}>
                <DoseResultCard
                  label="rt-PA Weight-Based Dose"
                  value={rtpaDoseVal.toFixed(1)}
                  unit="mg"
                  context="0.6 mg/kg × weight"
                  ceiling="Max: 50 mg"
                />
              </div>
            )}

            <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
              <strong>Monitoring:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>☐ Record vital signs q 15 min</li>
                <li>☐ Observe for systemic bleeding, GCS drop, allergic reaction</li>
              </ul>
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                padding: '8px',
                marginTop: '8px',
                fontSize: '13px'
              }}>
                ⚠️ Notify doctor immediately if:<br />
                - SBP &gt; 180 mmHg or DBP &gt; 105 mmHg<br />
                - SBP &lt; 90 mmHg or HR &lt; 50 bpm
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
              <strong>Continuation Plan:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>☐ Bed rest 24 hr</li>
                <li>☐ Consult hematologist/cardiology</li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-print"
              onClick={handlePrintOrder}
              disabled={isBlocked}
              style={{ opacity: isBlocked ? 0.5 : 1, cursor: isBlocked ? 'not-allowed' : 'pointer' }}
            >
              พิมพ์ Order (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
