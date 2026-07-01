'use client';

import { useState } from 'react';
import SliderInput from '@/components/SliderInput';
import DoseResultCard from '@/components/DoseResultCard';
import StickerBox from '@/components/StickerBox';
import { useFormValidation } from '@/lib/form-validate';

const HEMATO_SNAKES = [
  { value: 'green_pit_viper', label: 'งูเขียวหางไหม้', antivenom: 'Green pit viper antivenom 3 vials in NSS 100 mL IV drip in 30 min', screenLabel: 'เซรุ่มงูเขียวหางไหม้ 3 ขวด (drip 30 min)' },
  { value: 'malayan_pit_viper', label: 'งูกะปะ (MVP)', antivenom: 'Malayan pit viper antivenom 5 vials in NSS 100 mL IV drip in 30 min', screenLabel: 'เซรุ่มงูกะปะ 5 ขวด (drip 30 min)' },
  { value: 'russell_viper', label: 'งูแมวเซา (RV)', antivenom: 'Russell\u2019s viper antivenom 5 vials in NSS 100 mL IV drip in 30 min', screenLabel: 'เซรุ่มงูแมวเซา 5 ขวด (drip 30 min)' },
  { value: 'unknown_hemato', label: 'พิษระบบโลหิตไม่ทราบชนิด (Unknown)', antivenom: 'Hematotoxin antivenom (polyvalent) 5 vials in NSS 100 mL IV drip in 30 min', screenLabel: 'เซรุ่มรวมพิษต่อระบบโลหิต 5 ขวด (drip 30 min)' },
];

const NEURO_SNAKES = [
  { value: 'cobra', label: 'งูเห่า (Cobra)', antivenom: 'Cobra antivenom 10 vials in NSS 100 mL IV drip in 60 min', screenLabel: 'เซรุ่มงูเห่า 10 ขวด (drip 60 min)' },
  { value: 'king_cobra', label: 'งูจงอาง (King Cobra)', antivenom: 'King cobra antivenom 10 vials in NSS 100 mL IV drip in 60 min', screenLabel: 'เซรุ่มงูจงอาง 10 ขวด (drip 60 min)' },
  { value: 'malayan_krait', label: 'งูทับสมิงคลา (Malayan Krait)', antivenom: 'Malayan krait antivenom 5 vials in NSS 100 mL IV drip in 30 min', screenLabel: 'เซรุ่มงูทับสมิงคลา 5 ขวด (drip 30 min)' },
  { value: 'banded_krait', label: 'งูสามเหลี่ยม (Banded Krait)', antivenom: 'Neurotoxin antivenom (polyvalent) 10 vials in NSS 100 mL IV drip in 60 min', screenLabel: 'เซรุ่มรวมพิษระบบประสาท 10 ขวด (drip 60 min)' },
  { value: 'unknown_neuro', label: 'พิษระบบประสาทไม่ทราบชนิด (Unknown)', antivenom: 'Neurotoxin antivenom (polyvalent) 10 vials in NSS 100 mL IV drip in 60 min', screenLabel: 'เซรุ่มรวมพิษต่อระบบประสาท 10 ขวด (drip 60 min)' },
];

const TETANUS_OPTIONS = [
  { value: 'complete_5y', label: 'ครบ 3 เข็ม ภายใน 5 ปี', text: 'ครบ 3 เข็ม ภายใน 5 ปี (ไม่ต้องฉีดเพิ่ม)' },
  { value: 'complete_gt5y', label: 'ครบ 3 เข็ม มากกว่า 5 ปี', text: 'ครบ 3 เข็ม มากกว่า 5 ปี (พิจารณาฉีด Td กระตุ้น 1 เข็ม)' },
  { value: 'incomplete', label: 'ไม่ได้รับ/ไม่ครบ/ไม่ทราบประวัติ', text: 'ไม่ได้รับ/ไม่ทราบ/ไม่ครบ 3 เข็ม (พิจารณาให้ Tetanus vaccine + Tetagam)' },
];

