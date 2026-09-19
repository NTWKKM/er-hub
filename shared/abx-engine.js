/**
 * shared/abx-engine.js
 * Offline-first Antimicrobial Renal Dosing Engine (Stanford Health Care Reference)
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
        const numHeight = heightCm != null ? Number(heightCm) : null;

        if (isNaN(numAge) || isNaN(numWeight) || isNaN(numScr) || numAge <= 0 || numWeight <= 0 || numScr <= 0) {
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
        if (!scr || !age || !sex) return null;
        
        const s = typeof sex === 'string' ? sex.trim().toUpperCase() : '';
        const isFemale = (s === 'F' || s === 'FEMALE');
        const kappa = isFemale ? 0.7 : 0.9;
        const alpha = isFemale ? -0.241 : -0.302;
        const sexFactor = isFemale ? 1.012 : 1.000;
        
        let min = Math.min(scr / kappa, 1);
        let max = Math.max(scr / kappa, 1);
        
        let egfrVal = 142 * Math.pow(min, alpha) * Math.pow(max, -1.200) * Math.pow(0.9938, age) * sexFactor;
        
        // Return Number wrapper preserving primitive numeric comparisons while exposing metadata
        const res = new Number(egfrVal);
        res.egfr = egfrVal;
        res.formula = 'CKD-EPI 2021 Race-Free';
        res.units = 'mL/min/1.73m²';
        return res;
    },

    calcAbsoluteGFR: (egfr, bsa) => {
        // Absolute GFR = eGFR * (BSA / 1.73) in mL/min
        if (!egfr || !bsa) return null;
        const egfrVal = (typeof egfr === 'object' && egfr !== null && 'egfr' in egfr) ? egfr.egfr : Number(egfr);
        if (isNaN(egfrVal)) return null;
        return egfrVal * (bsa / 1.73);
    },

    getRenalTier: (crcl, isHD = false, isCRRT = false) => {
        if (isHD) return 'hd';
        if (isCRRT) return 'crrt';
        if (crcl == null || isNaN(crcl) || !Number.isFinite(Number(crcl))) return 'unknown';
        const c = Number(crcl);
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
        
        // Legacy 4-param call from tools/abx-renal-dosing.html
        if (Array.isArray(tiers)) {
            const getTierIndex = (val) => {
                for (let i = 0; i < tiers.length; i++) {
                    let t = tiers[i];
                    if (t && typeof t === 'object' && val >= t.min && val <= t.max) return i;
                }
                return -1;
            };
            let crclTier = getTierIndex(crcl);
            let egfrTier = getTierIndex(bsaOrAbsGfr || (typeof egfr === 'object' && egfr.egfr ? egfr.egfr : egfr));
            return (crclTier !== -1 && egfrTier !== -1 && crclTier !== egfrTier);
        }

        // Modern 3-param contract: evaluateDiscordance(crcl, egfr, bsa)
        const tierCrCl = ABX_ENGINE.getRenalTier(crcl);
        const egfrVal = (typeof egfr === 'object' && egfr !== null && 'egfr' in egfr) ? egfr.egfr : Number(egfr);
        let effectiveEGFR = egfrVal;
        if (bsaOrAbsGfr != null) {
            effectiveEGFR = bsaOrAbsGfr < 4 ? ABX_ENGINE.calcAbsoluteGFR(egfrVal, bsaOrAbsGfr) : bsaOrAbsGfr;
        }
        const tierEGFR = ABX_ENGINE.getRenalTier(effectiveEGFR);
        const isDiscordant = (tierCrCl !== tierEGFR);
        const clinicalAdvice = isDiscordant
            ? 'Discordance detected between Cockcroft-Gault CrCl and eGFR tiers. For beta-lactams in severe sepsis, avoid underdosing (consider higher dose). For narrow therapeutic index agents (Vancomycin, Aminoglycosides), monitor therapeutic drug levels closely.'
            : 'Renal estimates are concordant across dosing tiers.';

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
            altDrugs: ['levofloxacin', 'vancomycin'],
            alternatives: ['levofloxacin', 'vancomycin'],
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
            altDrugs: ['levofloxacin', 'ciprofloxacin', 'gentamicin'],
            alternatives: ['levofloxacin', 'ciprofloxacin', 'gentamicin'],
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
            altDrugs: ['meropenem'],
            alternatives: ['meropenem'],
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
            altDrugs: ['meropenem'],
            alternatives: ['meropenem'],
            clinicalGuidance: 'Empiric: Ceftriaxone 2g IV q12h (MANDATORY high dose) + Vancomycin 25-30 mg/kg load then 15-20 mg/kg q8-12h (target trough 15-20 mcg/mL). If age >50 or immunocompromised: Add Ampicillin 2g IV q4h for Listeria. Dexamethasone 10mg IV before or with first antibiotic dose.',
            notes: 'Empiric: Ceftriaxone 2g IV q12h (MANDATORY high dose) + Vancomycin 25-30 mg/kg load then 15-20 mg/kg q8-12h (target trough 15-20 mcg/mL). If age >50 or immunocompromised: Add Ampicillin 2g IV q4h for Listeria. Dexamethasone 10mg IV before or with first antibiotic dose.'
        },
        uti_cystitis: {
            id: 'uti_cystitis',
            name: 'Acute Uncomplicated Cystitis',
            thName: 'กระเพาะปัสสาวะอักเสบ',
            icon: '💧',
            category: 'UTI',
            primaryDrugs: ['ciprofloxacin', 'levofloxacin'],
            firstLine: ['ciprofloxacin', 'levofloxacin'],
            altDrugs: ['ceftriaxone'],
            alternatives: ['ceftriaxone'],
            clinicalGuidance: 'Nitrofurantoin is contraindicated if CrCl < 30 mL/min. Reserve fluoroquinolones when other first-line oral options are not suitable.',
            notes: 'Nitrofurantoin is contraindicated if CrCl < 30 mL/min. Reserve fluoroquinolones when other first-line oral options are not suitable.'
        },
        uti_pyelo: {
            id: 'uti_pyelo',
            name: 'Complicated UTI / Acute Pyelonephritis',
            thName: 'กรวยไตอักเสบ / การติดเชื้อทางเดินปัสสาวะซับซ้อน',
            icon: '💧',
            category: 'UTI',
            primaryDrugs: ['ceftriaxone', 'ciprofloxacin', 'levofloxacin'],
            firstLine: ['ceftriaxone', 'ciprofloxacin', 'levofloxacin'],
            altDrugs: ['cefepime', 'pip_tazo', 'meropenem'],
            alternatives: ['cefepime', 'pip_tazo', 'meropenem'],
            clinicalGuidance: 'Non-critically ill: Ceftriaxone 1-2g IV q24h or Ciprofloxacin 400mg IV q12h. Critically ill or ESBL risk: Meropenem 1g IV q8h or Cefepime 1-2g IV q8-12h.',
            notes: 'Non-critically ill: Ceftriaxone 1-2g IV q24h or Ciprofloxacin 400mg IV q12h. Critically ill or ESBL risk: Meropenem 1g IV q8h or Cefepime 1-2g IV q8-12h.'
        },
        intra_abdominal: {
            id: 'intra_abdominal',
            name: 'Intra-abdominal Infection (IAI) / Peritonitis',
            thName: 'การติดเชื้อในช่องท้อง / เยื่อบุช่องท้องอักเสบ',
            icon: '🫃',
            category: 'Intra-abdominal',
            primaryDrugs: ['pip_tazo', 'ceftriaxone', 'metronidazole'],
            firstLine: ['pip_tazo', 'ceftriaxone', 'metronidazole'],
            altDrugs: ['meropenem', 'ciprofloxacin'],
            alternatives: ['meropenem', 'ciprofloxacin'],
            clinicalGuidance: 'Community-acquired mild-mod: Ceftriaxone 1-2g IV q24h + Metronidazole 500mg IV q8h. Severe / Healthcare-associated / Septic shock: Pip/Tazo 4.5g IV q8h (over 4h) or Meropenem 1g IV q8h (over 3h).',
            notes: 'Community-acquired mild-mod: Ceftriaxone 1-2g IV q24h + Metronidazole 500mg IV q8h. Severe / Healthcare-associated / Septic shock: Pip/Tazo 4.5g IV q8h (over 4h) or Meropenem 1g IV q8h (over 3h).'
        },
        skin_soft_tissue: {
            id: 'skin_soft_tissue',
            name: 'Skin & Soft Tissue / Cellulitis / Necrotizing',
            thName: 'การติดเชื้อผิวหนังและเนื้อเยื่ออ่อน / แผลติดเชื้อรุนแรง',
            icon: '🩹',
            category: 'Skin & Soft Tissue',
            primaryDrugs: ['cefazolin', 'ceftriaxone', 'vancomycin'],
            firstLine: ['cefazolin', 'ceftriaxone', 'vancomycin'],
            altDrugs: ['pip_tazo', 'meropenem'],
            alternatives: ['pip_tazo', 'meropenem'],
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
            altDrugs: ['gentamicin', 'levofloxacin'],
            alternatives: ['gentamicin', 'levofloxacin'],
            clinicalGuidance: 'Surviving Sepsis Campaign: Administer broad-spectrum IV antimicrobials within 1 hour. Full loading doses of both beta-lactam (Pip/Tazo 4.5g or Cefepime 2g or Meropenem 1g) and Vancomycin (25-30 mg/kg TBW) regardless of renal dysfunction!',
            notes: 'Surviving Sepsis Campaign: Administer broad-spectrum IV antimicrobials within 1 hour. Full loading doses of both beta-lactam (Pip/Tazo 4.5g or Cefepime 2g or Meropenem 1g) and Vancomycin (25-30 mg/kg TBW) regardless of renal dysfunction!'
        },
        osteo_native: {
            id: 'osteo_native',
            name: 'Native Osteomyelitis / Septic Arthritis',
            thName: 'กระดูกและข้ออักเสบ',
            icon: '🦴',
            category: 'Bone & Joint',
            primaryDrugs: ['cefazolin', 'ceftriaxone', 'vancomycin'],
            firstLine: ['cefazolin', 'ceftriaxone', 'vancomycin'],
            altDrugs: ['ciprofloxacin', 'levofloxacin'],
            alternatives: ['ciprofloxacin', 'levofloxacin'],
            clinicalGuidance: 'Often requires prolonged IV therapy. Fluoroquinolones have excellent bone penetration.',
            notes: 'Often requires prolonged IV therapy. Fluoroquinolones have excellent bone penetration.'
        }
    },

    // ------------------------------------------------------------------------
    // 4. Stanford Antimicrobial Database
    // ------------------------------------------------------------------------
    STANFORD_ABX_DB: {
        ceftriaxone: {
            id: 'ceftriaxone',
            name: 'Ceftriaxone',
            class: '3rd Gen Cephalosporin',
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
        cefepime: {
            id: 'cefepime',
            name: 'Cefepime',
            class: '4th Gen Cephalosporin',
            stdDose: '2g IV q8h',
            renalTiers: {
                crcl_gt_50: { dose: '2g', freq: 'q8h', infusion: 'IV over 3-4h (extended)', notes: '1-2g q12h for mild-moderate UTI' },
                crcl_30_50: { dose: '2g', freq: 'q12h', infusion: 'IV over 3-4h (extended)', notes: 'Renal adjustment required' },
                crcl_10_29: { dose: '2g', freq: 'q24h', infusion: 'IV over 3-4h (extended)', notes: 'Or 1g q24h for mild infections' },
                crcl_lt_10: { dose: '1g', freq: 'q24h', infusion: 'IV over 30 min', notes: 'CIN neurotoxicity risk' },
                hd: { dose: '1g', freq: 'q24h', infusion: 'IV over 30 min', postHD: 'Give post-HD on dialysis days' },
                crrt: { dose: '2g', freq: 'q12h', infusion: 'IV over 3-4h', notes: '' }
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
        ampicillin: {
            id: 'ampicillin',
            name: 'Ampicillin',
            class: 'Aminopenicillin',
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
        levofloxacin: {
            id: 'levofloxacin',
            name: 'Levofloxacin',
            class: 'Respiratory Fluoroquinolone',
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
        meropenem: {
            id: 'meropenem',
            name: 'Meropenem',
            class: 'Carbapenem',
            stdDose: '1g IV q8h (2g q8h for meningitis)',
            renalTiers: {
                crcl_gt_50: { dose: '1g', freq: 'q8h', infusion: 'IV over 3h extended (or 30 min)', notes: '2g q8h for meningitis or severe Pseudomonas' },
                crcl_30_50: { dose: '1g', freq: 'q12h', infusion: 'IV over 3h extended', notes: '1g q8h for meningitis' },
                crcl_10_29: { dose: '500mg', freq: 'q12h', infusion: 'IV over 3h extended', notes: '1g q12h for meningitis' },
                crcl_lt_10: { dose: '500mg', freq: 'q24h', infusion: 'IV over 30 min to 3h', notes: '1g q24h for meningitis' },
                hd: { dose: '500mg', freq: 'q24h', infusion: 'IV over 30 min', postHD: 'Give post-HD on dialysis days (1g q24h for meningitis)' },
                crrt: { dose: '1g', freq: 'q8h', infusion: 'IV over 3h', notes: '1g q12h if effluent flow < 20 mL/kg/h' }
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
        pip_tazo: {
            id: 'pip_tazo',
            name: 'Piperacillin / Tazobactam',
            class: 'Antipseudomonal Penicillin + Inhibitor',
            stdDose: '4.5g IV q8h (infused over 4 hours)',
            renalTiers: {
                crcl_gt_50: { dose: '4.5g', freq: 'q8h', infusion: 'IV over 4h extended', notes: 'Standard: 3.375g q6h over 30 min. Sepsis: 4.5g load over 30 min then 4.5g q8h over 4h' },
                crcl_30_50: { dose: '3.375g', freq: 'q8h', infusion: 'IV over 4h extended', notes: 'Standard: 2.25g q6h over 30 min' },
                crcl_10_29: { dose: '2.25g', freq: 'q8h', infusion: 'IV over 4h extended', notes: 'Standard: 2.25g q8h over 30 min' },
                crcl_lt_10: { dose: '2.25g', freq: 'q12h', infusion: 'IV over 4h (or 30 min)', notes: '' },
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
        vancomycin: {
            id: 'vancomycin',
            name: 'Vancomycin',
            class: 'Glycopeptide',
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
        ciprofloxacin: {
            id: 'ciprofloxacin',
            name: 'Ciprofloxacin',
            class: 'Fluoroquinolone',
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
        cefazolin: {
            id: 'cefazolin',
            name: 'Cefazolin',
            class: '1st Gen Cephalosporin',
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
        metronidazole: {
            id: 'metronidazole',
            name: 'Metronidazole',
            class: 'Nitroimidazole',
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
        azithromycin: {
            id: 'azithromycin',
            name: 'Azithromycin',
            class: 'Macrolide',
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
        gentamicin: {
            id: 'gentamicin',
            name: 'Gentamicin',
            class: 'Aminoglycoside',
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
        let infusion = tierDosing.infusion || (indInfo ? indInfo.infusion : 'IV');
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
                    let calculated = patientOrRenalStatus ? ABX_ENGINE.calculateDose(drugId, patientOrRenalStatus, indicationId) : null;
                    let dose = calculated ? calculated.recommendedDose : (indInfo ? indInfo.defaultDose : drug.stdDose);
                    let interval = calculated ? calculated.interval : (indInfo ? indInfo.frequency : 'q24h');
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
                        calculated
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
        if ((!doseStr || !freqStr) && drug) {
            let calc = ABX_ENGINE.calculateDose(drug.id || drugId, crclVal != null ? crclVal : 'crcl_gt_50', indication ? (indication.id || indicationId) : null);
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
