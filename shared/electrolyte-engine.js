/**
 * shared/electrolyte-engine.js
 * Comprehensive Clinical Calculation & Diagnostic Decision Engine for Electrolyte & Acid-Base Disorders.
 * Grounded in 2026 International Consensus (KDIGO 2024, IFCC/IOF/EFLM 2026, ADA 2024/2025, BICAR-ICU, SSC, ESE/ERBP).
 * 
 * 100% pure JavaScript, zero DOM dependency, fully testable in Node.js / Browser.
 */

const ELECTROLYTE_ENGINE = {

    // ==========================================
    // 1. TOTAL BODY WATER (TBW) & CONSTANTS
    // ==========================================

    TBW_FRACTIONS: {
        infant: 0.60,
        young_male: 0.60,
        young_female: 0.50,
        elderly_male: 0.50,
        elderly_female: 0.45
    },

    IV_FLUIDS: {
        'nacl_3':   { name: '3% NaCl (Hypertonic)', na: 513, k: 0, osm: 1026 },
        'nacl_09':  { name: '0.9% NaCl (Normal Saline)', na: 154, k: 0, osm: 308 },
        'lr':       { name: 'Lactated Ringer\'s (Acetar/RL)', na: 130, k: 4, osm: 273 },
        'nacl_045': { name: '0.45% NaCl (Half-Normal Saline)', na: 77, k: 0, osm: 154 },
        'd5w':      { name: '5% Dextrose in Water (D5W)', na: 0, k: 0, osm: 252 },
        'd5_nss_2': { name: 'D5 0.45% NaCl', na: 77, k: 0, osm: 406 },
        'd5_nss':   { name: 'D5 0.9% NaCl', na: 154, k: 0, osm: 560 }
    },

    calcTBW: function(weightKg, sex, age, isChild = false) {
        if (!(weightKg > 0)) return null;
        if (isChild || (age > 0 && age < 15)) {
            return Math.round(weightKg * this.TBW_FRACTIONS.infant * 10) / 10;
        }
        const s = String(sex || '').toLowerCase().trim();
        const isElderly = age >= 65;
        let frac = 0.60;
        if (s === 'female') {
            frac = isElderly ? this.TBW_FRACTIONS.elderly_female : this.TBW_FRACTIONS.young_female;
        } else {
            frac = isElderly ? this.TBW_FRACTIONS.elderly_male : this.TBW_FRACTIONS.young_male;
        }
        return Math.round(weightKg * frac * 10) / 10;
    },

    // ==========================================
    // 2. SODIUM (Na+) CALCULATIONS
    // ==========================================

    calcCorrectedSodium: function(measuredNa, glucoseMgDl, method = 'hillier') {
        if (!(measuredNa > 0) || !(glucoseMgDl >= 0)) return null;
        if (glucoseMgDl <= 100) return measuredNa;
        const deltaGlu = (glucoseMgDl - 100) / 100;
        let factor = 1.6;
        if (method === 'hillier') {
            factor = glucoseMgDl > 400 ? 2.4 : 2.0;
        } else if (method === 'katz') {
            factor = 1.6;
        }
        const corrected = measuredNa + (factor * deltaGlu);
        return Math.round(corrected * 10) / 10;
    },

    calcAdrogueMadias: function(serumNa, fluidKey, tbwLiters, additiveKmEqPerL = 0) {
        if (!(serumNa > 0) || !(tbwLiters > 0)) return null;
        const fluid = this.IV_FLUIDS[fluidKey];
        if (!fluid) return null;
        const infNa = fluid.na;
        const infK = fluid.k + (Number(additiveKmEqPerL) || 0);
        const deltaNaPerLiter = (infNa + infK - serumNa) / (tbwLiters + 1);
        return Math.round(deltaNaPerLiter * 100) / 100;
    },

    calcHyponatremiaInfusionRate: function(targetDelta24h, deltaNaPerLiter) {
        if (!targetDelta24h || !deltaNaPerLiter || deltaNaPerLiter === 0) return null;
        const totalLitersRequired = targetDelta24h / deltaNaPerLiter;
        const totalMl24h = totalLitersRequired * 1000;
        const mlPerHour = totalMl24h / 24;
        return {
            totalLitersRequired: Math.round(totalLitersRequired * 100) / 100,
            totalMl24h: Math.round(totalMl24h),
            mlPerHour: Math.round(mlPerHour * 10) / 10
        };
    },

    calcHyponatremiaBolus: function(weightKg, isPediatric = false) {
        if (!(weightKg > 0)) return null;
        if (isPediatric) {
            const vol = Math.min(weightKg * 2, 150);
            return {
                bolusMl: Math.round(vol),
                desc: '3% NaCl 2 mL/kg (max 150 mL) IV over 10-20 minutes',
                repeatMax: 'Repeat up to 2 times (total 3 boluses) if severe symptoms persist'
            };
        }
        return {
            bolusMl: 100,
            bolusRange: '100 - 150 mL',
            desc: '3% NaCl 100-150 mL IV over 10-20 minutes',
            targetRise: '+4 to +6 mEq/L acutely to reverse brain herniation / stop seizures',
            repeatMax: 'Repeat every 20 min if symptoms persist (maximum 3 boluses or +6 mEq/L rise)'
        };
    },

    calcFreeWaterDeficit: function(serumNa, tbwLiters, targetNa = 140) {
        if (!(serumNa > 140) || !(tbwLiters > 0)) return null;
        const fwdLiters = tbwLiters * ((serumNa / targetNa) - 1);
        const safeDelta24h = Math.min(serumNa - targetNa, 10);
        const fractionToReplace24h = safeDelta24h / (serumNa - targetNa);
        const water24hLiters = fwdLiters * fractionToReplace24h;
        const d5wHourlyRate = Math.round((water24hLiters * 1000 / 24) * 10) / 10;
        return {
            totalFwdLiters: Math.round(fwdLiters * 100) / 100,
            water24hLiters: Math.round(water24hLiters * 100) / 100,
            d5wHourlyRateMlHr: d5wHourlyRate,
            maxSafeDrop24h: safeDelta24h
        };
    },

    // ==========================================
    // 3. POTASSIUM (K+) CALCULATIONS & SAFETY
    // ==========================================

    calcPotassiumDeficit: function(serumK) {
        if (!(serumK > 0)) return null;
        if (serumK >= 4.0) return { deficitMeq: 0, severity: 'Normal', note: 'No potassium deficit' };
        if (serumK >= 3.5) {
            const drop = (4.0 - serumK) * 10;
            const def = drop * 20; // ~20 mEq per 0.1
            return { deficitMeq: Math.round(def), severity: 'Mild (3.5-3.9)', oralPreferred: true };
        }
        if (serumK >= 3.0) {
            const drop = (4.0 - serumK) * 10;
            const def = 100 + (drop * 20); // ~100-200 mEq
            return { deficitMeq: Math.round(def), severity: 'Moderate (3.0-3.4)', oralPreferred: true };
        }
        if (serumK >= 2.5) {
            return { deficitMeq: 300, severity: 'Severe (2.5-2.9)', oralPreferred: false, ivRequired: true };
        }
        return { deficitMeq: 500, severity: 'Life-Threatening (<2.5)', oralPreferred: false, ivRequired: true, maxDeficit: 800 };
    },

    calcSpotUKCr: function(urineK, urineCr, unit = 'mmol_mmol') {
        if (!(urineK > 0) || !(urineCr > 0)) return null;
        if (unit === 'mmol_mmol') {
            const ratio = urineK / urineCr;
            return {
                ratio: Math.round(ratio * 100) / 100,
                unit: 'mmol/mmol Cr',
                interpretationHypo: ratio < 1.5 ? 'Appropriate renal conservation (Extrarenal loss / Shift)' : 'Inappropriate renal K+ wasting',
                interpretationHyper: ratio > 20 ? 'Appropriate renal K+ excretion' : 'Impaired renal excretion (Hypoaldosteronism / Type 4 RTA)'
            };
        }
        // mEq/g Cr (U_K in mEq/L, U_Cr in mg/dL -> U_Cr in g/L is U_Cr / 100)
        const ratio = (urineK / (urineCr / 100));
        return {
            ratio: Math.round(ratio * 10) / 10,
            unit: 'mEq/g Cr',
            interpretationHypo: ratio < 15 ? 'Appropriate renal conservation (Extrarenal loss / Shift)' : 'Inappropriate renal K+ wasting',
            interpretationHyper: ratio > 200 ? 'Appropriate renal K+ excretion' : 'Impaired renal excretion (Hypoaldosteronism / Type 4 RTA)'
        };
    },

    evaluatePotassiumSafety: function(rateMeqHr, concentrationMeqL, isCentralLine = false) {
        const warnings = [];
        let isBlocked = false;

        if (isCentralLine) {
            if (rateMeqHr > 40) {
                warnings.push('CRITICAL: Infusion rate exceeds maximum central line safety ceiling (40 mEq/hr). Risk of fatal cardiac arrest.');
                isBlocked = true;
            } else if (rateMeqHr > 20) {
                warnings.push('CAUTION: High central line infusion rate (20-40 mEq/hr). Continuous ECG/Telemetry monitoring mandatory.');
            }
            if (concentrationMeqL > 100) {
                warnings.push('WARNING: Concentration exceeds maximum central line recommended limit (100 mEq/L).');
            }
        } else {
            // Peripheral line
            if (rateMeqHr > 20) {
                warnings.push('CRITICAL: Peripheral infusion rate must NOT exceed 10-20 mEq/hr. Switch to central line or reduce rate.');
                isBlocked = true;
            }
            if (concentrationMeqL > 40) {
                warnings.push('CRITICAL: Peripheral IV concentration must NOT exceed 40 mEq/L due to severe pain, phlebitis, and tissue necrosis.');
                isBlocked = true;
            }
        }

        return {
            isSafe: warnings.length === 0,
            isBlocked: isBlocked,
            warnings: warnings
        };
    },

    // ==========================================
    // 4. METABOLIC ACIDOSIS & BICARBONATE
    // ==========================================

    calcBicarbonateDeficit: function(weightKg, measuredHco3, targetHco3 = 14, isSevereAcidemia = false) {
        if (!(weightKg > 0) || !(measuredHco3 >= 0) || !(targetHco3 > measuredHco3)) return null;
        const fvd = isSevereAcidemia ? 0.80 : 0.50;
        const deficitMeq = fvd * weightKg * (targetHco3 - measuredHco3);
        const halfDeficitMeq = deficitMeq / 2;

        const ampulesTotal = Math.ceil(deficitMeq / 50); // each 50 mL ampule = 50 mEq

        return {
            deficitMeq: Math.round(deficitMeq),
            halfDeficitMeq: Math.round(halfDeficitMeq),
            fvdUsed: fvd,
            targetHco3: targetHco3,
            ampules84Total: ampulesTotal,
            isotonicRecipe: {
                formula: '3 ampules (150 mEq) 8.4% NaHCO3 in 1000 mL D5W (yields ~150 mEq/L, ~300 mOsm/L)',
                initialRateMlHr: '100 - 250 mL/hr (titrated to replace 50% deficit in first 4-8 hours)'
            }
        };
    },

    evaluateBicarbonateIndication: function({ etiology, ph, hco3, akinStage = 0, pco2 = 40 }) {
        const result = {
            recommended: false,
            contraindicated: false,
            urgency: 'routine',
            summary: '',
            cautions: []
        };

        if (pco2 > 45) {
            result.cautions.push('RESPIRATORY CAUTION: Elevated pCO2 indicates hypoventilation. Giving NaHCO3 without mechanical ventilation worsens intracellular/CNS acidosis via CO2 generation.');
        }

        switch (etiology) {
            case 'lactic_sepsis':
                if (ph > 7.15) {
                    result.recommended = false;
                    result.summary = 'Surviving Sepsis Campaign (SSC): Routine NaHCO3 NOT recommended for hypoperfusion lactic acidosis with pH > 7.15.';
                } else {
                    if (akinStage >= 2) {
                        result.recommended = true;
                        result.summary = 'BICAR-ICU Evidence: NaHCO3 infusion significantly reduced 28-day mortality and RRT requirement in patients with severe acidemia (pH ≤ 7.20) and AKI (AKIN Stage 2-3).';
                    } else {
                        result.recommended = false;
                        result.summary = 'BICAR-ICU Evidence: No overall mortality benefit in severe acidemia without AKI. Focus on source control, fluids, and vasopressors.';
                    }
                }
                break;
            case 'dka':
                if (ph >= 6.90) {
                    result.recommended = false;
                    result.contraindicated = true;
                    result.summary = 'ADA 2024/2025 Guidelines: NaHCO3 is CONTRAINDICATED if pH ≥ 6.90. Standard fluid + insulin restores bicarbonate without paradoxical acidosis.';
                } else {
                    result.recommended = true;
                    result.urgency = 'high';
                    result.summary = 'Severe DKA (pH < 6.90): Administer 100 mmol NaHCO3 in 400 mL sterile water + 20 mEq KCl over 2 hours until pH ≥ 7.00.';
                }
                break;
            case 'nagma_diarrhea_rta':
                result.recommended = true;
                result.summary = 'Direct bicarbonate loss (GI or renal tubular): Primary indication for oral/IV bicarbonate replacement to maintain HCO3- 20-24 mEq/L.';
                break;
            case 'toxicology_tca':
                result.recommended = true;
                result.urgency = 'emergency';
                result.summary = 'Sodium Channel Blocker / TCA Toxicity: 1-2 mEq/kg IV bolus. Target serum pH 7.50-7.55 to narrow QRS and prevent arrhythmias.';
                break;
            case 'toxicology_salicylate':
                result.recommended = true;
                result.urgency = 'emergency';
                result.summary = 'Salicylate Toxicity: Urinary alkalinization (target urine pH 7.5-8.0, blood pH 7.45-7.55) to enhance salicylate elimination.';
                break;
            case 'toxicology_toxic_alcohol':
                result.recommended = true;
                result.summary = 'Methanol / Ethylene Glycol: Maintain blood pH > 7.30 to reduce tissue penetration of toxic acid metabolites (formate/glycolate).';
                break;
            default:
                result.summary = 'Individualized assessment required. Avoid rapid overcorrection and maintain target pH 7.20-7.25 initially.';
        }

        return result;
    },

    // ==========================================
    // 5. CALCIUM, MAGNESIUM & PHOSPHATE
    // ==========================================

    evaluateCalcium: function(ionizedCaMmol, totalCaMgDl, albuminGDl) {
        const result = {
            primaryType: ionizedCaMmol > 0 ? 'ionized' : (totalCaMgDl > 0 ? 'total' : 'none'),
            status: 'normal',
            ionizedCa: ionizedCaMmol,
            totalCa: totalCaMgDl,
            albumin: albuminGDl,
            payneCorrectedCa: null,
            evidenceAlert: null
        };

        if (ionizedCaMmol > 0) {
            if (ionizedCaMmol < 1.15) {
                result.status = ionizedCaMmol < 0.90 ? 'severe_hypocalcemia' : 'hypocalcemia';
            } else if (ionizedCaMmol > 1.33) {
                result.status = ionizedCaMmol > 1.70 ? 'hypercalcemic_crisis' : 'hypercalcemia';
            }
            return result;
        }

        if (totalCaMgDl > 0) {
            if (albuminGDl > 0) {
                result.payneCorrectedCa = Math.round((totalCaMgDl + (0.8 * (4.0 - albuminGDl))) * 10) / 10;
            }
            result.evidenceAlert = 'CLINICAL ALERT (IFCC/IOF/EFLM 2026 & KDIGO): Albumin-corrected calcium equations (Payne formula) have a 20-40% misclassification rate and systematically overestimate calcium in hypoalbuminemia. Direct Ionized Calcium (iCa²⁺ via blood gas) is strongly recommended for clinical decision-making.';
            
            if (totalCaMgDl < 8.5) {
                result.status = totalCaMgDl < 7.0 ? 'severe_hypocalcemia' : 'hypocalcemia';
            } else if (totalCaMgDl > 10.5) {
                result.status = totalCaMgDl > 14.0 ? 'hypercalcemic_crisis' : 'hypercalcemia';
            }
        }

        return result;
    },

    calcHypercalcemiaHydration: function(weightKg) {
        if (!(weightKg > 0)) return null;
        return {
            salineRateMlHr: '200 - 500 mL/hr of 0.9% NaCl',
            targetUrineOutput: '100 - 150 mL/hr',
            calcitoninDose: '4 - 8 IU/kg SC/IM q12h (rapid onset in 4-6h, tachyphylaxis at 48h)',
            bisphosphonates: 'Zoledronic acid 4 mg IV over 15 min (or Pamidronate 60-90 mg IV over 2-4h; caution if eGFR < 30)',
            denosumab: 'Denosumab 120 mg SC (for bisphosphonate-refractory or severe renal failure)'
        };
    },

    calcMgRepletion: function(serumMgMgDl, hasArrhythmiaOrArrest = false, egfr = 90) {
        if (!(serumMgMgDl >= 0)) return null;
        const isRenalImpaired = egfr < 30;

        if (hasArrhythmiaOrArrest || serumMgMgDl < 1.0) {
            return {
                emergencyPush: hasArrhythmiaOrArrest ? 'MgSO4 1-2 g IV push diluted in 10 mL D5W over 1-2 min' : 'MgSO4 2 g IV in 100 mL D5W over 15-60 min',
                maintenanceInfusion: isRenalImpaired ? 'MgSO4 0.5 g/hr (reduced by 50% for eGFR < 30)' : 'MgSO4 1.0 g/hr (max 1g/hr to prevent >50% urinary excretion)',
                monitoring: 'Check deep tendon reflexes, respiratory rate, and serum Mg every 4-6 hours.'
            };
        }

        if (serumMgMgDl < 1.7) {
            return {
                oralRegimen: 'Magnesium Oxide 400 mg PO BID-TID (or Magnesium Gluconate)',
                ivOption: isRenalImpaired ? 'MgSO4 1-2 g IV in 100 mL D5W over 2-4 hours' : 'MgSO4 2-4 g IV in 250 mL D5W over 4 hours (rate ≤ 1 g/hr)'
            };
        }

        return { note: 'Serum Magnesium within normal range (1.7 - 2.2 mg/dL)' };
    },

    calcPhosphateRepletion: function(serumPo4MgDl, serumCaMgDl, weightKg) {
        if (!(serumPo4MgDl >= 0) || !(weightKg > 0)) return null;
        const caPo4Product = (serumCaMgDl > 0 && serumPo4MgDl > 0) ? Math.round(serumCaMgDl * serumPo4MgDl * 10) / 10 : null;
        const isHighProduct = caPo4Product !== null && caPo4Product >= 55;

        if (serumPo4MgDl >= 2.5) {
            return { severity: 'Normal', note: 'Phosphate within normal range (2.5 - 4.5 mg/dL)' };
        }

        const isSevere = serumPo4MgDl < 1.0;
        const doseMmolKg = isSevere ? 0.25 : 0.16;
        const totalMmol = Math.min(Math.round(weightKg * doseMmolKg), 50);

        return {
            severity: isSevere ? 'Severe (<1.0 mg/dL)' : 'Moderate (1.0 - 2.4 mg/dL)',
            caPo4Product: caPo4Product,
            isPrecipitationRisk: isHighProduct,
            recommendedDoseMmol: totalMmol,
            infusionDuration: isSevere ? 'Infuse over 6 - 12 hours' : 'Infuse over 4 - 6 hours (Max rate ≤ 10 mmol/hr)',
            formulationWarning: 'Sodium Phosphate provides ~1.33 mEq Na/mmol PO4; Potassium Phosphate provides ~1.5 mEq K/mmol PO4. Monitor K+ and Ca2+.',
            safetyGate: isHighProduct ? 'CRITICAL WARNING: Ca × PO4 product ≥ 55 mg²/dL². High risk of metastatic tissue calcification and acute renal failure. Correct severe hypocalcemia first or administer with extreme caution.' : 'Safe Ca × PO4 product (< 55 mg²/dL²).'
        };
    },

    // ==========================================
    // 6. ACID-BASE & RENAL GAPS
    // ==========================================

    calcAnionGap: function(na, cl, hco3, albumin = 4.0) {
        if (!(na > 0) || !(cl > 0) || !(hco3 > 0)) return null;
        const rawAg = na - (cl + hco3);
        const alb = (albumin > 0) ? albumin : 4.0;
        // Figge formula: 2.5 * (4.0 - alb)
        const correctedAg = rawAg + (2.5 * (4.0 - alb));
        
        // Modern ISE reference: 4 to 10 mEq/L
        let interp = 'Normal Anion Gap (Modern ISE baseline 4-10 mEq/L)';
        if (correctedAg > 10) {
            interp = 'High Anion Gap Metabolic Acidosis (HAGMA)';
        } else if (correctedAg < 4) {
            interp = 'Low Anion Gap (Consider severe hypoalbuminemia, multiple myeloma, lithium, hypercalcemia/hypermagnesemia)';
        }

        return {
            rawAg: Math.round(rawAg * 10) / 10,
            correctedAg: Math.round(correctedAg * 10) / 10,
            albuminUsed: alb,
            interpretation: interp
        };
    },

    calcDeltaDelta: function(correctedAg, hco3) {
        if (!(correctedAg > 0) || !(hco3 > 0)) return null;
        const deltaAg = correctedAg - 10; // baseline modern AG = 10
        const deltaHco3 = 24 - hco3;     // baseline HCO3 = 24

        if (deltaHco3 <= 0) {
            return {
                deltaRatio: null,
                interpretation: 'Elevated HCO3⁻ (Metabolic Alkalosis present)'
            };
        }

        const ratio = deltaAg / deltaHco3;
        const roundedRatio = Math.round(ratio * 100) / 100;
        let interp = '';

        if (ratio < 0.8) {
            interp = 'Mixed HAGMA + NAGMA (or Delta Ratio < 0.8, significant non-gap acidosis)';
        } else if (ratio <= 2.0) {
            interp = 'Pure High Anion Gap Metabolic Acidosis (HAGMA)';
        } else {
            interp = 'Mixed HAGMA + Concurrent Metabolic Alkalosis (or Pre-existing high HCO3⁻)';
        }

        return {
            deltaAg: Math.round(deltaAg * 10) / 10,
            deltaHco3: Math.round(deltaHco3 * 10) / 10,
            deltaRatio: roundedRatio,
            interpretation: interp
        };
    },

    calcOsmolarGap: function(measuredOsm, na, glucoseMgDl, bunMgDl, ethanolMgDl = 0) {
        if (!(measuredOsm > 0) || !(na > 0) || !(glucoseMgDl >= 0) || !(bunMgDl >= 0)) return null;
        let calcOsm = (2 * na) + (glucoseMgDl / 18) + (bunMgDl / 2.8);
        if (ethanolMgDl > 0) {
            calcOsm += (ethanolMgDl / 4.6);
        }
        const gap = measuredOsm - calcOsm;
        const roundedGap = Math.round(gap * 10) / 10;
        return {
            calculatedOsm: Math.round(calcOsm * 10) / 10,
            measuredOsm: measuredOsm,
            osmolarGap: roundedGap,
            isElevated: roundedGap > 10,
            interpretation: roundedGap > 10 ? 'Elevated Osmolar Gap (>10 mOsm/kg): Strong suspicion of unmeasured toxic osmole (Methanol, Ethylene Glycol, Isopropanol, Propylene Glycol)' : 'Normal Osmolar Gap (≤10 mOsm/kg)'
        };
    },

    calcUrineGaps: function(uNa, uK, uCl, measuredUOsm = 0, uUreaMgDl = 0, uGlucoseMgDl = 0) {
        if (!(uNa >= 0) || !(uK >= 0) || !(uCl >= 0)) return null;
        const uag = uNa + uK - uCl;
        let uog = null;
        if (measuredUOsm > 0) {
            const calcUOsm = (2 * (uNa + uK)) + (uUreaMgDl / 2.8) + (uGlucoseMgDl / 18);
            uog = Math.round((measuredUOsm - calcUOsm) * 10) / 10;
        }

        return {
            urineAnionGap: Math.round(uag * 10) / 10,
            urineOsmolalGap: uog,
            uagInterpretation: uag < 0 ? 'Negative UAG (-20 to -50): High renal NH4+ excretion (GI loss / Diarrhea)' : 'Positive UAG (+10 to +40): Impaired renal NH4+ excretion (Distal RTA Type 1)',
            uogInterpretation: uog !== null ? (uog > 400 ? 'UOG > 400 mOsm/kg: Intact renal NH4+ response (GI bicarbonate loss)' : (uog < 150 ? 'UOG < 150 mOsm/kg: Impaired renal NH4+ excretion (RTA)' : 'Indeterminate UOG (150-400 mOsm/kg)')) : null
        };
    },

    calcFractionalExcretions: function({ uNa, sNa, uK, sK, uUrea, sUrea, uUrate, sUrate, uCr, sCr, uCa, sCa }) {
        const result = {};

        // FE_Na = (U_Na * S_Cr) / (S_Na * U_Cr) * 100
        if (uNa > 0 && sNa > 0 && uCr > 0 && sCr > 0) {
            const fena = (uNa * sCr) / (sNa * uCr) * 100;
            result.feNa = Math.round(fena * 100) / 100;
            result.feNaInterp = fena < 1.0 ? 'FE_Na < 1.0%: Prerenal Azotemia' : (fena > 2.0 ? 'FE_Na > 2.0%: Intrinsic Acute Tubular Necrosis (ATN)' : 'FE_Na 1.0-2.0%: Indeterminate / Prerenal with Diuretics');
        }

        // FE_Urea = (U_Urea * S_Cr) / (S_Urea * U_Cr) * 100
        if (uUrea > 0 && sUrea > 0 && uCr > 0 && sCr > 0) {
            const feurea = (uUrea * sCr) / (sUrea * uCr) * 100;
            result.feUrea = Math.round(feurea * 100) / 100;
            result.feUreaInterp = feurea < 35.0 ? 'FE_Urea < 35%: Prerenal Azotemia (Accurate even with Diuretics)' : 'FE_Urea > 50%: Intrinsic / ATN';
        }

        // FE_Urate = (U_Urate * S_Cr) / (S_Urate * U_Cr) * 100
        if (uUrate > 0 && sUrate > 0 && uCr > 0 && sCr > 0) {
            const feurate = (uUrate * sCr) / (sUrate * uCr) * 100;
            result.feUrate = Math.round(feurate * 100) / 100;
            result.feUrateInterp = feurate > 11.0 ? 'FE_Urate > 11%: Elevated (Consistent with SIADH or CSW during hyponatremia. If normalizes ≤11% post-Na correction -> SIADH; if remains >11% -> CSW/RSW)' : 'FE_Urate ≤ 11%: Normal proximal urate reabsorption';
        }

        // CCCR (Calcium-to-Creatinine Clearance Ratio) = (U_Ca * S_Cr) / (S_Ca * U_Cr)
        if (uCa > 0 && sCa > 0 && uCr > 0 && sCr > 0) {
            const cccr = (uCa * sCr) / (sCa * uCr);
            result.cccr = Math.round(cccr * 1000) / 1000;
            result.cccrInterp = cccr < 0.01 ? 'CCCR < 0.01: Familial Hypocalciuric Hypercalcemia (FHH) - Avoid Parathyroidectomy' : (cccr > 0.02 ? 'CCCR > 0.02: Primary Hyperparathyroidism (PHPT)' : 'CCCR 0.01-0.02: Equivocal / Gray zone');
        }

        return result;
    },

    // ==========================================
    // 7. DIAGNOSTIC DECISION TREE ENGINE
    // ==========================================

    evaluateHyponatremiaWorkup: function({ serumOsm, uOsm, volumeStatus, uNa, feUratePostNorm }) {
        if (serumOsm > 295) {
            return {
                category: 'Hypertonic Hyponatremia',
                primaryCauses: ['Hyperglycemia (DKA/HHS)', 'Mannitol', 'Hypertonic radiocontrast'],
                nextAction: 'Calculate Hyperglycemia-Corrected Sodium (Katz/Hillier)'
            };
        }
        if (serumOsm >= 275 && serumOsm <= 295) {
            return {
                category: 'Isotonic / Pseudohyponatremia',
                primaryCauses: ['Severe Hypertriglyceridemia', 'Severe Paraproteinemia (Multiple Myeloma)', 'Post-TURP absorption'],
                nextAction: 'Measure direct ISE ionized sodium via blood gas (ABG/VBG) to confirm true aqueous sodium.'
            };
        }

        if (uOsm < 100) {
            return {
                category: 'Hypotonic Hyponatremia with maximally dilute urine (UOsm < 100 mOsm/kg)',
                primaryCauses: ['Primary / Psychogenic Polydipsia', 'Beer Potomania', 'Low Solute Diet (Tea and Toast Diet)'],
                nextAction: 'Water restriction and solute intake restoration.'
            };
        }

        const vol = String(volumeStatus || '').toLowerCase();
        if (vol === 'hypovolemic') {
            if (uNa < 20) {
                return {
                    category: 'Hypovolemic Hypotonic Hyponatremia (Extrarenal Loss)',
                    primaryCauses: ['Gastrointestinal losses (Vomiting, Diarrhea)', 'Third spacing (Pancreatitis, Burns, Trauma)', 'Profuse diaphoresis'],
                    treatment: 'Isotonic Saline (0.9% NaCl) volume resuscitation.'
                };
            } else {
                return {
                    category: 'Hypovolemic Hypotonic Hyponatremia (Renal Loss)',
                    primaryCauses: ['Thiazide Diuretics', 'Cerebral / Renal Salt Wasting (CSW/RSW)', 'Mineralocorticoid deficiency (Primary Adrenal Insufficiency / Addison\'s)', 'Salt-wasting nephropathy'],
                    treatment: 'Volume and sodium replacement. Check cortisol/aldosterone.'
                };
            }
        } else if (vol === 'euvolemic') {
            let siadhNote = 'SIADH (Malignancy, CNS disease, Pulmonary disease, SSRIs/Carbamazepine), Severe Hypothyroidism, Secondary Adrenal Insufficiency.';
            if (feUratePostNorm !== undefined && feUratePostNorm !== null) {
                if (feUratePostNorm <= 11) {
                    siadhNote += ' [Confirmed SIADH: FE_Urate normalized to ≤11% after sodium correction]';
                } else {
                    siadhNote += ' [Confirmed CSW/RSW: FE_Urate remained >11% even after sodium correction]';
                }
            }
            return {
                category: 'Euvolemic Hypotonic Hyponatremia',
                primaryCauses: [siadhNote],
                treatment: 'Fluid restriction (500-1000 mL/day), oral urea / salt tablets, or SGLT2i / Vasopressin antagonists where indicated.'
            };
        } else if (vol === 'hypervolemic') {
            if (uNa < 20) {
                return {
                    category: 'Hypervolemic Hypotonic Hyponatremia (Effective Circulating Volume Depletion)',
                    primaryCauses: ['Congestive Heart Failure (CHF)', 'Hepatic Cirrhosis (Hepatorenal)', 'Nephrotic Syndrome'],
                    treatment: 'Fluid restriction, loop diuretics, and underlying organ optimization.'
                };
            } else {
                return {
                    category: 'Hypervolemic Hypotonic Hyponatremia (Renal Failure)',
                    primaryCauses: ['Acute Kidney Injury (Oliguric)', 'End-Stage Renal Disease (ESRD)'],
                    treatment: 'Strict fluid restriction, dialysis / RRT.'
                };
            }
        }

        return {
            category: 'Hypotonic Hyponatremia (Incomplete data)',
            nextAction: 'Assess clinical volume status (Dry, Normal, Edematous) and Urine Na+.'
        };
    },

    evaluateHypokalemiaWorkup: function({ spotUKCrRatio, bpStatus, acidBaseStatus, uCl }) {
        if (spotUKCrRatio !== undefined && spotUKCrRatio !== null && spotUKCrRatio < 1.5) {
            return {
                category: 'Extrarenal Potassium Loss or Transcellular Shift',
                primaryCauses: ['Lower GI loss (Diarrhea, Laxatives)', 'Profuse sweating', 'Insulin excess / Refeeding', 'Beta-agonist / Salbutamol', 'Thyrotoxic Periodic Paralysis'],
                nextAction: 'Check thyroid function, review medications, replete potassium and magnesium.'
            };
        }

        const bp = String(bpStatus || '').toLowerCase();
        if (bp === 'hypertensive') {
            return {
                category: 'Renal Potassium Wasting with Hypertension',
                primaryCauses: ['Primary Hyperaldosteronism (Conn\'s syndrome)', 'Renal Artery Stenosis (High Renin)', 'Cushing Syndrome', 'Liddle Syndrome (Low Renin, Low Aldo)', 'Licorice / Apparent Mineralocorticoid Excess'],
                nextAction: 'Measure Plasma Renin Activity (PRA) and Plasma Aldosterone Concentration (PAC).'
            };
        }

        const ab = String(acidBaseStatus || '').toLowerCase();
        if (ab === 'acidosis') {
            return {
                category: 'Renal Potassium Wasting with Metabolic Acidosis',
                primaryCauses: ['Distal Renal Tubular Acidosis (RTA Type 1 - Urine pH > 5.5)', 'Proximal RTA (Type 2 - Fanconi)', 'Diabetic Ketoacidosis (Osmotic diuresis)'],
                nextAction: 'Check urine pH and Urine Anion Gap (UAG).'
            };
        }

        if (ab === 'alkalosis') {
            if (uCl !== undefined && uCl !== null && uCl < 15) {
                return {
                    category: 'Renal/Metabolic Alkalosis Hypokalemia (Chloride-Responsive: UCl < 15 mEq/L)',
                    primaryCauses: ['Vomiting / Gastric suction', 'Remote diuretic use', 'Congenital chloridorrhea'],
                    treatment: '0.9% NaCl saline hydration + KCl repletion.'
                };
            } else {
                return {
                    category: 'Renal/Metabolic Alkalosis Hypokalemia (Chloride-Resistant: UCl > 20 mEq/L)',
                    primaryCauses: ['Ongoing Diuretics (Loop/Thiazide)', 'Gitelman Syndrome (Hypocalciuria: UCa/UCr < 0.2)', 'Bartter Syndrome (Hypercalciuria: UCa/UCr > 0.2)', 'Severe Hypomagnesemia'],
                    nextAction: 'Check Urine Calcium/Creatinine ratio and serum Magnesium.'
                };
            }
        }

        return {
            category: 'Renal Potassium Wasting (Incomplete parameters)',
            nextAction: 'Measure Blood Pressure, Serum Bicarbonate / Acid-Base, and Urine Chloride.'
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ELECTROLYTE_ENGINE };
}
