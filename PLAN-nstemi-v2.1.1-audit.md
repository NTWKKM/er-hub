# NSTEMI Standing Order — Audit Findings & Remediation Plan (v2.1.1)

**Scope:** `orders/nstemi.html` + `shared/anticoag-engine.js` (anticoagulant logic consumed by the page)
**Baseline audited:** `main` branch, as of 2026-07-04 (post ADR-20 "v2.1" merge)
**Method:** Full-file read of `orders/nstemi.html`, cross-checked line-by-line against the decisions recorded in `ARCHITECTURE.md` (ADR-19, ADR-20, ADR-23, ADR-24) and `CONTEXT.md` (ADR-21). `tests/id-integrity-guard.test.js` was run to confirm current pass/fail state.

## Summary

ADR-20 claims five things were done to ship v2.1. Three of them are genuinely in the code (dead `p-h0/h1/h3` print refs removed, eGFR formatting standardized to `.toFixed(2)`, version bumped to `2.1.0`). **Two of the five claimed changes were never actually implemented**, and a separate, more serious issue was found in the anticoagulant auto-selection logic that contradicts the page's own printed contraindication warning. None of these are caught by the existing `id-integrity-guard` test because that test only checks "JS references a DOM id that doesn't exist" — it does not check for orphaned DOM elements that JS never touches, and it has no concept of clinical-logic correctness.

| # | Finding | Severity | Caught by existing tests? |
|---|---|---|---|
| 1 | Dead `.troponin-times` block (`#screen-h0/h1/h3`) still in DOM, permanently shows `--:--` | Low (cosmetic/dead code, contradicts ADR-20 record) | No |
| 2 | "Blank-first" auto-print-preview on page load was never wired up | Medium (UX regression vs. documented decision) | No |
| 3 | Anticoagulant auto-select recommends Fondaparinux at eGFR ≥ 20, while the same screen prints "CI: CrCl < 30 mL/min" for Fondaparinux | **High (patient-safety / internally contradictory clinical logic)** | No |

---

## Finding 1 — Dead troponin-timing display block

**Where:** `orders/nstemi.html` lines 450–465 (HTML), lines 136–144 (CSS: `.troponin-times`, `.t-box`, `.t-lbl`, `.t-val`, `.t-arr`)

**What ADR-20 says (ARCHITECTURE.md):**
> "Removed manual troponin timing inputs `#trop-time-h0`/`1`/`3` and `.troponin-times` DOM block."

**What's actually in the file:** The `.troponin-times` block is still present in the DOM:

```html
<div class="troponin-times">
    <div class="t-box"><div class="t-lbl">H0 (แรกรับ)</div><div class="t-val" id="screen-h0">--:--</div></div>
    <span class="t-arr">→</span>
    <div class="t-box"><div class="t-lbl">H1 (+1h)</div><div class="t-val" id="screen-h1">--:--</div></div>
    <span class="t-arr">→</span>
    <div class="t-box"><div class="t-lbl">H3 (+3h)</div><div class="t-val" id="screen-h3">--:--</div></div>
</div>
```

No JavaScript anywhere in the file ever writes to `#screen-h0`, `#screen-h1`, or `#screen-h3` (confirmed via full-file grep). The box is permanently frozen at `--:--` regardless of what the clinician enters. It sits directly under the "Calculated Recommendation" line in the results panel, so a clinician glancing at the screen sees a clock-style H0→H1→H3 indicator that looks broken/unfilled — it is dead weight left over from the pre-v2.0 manual-time-input design and was never removed when ADR-20 said it was.

**Fix:**
1. Delete the `.troponin-times` `<div>` block (lines 450–465).
2. Delete the now-unused CSS rules: `.troponin-times`, `.t-box`, `.t-lbl`, `.t-val`, `.t-arr` (lines 136–144).
3. Confirm nothing else references `screen-h0/h1/h3` (already confirmed — safe to delete outright).

---

## Finding 2 — "Blank-first" auto-preview never implemented

**Where:** `orders/nstemi.html`, end of the `DOMContentLoaded` handler (~line 1105–1109)

**What ADR-20 says (ARCHITECTURE.md, item 4 "Blank-First UX"):**
> "Auto-trigger the blank print layout by clicking `print-blank-btn` on page load."

**What's actually in the file:**
```js
// Auto-run print-blank-direct from home page portal
if (ED_PRINT_BOOTSTRAP.handlePrintBlankDirect(() => $('print-blank-btn').click())) return;

// Initial render on page load (real-time preview, no button press needed)
calculateAndRender();
```

`handlePrintBlankDirect()` only auto-clicks the blank-print button when the page was opened with the `?print-blank-direct=true` URL parameter (the mechanism used by the home-portal "print blank" shortcut links). On an ordinary page load — a clinician just opening `nstemi.html` from the nav — the branch is skipped and `calculateAndRender()` runs instead, populating the on-screen preview with `--` placeholders everywhere (GRACE score, eGFR, risk badge, etc.) rather than showing the actual blank standing-order template that ADR-20 says should appear by default.

This is a real UX gap versus what's documented, though it's a design choice, not a crash — worth confirming with Plan whether the intent was:
- (a) always auto-show the blank template on cold load, or
- (b) only via the URL-param shortcut (current behavior), and the ADR wording was aspirational/inaccurate.

