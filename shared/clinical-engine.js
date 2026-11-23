/**
 * shared/clinical-engine.js
 * Shared clinical engine logic for GRACE scoring, eGFR calculation, and risk stratification.
 */

const CLINICAL_ENGINE = {
    AGE_TBL: [
        [30, 0], [40, 8], [50, 25], [60, 41],
        [70, 58], [80, 75], [90, 91], [Infinity, 100]
    ],
    HR_TBL: [
        [50, 0], [70, 3], [90, 9], [110, 15],
        [150, 24], [200, 38], [Infinity, 46]
    ],
    SBP_TBL: [
        [80, 58], [100, 53], [120, 43], [140, 34],
        [160, 24], [200, 10], [Infinity, 0]
    ],
    CR_TBL: [
        [0.4, 1], [0.8, 4], [1.2, 7], [1.6, 10],
        [2.0, 13], [4.0, 21], [Infinity, 28]
    ],
    KILLIP_PTS: { '1': 0, '2': 20, '3': 39, '4': 59 },

    lookupPts: function(val, table) {
        for (const [threshold, pts] of table) {
            if (val < threshold) return pts;
        }
        return table[table.length - 1][1];
    },

    calcEGFR_CKD_EPI_2021: function(creatinine, age, sex) {
        if (!(creatinine > 0) || !(age > 0) || !sex) return null;
        const s = String(sex).toLowerCase().trim();
        if (s !== 'male' && s !== 'female') return null;
        const female = s === 'female';
        const kappa = female ? 0.7 : 0.9;
        const alpha = female ? -0.241 : -0.302;
        const ratio = creatinine / kappa;
        const egfr = 142
            * Math.pow(Math.min(ratio, 1), alpha)
            * Math.pow(Math.max(ratio, 1), -1.200)
            * Math.pow(0.9938, age)
            * (female ? 1.012 : 1);
        return Math.round(egfr);
    },

    calcGRACE: function({ age, hr, sbp, cr, cardArr, stDev, elevMk, killip }) {
        const ageP = this.lookupPts(age, this.AGE_TBL);
        const hrP  = this.lookupPts(hr,  this.HR_TBL);
        const sbpP = this.lookupPts(sbp, this.SBP_TBL);
        const crP  = this.lookupPts(cr,  this.CR_TBL);
        const kilP = this.KILLIP_PTS[killip] || 0;
        const arrP = cardArr ? 39 : 0;
        const stP  = stDev   ? 28 : 0;
        const mkP  = elevMk  ? 14 : 0;
        const score = ageP + hrP + sbpP + crP + kilP + arrP + stP + mkP;
        return { score, bd: { ageP, hrP, sbpP, crP, kilP, arrP, stP, mkP } };
    },

    // NSTE-ACS enoxaparin (ESC 2023 / ACC/AHA 2025, product label for UA/NSTEMI):
    //   1 mg/kg SC q12h at any age (the 0.75 mg/kg age >= 75 regimen applies to STEMI only);
    //   eGFR < 30 → 1 mg/kg SC once daily. Thai pre-filled syringes are 0.4 / 0.6 mL.
    ENOX_OD_EGFR: 30,

    enoxFreqForEgfr: function(egfr) {
        if (egfr === null || egfr === undefined || !Number.isFinite(Number(egfr))) return null;
        return Number(egfr) < this.ENOX_OD_EGFR ? 'q24h' : 'q12h';
    },

    calcEnoxaparinACS: function({ weight, freq }) {
        const f = freq === 'q24h' ? 'q24h' : 'q12h';
        const mgPerKg = 1.0;
        const dose = weight > 0 ? Math.round(weight * mgPerKg) : null;
        return { mgPerKg, dose, freq: f };
    },

    riskLevel: function(graceScore, anyVH, anyH1) {
        if (anyVH) return 'very-high';
        if (graceScore > 140 || anyH1) return 'high';
        return 'non-high';
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CLINICAL_ENGINE };
}
