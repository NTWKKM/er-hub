import { describe, it, expect } from 'vitest';
import { calcDripRate, calcBolusVolume } from '../calc-engine';

describe('calcDripRate', () => {
  it('should calculate mcg/kg/min correctly', () => {
    // Example: 5 mcg/kg/min, 70 kg patient, concentration 400 mcg/mL
    // Amount per hour = 5 * 70 * 60 = 21000 mcg/hr
    // mL/hr = 21000 / 400 = 52.5
    const result = calcDripRate({
      doseValue: 5,
      doseUnit: 'mcg/kg/min',
      weightKg: 70,
      concentration: 400,
    });
    expect(result).toBe(52.5);
  });

  it('should calculate mcg/kg/hr correctly', () => {
    // Example: 300 mcg/kg/hr, 70 kg patient, concentration 400 mcg/mL
    // Amount per hour = 300 * 70 * 1 = 21000 mcg/hr
    // mL/hr = 21000 / 400 = 52.5
    const result = calcDripRate({
      doseValue: 300,
      doseUnit: 'mcg/kg/hr',
      weightKg: 70,
      concentration: 400,
    });
    expect(result).toBe(52.5);
  });

  it('should calculate mg/min (non-weight) correctly', () => {
    // Example: 10 mg/min, concentration 20 mg/mL
    // Amount per hour = 10 * 1 * 60 = 600 mg/hr
    // mL/hr = 600 / 20 = 30
    const result = calcDripRate({
      doseValue: 10,
      doseUnit: 'mg/min',
      weightKg: 70,
      concentration: 20,
    });
    expect(result).toBe(30);
  });

  it('should calculate mg/hr (non-weight) correctly', () => {
    // Example: 100 mg/hr, concentration 10 mg/mL
    // Amount per hour = 100 * 1 * 1 = 100 mg/hr
    // mL/hr = 100 / 10 = 10
    const result = calcDripRate({
      doseValue: 100,
      doseUnit: 'mg/hr',
      weightKg: 70,
      concentration: 10,
    });
    expect(result).toBe(10);
  });

  it('should return 0 for zero doseValue', () => {
    const result = calcDripRate({
      doseValue: 0,
      doseUnit: 'mcg/kg/min',
      weightKg: 70,
      concentration: 400,
    });
    expect(result).toBe(0);
  });

  it('should return 0 for negative doseValue', () => {
    const result = calcDripRate({
      doseValue: -5,
      doseUnit: 'mcg/kg/min',
      weightKg: 70,
      concentration: 400,
    });
    expect(result).toBe(0);
  });

  it('should return 0 for zero concentration', () => {
    const result = calcDripRate({
      doseValue: 5,
      doseUnit: 'mcg/kg/min',
      weightKg: 70,
      concentration: 0,
    });
    expect(result).toBe(0);
  });

  it('should return 0 for negative concentration', () => {
    const result = calcDripRate({
      doseValue: 5,
      doseUnit: 'mcg/kg/min',
      weightKg: 70,
      concentration: -10,
    });
    expect(result).toBe(0);
  });
});

describe('calcBolusVolume', () => {
  it('should calculate per-kg bolus correctly', () => {
    // Example: 0.5 mg/kg, 70 kg patient, concentration 10 mg/mL
    // Total amount = 0.5 * 70 = 35 mg
    // Volume = 35 / 10 = 3.5 mL
    const result = calcBolusVolume({
      doseValue: 0.5,
      perKg: true,
      weightKg: 70,
      concentration: 10,
    });
    expect(result).toBe(3.5);
  });

  it('should calculate fixed bolus (non-weight) correctly', () => {
    // Example: 6 mg fixed dose, concentration 3 mg/mL
    // Total amount = 6 * 1 = 6 mg
    // Volume = 6 / 3 = 2 mL
    const result = calcBolusVolume({
      doseValue: 6,
      perKg: false,
      weightKg: 70,
      concentration: 3,
    });
    expect(result).toBe(2);
  });

  it('should return 0 for zero doseValue', () => {
    const result = calcBolusVolume({
      doseValue: 0,
      perKg: true,
      weightKg: 70,
      concentration: 10,
    });
    expect(result).toBe(0);
  });

  it('should return 0 for negative doseValue', () => {
    const result = calcBolusVolume({
      doseValue: -5,
      perKg: true,
      weightKg: 70,
      concentration: 10,
    });
    expect(result).toBe(0);
  });

  it('should return 0 for zero concentration', () => {
    const result = calcBolusVolume({
      doseValue: 5,
      perKg: true,
      weightKg: 70,
      concentration: 0,
    });
    expect(result).toBe(0);
  });

  it('should return 0 for negative concentration', () => {
    const result = calcBolusVolume({
      doseValue: 5,
      perKg: true,
      weightKg: 70,
      concentration: -10,
    });
    expect(result).toBe(0);
  });
});