const HEMATO_INDICATIONS = [
  'Systemic bleeding (มีเลือดออกผิดปกติ)',
  'INR > 1.2',
  'Platelet < 50,000 /mm³',
  '20min WBCT unclot (เลือดไม่แข็งตัว)',
  'Compartment syndrome',
];

const NEURO_INDICATIONS = [
  'Weakness (กล้ามเนื้ออ่อนแรง)',
  'Respiratory failure (เริ่มล้มเหลวในการหายใจ)',
  'Ptosis / Dysphagia / Dysphonia (หนังตาตก/กลืนลำบาก/พูดจาอ้อแอ้)',
  'ประวัติโดนงูทับสมิงคลา หรือ งูสามเหลี่ยมกัดจริง (ให้เซรุ่มทันทีไม่ต้องรอกล้ามเนื้ออ่อนแรง)',
];

// Named index for krait auto-indication — guards against array reordering
const KRAIT_INDICATION_INDEX = 3;

export default function AntivenomOrder() {
  const validation = useFormValidation();
  const [hn, setHn] = useState('');
  const [weight, setWeight] = useState(70);
  const [snakeType, setSnakeType] = useState<'hematotoxin' | 'neurotoxin'>('hematotoxin');
  const [hematoSnake, setHematoSnake] = useState('green_pit_viper');
  const [neuroSnake, setNeuroSnake] = useState('cobra');
  const [hematoIndications, setHematoIndications] = useState<boolean[]>([false, false, false, false, false]);
  const [neuroIndications, setNeuroIndications] = useState<boolean[]>([false, false, false, false]);
  const [horseAllergy, setHorseAllergy] = useState<'no' | 'yes'>('no');
  const [horseAllergyDetail, setHorseAllergyDetail] = useState('');
  const [penicillinAllergy, setPenicillinAllergy] = useState<'no' | 'yes'>('no');
  const [tetanus, setTetanus] = useState('complete_5y');
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [calculated, setCalculated] = useState(false);

  const handleNeuroSnakeChange = (value: string) => {
    setNeuroSnake(value);
    const newInd = [...neuroIndications];
    // Auto-check krait bite indication for krait species; explicitly uncheck for non-krait
    newInd[KRAIT_INDICATION_INDEX] = (value === 'malayan_krait' || value === 'banded_krait');
    setNeuroIndications(newInd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const indications = snakeType === 'hematotoxin' ? hematoIndications : neuroIndications;
    if (!indications.some(c => c)) {
      validation.warn('⚠️ กรุณาเลือกข้อบ่งใช้ (Indication) อย่างน้อย 1 ข้อ ก่อนคำนวณและสั่งใช้เซรุ่มต้านพิษงู');
      return;
    }
    validation.clearAll();
    setCalculated(true);
  };

  const handleClear = () => {
    setHn('');
    setWeight(70);
    setSnakeType('hematotoxin');
    setHematoSnake('green_pit_viper');
    setNeuroSnake('cobra');
    setHematoIndications([false, false, false, false, false]);
    setNeuroIndications([false, false, false, false]);
    setHorseAllergy('no');
    setHorseAllergyDetail('');
    setPenicillinAllergy('no');
    setTetanus('complete_5y');
    setUseCurrentTime(true);
    setCalculated(false);
    validation.clearAll();
  };

  const snakeList = snakeType === 'hematotoxin' ? HEMATO_SNAKES : NEURO_SNAKES;
  const selectedSnake = snakeList.find(s => s.value === (snakeType === 'hematotoxin' ? hematoSnake : neuroSnake)) || snakeList[0];
  const indications = snakeType === 'hematotoxin' ? HEMATO_INDICATIONS : NEURO_INDICATIONS;
  const indicationState = snakeType === 'hematotoxin' ? hematoIndications : neuroIndications;
  const setIndicationState = snakeType === 'hematotoxin' ? setHematoIndications : setNeuroIndications;
  const tetanusText = TETANUS_OPTIONS.find(t => t.value === tetanus)?.text || '';

  return (
    <div>
      <div className="card">
        <h3 className="card-header">Standing Order for Antivenom</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Emergency Department — Maharat Nakhon Ratchasima Hospital
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div className="input-group">
                <label htmlFor="antivenom-hn">HN</label>
                <input id="antivenom-hn" type="text" value={hn} onChange={(e) => setHn(e.target.value)} placeholder="กรอก HN" />
              </div>
              <SliderInput label="น้ำหนัก (kg)" min={30} max={200} step={0.1} value={weight} onChange={setWeight} unit="kg" />
            </div>
            <div>
              <div className="input-group">
                <label htmlFor="tetanus-select">ประวัติวัคซีนบาดทะยัก</label>
                <select id="tetanus-select" value={tetanus} onChange={(e) => setTetanus(e.target.value)}>
                  {TETANUS_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <fieldset className="input-group" style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{ fontSize: '14px', marginBottom: '4px' }}>ประวัติแพ้เซรุ่มจากม้า</legend>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ fontSize: '14px', cursor: 'pointer' }}>
                    <input type="radio" name="horse-allergy" value="no" checked={horseAllergy === 'no'} onChange={() => setHorseAllergy('no')} /> ไม่มีประวัติแพ้
                  </label>
                  <label style={{ fontSize: '14px', cursor: 'pointer' }}>
                    <input type="radio" name="horse-allergy" value="yes" checked={horseAllergy === 'yes'} onChange={() => setHorseAllergy('yes')} /> มีประวัติแพ้ ⚠️
                  </label>
                </div>
                {horseAllergy === 'yes' && (
                  <input id="horse-allergy-detail" type="text" value={horseAllergyDetail} onChange={(e) => setHorseAllergyDetail(e.target.value)} placeholder="ระบุอาการแพ้" style={{ marginTop: '8px' }} aria-label="ระบุอาการแพ้เซรุ่มจากม้า" />
                )}
              </fieldset>
              <fieldset className="input-group" style={{ border: 'none', padding: 0, margin: 0, marginTop: '8px' }}>
                <legend style={{ fontSize: '14px', marginBottom: '4px' }}>ประวัติแพ้ยา Penicillin</legend>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ fontSize: '14px', cursor: 'pointer' }}>
                    <input type="radio" name="penicillin-allergy" value="no" checked={penicillinAllergy === 'no'} onChange={() => setPenicillinAllergy('no')} /> ไม่มีประวัติแพ้
                  </label>
                  <label style={{ fontSize: '14px', cursor: 'pointer' }}>
                    <input type="radio" name="penicillin-allergy" value="yes" checked={penicillinAllergy === 'yes'} onChange={() => setPenicillinAllergy('yes')} /> มีประวัติแพ้ ⚠️
                  </label>
                </div>
              </fieldset>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>คัดกรองกลุ่มพิษงูและเกณฑ์การให้เซรุ่ม (Indications)</h4>
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px 0' }}>
              <legend className="sr-only">คลุมพิษงู</legend>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input type="radio" name="snake-type" value="hematotoxin" checked={snakeType === 'hematotoxin'} onChange={() => setSnakeType('hematotoxin')} /> 🩸 กลุ่มพิษต่อระบบโลหิต (Hematotoxin)
                </label>
                <label style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input type="radio" name="snake-type" value="neurotoxin" checked={snakeType === 'neurotoxin'} onChange={() => setSnakeType('neurotoxin')} /> ⚡ กลุ่มพิษต่อระบบประสาท (Neurotoxin)
                </label>
              </div>
            </fieldset>
            <div className="input-group">
              <label htmlFor="snake-select">เลือกชนิดงู</label>
              {snakeType === 'hematotoxin' ? (
                <select id="snake-select" value={hematoSnake} onChange={(e) => setHematoSnake(e.target.value)}>
                  {HEMATO_SNAKES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              ) : (
                <select id="snake-select" value={neuroSnake} onChange={(e) => handleNeuroSnakeChange(e.target.value)}>
                  {NEURO_SNAKES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              )}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '8px' }}>เกณฑ์ข้อบ่งใช้ (เลือกอย่างน้อย 1 ข้อ):</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {indications.map((ind, i) => (
                <label key={i} style={{ fontSize: '14px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={indicationState[i]} onChange={(e) => {
                    const next = [...indicationState];
                    next[i] = e.target.checked;
                    setIndicationState(next);
                  }} /> {ind}
                </label>
              ))}
            </div>
          </div>

          {validation.warning && (
            <div className="clinical-warning" style={{ marginTop: '16px' }}>{validation.warning}</div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button type="submit" className="theme-toggle" style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 20px' }}>
              ตรวจสอบและสร้างใบสั่งเซรุ่ม
            </button>
            <button type="button" className="theme-toggle" onClick={() => window.open('/er-hub/docs/Toxico/Standing order for Antivenom update.pdf', '_blank')}>
              ใบสั่งยาเปล่า (PDF)
            </button>
            <button type="button" className="theme-toggle" onClick={handleClear}>
              ล้างข้อมูล
            </button>
          </div>
        </form>
      </div>

      {calculated && (
        <div className="no-print">
          <DoseResultCard
            label="เซรุ่มต้านพิษงู / ขนาดยาแนะนำ"
            value={selectedSnake.screenLabel}
            unit=""
          />
          {horseAllergy === 'yes' && (
            <div className="clinical-warning">⚠️ คนไข้มีประวัติแพ้วัคซีน/เซรุ่มจากม้า!</div>
          )}
          <div className="card">
            <h3 className="card-header">ใบสั่งยา</h3>
            <div style={{ marginBottom: '16px' }}>
              <StickerBox hn={hn} />
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
              <strong>Venomous Snake Bite</strong><br />
              HN: {hn || '...'}<br />
              ประวัติวัคซีนบาดทะยัก: {tetanusText}<br />
              ประวัติแพ้เซรุ่มม้า: {horseAllergy === 'yes' ? `YES ⚠️ (มีประวัติแพ้: ${horseAllergyDetail || 'ไม่ได้ระบุ'})` : 'No'}<br />
              <strong>ผลการจำแนกงูและข้อบ่งชี้:</strong><br />
              งูที่ระบุ: <strong>{selectedSnake.label}</strong><br />
              ชนิดของพิษ: {snakeType === 'hematotoxin' ? 'พิษระบบโลหิต (Hematotoxin)' : 'พิษระบบประสาท (Neurotoxin)'}<br />
            </div>
            <div style={{ marginTop: '12px', fontSize: '14px' }}>
              <strong>Antivenom Administration:</strong><br />
              ☑ <strong>{selectedSnake.antivenom}</strong><br />
            </div>
            <div style={{ marginTop: '12px', fontSize: '13px' }}>
              <strong>Standard Antibiotic:</strong><br />
              {penicillinAllergy === 'no' ? (
                <>☑ <strong>Augmentin 1.2 g IV q 8 hr OR Augmentin (1g) 1x2 po pc</strong><br />
                ☐ Penicillin allergy alternative: Ciprofloxacin (500) 1x2 po pc + Clindamycin (300) 1x3 po pc</>
              ) : (
                <>☐ Augmentin 1.2 g IV q 8 hr — ไม่ได้เลือก (Penicillin allergy)<br />
                ☑ <strong>Penicillin allergy alternative: Ciprofloxacin (500) 1x2 po pc + Clindamycin (300) 1x3 po pc</strong></>
              )}
            </div>
          </div>
          <button className="theme-toggle" style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 20px' }} onClick={() => window.print()}>
            พิมพ์ใบสั่งยา
          </button>
        </div>
      )}
    </div>
  );
}