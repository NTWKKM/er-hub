/**
 * lib/anticoag-engine.ts
 * Dosing and titration logic for anticoagulants (Heparin, Enoxaparin, Fondaparinux).
 * Ported from shared/anticoag-engine.js
 */

// ==================== Types ====================

export interface CalcAnticoagResult {
  egfr: number;
  rec: 'heparin' | 'fondaparinux' | 'enoxaparin';
  hepBolus?: number;
  hepInf?: number;
  hepRate?: string;
  enoxDose?: number;
  enoxRoute?: string;
  enoxNote?: string;
}

export interface HeparinProtocol {
  name: string;
  bolusPerKg: number;
  maxBolus: number;
  infPerKg: number;
  maxInf: number;
}

export interface HeparinProtocols {
  ami_fibrinolytic: HeparinProtocol;
  acs_valve: HeparinProtocol;
  pe_thrombus: HeparinProtocol;
  dvt_arterial: HeparinProtocol;
}

export interface CalcHeparinInitialDoseResult {
  protocolName: string;
  bolus: number;
  infusion: number;
  dripRate: number;
  maxDoseLimit: number;
}

export interface GetHeparinTitrationResult {
  action: string;
  bolusUnits: number;
  stopTimeMin: number;
  rateChangeUnits: number;
  rateChangeMlHr: number;
  nextRateUnitsHr: number;
  nextRateMlHr: number;
  recheckText: string;
  cappedText: string;
}

// ==================== Constants ====================

export const HEPARIN_STANDALONE_PROTOCOLS: HeparinProtocols = {
  ami_fibrinolytic: {
    name: 'Acute MI treated with fibrinolytic',
    bolusPerKg: 60,
    maxBolus: 4000,
    infPerKg: 12,
    maxInf: 1000,
  },
  acs_valve: {
    name: 'ACS / Unstable Angina / Mechanical Heart Valve',
    bolusPerKg: 70,
    maxBolus: 5000,
    infPerKg: 15,
    maxInf: 1200,
  },
  pe_thrombus: {
    name: 'Pulmonary Embolism (PE) / Intracardiac Thrombus / AF / Bridging',
    bolusPerKg: 80,
    maxBolus: 10000,
    infPerKg: 18,
    maxInf: 1800,
  },
  dvt_arterial: {
    name: 'Peripheral Arterial Occlusion / Deep Vein Thrombosis (DVT)',
    bolusPerKg: 80,
    maxBolus: 5000,
    infPerKg: 18,
    maxInf: 1000,
  },
};

// ==================== Functions ====================

/**
 * Calculates NSTEMI anticoagulant recommendation based on weight, age, and eGFR.
 *
 * @param weight - Patient's weight in kg
 * @param age - Patient's age in years
 * @param egfr - Patient's eGFR in mL/min
 * @returns Recommendation details
 */
export function calcAnticoag(weight: number, age: number, egfr: number): CalcAnticoagResult | null {
  // Fail-closed validation: reject invalid inputs before any dose math
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(age) || age < 0) return null;
  if (!Number.isFinite(egfr) || egfr < 0) return null;

  const r: CalcAnticoagResult = { egfr } as CalcAnticoagResult;

  if (egfr < 15) {
    r.rec = 'heparin';
    r.hepBolus = Math.min(Math.round(weight * 60), 4000);
    r.hepInf = Math.min(Math.round(weight * 12), 1000);
    r.hepRate = (r.hepInf / 100).toFixed(1); // Default standard conc: 100 u/mL
  } else if (egfr >= 20) {
    r.rec = 'fondaparinux';
  } else {
    r.rec = 'enoxaparin'; // GFR 15-19: fondaparinux CI
  }

  // Enoxaparin dose (computed regardless, for display)
  if (egfr >= 15) {
    if (egfr < 30) {
      r.enoxDose = Math.round(weight * 1.0);
      r.enoxRoute = 'SC q24h';
      r.enoxNote = '1 mg/kg — GFR 15–29, regardless of age';
    } else if (age >= 75) {
      r.enoxDose = Math.round(weight * 0.75);
      r.enoxRoute = 'SC q12h (no bolus)';
      r.enoxNote = '0.75 mg/kg — Age ≥75, GFR ≥30';
    } else {
      r.enoxDose = Math.round(weight * 1.0);
      r.enoxRoute = 'SC q12h';
      r.enoxNote = '1 mg/kg — Age <75, GFR ≥30';
    }
  }

  return r;
}

/**
 * Calculates initial Heparin bolus and infusion rates for the standalone protocol.
 *
 * @param protocolKey - Key matching HEPARIN_STANDALONE_PROTOCOLS
 * @param weight - Patient's weight in kg
 * @param concentration - Mixed concentration (units/mL, e.g., 50 or 100)
 * @returns Dosing output or null for invalid input
 */
