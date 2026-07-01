import { describe, it, expect } from 'vitest';
import {
  calcAnticoag,
  calcHeparinInitialDose,
  getHeparinTitration,
  HEPARIN_STANDALONE_PROTOCOLS,
} from '../anticoag-engine';

describe('calcAnticoag', () => {
  it('should recommend heparin when eGFR < 15', () => {
    const result = calcAnticoag(70, 60, 14);
    expect(result.rec).toBe('heparin');
    expect(result.hepBolus).toBe(4000); // min(70*60=4200, 4000)
    expect(result.hepInf).toBe(840); // min(70*12=840, 1000)
  });

  it('should recommend fondaparinux when eGFR >= 20', () => {
    const result = calcAnticoag(70, 60, 20);
    expect(result.rec).toBe('fondaparinux');
  });

  it('should recommend enoxaparin when eGFR is 15-19', () => {
    const result = calcAnticoag(70, 60, 15);
    expect(result.rec).toBe('enoxaparin');
  });

  it('should calculate enoxaparin dose for age >= 75 with GFR >= 30', () => {
    const result = calcAnticoag(80, 80, 35);
    expect(result.enoxDose).toBe(60); // 80 * 0.75 = 60
    expect(result.enoxRoute).toBe('SC q12h (no bolus)');
    expect(result.enoxNote).toBe('0.75 mg/kg — Age ≥75, GFR ≥30');
  });

  it('should calculate enoxaparin dose for age < 75 with GFR >= 30', () => {
    const result = calcAnticoag(80, 60, 35);
    expect(result.enoxDose).toBe(80); // 80 * 1.0 = 80
    expect(result.enoxRoute).toBe('SC q12h');
    expect(result.enoxNote).toBe('1 mg/kg — Age <75, GFR ≥30');
  });

  it('should cap heparin bolus at 4000', () => {
    const result = calcAnticoag(100, 60, 10);
    expect(result.hepBolus).toBe(4000); // min(100*60=6000, 4000)
  });

  it('should cap heparin infusion at 1000', () => {
    const result = calcAnticoag(100, 60, 10);
    expect(result.hepInf).toBe(1000); // min(100*12=1200, 1000)
  });
});

describe('calcHeparinInitialDose', () => {
  it('should calculate ami_fibrinolytic protocol doses', () => {
    const result = calcHeparinInitialDose('ami_fibrinolytic', 70, 100);
    expect(result?.protocolName).toBe('Acute MI treated with fibrinolytic');
    expect(result?.bolus).toBe(4000); // min(70*60=4200, 4000)
    expect(result?.infusion).toBe(840); // min(70*12=840, 1000)
    expect(result?.dripRate).toBe(8.4); // 840/100
  });

  it('should calculate pe_thrombus protocol doses', () => {
    const result = calcHeparinInitialDose('pe_thrombus', 70, 100);
    expect(result?.protocolName).toBe('Pulmonary Embolism (PE) / Intracardiac Thrombus / AF / Bridging');
    expect(result?.bolus).toBe(5600); // min(70*80=5600, 10000)
    expect(result?.infusion).toBe(1260); // min(70*18=1260, 1800)
    expect(result?.dripRate).toBe(12.6); // 1260/100
  });

  it('should calculate acs_valve protocol doses', () => {
    const result = calcHeparinInitialDose('acs_valve', 70, 100);
    expect(result?.protocolName).toBe('ACS / Unstable Angina / Mechanical Heart Valve');
    expect(result?.bolus).toBe(4900); // min(70*70=4900, 5000)
    expect(result?.infusion).toBe(1050); // min(70*15=1050, 1200)
    expect(result?.dripRate).toBe(10.5); // 1050/100
  });

  it('should apply bolus ceiling cap', () => {
    const result = calcHeparinInitialDose('ami_fibrinolytic', 100, 100);
    expect(result?.bolus).toBe(4000); // min(100*60=6000, 4000)
  });

  it('should apply infusion ceiling cap', () => {
    const result = calcHeparinInitialDose('ami_fibrinolytic', 100, 100);
    expect(result?.infusion).toBe(1000); // min(100*12=1200, 1000)
  });

  it('should return null for invalid protocol key', () => {
    const result = calcHeparinInitialDose('invalid_key', 70, 100);
    expect(result).toBeNull();
  });

  it('should return null for invalid weight', () => {
    const result = calcHeparinInitialDose('ami_fibrinolytic', 0, 100);
    expect(result).toBeNull();
  });

  it('should return null for invalid concentration', () => {
    const result = calcHeparinInitialDose('ami_fibrinolytic', 70, 0);
    expect(result).toBeNull();
  });
});

