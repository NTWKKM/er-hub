/**
 * burn-engine.js — Pure Clinical Calculation Engine for Burn Management
 * 
 * Sources & Guidelines:
 * - ATLS 11th Edition (2025/2026) Chapter 9: Thermal Injuries (Table 9-1, Box 9-1, Table 9-2)
 * - American Burn Association (ABA 2023) Guidelines
 * - Tintinalli's Emergency Medicine 9th/10th Ed Chapter 217: Thermal Burns (Fig 217-3, Table 217-6)
 * - Goldfrank's Toxicologic Emergencies 11th Ed Chapter 123 (Cyanide) & Chapter 125 (Carbon Monoxide)
 * 
 * Design Principles:
 * - Pure, deterministic functions with 0 external dependencies.
 * - Safe numeric parsing and null/boundary guards.
 * - Strict 6-age-column Lund-Browder sum-to-100% invariant preservation.
 */

(function (root, factory) {
    if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root.BurnEngine = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Standard 6-Column Lund & Browder Nomogram
     * Columns:
     * - '0': Age < 1 year (0 to 0.99y)
     * - '1': Age 1 to 4.99y (1–4y)
     * - '5': Age 5 to 9.99y (5–9y)
     * - '10': Age 10 to 14.99y (10–14y)
     * - '15': Age 15 to 17.99y (15–17y)
     * - 'adult': Age >= 18y
     * 
     * Invariant: Every column strictly sums to 100.0%
     */
    const LUND_BROWDER_TABLE = {
        head_ant:        { '0': 9.5,  '1': 8.5,  '5': 6.5,  '10': 5.5,  '15': 4.5,  'adult': 3.5 },
        head_post:       { '0': 9.5,  '1': 8.5,  '5': 6.5,  '10': 5.5,  '15': 4.5,  'adult': 3.5 },
        neck_ant:        { '0': 1.0,  '1': 1.0,  '5': 1.0,  '10': 1.0,  '15': 1.0,  'adult': 1.0 },
        neck_post:       { '0': 1.0,  '1': 1.0,  '5': 1.0,  '10': 1.0,  '15': 1.0,  'adult': 1.0 },
        chest_ant:       { '0': 6.5,  '1': 6.5,  '5': 6.5,  '10': 6.5,  '15': 6.5,  'adult': 6.5 },
        abdomen_ant:     { '0': 6.5,  '1': 6.5,  '5': 6.5,  '10': 6.5,  '15': 6.5,  'adult': 6.5 },
        back_upper_post: { '0': 6.5,  '1': 6.5,  '5': 6.5,  '10': 6.5,  '15': 6.5,  'adult': 6.5 },
        back_lower_post: { '0': 6.5,  '1': 6.5,  '5': 6.5,  '10': 6.5,  '15': 6.5,  'adult': 6.5 },
        buttock_r:       { '0': 2.5,  '1': 2.5,  '5': 2.5,  '10': 2.5,  '15': 2.5,  'adult': 2.5 },
        buttock_l:       { '0': 2.5,  '1': 2.5,  '5': 2.5,  '10': 2.5,  '15': 2.5,  'adult': 2.5 },
        genitalia:       { '0': 1.0,  '1': 1.0,  '5': 1.0,  '10': 1.0,  '15': 1.0,  'adult': 1.0 },
        arm_upper_r_ant: { '0': 2.0,  '1': 2.0,  '5': 2.0,  '10': 2.0,  '15': 2.0,  'adult': 2.0 },
        arm_upper_r_post:{ '0': 2.0,  '1': 2.0,  '5': 2.0,  '10': 2.0,  '15': 2.0,  'adult': 2.0 },
        arm_upper_l_ant: { '0': 2.0,  '1': 2.0,  '5': 2.0,  '10': 2.0,  '15': 2.0,  'adult': 2.0 },
        arm_upper_l_post:{ '0': 2.0,  '1': 2.0,  '5': 2.0,  '10': 2.0,  '15': 2.0,  'adult': 2.0 },
        arm_lower_r_ant: { '0': 1.5,  '1': 1.5,  '5': 1.5,  '10': 1.5,  '15': 1.5,  'adult': 1.5 },
        arm_lower_r_post:{ '0': 1.5,  '1': 1.5,  '5': 1.5,  '10': 1.5,  '15': 1.5,  'adult': 1.5 },
        arm_lower_l_ant: { '0': 1.5,  '1': 1.5,  '5': 1.5,  '10': 1.5,  '15': 1.5,  'adult': 1.5 },
        arm_lower_l_post:{ '0': 1.5,  '1': 1.5,  '5': 1.5,  '10': 1.5,  '15': 1.5,  'adult': 1.5 },
        hand_r_ant:      { '0': 1.25, '1': 1.25, '5': 1.25, '10': 1.25, '15': 1.25, 'adult': 1.25 },
        hand_r_post:     { '0': 1.25, '1': 1.25, '5': 1.25, '10': 1.25, '15': 1.25, 'adult': 1.25 },
        hand_l_ant:      { '0': 1.25, '1': 1.25, '5': 1.25, '10': 1.25, '15': 1.25, 'adult': 1.25 },
        hand_l_post:     { '0': 1.25, '1': 1.25, '5': 1.25, '10': 1.25, '15': 1.25, 'adult': 1.25 },
        thigh_r_ant:     { '0': 2.75, '1': 3.25, '5': 4.0,  '10': 4.25, '15': 4.5,  'adult': 4.75 },
        thigh_r_post:    { '0': 2.75, '1': 3.25, '5': 4.0,  '10': 4.25, '15': 4.5,  'adult': 4.75 },
        thigh_l_ant:     { '0': 2.75, '1': 3.25, '5': 4.0,  '10': 4.25, '15': 4.5,  'adult': 4.75 },
        thigh_l_post:    { '0': 2.75, '1': 3.25, '5': 4.0,  '10': 4.25, '15': 4.5,  'adult': 4.75 },
        leg_lower_r_ant: { '0': 2.5,  '1': 2.5,  '5': 2.75, '10': 3.0,  '15': 3.25, 'adult': 3.5 },
        leg_lower_r_post:{ '0': 2.5,  '1': 2.5,  '5': 2.75, '10': 3.0,  '15': 3.25, 'adult': 3.5 },
        leg_lower_l_ant: { '0': 2.5,  '1': 2.5,  '5': 2.75, '10': 3.0,  '15': 3.25, 'adult': 3.5 },
        leg_lower_l_post:{ '0': 2.5,  '1': 2.5,  '5': 2.75, '10': 3.0,  '15': 3.25, 'adult': 3.5 },
        foot_r_ant:      { '0': 1.75, '1': 1.75, '5': 1.75, '10': 1.75, '15': 1.75, 'adult': 1.75 },
        foot_r_post:     { '0': 1.75, '1': 1.75, '5': 1.75, '10': 1.75, '15': 1.75, 'adult': 1.75 },
        foot_l_ant:      { '0': 1.75, '1': 1.75, '5': 1.75, '10': 1.75, '15': 1.75, 'adult': 1.75 },
        foot_l_post:     { '0': 1.75, '1': 1.75, '5': 1.75, '10': 1.75, '15': 1.75, 'adult': 1.75 }
    };

    /**
     * Maps an age in years (float) to one of the 6 Lund-Browder age columns.
     * @param {number} ageYears - Patient age in years
     * @returns {string} - '0' | '1' | '5' | '10' | '15' | 'adult'
     */
    function getLundBrowderAgeColumn(ageYears) {
        const age = Number(ageYears);
        if (isNaN(age) || age < 0) return 'adult';
        if (age < 1.0) return '0';
        if (age < 5.0) return '1';
        if (age < 10.0) return '5';
        if (age < 15.0) return '10';
        if (age < 18.0) return '15';
        return 'adult';
    }

    /**
     * Calculates %TBSA breakdown by degree.
     * 
     * @param {number} ageYears - Patient age
     * @param {Object} regions - Map of regionKey -> { degree: 0|1|2|3, fraction: 0..1 (default 1) }
     *                           or regionKey -> degreeNumber (0: unburned, 1: 1st deg, 2: 2nd deg, 3: 3rd deg)
     * @returns {Object} - { tbsaResuscitative, tbsaTotal, deg1Pct, deg2Pct, deg3Pct, columnKey, regionBreakdown }
     */
    function calculateTBSA(ageYears, regions) {
        const col = getLundBrowderAgeColumn(ageYears);
        let deg1 = 0;
        let deg2 = 0;
        let deg3 = 0;
        const breakdown = {};

        if (regions && typeof regions === 'object') {
            const normalizedRegions = { ...regions };
            if (normalizedRegions.trunk_ant !== undefined && normalizedRegions.chest_ant === undefined) {
                normalizedRegions.chest_ant = normalizedRegions.trunk_ant;
                normalizedRegions.abdomen_ant = normalizedRegions.trunk_ant;
                delete normalizedRegions.trunk_ant;
            }
            if (normalizedRegions.trunk_post !== undefined && normalizedRegions.back_upper_post === undefined) {
                normalizedRegions.back_upper_post = normalizedRegions.trunk_post;
                normalizedRegions.back_lower_post = normalizedRegions.trunk_post;
                delete normalizedRegions.trunk_post;
            }

            for (const [regKey, val] of Object.entries(normalizedRegions)) {
                if (!LUND_BROWDER_TABLE[regKey]) continue;
                const regMax = LUND_BROWDER_TABLE[regKey][col] || 0;
                let deg = 0;
                let frac = 1.0;

                if (typeof val === 'number') {
                    deg = val;
                } else if (val && typeof val === 'object') {
                    deg = Number(val.degree) || 0;
                    frac = typeof val.fraction === 'number' ? Math.max(0, Math.min(1, val.fraction)) : 1.0;
                }

                const areaPct = regMax * frac;
                if (deg === 1) deg1 += areaPct;
                else if (deg === 2) deg2 += areaPct;
                else if (deg === 3 || deg === 4) deg3 += areaPct;

                breakdown[regKey] = {
                    degree: deg,
                    percentage: Number(areaPct.toFixed(2)),
                    maxPercentage: regMax
                };
            }
        }

        const tbsaResuscitative = Number((deg2 + deg3).toFixed(2));
        const tbsaTotal = Number((deg1 + deg2 + deg3).toFixed(2));

        return {
            tbsaResuscitative: Math.min(100, tbsaResuscitative),
            tbsaTotal: Math.min(100, tbsaTotal),
            deg1Pct: Number(deg1.toFixed(2)),
            deg2Pct: Number(deg2.toFixed(2)),
            deg3Pct: Number(deg3.toFixed(2)),
            columnKey: col,
            regionBreakdown: breakdown
        };
    }

    /**
     * Calculates Pediatric Maintenance Fluid using Holliday-Segar (4-2-1 Rule)
     * 
     * Formula:
     * - First 10 kg: 4 mL/kg/hr (100 mL/kg/day)
     * - Second 10 kg (11-20 kg): + 2 mL/kg/hr (+ 50 mL/kg/day)
     * - Each kg above 20 kg: + 1 mL/kg/hr (+ 20 mL/kg/day)
     * 
     * @param {number} weightKg - Patient weight in kg
     * @returns {Object} - { hourlyRateMlHr, total24hMl, fluidType, isIndicated }
     */
    function calculatePediatricMaintenance(weightKg) {
        const wt = Number(weightKg);
        if (isNaN(wt) || wt <= 0) {
            return { hourlyRateMlHr: 0, total24hMl: 0, fluidType: 'D5LR or D5 0.45% NaCl', isIndicated: false };
        }

        let rate = 0;
        if (wt <= 10) {
            rate = wt * 4;
        } else if (wt <= 20) {
            rate = (10 * 4) + ((wt - 10) * 2);
        } else {
            rate = (10 * 4) + (10 * 2) + ((wt - 20) * 1);
        }

        rate = Math.round(rate);
        return {
            hourlyRateMlHr: rate,
            total24hMl: rate * 24,
            fluidType: 'D5LR or D5 0.45% NaCl',
            isIndicated: wt <= 30 // ATLS 11th Table 9-1: infants and young children <= 30 kg
        };
    }

    /**
     * Calculates Fluid Requirements for 24 hours based on ATLS 11th Table 9-1 & Parkland Formula.
     * 
     * ATLS 11th Table 9-1 Rules:
     * - Adults & older children >= 13 years: 2 mL LR x kg x % TBSA (24h Total)
     * - Children < 13 years: 3 mL LR x kg x % TBSA (24h Total)
     * - Infants & young children <= 30 kg: 3 mL LR x kg x % TBSA + D5LR maintenance
     * - Electrical injury (all ages): 4 mL LR x kg x % TBSA
     * - Initial adjusted hourly rate in secondary survey = Total 24h volume / 16 mL/hr
     * 
     * Parkland (Baxter) Formula (Tintinalli Table 217-6):
     * - Adult: 4 mL LR x kg x % TBSA
     * - Pediatric: 3-4 mL LR x kg x % TBSA + maintenance
     * - Schedule: 50% in first 8 hours from burn time, 50% in next 16 hours.
     * 
     * @param {Object} params
     * @param {number} params.weightKg - Weight in kg
     * @param {number} params.tbsaPct - Resuscitative % TBSA (2nd + 3rd degree ONLY)
     * @param {number} [params.ageYears=25] - Patient age in years
     * @param {boolean} [params.isElectrical=false] - Electrical burn with myoglobinuria
     * @param {number} [params.hoursElapsed=0] - Hours elapsed since burn injury
     * @param {number} [params.prehospitalFluidGivenMl=0] - Fluid already infused pre-hospital (mL)
     * @returns {Object} Full calculation results
     */
    function calculateFluidRequirements(params) {
        const wt = Number(params.weightKg) || 0;
        const tbsa = Math.max(0, Math.min(100, Number(params.tbsaPct) || 0));
        const age = typeof params.ageYears === 'number' ? params.ageYears : 25;
        const isElectrical = Boolean(params.isElectrical);
        const elapsed = Math.max(0, Number(params.hoursElapsed) || 0);
        const prehospital = Math.max(0, Number(params.prehospitalFluidGivenMl) || 0);

        // Prehospital age-based starting rate (ATLS 11th Table 8-3)
        let prehospitalInitialRate = 500;
        if (age <= 5) prehospitalInitialRate = 125;
        else if (age <= 12) prehospitalInitialRate = 250;
        else prehospitalInitialRate = 500;

        if (wt <= 0 || tbsa <= 0) {
            return {
                isValid: false,
                total24hMl: 0,
                parklandTotalMl: 0,
                modifiedBrookeTotalMl: 0,
                first8hTargetMl: 0,
                first8hRemainingMl: 0,
                first8hHourlyRate: 0,
                next16hHourlyRate: 0,
                secondarySurveyRateMlHr: 0,
                prehospitalInitialRateMlHr: prehospitalInitialRate,
                pediatricMaintenance: calculatePediatricMaintenance(wt),
                isMajorBurn: false,
                guidelineCoefficient: 2
            };
        }

        // Determine ATLS 11th guideline coefficient (mL/kg/%TBSA)
        let coeff = 2;
        if (isElectrical) {
            coeff = 4;
        } else if (age < 13.0) {
            coeff = 3;
        } else {
            coeff = 2;
        }

        // Modified Brooke / ATLS 11th 24h total
        const modifiedBrookeTotal = coeff * wt * tbsa;
        // Parkland 24h total (standard 4 mL/kg/%)
        const parklandTotal = 4 * wt * tbsa;

        // ATLS 11th secondary survey baseline initial rate = Total / 16 mL/hr
        const secondarySurveyRate = Math.round(modifiedBrookeTotal / 16);

        // Schedule 8h/16h breakdown for Modified Brooke volume
        const first8hTarget = modifiedBrookeTotal * 0.5;
        const second16hTarget = modifiedBrookeTotal * 0.5;

        // Calculate remaining volume and hourly rate for Modified Brooke 1st 8h window
        let first8hRemaining = Math.max(0, first8hTarget - prehospital);
        let first8hRate = 0;
        if (elapsed < 8.0) {
            const hoursLeft = 8.0 - elapsed;
            first8hRate = Math.round(first8hRemaining / hoursLeft);
        } else {
            // Arrived after 8 hours: remaining volume = total 24h - prehospital
            const totalRemaining = Math.max(0, modifiedBrookeTotal - prehospital);
            const hoursLeft = Math.max(1, 24.0 - elapsed);
            first8hRate = Math.round(totalRemaining / hoursLeft);
            first8hRemaining = totalRemaining;
        }

        // 2nd 16h baseline hourly rate for Modified Brooke
        const next16hRate = Math.round(second16hTarget / 16);

        // Schedule 8h/16h breakdown for Classic Parkland volume
        const parklandFirst8hTarget = parklandTotal * 0.5;
        const parklandSecond16hTarget = parklandTotal * 0.5;
        let parklandFirst8hRemaining = Math.max(0, parklandFirst8hTarget - prehospital);
        let parklandFirst8hRate = 0;
        if (elapsed < 8.0) {
            const hoursLeft = 8.0 - elapsed;
            parklandFirst8hRate = Math.round(parklandFirst8hRemaining / hoursLeft);
        } else {
            const totalRemaining = Math.max(0, parklandTotal - prehospital);
            const hoursLeft = Math.max(1, 24.0 - elapsed);
            parklandFirst8hRate = Math.round(totalRemaining / hoursLeft);
            parklandFirst8hRemaining = totalRemaining;
        }
        const parklandNext16hRate = Math.round(parklandSecond16hTarget / 16);

        // Maintenance calculation
        const pedsMaintenance = calculatePediatricMaintenance(wt);

        return {
            isValid: true,
            weightKg: wt,
            tbsaPct: tbsa,
            ageYears: age,
            isElectrical: isElectrical,
            guidelineCoefficient: coeff,
            isMajorBurn: tbsa >= 20.0,
            
            // Volume Totals
            modifiedBrookeTotalMl: Math.round(modifiedBrookeTotal),
            parklandTotalMl: Math.round(parklandTotal),
            total24hMl: Math.round(modifiedBrookeTotal),

            // Modified Brooke / ATLS 11th Schedule
            first8hTargetMl: Math.round(first8hTarget),
            first8hRemainingMl: Math.round(first8hRemaining),
            first8hHourlyRate: first8hRate,
            next16hHourlyRate: next16hRate,
            secondarySurveyRateMlHr: secondarySurveyRate,
            prehospitalInitialRateMlHr: prehospitalInitialRate,

            // Classic Parkland Schedule (4 mL/kg/%)
            parklandFirst8hTargetMl: Math.round(parklandFirst8hTarget),
            parklandFirst8hRemainingMl: Math.round(parklandFirst8hRemaining),
            parklandFirst8hHourlyRate: parklandFirst8hRate,
            parklandNext16hHourlyRate: parklandNext16hRate,

            // Pediatric Maintenance
            pediatricMaintenance: pedsMaintenance,
            requiresMaintenanceDextrose: wt <= 30.0 || age < 13.0,

            // Fluid choice
            fluidOfChoice: 'Lactated Ringer\'s (LR) / Hartmann\'s Solution (Warmed)'
        };
    }

    /**
     * Calculates Target Urine Output (UO) and Monitoring Goals
     * 
     * ATLS 11th Table 9-1 & p. 139:
     * - Adults (>=14y or >=13y in ATLS): 0.5 mL/kg/hr (standard adult range: 30-50 mL/hr)
     * - Children (<14y): 1.0 mL/kg/hr
     * - Electrical injury / Pigmented urine:
     *     Adults: 100 mL/hr until urine is clear
     *     Children: 1.0–2.0 mL/kg/hr until urine is clear
     * 
     * @param {number} weightKg
     * @param {number} [ageYears=25]
     * @param {boolean} [isElectrical=false]
     * @param {boolean} [hasPigmenturia=false]
     * @returns {Object} Target goals
     */
    function getTargetUrineOutput(weightKg, ageYears, isElectrical, hasPigmenturia) {
        const wt = Number(weightKg) || 0;
        const age = typeof ageYears === 'number' ? ageYears : 25;
        const pigment = Boolean(isElectrical || hasPigmenturia);

        if (wt <= 0) {
            return { targetMlHrMin: 0, targetMlHrMax: 0, targetMlKgHr: '0.5–1.0', description: 'Invalid weight' };
        }

        if (pigment) {
            if (age >= 14) {
                return {
                    targetMlHrMin: 100,
                    targetMlHrMax: 100,
                    targetMlKgHr: (100 / wt).toFixed(2),
                    description: '100 mL/hr until clear of myoglobin/hemochromogens (Adult electrical/pigmenturia)'
                };
            } else {
                return {
                    targetMlHrMin: Math.round(wt * 1.0),
                    targetMlHrMax: Math.round(wt * 2.0),
                    targetMlKgHr: '1.0–2.0',
                    description: '1.0–2.0 mL/kg/hr until clear of pigment (Pediatric electrical/pigmenturia)'
                };
            }
        }

        if (age < 14) {
            const target = Math.round(wt * 1.0);
            return {
                targetMlHrMin: target,
                targetMlHrMax: target,
                targetMlKgHr: '1.0',
                description: '1.0 mL/kg/hr (Pediatric target)'
            };
        } else {
            const targetMin = Math.max(30, Math.round(wt * 0.5));
            const targetMax = Math.max(50, Math.round(wt * 1.0));
            return {
                targetMlHrMin: targetMin,
                targetMlHrMax: targetMax,
                targetMlKgHr: '0.5',
                description: '0.5 mL/kg/hr (30–50 mL/hr in adults)'
            };
        }
    }

    /**
     * Calculates Hourly Urine Output Titration Advice
     * 
     * ATLS 11th p. 138:
     * - Below target UO: Increase hourly fluid rate by 10% to 30%
     * - Above target UO: Decrease hourly fluid rate by 10% to 30%
     * - Within target: Maintain rate
     * - Bolus: Avoid unless patient is hypotensive / in shock (10-20 mL/kg warm LR)
     * 
     * @param {number} currentRateMlHr - Current infusion rate
     * @param {number} measuredUoMlHr - Measured urine output in last hour
     * @param {Object} target - Target object from getTargetUrineOutput
     * @param {boolean} [isHypotensive=false] - Whether patient is in shock / hypotensive
     * @param {number} [weightKg=70] - Patient weight in kg
     * @returns {Object} Titration recommendation
     */
    function getUrineOutputTitration(currentRateMlHr, measuredUoMlHr, target, isHypotensive, weightKg) {
        const rate = Number(currentRateMlHr) || 0;
        const uo = Number(measuredUoMlHr) || 0;
        const minTarget = target && target.targetMlHrMin ? target.targetMlHrMin : 30;
        const maxTarget = target && target.targetMlHrMax ? target.targetMlHrMax : 50;
        const wt = Number(weightKg) || 70;

        if (isHypotensive) {
            const bolusMin = Math.round(wt * 10);
            const bolusMax = Math.round(wt * 20);
            const newRate = Math.round(rate * 1.25);
            return {
                status: 'SHOCK_HYPOTENSION',
                action: 'FLUID_BOLUS_AND_INCREASE',
                message: 'ความดันโลหิตตก / ภาวะช็อก: ให้ IV Fluid Bolus ทันที และเพิ่มอัตราสารน้ำขึ้น 20–30%',
                bolusAdvice: `IV Bolus warmed Balanced Crystalloid (LR): ${bolusMin}–${bolusMax} mL (10–20 mL/kg) และตรวจหาภาวะเลือดออกจากบาดเจ็บร่วม (Occult Hemorrhage)`,
                adjustedRateMin: Math.round(rate * 1.10),
                adjustedRateMax: Math.round(rate * 1.30),
                suggestedRate: newRate
            };
        }

        if (uo < minTarget) {
            const ratePlus10 = Math.round(rate * 1.10);
            const ratePlus30 = Math.round(rate * 1.30);
            return {
                status: 'UNDER_RESUSCITATION',
                action: 'INCREASE_RATE',
                message: `Urine output ต่ำกว่าเป้าหมาย (${uo} mL/hr < ${minTarget} mL/hr) → ปรับเพิ่มอัตราสารน้ำขึ้น 10%–30%`,
                bolusAdvice: 'ไม่แนะนำให้ Bolus หากไม่มีภาวะช็อก/ความดันตก ให้ปรับเพิ่มอัตราต่อเนื่อง (Gradual Titration)',
                adjustedRateMin: ratePlus10,
                adjustedRateMax: ratePlus30,
                suggestedRate: Math.round(rate * 1.20)
            };
        } else if (uo > (maxTarget * 1.3)) {
            const rateMinus10 = Math.round(rate * 0.90);
            const rateMinus30 = Math.round(rate * 0.70);
            return {
                status: 'OVER_RESUSCITATION',
                action: 'DECREASE_RATE',
                message: `Urine output สูงเกินเป้าหมาย (${uo} mL/hr > ${maxTarget} mL/hr) → ปรับลดอัตราสารน้ำลง 10%–30% เพื่อป้องกัน Fluid Creep / Compartment Syndrome`,
                bolusAdvice: 'ลดอัตราสารน้ำลงอย่างต่อเนื่อง',
                adjustedRateMin: rateMinus30,
                adjustedRateMax: rateMinus10,
                suggestedRate: Math.round(rate * 0.80)
            };
        } else {
            return {
                status: 'ON_TARGET',
                action: 'MAINTAIN_RATE',
                message: `Urine output อยู่ในเกณฑ์เป้าหมาย (${uo} mL/hr) → คงอัตราสารน้ำเดิม`,
                bolusAdvice: 'เฝ้าระวัง UO และ Vital Signs ทุก 1 ชั่วโมง',
                adjustedRateMin: rate,
                adjustedRateMax: rate,
                suggestedRate: rate
            };
        }
    }

    /**
     * Cyanide Antidote Dosing Calculator
     * 
     * Goldfrank 11th Ch 123 & Antidotes in Depth A41:
     * - First-line Antidote: Hydroxocobalamin (Cyanokit)
     * - Adult dose: 5 g IV in 200 mL 0.9% NaCl over 15 minutes (can repeat 5 g once, max 10 g total)
     * - Pediatric dose: 70 mg/kg up to 5,000 mg (5 g) IV over 15 minutes
     *   Cap boundary: weight > 71.43 kg (70 mg/kg * 71.43 kg = 5,000 mg)
     * 
     * - Alternative Antidote: Sodium Thiosulfate 25% (if Hydroxocobalamin unavailable)
     *     Adult: 12.5 g (50 mL of 25% solution) IV over 10-20 min
     *     Pediatric: 412.5 mg/kg (1.65 mL/kg of 25% solution) max 12.5 g
     * 
     * - Nitrites (Sodium Nitrite / Amyl Nitrite): CONTRAINDICATED in smoke inhalation victims
     *   due to fatal additive hypoxemia with concomitant carboxyhemoglobinemia.
     * 
     * @param {number} weightKg - Patient weight in kg
     * @returns {Object} Dosing specifications
     */
    function getCyanideAntidoteDosing(weightKg) {
        const wt = Number(weightKg);
        if (isNaN(wt) || wt <= 0) {
            return {
                isValid: false,
                hydroxocobalaminMg: 0,
                hydroxocobalaminG: 0,
                isCapped: false,
                reconstitutionDiluent: '0.9% Normal Saline (or LR / D5W)',
                reconstitutionVolumeMl: 200,
                infusionDurationMinutes: 15,
                secondDoseAvailable: false,
                secondDoseInstructions: '',
                sodiumThiosulfateMg: 0,
                sodiumThiosulfateMl: 0,
                clinicalWarnings: ['⚠️ กรุณาใส่น้ำหนักผู้ป่วยเพื่อคำนวณขนาดยา']
            };
        }

        // Exact pediatric 70 mg/kg capped at 5000 mg
        const rawHydroxoMg = wt * 70;
        const hydroxoMg = Math.min(5000, Math.round(rawHydroxoMg));
        const hydroxoG = Number((hydroxoMg / 1000).toFixed(2));
        const isCapped = rawHydroxoMg >= 5000;

        // Sodium Thiosulfate 25% (250 mg/mL) -> 412.5 mg/kg (1.65 mL/kg) capped at 12.5 g (50 mL)
        const rawThiosulfateMg = wt * 412.5;
        const thiosulfateMg = Math.min(12500, Math.round(rawThiosulfateMg));
        const thiosulfateMl = Number((thiosulfateMg / 250).toFixed(1));

        return {
            isValid: true,
            weightKg: wt,
            hydroxocobalaminMg: hydroxoMg,
            hydroxocobalaminG: hydroxoG,
            isCapped: isCapped,
            reconstitutionDiluent: '0.9% Normal Saline (or LR / D5W)',
            reconstitutionVolumeMl: 200,
            infusionDurationMinutes: 15,
            secondDoseAvailable: true,
            secondDoseInstructions: 'สามารถให้ซ้ำได้อีก 1 Dose (5 g ในผู้ใหญ่ หรือ 70 mg/kg ในเด็ก) หากยังมีอาการรุนแรงหรือ Cardiac Arrest',
            sodiumThiosulfateMg: thiosulfateMg,
            sodiumThiosulfateMl: thiosulfateMl,
            clinicalWarnings: [
                'Hydroxocobalamin เป็น Antidote ตัวเลือกแรกใน Smoke Inhalation เพราะไม่ทำให้เกิด Methemoglobinemia',
                'ผิวหนัง เยื่อบุ และปัสสาวะจะเปลี่ยนเป็นสีแดงเข้ม (Dark Red/Purple) ชั่วคราว 24–72 ชั่วโมง เป็นปฏิกิริยาปกติ',
                'อาจรบกวนผลแล็บ Co-oximetry (COHb), Total Bilirubin, Creatinine, AST ชั่วคราว',
                'ห้ามให้ Sodium Nitrite ในผู้ป่วยไฟไหม้ควัน เพราะจะทำให้ Methemoglobin ซ้ำเติมกับ Carbon Monoxide'
            ]
        };
    }

    /**
     * Carbon Monoxide (CO) Elimination & Oxygenation Summary
     * 
     * ATLS 11th Chapter 9 Breathing & Goldfrank 11th Ch 125:
     * - Room Air Half-life: 240–320 minutes (approx. 4–5 hours)
     * - 100% High-Flow O2 (NRB / ETT): 40–80 minutes
     * - Hyperbaric O2 (HBO at 2.5–3.0 ATA): 20–30 minutes
     * 
     * @param {number} cohbPercent - Measured COHb percentage
     * @param {boolean} [isPregnant=false]
     * @param {Object} [clinicalSigns={}]
     * @returns {Object} CO assessment
     */
    function getCOAssessment(cohbPercent, isPregnant, clinicalSigns) {
        const cohb = Number(cohbPercent) || 0;
        const preg = Boolean(isPregnant);
        const signs = clinicalSigns || {};

        let severity = 'NORMAL_OR_LOW';
        let symptoms = 'ปกติ / อาการไม่ชัดเจน';

        if (cohb >= 60) {
            severity = 'LETHAL';
            symptoms = 'โคม่า, ชัก, ช็อก, เสียชีวิต (>60%)';
        } else if (cohb >= 40) {
            severity = 'SEVERE';
            symptoms = 'โคม่า, ชัก, สับสนรุนแรง, กล้ามเนื้อหัวใจขาดเลือด (40–60%)';
        } else if (cohb >= 30) {
            severity = 'MODERATE_TO_SEVERE';
            symptoms = 'สับสน, เซื่องซึม, ทรงตัวไม่ได้, หมดสติ (30–40%)';
        } else if (cohb >= 20) {
            severity = 'MODERATE';
            symptoms = 'ปวดศีรษะรุนแรง, คลื่นไส้อาเจียน, แน่นหน้าอก, หายใจเหนื่อย (20–30%)';
        } else if (cohb >= 10) {
            severity = 'MILD_EXPOSURE';
            symptoms = 'ปวดศีรษะเล็กน้อย, อ่อนเพลีย (ผู้สูบบุหรี่อาจมี Baseline 5–10%)';
        }

        // Check HBO Indications
        const hboThreshold = preg ? 15 : 25;
        const meetsHboCriteria = cohb >= hboThreshold ||
            Boolean(signs.syncopeOrComa) ||
            Boolean(signs.neurologicDeficit) ||
            Boolean(signs.seizure) ||
            Boolean(signs.cardiacIschemia) ||
            Boolean(signs.severeAcidosis);

        return {
            cohbPercent: cohb,
            severityTier: severity,
            symptomsDescription: symptoms,
            halfLifeRoomAirMin: '240–320 นาที (~4–5 ชม.)',
            halfLife100O2Min: '40–80 นาที',
            halfLifeHBOMin: '20–30 นาที',
            pulseOximetryWarning: 'SpO2 ปกติ (98-100%) ไม่สามารถแยก Oxy-Hb ออกจาก Carboxy-Hb ได้ — ต้องตรวจ COHb จาก ABG/VBG Co-oximetry',
            isPregnant: preg,
            hboThresholdCOHb: hboThreshold,
            meetsHboCriteria: meetsHboCriteria,
            hboIndicationsList: [
                `COHb ≥ ${hboThreshold}% (${preg ? 'หญิงตั้งครรภ์' : 'บุคคลทั่วไป'})`,
                'มีประวัติหมดสติ (Syncope) หรือโคม่า',
                'มีอาการทางระบบประสาทผิดปกติ (Focal deficit, Seizure, Ataxia, Confusion)',
                'มีภาวะกล้ามเนื้อหัวใจขาดเลือด (ECG Ischemia / Elevated Troponin)',
                'ภาวะเลือดเป็นกรดรุนแรงที่ไม่ตอบสนองต่อการรักษา'
            ]
        };
    }

    /**
     * Inhalation Injury Risk Evaluation
     * 
     * ATLS 11th Chapter 9 Airway & Tintinalli 9th Ch 217
     * 
     * @param {Object} checklist - Boolean flags
     * @returns {Object} Inhalation injury triage
     */
    function evaluateInhalationRisk(checklist) {
        const cl = checklist || {};
        let score = 0;
        const criticalSigns = [];
        const warningSigns = [];

        // Immediate / Critical signs
        if (cl.stridor) { score += 4; criticalSigns.push('Stridor (เสียงหายใจฮืด / ทางเดินหายใจส่วนบนอุดกั้น)'); }
        if (cl.respiratoryDistress) { score += 4; criticalSigns.push('Severe Respiratory Distress / Sternal Retraction'); }
        if (cl.impairedReflexes) { score += 4; criticalSigns.push('Coma / Loss of Airway Protective Reflexes'); }
        if (cl.extensiveDeepFacialBurn) { score += 3; criticalSigns.push('Full-thickness Facial / Perioral Burn'); }
        if (cl.circumferentialNeckBurn) { score += 3; criticalSigns.push('Circumferential Neck Burn'); }

        // Warning / High-suspicion signs
        if (cl.enclosedSpace) { score += 2; warningSigns.push('Closed-space fire exposure'); }
        if (cl.sootInMouthOrNose) { score += 2; warningSigns.push('Carbonaceous deposits in oropharynx / nostrils'); }
        if (cl.carbonaceousSputum) { score += 2; warningSigns.push('Carbonaceous sputum (เสมหะปนเขม่าดำ)'); }
        if (cl.singedNasalHair) { score += 1; warningSigns.push('Singed nasal hairs / eyebrows'); }
        if (cl.hoarseness) { score += 2; warningSigns.push('Hoarseness / Progressive voice change'); }
        if (cl.largeTbsaBurn) { score += 2; warningSigns.push('Large TBSA Burn (>40–50%)'); }

        let recommendation = 'OBSERVE';
        let urgency = 'LOW';

        if (criticalSigns.length > 0 || score >= 6) {
            recommendation = 'IMMEDIATE_INTUBATION';
            urgency = 'HIGH_PRIORITY_DEFINITIVE_AIRWAY';
        } else if (warningSigns.length > 0 || score >= 2) {
            recommendation = 'CLOSE_SERIAL_MONITORING_OR_EARLY_INTUBATION';
            urgency = 'MODERATE_MONITOR_EDEMA';
        }

        return {
            riskScore: score,
            recommendation: recommendation,
            urgency: urgency,
            criticalSigns: criticalSigns,
            warningSigns: warningSigns,
            ettRecommendation: 'ผู้ใหญ่ควรใช้ ETT ขนาดใหญ่ (เบอร์ ≥ 7.5–8.0 mm) เพื่อให้สามารถส่องกล้อง Fiberoptic Bronchoscopy และดูดเสมหะเขม่าเหนียวได้สะดวก'
        };
    }

    /**
     * American Burn Association (ABA 2023 Revision) Referral Criteria Checklist
     */
    const ABA_REFERRAL_CRITERIA = [
        { id: 'aba_tbsa10', text: 'Partial-thickness burns ≥ 10% TBSA' },
        { id: 'aba_special_areas', text: 'Burns involving face, hands, feet, genitalia, perineum, or major joints' },
        { id: 'aba_full_thickness', text: 'Third-degree (full-thickness) burns in any age group' },
        { id: 'aba_electrical', text: 'Electrical burns, including lightning injury' },
        { id: 'aba_chemical', text: 'Chemical burns' },
        { id: 'aba_inhalation', text: 'Inhalation injury' },
        { id: 'aba_comorbidities', text: 'Burn injury with preexisting medical disorders that could complicate management' },
        { id: 'aba_trauma', text: 'Concomitant trauma (e.g., fractures) where burn poses greatest risk' },
        { id: 'aba_pediatric', text: 'Children with burns in hospitals without qualified pediatric personnel/equipment' },
        { id: 'aba_special_needs', text: 'Burns requiring special social, emotional, or long-term rehabilitative intervention' }
    ];

    return {
        LUND_BROWDER_TABLE,
        ABA_REFERRAL_CRITERIA,
        getLundBrowderAgeColumn,
        calculateTBSA,
        calculatePediatricMaintenance,
        calculateFluidRequirements,
        getTargetUrineOutput,
        getUrineOutputTitration,
        getCyanideAntidoteDosing,
        getCOAssessment,
        evaluateInhalationRisk
    };
});
