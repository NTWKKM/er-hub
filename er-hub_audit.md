plan.md — ER-Hub Audit & Drip-Calculator Redesign

Repo: `NTWKKM/er-hub` · Scope: `index.html`, `orders/nstemi.html`, `orders/rtpa.html`, `tools/drip-calculator.html`, plus the shared engines they depend on.

---

## 1. What each page is worth (keep / merge / retire)


| File                         | Lines | Role                                                                                                                                  | Verdict                                                                                                                                                         |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                 | 437   | Portal / hub linking to 7 order sets + Clinical Tools. Registers service-worker for offline use. Braun-style list UI.                 | **Keep — high value.** Single entry point, PWA shell. Small cleanups needed.                                                                                    |
| `orders/nstemi.html`         | 1443  | NSTEMI standing-order form (patient data, risk stratification sub-sections VH/H1…, order entry, printable). Largest page in the repo. | **Keep — core clinical asset.** Best candidate for extracting shared partials (patient header, print footer) into `shared/components.js`.                       |
| `orders/rtpa.html`           | 775   | rt-PA stroke FAST-TRACK: dose calculator + hidden `.stroke-page` blocks that only render on print (checklist, exclusion criteria).    | **Keep — high value & time-critical** (flagged with orange dot on the hub). The hidden print pages are the "why" this page is 775 lines; they aren't dead code. |
| `tools/drip-calculator.html` | 308   | Generic IV drip-rate calculator over the 12-drug catalog in `shared/drug-data.js`. Prototype status.                                  | **Keep + redesign.** UX is form+submit; user wants live slider control (see §4).                                                                                |


---

## 2. Bugs found

**B1 · Wrong concentration unit label (drip-calculator.html, lines 221 & 231)**

```js
concDisplay.value = `${selectedPrep.concentration} units/mL`;
```

Hard-codes "units/mL" for every drug. Only correct for heparin. Epinephrine should read `100 mcg/mL`, esmolol `10 mg/mL`, etc. Fix: derive the concentration unit from `drug.doseUnit` (strip `/kg/…` and time component → `mcg`, `mg`, or `units`) or add an explicit `concentrationUnit` field to each drug in `drug-data.js`.

**B2 · No dose-range validation on submit (drip-calculator.html)**
`min`/`max`/`step` are set on the input, but the submit handler only validates weight (30–200). Users can type a dose outside `doseRange` and get a nonsense rate. Add an explicit check against `selectedDrug.doseRange`.

**B3 · Nitroprusside guide vs range mismatch (drug-data.js)**
`doseRange.min = 0.5` but `titrationGuide` says "เริ่มต้น 0.25 - 0.5". Either lower `min` to 0.25 or rephrase the guide to match.

**B4 · Backward-compat redirect only covers rt-PA (index.html, lines 16-23)**
Comment says "Redirects old URLs/bookmarks/QR codes", but only `order=rtpa`, `hn=`, `weight=` are matched. Any legacy QR for nstemi/stemi/pe stays on the hub. Either broaden the matcher (`?order=<slug>` → `orders/<slug>.html`) or delete the block if only rt-PA had legacy links.

**B5 · Service-worker update throttle is one-way (index.html, lines 421-433)**
`localStorage['sw-last-update-check']` prevents `reg.update()` from firing more than once an hour, but there is no user-facing "new version available" prompt. On a caching PWA used for clinical protocols this can serve stale order sets. Add a `controllerchange` / `updatefound` listener that toasts "New version — refresh".

**B6 · Esmolol dual-unit logic uses id string, not the `showDualUnits` flag**
`drug-data.js` defines `showDualUnits: true` for esmolol but the calculator checks `selectedDrug.id === 'esmolol'` in two places. Flag is dead; use it (so future dual-unit drugs work).

---

## 3. Dead / suspect code

- `**calcBolusVolume**` in `shared/calc-engine.js` — not referenced by drip-calculator.html. Confirm any order page uses it (rtpa.html likely does — grep before removing). If unused, delete; if used only once, inline.
- `**.cat-neuro / .cat-cardiac / .cat-pulmonary / .cat-anticoag / .cat-tox / .cat-procedural / .cat-tools**` classes in `index.html` — the CSS comment explicitly says "no per-category colour differentiation". Remove the classes or add the intended colour tokens.
- `**--signal-orange` / `--font-ui**` CSS variables in `index.html` — verify they are actually referenced (font-ui is; signal-orange is used by `.signal-dot.time-critical` — keep both, but confirm no other stale tokens).
- `**showDualUnits**` field (see B6) — dead until the calculator honours it.
- `**stroke-page` display:none blocks in rtpa.html** — *not* dead: they render via `print.css`. Add a code comment so future editors don't remove them.
- **Empty `--page-pad: 0px` override on `body**` in index.html — remove if `base.css` no longer uses it.

---

