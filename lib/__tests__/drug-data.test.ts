import { describe, it, expect } from 'vitest'
import { EMERGENCY_DRUG_DATA } from '../drug-data'

describe('EMERGENCY_DRUG_DATA', () => {
  it('has exactly 12 drugs', () => {
    expect(EMERGENCY_DRUG_DATA).toHaveLength(12)
  })

  it('each drug has required properties with correct types', () => {
    for (const drug of EMERGENCY_DRUG_DATA) {
      expect(drug.id).toBeDefined()
      expect(typeof drug.id).toBe('string')
      expect(drug.name).toBeDefined()
      expect(typeof drug.name).toBe('string')
      expect(drug.thaiName).toBeDefined()
      expect(typeof drug.thaiName).toBe('string')
      expect(drug.doseUnit).toBeDefined()
      expect(typeof drug.doseUnit).toBe('string')
      expect(typeof drug.isWeightBased).toBe('boolean')
      expect(drug.preparations).toBeDefined()
      expect(Array.isArray(drug.preparations)).toBe(true)
      expect(drug.preparations.length).toBeGreaterThan(0)
      expect(drug.doseRange).toBeDefined()
      expect(typeof drug.doseRange.min).toBe('number')
      expect(typeof drug.doseRange.max).toBe('number')
      expect(typeof drug.doseRange.step).toBe('number')
      expect(typeof drug.doseRange.default).toBe('number')
      expect(drug.titrationGuide).toBeDefined()
      expect(typeof drug.titrationGuide).toBe('string')
      expect(drug.safetyWarnings).toBeDefined()
      expect(Array.isArray(drug.safetyWarnings)).toBe(true)
      expect(drug.safetyWarnings.length).toBeGreaterThan(0)
    }
  })

  it('doseRange invariants: default within min/max, step > 0', () => {
    for (const drug of EMERGENCY_DRUG_DATA) {
      const { min, max, step, default: defaultVal } = drug.doseRange
      expect(step).toBeGreaterThan(0)
      expect(defaultVal).toBeGreaterThanOrEqual(min)
      expect(defaultVal).toBeLessThanOrEqual(max)
      expect(min).toBeLessThan(max)
    }
  })

  it('each preparation has label and concentration', () => {
    for (const drug of EMERGENCY_DRUG_DATA) {
      for (const prep of drug.preparations) {
        expect(prep.label).toBeDefined()
        expect(typeof prep.label).toBe('string')
        expect(typeof prep.concentration).toBe('number')
      }
    }
  })

  it('defaultPreparationIndex is valid index into preparations array', () => {
    for (const drug of EMERGENCY_DRUG_DATA) {
      expect(drug.defaultPreparationIndex).toBeDefined()
      expect(typeof drug.defaultPreparationIndex).toBe('number')
      expect(drug.defaultPreparationIndex).toBeGreaterThanOrEqual(0)
      expect(drug.defaultPreparationIndex).toBeLessThan(drug.preparations.length)
    }
  })

  it('Epinephrine has correct concentration (100)', () => {
    const epinephrine = EMERGENCY_DRUG_DATA.find(d => d.id === 'epinephrine')
    expect(epinephrine).toBeDefined()
    expect(epinephrine!.preparations[0].concentration).toBe(100)
  })

  it('Heparin has two preparations (100 and 50 units/mL)', () => {
    const heparin = EMERGENCY_DRUG_DATA.find(d => d.id === 'heparin')
    expect(heparin).toBeDefined()
    expect(heparin!.preparations).toHaveLength(2)
    const concentrations = heparin!.preparations.map(p => p.concentration).sort((a, b) => b - a)
    expect(concentrations).toEqual([100, 50])
  })

  it('Esmolol has showDualUnits flag', () => {
    const esmolol = EMERGENCY_DRUG_DATA.find(d => d.id === 'esmolol')
    expect(esmolol).toBeDefined()
    expect(esmolol!.showDualUnits).toBe(true)
  })

  it('all weight-based drugs have /kg/ in doseUnit', () => {
    const weightBasedDrugs = EMERGENCY_DRUG_DATA.filter(d => d.isWeightBased)
    for (const drug of weightBasedDrugs) {
      expect(drug.doseUnit).toContain('/kg/')
    }
  })

  it('non-weight-based drugs do NOT have /kg/ in doseUnit', () => {
    const nonWeightBasedDrugs = EMERGENCY_DRUG_DATA.filter(d => !d.isWeightBased)
    for (const drug of nonWeightBasedDrugs) {
      expect(drug.doseUnit).not.toContain('/kg/')
    }
  })

  it('all IDs are unique', () => {
    const ids = EMERGENCY_DRUG_DATA.map(d => d.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})
