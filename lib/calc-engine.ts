/**
 * lib/calc-engine.ts
 * Core mathematical engine for clinical drug dose and infusion calculations.
 * Pure functional calculations for clinical safety and predictability.
 */

export interface DripRateParams {
  doseValue: number;
  doseUnit: string;
  weightKg: number;
  concentration: number;
  isWeightBased?: boolean;
  isPerMinute?: boolean;
}

export interface BolusVolumeParams {
  doseValue: number;
  perKg: boolean;
  weightKg: number;
  concentration: number;
}

/**
 * Calculates IV infusion drip rate in mL/hr.
 * 
 * Uses typed flags (isWeightBased, isPerMinute) when available, falls back to
 * doseUnit string parsing for backward compatibility.
 * 
 * @param params - Drip rate calculation parameters
 * @returns Calculated drip rate in mL/hr
 */
export function calcDripRate({ doseValue, doseUnit, weightKg, concentration, isWeightBased, isPerMinute }: DripRateParams): number {
  if (!doseValue || doseValue <= 0 || !concentration || concentration <= 0) return 0;
  
  // Use typed flags if provided, otherwise fall back to string parsing
  const perKg = isWeightBased ?? doseUnit.includes('/kg/');
  const perMin = isPerMinute ?? doseUnit.endsWith('/min');
  
  // 1. Calculate amount of drug required per hour
  const amountPerHour = doseValue * (perKg ? weightKg : 1) * (perMin ? 60 : 1);
  
  // 2. Convert to volume rate (mL/hr) = (drug amount per hour) / concentration
  return amountPerHour / concentration;
}

/**
 * Calculates the required volume (mL) for an IV bolus or loading dose.
 * 
 * @param params - Bolus volume calculation parameters
 * @returns Required bolus volume in mL
 */
export function calcBolusVolume({ doseValue, perKg = true, weightKg, concentration }: BolusVolumeParams): number {
  if (!doseValue || doseValue <= 0 || !concentration || concentration <= 0) return 0;
  
  const totalAmount = doseValue * (perKg ? weightKg : 1);
  return totalAmount / concentration;
}