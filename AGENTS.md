# AGENTS.md — ER Standing Order Hub

> Instructions for AI coding agents (Claude Code, Copilot, Cursor, Gemini, Antigravity, Hermes subagents).

## Project

**MNRH-ED Standing Order Hub** — clinical standing order reference for emergency department. 8 order pages + IV drip calculator. Realtime dose calculation from patient weight/age/eGFR.

**Domain:** Clinical — zero PHI. Medical English in UI/logs/comments. Patient identifiers are HN only.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router, `output: 'export'` — static SSG) |
| Language | TypeScript 5 (strict) |
| UI | React 19, next-themes (dark default + light toggle) |
| Test | Vitest + @testing-library/react + jsdom |
| Deploy | GitHub Actions → GitHub Pages (basePath `/er-hub`) |
| Package Manager | npm |

## Commands

```bash
npm run dev          # Local dev server
npm run build        # Production static export → out/
npm run test         # Vitest run (all tests, CI gate)
npm run test:watch   # Vitest watch mode
```

**CI gate:** `npm run build && npm run test` must pass.

## Core Files Protocol

**Before writing any code:** Read all four core docs — `ARCHITECTURE.md`, `DESIGN.md`, `CONTEXT.md`, `README.md`. These define the component inventory, design tokens, domain language, and project context. Never start coding without understanding what already exists.

**After completing changes:** Sync all affected core docs before considering the task done:

| Change type | Update |
|---|---|
| Added/removed/moved component | `ARCHITECTURE.md` §1 |
| Design tokens or UI patterns | `DESIGN.md` |
| New clinical concept or architectural decision | `CONTEXT.md` (add ADR) |
| Setup/deploy instructions | `README.md` |

A PR with stale docs is incomplete.

## Hard Constraints

Rules that agents most commonly violate. When in doubt about details, read the relevant core doc.

### Clinical Safety (HIGHEST PRIORITY)

1. **Dose calculations are safety-critical.** Never change a formula without confirming against the clinical guideline (AHA/ASA 2026 for rt-PA). Run tests before and after.
2. **Fail-closed validation.** Calc functions return `null` for invalid input — never produce NaN/negative doses.
3. **No `alert()`.** Use `useFormValidation` hook — inline errors + clinical warning banners.
4. **rt-PA bolus truncation.** `Math.floor(total * 0.10 * 10) / 10` — floor, not round. Bolus + infusion must equal total exactly.
5. **Max dose ceilings.** Every dose output must show its ceiling (clinical max). See ARCHITECTURE.md §4 for all clinical warnings (W-01–W-14).

### Architecture

6. **Static export only.** No SSR, no API routes, no middleware. `output: 'export'` is a hard constraint (GitHub Pages).
7. **Pure functions in `lib/`.** Calc engines are pure, fully typed, no React imports. UI components consume them.
8. **No PWA.** No service worker, no manifest.json (ADR-18).

### UI & Accessibility

9. **All form controls need `htmlFor/id` association.** Radio groups in `<fieldset>/<legend>`. See DESIGN.md §3 for full accessibility spec.
10. **ThemeToggle must be `type="button"`** to prevent form submission.
11. **Minimal UI.** No decorative emoji/logos in nav or buttons. Clinical warning indicators (⚠️) retained for safety only.
12. **Sidebar logo path** from `NEXT_PUBLIC_BASE_PATH` env var — not hardcoded.

### Testing

13. **Vitest, not Jest.** Test files in `__tests__/` dirs next to source. Config: `vitest.config.ts`.
14. **Dose calculation changes MUST have regression tests.** Clinical safety bugs get interaction tests.
15. **Run `npm run test` before claiming done.** (~157 tests across 15 files.)