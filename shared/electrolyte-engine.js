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
        if (serumK > 5.0) return { deficitMeq: 0, severity: 'Hyperkalemia (>5.0 mEq/L)', note: 'Hyperkalemic: Potassium repletion contraindicated', isHyperkalemic: true };
        if (serumK >= 4.0) return { deficitMeq: 0, severity: 'Normal (4.0-5.0)', note: 'No potassium deficit' };
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

        // 7.5% NaHCO3 (Thailand Standard / GPO): 75 mg/mL = 0.8928 mEq/mL -> 44.6 mEq per 50 mL ampule (~1,785 mOsm/L)
        const meqPerAmp75 = 44.6;
        const ampules75Total = Math.round((deficitMeq / meqPerAmp75) * 10) / 10;
        const ampules75Half = Math.round((halfDeficitMeq / meqPerAmp75) * 10) / 10;
        const volume75MlTotal = Math.round(deficitMeq / 0.8928);
        const volume75MlHalf = Math.round(halfDeficitMeq / 0.8928);

        // 8.4% NaHCO3 (International Standard): 84 mg/mL = 1.0 mEq/mL -> 50 mEq per 50 mL ampule (~2,000 mOsm/L)
        const meqPerAmp84 = 50.0;
        const ampules84Total = Math.round((deficitMeq / meqPerAmp84) * 10) / 10;
        const ampules84Half = Math.round((halfDeficitMeq / meqPerAmp84) * 10) / 10;
        const volume84MlTotal = Math.round(deficitMeq);
        const volume84MlHalf = Math.round(halfDeficitMeq);

        return {
            deficitMeq: Math.round(deficitMeq),
            halfDeficitMeq: Math.round(halfDeficitMeq),
            fvdUsed: fvd,
            targetHco3: targetHco3,
            // 7.5% Thailand formulation
            ampules75Total: Math.ceil(deficitMeq / meqPerAmp75),
            ampules75Half: Math.ceil(halfDeficitMeq / meqPerAmp75),
            ampules75Exact: ampules75Total,
            ampules75HalfExact: ampules75Half,
            volume75MlTotal: volume75MlTotal,
            volume75MlHalf: volume75MlHalf,
            meqPerAmp75: meqPerAmp75,
            // 8.4% International formulation
            ampules84Total: Math.ceil(deficitMeq / meqPerAmp84),
            ampules84Half: Math.ceil(halfDeficitMeq / meqPerAmp84),
            ampules84Exact: ampules84Total,
            ampules84HalfExact: ampules84Half,
            volume84MlTotal: volume84MlTotal,
            volume84MlHalf: volume84MlHalf,
            meqPerAmp84: meqPerAmp84,
            // Recipes
            recipes: {
                recipe75: {
                    name: '7.5% NaHCO3 (Thailand / GPO — 44.6 mEq / 50 mL ampule)',
                    concentrationPct: 7.5,
                    mEqPerAmp: 44.6,
                    mEqPerMl: 0.893,
                    formula1000: '3.5 ampules (175 mL = 156 mEq) 7.5% NaHCO3 in 825-850 mL D5W (yields ~150 mEq/L isotonic solution, ~280-300 mOsm/L)',
                    formula500: '2 ampules (100 mL = 89.2 mEq) 7.5% NaHCO3 in 400-500 mL D5W',
                    initialRateMlHr: '100 - 250 mL/hr (titrated to replace 50% deficit in first 4-8 hours)'
                },
                recipe84: {
                    name: '8.4% NaHCO3 (International — 50 mEq / 50 mL ampule)',
                    concentrationPct: 8.4,
                    mEqPerAmp: 50.0,
                    mEqPerMl: 1.0,
                    formula1000: '3 ampules (150 mL = 150 mEq) 8.4% NaHCO3 in 850-1000 mL D5W (yields ~150 mEq/L isotonic solution, ~300 mOsm/L)',
                    initialRateMlHr: '100 - 250 mL/hr (titrated to replace 50% deficit in first 4-8 hours)'
                }
            },
            isotonicRecipe: {
                formula: '3.5 ampules (175 mL = 156 mEq) 7.5% NaHCO3 in 850 mL D5W (Thailand) OR 3 ampules (150 mEq) 8.4% NaHCO3 in 1000 mL D5W (yields ~150 mEq/L, ~300 mOsm/L)',
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
            uncorrectedStatus: 'normal',
            correctedStatus: 'normal',
            ionizedCa: ionizedCaMmol,
            totalCa: totalCaMgDl,
            albumin: albuminGDl,
            payneCorrectedCa: null,
            isPseudohypocalcemia: false,
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
            
            // Uncorrected evaluation
            if (totalCaMgDl < 8.5) {
                result.uncorrectedStatus = totalCaMgDl < 7.0 ? 'severe_hypocalcemia' : 'hypocalcemia';
            } else if (totalCaMgDl > 10.5) {
                result.uncorrectedStatus = totalCaMgDl > 14.0 ? 'hypercalcemic_crisis' : 'hypercalcemia';
            }

            // Corrected evaluation (Payne)
            const evalTarget = result.payneCorrectedCa !== null ? result.payneCorrectedCa : totalCaMgDl;
            if (evalTarget < 8.5) {
                result.correctedStatus = evalTarget < 7.0 ? 'severe_hypocalcemia' : 'hypocalcemia';
            } else if (evalTarget > 10.5) {
                result.correctedStatus = evalTarget > 14.0 ? 'hypercalcemic_crisis' : 'hypercalcemia';
            }

            if (totalCaMgDl < 8.5 && evalTarget >= 8.5 && evalTarget <= 10.5) {
                result.isPseudohypocalcemia = true;
            }

            result.status = result.correctedStatus;
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

        if (serumPo4MgDl > 4.5) {
            return {
                severity: 'Hyperphosphatemia (>4.5 mg/dL)',
                caPo4Product: caPo4Product,
                isPrecipitationRisk: isHighProduct,
                recommendedDoseMmol: 0,
                safetyGate: isHighProduct ? 'CRITICAL WARNING: Ca × PO4 product ≥ 55 mg²/dL². High risk of metastatic tissue calcification and acute renal failure. Correct severe hypocalcemia first or administer with extreme caution.' : 'Safe Ca × PO4 product (< 55 mg²/dL²).',
                management: 'Restrict dietary phosphate, administer oral phosphate binders (Sevelamer, Calcium acetate). Avoid IV calcium unless severe symptomatic tetany.'
            };
        }

        if (serumPo4MgDl >= 2.5) {
            return {
                severity: 'Normal (2.5 - 4.5 mg/dL)',
                caPo4Product: caPo4Product,
                isPrecipitationRisk: isHighProduct,
                recommendedDoseMmol: 0,
                safetyGate: 'Safe physiological range.',
                note: 'Phosphate within normal range (2.5 - 4.5 mg/dL)'
            };
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

    calcPotassiumInfusion: function({ fluidVolumeMl = 1000, kclMeqAdded = 40, pumpRateMlHr = 100, isCentralLine = false }) {
        if (!(fluidVolumeMl > 0) || !(kclMeqAdded > 0) || !(pumpRateMlHr > 0)) return null;
        const concMeqL = Math.round((kclMeqAdded / (fluidVolumeMl / 1000)) * 10) / 10;
        const rateMeqHr = Math.round((concMeqL * (pumpRateMlHr / 1000)) * 10) / 10;
        const bottleDurationHrs = Math.round((fluidVolumeMl / pumpRateMlHr) * 10) / 10;
        const safety = this.evaluatePotassiumSafety(rateMeqHr, concMeqL, isCentralLine);

        return {
            concMeqL: concMeqL,
            rateMeqHr: rateMeqHr,
            bottleDurationHrs: bottleDurationHrs,
            fluidVolumeMl: fluidVolumeMl,
            kclMeqAdded: kclMeqAdded,
            pumpRateMlHr: pumpRateMlHr,
            isCentralLine: isCentralLine,
            safety: safety
        };
    },

    calcSalicylateAlkalinization: function({ weightKg = 60, formulation = '75' }) {
        const isThai = formulation === '75';
        const recipe = isThai
            ? '3.5 ampules (175 mL = 156 mEq) 7.5% NaHCO3 + 20 - 40 mEq KCl in 825-850 mL D5W (Total 1,000 mL)'
            : '3 ampules (150 mL = 150 mEq) 8.4% NaHCO3 + 20 - 40 mEq KCl in 850-1000 mL D5W (Total 1,000 mL)';
        const rateMlHr = Math.round(weightKg * 2.0); // 1.5 - 2.0 mL/kg/hr -> ~150-250 mL/hr

        return {
            targetUrinePh: '7.5 - 8.0',
            targetBloodPh: '≤ 7.55 (Do not exceed 7.55-7.60)',
            recipe: recipe,
            recommendedRateMlHr: `${Math.max(120, Math.min(250, rateMlHr))} mL/hr (1.5 - 2.0 mL/kg/hr)`,
            potassiumMandate: 'MANDATORY: Keep serum K+ ≥ 4.0 - 4.5 mEq/L. Hypokalemia triggers renal H+/K+ ATPase exchange, causing paradoxical aciduria and failure of alkalinization.',
            monitoringSchedule: 'Urine pH q1-2h, ABG/VBG q2h, Serum K+/Na+ q2-4h, Salicylate level q2-4h until falling.',
            dialysisTriggers: [
                'Acute Salicylate level > 100 mg/dL (7.2 mmol/L)',
                'Chronic Salicylate level > 60 mg/dL with severe clinical signs',
                'Presence of altered mental status, seizures, or cerebral edema',
                'Non-cardiogenic pulmonary edema (ARDS) or acute renal failure (AKI)',
                'Severe refractory acidemia (pH < 7.20) despite alkalinization'
            ]
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
    },

    evaluateHypernatremiaWorkup: function({ uOsm, responseToDdavp, urineVolume }) {
        if (uOsm < 300) {
            if (responseToDdavp === 'good') {
                return {
                    category: 'Complete Central Diabetes Insipidus (CDI)',
                    primaryCauses: ['Pituitary surgery / Neurosurgery', 'Head trauma', 'Hypoxic-ischemic encephalopathy', 'Infections (Meningitis/Encephalitis)', 'Idiopathic'],
                    nextAction: 'Desmopressin (DDAVP) 1-2 mcg IV/SC or 10-20 mcg intranasal q12-24h + Free water deficit replacement.'
                };
            } else if (responseToDdavp === 'poor') {
                return {
                    category: 'Complete Nephrogenic Diabetes Insipidus (NDI)',
                    primaryCauses: ['Lithium therapy', 'Hypercalcemia', 'Severe hypokalemia', 'Post-obstructive diuresis', 'Congenital V2 receptor defect'],
                    nextAction: 'Discontinue offending drugs, low-sodium diet, Thiazide diuretics + Amiloride, NSAIDs.'
                };
            }
            return {
                category: 'Diabetes Insipidus (Unclassified)',
                primaryCauses: ['Central DI vs Nephrogenic DI'],
                nextAction: 'Perform Desmopressin (DDAVP) Challenge Test (Check UOsm 1-2h post 2-4 mcg DDAVP: >50% increase = Central DI; <50% = Nephrogenic DI).'
            };
        } else if (uOsm <= 800) {
            return {
                category: 'Partial Diabetes Insipidus OR Osmotic Diuresis',
                primaryCauses: ['Osmotic Diuresis (Hyperglycemia / Glucosuria, High Urea / Recovery phase of AKI, Mannitol)', 'Partial Central/Nephrogenic DI'],
                nextAction: 'Calculate total urine solute excretion (UOsm × 24h Volume: >1000 mOsm/day = Osmotic diuresis).'
            };
        } else {
            return {
                category: 'Extrarenal Water Loss OR Sodium Overload',
                primaryCauses: ['Hypodipsia / Lack of access to water (Elderly, Debilitated)', 'Insensible cutaneous/respiratory water loss (Sweating, Burns, Fever)', 'Gastrointestinal osmotic diarrhea', 'Exogenous Sodium Overload (Hypertonic saline, NaHCO3 ampules, Salt tablet poisoning)'],
                nextAction: 'Calculate Free Water Deficit (FWD) and infuse D5W or enteral water via NG tube.'
            };
        }
    },

    evaluateHyperkalemiaWorkup: function({ isHemolyzed, gfr, transcellularTrigger, spotUKCrRatio }) {
        if (isHemolyzed) {
            return {
                category: 'Pseudohyperkalemia (Factitious Hyperkalemia)',
                primaryCauses: ['In vitro hemolysis (traumatic venipuncture / fist clenching)', 'Thrombocytosis (Platelets > 500,000/μL)', 'Marked Leukocytosis (WBC > 50,000/μL)'],
                nextAction: 'Repeat blood draw with free-flowing non-tourniquet technique; order plasma potassium.'
            };
        }

        if (transcellularTrigger) {
            return {
                category: 'Transcellular Potassium Shift (Extracellular Shift)',
                primaryCauses: ['Metabolic Acidemia (Inorganic)', 'Insulin deficiency / Hyperglycemia (DKA/HHS)', 'Beta-blocker overdose', 'Digoxin toxicity', 'Succinylcholine administration', 'Tissue breakdown / Rhabdomyolysis / Tumor Lysis Syndrome'],
                nextAction: 'Treat underlying condition; administer Insulin + D50W and Salbutamol.'
            };
        }

        if (gfr !== undefined && gfr !== null && gfr < 30) {
            return {
                category: 'Reduced GFR-Mediated Hyperkalemia',
                primaryCauses: ['Acute Kidney Injury (AKI Stage 2-3 / Oliguric)', 'End-Stage Renal Disease (ESRD / Missed Dialysis)'],
                nextAction: 'Assess for emergency RRT/Dialysis (AEIOU); administer potassium binders (Lokelma/SZC) and loop diuretics if non-oliguric.'
            };
        }

        if (spotUKCrRatio !== undefined && spotUKCrRatio !== null && spotUKCrRatio < 2.0) {
            return {
                category: 'Impaired Tubular Potassium Secretion (Normal/Mild GFR reduction)',
                primaryCauses: ['Hypoaldosteronism (Type 4 RTA)', 'Renin-Angiotensin-Aldosterone System Inhibitors (ACEi, ARB, MRA/Spironolactone)', 'ENaC Blockers (Trimethoprim, Amiloride, Triamterene)', 'Calcineurin Inhibitors (Tacrolimus, Cyclosporine)', 'Heparin (aldosterone suppression)'],
                nextAction: 'Review and discontinue offending medications, consider Fludrocortisone or loop diuretics.'
            };
        }

        return {
            category: 'Hyperkalemia (Multifactorial / Unspecified)',
            nextAction: 'Check repeat free-flowing sample, serum creatinine / eGFR, medication list, and Spot UK/UCr ratio.'
        };
    },

    evaluateMetabolicAcidosisWorkup: function({ anionGap, uag, deltaRatio, urinePh, serumK }) {
        if (anionGap > 10) {
            let desc = 'High Anion Gap Metabolic Acidosis (HAGMA - GOLD MARK / MUDPILES)';
            const causes = ['L-Lactic Acidosis (Sepsis, Shock, Hypoperfusion)', 'Ketoacidosis (DKA, Alcoholic AKA, Starvation)', 'Renal Failure / Uremic acid accumulation', 'Toxic Alcohols (Methanol, Ethylene Glycol - Check Osmolar Gap)', 'Salicylate Poisoning', '5-Oxoproline (Chronic Acetaminophen)', 'D-Lactic Acidosis (Short Bowel Syndrome)'];
            if (deltaRatio !== null && deltaRatio !== undefined) {
                if (deltaRatio < 0.8) desc += ' + Concurrent NAGMA';
                else if (deltaRatio > 2.0) desc += ' + Concurrent Metabolic Alkalosis / Pre-existing HCO3 retention';
            }
            return {
                category: desc,
                primaryCauses: causes,
                nextAction: 'Check serum Lactate, Ketones, Creatinine, Osmolar Gap, and Salicylate level.'
            };
        } else {
            if (uag !== null && uag !== undefined && uag < 0) {
                return {
                    category: 'Normal Anion Gap Metabolic Acidosis (NAGMA: Gastrointestinal HCO3- Loss)',
                    primaryCauses: ['Severe Diarrhea', 'Enterostomy / Fistula drainage', 'Ureteral diversions (Ureterosigmoidostomy)'],
                    treatment: 'Negative UAG confirms intact renal ammonium (NH4+) excretion. Treat with volume and bicarbonate repletion.'
                };
            } else if (uag !== null && uag !== undefined && uag > 0) {
                if (urinePh > 5.5) {
                    return {
                        category: 'NAGMA: Distal Renal Tubular Acidosis (Classic Type 1 RTA)',
                        primaryCauses: ['Autoimmune diseases (Sjögren\'s, SLE)', 'Amphotericin B toxicity', 'Hypercalciuria / Nephrocalcinosis'],
                        nextAction: 'Positive UAG + alkaline urine (pH > 5.5) indicates impaired distal H+ secretion. Treat with oral Sodium/Potassium Citrate.'
                    };
                } else {
                    if (serumK > 5.0) {
                        return {
                            category: 'NAGMA: Hyperkalemic RTA (Type 4 RTA / Aldosterone Deficiency or Resistance)',
                            primaryCauses: ['Diabetic Nephropathy', 'Drugs (ACEi, ARB, Spironolactone, NSAIDs, Trimethoprim)', 'Primary Adrenal Insufficiency'],
                            treatment: 'Low potassium diet, loop diuretics, Fludrocortisone.'
                        };
                    } else {
                        return {
                            category: 'NAGMA: Proximal RTA (Type 2 RTA)',
                            primaryCauses: ['Fanconi Syndrome', 'Multiple Myeloma (Light chain toxicity)', 'Acetazolamide / Topiramate', 'Tenofovir / Heavy metals'],
                            treatment: 'Impaired proximal HCO3- reabsorption. Large doses of oral bicarbonate + potassium.'
                        };
                    }
                }
            }
            return {
                category: 'Normal Anion Gap Metabolic Acidosis (NAGMA / Hyperchloremic)',
                nextAction: 'Measure Urine Na+, K+, Cl- to calculate Urine Anion Gap (UAG = UNa + UK - UCl).'
            };
        }
    },

    evaluateMetabolicAlkalosisWorkup: function({ uCl, bpStatus, reninAldoStatus }) {
        if (uCl !== undefined && uCl !== null && uCl < 15) {
            return {
                category: 'Chloride-Responsive Metabolic Alkalosis (UCl < 15-20 mEq/L)',
                primaryCauses: ['Gastric loss (Vomiting, Nasogastric suction)', 'Remote Diuretic Therapy (post-diuretic)', 'Congenital Chloridorrhea', 'Cystic Fibrosis / Sweat loss', 'Post-hypercapnic state'],
                treatment: 'Volume expansion with 0.9% NaCl Normal Saline + Potassium replacement.'
            };
        } else if (uCl !== undefined && uCl !== null && uCl >= 20) {
            const bp = String(bpStatus || '').toLowerCase();
            if (bp === 'hypertensive') {
                return {
                    category: 'Chloride-Resistant Metabolic Alkalosis with Hypertension (Mineralocorticoid Excess)',
                    primaryCauses: ['Primary Hyperaldosteronism (Conn\'s syndrome - High Aldo, Low Renin)', 'Renovascular HTN / Renal Artery Stenosis (High Aldo, High Renin)', 'Cushing Syndrome / Ectopic ACTH', 'Liddle Syndrome (Low Aldo, Low Renin)', 'Apparent Mineralocorticoid Excess (Licorice)'],
                    nextAction: 'Measure Plasma Renin Activity (PRA) and Plasma Aldosterone Concentration (PAC).'
                };
            } else {
                return {
                    category: 'Chloride-Resistant Metabolic Alkalosis with Normal/Low BP',
                    primaryCauses: ['Ongoing Loop or Thiazide Diuretics', 'Gitelman Syndrome (Hypocalciuria: UCa/UCr < 0.2)', 'Bartter Syndrome (Hypercalciuria: UCa/UCr > 0.2)', 'Severe Hypomagnesemia'],
                    nextAction: 'Check spot Urine Calcium/Creatinine ratio and serum Magnesium.'
                };
            }
        }
        return {
            category: 'Metabolic Alkalosis (Unclassified)',
            nextAction: 'Measure Urine Chloride (UCl) to differentiate Chloride-Responsive vs Chloride-Resistant.'
        };
    },

    evaluateCalciumWorkup: function({ isHypercalcemia, pthStatus, cccr, vitDStatus }) {
        if (isHypercalcemia) {
            if (pthStatus === 'elevated' || pthStatus === 'normal') {
                if (cccr !== undefined && cccr !== null && cccr < 0.01) {
                    return {
                        category: 'Familial Hypocalciuric Hypercalcemia (FHH)',
                        primaryCauses: ['Inactivating mutation of Calcium-Sensing Receptor (CASR) gene'],
                        nextAction: 'Benign condition; PARATHYROIDECTOMY IS CONTRAINDICATED. Check family members.'
                    };
                }
                return {
                    category: 'PTH-Dependent Hypercalcemia (Primary Hyperparathyroidism)',
                    primaryCauses: ['Parathyroid Adenoma (85%)', 'Parathyroid Hyperplasia (15%)', 'Parathyroid Carcinoma (<1%)', 'Tertiary Hyperparathyroidism (ESRD)'],
                    nextAction: 'Parathyroid localization (Sestamibi/SPECT, Neck US, 4D-CT) for surgical referral; maintain hydration.'
                };
            } else {
                return {
                    category: 'PTH-Independent Hypercalcemia (PTH Suppressed)',
                    primaryCauses: ['Malignancy (Humoral Hypercalcemia of Malignancy via PTHrP - Squamous cell CA, Renal, Breast)', 'Osteolytic Bone Metastases (Multiple Myeloma, Breast)', 'Vitamin D Toxicity or Granulomatous Disease (Sarcoidosis, TB via 1,25(OH)2D)', 'Milk-Alkali Syndrome', 'Immobilization / Thyrotoxicosis'],
                    nextAction: 'Check PTHrP, 25-OH Vitamin D, 1,25-(OH)2 Vitamin D, and serum protein electrophoresis (SPEP).'
                };
            }
        } else {
            if (pthStatus === 'low' || pthStatus === 'suppressed') {
                return {
                    category: 'Hypoparathyroidism',
                    primaryCauses: ['Post-surgical (Thyroidectomy / Parathyroidectomy)', 'Autoimmune polyglandular syndrome', 'Severe Hypomagnesemia (impairs PTH release and induces end-organ resistance)'],
                    treatment: 'Calcium supplementation + Calcitriol (Active Vit D). Correct Magnesium.'
                };
            } else {
                return {
                    category: 'Secondary Hyperparathyroidism / High-PTH Hypocalcemia',
                    primaryCauses: ['Vitamin D Deficiency (Nutritional / Malabsorption)', 'Chronic Kidney Disease (CKD - loss of 1α-hydroxylase)', 'Acute Pancreatitis (Calcium saponification)', 'Hyperphosphatemia / Tumor Lysis', 'Bisphosphonate / Denosumab therapy'],
                    treatment: 'Vitamin D repletion, Phosphate binders if indicated, Calcium repletion.'
                };
            }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ELECTROLYTE_ENGINE };
}
