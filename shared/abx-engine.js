/**
 * shared/abx-engine.js
 * Offline-first Antimicrobial Renal Dosing Engine (Stanford Health Care Reference - Approved August 2026)
 */

const ABX_ENGINE = {
    // ------------------------------------------------------------------------
    // 1. Anthropometrics & Body Weight Engine
    // ------------------------------------------------------------------------
    calcIBW: (heightCm, sex) => {
        // Stanford IBW formula:
        // Male: 50 kg + 2.3 kg for each inch over 5 feet
        // Female: 45.5 kg + 2.3 kg for each inch over 5 feet
        // 1 inch = 2.54 cm; 5 feet = 152.4 cm
        if (!heightCm || heightCm <= 0) return null;
        let over5ftInches = (heightCm - 152.4) / 2.54;
        if (over5ftInches < 0) over5ftInches = 0; // Don't subtract for < 5ft
        
        const s = typeof sex === 'string' ? sex.trim().toUpperCase() : '';
        let base = (s === 'M' || s === 'MALE') ? 50 : 45.5;
        return base + (2.3 * over5ftInches);
    },

    calcABW: (tbw, ibw) => {
        // Adjusted Body Weight = IBW + 0.4 * (TBW - IBW)
        if (!tbw || !ibw) return null;
        return ibw + 0.4 * (tbw - ibw);
    },

    calcBMI: (weightKg, heightCm) => {
        if (!weightKg || !heightCm) return null;
        let hM = heightCm / 100;
        return weightKg / (hM * hM);
    },

    calcBSA: (weightKg, heightCm) => {
        // Mosteller BSA formula: sqrt((height(cm) * weight(kg)) / 3600)
        if (!weightKg || !heightCm) return null;
        return Math.sqrt((heightCm * weightKg) / 3600);
    },

    // ------------------------------------------------------------------------
    // 2. Dual Renal Function Evaluator
    // ------------------------------------------------------------------------
    calcCrCl: (patientOrParams, legacyWeightType) => {
        if (!patientOrParams || typeof patientOrParams !== 'object' || Array.isArray(patientOrParams)) {
            return null;
        }
        const pt = (patientOrParams.patient && typeof patientOrParams.patient === 'object')
            ? patientOrParams.patient
            : patientOrParams;
        const requestedWeightType = legacyWeightType || patientOrParams.weightType || pt.weightType || 'auto';

        const { age, sex, weightKg, heightCm, scr } = pt;
        if (age == null || sex == null || weightKg == null || scr == null) return null;

        const numAge = Number(age);
        const numWeight = Number(weightKg);
        const numScr = Number(scr);
        const numHeight = (heightCm != null && typeof heightCm !== 'boolean' && Number.isFinite(Number(heightCm)) && Number(heightCm) > 0)
            ? Number(heightCm)
            : null;

        if (typeof age === 'boolean' || typeof weightKg === 'boolean' || typeof scr === 'boolean' ||
            !Number.isFinite(numAge) || !Number.isFinite(numWeight) || !Number.isFinite(numScr) ||
            numAge <= 0 || numWeight <= 0 || numScr <= 0) {
            return null;
        }

        const s = typeof sex === 'string' ? sex.trim().toUpperCase() : '';
        const isFemale = (s === 'F' || s === 'FEMALE');
        const isMale = (s === 'M' || s === 'MALE');
        if (!isFemale && !isMale) return null;

        let tbw = numWeight;
        let ibw = (numHeight && numHeight > 0) ? ABX_ENGINE.calcIBW(numHeight, sex) : null;
        let abw = ibw ? ABX_ENGINE.calcABW(tbw, ibw) : null;
        let bmi = (numHeight && numHeight > 0) ? ABX_ENGINE.calcBMI(numWeight, numHeight) : null;

        let w = tbw; // default
        let recommendedWeightType = 'TBW';

        if (requestedWeightType === 'auto' && ibw) {
            // Intelligent weight selection:
            // Underweight (TBW < IBW) -> TBW
            // Obese (BMI >= 30 or TBW > 1.2 * IBW) -> AdjBW (40%)
            // Normal weight -> IBW
            if (tbw < ibw) {
                w = tbw;
                recommendedWeightType = 'TBW';
            } else if ((bmi && bmi >= 30) || (tbw > 1.2 * ibw)) {
                w = abw || tbw;
                recommendedWeightType = 'ABW';
            } else {
                w = ibw;
                recommendedWeightType = 'IBW';
            }
        } else if (requestedWeightType === 'IBW' && ibw) {
            w = ibw;
            recommendedWeightType = 'IBW';
        } else if (requestedWeightType === 'ABW' && abw) {
            w = abw;
            recommendedWeightType = 'ABW';
        } else if (requestedWeightType === 'TBW') {
            w = tbw;
            recommendedWeightType = 'TBW';
        }

        // Cockcroft-Gault formula: ((140 - Age) * Weight) / (72 * SCr) * (0.85 if Female)
        let crcl = ((140 - numAge) * w) / (72 * numScr);
        if (isFemale) {
            crcl = crcl * 0.85;
        }

        return {
            crcl: crcl,
            weightUsed: w,
            weightType: recommendedWeightType,
            formula: 'Cockcroft-Gault (1976)',
            units: 'mL/min',
            ibw,
            abw,
            bmi
        };
    },

    calcEGFR_CKD_EPI_2021: (scrOrPatient, ageParam, sexParam) => {
        // CKD-EPI 2021 (Race-free equation, Inker et al., NEJM 2021)
        let scr, age, sex;
        if (typeof scrOrPatient === 'object' && scrOrPatient !== null) {
            scr = scrOrPatient.scr;
            age = scrOrPatient.age;
            sex = scrOrPatient.sex;
        } else {
            scr = scrOrPatient;
            age = ageParam;
            sex = sexParam;
        }
        if (scr == null || age == null || sex == null) return null;
        if ((typeof scr !== 'number' && typeof scr !== 'string') || (typeof age !== 'number' && typeof age !== 'string')) return null;
        if (typeof scr === 'string' && scr.trim() === '') return null;
        if (typeof age === 'string' && age.trim() === '') return null;
        const numScr = Number(scr);
        const numAge = Number(age);
        if (!Number.isFinite(numScr) || numScr <= 0 || !Number.isFinite(numAge) || numAge <= 0) return null;
        
        const s = typeof sex === 'string' ? sex.trim().toUpperCase() : '';
        const isFemale = (s === 'F' || s === 'FEMALE');
        const isMale = (s === 'M' || s === 'MALE');
        if (!isFemale && !isMale) return null;

        const kappa = isFemale ? 0.7 : 0.9;
        const alpha = isFemale ? -0.241 : -0.302;
        const sexFactor = isFemale ? 1.012 : 1.000;
        
        let min = Math.min(numScr / kappa, 1);
        let max = Math.max(numScr / kappa, 1);
        
        let egfrVal = 142 * Math.pow(min, alpha) * Math.pow(max, -1.200) * Math.pow(0.9938, numAge) * sexFactor;
        
        // Return Number wrapper preserving primitive numeric comparisons while exposing metadata
        const res = new Number(egfrVal);
        res.egfr = egfrVal;
        res.formula = 'CKD-EPI 2021 Race-Free';
        res.units = 'mL/min/1.73m²';
        return res;
    },

    calcAbsoluteGFR: (egfr, bsa) => {
        // Absolute GFR = eGFR * (BSA / 1.73) in mL/min
        if (egfr == null || bsa == null) return null;
        const rawEgfr = (typeof egfr === 'object' && egfr !== null) ? egfr.egfr : egfr;
        if (rawEgfr == null) return null;
        if (typeof rawEgfr === 'string' && rawEgfr.trim() === '') return null;
        const egfrVal = Number(rawEgfr);
        if (!Number.isFinite(egfrVal) || egfrVal < 0) return null;
        if (typeof bsa === 'string' && bsa.trim() === '') return null;
        const bsaVal = Number(bsa);
        if (!Number.isFinite(bsaVal) || bsaVal <= 0) return null;
        return egfrVal * (bsaVal / 1.73);
    },

    getRenalTier: (crcl, isHD = false, isCRRT = false) => {
        if (isHD) return 'hd';
        if (isCRRT) return 'crrt';
        if (typeof crcl !== 'number' && typeof crcl !== 'string') return 'unknown';
        if (typeof crcl === 'string' && crcl.trim() === '') return 'unknown';
        const c = Number(crcl);
        if (!Number.isFinite(c)) return 'unknown';
        if (c >= 50) return 'crcl_gt_50';
        if (c >= 30) return 'crcl_30_50';
        if (c >= 10) return 'crcl_10_29';
        return 'crcl_lt_10';
    },

    getRenalTierForCrCl: function(crcl, isHD, isCRRT) {
        return this.getRenalTier(crcl, isHD, isCRRT);
    },

    evaluateDiscordance: (crcl, egfr, bsaOrAbsGfr, tiers) => {
        if (crcl == null || egfr == null) {
            if (Array.isArray(tiers)) return false;
            return { isDiscordant: false, tierCrCl: null, tierEGFR: null, clinicalAdvice: '' };
        }

        const parseRenalVal = (val) => {
            if (typeof val !== 'number' && typeof val !== 'string') return null;
            if (typeof val === 'string' && val.trim() === '') return null;
            const n = Number(val);
            return (Number.isFinite(n) && n >= 0) ? n : null;
        };
        
        // Legacy 4-param call from tools/abx-renal-dosing.html
        if (Array.isArray(tiers)) {
            const getTierIndex = (val) => {
                if (val == null || !Number.isFinite(val) || val < 0) return -1;
                for (let i = 0; i < tiers.length; i++) {
                    let t = tiers[i];
                    if (t && typeof t === 'object' && val >= t.min && val <= t.max) return i;
                }
                return -1;
            };

            const validCrCl = parseRenalVal(crcl);
            const crclTier = validCrCl !== null ? getTierIndex(validCrCl) : -1;

            const absGfrLegacy = (typeof bsaOrAbsGfr === 'object' && bsaOrAbsGfr !== null && 'absGfr' in bsaOrAbsGfr) ? bsaOrAbsGfr.absGfr : null;
            const validAbsGfrLegacy = absGfrLegacy != null ? parseRenalVal(absGfrLegacy) : null;

            let validEgfrComp = null;
            if (validAbsGfrLegacy !== null) {
                validEgfrComp = validAbsGfrLegacy;
            } else {
                const rawEgfr = (typeof egfr === 'object' && egfr !== null && 'egfr' in egfr) ? egfr.egfr : egfr;
                validEgfrComp = parseRenalVal(rawEgfr);
            }

            const egfrTier = validEgfrComp !== null ? getTierIndex(validEgfrComp) : -1;
            return (crclTier !== -1 && egfrTier !== -1 && crclTier !== egfrTier);
        }

        // Modern 3-param contract: evaluateDiscordance(crcl, egfr, bsa)
        const validCrCl = parseRenalVal(crcl);
        const tierCrCl = validCrCl !== null ? ABX_ENGINE.getRenalTier(validCrCl) : 'unknown';

        const rawEgfr = (typeof egfr === 'object' && egfr !== null && 'egfr' in egfr) ? egfr.egfr : egfr;
        const validEgfr = parseRenalVal(rawEgfr);

        let effectiveEGFR = validEgfr;
        if (bsaOrAbsGfr != null) {
            if (typeof bsaOrAbsGfr === 'object' && bsaOrAbsGfr !== null) {
                if ('absGfr' in bsaOrAbsGfr && bsaOrAbsGfr.absGfr != null) {
                    const parsedAbsGfr = parseRenalVal(bsaOrAbsGfr.absGfr);
                    if (parsedAbsGfr !== null) {
                        effectiveEGFR = parsedAbsGfr;
                    }
                    // Preserves fallback to validEgfr if parsedAbsGfr is invalid or non-finite
                } else if ('bsa' in bsaOrAbsGfr && bsaOrAbsGfr.bsa != null) {
                    if (validEgfr !== null && typeof bsaOrAbsGfr.bsa !== 'boolean') {
                        const derived = ABX_ENGINE.calcAbsoluteGFR(validEgfr, bsaOrAbsGfr.bsa);
                        if (derived !== null) effectiveEGFR = derived;
                    }
                }
            } else {
                if (validEgfr !== null && typeof bsaOrAbsGfr !== 'boolean') {
                    const derived = ABX_ENGINE.calcAbsoluteGFR(validEgfr, bsaOrAbsGfr);
                    if (derived !== null) effectiveEGFR = derived;
                }
            }
        }

        const tierEGFR = effectiveEGFR !== null ? ABX_ENGINE.getRenalTier(effectiveEGFR) : 'unknown';
        const isDiscordant = (tierCrCl !== 'unknown' && tierEGFR !== 'unknown' && tierCrCl !== tierEGFR);
        const clinicalAdvice = isDiscordant
            ? 'Discordance detected between Cockcroft-Gault CrCl and eGFR tiers. For beta-lactams in severe sepsis, avoid underdosing (consider higher dose). For narrow therapeutic index agents (Vancomycin, Aminoglycosides), monitor therapeutic drug levels closely.'
            : (tierCrCl === 'unknown' || tierEGFR === 'unknown'
                ? ''
                : 'Renal estimates are concordant across dosing tiers.');

        return {
            isDiscordant,
            tierCrCl,
            tierEGFR,
            clinicalAdvice
        };
    },

    // ------------------------------------------------------------------------
    // 3. Disease & Indication Protocols Directory
    // ------------------------------------------------------------------------
    DISEASE_PROTOCOLS: {
        cap: {
            id: 'cap',
            name: 'Community-Acquired Pneumonia (CAP)',
            thName: 'ปอดอักเสบชุมชน',
            icon: '🫁',
            category: 'Pneumonia',
            primaryDrugs: ['ceftriaxone', 'ampicillin', 'azithromycin'],
            firstLine: ['ceftriaxone', 'ampicillin', 'azithromycin'],
            altDrugs: ['levofloxacin', 'vancomycin', 'amox_clav'],
            alternatives: ['levofloxacin', 'vancomycin', 'amox_clav'],
            clinicalGuidance: 'Standard inpatient: Ceftriaxone 1-2g IV q24h + Azithromycin 500mg IV/PO q24h OR Levofloxacin 750mg IV/PO q24h alone. If MRSA risk factors (prior MRSA, cavitation): Add Vancomycin loading 25-30 mg/kg TBW.',
            notes: 'Standard inpatient: Ceftriaxone 1-2g IV q24h + Azithromycin 500mg IV/PO q24h OR Levofloxacin 750mg IV/PO q24h alone. If MRSA risk factors (prior MRSA, cavitation): Add Vancomycin loading 25-30 mg/kg TBW.'
        },
        hap_vap: {
            id: 'hap_vap',
            name: 'HAP / VAP / Hospital-Acquired Pneumonia',
            thName: 'ปอดอักเสบในโรงพยาบาล / ติดเชื้อดื้อยา',
            icon: '🫁',
            category: 'Pneumonia',
            primaryDrugs: ['cefepime', 'pip_tazo', 'meropenem', 'vancomycin'],
            firstLine: ['cefepime', 'pip_tazo', 'meropenem', 'vancomycin'],
            altDrugs: ['levofloxacin', 'ciprofloxacin', 'gentamicin', 'amikacin', 'colistin'],
            alternatives: ['levofloxacin', 'ciprofloxacin', 'gentamicin', 'amikacin', 'colistin'],
            clinicalGuidance: 'Ensure anti-pseudomonal coverage. Add MRSA coverage if risk factors present. Prefer extended infusion for beta-lactams (Cefepime 2g q8h over 4h, Pip/Tazo 4.5g q8h over 4h, Meropenem 1g q8h over 3h).',
            notes: 'Ensure anti-pseudomonal coverage. Add MRSA coverage if risk factors present. Prefer extended infusion for beta-lactams (Cefepime 2g q8h over 4h, Pip/Tazo 4.5g q8h over 4h, Meropenem 1g q8h over 3h).'
        },
        meningitis_ca: {
            id: 'meningitis_ca',
            name: 'Community-Acquired Meningitis / CNS Infection',
            thName: 'เยื่อหุ้มสมองอักเสบ (ชุมชน)',
            icon: '🧠',
            category: 'CNS',
            primaryDrugs: ['ceftriaxone', 'vancomycin', 'ampicillin'],
            firstLine: ['ceftriaxone', 'vancomycin', 'ampicillin'],
            altDrugs: ['meropenem', 'acyclovir'],
            alternatives: ['meropenem', 'acyclovir'],
            clinicalGuidance: 'Empiric: Ceftriaxone 2g IV q12h (MANDATORY high dose) + Vancomycin 25-30 mg/kg load then 15-20 mg/kg q8-12h (target trough 15-20 mcg/mL). If age >50 or immunocompromised: Add Ampicillin 2g IV q4h for Listeria. Dexamethasone 10mg IV before or with first antibiotic dose.',
            notes: 'Empiric: Ceftriaxone 2g IV q12h (MANDATORY high dose) + Vancomycin 25-30 mg/kg load then 15-20 mg/kg q8-12h (target trough 15-20 mcg/mL). If age >50 or immunocompromised: Add Ampicillin 2g IV q4h for Listeria. Dexamethasone 10mg IV before or with first antibiotic dose.'
        },
        meningitis: {
            id: 'meningitis',
            name: 'Community-Acquired Meningitis / CNS Infection',
            thName: 'เยื่อหุ้มสมองอักเสบ (ชุมชน)',
            icon: '🧠',
            category: 'CNS',
            primaryDrugs: ['ceftriaxone', 'vancomycin', 'ampicillin'],
            firstLine: ['ceftriaxone', 'vancomycin', 'ampicillin'],
            altDrugs: ['meropenem', 'acyclovir'],
            alternatives: ['meropenem', 'acyclovir'],
            clinicalGuidance: 'Empiric: Ceftriaxone 2g IV q12h (MANDATORY high dose) + Vancomycin 25-30 mg/kg load then 15-20 mg/kg q8-12h (target trough 15-20 mcg/mL). If age >50 or immunocompromised: Add Ampicillin 2g IV q4h for Listeria. Dexamethasone 10mg IV before or with first antibiotic dose.',
            notes: 'Empiric: Ceftriaxone 2g IV q12h (MANDATORY high dose) + Vancomycin 25-30 mg/kg load then 15-20 mg/kg q8-12h (target trough 15-20 mcg/mL). If age >50 or immunocompromised: Add Ampicillin 2g IV q4h for Listeria. Dexamethasone 10mg IV before or with first antibiotic dose.'
        },
        uti_cystitis: {
            id: 'uti_cystitis',
            name: 'Acute Uncomplicated Cystitis',
            thName: 'กระเพาะปัสสาวะอักเสบ',
            icon: '💧',
            category: 'UTI',
            primaryDrugs: ['nitrofurantoin', 'bactrim', 'ciprofloxacin', 'levofloxacin'],
            firstLine: ['nitrofurantoin', 'bactrim', 'ciprofloxacin', 'levofloxacin'],
            altDrugs: ['cefpodoxime', 'cephalexin', 'amox_clav'],
            alternatives: ['cefpodoxime', 'cephalexin', 'amox_clav'],
            clinicalGuidance: 'Nitrofurantoin contraindicated if CrCl < 30 mL/min. Bactrim 1 DS PO BID x 3 days. Reserve fluoroquinolones when other first-line oral options are not suitable.',
            notes: 'Nitrofurantoin contraindicated if CrCl < 30 mL/min. Bactrim 1 DS PO BID x 3 days. Reserve fluoroquinolones when other first-line oral options are not suitable.'
        },
        uti_pyelo: {
            id: 'uti_pyelo',
            name: 'Complicated UTI / Acute Pyelonephritis',
            thName: 'กรวยไตอักเสบ / การติดเชื้อทางเดินปัสสาวะซับซ้อน',
            icon: '💧',
            category: 'UTI',
            primaryDrugs: ['ceftriaxone', 'ciprofloxacin', 'levofloxacin'],
            firstLine: ['ceftriaxone', 'ciprofloxacin', 'levofloxacin'],
            altDrugs: ['cefepime', 'pip_tazo', 'meropenem', 'ertapenem', 'amikacin'],
            alternatives: ['cefepime', 'pip_tazo', 'meropenem', 'ertapenem', 'amikacin'],
            clinicalGuidance: 'Non-critically ill: Ceftriaxone 1-2g IV q24h or Ciprofloxacin 400mg IV q12h. Critically ill or ESBL risk: Meropenem 1g IV q8h, Ertapenem 1g q24h, or Cefepime 1-2g IV q8-12h.',
            notes: 'Non-critically ill: Ceftriaxone 1-2g IV q24h or Ciprofloxacin 400mg IV q12h. Critically ill or ESBL risk: Meropenem 1g IV q8h, Ertapenem 1g q24h, or Cefepime 1-2g IV q8-12h.'
        },
        intra_abdominal: {
            id: 'intra_abdominal',
            name: 'Intra-abdominal Infection (IAI) / Peritonitis',
            thName: 'การติดเชื้อในช่องท้อง / เยื่อบุช่องท้องอักเสบ',
            icon: '🫃',
            category: 'Intra-abdominal',
            primaryDrugs: ['pip_tazo', 'ceftriaxone', 'metronidazole', 'amp_sulb'],
            firstLine: ['pip_tazo', 'ceftriaxone', 'metronidazole', 'amp_sulb'],
            altDrugs: ['meropenem', 'ertapenem', 'ciprofloxacin'],
            alternatives: ['meropenem', 'ertapenem', 'ciprofloxacin'],
            clinicalGuidance: 'Community-acquired mild-mod: Ceftriaxone 1-2g IV q24h + Metronidazole 500mg IV q8h or Amp/Sulb 3g q6h. Severe / Healthcare-associated / Septic shock: Pip/Tazo 4.5g IV q8h (over 4h) or Meropenem 1g IV q8h (over 3h).',
            notes: 'Community-acquired mild-mod: Ceftriaxone 1-2g IV q24h + Metronidazole 500mg IV q8h or Amp/Sulb 3g q6h. Severe / Healthcare-associated / Septic shock: Pip/Tazo 4.5g IV q8h (over 4h) or Meropenem 1g IV q8h (over 3h).'
        },
        skin_soft_tissue: {
            id: 'skin_soft_tissue',
            name: 'Skin & Soft Tissue / Cellulitis / Necrotizing',
            thName: 'การติดเชื้อผิวหนังและเนื้อเยื่ออ่อน / แผลติดเชื้อรุนแรง',
            icon: '🩹',
            category: 'Skin & Soft Tissue',
            primaryDrugs: ['cefazolin', 'ceftriaxone', 'vancomycin', 'clindamycin'],
            firstLine: ['cefazolin', 'ceftriaxone', 'vancomycin', 'clindamycin'],
            altDrugs: ['pip_tazo', 'meropenem', 'daptomycin', 'linezolid'],
            alternatives: ['pip_tazo', 'meropenem', 'daptomycin', 'linezolid'],
            clinicalGuidance: 'Non-purulent cellulitis: Cefazolin 2g IV q8h or Ceftriaxone 1-2g IV q24h. Purulent / MRSA: Vancomycin load 25-30 mg/kg TBW. Suspected necrotizing fasciitis: Meropenem 1g IV q8h + Vancomycin + Clindamycin 900mg IV q8h (toxin suppression) + STAT Surgical Consult.',
            notes: 'Non-purulent cellulitis: Cefazolin 2g IV q8h or Ceftriaxone 1-2g IV q24h. Purulent / MRSA: Vancomycin load 25-30 mg/kg TBW. Suspected necrotizing fasciitis: Meropenem 1g IV q8h + Vancomycin + Clindamycin 900mg IV q8h (toxin suppression) + STAT Surgical Consult.'
        },
        sepsis_unknown: {
            id: 'sepsis_unknown',
            name: 'Sepsis of Unknown Origin / Septic Shock',
            thName: 'ภาวะพิษเหตุติดเชื้อไม่ทราบแหล่ง / ช็อกเหตุติดเชื้อ',
            icon: '⚡',
            category: 'Critical Care',
            primaryDrugs: ['pip_tazo', 'cefepime', 'meropenem', 'vancomycin'],
            firstLine: ['pip_tazo', 'cefepime', 'meropenem', 'vancomycin'],
            altDrugs: ['gentamicin', 'amikacin', 'levofloxacin', 'colistin'],
            alternatives: ['gentamicin', 'amikacin', 'levofloxacin', 'colistin'],
            clinicalGuidance: 'Surviving Sepsis Campaign: Administer broad-spectrum IV antimicrobials within 1 hour. Full loading doses of both beta-lactam (Pip/Tazo 4.5g or Cefepime 2g or Meropenem 1g) and Vancomycin (25-30 mg/kg TBW) regardless of renal dysfunction!',
            notes: 'Surviving Sepsis Campaign: Administer broad-spectrum IV antimicrobials within 1 hour. Full loading doses of both beta-lactam (Pip/Tazo 4.5g or Cefepime 2g or Meropenem 1g) and Vancomycin (25-30 mg/kg TBW) regardless of renal dysfunction!'
        },
        osteo_native: {
            id: 'osteo_native',
            name: 'Native Osteomyelitis / Septic Arthritis',
            thName: 'กระดูกและข้ออักเสบ',
            icon: '🦴',
            category: 'Bone & Joint',
            primaryDrugs: ['cefazolin', 'ceftriaxone', 'vancomycin', 'daptomycin'],
            firstLine: ['cefazolin', 'ceftriaxone', 'vancomycin', 'daptomycin'],
            altDrugs: ['ciprofloxacin', 'levofloxacin', 'linezolid'],
            alternatives: ['ciprofloxacin', 'levofloxacin', 'linezolid'],
            clinicalGuidance: 'Often requires prolonged IV therapy (4-6 weeks). Fluoroquinolones and Linezolid have excellent bone penetration.',
            notes: 'Often requires prolonged IV therapy (4-6 weeks). Fluoroquinolones and Linezolid have excellent bone penetration.'
        }
    },

    // ------------------------------------------------------------------------
    // 4. Stanford Antimicrobial Database (Approved August 2026)
    // ------------------------------------------------------------------------
    STANFORD_ABX_DB: {
        // --- 1. Ceftriaxone ---
        ceftriaxone: {
            id: 'ceftriaxone',
            name: 'Ceftriaxone',
            class: '3rd Gen Cephalosporin',
            route: 'IV',
            stdDose: '1-2g IV q24h',
            renalTiers: {
                crcl_gt_50: { dose: '1-2g', freq: 'q24h', infusion: 'IV over 30 min', notes: '2g q12h for meningitis' },
                crcl_30_50: { dose: '1-2g', freq: 'q24h', infusion: 'IV over 30 min', notes: 'No renal adjustment required' },
                crcl_10_29: { dose: '1-2g', freq: 'q24h', infusion: 'IV over 30 min', notes: 'No renal adjustment required' },
                crcl_lt_10: { dose: '1-2g', freq: 'q24h', infusion: 'IV over 30 min', notes: 'Max 2g/day in non-CNS infections' },
                hd: { dose: '1-2g', freq: 'q24h', infusion: 'IV over 30 min', postHD: 'No supplemental dose needed' },
                crrt: { dose: '1-2g', freq: 'q24h', infusion: 'IV over 30 min', notes: '2g q12h for meningitis' }
            },
            indications: {
                cap: { defaultDose: '1-2g', frequency: 'q24h', infusion: 'IV over 30 min', notes: 'Usually 1g for ward, 2g for severe.' },
                uti_pyelo: { defaultDose: '1-2g', frequency: 'q24h', infusion: 'IV over 30 min', notes: 'Initial empiric coverage' },
                meningitis_ca: { defaultDose: '2g', frequency: 'q12h', infusion: 'IV over 30 min', notes: 'Max dose needed for CNS penetration.' },
                meningitis: { defaultDose: '2g', frequency: 'q12h', infusion: 'IV over 30 min', notes: 'Max dose needed for CNS penetration.' },
                intra_abdominal: { defaultDose: '1-2g', frequency: 'q24h', infusion: 'IV over 30 min', notes: 'Combine with Metronidazole for anaerobes.' },
                skin_soft_tissue: { defaultDose: '1-2g', frequency: 'q24h', infusion: 'IV over 30 min', notes: 'Non-purulent severe cellulitis.' },
                osteo_native: { defaultDose: '2g', frequency: 'q24h', infusion: 'IV over 30 min', notes: '' }
            },
            safetyNotes: 'No renal dose adjustment required for Ceftriaxone. Dual biliary/renal elimination. Avoid with IV calcium in neonates (precipitation).'
        },

        // --- 2. Cefepime ---
        cefepime: {
            id: 'cefepime',
            name: 'Cefepime',
            class: '4th Gen Cephalosporin',
            route: 'IV',
            stdDose: '2g IV q8h',
            renalTiers: {
                crcl_gt_50: { dose: '2g', freq: 'q8h', infusion: 'IV over 3-4h (extended)', notes: '1-2g q12h for mild-moderate UTI' },
                crcl_30_50: { dose: '2g', freq: 'q12h', infusion: 'IV over 3-4h (extended)', notes: 'Renal adjustment required' },
                crcl_10_29: { dose: '2g', freq: 'q24h', infusion: 'IV over 3-4h (extended)', notes: 'Or 1g q24h for mild infections' },
                crcl_lt_10: { dose: '1g', freq: 'q24h', infusion: 'IV over 30 min', notes: 'CIN neurotoxicity risk' },
                hd: { dose: '1g', freq: 'q24h', infusion: 'IV over 30 min', postHD: 'Give post-HD on dialysis days' },
                crrt: { dose: '2g', freq: 'q12h', infusion: 'IV over 3-4h', notes: '2g load then 1g q8h or 2g q12h' }
            },
            indications: {
                hap_vap: { defaultDose: '2g', frequency: 'q8h', infusion: 'IV over 4h extended', notes: '4-hr extended infusion recommended.' },
                uti_pyelo: { defaultDose: '1g', frequency: 'q8h', infusion: 'IV over 30 min to 3h', notes: 'Alternatively 2g q12h.' },
                meningitis_ca: { defaultDose: '2g', frequency: 'q8h', infusion: 'IV over 2-3h', notes: 'CNS penetration' },
                meningitis: { defaultDose: '2g', frequency: 'q8h', infusion: 'IV over 2-3h', notes: 'CNS penetration' },
                sepsis_unknown: { defaultDose: '2g', frequency: 'q8h', infusion: 'IV over 4h extended', notes: 'Broad antipseudomonal empiric coverage' }
            },
            safetyNotes: 'High risk of Cefepime-Induced Neurotoxicity (CIN) — encephalopathy, myoclonus, seizures if not adjusted in renal failure. Extended infusion maximizes %fT>MIC.'
        },

        // --- 3. Ampicillin ---
        ampicillin: {
            id: 'ampicillin',
            name: 'Ampicillin',
            class: 'Aminopenicillin',
            route: 'IV',
            stdDose: '1-2g IV q6h (2g q4h for meningitis)',
            renalTiers: {
                crcl_gt_50: { dose: '2g', freq: 'q4h', infusion: 'IV over 30 min', notes: '1-2g q6h for non-CNS infections' },
                crcl_30_50: { dose: '1-2g', freq: 'q6h', infusion: 'IV over 30 min', notes: '' },
                crcl_10_29: { dose: '1-2g', freq: 'q8-12h', infusion: 'IV over 30 min', notes: '' },
                crcl_lt_10: { dose: '1-2g', freq: 'q12-24h', infusion: 'IV over 30 min', notes: '' },
                hd: { dose: '1-2g', freq: 'q24h', infusion: 'IV over 30 min', postHD: 'Give post-HD on dialysis days' },
                crrt: { dose: '2g', freq: 'q8h', infusion: 'IV over 30 min', notes: '' }
            },
            indications: {
                meningitis_ca: { defaultDose: '2g', frequency: 'q4h', infusion: 'IV over 30 min', notes: 'Essential for Listeria monocytogenes in age >50 or immunocompromised.' },
                meningitis: { defaultDose: '2g', frequency: 'q4h', infusion: 'IV over 30 min', notes: 'Essential for Listeria monocytogenes in age >50 or immunocompromised.' },
                uti_pyelo: { defaultDose: '1-2g', frequency: 'q6h', infusion: 'IV over 30 min', notes: 'Enterococcus faecalis coverage.' },
                cap: { defaultDose: '1-2g', frequency: 'q6h', infusion: 'IV over 30 min', notes: 'Susceptible S. pneumoniae.' }
            },
            safetyNotes: 'High incidence of rash. Rapid IV push can cause seizures.'
        },

        // --- 4. Levofloxacin ---
        levofloxacin: {
            id: 'levofloxacin',
            name: 'Levofloxacin',
            class: 'Respiratory Fluoroquinolone',
            route: 'IV/PO',
            stdDose: '750mg IV/PO q24h',
            renalTiers: {
                crcl_gt_50: { dose: '750mg', freq: 'q24h', infusion: 'IV over 90 min or PO', notes: '500mg q24h for mild-moderate' },
                crcl_30_50: { dose: '750mg x1, then 500mg', freq: 'q48h', infusion: 'IV/PO', notes: 'Or 500mg load then 250mg q24h' },
                crcl_10_29: { dose: '750mg x1, then 500mg', freq: 'q48h', infusion: 'IV/PO', notes: 'Requires full loading dose' },
                crcl_lt_10: { dose: '750mg x1, then 500mg', freq: 'q48h', infusion: 'IV/PO', notes: '' },
                hd: { dose: '750mg x1, then 500mg', freq: 'q48h', infusion: 'IV/PO', postHD: 'Give post-HD; not significantly removed by dialysis' },
                crrt: { dose: '750mg x1, then 500mg', freq: 'q24h', infusion: 'IV/PO', notes: '' }
            },
            indications: {
                cap: { defaultDose: '750mg', frequency: 'q24h', infusion: 'IV over 90 min or PO', notes: '5-day course for inpatient CAP' },
                hap_vap: { defaultDose: '750mg', frequency: 'q24h', infusion: 'IV over 90 min', notes: 'Part of antipseudomonal combination' },
                uti_pyelo: { defaultDose: '750mg', frequency: 'q24h', infusion: 'IV/PO', notes: '5 days for uncomplicated pyelo' },
                uti_cystitis: { defaultDose: '250mg', frequency: 'q24h', infusion: 'PO', notes: '3-day course (alternative choice)' },
                sepsis_unknown: { defaultDose: '750mg', frequency: 'q24h', infusion: 'IV over 90 min', notes: 'Broad gram-negative alternative' },
                osteo_native: { defaultDose: '750mg', frequency: 'q24h', infusion: 'IV/PO', notes: 'Excellent bone bioavailability' }
            },
            safetyNotes: '100% oral bioavailability (PO = IV). Requires full loading dose even in renal impairment. Black box warnings: tendonitis/rupture, peripheral neuropathy, CNS effects, QTc prolongation.'
        },

        // --- 5. Meropenem ---
        meropenem: {
            id: 'meropenem',
            name: 'Meropenem',
            class: 'Carbapenem',
            route: 'IV',
            stdDose: '1g IV q8h (2g q8h for meningitis)',
            renalTiers: {
                crcl_gt_50: { dose: '1g', freq: 'q8h', infusion: 'IV over 3h extended (or 30 min)', notes: '2g q8h for meningitis or severe Pseudomonas' },
                crcl_30_50: { dose: '1g', freq: 'q12h', infusion: 'IV over 3h extended', notes: '1g q8h for meningitis' },
                crcl_10_29: { dose: '500mg', freq: 'q12h', infusion: 'IV over 3h extended', notes: '1g q12h for meningitis' },
                crcl_lt_10: { dose: '500mg', freq: 'q24h', infusion: 'IV over 30 min to 3h', notes: '1g q24h for meningitis' },
                hd: { dose: '500mg', freq: 'q24h', infusion: 'IV over 30 min', postHD: 'Give post-HD on dialysis days (1g q24h for meningitis)' },
                crrt: { dose: '1g', freq: 'q8h', infusion: 'IV over 3h', notes: 'CF/CNS: 2g IV q12h' }
            },
            indications: {
                meningitis_ca: { defaultDose: '2g', frequency: 'q8h', infusion: 'IV over 3h extended', notes: 'High-dose required for CNS penetration' },
                meningitis: { defaultDose: '2g', frequency: 'q8h', infusion: 'IV over 3h extended', notes: 'High-dose required for CNS penetration' },
                hap_vap: { defaultDose: '1-2g', frequency: 'q8h', infusion: 'IV over 3h extended', notes: 'Broad antipseudomonal & ESBL coverage' },
                intra_abdominal: { defaultDose: '1g', frequency: 'q8h', infusion: 'IV over 3h extended', notes: 'First-line for severe/high-risk secondary peritonitis' },
                sepsis_unknown: { defaultDose: '1g', frequency: 'q8h', infusion: 'IV over 3h extended', notes: 'Broad spectrum empiric carbapenem' },
                uti_pyelo: { defaultDose: '500mg-1g', frequency: 'q8h', infusion: 'IV over 30 min to 3h', notes: 'For documented/suspected ESBL pathogens' },
                skin_soft_tissue: { defaultDose: '1g', frequency: 'q8h', infusion: 'IV over 3h extended', notes: 'Severe polymicrobial necrotizing infections' }
            },
            safetyNotes: 'Drastically reduces serum valproic acid levels leading to refractory seizures (contraindicated combination). Lower epileptogenic risk than imipenem.'
        },

        // --- 6. Piperacillin / Tazobactam ---
        pip_tazo: {
            id: 'pip_tazo',
            name: 'Piperacillin / Tazobactam',
            class: 'Antipseudomonal Penicillin + Inhibitor',
            route: 'IV',
            stdDose: '4.5g IV q8h (infused over 4 hours)',
            renalTiers: {
                crcl_gt_50: { dose: '4.5g', freq: 'q8h', infusion: 'IV over 4h extended', notes: 'Standard: 3.375g q6h over 30 min. Sepsis: 4.5g load over 30 min then 4.5g q8h over 4h' },
                crcl_30_50: { dose: '3.375g', freq: 'q8h', infusion: 'IV over 4h extended', notes: 'Standard: 2.25g q6h over 30 min' },
                crcl_10_29: { dose: '2.25g', freq: 'q8h', infusion: 'IV over 4h extended', notes: 'Standard: 2.25g q8h over 30 min' },
                crcl_lt_10: { dose: '2.25g', freq: 'q12h', infusion: 'IV over 4h (or 30 min)', notes: 'Or 3.375g q12h over 4h' },
                hd: { dose: '2.25g', freq: 'q12h', infusion: 'IV over 30 min', postHD: 'Give post-HD on dialysis days (or 2.25g q8h with 0.75g post-HD)' },
                crrt: { dose: '3.375g', freq: 'q8h', infusion: 'IV over 4h', notes: 'Or 2.25g q6h over 30 min' }
            },
            indications: {
                hap_vap: { defaultDose: '4.5g', frequency: 'q8h', infusion: 'IV over 4h extended', notes: 'Antipseudomonal core beta-lactam' },
                intra_abdominal: { defaultDose: '3.375-4.5g', frequency: 'q8h', infusion: 'IV over 4h extended', notes: 'Provides excellent anaerobic and enterococcal coverage' },
                sepsis_unknown: { defaultDose: '4.5g', frequency: 'q8h', infusion: 'IV over 4h extended', notes: 'Load 4.5g over 30 min, then 4.5g q8h over 4h' },
                skin_soft_tissue: { defaultDose: '3.375g', frequency: 'q6h or 4.5g q8h', infusion: 'IV over 4h', notes: 'Complicated diabetic foot / polymicrobial SSTI' },
                uti_pyelo: { defaultDose: '3.375g', frequency: 'q6h or 3.375g q8h over 4h', infusion: 'IV', notes: 'Complicated urosepsis with pseudomonas risk' }
            },
            safetyNotes: 'Synergistic nephrotoxicity when combined with Vancomycin. Contains ~2.79 mEq (64 mg) sodium per gram.'
        },

        // --- 7. Vancomycin ---
        vancomycin: {
            id: 'vancomycin',
            name: 'Vancomycin',
            class: 'Glycopeptide',
            route: 'IV',
            stdDose: 'Load: 25-30 mg/kg TBW; Maint: 15-20 mg/kg q8-12h',
            renalTiers: {
                crcl_gt_50: { dose: '15-20 mg/kg', freq: 'q8-12h', infusion: 'IV at rate <= 1000 mg/hr', notes: 'Loading dose: 25-30 mg/kg TBW (max 3000mg) in severe sepsis regardless of CrCl' },
                crcl_30_50: { dose: '15-20 mg/kg', freq: 'q24h', infusion: 'IV at rate <= 1000 mg/hr', notes: 'Load 25-30 mg/kg TBW first' },
                crcl_10_29: { dose: '15 mg/kg', freq: 'q48h', infusion: 'IV at rate <= 1000 mg/hr', notes: 'Load 20-25 mg/kg TBW, then redose by serum levels' },
                crcl_lt_10: { dose: '15 mg/kg x1', freq: 'Dose by level', infusion: 'IV', notes: 'Load 15-20 mg/kg TBW, redose when trough < 15 mcg/mL' },
                hd: { dose: '10-15 mg/kg', freq: 'post-HD', infusion: 'IV', postHD: 'Load 20-25 mg/kg post-HD; maintenance 500-1000mg (7.5-10 mg/kg) post-dialysis' },
                crrt: { dose: '15 mg/kg load then 7.5-10 mg/kg', freq: 'q12h (or 15 mg/kg q24h)', infusion: 'IV', notes: 'Monitor trough or AUC24/MIC target 400-600' }
            },
            indications: {
                meningitis_ca: { defaultDose: '25-30 mg/kg load then 15-20 mg/kg', frequency: 'q8-12h', infusion: 'IV at <= 1000 mg/hr', notes: 'Trough target 15-20 mcg/mL. Co-prescribe with Ceftriaxone 2g q12h' },
                meningitis: { defaultDose: '25-30 mg/kg load then 15-20 mg/kg', frequency: 'q8-12h', infusion: 'IV at <= 1000 mg/hr', notes: 'Trough target 15-20 mcg/mL. Co-prescribe with Ceftriaxone 2g q12h' },
                hap_vap: { defaultDose: '25-30 mg/kg load then 15-20 mg/kg', frequency: 'q8-12h', infusion: 'IV at <= 1000 mg/hr', notes: 'Empiric MRSA coverage, target AUC/MIC 400-600' },
                sepsis_unknown: { defaultDose: '25-30 mg/kg load then 15-20 mg/kg', frequency: 'q8-12h', infusion: 'IV at <= 1000 mg/hr', notes: 'Mandatory STAT loading dose in septic shock' },
                skin_soft_tissue: { defaultDose: '25-30 mg/kg load then 15-20 mg/kg', frequency: 'q12h', infusion: 'IV', notes: 'Purulent cellulitis / MRSA risk' },
                cap: { defaultDose: '25-30 mg/kg load then 15-20 mg/kg', frequency: 'q12h', infusion: 'IV', notes: 'Add if MRSA risk factors present (cavitation, prior MRSA)' },
                osteo_native: { defaultDose: '15-20 mg/kg', frequency: 'q12h', infusion: 'IV', notes: 'Target trough 15-20 mcg/mL' }
            },
            safetyNotes: 'Loading dose MUST use Actual Body Weight (TBW) even in renal impairment. Infuse at rate <= 1000 mg/hr (>= 1-2 hours) to avoid Histamine-related Red Man Syndrome. High nephrotoxicity risk with Pip/Tazo.'
        },

        // --- 8. Ciprofloxacin ---
        ciprofloxacin: {
            id: 'ciprofloxacin',
            name: 'Ciprofloxacin',
            class: 'Fluoroquinolone',
            route: 'IV/PO',
            stdDose: '400mg IV q8-12h (or 500mg PO q12h)',
            renalTiers: {
                crcl_gt_50: { dose: '400mg IV (or 500mg PO)', freq: 'q12h (q8h severe)', infusion: 'IV over 60 min or PO', notes: '400mg IV q8h for severe Pseudomonas' },
                crcl_30_50: { dose: '400mg IV (or 250-500mg PO)', freq: 'q12h', infusion: 'IV over 60 min or PO', notes: '' },
                crcl_10_29: { dose: '400mg IV (or 250-500mg PO)', freq: 'q18-24h', infusion: 'IV over 60 min or PO', notes: '' },
                crcl_lt_10: { dose: '400mg IV (or 250-500mg PO)', freq: 'q24h', infusion: 'IV over 60 min or PO', notes: '' },
                hd: { dose: '400mg IV (or 250-500mg PO)', freq: 'q24h', infusion: 'IV/PO', postHD: 'Administer post-HD on dialysis days' },
                crrt: { dose: '400mg IV', freq: 'q12h', infusion: 'IV over 60 min', notes: '' }
            },
            indications: {
                uti_pyelo: { defaultDose: '400mg IV (or 500mg PO)', frequency: 'q12h', infusion: 'IV/PO', notes: '7-day course for uncomplicated acute pyelonephritis' },
                uti_cystitis: { defaultDose: '250mg PO', frequency: 'q12h', infusion: 'PO', notes: '3-day course (alternative choice)' },
                intra_abdominal: { defaultDose: '400mg IV', frequency: 'q12h', infusion: 'IV', notes: 'Combine with Metronidazole 500mg q8h' },
                hap_vap: { defaultDose: '400mg IV', frequency: 'q8h', infusion: 'IV over 60 min', notes: 'High dose for antipseudomonal combination therapy' },
                osteo_native: { defaultDose: '400mg IV or 500-750mg PO', frequency: 'q12h', infusion: 'IV/PO', notes: 'Excellent bone penetration' }
            },
            safetyNotes: 'FDA Black Box Warnings: tendonitis/rupture, peripheral neuropathy, CNS effects, aortic aneurysm. Chelation with polyvalent cations (antacids, calcium, iron). QTc prolongation.'
        },

        // --- 9. Cefazolin ---
        cefazolin: {
            id: 'cefazolin',
            name: 'Cefazolin',
            class: '1st Gen Cephalosporin',
            route: 'IV',
            stdDose: '2g IV q8h (3g if > 120kg)',
            renalTiers: {
                crcl_gt_50: { dose: '2g', freq: 'q8h', infusion: 'IV over 30 min', notes: '3g if weight > 120 kg' },
                crcl_30_50: { dose: '2g', freq: 'q12h', infusion: 'IV over 30 min', notes: '' },
                crcl_10_29: { dose: '1g', freq: 'q12h', infusion: 'IV over 30 min', notes: '' },
                crcl_lt_10: { dose: '1g', freq: 'q24h', infusion: 'IV over 30 min', notes: '' },
                hd: { dose: '1-2g', freq: 'post-HD', infusion: 'IV over 30 min', postHD: 'Administer post-HD on dialysis days' },
                crrt: { dose: '2g', freq: 'q12h', infusion: 'IV over 30 min', notes: '' }
            },
            indications: {
                skin_soft_tissue: { defaultDose: '2g', frequency: 'q8h', infusion: 'IV over 30 min', notes: 'Drug of choice for MSSA cellulitis' },
                osteo_native: { defaultDose: '2g', frequency: 'q8h', infusion: 'IV over 30 min', notes: 'MSSA osteomyelitis / septic arthritis' }
            },
            safetyNotes: 'Drug of choice for severe MSSA infections. Well tolerated.'
        },

        // --- 10. Metronidazole ---
        metronidazole: {
            id: 'metronidazole',
            name: 'Metronidazole',
            class: 'Nitroimidazole',
            route: 'IV/PO',
            stdDose: '500mg IV/PO q8h',
            renalTiers: {
                crcl_gt_50: { dose: '500mg', freq: 'q8h', infusion: 'IV over 30-60 min or PO', notes: 'Hepatic metabolism' },
                crcl_30_50: { dose: '500mg', freq: 'q8h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                crcl_10_29: { dose: '500mg', freq: 'q8h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                crcl_lt_10: { dose: '250mg q8h or 500mg', freq: 'q12h', infusion: 'IV/PO', notes: '50% dose reduction in ESRD' },
                hd: { dose: '500mg', freq: 'q12h', infusion: 'IV/PO', postHD: 'Give dose post-HD' },
                crrt: { dose: '500mg', freq: 'q8h', infusion: 'IV/PO', notes: '' }
            },
            indications: {
                intra_abdominal: { defaultDose: '500mg', frequency: 'q8h', infusion: 'IV/PO', notes: 'Essential anaerobic coverage (Bacteroides fragilis)' }
            },
            safetyNotes: 'Disulfiram-like reaction with alcohol. Peripheral neuropathy with prolonged use.'
        },

        // --- 11. Azithromycin ---
        azithromycin: {
            id: 'azithromycin',
            name: 'Azithromycin',
            class: 'Macrolide',
            route: 'IV/PO',
            stdDose: '500mg IV/PO q24h',
            renalTiers: {
                crcl_gt_50: { dose: '500mg', freq: 'q24h', infusion: 'IV over 60 min or PO', notes: 'Biliary elimination' },
                crcl_30_50: { dose: '500mg', freq: 'q24h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                crcl_10_29: { dose: '500mg', freq: 'q24h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                crcl_lt_10: { dose: '500mg', freq: 'q24h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                hd: { dose: '500mg', freq: 'q24h', infusion: 'IV/PO', postHD: 'No supplemental dose needed' },
                crrt: { dose: '500mg', freq: 'q24h', infusion: 'IV/PO', notes: 'No renal adjustment needed' }
            },
            indications: {
                cap: { defaultDose: '500mg', frequency: 'q24h', infusion: 'IV/PO', notes: 'Atypical coverage (Legionella, Mycoplasma, Chlamydia)' }
            },
            safetyNotes: 'QTc prolongation risk. Biliary excretion, no renal adjustment required.'
        },

        // --- 12. Gentamicin ---
        gentamicin: {
            id: 'gentamicin',
            name: 'Gentamicin',
            class: 'Aminoglycoside',
            route: 'IV',
            stdDose: '5-7 mg/kg IV q24h (high-dose) or 1.5-2 mg/kg q8h',
            renalTiers: {
                crcl_gt_50: { dose: '5-7 mg/kg (or 1.7 mg/kg)', freq: 'q24h (or q8h)', infusion: 'IV over 60 min', notes: 'Use AdjBW if obese' },
                crcl_30_50: { dose: '5-7 mg/kg (or 1.5 mg/kg)', freq: 'q36-48h (or q12-24h)', infusion: 'IV over 60 min', notes: 'Extend interval' },
                crcl_10_29: { dose: '1-1.5 mg/kg', freq: 'q24-48h', infusion: 'IV over 60 min', notes: 'Dose by therapeutic level' },
                crcl_lt_10: { dose: '1-1.5 mg/kg x1', freq: 'Dose by level', infusion: 'IV over 60 min', notes: 'Redose when level < 1-2 mcg/mL' },
                hd: { dose: '1-1.5 mg/kg', freq: 'post-HD', infusion: 'IV', postHD: 'Administer post-HD on dialysis days' },
                crrt: { dose: '1.5-2.5 mg/kg', freq: 'q24h', infusion: 'IV', notes: 'Monitor peak and trough levels' }
            },
            indications: {
                hap_vap: { defaultDose: '5-7 mg/kg', frequency: 'q24h', infusion: 'IV over 60 min', notes: 'Synergistic antipseudomonal gram-negative coverage' },
                sepsis_unknown: { defaultDose: '5-7 mg/kg', frequency: 'q24h', infusion: 'IV over 60 min', notes: 'Single empiric dose in severe septic shock' }
            },
            safetyNotes: 'High nephrotoxicity and ototoxicity risk. Always use Adjusted Body Weight (AdjBW) in obese patients. Therapeutic drug monitoring mandatory.'
        },

        // --- 13. Amikacin (Stanford Guide) ---
        amikacin: {
            id: 'amikacin',
            name: 'Amikacin',
            class: 'Aminoglycoside',
            route: 'IV',
            stdDose: '15-20 mg/kg IV q24h (high-dose) or 7.5 mg/kg q12h',
            renalTiers: {
                crcl_gt_50: { dose: '15-20 mg/kg', freq: 'q24h', infusion: 'IV over 60 min', notes: 'High-dose extended interval' },
                crcl_30_50: { dose: '15 mg/kg', freq: 'q36-48h', infusion: 'IV over 60 min', notes: 'Extend interval based on levels' },
                crcl_10_29: { dose: '7.5-10 mg/kg', freq: 'q48h', infusion: 'IV over 60 min', notes: 'Dose by therapeutic drug monitoring' },
                crcl_lt_10: { dose: '7.5 mg/kg x1', freq: 'Dose by level', infusion: 'IV over 60 min', notes: 'Redose when trough < 4-5 mcg/mL' },
                hd: { dose: '7.5 mg/kg', freq: 'post-HD', infusion: 'IV over 60 min', postHD: 'Administer post-HD on dialysis days' },
                crrt: { dose: '10-15 mg/kg', freq: 'q24-48h', infusion: 'IV', notes: 'Monitor trough level' }
            },
            safetyNotes: 'Use Adjusted Body Weight (ABW) for obese patients. Monitor peak (55-65 mcg/mL) and trough (< 4-5 mcg/mL). Nephrotoxic and ototoxic.'
        },

        // --- 14. Ampicillin / Sulbactam (Unasyn) ---
        amp_sulb: {
            id: 'amp_sulb',
            name: 'Ampicillin / Sulbactam',
            class: 'Aminopenicillin + Inhibitor',
            route: 'IV',
            stdDose: '1.5-3g IV q6h',
            renalTiers: {
                crcl_gt_50: { dose: '1.5-3g', freq: 'q6h', infusion: 'IV over 30 min', notes: 'Acinetobacter: 3g q4h' },
                crcl_30_50: { dose: '1.5-3g', freq: 'q8h', infusion: 'IV over 30 min', notes: 'Acinetobacter: 3g q8h' },
                crcl_10_29: { dose: '1.5-3g', freq: 'q12h', infusion: 'IV over 30 min', notes: 'Acinetobacter: 3g q12h' },
                crcl_lt_10: { dose: '1.5-3g', freq: 'q24h', infusion: 'IV over 30 min', notes: 'Acinetobacter: 3g q12h' },
                hd: { dose: '1.5-3g', freq: 'q24h', infusion: 'IV over 30 min', postHD: 'Give dose post-HD on dialysis days' },
                crrt: { dose: '3g', freq: 'q8h', infusion: 'IV over 30 min', notes: 'Acinetobacter: 3g q6h' }
            },
            indications: {
                intra_abdominal: { defaultDose: '3g', frequency: 'q6h', notes: 'Empiric coverage for mild-mod IAI' },
                skin_soft_tissue: { defaultDose: '1.5-3g', frequency: 'q6h', notes: 'Diabetic foot / human/animal bites' }
            },
            safetyNotes: 'Sulbactam has intrinsic activity against Acinetobacter baumannii (requires high sulbactam exposure, e.g. 6-9g/day sulbactam).'
        },

        // --- 15. Amoxicillin / Clavulanate (Augmentin) ---
        amox_clav: {
            id: 'amox_clav',
            name: 'Amoxicillin / Clavulanate',
            class: 'Aminopenicillin + Inhibitor',
            route: 'PO',
            stdDose: '875/125 mg PO q12h (or 500/125 mg PO q8h)',
            renalTiers: {
                crcl_gt_50: { dose: '875 mg', freq: 'q12h (or 500 mg q8h)', infusion: 'PO', notes: 'Take with food to minimize GI distress' },
                crcl_30_50: { dose: '875 mg', freq: 'q12h', infusion: 'PO', notes: 'Or 500 mg q8h' },
                crcl_10_29: { dose: '250-500 mg', freq: 'q12h', infusion: 'PO', notes: 'Do NOT use 875mg tablet' },
                crcl_lt_10: { dose: '250-500 mg', freq: 'q24h', infusion: 'PO', notes: 'Do NOT use 875mg tablet' },
                hd: { dose: '250-500 mg', freq: 'q24h', infusion: 'PO', postHD: 'Administer post-HD on dialysis days plus additional dose' },
                crrt: { dose: '500 mg', freq: 'q8-12h', infusion: 'PO', notes: '' }
            },
            safetyNotes: 'High incidence of diarrhea/nausea. In renal impairment (CrCl < 30 mL/min), do NOT use the 875 mg tablet due to excessive clavulanate relative to amoxicillin.'
        },

        // --- 16. Aztreonam ---
        aztreonam: {
            id: 'aztreonam',
            name: 'Aztreonam',
            class: 'Monobactam',
            route: 'IV',
            stdDose: '1-2g IV q8h',
            renalTiers: {
                crcl_gt_50: { dose: '1-2g', freq: 'q8h', infusion: 'IV over 30 min', notes: '2g q6-8h for severe/Pseudomonas' },
                crcl_30_50: { dose: '1-2g', freq: 'q8h', infusion: 'IV over 30 min', notes: 'Standard dose for mild-mod' },
                crcl_10_29: { dose: '1g', freq: 'q8h (or 50% dose)', infusion: 'IV over 30 min', notes: 'Severe: 1g q6-8h' },
                crcl_lt_10: { dose: '500mg', freq: 'q8h (or 25% dose)', infusion: 'IV over 30 min', notes: 'Severe: 500mg q6h' },
                hd: { dose: '500mg', freq: 'q8h', infusion: 'IV over 30 min', postHD: 'Give 1/8th of initial dose post-HD' },
                crrt: { dose: '1-2g', freq: 'q8h', infusion: 'IV over 30 min', notes: 'Effluent dependent' }
            },
            safetyNotes: 'Safe in patients with severe IgE-mediated beta-lactam allergy EXCEPT those with specific Ceftazidime allergy (shares identical side chain).'
        },

        // --- 17. Ceftazidime ---
        ceftazidime: {
            id: 'ceftazidime',
            name: 'Ceftazidime',
            class: '3rd Gen Cephalosporin (Antipseudomonal)',
            route: 'IV',
            stdDose: '2g IV q8h',
            renalTiers: {
                crcl_gt_50: { dose: '2g', freq: 'q8h', infusion: 'IV over 30 min - 2h', notes: 'Antipseudomonal 3rd gen' },
                crcl_30_50: { dose: '1-2g', freq: 'q12h', infusion: 'IV over 30 min', notes: '' },
                crcl_10_29: { dose: '1g', freq: 'q12-24h', infusion: 'IV over 30 min', notes: 'CrCl 16-30: 1g q24h' },
                crcl_lt_10: { dose: '500mg', freq: 'q24-48h', infusion: 'IV over 30 min', notes: '' },
                hd: { dose: '1g load then 500mg-1g', freq: 'q24h', infusion: 'IV', postHD: 'Administer post-HD on dialysis days' },
                crrt: { dose: '2g load then 1g', freq: 'q8h', infusion: 'IV', notes: 'Or 2g q12h' }
            },
            safetyNotes: 'Neurotoxicity risk in severe renal impairment without dose adjustment. High risk of inducing AmpC beta-lactamases.'
        },

        // --- 18. Ceftazidime / Avibactam (Zavicefta) ---
        ceftaz_avi: {
            id: 'ceftaz_avi',
            name: 'Ceftazidime / Avibactam',
            class: 'Cephalosporin + Novel BLI',
            route: 'IV',
            stdDose: '2.5g (2g/0.5g) IV q8h over 2 hours',
            renalTiers: {
                crcl_gt_50: { dose: '2.5g', freq: 'q8h', infusion: 'IV over 2 hours', notes: 'Active against KPC, OXA-48 carbapenemases' },
                crcl_30_50: { dose: '1.25g', freq: 'q8h', infusion: 'IV over 2 hours', notes: 'CrCl 31-50' },
                crcl_10_29: { dose: '0.94g', freq: 'q12h', infusion: 'IV over 2 hours', notes: 'CrCl 16-30' },
                crcl_lt_10: { dose: '0.94g', freq: 'q24-48h', infusion: 'IV over 2 hours', notes: 'CrCl 6-15: q24h; <6: q48h' },
                hd: { dose: '0.94g', freq: 'q48h', infusion: 'IV over 2 hours', postHD: 'Administer post-HD on dialysis days' },
                crrt: { dose: '1.25g', freq: 'q8h', infusion: 'IV over 2 hours', notes: '' }
            },
            safetyNotes: 'Reserve for documented Carbapenem-Resistant Enterobacterales (CRE - KPC/OXA-48) or DTR Pseudomonas aeruginosa.'
        },

        // --- 19. Ceftaroline (Teflaro) ---
        ceftaroline: {
            id: 'ceftaroline',
            name: 'Ceftaroline',
            class: '5th Gen Cephalosporin (Anti-MRSA)',
            route: 'IV',
            stdDose: '600mg IV q12h',
            renalTiers: {
                crcl_gt_50: { dose: '600mg', freq: 'q12h', infusion: 'IV over 60 min', notes: '600mg q8h for severe endocarditis' },
                crcl_30_50: { dose: '400mg', freq: 'q12h', infusion: 'IV over 60 min', notes: '' },
                crcl_10_29: { dose: '300mg', freq: 'q12h', infusion: 'IV over 60 min', notes: 'CrCl 15-30' },
                crcl_lt_10: { dose: '200mg', freq: 'q12h', infusion: 'IV over 60 min', notes: 'CrCl < 15' },
                hd: { dose: '200mg', freq: 'q12h', infusion: 'IV over 60 min', postHD: 'Administer post-HD on dialysis days' },
                crrt: { dose: '400mg', freq: 'q12h', infusion: 'IV over 60 min', notes: '' }
            },
            safetyNotes: 'Only FDA-approved cephalosporin with MRSA activity (binds PBP2a). Direct Coombs test seroconversion common.'
        },

        // --- 20. Colistin (Colistimethate Sodium / CMS) ---
        colistin: {
            id: 'colistin',
            name: 'Colistin (CMS)',
            class: 'Polymyxin',
            route: 'IV',
            stdDose: 'Load: 300 mg CBA (9-10 MU); Maint: 150 mg CBA (4.5 MU) q12h',
            renalTiers: {
                crcl_gt_50: { dose: '150 mg CBA (4.5 MU)', freq: 'q12h', infusion: 'IV over 60 min', notes: 'Always give 300 mg CBA (9-10 MU) loading dose first!' },
                crcl_30_50: { dose: '100-130 mg CBA (3-4 MU)', freq: 'q12h', infusion: 'IV over 60 min', notes: 'Load 300 mg CBA first' },
                crcl_10_29: { dose: '75-100 mg CBA (2.5-3 MU)', freq: 'q12h', infusion: 'IV over 60 min', notes: 'Load 300 mg CBA first' },
                crcl_lt_10: { dose: '50-75 mg CBA (1.5-2.25 MU)', freq: 'q12-24h', infusion: 'IV over 60 min', notes: 'Load 300 mg CBA first' },
                hd: { dose: '50 mg CBA (1.5 MU)', freq: 'q12h or 100mg post-HD', infusion: 'IV', postHD: 'Give 50 mg (1.5 MU) supplemental post-HD on dialysis days' },
                crrt: { dose: '100-130 mg CBA (3-4 MU)', freq: 'q12h', infusion: 'IV', notes: 'Load 300 mg CBA first' }
            },
            safetyNotes: '1 mg Colistin Base Activity (CBA) ≈ 30,000 IU (0.03 MU) CMS. Mandatory 300 mg CBA (9 MU) STAT loading dose in severe sepsis. High nephrotoxicity & neurotoxicity.'
        },

        // --- 21. Daptomycin ---
        daptomycin: {
            id: 'daptomycin',
            name: 'Daptomycin',
            class: 'Lipopeptide',
            route: 'IV',
            stdDose: '6-8 mg/kg IV q24h (8-10 mg/kg for bacteremia/endocarditis)',
            renalTiers: {
                crcl_gt_50: { dose: '6-8 mg/kg', freq: 'q24h', infusion: 'IV over 30 min', notes: '8-10 mg/kg for bacteremia/endocarditis' },
                crcl_30_50: { dose: '6-8 mg/kg', freq: 'q24h', infusion: 'IV over 30 min', notes: 'Standard dose' },
                crcl_10_29: { dose: '6-8 mg/kg', freq: 'q48h', infusion: 'IV over 30 min', notes: 'Extend interval to q48h' },
                crcl_lt_10: { dose: '6-8 mg/kg', freq: 'q48h', infusion: 'IV over 30 min', notes: 'Extend interval to q48h' },
                hd: { dose: '6-8 mg/kg', freq: 'q48h', infusion: 'IV', postHD: 'Administer post-HD on dialysis days' },
                crrt: { dose: '6-8 mg/kg', freq: 'q24-48h', infusion: 'IV', notes: 'Monitor CPK weekly' }
            },
            safetyNotes: 'Inactivated by pulmonary surfactant — NEVER use for pneumonia. Monitor baseline and weekly CPK for myopathy / rhabdomyolysis.'
        },

        // --- 22. Doxycycline ---
        doxycycline: {
            id: 'doxycycline',
            name: 'Doxycycline',
            class: 'Tetracycline',
            route: 'IV/PO',
            stdDose: '100mg IV/PO q12h (200mg load for severe)',
            renalTiers: {
                crcl_gt_50: { dose: '100mg', freq: 'q12h', infusion: 'IV over 60 min or PO', notes: '200mg load x1 in severe scrub typhus/melioidosis' },
                crcl_30_50: { dose: '100mg', freq: 'q12h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                crcl_10_29: { dose: '100mg', freq: 'q12h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                crcl_lt_10: { dose: '100mg', freq: 'q12h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                hd: { dose: '100mg', freq: 'q12h', infusion: 'IV/PO', postHD: 'No supplemental dose needed' },
                crrt: { dose: '100mg', freq: 'q12h', infusion: 'IV/PO', notes: 'No renal adjustment needed' }
            },
            safetyNotes: 'Non-renal elimination. Safe in all stages of renal impairment without adjustment. Drug of choice for Rickettsia, Scrub typhus, and atypical pneumonia.'
        },

        // --- 23. Ertapenem ---
        ertapenem: {
            id: 'ertapenem',
            name: 'Ertapenem',
            class: 'Carbapenem (Once-Daily)',
            route: 'IV',
            stdDose: '1g IV q24h',
            renalTiers: {
                crcl_gt_50: { dose: '1g', freq: 'q24h', infusion: 'IV over 30 min', notes: 'No Pseudomonas activity' },
                crcl_30_50: { dose: '1g', freq: 'q24h', infusion: 'IV over 30 min', notes: 'Standard dose' },
                crcl_10_29: { dose: '500mg', freq: 'q24h', infusion: 'IV over 30 min', notes: 'Reduce dose by 50% if CrCl < 30' },
                crcl_lt_10: { dose: '500mg', freq: 'q24h', infusion: 'IV over 30 min', notes: 'CrCl < 10' },
                hd: { dose: '500mg', freq: 'q24h', infusion: 'IV over 30 min', postHD: 'Give dose post-HD (or 150mg supplement if given within 6h of HD)' },
                crrt: { dose: '500mg-1g', freq: 'q24h', infusion: 'IV over 30 min', notes: '' }
            },
            safetyNotes: 'Group 1 carbapenem: lacks activity against Pseudomonas aeruginosa, Acinetobacter, or Enterococcus. Seizure risk in unadjusted renal failure.'
        },

        // --- 24. Fluconazole ---
        fluconazole: {
            id: 'fluconazole',
            name: 'Fluconazole',
            class: 'Triazole Antifungal',
            route: 'IV/PO',
            stdDose: '400-800mg load, then 200-400mg q24h',
            renalTiers: {
                crcl_gt_50: { dose: '200-400mg', freq: 'q24h', infusion: 'IV over 60 min or PO', notes: 'Load 400-800mg x1 in candidemia/invasive' },
                crcl_30_50: { dose: '100-200mg (50% dose)', freq: 'q24h', infusion: 'IV/PO', notes: 'Always give full loading dose first' },
                crcl_10_29: { dose: '100-200mg (50% dose)', freq: 'q24h', infusion: 'IV/PO', notes: 'Load full dose first' },
                crcl_lt_10: { dose: '100-200mg (50% dose)', freq: 'q24-48h', infusion: 'IV/PO', notes: 'Load full dose first' },
                hd: { dose: '100-200mg', freq: 'post-HD', infusion: 'IV/PO', postHD: '100% supplemental dose post-HD on dialysis days' },
                crrt: { dose: '400-800mg', freq: 'q24h', infusion: 'IV/PO', notes: 'CRRT clears fluconazole rapidly; dose aggressively' }
            },
            safetyNotes: '100% oral bioavailability. Full loading dose required even with ESRD. Significant CYP2C9, CYP2C19, CYP3A4 drug interactions.'
        },

        // --- 25. Linezolid ---
        linezolid: {
            id: 'linezolid',
            name: 'Linezolid',
            class: 'Oxazolidinone',
            route: 'IV/PO',
            stdDose: '600mg IV/PO q12h',
            renalTiers: {
                crcl_gt_50: { dose: '600mg', freq: 'q12h', infusion: 'IV over 60 min or PO', notes: '100% oral bioavailability' },
                crcl_30_50: { dose: '600mg', freq: 'q12h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                crcl_10_29: { dose: '600mg', freq: 'q12h', infusion: 'IV/PO', notes: 'No renal adjustment needed' },
                crcl_lt_10: { dose: '600mg', freq: 'q12h', infusion: 'IV/PO', notes: 'Metabolites accumulate, monitor CBC' },
                hd: { dose: '600mg', freq: 'q12h', infusion: 'IV/PO', postHD: 'Give dose post-HD on dialysis days' },
                crrt: { dose: '600mg', freq: 'q12h', infusion: 'IV/PO', notes: 'No adjustment needed' }
            },
            safetyNotes: 'No renal dose adjustment needed. Myelosuppression (thrombocytopenia, anemia) after > 14 days. MAO inhibitor activity: risk of Serotonin Syndrome with SSRIs.'
        },

        // --- 26. Sulfamethoxazole / Trimethoprim (Bactrim) ---
        bactrim: {
            id: 'bactrim',
            name: 'Sulfamethoxazole / Trimethoprim',
            class: 'Sulfonamide + Inhibitor',
            route: 'IV/PO',
            stdDose: '1-2 DS tabs PO q12h (or 15-20 mg/kg/day TMP IV for PCP)',
            renalTiers: {
                crcl_gt_50: { dose: '1-2 DS tabs (or 5 mg/kg TMP)', freq: 'q12h', infusion: 'IV/PO', notes: 'PCP: 15-20 mg/kg/day TMP divided q6-8h' },
                crcl_30_50: { dose: '1 DS tab (or 5 mg/kg TMP)', freq: 'q12h', infusion: 'IV/PO', notes: 'Standard dose' },
                crcl_10_29: { dose: '1 DS tab (or 2.5-5 mg/kg TMP)', freq: 'q12-24h (50% dose)', infusion: 'IV/PO', notes: 'Reduce dose by 50%' },
                crcl_lt_10: { dose: 'Not recommended', freq: 'Avoid if CrCl < 15', infusion: 'IV/PO', notes: 'If essential: 50% dose q24h' },
                hd: { dose: '1 SS tab (or 2.5 mg/kg TMP)', freq: 'q24h', infusion: 'IV/PO', postHD: 'Give post-HD on dialysis days' },
                crrt: { dose: '5-10 mg/kg/day TMP', freq: 'divided q12h', infusion: 'IV', notes: 'Monitor serum potassium' }
            },
            safetyNotes: 'Inhibits renal tubular secretion of creatinine (artificial rise in SCr by 0.2-0.4 mg/dL without true GFR decrease). High hyperkalemia risk, especially with ACEi/ARBs/spironolactone.'
        },

        // --- 27. Oseltamivir ---
        oseltamivir: {
            id: 'oseltamivir',
            name: 'Oseltamivir',
            class: 'Neuraminidase Inhibitor',
            route: 'PO',
            stdDose: '75mg PO q12h x 5 days',
            renalTiers: {
                crcl_gt_50: { dose: '75mg', freq: 'q12h', infusion: 'PO', notes: 'Treatment: 5 days' },
                crcl_30_50: { dose: '30mg', freq: 'q12h', infusion: 'PO', notes: 'Or 75mg load then 30mg q12h' },
                crcl_10_29: { dose: '30mg', freq: 'q24h', infusion: 'PO', notes: 'CrCl 10-30' },
                crcl_lt_10: { dose: '30mg x1', freq: 'Single dose', infusion: 'PO', notes: '30mg once weekly for prophylaxis' },
                hd: { dose: '30mg', freq: 'post-HD', infusion: 'PO', postHD: '30mg post every HD session' },
                crrt: { dose: '30mg', freq: 'q12-24h', infusion: 'PO', notes: '' }
            },
            safetyNotes: 'Initiate within 48 hours of symptom onset for maximum benefit. Safe in pregnancy.'
        },

        // --- 28. Valacyclovir ---
        valacyclovir: {
            id: 'valacyclovir',
            name: 'Valacyclovir',
            class: 'Antiviral Prodrug',
            route: 'PO',
            stdDose: '1g PO q8h (VZV) or 1g PO q12h (HSV)',
            renalTiers: {
                crcl_gt_50: { dose: '1g', freq: 'q8h (VZV) or q12h (HSV)', infusion: 'PO', notes: 'Prodrug of acyclovir with high bioavailability' },
                crcl_30_50: { dose: '1g', freq: 'q12h (VZV) or 500mg q12h (HSV)', infusion: 'PO', notes: '' },
                crcl_10_29: { dose: '1g', freq: 'q24h (VZV) or 500mg q24h (HSV)', infusion: 'PO', notes: '' },
                crcl_lt_10: { dose: '500mg', freq: 'q24h', infusion: 'PO', notes: '' },
                hd: { dose: '500mg', freq: 'post-HD', infusion: 'PO', postHD: 'Give dose post-HD on dialysis days' },
                crrt: { dose: '500mg-1g', freq: 'q12-24h', infusion: 'PO', notes: '' }
            },
            safetyNotes: 'Neurotoxicity (confusion, hallucinations, encephalopathy) in elderly patients with unadjusted renal impairment. Ensure good hydration.'
        },

        // --- 29. Acyclovir ---
        acyclovir: {
            id: 'acyclovir',
            name: 'Acyclovir',
            class: 'Antiviral',
            route: 'IV/PO',
            stdDose: '5-10 mg/kg IV q8h',
            renalTiers: {
                crcl_gt_50: { dose: '5-10 mg/kg', freq: 'q8h', infusion: 'IV over 60 min', notes: '10 mg/kg for HSV encephalitis' },
                crcl_30_50: { dose: '5-10 mg/kg', freq: 'q12h', infusion: 'IV over 60 min', notes: 'CrCl 25-50' },
                crcl_10_29: { dose: '5-10 mg/kg', freq: 'q24h', infusion: 'IV over 60 min', notes: 'CrCl 10-25' },
                crcl_lt_10: { dose: '2.5-5 mg/kg', freq: 'q24h', infusion: 'IV over 60 min', notes: 'CrCl < 10' },
                hd: { dose: '2.5-5 mg/kg', freq: 'post-HD', infusion: 'IV', postHD: 'Give dose post-HD on dialysis days' },
                crrt: { dose: '5-10 mg/kg', freq: 'q12h', infusion: 'IV', notes: '' }
            },
            safetyNotes: 'Obese patients: use Adjusted Body Weight (ABW). Can precipitate in renal tubules causing acute crystal nephropathy; maintain aggressive IV hydration and infuse over >= 1 hour.'
        }
    },

    // ------------------------------------------------------------------------
    // 5. Query & Dosing Calculation Functions
    // ------------------------------------------------------------------------
    calculateDose: (drugId, patientOrRenalStatus, indicationId = null) => {
        const drug = ABX_ENGINE.STANFORD_ABX_DB[drugId];
        if (!drug) return null;

        if (patientOrRenalStatus == null) return null;

        const validTiers = ['crcl_gt_50', 'crcl_30_50', 'crcl_10_29', 'crcl_lt_10', 'hd', 'crrt'];

        // Determine tier
        let tier = null;
        if (typeof patientOrRenalStatus === 'string') {
            if (validTiers.includes(patientOrRenalStatus)) {
                tier = patientOrRenalStatus;
            } else {
                return null;
            }
        } else if (typeof patientOrRenalStatus === 'number') {
            const calculatedTier = ABX_ENGINE.getRenalTier(patientOrRenalStatus);
            if (calculatedTier === 'unknown') return null;
            tier = calculatedTier;
        } else if (typeof patientOrRenalStatus === 'object') {
            if (patientOrRenalStatus.rrt === 'hd' || patientOrRenalStatus.isHD) {
                tier = 'hd';
            } else if (patientOrRenalStatus.rrt === 'crrt' || patientOrRenalStatus.isCRRT) {
                tier = 'crrt';
            } else if (patientOrRenalStatus.crcl != null) {
                const calculatedTier = ABX_ENGINE.getRenalTier(patientOrRenalStatus.crcl);
                if (calculatedTier === 'unknown') return null;
                tier = calculatedTier;
            } else if (patientOrRenalStatus.weightKg && patientOrRenalStatus.scr && patientOrRenalStatus.age && patientOrRenalStatus.sex) {
                const res = ABX_ENGINE.calcCrCl(patientOrRenalStatus);
                if (!res || res.crcl == null) return null;
                const calculatedTier = ABX_ENGINE.getRenalTier(res.crcl);
                if (calculatedTier === 'unknown') return null;
                tier = calculatedTier;
            } else if (patientOrRenalStatus.tier && validTiers.includes(patientOrRenalStatus.tier)) {
                tier = patientOrRenalStatus.tier;
            } else {
                return null;
            }
        } else {
            return null;
        }

        if (!tier || !validTiers.includes(tier)) return null;

        const tierDosing = (drug.renalTiers && drug.renalTiers[tier]) || (drug.renalDosing && drug.renalDosing[tier]);
        if (!tierDosing) return null;

        const indInfo = (drug.indications && indicationId) ? drug.indications[indicationId] : null;

        let recommendedDose = tierDosing.dose;
        let interval = tierDosing.freq;
        let infusion = tierDosing.infusion || (indInfo ? indInfo.infusion : (drug.route ? drug.route : 'IV'));
        let adjustments = tier === 'crcl_gt_50' ? 'Normal renal function' : `Adjusted for renal tier (${tier})`;

        // Indication-specific dosing overrides (e.g. Meningitis / CNS penetration)
        if (indicationId === 'meningitis_ca' || indicationId === 'meningitis') {
            if (drugId === 'ceftriaxone') {
                recommendedDose = '2g';
                interval = 'q12h';
                adjustments = 'MANDATORY high dose for CNS penetration regardless of CrCl';
            } else if (drugId === 'meropenem') {
                if (tier === 'crcl_gt_50') { recommendedDose = '2g'; interval = 'q8h'; }
                else if (tier === 'crcl_30_50') { recommendedDose = '1g'; interval = 'q8h'; }
                else if (tier === 'crcl_10_29') { recommendedDose = '1g'; interval = 'q12h'; }
                else if (tier === 'crcl_lt_10' || tier === 'hd') { recommendedDose = '1g'; interval = 'q24h'; }
                else if (tier === 'crrt') { recommendedDose = '1g'; interval = 'q8h'; }
                adjustments = `CNS penetration dosing adjusted for ${tier}`;
            } else if (drugId === 'ampicillin') {
                if (tier === 'crcl_gt_50') { recommendedDose = '2g'; interval = 'q4h'; }
                else if (tier === 'crcl_30_50') { recommendedDose = '1-2g'; interval = 'q6h'; }
                else if (tier === 'crcl_10_29') { recommendedDose = '1-2g'; interval = 'q8-12h'; }
                else if (tier === 'crcl_lt_10') { recommendedDose = '1-2g'; interval = 'q12-24h'; }
                else if (tier === 'hd') { recommendedDose = '1-2g'; interval = 'q24h'; }
                else if (tier === 'crrt') { recommendedDose = '2g'; interval = 'q8h'; }
                adjustments = `CNS Listeria dosing adjusted for ${tier}`;
            }
        } else if (indInfo && tier === 'crcl_gt_50') {
            // Indication dose is defined for normal renal function; renal tiers keep priority when impaired.
            recommendedDose = indInfo.defaultDose;
            interval = indInfo.frequency;
            if (indInfo.infusion) infusion = indInfo.infusion;
        }

        if (tierDosing.postHD) {
            adjustments += `; Post-HD: ${tierDosing.postHD}`;
        }
        if (tierDosing.notes) {
            adjustments += `; ${tierDosing.notes}`;
        }

        return {
            drug,
            recommendedDose,
            interval,
            infusion,
            adjustments,
            warnings: drug.safetyNotes || drug.clinicalNotes || '',
            tier,
            postHD: tierDosing.postHD || null
        };
    },

    /**
     * calculateDualDose: Live simultaneous evaluation of dosing under CrCl vs eGFR
     */
    calculateDualDose: (drugId, patientOrRenalStatus, indicationId = null) => {
        const drug = ABX_ENGINE.STANFORD_ABX_DB[drugId];
        if (!drug) return null;

        let crclVal = null;
        let egfrVal = null;
        let absGfrVal = null;
        let bsaVal = null;
        let isHD = false;
        let isCRRT = false;
        let weightUsed = null;
        let weightType = 'TBW';

        if (patientOrRenalStatus && typeof patientOrRenalStatus === 'object') {
            isHD = Boolean(patientOrRenalStatus.rrt === 'hd' || patientOrRenalStatus.isHD);
            isCRRT = Boolean(patientOrRenalStatus.rrt === 'crrt' || patientOrRenalStatus.isCRRT);

            // If full patient object
            if (patientOrRenalStatus.age && patientOrRenalStatus.sex && patientOrRenalStatus.scr && patientOrRenalStatus.weightKg) {
                const crclObj = ABX_ENGINE.calcCrCl(patientOrRenalStatus, patientOrRenalStatus.weightType);
                if (crclObj) {
                    crclVal = crclObj.crcl;
                    weightUsed = crclObj.weightUsed;
                    weightType = crclObj.weightType;
                }
                const egfrObj = ABX_ENGINE.calcEGFR_CKD_EPI_2021(patientOrRenalStatus);
                egfrVal = egfrObj ? (typeof egfrObj === 'object' && 'egfr' in egfrObj ? egfrObj.egfr : Number(egfrObj)) : null;

                if (patientOrRenalStatus.heightCm) {
                    bsaVal = ABX_ENGINE.calcBSA(patientOrRenalStatus.weightKg, patientOrRenalStatus.heightCm);
                    if (egfrVal != null && bsaVal) {
                        absGfrVal = ABX_ENGINE.calcAbsoluteGFR(egfrVal, bsaVal);
                    }
                }
            } else {
                const parseRenalVal = (v) => {
                    if (typeof v !== 'number' && typeof v !== 'string') return null;
                    if (typeof v === 'string' && v.trim() === '') return null;
                    const num = Number(v);
                    return Number.isFinite(num) ? num : null;
                };
                crclVal = parseRenalVal(patientOrRenalStatus.crcl);
                egfrVal = parseRenalVal(patientOrRenalStatus.egfr);
                absGfrVal = parseRenalVal(patientOrRenalStatus.absGfr);
                bsaVal = parseRenalVal(patientOrRenalStatus.bsa);
            }
        } else if (typeof patientOrRenalStatus === 'number' && Number.isFinite(patientOrRenalStatus)) {
            crclVal = patientOrRenalStatus;
            egfrVal = patientOrRenalStatus;
        }

        // Tiers
        const effectiveEGFR = Number.isFinite(absGfrVal)
            ? absGfrVal
            : (Number.isFinite(egfrVal) && Number.isFinite(bsaVal) && bsaVal > 0
                ? ABX_ENGINE.calcAbsoluteGFR(egfrVal, bsaVal)
                : egfrVal);
        if (absGfrVal == null && Number.isFinite(egfrVal) && Number.isFinite(bsaVal) && bsaVal > 0) {
            absGfrVal = effectiveEGFR;
        }
        const tierCrCl = ABX_ENGINE.getRenalTier(crclVal, isHD, isCRRT);
        const tierEGFR = isHD ? 'hd' : (isCRRT ? 'crrt' : ABX_ENGINE.getRenalTier(effectiveEGFR));

        const doseCrCl = tierCrCl !== 'unknown' ? ABX_ENGINE.calculateDose(drugId, tierCrCl, indicationId) : null;
        const doseEGFR = tierEGFR !== 'unknown' ? ABX_ENGINE.calculateDose(drugId, tierEGFR, indicationId) : null;

        // Determine discordance
        const isTierDiscordant = (!isHD && !isCRRT && tierCrCl !== 'unknown' && tierEGFR !== 'unknown' && tierCrCl !== tierEGFR);
        const isDoseDiscordant = Boolean(
            isTierDiscordant &&
            doseCrCl && doseEGFR &&
            (doseCrCl.recommendedDose !== doseEGFR.recommendedDose || doseCrCl.interval !== doseEGFR.interval)
        );

        let discordanceAdvice = '';
        if (isDoseDiscordant) {
            if (['vancomycin', 'gentamicin', 'amikacin', 'tobramycin', 'colistin'].includes(drugId)) {
                discordanceAdvice = 'Narrow Therapeutic Index drug: Prioritize the lower clearance estimate (more conservative dose) to prevent accumulation toxicity, and monitor therapeutic drug levels / TDM closely.';
            } else if (['pip_tazo', 'cefepime', 'meropenem', 'ceftriaxone', 'ceftazidime', 'ampicillin'].includes(drugId)) {
                discordanceAdvice = 'Beta-lactam in serious infection: In severe sepsis/shock, consider the higher clearance estimate or extended infusion to avoid therapeutic underdosing.';
            } else {
                discordanceAdvice = `Discordance between CrCl (${Number.isFinite(crclVal) ? crclVal.toFixed(1) : '--'} mL/min [${tierCrCl}]) and eGFR (${Number.isFinite(egfrVal) ? egfrVal.toFixed(1) : '--'} mL/min/1.73m² [${tierEGFR}]). Select dose based on patient clinical status and volume of distribution.`;
            }
        }

        return {
            drug,
            tierCrCl,
            tierEGFR,
            crclVal,
            egfrVal,
            absGfrVal,
            doseCrCl,
            doseEGFR,
            isTierDiscordant,
            isDoseDiscordant,
            discordanceAdvice,
            activeTiers: {
                crcl: tierCrCl,
                egfr: tierEGFR
            }
        };
    },

    filterByIndication: (indicationId, patientOrRenalStatus = null) => {
        let ind = ABX_ENGINE.DISEASE_PROTOCOLS[indicationId];
        if (!ind) return [];
        let result = [];
        
        const processList = (list, role) => {
            if (!Array.isArray(list)) return;
            list.forEach(drugId => {
                let drug = ABX_ENGINE.STANFORD_ABX_DB[drugId];
                if (drug) {
                    let indInfo = (drug.indications && drug.indications[indicationId]) || null;
                    const renalProvided = patientOrRenalStatus != null && patientOrRenalStatus !== '';
                    const calculated = renalProvided
                        ? ABX_ENGINE.calculateDose(drugId, patientOrRenalStatus, indicationId)
                        : null;
                    const renalUnresolved = Boolean(renalProvided && !calculated);
                    const dose = calculated ? calculated.recommendedDose
                        : renalUnresolved ? 'Renal data required'
                        : (indInfo ? indInfo.defaultDose : drug.stdDose);
                    const interval = calculated ? calculated.interval
                        : renalUnresolved ? ''
                        : (indInfo ? indInfo.frequency : 'q24h');
                    let notes = indInfo ? (indInfo.notes || '') : (drug.clinicalNotes || '');
                    
                    result.push({
                        drugId,
                        drugName: drug.name,
                        name: drug.name,
                        dose,
                        interval,
                        role,
                        notes,
                        indicationInfo: indInfo || { defaultDose: dose, frequency: interval, notes },
                        drugInfo: drug,
                        calculated,
                        renalUnresolved
                    });
                }
            });
        };
        
        processList(ind.firstLine || ind.primaryDrugs, '1st Line');
        processList(ind.alternatives || ind.altDrugs, 'Alternative');
        return result;
    },

    getDrugsForIndication: function(indicationId, patientOrRenalStatus = null) {
        return this.filterByIndication(indicationId, patientOrRenalStatus);
    },

    // ------------------------------------------------------------------------
    // 6. Prescription Formatter (Zero-PHI Compliance)
    // ------------------------------------------------------------------------
    formatPrescriptionNote: (params) => {
        if (!params || typeof params !== 'object') return '';
        let { patient, weightType, crcl, egfr, drug, drugId, indication, indicationId, doseStr, freqStr, infStr, noteStr } = params;
        let pt = (params && params.patient && typeof params.patient === 'object') ? params.patient : {};
        
        // Resolve drug if needed
        if (!drug && drugId) {
            drug = ABX_ENGINE.STANFORD_ABX_DB[drugId];
        }
        const drugName = drug ? drug.name : (drugId || 'Antibiotic');
        
        // Resolve indication if needed
        if (!indication && indicationId) {
            indication = ABX_ENGINE.DISEASE_PROTOCOLS[indicationId];
        }
        const indName = indication ? indication.name : (indicationId || 'Infection');
        
        // Calculate renal metrics if missing
        let crclVal = crcl;
        let weightBasis = weightType || pt.weightType || 'auto';
        if (crclVal == null && pt.age && pt.sex && pt.weightKg && pt.scr) {
            let resCrCl = ABX_ENGINE.calcCrCl({ ...pt, weightType: weightBasis }, weightBasis);
            if (resCrCl) {
                crclVal = resCrCl.crcl;
                weightBasis = resCrCl.weightType;
            }
        }
        
        let egfrVal = egfr;
        if (egfrVal == null && pt.age && pt.sex && pt.scr) {
            egfrVal = ABX_ENGINE.calcEGFR_CKD_EPI_2021(pt);
        }
        const egfrNum = (typeof egfrVal === 'object' && egfrVal !== null && 'egfr' in egfrVal) ? egfrVal.egfr : (egfrVal != null ? Number(egfrVal) : null);
        
        // Calculate dose if missing
        if ((!doseStr || !freqStr) && drug && crclVal != null) {
            let calc = ABX_ENGINE.calculateDose(drug.id || drugId, crclVal, indication ? (indication.id || indicationId) : null);
            if (calc) {
                if (!doseStr) doseStr = calc.recommendedDose;
                if (!freqStr) freqStr = calc.interval;
                if (!infStr && calc.infusion) infStr = calc.infusion;
            }
        }
        
        // Format clinical note adhering strictly to Zero-PHI: NEVER include patient name, HN, DOB, national ID, phone, etc.
        let note = `** Antimicrobial Renal Dosing (Stanford Protocol) **\n`;
        note += `Indication: ${indName}\n`;
        note += `Drug: ${drugName}\n`;
        note += `Rx: ${drugName} ${doseStr || 'As indicated'} ${freqStr || ''} ${infStr ? (infStr.startsWith('IV') || infStr.startsWith('PO') ? infStr : 'IV ' + infStr) : 'IV'}\n`;
        note += `--------------------------------\n`;
        
        let ptParts = [];
        if (pt.age != null) ptParts.push(`Age ${Number(pt.age) > 89 ? '90+' : pt.age} yr`);
        if (pt.sex != null) ptParts.push(`Sex ${pt.sex}`);
        if (pt.weightKg != null) ptParts.push(`Wt ${pt.weightKg} kg (Using ${weightBasis})`);
        if (ptParts.length > 0) note += `Patient: ${ptParts.join(' | ')}\n`;
        
        if (pt.heightCm) note += `Height: ${pt.heightCm} cm\n`;
        if (crclVal != null && !isNaN(crclVal)) note += `CrCl (Cockcroft-Gault): ${Number(crclVal).toFixed(1)} mL/min\n`;
        if (egfrNum != null && !isNaN(egfrNum)) note += `eGFR (CKD-EPI 2021): ${egfrNum.toFixed(1)} mL/min/1.73m²\n`;
        
        let combinedNotes = [];
        if (noteStr) combinedNotes.push(noteStr);
        if (drug && (drug.safetyNotes || drug.clinicalNotes)) {
            combinedNotes.push(`Safety: ${drug.safetyNotes || drug.clinicalNotes}`);
        }
        if (combinedNotes.length > 0) {
            note += `\nClinical Notes: ${combinedNotes.join(' | ')}\n`;
        }
        
        return note;
    }
};

// Ensure backward-compatibility aliases across DB entries
Object.values(ABX_ENGINE.STANFORD_ABX_DB).forEach(d => {
    if (!d.renalDosing && d.renalTiers) d.renalDosing = d.renalTiers;
    if (!d.renalTiers && d.renalDosing) d.renalTiers = d.renalDosing;
    if (!d.clinicalNotes && d.safetyNotes) d.clinicalNotes = d.safetyNotes;
    if (!d.safetyNotes && d.clinicalNotes) d.safetyNotes = d.clinicalNotes;
});

// Deduplicate meningitis compatibility data while retaining both lookup keys
if (ABX_ENGINE.DISEASE_PROTOCOLS && ABX_ENGINE.DISEASE_PROTOCOLS.meningitis_ca) {
    ABX_ENGINE.DISEASE_PROTOCOLS.meningitis = ABX_ENGINE.DISEASE_PROTOCOLS.meningitis_ca;
}
Object.values(ABX_ENGINE.STANFORD_ABX_DB).forEach(d => {
    if (d.indications && d.indications.meningitis_ca) {
        d.indications.meningitis = d.indications.meningitis_ca;
    }
});

// Dual export: CommonJS (Node.js test runner) & Browser Window
if (typeof window !== 'undefined') {
    window.ABX_ENGINE = ABX_ENGINE;
}
if (typeof globalThis !== 'undefined') {
    globalThis.ABX_ENGINE = ABX_ENGINE;
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ABX_ENGINE;
}
