# MNRH-ED Standing Order Hub

Emergency Department clinical standing order system for **Maharat Nakhon Ratchasima Hospital** (โรงพยาบาลมหาราชนครราชสีมา). Next.js 15 static site — no backend, no PHI stored.

## Architecture

**Next.js 15 App Router** (TypeScript, static export via `output: 'export'`):

```
app/
├── layout.tsx                  ← Root layout (Sarabun via next/font/google, ThemeProvider)
├── page.tsx                    ← Home (dashboard layout + welcome card)
├── globals.css                 ← Design system (dark default + light, accent #5E6AD2, .sr-only)
├── orders/
│   ├── rtpa/page.tsx           ← rt-PA Stroke FAST TRACK (HTML generated order print)
│   ├── stemi/page.tsx          ← STEMI Standing Order (PDF pathway)
│   ├── nstemi/page.tsx         ← NSTEMI + Anticoag + ASA allergy gate (HTML blank print)
│   ├── pe/page.tsx             ← Massive PE Fibrinolysis (PDF blank + generated order print)
│   ├── heparin/page.tsx        ← Heparin Protocol + aPTT Titration (PDF blank)
│   ├── antivenom/page.tsx      ← Antivenom Standing Order (PDF pathway)
│   └── sedation/page.tsx       ← Post-Intubation Sedation (PDF blank + generated order print)
└── tools/
    └── drip-calculator/page.tsx ← IV Infusion Drip Calculator (12 HAD drugs)

components/
├── DashboardLayout.tsx         ← Sidebar + ThemeToggle + main content
├── Sidebar.tsx                 ← Flat nav (8 items, urgency-ordered, logo from NEXT_PUBLIC_BASE_PATH)
├── ThemeToggle.tsx             ← Dark/light switch (next-themes, type="button")
├── SliderInput.tsx             ← Range slider with realtime value display (htmlFor/id associated)
├── DoseResultCard.tsx          ← Number + context (value + unit + formula + ceiling)
├── PatientInfoForm.tsx         ← HN/weight/age/eGFR inputs (configurable maxWeight, htmlFor/id)
├── StickerBox.tsx              ← Dashed patient sticker box (print)
├── DripCalculator.tsx          ← 12-drug calculator with realtime sliders (typed calc flags)
└── orders/                     ← 7 order page components

lib/
├── calc-engine.ts              ← Drip rate + bolus volume (typed isWeightBased/isPerMinute flags)
├── anticoag-engine.ts          ← Heparin/LMWH/Fondaparinux dosing + titration (fail-closed validation)
├── drug-data.ts                ← 12-drug catalog (concentrations, dose limits, warnings, hasBolus flag)
└── form-validate.ts            ← useFormValidation() React hook (non-blocking, registerRef API)

public/
├── logo.png                    ← Hospital logo (sidebar header)
└── docs/                       ← Source PDFs for print pathway

.github/workflows/deploy.yml    ← CI: build + test → deploy to GitHub Pages
```

## Deployment

GitHub Pages at **NTWKKM/er-hub**. Push to `main` → GitHub Actions builds (`next build`) → deploys `out/` via `actions/deploy-pages@v4`.

```bash
# Local development
npm install
npm run dev          # http://localhost:3000/er-hub

# Build static export
npm run build         # outputs to out/

# Run tests
npm test              # 159 tests via vitest
```

## Key Design Decisions

- **ADR-18:** Next.js 15 rewrite — TypeScript, App Router, static export, dark mode data-heavy UI
- **ADR-19:** PR#1 review fixes — clinical bugs, accessibility, test enhancement (145 → 157 tests)
- **ADR-20:** PR#1 review round 2 — clinical safety, submitted snapshot, registerRef wiring, test enhancement (157 → 159 tests)
- **Dark default + light toggle** via `next-themes` (not dark-only — user preference for toggle)
- **Sarabun font** via `next/font/google` (self-hosted, no external requests — Thai-optimized, single font)
- **Single accent** #5E6AD2 (no category color borders — minimal UI)
- **Sidebar flat nav** (8 items, ordered by clinical urgency — Stroke first, no category grouping)
- **Realtime sliders** — continuous (weight 0.1 step), stepped (age 1 step), text input (HN/eGFR)
- **DoseResultCard** — Number + context (value + unit + formula + ceiling) for data-heavy display
- **Print pathways:** PDF blank (stemi, heparin, antivenom) + generated order print (rtpa, pe, sedation) + HTML blank (rtpa, nstemi)
- **rt-PA dosing** — 10% bolus (truncated to 1 decimal, floor) + remainder infusion over 60 min. Reference: AHA/ASA 2026 Guideline.
- **Fail-closed validation** — calcAnticoag returns null for invalid inputs (no NaN/negative doses)
- **Accessibility** — all form controls have htmlFor/id association, radio groups in fieldset/legend, .sr-only utility class
- **PWA removed** — no service worker, no manifest
- **Backward compat redirect removed** — no legacy URL support

See `ARCHITECTURE.md`, `DESIGN.md`, and `CONTEXT.md` for full specifications and ADR history.

## Testing

```bash
npm test
```

159 tests via vitest (jsdom environment). Covers:
- `calc-engine.ts` — drip rate + bolus volume (14 tests)
- `anticoag-engine.ts` — heparin dosing + titration + NSTEMI anticoag + fail-closed validation (27 tests)
- `drug-data.ts` — 12-drug catalog validation + doseRange invariants (11 tests)
- `form-validate.ts` — useFormValidation hook + registerRef (8 tests)
- Component tests — Sidebar, DoseResultCard, DripCalculator (interaction), 7 order pages (97 tests)