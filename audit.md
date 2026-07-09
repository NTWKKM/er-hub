# er-hub Deep Audit — 2026-07-09

**Method:** clone → `npm test` baseline → static grep/regex scan → manual cross-reference against `ARCHITECTURE.md` / `DESIGN.md` / `CONTEXT.md`.

**Baseline:** 213/213 tests passing (52 suites), before and after fixes below.

---

## 1. Fixes applied (no ambiguity, applied directly)

| File | Issue | Fix |
| --- | --- | --- |
| `tools/nihss.html:587` | `confirm('ล้างข้อมูลทั้งหมดในแบบฟอร์มนี้?')` — casual phrasing | → `confirm('ต้องการล้างข้อมูลทั้งหมดในแบบฟอร์มนี้หรือไม่?')` |
| `ARCHITECTURE.md:107` | `CACHE_VERSION` documented as `er-hub-v24`; actual is `er-hub-v25` (`service-worker.js:4`, `index.html:491`) | Updated to `v25` |
| `ARCHITECTURE.md` | "No `alert()` calls" stated as a blanket rule — false for `tools/er-note/` and `tools/nihss.html`, which legitimately use native `alert()`/`confirm()` | Scoped the rule explicitly to `orders/*.html`; noted the ER NOTE/NIHSS exception under Asset Isolation Rule |
| `DESIGN.md:218` | Footer version documented as `v24` | Updated to `v25` |
| `DESIGN.md` | "Zero `alert()` calls in the codebase" — same false-blanket claim as above | Scoped to `orders/*.html` |

Rest of `tools/nihss.html` was already formal/clinical Thai (no ครับ/ค่ะ/นะ/casual particles found) — only the one `confirm()` string needed adjustment.

---

## 2. Bugs previously logged in project memory — verified as already fixed on `main`

| Issue | Status |
| --- | --- |
| `copyNote()` double-content bug from nested `.card` | **Fixed.** `er-note.js` (~L229-260) explicitly skips nested cards (comment: "their fields are already captured by the ancestor outer card's un-scoped querySelectorAll") |
| HEART score missing `data-copy` in chest-pain | **Fixed.** `tools/er-note/chest-pain.html:143,227` — `data-copy` present and kept in sync by `updateScores()` |
| NSTEMI eGFR threshold drift (Fondaparinux, 20 vs 30) | **Fixed.** All references now consistently use `<30` |
| `TetanusText`/`tetanusText` implicit-global case bug (antivenom) | **Fixed** — only a comment and a string now contain "Tetanus" with capital T; the live variable is lowercase throughout |
| Service worker missing `clinical-engine.js` from precache | **Fixed** — present in `ASSETS` array |

No new functional bugs found in `orders/*.html` scripts (all inline `<script>` blocks pass a Node syntax check; anticoag logic, eGFR thresholds, and DAPT selection show no drift across STEMI/NSTEMI/PE/Heparin).

---

## 3. New findings — need your decision (not auto-fixed)

### 3.1 Dead CSS in `tools/er-note/er-note.css`
Confirmed unused anywhere in `tools/er-note/*.html` or `er-note.js` (verified individually, not just regex — `.tpl-*` classes were double-checked since they're built dynamically in JS and are **not** dead):

- `.hint` (L69) — DESIGN.md documents a "Hint" component using this class, but no template actually applies it; muted contextual text is either absent or implemented some other way now.
- `.section-num-reset` (L298) — `counter-reset: section-num` defined, but `section-num` counter is never incremented/displayed anywhere.
- `.tile-icon` (L257, nested under `.btn-group .btn-tile`) — no markup emits a `.tile-icon` span; mammalian-bite tiles use plain text/emoji directly in `.tile-label`.

**Decision needed:** remove these 3 rules, or wire them up (e.g. actually emit `.tile-icon` spans for the wound illustration tiles, or restore hint text under sepsis score totals as DESIGN.md describes)?

### 3.2 Orphaned page: `tools/er-note/Urgent-Clinic-Home-Medication.html`
- Not linked from `tools/er-note/index.html` (Templates list or tab bar), not linked from anywhere else in the repo.
- Not in `service-worker.js` `ASSETS` precache list.
- Body is a bare `<div>` fragment (no `<html>`/`<body>` wrapper) — looks like a print-snippet draft rather than a finished standalone tool.

**Decision needed:** is this a work-in-progress feature to wire into the tab bar + precache, or a stale draft to delete? Currently it's dead weight either way (348 lines, unreachable via navigation).

### 3.3 Mammalian-bite missing floating status box (already known)
Confirmed still true: `sepsis.html` has `#sepsis-float-status` (`.float-status`, fixed top-right, live SIRS/NEWS2/MEWS risk indicator). `mammalian-bite.html` has no equivalent — no rabies-risk/PEP-urgency floating indicator, despite DESIGN.md §"Float Status Box" describing it as sepsis-only (so docs and code agree — this is a real UX gap, not a doc bug). Not fixed since it's a design decision on scope/content of the box (e.g. would it show rabies category + PEP recommendation live?).

---

## 4. Docs recheck (`ARCHITECTURE.md`, `DESIGN.md`, `CONTEXT.md`)

All three are already dense and well-maintained — no unnecessary bloat found worth trimming. Beyond the version-string and alert()-scope fixes above (§1), content was cross-checked against the live codebase and found accurate:
- Architectural invariants (vanilla JS, no build step, no shared component files, Braun cream theme, `score-line[data-copy]` convention, ADR governance) all hold in current code.
- `CONTEXT.md` project summary and module map match actual directory structure.
- `DESIGN.md` component tables match implemented CSS/JS behavior except the 3 dead-CSS items in §3.1 and the stale version number (fixed).

No changes made to `CONTEXT.md` — reviewed, found accurate and already at a good density for an agent to onboard from.

**Suggested reading order for an AI agent to understand the whole project from 3 files:** `CONTEXT.md` (what/why + module map) → `ARCHITECTURE.md` (hard constraints/invariants + ADR log) → `DESIGN.md` (visual language + component-level implementation detail, referenced only when touching UI).
