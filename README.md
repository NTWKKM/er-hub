# MNRH-ED Standing Order Hub

Emergency Department clinical standing order system for **Maharat Nakhon Ratchasima Hospital** (โรงพยาบาลมหาราชนครราชสีมา). Next.js 15 static site — no backend, no PHI stored.

## Architecture

**Next.js 15 App Router** (TypeScript, static export via `output: 'export'`):

```
app/
├── layout.tsx                  ← Root layout (Sarabun font, ThemeProvider)
├── page.tsx                    ← Home (dashboard layout + welcome card)
├── globals.css                 ← Design system (dark default + light, accent #5E6AD2)
├── orders/
│   ├── rtpa/page.tsx           ← rt-PA Stroke FAST TRACK (HTML blank print)
│   ├── stemi/page.tsx          ← STEMI Standing Order (PDF pathway)
│   ├── nstemi/page.tsx         ← NSTEMI + Anticoag (HTML blank print)
│   ├── pe/page.tsx             ← Massive PE Fibrinolysis (PDF pathway)
│   ├── heparin/page.tsx        ← Heparin Protocol + aPTT Titration (PDF pathway)
│   ├── antivenom/page.tsx      ← Antivenom Standing Order (PDF pathway)
│   └── sedation/page.tsx       ← Post-Intubation Sedation (PDF pathway)
└── tools/
    └── drip-calculator/page.tsx ← IV Infusion Drip Calculator (12 HAD drugs)

components/
├── DashboardLayout.tsx         ← Sidebar + ThemeToggle + main content
├── Sidebar.tsx                 ← Flat nav (8 items, urgency-ordered, hospital logo)
├── ThemeToggle.tsx             ← Dark/light switch (next-themes)
├── SliderInput.tsx             ← Range slider with realtime value display
├── DoseResultCard.tsx          ← Number + context (value + unit + formula + ceiling)
├── PatientInfoForm.tsx         ← HN/weight/age/eGFR inputs
├── StickerBox.tsx              ← Dashed patient sticker box (print)
├── DripCalculator.tsx          ← 12-drug calculator with realtime sliders
└── orders/                     ← 8 order page components

lib/
├── calc-engine.ts              ← Drip rate + bolus volume calculations
├── anticoag-engine.ts          ← Heparin/LMWH/Fondaparinux dosing + titration
├── drug-data.ts                ← 12-drug catalog (concentrations, dose limits, warnings)
└── form-validate.ts            ← useFormValidation() React hook (non-blocking)

public/
├── logo.png                    ← Hospital logo (sidebar header)
└── docs/                       ← Source PDFs for print pathway (5 pages)

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
npm test              # 145 tests via vitest
```

## Key Design Decisions

- **ADR-18:** Next.js 15 rewrite — TypeScript, App Router, static export, dark mode data-heavy UI
- **Dark default + light toggle** via `next-themes` (not dark-only — user preference for toggle)
- **Single accent** #5E6AD2 (no category color borders — minimal UI)
- **Sarabun font** (Thai-optimized, single font)
- **Sidebar flat nav** (8 items, ordered by clinical urgency — Stroke first, no category grouping)
- **Realtime sliders** — continuous (weight 0.1 step), stepped (age 1 step), text input (HN/eGFR)
- **DoseResultCard** — Number + context (value + unit + formula + ceiling) for data-heavy display
- **Print pathways** preserved (ADR-17): PDF (5 pages via `window.open`) + HTML blank (rtpa, nstemi via `window.print()`)
- **PWA removed** — no service worker, no manifest
- **Backward compat redirect removed** — no legacy URL support

See `ARCHITECTURE.md`, `DESIGN.md`, and `CONTEXT.md` for full specifications and ADR history.

## Testing

```bash
npm test
```

145 tests via vitest (jsdom environment). Covers:
- `calc-engine.ts` — drip rate + bolus volume (14 tests)
- `anticoag-engine.ts` — heparin dosing + titration + NSTEMI anticoag (27 tests)
- `drug-data.ts` — 12-drug catalog validation (10 tests)
- `form-validate.ts` — useFormValidation hook (8 tests)
- Component smoke tests — Sidebar, DoseResultCard, DripCalculator, 8 order pages (86 tests)