**Fix (if (a) is intended):**
```js
// Initial render on page load
if (!ED_PRINT_BOOTSTRAP.handlePrintBlankDirect(() => $('print-blank-btn').click())) {
    $('print-blank-btn').click();   // blank-first: show template immediately
}
calculateAndRender(); // still wire live calc so first keystroke updates correctly
```
**Fix (if (b) is intended):** Correct the ADR-20 record in `ARCHITECTURE.md` to remove the "Blank-First UX" claim, since it doesn't reflect shipped behavior.

---

## Finding 3 — Anticoagulant auto-select contradicts its own contraindication warning (patient safety)

**Where:**
- `orders/nstemi.html` line 994 (auto-select logic inside `calculateAndRender()`)
- `orders/nstemi.html` line 727 (`updateAcHints()` — the Fondaparinux hint text)
- `shared/anticoag-engine.js` lines 44–56 (`calcAnticoag()`, the shared engine — note `nstemi.html` does **not** call this shared function for its auto-select; it re-implements the threshold inline, and the two disagree in exactly the same way)

**The contradiction, verbatim from the file:**

Auto-select logic (`nstemi.html` line 994):
```js
let recAc = egfrForCalc < 15 ? 'hep' : egfrForCalc >= 20 ? 'fonda' : 'enox';
```
→ For a patient with eGFR 20–29 mL/min, the system automatically checks the **Fondaparinux** radio button.

Hint text shown on the very same screen, right under the Fondaparinux option (`updateAcHints()`, line 727):
```js
$('ac-fonda-hint').innerHTML = `(Preferred — eGFR ${egfrLive.toFixed(2)})<br>
   <span style="color:#c0392b;">(CI: CrCl &lt;30 mL/min — ถ้าทำ PCI ต้องเสริม UFH bolus)</span>`;
```
→ The same screen, for the same patient (eGFR 20–29 < 30), simultaneously displays a red contraindication label under the option it just auto-selected.

**Why this matters clinically:** A clinician working quickly in the ED sees a pre-checked radio button (implying "this is the recommended choice") sitting directly above/beside a red "CI: CrCl <30" warning for that exact drug. At best this is confusing; at worst a clinician trusts the pre-check and signs off on a relatively contraindicated anticoagulant for a patient with moderate-to-severe renal impairment.

**Root cause:** Two different threshold decisions exist in the codebase's own history and were never reconciled:
- ADR-19 (`ARCHITECTURE.md`): *"eGFR ≥30 → Fondaparinux... eGFR 15-29 → Enoxaparin... eGFR <15 → Heparin."* (cutoff = 30)
- The shipped code (`nstemi.html` + `shared/anticoag-engine.js`) both implement cutoff = 20, with an inline comment in the engine (`// GFR 15-19: fondaparinux CI`) that only agrees with a 20 cutoff, not 30.
- ADR-24 introduced the on-screen "CI: CrCl <30" hint text without updating the selection threshold to match.

This needs a clinical decision, not just a code fix — **the correct cutoff (20 vs. 30) should be confirmed against current local/ESC/ACC-AHA protocol before patching**, since real-world literature is split (OASIS-5 studied fondaparinux down to CrCl ≥20 mL/min with contraindication below 20; some institutional protocols use the more conservative <30 cutoff for the *prophylactic* dose label). Once confirmed:

**Fix:**
1. Make `nstemi.html`'s auto-select call the shared `calcAnticoag()` function instead of re-implementing the threshold inline (removes the duplicate-logic drift that let this happen in the first place).
2. Set `calcAnticoag()`'s branch cutoff and the `ac-fonda-hint` / `ac-hep-hint` text to the **same, single, confirmed number** — whichever Plan confirms as correct.
3. Add a unit test in `tests/anticoag-engine.test.js` asserting that `calcAnticoag(weight, age, egfr).rec` never returns `'fondaparinux'` for any `egfr` value that the same module's hint-generating code would label contraindicated — i.e., a same-source consistency test, not just a fixed-threshold test, so this class of drift can't silently reappear.

---

## Suggested execution order

1. **Finding 3** first — clinical logic, highest severity, needs Plan's sign-off on the correct eGFR cutoff before any code changes.
2. **Finding 1** — safe, mechanical deletion of dead markup/CSS.
3. **Finding 2** — confirm intended behavior with Plan, then either implement blank-first auto-preview or correct the ADR-20 record.
4. Update `ARCHITECTURE.md` / `CONTEXT.md` afterward:
   - Add a new ADR (e.g. ADR-26) documenting this audit and the corrections, rather than editing ADR-20 in place (keep history intact).
   - Note in the new ADR that `tests/id-integrity-guard.test.js` does not catch orphaned-DOM-element or clinical-logic-consistency bugs, and that Finding 3's proposed same-source consistency test in `anticoag-engine.test.js` is a first step toward closing that gap.
5. Re-run the full test suite (`node --test`) after each fix; bump `orders/nstemi.html`'s version string and `service-worker.js` `CACHE_VERSION` once all three fixes land, per the existing versioning convention.
