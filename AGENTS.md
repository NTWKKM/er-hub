# AGENTS.md — ER Standing Order Hub

> Instructions for AI coding agents (Claude Code, Copilot, Cursor, Gemini, Antigravity, Hermes subagents).

## Project

**MNRH-ED Standing Order Hub** — clinical standing order reference for emergency department. 8 order pages (Stroke rt-PA, STEMI, NSTEMI, Massive PE, Heparin, Antivenom, Sedation) + IV drip calculator. Realtime dose calculation from patient weight/age/eGFR.

**Domain:** Clinical — zero PHI. Medical English in UI/logs/comments. Patient identifiers are HN (hospital number) only.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router, `output: 'export'` — static SSG) |
| Language | TypeScript 5 (strict) |
| UI | React 19, next-themes (dark default + light toggle) |
| Test | Vitest + @testing-library/react + jsdom |
| Font | next/font/google Sarabun (self-hosted, no external requests) |
| Deploy | GitHub Actions → GitHub Pages (basePath `/er-hub`) |
| Package Manager | npm |

## Commands

```bash
npm run dev          # Local dev server
npm run build        # Production static export → out/
npm run test         # Vitest run (all tests, CI gate)
npm run test:watch   # Vitest watch mode
```

**CI gate:** `npm run build && npm run test` must pass. GitHub Actions runs both on push to main.

## Project Structure

```
app/
  layout.tsx              # Root layout (Sarabun font, ThemeProvider, suppressHydrationWarning)
  page.tsx               # Home (dashboard welcome)
  globals.css            # Design system tokens (dark + light), print styles, .sr-only
  orders/                # 8 order pages (rtpa, stemi, nstemi, pe, heparin, antivenom, sedation)
  tools/drip-calculator/ # IV infusion calculator page
components/
  DashboardLayout.tsx    # Sidebar + ThemeToggle + main content
  Sidebar.tsx            # Flat nav, 8 items, clinical urgency order
  ThemeToggle.tsx        # Dark/light switch (type="button")
  SliderInput.tsx        # Range slider with realtime value, auto-id from label
  DoseResultCard.tsx     # Number + context display (value + unit + formula + ceiling)
  PatientInfoForm.tsx    # HN + eGFR + weight slider + age slider
  StickerBox.tsx         # Dashed print sticker box
  DripCalculator.tsx     # 12-drug drip calculator
  orders/                # 8 order components (StemiOrder, RtpaOrder, etc.)
lib/
  calc-engine.ts         # Drip rate + bolus volume (pure functions, typed flags)
  anticoag-engine.ts     # Anticoagulant dosing + heparin titration (fail-closed)
  drug-data.ts           # 12 emergency drug catalog (EmergencyDrug interface)
  form-validate.ts       # useFormValidation hook (state-based, non-blocking)
  __tests__/             # Engine + data tests (5 files)
public/docs/             # Source PDFs for PDF-pathway order pages
.github/workflows/       # deploy.yml (build + test + Pages deploy)
```

**Path alias:** `@/*` → project root (configured in tsconfig.json + vitest.config.ts).

## Core Files Protocol

**Before writing any code:** Read all four core docs first — `ARCHITECTURE.md`, `DESIGN.md`, `CONTEXT.md`, `README.md`. These define the component inventory, design tokens, domain language, and project context. Never start coding without understanding what already exists.

**After completing changes:** Sync all affected core docs before considering the task done. If you added/removed/moved a component → update ARCHITECTURE.md. If you changed design tokens or UI patterns → update DESIGN.md. If you introduced a new clinical concept or made an architectural decision → update CONTEXT.md (add ADR). If you changed setup/deploy instructions → update README.md. A PR with stale docs is incomplete.

## Critical Rules

### Clinical Safety (HIGHEST PRIORITY)