describe('getHeparinTitration', () => {
  it('should return no change for therapeutic range (aPTT 1.5-2.5)', () => {
    const result = getHeparinTitration(2.0, 1000, 100);
    expect(result.action).toBe('ให้ยาอัตราเดิม (Therapeutic Range)');
    expect(result.rateChangeUnits).toBe(0);
    expect(result.stopTimeMin).toBe(0);
    expect(result.bolusUnits).toBe(0);
  });

  it('should stop and reduce rate for high aPTT (> 3.0)', () => {
    const result = getHeparinTitration(4.5, 1000, 100);
    expect(result.action).toBe('หยุดให้ยา 60 นาที');
    expect(result.rateChangeUnits).toBe(-300);
    expect(result.stopTimeMin).toBe(60);
  });

  it('should bolus and increase rate for low aPTT (< 1.2)', () => {
    const result = getHeparinTitration(1.0, 1000, 100);
    expect(result.action).toBe('ฉีด Bolus ซ้ำ 5,000 units stat');
    expect(result.bolusUnits).toBe(5000);
    expect(result.rateChangeUnits).toBe(400);
  });

  it('should cap rate at 2000 units/hr', () => {
    const result = getHeparinTitration(1.0, 1800, 100);
    // 1800 + 400 = 2200, but capped at 2000
    expect(result.nextRateUnitsHr).toBe(2000);
    expect(result.cappedText).toBe(' (Capped at 2,000 u/hr max limit)');
  });

  it('should not allow negative rate', () => {
    const result = getHeparinTitration(5.5, 400, 100);
    // 400 - 500 = -100, but max(0, -100) = 0
    expect(result.nextRateUnitsHr).toBe(0);
  });

  it('should calculate mL/hr conversion correctly', () => {
    const result = getHeparinTitration(2.0, 1000, 100);
    expect(result.nextRateMlHr).toBe(10.0); // 1000/100
  });

  it('should calculate mL/hr with concentration 50', () => {
    const result = getHeparinTitration(2.0, 1000, 50);
    expect(result.nextRateMlHr).toBe(20.0); // 1000/50
  });
});

describe('HEPARIN_STANDALONE_PROTOCOLS', () => {
  it('should have 4 protocols', () => {
    const keys = Object.keys(HEPARIN_STANDALONE_PROTOCOLS);
    expect(keys.length).toBe(4);
  });

  it('should have ami_fibrinolytic protocol with required fields', () => {
    const proto = HEPARIN_STANDALONE_PROTOCOLS['ami_fibrinolytic'];
    expect(proto.name).toBeDefined();
    expect(proto.bolusPerKg).toBeDefined();
    expect(proto.maxBolus).toBeDefined();
    expect(proto.infPerKg).toBeDefined();
    expect(proto.maxInf).toBeDefined();
  });

  it('should have acs_valve protocol with required fields', () => {
    const proto = HEPARIN_STANDALONE_PROTOCOLS['acs_valve'];
    expect(proto.name).toBeDefined();
    expect(proto.bolusPerKg).toBeDefined();
    expect(proto.maxBolus).toBeDefined();
    expect(proto.infPerKg).toBeDefined();
    expect(proto.maxInf).toBeDefined();
  });

  it('should have pe_thrombus protocol with required fields', () => {
    const proto = HEPARIN_STANDALONE_PROTOCOLS['pe_thrombus'];
    expect(proto.name).toBeDefined();
    expect(proto.bolusPerKg).toBeDefined();
    expect(proto.maxBolus).toBeDefined();
    expect(proto.infPerKg).toBeDefined();
    expect(proto.maxInf).toBeDefined();
  });

  it('should have dvt_arterial protocol with required fields', () => {
    const proto = HEPARIN_STANDALONE_PROTOCOLS['dvt_arterial'];
    expect(proto.name).toBeDefined();
    expect(proto.bolusPerKg).toBeDefined();
    expect(proto.maxBolus).toBeDefined();
    expect(proto.infPerKg).toBeDefined();
    expect(proto.maxInf).toBeDefined();
  });
});
