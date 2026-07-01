# Domain Context & Glossary

## 1. Domain Glossary

| Term | Definition |
|---|---|
| **rt-PA (Alteplase)** | Recombinant tissue plasminogen activator. High-alert thrombolytic drug used for stroke and pulmonary embolism. |
| **Tenecteplase (TNK)** | Third-generation thrombolytic agent. Weight-dose bracketed; requires 50% dose reduction if age ≥ 75 in STEMI. |
| **Streptokinase (SK)** | Thrombolytic agent with absolute repeat contraindication within 6 months due to neutralizing antibody risk. |
| **GRACE Score** | Global Registry of Acute Coronary Events risk score, used to stratify NSTEMI patients into Very High, High, and Muted risk. |
| **aPTT Ratio** | Activated partial thromboplastin time ratio, used for titration of intravenous Heparin drip. |
| **Hematotoxin** | Snake venom causing systemic bleeding and coagulopathy (e.g., Green Pit Viper, Russell's Viper, Malayan Pit Viper). |
| **Neurotoxin** | Snake venom causing respiratory muscle paralysis (e.g., Cobra, King Cobra, Krait). |
| **IV Drip Rate** | Volumetric rate (mL/hr) calculated based on patient weight (kg), target dose, and drug preparation concentration. |
| **Standing Order** | Standardized medical protocols pre-approved by clinical departments to accelerate urgent treatment. |
| **DoseResultCard** | UI component displaying computed dose: value + unit + context (formula) + ceiling (range/max). Data-heavy pattern. |
| **SliderInput** | UI component: range slider with realtime value display. Continuous (weight) or stepped (age) depending on field. |
| **useFormValidation** | React hook replacing DOM-manipulation validation. State-based: fail(), range(), min(), warn(), clearAll(). Non-blocking. |
| **Static Export (SSG)** | Next.js `output: 'export'` generates static HTML/CSS/JS in `out/` for GitHub Pages hosting. No SSR at runtime. |
| **next-themes** | Theme management library. Dark default + light toggle via `data-theme` attribute on `<html>`. |

---

## 2. Ubiquitous Language

- **Stat Dose / Bolus:** Immediate, single-push IV injection, calculated in milligrams (mg) or micrograms (mcg) and converted to volume (mL).
- **Maintenance Infusion:** Continuous IV administration regulated by infusion pumps in milliliters per hour (mL/hr).
- **Preparation Variant:** Custom dilution recipe (e.g., Fentanyl 5 mcg/mL vs 2 mcg/mL) affecting calculated mL/hr flow rates.
- **Fibrinolysis Gate:** Safety checklists preventing critical administration errors before drug calculation output is unlocked.
- **Number + Context:** Data-heavy display pattern — computed value shown with formula (how it was derived) and ceiling (clinical max). Example: "42 mL/hr | 0.1 mcg/kg/min × 70 kg ÷ 100 | Range: 0.05–3.0".
- **Flat Nav:** Sidebar navigation without category grouping, ordered by clinical urgency (Stroke first).

---

## 3. Architectural Decision Records (ADRs)

### ADR-01 through ADR-17: Historical (Legacy Static HTML Era)

ADRs 01–17 document decisions made during the original vanilla HTML/CSS/JS implementation. These are preserved for historical context but the codebase has been fully rewritten to Next.js (ADR-18). Key historical decisions that carry forward:

- **ADR-02: Esmolol Unit Preservation** — Still applies. Esmolol dose label uses `mg/kg/min` (matching hospital chart) with dual-unit display (`showDualUnits` flag in drug-data.ts).
- **ADR-09: No Emoji in UI** — Partially relaxed in Next.js rewrite. Emoji removed from nav and buttons per user preference (minimal UI), but clinical warning indicators (⚠️) retained for safety.
- **ADR-10: Blank Print Manifest** — Replaced by React state-based reset (useFormValidation.clearAll + component state reset). No more DOM-manipulation reset rules.
- **ADR-16: Non-blocking Validation** — Carried forward as `useFormValidation` hook. Zero `alert()` calls.
- **ADR-17: PDF Pathway** — Preserved. 5 pages open source PDFs from `public/docs/`, 2 pages (rtpa, nstemi) use HTML blank print via `window.print()`.

### ADR-18: Next.js Rewrite (2026-07-01)

- **Context:** Legacy static HTML/CSS/JS site (index.html + orders/*.html + shared/*.js) reached maintenance ceiling. 64 node:test tests, PWA service worker, no TypeScript, no component reuse.
- **Decision:** Full rewrite to Next.js 15 (App Router) with TypeScript, static export (`output: 'export'`), dark-mode data-heavy UI, sidebar navigation, realtime slider-based dose calculation.
- **Key choices:**
  - Static export (SSG) — GitHub Pages only supports static files
  - Dark default + light toggle via `next-themes` (not dark-only — user preference for toggle)
  - Sarabun font (single font, Thai-optimized — no Inter/JetBrains Mono dual-font)
  - Sidebar flat nav (no category grouping, ordered by clinical urgency)
  - Single accent color (#5E6AD2 indigo — no category color borders)
  - Number + context dose display (value + unit + formula + ceiling)
  - Mixed slider types: continuous (weight 0.1 step), stepped (age 1 step), text input (HN, eGFR)
  - Print pathways preserved (ADR-17): PDF (5 pages) + HTML blank (rtpa, nstemi)
  - PWA removed (no service worker, no manifest)
  - Backward compatibility redirect removed (no legacy URL support)
  - Fresh vitest tests (not ported from node:test)
  - `peaceiris/actions-gh-pages` replaced by `actions/deploy-pages@v4` (GitHub official)
- **Rationale:** Modern framework enables component reuse, TypeScript safety, test infrastructure, and CI/CD integration while maintaining static hosting compatibility. Dark mode + data-heavy UI aligns with clinical workflow (night shifts, data clarity).