export function calcHeparinInitialDose(
  protocolKey: string,
  weight: number,
  concentration: number
): CalcHeparinInitialDoseResult | null {
  const proto = (HEPARIN_STANDALONE_PROTOCOLS as unknown as Record<string, HeparinProtocol>)[protocolKey];
  if (!proto || !weight || weight <= 0 || !concentration || concentration <= 0) {
    return null;
  }

  const bolus = Math.min(Math.round(weight * proto.bolusPerKg), proto.maxBolus);
  const infusion = Math.min(Math.round(weight * proto.infPerKg), proto.maxInf);

  // drip rate (mL/hr) = infusion (units/hr) / concentration (units/mL)
  const dripRate = parseFloat((infusion / concentration).toFixed(1));

  return {
    protocolName: proto.name,
    bolus,
    infusion,
    dripRate,
    maxDoseLimit: 48000, // units/day ceiling
  };
}

/**
 * Evaluates the next titration step based on aPTT Ratio for Heparin standalone.
 *
 * @param apttRatio - Current measured aPTT Ratio
 * @param currentRateUnitsHr - Current infusion rate in units/hr
 * @param concentration - Mixed concentration (units/mL, e.g. 50 or 100)
 * @returns Titration instructions
 */
export function getHeparinTitration(
  apttRatio: number,
  currentRateUnitsHr: number,
  concentration: number
): GetHeparinTitrationResult {
  let action = '';
  let rateChangeUnits = 0;
  let recheckText = '';
  let stopTimeMin = 0;
  let bolusUnits = 0;

  if (apttRatio > 7.0) {
    stopTimeMin = 180;
    rateChangeUnits = -500;
    action = 'หยุดให้ยา 180 นาที';
    recheckText = 'เจาะซ้ำใน 3 ชม.';
  } else if (apttRatio >= 5.1) {
    stopTimeMin = 60;
    rateChangeUnits = -500;
    action = 'หยุดให้ยา 60 นาที';
    recheckText = 'เจาะซ้ำใน 6 ชม.';
  } else if (apttRatio >= 4.1) {
    stopTimeMin = 60;
    rateChangeUnits = -300;
    action = 'หยุดให้ยา 60 นาที';
    recheckText = 'เจาะซ้ำใน 6 ชม.';
  } else if (apttRatio >= 3.1) {
    stopTimeMin = 60;
    rateChangeUnits = -200;
    action = 'หยุดให้ยา 60 นาที';
    recheckText = 'เจาะซ้ำใน 6 ชม.';
  } else if (apttRatio >= 2.6) {
    stopTimeMin = 60;
    rateChangeUnits = -100;
    action = 'หยุดให้ยา 60 นาที';
    recheckText = 'เจาะซ้ำใน 6 ชม.';
  } else if (apttRatio >= 1.5) {
    // Therapeutic Range
    stopTimeMin = 0;
    rateChangeUnits = 0;
    action = 'ให้ยาอัตราเดิม (Therapeutic Range)';
    recheckText = 'เจาะซ้ำเช้าวันถัดไป';
  } else if (apttRatio >= 1.2) {
    stopTimeMin = 0;
    bolusUnits = 2500;
    rateChangeUnits = 150; // Plan specifies "+100 ถึง +200 units/hr", we choose +150 as default midpoint
    action = 'ฉีด Bolus ซ้ำ 2,500 units stat';
    recheckText = 'เจาะซ้ำใน 6 ชม.';
  } else {
    // < 1.2
    stopTimeMin = 0;
    bolusUnits = 5000;
    rateChangeUnits = 400;
    action = 'ฉีด Bolus ซ้ำ 5,000 units stat';
    recheckText = 'เจาะซ้ำใน 6 ชม.';
  }

  const nextRateUnitsHr = Math.max(0, currentRateUnitsHr + rateChangeUnits);
  // Cap at maximum 2,000 units/hr (48,000 units/day)
  const cappedRateUnitsHr = Math.min(2000, nextRateUnitsHr);
  const cappedText = nextRateUnitsHr > 2000 ? ' (Capped at 2,000 u/hr max limit)' : '';

  const nextRateMlHr = parseFloat((cappedRateUnitsHr / concentration).toFixed(1));
  const rateChangeMlHr = parseFloat((rateChangeUnits / concentration).toFixed(1));

  return {
    action,
    bolusUnits,
    stopTimeMin,
    rateChangeUnits,
    rateChangeMlHr,
    nextRateUnitsHr: cappedRateUnitsHr,
    nextRateMlHr,
    recheckText,
    cappedText,
  };
}