## 4. Drip-calculator redesign (main ask: easy-to-use + slider)

Goal: nurse picks weight → picks drug → drags a slider → sees the mL/hr result update live, big and legible, with safety colouring. No submit button.

### 4.1 New interaction model

```text
┌───────────────────────────────────────────────────────────┐
│ Weight [ 60 ] kg     Drug [ Norepinephrine ▾ ]           │
│ Preparation [ 4 mg / 100 mL — 40 mcg/mL ▾ ]              │
├───────────────────────────────────────────────────────────┤
│ Target dose                              0.10 mcg/kg/min │
│ [–] ●━━━━━━━━━━━━━━━○━━━━━━━━━━━━━━━━━━━━━━━━ [+]        │
│      0.02              0.10 (start)          3.00        │
│  ▲ safe             ▲ typical              ▲ ceiling     │
├───────────────────────────────────────────────────────────┤
│  RATE:   9.0  mL/hr   (green / amber / red badge)        │
│  60 kg · 0.10 mcg/kg/min · 40 mcg/mL                     │
├───────────────────────────────────────────────────────────┤
│ Titration guide … · Safety warnings …                    │
└───────────────────────────────────────────────────────────┘
```

### 4.2 Concrete changes to `tools/drip-calculator.html`

1. **Replace the `#dose-input` block** with a coupled control:
  - `<input type="range" id="dose-slider">` bound to `drug.doseRange` (min/max/step, default = `doseRange.default`).
  - `<input type="number" id="dose-input">` mirrors the slider both ways (typing updates slider, dragging updates number).
  - `[–] [+]` buttons that step by `doseRange.step` for fine tuning on touch devices.
2. **Live calculation** — remove the submit button and `submit` handler. Recompute on any `input` event from weight, drug, prep, slider, or number field, with a 60 ms debounce. Result card is always visible once weight + drug are set.
3. **Slider labels** — render three tick captions under the track: `min` · `default (start)` · `max`, pulled from `doseRange`. Use `<datalist>` for native tick marks.
4. **Safety colouring** — colour the rate readout and slider fill by proximity to ceiling:
  - `< 60%` of max → green (`#27ae60`)
  - `60–85%` → amber (`#e67e22`)
  - `> 85%` → red (`#c0392b`) with a "near max dose" caption.
5. **Fix B1** while you're here: show `${concentration} ${concUnit}` where `concUnit` is derived once per drug.
6. **Fix B6** — drive dual-unit display from `drug.showDualUnits` and add `drug.altUnitFactor` + `drug.altUnit` so it generalises beyond esmolol.
7. **Persist weight** in `sessionStorage` so switching drugs mid-shift doesn't reset it.
8. **Sticky result on mobile** — `position: sticky; bottom: 0` on the result card at `max-width: 640px` so the rate stays visible while the slider is dragged.
9. **Accessibility** — `aria-valuetext` on the slider announces "0.10 mcg per kilogram per minute"; slider handle ≥ 44 px on touch.
10. **Keyboard** — arrow keys already step; add `PageUp/PageDown` = 10× step, `Home/End` = min/max.

### 4.3 Non-changes (out of scope on purpose)

- No changes to `calc-engine.js` math (covered by `tests/calc-engine.test.js`).
- No changes to order pages beyond the small bug fixes in §2.
- No new dependencies; slider is native `<input type=range>` styled via `base.css`.

### 4.4 Tests to add

- `tests/drip-calculator-ui.test.js` (jsdom) — dragging the slider updates the number field and the rate readout; typing an out-of-range dose is clamped; weight persistence round-trips.
- Extend `tests/drug-data.test.js` — every drug has a resolvable concentration unit and, if `showDualUnits`, has `altUnit` + `altUnitFactor`.

---

## 5. Suggested delivery order

1. Write this file as `plan.md` at repo root.
2. Ship §2 bug fixes (B1, B3, B4 are one-liners; B2 & B6 touch the calculator anyway).
3. Drip-calculator redesign per §4.
4. Dead-code sweep per §3 after the calculator PR merges (avoids churn conflicts).
5. Optional follow-up: extract the shared patient-header + print-footer blocks used by `nstemi.html` and `rtpa.html` into `shared/components.js` to shrink both files ~15–20%.

---

## 6. Technical notes (for engineers)

- Script load order in `drip-calculator.html` is currently `components → calc-engine → drug-data → form-validate`. `drug-data.js` must load before the DOMContentLoaded handler that reads `EMERGENCY_DRUG_DATA` — current order is fine, keep it.
- The 12-drug catalog in `drug-data.js` is the single source of truth; do **not** duplicate ranges into the HTML.
- Service-worker cache-busting: bump the SW cache version when shipping the calculator redesign, or nurses on iOS home-screen installs will keep the old file.
- No backend, no build step — plain static HTML/JS. Any change ships by editing files in place.