1. **Dose calculations are safety-critical.** Never change a formula without confirming against the clinical guideline (AHA/ASA 2026 for rt-PA). Run tests before and after.
2. **Fail-closed validation.** `calcAnticoag` returns `null` for invalid input — never produce NaN/negative doses. Any new calc function must follow this pattern.
3. **Max dose ceilings.** Every dose output must show its ceiling (clinical max). DoseResultCard enforces this.
4. **No `alert()`.** Use `useFormValidation` hook — inline errors + clinical warning banners. Zero `alert()` calls anywhere.
5. **rt-PA bolus truncation.** `Math.floor(total * 0.10 * 10) / 10` — floor, not round. Bolus + infusion must equal total exactly.

### Architecture

6. **Static export only.** No server-side rendering, no API routes, no middleware. `output: 'export'` is a hard constraint (GitHub Pages).
7. **ARCHITECTURE.md is the SSOT.** When adding/removing/moving components, update ARCHITECTURE.md (read → modify → write). Violations → fix code, not docs.
8. **Pure functions in `lib/`.** Calc engines are pure, fully typed, no React imports. UI components consume them.
9. **No PWA.** No service worker, no manifest.json. Offline cache was dropped (ADR-18).

### UI & Accessibility

10. **Dark default + light toggle.** Dark is default; light via `:root[data-theme='light']` in globals.css. Single accent `#5E6AD2` — no category colors.
11. **All form controls need `htmlFor/id` association.** Radio groups in `<fieldset>/<legend>`. Use `.sr-only` for legends that shouldn't render visually.
12. **ThemeToggle must be `type="button"`** to prevent form submission.
13. **Minimal UI.** No decorative emoji/logos in nav or buttons. Clinical warning indicators (⚠️) retained for safety only.
14. **Sidebar logo path** from `NEXT_PUBLIC_BASE_PATH` env var — not hardcoded.

### Print

15. **Three print pathways** (check which page uses which in ARCHITECTURE.md §3):
    - PDF blank — `window.open()` source PDF from `public/docs/`
    - Generated order print — `window.print()` on rendered order markup
    - HTML blank — `window.print()` on rendered blank template
16. **Print CSS:** `@media print` hides `.sidebar`, `.theme-toggle`, `.no-print`. `@page { size: A4 portrait; margin: 0 }`.

### Testing

17. **Vitest, not Jest.** Test files in `__tests__/` dirs next to source. Config: `vitest.config.ts`.
18. **Test coverage rule:** dose calculation changes MUST have regression tests. Clinical safety bugs get interaction tests (see ADR-19 examples).
19. **Current test count:** ~157 tests across 15 test files. Run `npm run test` before claiming done.

## Architecture Docs

| Doc | Purpose |
|---|---|
| `ARCHITECTURE.md` | Component inventory, data flow, deployment, clinical warnings (W-01–W-14) |
| `DESIGN.md` | Design tokens, UI components, accessibility, print layout |
| `CONTEXT.md` | Domain glossary, ubiquitous language, ADRs (ADR-01–19) |
| `README.md` | Project overview, setup, deployment instructions |

**When adding a new component:** update ARCHITECTURE.md §1 (add row to component table). If it introduces a new design token, update DESIGN.md §1. If it's a new clinical concept, update CONTEXT.md §1.

## Known Patterns

- **Number + Context:** DoseResultCard shows `value | unit | formula | ceiling` — e.g., "42 mL/hr | 0.1 mcg/kg/min × 70 kg ÷ 100 | Range: 0.05–3.0"
- **useFormValidation:** State-based hook replacing DOM manipulation. Methods: `fail()`, `clear()`, `range()`, `min()`, `warn()`, `clearWarn()`, `clearAll()`, `registerRef()`.
- **Slider types:** Weight = continuous (0.1 step), Age = stepped (1 step), HN/eGFR = text input.
- **NSTEMI `maxWeight` prop:** PatientInfoForm accepts configurable `maxWeight` (default 150, NSTEMI passes 200).
- **Esmolol dual units:** `showDualUnits` flag in drug-data.ts — dose label uses `mg/kg/min` matching hospital chart.