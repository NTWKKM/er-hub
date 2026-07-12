# Design System Guidelines

## 1. Design Tokens

### Color Palette

*Note: Braun analogue design tokens are declared as shared custom properties under `:root` in [base.css](file:///Users/ntwkkm/er-hub/shared/base.css) to be portable across all worksheets.*

- **Background:** `#f0f2f5` (Clinical order sheets screen background) | Warm grey `#ebe7df` (Portal homepage background / Paper — deepened from previous `#f4f2ec` for richer Braun surface warmth)
- **Container Background:** `#ffffff` (Card background / worksheets)
- **Primary Text / Ink:** `#1a1a1a` (Primary text on portal, solid rules)
- **Secondary Text / Graphite:** `#4a4a4a` (Secondary metadata, status badges, and arrows)
- **Border / Rule:** `#d8d4c8` (Subtle hairline dividers on portal)
- **Signal Orange:** `#d84315` (Reserved ONLY for time-critical visual status dots on portal: rt-PA, STEMI, Massive PE. Acts as a high-visibility clinical triage marker to draw the physician's attention instantly to time-sensitive emergency pathways, meeting WCAG graphical element 3:1 contrast requirements).
- **Portal Hover / Slate Blue:** `#49628d` (HSL 218°, 32%, 42% — same hue as the nav gradient, lower saturation, higher lightness. Used exclusively as the order-row hover background on the portal. WCAG AA verified: Braun White `#F0EDE5` on `#49628d` = 5.23:1.)
- **Braun White:** `#F0EDE5` (Warm ivory used for all navigation bar text — `nav-home`, `nav-title`, `nav-center`, `nav-right` — and as the text/border colour of hovered portal rows. Replaces pure white `#fff` / `rgba(255,255,255,...)` across navigation elements.)

#### Order-Sheet Form Page Tokens

Custom properties declared under `:root` in `base.css` for standing-order form pages (rtpa, stemi, nstemi, pe, heparin, antivenom, sedation):

- **Text Primary:** `--text-primary: #333333` (body text on form pages — distinct from portal `--ink: #1a1a1a`)
- **Highlight:** `--highlight-yellow: #ffeaa7` (dose summary banner background), `--highlight-red-bg: #fff5f5` (cardiac alert background)
- **Stroke Theme (blue):** `--stroke-primary: #007bff` (stroke page h1/buttons/focus borders), `--stroke-hover: #0056b3` (hover state), `--stroke-bg-highlight: #e6f0ff` (stroke input focus background)
- **Cardiac Theme (red):** `--cardiac-primary: #c0392b` (cardiac page h1/buttons/focus borders/dose numbers), `--cardiac-hover: #a93226` (hover state), `--cardiac-bg-highlight: #fff5f5` (cardiac input focus background)
- **Success (green):** `--success-primary: #28a745` (print button background), `--success-hover: #218838` (print button hover)

#### Module Specific Accents (Muted Text-Only Categories)

- **Neurology:** Ochre `#b8873a`
- **Cardiac / Pulmonary:** Slate `#3a5566`
- **Anticoagulation / Procedural:** Olive `#5a6b3b`
- **Toxicology:** Brick `#8a3a2a`
- **Clinical Tools / Calculator:** Graphite `#4a4a4a`

### Typography

- **Primary Font Family:** `'Sarabun', sans-serif` (Worksheet pages fallback for Thai rendering) | `"Inter Tight"`, `"Neue Haas Grotesk"`, sans-serif (Primary portal typography and navigation titles)
- **Font Sizes:**
  - Page Heading (`h1`): `1.5em` (24px)
  - Section Heading (`h3`): `1.2em` (18px)
  - Input/Form Text: `15px`
  - Print Cells: `10.5px` (Optimized for space)
  - Print Headers: `16px`
  - Portal Scale: `12px` (badges/eyebrows), `14px` (category/metadata/numbers), `16px` (titles/headers), `32px` (brand display)

### Breakpoints & Layout

- **Container Max-Width:** `1100px` (order pages), `1120px` (portal Swiss grid)
- **Form Grid Gaps:** `20px` (STEMI/NSTEMI), `30px` (Stroke)
- **Portal List Layout:** Divided into two distinct sections: Active releases (which start directly at the top of the container without a header) and Prototype releases. The Prototype section is collapsible, starting in a collapsed state by default. The toggle header (`.prototype-toggle`) is styled to mimic a Braun physical switch, supporting focus indicators, hover lift (`translateZ(4px)`), and active click-press effects, with a chevron indicator (`.toggle-icon`) that flips 180° around the X-axis in 3D. The content panel (`.collapsible-content`) utilizes a `transform-origin: top` and `perspective(1200px)` rotation, folding up to `rotateX(-90deg)` with a back-translation (`translateZ(-10px)`) and a dynamic shadow gradient overlay (`::before`) to create realistic 3D paper-flap physics and mechanical depth. Within each section, semantic ordered lists (`<ol class="order-list">`) of rows (`.order-row`) with `min-height: 56px` and padding (`12px 16px 12px 12px` — asymmetric to accommodate a `4px` transparent left border sentinel without text shift) are used for optimal touch targets. Visual separation via 1px hairline rules without drop shadows or card elevations. Background blends flatly with the `#ebe7df` page surface.
- **NSTEMI Compact Input Layout:** Patient Info (`.patient-section`) is a full-width top row. The section heading "1. ข้อมูลผู้ป่วย" contains the "บันทึกเวลาปัจจุบัน (Use Current Time)" checkbox inline via `float:right` with distinct typography (`font-size:12px; font-weight:normal; color:#555`); the checkbox defaults to **unchecked** (unlike other order pages). Below the heading, fields are in a single-line flexbox (`.patient-fields`) containing: HN, Age, Weight(kg), Sex(M/F radio), Creatinine(mg/dL), and a red eGFR badge derived live via CKD-EPI 2021. Below it, a 3-column `.input-layout` row holds: (1) GRACE Score Variables (HR/SBP/Creatinine from patient info + binary flags), (2) Killip Class (compacted single-line radio labels with hover descriptions), (3) Risk Stratification (vertical checkbox list with standard labels). The GRACE creatinine input field is synchronized with the primary patient info creatinine input field via a robust two-way sync loop, allowing clinicians to input values in either location or calculate GRACE parameters independently. Troponin box (`.troponin-box`) uses a **2-row desktop layout**: Row 1 (`.troponin-header`) = title "🧪 hs-Troponin I (ng/L)" + "เจาะ Troponin จาก รพช. แล้ว" checkbox; Row 2 (`.troponin-inputs`) = H0/H1/H3 inputs in a single flex row with short labels ("H0 (แรกรับ):", "H1 (+1h):", "H3 (+3h):"). At ≤900px, `.troponin-inputs` switches to **4-row layout**: header row + 3 vertically stacked full-width inputs. **Results area (2-row reflow):** Row 1 (`.grace-summary`) is a flex auto-center layout (`display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 24px`) holding: (1) GRACE Score badge, (2) Risk badge, (3) Score Breakdown table. Each child sizes to its natural width (`flex: 0 1 auto`) and the row centers them as a group. Container uses `margin: 20px auto` for horizontal centering. Uses a flexible layout that wraps naturally on narrow viewportshout a dedicated media query. Row 2 (`.dapt-anticoag-row`) is a 2-column grid (`display: grid; grid-template-columns: 1fr 1fr; gap: 16px`) containing: **Left:** Antiplatelet Loading (DAPT) panel (`#dapt-panel`) with ASA 300 mg checkbox + P2Y12 radio group (Hold/Clopidogrel 300/600/Ticagrelor 180/Prasugrel 60) + dynamic risk-based hint box. **Right:** Anticoagulant Selection panel (`#anticoag-panel`) with Fondaparinux/Enoxaparin/Heparin radios + Calculated Recommendation text. Both panels have a small red "ล้างตัวเลือก" (Reset Option) button. At ≤900px, `.dapt-anticoag-row` stacks to 1 column. Both rows hidden in `@media print`. Anticoagulant options that are contraindicated (Fondaparinux at eGFR < 30, Enoxaparin at eGFR < 15) are styled as disabled (opacity 0.45, cursor not-allowed) and marked with a red `⛔ CI` badge, while the recommended option gets a green `✅ แนะนำ` badge. Clinicians can bypass the CI warning via a two-click safety override (first click prompts for validation with an orange dashed border, second click checks the radio and shows an override status). When overridden, the option is checked (☑) on-screen and in print preview, and uses color-fill/border highlights just like normal recommended options, and the warnings are changed to "ใช้นอกGuideline ไม่ควรให้เมื่อ eGFR < 30" (Fondapalinux) and "ใช้นอกGuideline ไม่ควรให้เมื่อ eGFR < 15" (Enoxaparin). Choosing an option dynamically updates the print area's Continuation column to show checkboxes for 0.4 ml vs 0.6 ml pre-filled syringes (line 1) and q12h vs OD frequency (line 2, indented 5 spaces) with a 2-line clinical guidance note detailing the calculated dose and package equivalence (0.4 ml = 40 mg, 0.6 ml = 60 mg). eGFR-based limits are labeled as eGFR rather than CrCl (e.g. CI: eGFR < 30 mL/min for Fondaparinux, and adding CI: eGFR < 15 mL/min hint for Enoxaparin). **Antiplatelet selection (DAPT):** Placed in the same results column block next to Anticoagulant selection, displaying a clean form with checkbox for Aspirin (300 mg) loading and radio buttons for P2Y12 loading (Hold, Clopidogrel 300/600 mg, Ticagrelor 180 mg, or Prasugrel 60 mg) along with a red "ล้างตัวเลือก" button. Features dynamic hint text and strict warnings (e.g. Prasugrel pre-treatment warning and invasive timeline-based loading guidelines) that update immediately.
- **Responsive Breakpoints:**
  - `≤900px`: Columns stack vertically, inline-input labels go full-width
  - `≤899px` (tablet): Inline inputs stack vertically, buttons 44px min-height
  - `≤768px`: Portal top navigation layout padding and typography adjustments
  - `≤640px`: Portal rows stack category badges vertically above protocol titles to conserve horizontal space
  - `≤600px` (NSTEMI mobile): `.patient-fields` switches from `flex` to `display: grid; grid-template-columns: 1fr 1fr`. Patient field inputs: `max-width: none; width: 100%`. Grid column assignment: `nth-child(odd) → col-1`, `nth-child(even) → col-2` as the base rule; class overrides: `.egfr-field { grid-column: 1 }` (col-left — same as HN/Age/Cr), `.asa-field { grid-column: 2 }` (col-right — same as Weight/Sex). GRACE Score rows (`.grace-inline-row`) switch to `flex-direction: row` with short labels (`HR:` / `SBP:` / `Cr:`) via dual `<span class="grace-label-full/short">` toggled by media query. **Sex field (`.patient-field:nth-child(4)`):** `display: flex; flex-direction: column; align-items: flex-start; overflow: hidden; min-width: 0` — stacks ชาย/หญิง radios vertically inside the narrow column. **Gender radio labels (`.patient-field .gender-radio`):** `display: flex; align-items: center; gap: 4px; white-space: normal; overflow: hidden` — `white-space: normal` (not `nowrap`) prevents labels from escaping the `1fr` cell; `min-width: 0` on the parent enables shrinking below intrinsic content size. Troponin header checkbox resets `margin-left: auto → 0`; H0/H1/H3 inputs stack vertically.

  - `≤599px` (mobile): Single-column portal grid, compact padding, horizontal scroll hint for order grid, flag labels stack
- **Touch Targets:** Buttons/rows min-height 44px on mobile

---

## 2. UI Components & States

| Component | Role / Target | States & Props |
| --- | --- | --- |
| **Portal List Row** | Braun-restrained row in a vertical ordered list. Restrained layout with no drop shadows, no lifts. Category tag is text-only, coloured via muted `.cat-*` tokens. Numbers are aligned via `font-variant-numeric: tabular-nums`. Monospace badges (`ACTIVE` / `PROTOTYPE`) represent release states. Left border is a `4px` sentinel (`border-left: 4px solid transparent`) in rest state that activates on hover without shifting layout (compensated by left-padding reduction from `16px` → `12px`). | **Rest:** transparent background on `#ebe7df`. **Hover:** background transitions to slate blue `#49628d` (`120ms linear`); left border-left-color transitions to Braun White `#F0EDE5` (`120ms linear`); all child text (num, category, title, status, arrow) transitions to `#F0EDE5` (`120ms linear`). Right arrow `→` shifts `4px` horizontally. **Focus:** `2px` solid ink border with `2px` offset (`outline: 2px solid var(--ink); outline-offset: 2px;`). |
| **Form Headers / In-page Titles** | Removed. All in-page headers, guidelines, and dividers are deleted from all 7 standing order pages and the drip calculator. Sticky nav bar serves as the single source of truth. | N/A |
| **Top Navigation Bar** | Sticky full-width bar injected by `ED_COMPONENTS.injectNavBar()`. Auto-detects page title from `document.title` (strips after `—`) unless explicitly overridden. Shows MNRH logo (38px height) on all pages. "Home" link + title text. Normalised standing order nav titles to include the page title, clinical guideline, and release version format. On viewports <=900px, dynamically parses and truncates the title (e.g. `NSTEMI V2.1.1` or `rt-PA Calc V2.0`) to prevent wrapping. Short title aliases in `parseTitle()`: strips `Standing Order`, `Protocol`, `Post-Intubation`, residual `Order` word; aliases `IV Infusion Drip Calculator → Drip Calc` and `rt-PA Dose Calculator → rt-PA Calc`. Final short titles: Antivenom / STEMI / NSTEMI / Massive PE / Heparin / Sedation / rt-PA Calc. | Blue gradient (`#1e3c72 → #2a5298`), `position: sticky; top: 0; z-index: 100`. Text colour: Braun White `#F0EDE5` (flat, warm ivory) for `.nav-home`, `.nav-title`, `.nav-center`, `.nav-right` — replacing previous pure white / rgba values. `width: calc(100% + (var(--page-pad) * 2))`, negative margins to escape body padding. Padding is `0 24px` (desktop), reduced to `0 16px` via media query at <=768px to ensure perfect horizontal alignment of the hospital logo across the portal and all order pages. Hidden in print via `@media print`. |
| **Floating Print Action Bar** | Fixed bottom bar shown after generate/blank, hidden on clear. Text-only labels (no emoji). On rtpa.html and nstemi.html, this is the sole print trigger — `#print-btn` was removed. On nstemi.html (real-time preview), the float bar shows on page load via `showFloatBar()` called after `calculateAndRender()`. | Green (#27ae60) bar with "Order พร้อมแล้ว", "พิมพ์ทันที" (→ `window.print()`), and "ดู Order" (→ scroll to results) buttons. `position: fixed; bottom: 0; z-index: 1000`. Hidden in print via `@media print`. |
| **Field Error State** | Red border highlight for empty/invalid required fields. | `.field-error` class: `border-color: #c0392b; box-shadow: 0 0 5px rgba(192,57,43,0.4)`. |
| **Fibrinolytic / Drug Card** | Card layout to select drugs. | `.selected` (Red border + light red BG), `.hover` (Muted red border), Default (Light gray border) |
| **Print Order Grid** | 5-column grid mapping to hospital medical chart layout. | `grid-template-columns: 2fr 1fr 3fr 1fr 3fr;` |
| **Dose Summary Banner** | Large visual badge displaying computed dose on screen. | `#screen-dose` or `#screen-grace`. Light yellow/red backgrounds. |
| **Patient Sticker Box** | Standardized dashed bounding box mimicking paper patient label stickers. | Screen: `width: 200px; height: 65px;` Print: `width: 60mm; height: 20mm;` |
| **Titration Assistant Card** | Dynamic lookup display showing next titration step. | Shows action, rate change, and next recheck alert. |
| **Coupled Dose Slider & Stepping** | Coupled range slider + number inputs with touch-friendly step buttons + datalist ticks for range guidelines. | Min, Default, and Max datalist text labels. Clamps on blur/input to enforce safety boundaries. PageUp/PageDown adjusts by 10x step, Home/End to limits. Patient weight is set via a range slider (30-250 kg) with a 1-decimal display (defaults to 50 kg). Restores weight from sessionStorage. |
| **Drip Calculator Safety States** | Infusion pump rate readout card visual highlight based on max dose ceiling ratio, and custom recommend guide box. | **Safe (<60% max):** Green background (`#e8f8f0`) with green text (`#27ae60`). **Warning (60-85%):** Amber background (`#fdf5e6`) with orange text (`#d35400`). **Critical (>85%):** Red background (`#fde8e8`) with red text (`#c0392b`) and red badge warning of near max dose. **Recommend Guide:** High-prominence card styled to match pump rate results display. |
| **Drip Calculator Formula & Concentration** | Dynamic radio choices for medication formulas and plain text display of mixing concentration. | Formula selection uses dynamic radio buttons under Medication Formula, displayed vertically (`flex-direction: column; gap: 4px`) — 1 option per line for fast scanning. **Single-preparation drugs** (Nitroglycerin, Nitroprusside, Esmolol): radio auto-checked + `readOnly` flag prevents accidental deselect — eliminates unnecessary click. Concentration after mixing uses inline bold text span (since it is uneditable anyway) instead of a disabled input box. Group header titles and borders are removed for minimal cognitive load. All inputs localization updated to English. |
| **NSTEMI DAPT Loading Panel** | Antiplatelet Loading (DAPT) selection card with ASA checkbox + P2Y12 radio group + dynamic risk-based hints. | **P2Y12 options:** Hold to Cath Lab, Clopidogrel 300 mg, Clopidogrel 600 mg, Ticagrelor 180 mg, Prasugrel 60 mg. **Default state:** All P2Y12 radios unchecked, ASA unchecked (fully blank — no pre-selected default). **ASA:** Checkbox (unchecked by default, disabled if ASA allergy selected). ASA stat (300 mg) and ASA cont (81 mg) print checkboxes are bound to this checkbox only — selecting a P2Y12 inhibitor does NOT auto-check ASA. **Hint box:** Yellow `#fffdf0` container showing risk-based recommendations (Very High/High → hold P2Y12; lower risk → upstream Ticagrelor/Clopidogrel). **Prasugrel caveat:** Normal grey text (`#666`) "— ให้ใน Cath Lab เท่านั้น" (workflow restriction, not contraindication — no red/warning styling). **Reset button:** Small red "ล้างตัวเลือก" clears all P2Y12 radios (unchecked) + unchecks ASA. **Print:** Stat Medications block uses `.order-list-plain` (no bullets); selected P2Y12 line shows ☑, others ☐; continuation section shows matching P2Y12 at maintenance dose (Clopidogrel 75 mg 1×1, Ticagrelor 90 mg 1 x 2 pc, Prasugrel 5/10 mg 1×1 with dose reduction if weight < 60 kg or age ≥ 75). |

---

## 3. Accessibility & Printing Constraints

### Accessibility (Screen)

- **Favicon:** Hospital logo PNG (`docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png`) on all 9 pages for tab identification.
- **ARIA Landmarks:** `role="navigation"` on the sticky nav bar. `aria-label="Home"` on the Home link.
- **Live Regions:** `aria-live="polite"` on dose summary banners and stroke results container — screen readers announce computed doses without interrupting workflow. Both dose and weight sliders in the drip calculator have dynamic `aria-valuenow` + `aria-valuetext` updated on every `recalculate()` call.
- **Focus Indicators:** Interactive inputs feature a clear outline focus state (`border-color: #c0392b` or `#007bff` with `box-shadow` glow).
- **Contrasts:** Minimum contrast ratio of 4.5:1 maintained for clinical text labels.
- **Form Validation:** Non-blocking validation via `ED_VALIDATE` (`shared/form-validate.js`). Inline `.field-error` + `.inline-error-msg` for field-level errors. `.clinical-warning` banner for safety alerts (SK contraindication, absolute CI). Zero `alert()` calls in `orders/*.html` (ER NOTE and NIHSS are a separate, decoupled subsystem and use native `alert()`/`confirm()` — see Asset Isolation Rule).

### Printing Constraints (A4 Layout)

- **Page Size:** `@page { size: A4 portrait; margin: 0 }` — content uses full A4 area (210mm × 297mm). Results container padding `5mm` provides the printable margin.
- **Body Reset:** `body { width: 210mm; display: block !important }` overrides screen `display: flex; flex-direction: column` for proper print flow.
- **5-Column Grid:** `min-width: auto; width: 100%; font-size: 8pt` (`9.5pt` for NSTEMI); `page-break-inside: avoid` — fits within A4 width and stays on one page. Screen retains `min-width: 900px` for readability.
- **Grid Header:** `padding: 3px; font-size: 8pt; line-height: 1.1`. First-child header (Progress Note) gets `padding-top/bottom: 5px` for visual balance.
- **Grid Cell:** `padding: 3px; font-size: 8pt` (`9pt` for NSTEMI); `line-height: 1.3` (`1.45` for NSTEMI). Order list items: `margin-bottom: 3px` (`4px` for NSTEMI); `line-height: 1.3` (`1.45` for NSTEMI). Demographics and GRACE variable lines are wrapped in `white-space: nowrap` spans with shortened blank print dotted line lengths to guarantee labels and values never wrap to separate lines. GRACE parameters are listed individually on their own line with no vertical divider bars `|` to maintain consistency across print and preview.
- **Page Break Control:** `page-break-inside: avoid` on order grid (prevents splitting). `page-break-inside: avoid` on individual grid cells, fib/AC cards, and sticker boxes. Stroke multi-page documents use `page-break-before: always`.
- **Stroke Pages:** `width: 195mm; margin: 0 auto; padding: 3mm 0` — matches original rtpamnrh.vercel.app layout for A4 fit.
- **Sticker Box:** Print dimensions `60mm × 20mm` (compact, matching stroke page sticker size). Screen size `200px × 65px`.
- **Back Link Hidden:** The sticky top navigation bar is hidden in print via `nav`, `.top-nav`, and `a[href*="index.html"]` selectors in `@media print`.
- **Signature Spacers & Alignments:** rt-PA order grid uses `<div style="height:10em">` spacers before doctor signature lines (ลงชื่อแพทย์ ER/MED, ลงชื่อแพทย์ MED) to fill A4 page height and prevent a top-heavy table. NSTEMI page uses a flex-grow blank space container (`.order-blank-space`) and `margin-top: auto` on signatures (`.print-signature-block`) inside the column cells to automatically stretch content and align signature blocks to the absolute bottom of the grid row.
- **No-Print Classes:** Screen-only controls, forms, banners, buttons, top nav, and floating print bar hidden via `display: none !important`.
- **Color:** All print output forced to black-on-white with `-webkit-print-color-adjust: exact`. Grid headers retain light gray background for structure.
- **Manual Fill Support:** When printing blank orders, checkboxes render as ☐, calculated fields replaced with dotted lines. All hardcoded ☑ items are explicitly reset to ☐.
- **NSTEMI Stat Medications Print:** Uses `.order-list-plain` modifier class (`list-style: none; padding-left: 0`) to render antiplatelet loading options (ASA, Clopidogrel 300/600, Ticagrelor, Prasugrel, ISDN) without bullet markers. 2-line layout: drug name on line 1, dose details indented on line 2 via `<br><span style="padding-left: 2em">`. Prasugrel print line uses normal text color (not red) — its Cath-lab restriction is a workflow note, not a contraindication. Ticagrelor continuation uses `1 x 2 pc` format. DAPT selection dynamically checks (☑) the selected P2Y12 line in both Stat Medications and Continuation sections; unselected options stay ☐.
- **Lab/IV/O2 Hygiene:** Lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders always render as ☐ in print. Only drug-related orders auto-check (☑).
- **Clinical Guideline Hints:** Inline contraindication and prescribing notes rendered within the printed anticoagulant block using `font-size: 9px; color: #666`. Pattern: `(CI: [threshold] — [action])`. Applies to Fondaparinux `(CI: CrCl <30 mL/min — ถ้าทำ PCI ต้องเสริม UFH bolus)` and dosing reference notes for Enoxaparin syringe sizes. Critical alerts (drug absolutely contraindicated) use `color: #c0392b` with ⚠️ prefix. Non-critical guidance uses neutral `#666` grey.
- **Real-time UX Interaction:** `calculateAndRender()` pattern — all NSTEMI inputs wired to a single idempotent render function via `addEventListener('input'/'change')`. Results panel always visible; no gated "calculate" step. Graceful fallback: any missing field renders `--` rather than throwing. Auto-select of recommended drug fires only when a prerequisite value (eGFR) is available, preventing overwrite of manual clinician selection. Print triggered by `id="create-order-btn"` ("🖨️ สร้างใบสั่งยา") calling `window.print()`, and by the floating print action bar (`showFloatBar()` called on page load after `calculateAndRender()`) — `#print-btn` was removed, eliminating the recurring double-fire bug class. `setupCommonActions()` is NOT called for NSTEMI. Blank-order button (`id="print-blank-btn"`) calls `applyBlankTemplate()` + `window.print()` on user click — but cold-load and clear-btn call `applyBlankTemplate()` directly (DOM-only, no print dialog). Clear button resets form + validation state + anticoag/DAPT panel state + calls `calculateAndRender()` (re-renders GRACE score/risk badge to blank state) + `applyBlankTemplate()` without hiding `#results-container`. Print signature block in Column 1 (Progress Note) shows 3-line version attribution: `Version: 2.1.1` / `2025 ACC/AHA ACS` / `2023 ESC NSTEMI Guideline`.

---

## 5. NIHSS Score Tool Visual Language

The NIHSS tool (`tools/nihss.html`) is a standalone stroke severity scoring worksheet. It uses the cream/paper design system (not the dark glassmorphism of ER NOTE), shared only via inline `<style>` — no `shared/base.css`, `shared/components.js`, or `shared/form-validate.js`.

### Design Tokens (NIHSS)

| Token | Value | Usage |
| --- | --- | --- |
| Cream background | `#ebe7df` | Page background |
| Paper white | `#ffffff` | Sheet card |
| Header background | `#d8d3c6` | Title bar, total row, thead |
| Ink / border | `#2b2b2b` | Table borders, rules |
| Muted text | `#8a8a82` | Footer, sub-labels |
| Accent | `#7a3b2e` | Focus ring, total score highlight |
| Font | `TH Sarabun New`, `Sarabun`, `Noto Sans Thai` | Thai-first, same family as standing orders |

### NIHSS Layout

- Toolbar: right-aligned row above the sheet. Three buttons: "พิมพ์ที่กรอกแล้ว" (→ `printWithData()`), "พิมพ์ NIHSS เปล่า" (→ `printBlank()`), "ล้างข้อมูล" (→ `clearAll()`). All three are `.no-print` (hidden in print).
- Sheet: `max-width: 900px`, centered, white background, `2px solid` border.
- Title bar: centered header with English title + Thai subtitle, `background: #d8d3c6`.
- Table: 5 columns total (category, score list, 3 assessment columns). Column widths are `.col-cat 22%`, `.col-score 40%`, `thead th 8%` × 3.
- 3 assessment columns support repeated evaluations over time (e.g. admission, post-rt-PA, q1h).
- Total row: spans first 2 columns, shows per-column auto-sum via `recalc()`.
- Signature rows: initials + signature cells in the same 3 assessment columns.
- Footer note: muted centered text, `border-top: 1px solid #8a8a82`.

### NIHSS Components

| Component | Description |
| --- | --- |
| Score cell | `.score-list div{margin:1px 0}` — each item on its own line |
| Subrow label | `.subrow-label` — centered, `background:#f7f5f0`, used for 5a/5b and 6a/6b split rows |
| Input cell | `input.cell` — transparent background, `1px solid` accent on focus with `#fffceb` tint |
| Total display | `#total-1`–`#total-3` — per-column auto-sum spans, updated by `recalc()` |
| Toolbar button | `border: 1px solid #2b2b2b`, `background: #d8d3c6`; hover: `#cfc9b8` |

### Print Behavior

- `@media print`: A4 portrait, pure black-on-white. `@page{size:A4 portrait;margin:8mm 16mm;}`, `font-size:10pt`, `table:9pt`, grid borders `0.75px solid #000`. All colored surfaces (title-bar, thead, total row, subrow-label, sig-row) forced to `#fff` background. Toolbar and `.no-print` hidden.
- "พิมพ์ที่กรอกแล้ว" → `window.print()` directly (preserves entered scores).
- "พิมพ์ NIHSS เปล่า" → `printBlank()` clears inputs → `recalc()` → `window.print()` (all inputs blank, totals = 0).
- `?print-blank-direct=true` → auto-calls `printBlank()` on page load (used by rtpa "NIHSS เปล่า" popup button).

### Interaction

- `recalc()` runs on every `input` event across all 15 row keys (`1a`–`11`) and 3 assessment columns, summing integer values per column.
- Non-numeric or empty cells are skipped (no NaN).
- `clearAll()` requires `confirm()` before clearing.
- No localStorage persistence — each session starts fresh.

## 6. ER NOTE Tool Visual Language

The ER NOTE tool (`tools/er-note/`) is a separate clinical-note worksheet family. It deliberately does **not** reuse the standing-order `shared/base.css`, `shared/components.js`, or `shared/form-validate.js` contracts; its visual language and behaviour are self-contained in `er-note.css` and `er-note.js`.

### Design Tokens (ER NOTE)

| Token | Value | Usage |
| --- | --- | --- |
| Background | `#0f1115` | Full-page dark screen background. |
| Card Surface | `#181b21` | Section cards; subtle border `#2a2e36`. |
| Primary Text | `#f5f6f8` | Headings, labels, input values. |
| Muted Text | `#8b94a8` | Placeholders, hints, footer, secondary metadata. |
| Accent | `#5E6AD2` (indigo) | Active tab underline, primary buttons, score highlight. |
| Danger | `#c0392b` | Clear button, destructive actions. |
| Secondary | `#3d4554` | Copy button background. |
| Font | `Inter Tight` (Latin) + `Sarabun` (Thai) | Matches portal typography; body `15px`, labels `13px`. |
| Border Radius | `12px` cards, `8px` inputs/buttons | Soft glassmorphism; no elevation shadows. |
| Spacing | `16px` card gap, `12px` internal field gap | Compact vertical rhythm for long forms. |
| `--tpl-general` | `#5E6AD2` | General template sidebar card border. |
| `--tpl-sepsis` | `#d84315` | Sepsis template (red — risk-high). |
| `--tpl-trauma` | `#e65100` | Trauma template (orange — time-critical). |
| `--tpl-mammalian-bite` | `#2e7d32` | Mammalian bite template (dark green). |
| `--tpl-chest-pain` | `#6A1B9A` | Chest pain template (deep purple). |
| `--tpl-abdominal-pain` | `#9a6a1a` | Abdominal pain template (brown-yellow). |
| `--tpl-eye-injury` | `#00897B` | Eye injury template (teal). |

### ER NOTE Layout

- **Top Nav:** Sticky dark bar with MNRH logo + `ER NOTE` title + `← Home` back link. Uses the same Braun White `#F0EDE5` nav text as standing-order pages.
- **Tab Bar:** Full-width row below nav showing the 7 templates in fixed clinical order: General ER Note → Sepsis → Trauma → Mammalian Bite → Chest Pain → Abdominal Pain → Eye Injury. Active tab gets bottom border in accent colour.
- **Main Content:** Vertical stack of `.card` sections, each with a numbered `.section-title` (`.num` circle badge) and one or more `.field-row`s.
- **Inline Rows:** Groups of related numeric inputs (vitals, scores) are laid out with `.inline-row` that wraps on narrow screens.
- **Action Bar:** Fixed bottom bar with Copy Note, Clear, Print buttons; hidden in print.
- **Print:** A4 portrait, dark UI suppressed, cards become plain bordered blocks, inputs show their values, tab bar and action bar hidden.

### ER NOTE Components

| Component | Role / Target | States & Props |
| --- | --- | --- |
| **Card** | Container for one clinical section (e.g. Vital Signs, HEART Score). | `background: #181b21; border: 1px solid #2a2e36; border-radius: 12px; padding: 16px`. |
| **Section Title** | Numbered heading inside each card. | `.section-title` + `.num` circle badge; accent background for the number. |
| **Field Row** | Label + input/textarea/select pair. | `display: flex; flex-direction: column; gap: 6px`. Labels are muted; inputs have dark background and light border. |
| **Inline Row** | Side-by-side compact inputs (vitals, score dropdowns). | `display: flex; flex-wrap: wrap; gap: 12px`. Each child `min-width: 120px; flex: 1`. |
| **Tab Bar** | Full-width cross-template navigation below top nav. | 7 links in fixed clinical order; active tab gets accent underline. Hidden in print. |
| **Checkbox / Radio Group** | Multi-select or single-select clinical options. | Labels wrap; groups use `gap: 8px 16px`. |
| **Score Line** | Read-only computed score/risk display (HEART, Alvarado, qSOFA/SIRS, GCS, etc.). | `.score-box.score-line` with `data-copy="Score: value"`. Inline `updateScores()` keeps both visible text and `data-copy` in sync on every relevant `change` event. |
| **Hint** | Contextual guidance (e.g. sepsis score totals). | Muted text, lives below related fields. |
| **Action Buttons** | Copy Note / Clear / Print. | Primary (accent), Secondary (copy), Danger (clear). Fixed bottom bar on screen only. |
| **Footer** | Version / metadata bar at bottom of each template. | Muted text, synchronized version string (currently `v25`). |
| **Patient Strip** | HN input field + template label at top of each form (above all `.card` sections). Used for patient identification and sidebar card display. | `display: flex; gap: 12px`. HN input `140px` width, bold. Hidden in `@media print`. |
| **Sidebar FAB** | Floating action button (right side, above action bar) toggling the draft manager panel. | `48px` circular, accent background, `☰` icon. `position: fixed; right: 20px; bottom: 80px; z-index: 95`. Hidden in `@media print`. |
| **Sidebar Panel** | Slide-in panel from right listing all drafts across all templates. | `340px` wide, `transform: translateX(100%)` → `0` when `.open`. Contains: header (title + close), "+ New Draft" button, real-time filter input, scrollable card list. `z-index: 96`. Hidden in `@media print`. |
| **Sidebar Card** | Draft entry in the sidebar list. Click navigates to that draft; delete button removes it. | `4px` left border colored by template (`--tpl-*` tokens). Shows HN, CC (truncated 40 chars), relative time, template label. Hover: `background: var(--paper-2)`. |
| **Investigation Module** | Structured lab/imaging order selection rendered by `ErNote.renderInvestigation(container, template)`. | Labs + Imaging checkbox groups from per-template presets, plus free-text row for items not in preset. No result-entry fields. `extractRow()` reads checkbox-groups and free-text separately. |
| **Treatment Module** | Structured treatment selection rendered by `ErNote.renderTreatment(container, template)`. | Checkbox group for common treatments + free-text textarea for details. Templates with clinical-protocol-specific fields (sepsis, mammalian-bite) keep existing fields; only supportive treatment checkboxes added. |
| **Compact Vitals Row** | Single-line vital signs input row for sepsis page. 6 inputs (T°, HR, RR, BP, SpO₂, Lactate) in one horizontal flex row with short labels. | `.vitals-compact` — `display: flex; gap: 6px; flex-wrap: nowrap`. Each `.vit` flexes equally (`flex: 1 1 0; min-width: 0`). Labels `11px` muted, inputs `14px` bold. Auto-filled inputs (from vital→score linking) get `.auto-filled` class (accent border + light indigo background). All ER NOTE templates use `.main` at `max-width: 1080px` to accommodate wider content. Hidden inputs wrap on narrow viewports. |
| **Float Status Box** | Fixed top-right sepsis risk indicator. Shows overall risk (LOW/MEDIUM/HIGH) plus 3 individual scores (SIRS, NEWS2, MEWS) with per-score color coding. Updates in real time as vitals and scores change. | `.float-status` — `position: fixed; top: 72px; right: 16px; z-index: 85`. White card with left border colored by overall risk: green (low), amber (medium), red (high). Per-score rows use `s-risk-*` classes: green (low), light-green (low-medium), amber (medium), red (high). On mobile (`≤560px`), repositions to `bottom: 70px; right: 8px`. Hidden in `@media print`. |
| **Button Group** | Tappable tile-style alternatives to radio/checkbox groups. Used in mammalian-bite for animal, location, status, category, tetanus wound type, and immunization history selections. | `.btn-group` — `display: flex; flex-wrap: wrap; gap: 6px`. Each `.btn-tile` is `min-height: 44px` (touch target), centered content, `3px` border-radius. Hidden radio/checkbox inputs (`opacity: 0; position: absolute`). Selected tile: accent background + white text via `:has(input:checked)`. Supports optional `.tile-icon`, `.tile-label`, `.tile-sub` sub-elements for illustrated tiles. |
| **Wound Illustration** | Inline SVG anatomical skin cross-section + isometric surface view illustrations on mammalian-bite category and tetanus wound type buttons. Each button shows two views side-by-side: cross-section (epidermis, dermis, subcutis, fascia, muscle layers with wound depth) and isometric (skin surface seen from outside with wound visible). | `.wound-illust-pair` — flex container holding 2 `.wound-illust` side-by-side. Each `.wound-illust` is `160×128px` with SVG viewBox `100×80`. Cross-section skin layer colors: epidermis `#e8c4a0`, dermis `#e0b48a`, subcutis `#f5e6d3`, fascia `#e8d5c0`, muscle `#c44545`. Isometric view uses `.iso-skin` (top surface) + `.iso-skin-shadow` (right face) with wound markers (red ellipses for punctures, red lines for scratches, blue for saliva). Captions "Cross-section" / "Isometric" below each view. Integrates with `.btn-tile`. |

### Interaction Patterns

- **Multi-patient draft persistence (schema v2):** Every input change saves to `localStorage` under `ernote-draft-{templateId}-{draftId}`, with a registry index at `ernote-registry` holding `{ id, template, hn, cc, updatedAt }` per draft. Lazy-create: no draft is created until the first field is entered. URL `?draft={id}` selects active draft. v1 single-draft keys auto-migrate on first load. Drafts survive tab/browser restarts until the user presses **Clear** or deletes via sidebar.
- **Sidebar draft manager:** Floating action button (FAB) on the right toggles a slide-in panel listing all drafts across all templates. Cards show HN, CC (truncated 40 chars), relative time, and a 4px template-colored left border. Real-time filter by HN or CC. Delete with `confirm()` dialog. "+ New Draft" creates a new draft for the current template and navigates to it.
- **Copy Note:** Walks every `.card`, collects filled labels/values, and writes a plain-text summary (section headers as `## Section`) to the clipboard. HN from patient strip is included at the top.
- **Print:** `window.print()` with an `@media print` stylesheet that inverts the dark UI to black-on-white, removes nav/tab/action/patient-strip/sidebar elements, and prints each card as a clean section.
- **Clear:** `form.reset()` + removes the current draft key + registry entry after confirmation.
- **Template calculators:** Score logic (qSOFA/SIRS, HEART, Alvarado, etc.) is embedded directly in each template file and updates read-only `.score-box` / `.hint` elements in real time.
- **Investigation/Treatment modules:** `ErNote.renderInvestigation(container, template)` and `ErNote.renderTreatment(container, template)` render structured checkbox groups + free-text from per-template presets defined in `er-note.js`. `loadDraft()` is deferred via `setTimeout` so these containers exist before draft values are restored.
- **Vital→Score auto-link (sepsis):** Typing vital sign values in the compact vitals row auto-checks corresponding SIRS checkboxes and auto-selects NEWS2/MEWS radio bands. Auto-linked radios carry a `data-auto-linked` flag so manual user selections are preserved — the auto-link only overrides previously auto-linked selections, never manual ones. The `updateScores()` function calls `autoLinkVitals()` before computing totals.
- **Float status box (sepsis):** A fixed top-right box shows overall sepsis risk (LOW/MEDIUM/HIGH) plus 3 per-score rows (SIRS, NEWS2, MEWS) with per-score risk color coding. `updateFloatStatus()` determines the overall risk level: SIRS ≥2 + high NEWS2/MEWS → HIGH; SIRS ≥2 → MEDIUM; medium NEWS2/MEWS → MEDIUM; otherwise LOW. Each score row gets an `s-risk-*` class (green/amber/red) based on its own severity. All score boxes in the form also get `risk-*` classes (SIRS: ≥2 high, 1 medium; NEWS2/MEWS per their existing thresholds).
- **Endemic rabies logic (mammalian-bite):** Thailand is rabies-endemic, so provoked/unprovoked and healthy/sick animal distinctions are NOT used for PEP decisions. The `updateRabies()` decision tree: (1) non-reservoir species (rodent, human) → no PEP; (2) Category I → no PEP; (3) Category II + reservoir → vaccine without RIG (or vaccine d0,d3 if previously vaccinated); (4) Category III + reservoir → RIG + vaccine (or vaccine d0,d3 if previously vaccinated, no RIG). Provoked/unprovoked is documented but does not affect PEP recommendations.

### Asset Isolation Rule

ER NOTE pages must not import `shared/base.css`, `shared/components.js`, or `shared/form-validate.js`. Shared style and behaviour are provided only by the local `tools/er-note/er-note.css` and `tools/er-note/er-note.js` files. This keeps the narrative-note UX decoupled from the standing-order print/float-bar lifecycle.

## 7. Standalone Tools Visual Language & Behavior

Standalone worksheets located directly in `tools/` (e.g., `nihss.html`, `Urgent-Clinic-Home-Medication.html`) are isolated from the standing-order validation and lifecycle engines.

### Urgent Clinic Home Medication (`tools/Urgent-Clinic-Home-Medication.html`)

- **Theme**: Screen mode uses the dark glassmorphism styling parameters (`#0f1115` body, `#181b21` cards) by importing `er-note/er-note.css`, with custom local overrides to manage the tabular layout on screen.
- **Form Layout**: Structured table separating Adult (left) and Pediatric (right) medication checklists. Includes numeric and text inputs inside table cells for doses/concentrations/vials.
- **Print Layout**: Pure black-and-white A4 print stylesheet. Thick border lines are preserved, inputs are converted into transparent borders with dotted underlines, and checkboxes are styled as custom `☐` and `☑` print marks.
- **Autosave Engine**: Local self-contained script listening to form `input` and `change` events, compiling form values into a single JSON object saved to local storage under `er-hub-home-med-draft`. Values are automatically restored on page initialization.
- **Note Formatting**: Local clipboard copy script compiling medication details, patient demographics, and immunizations into a clinical summary notes template.
