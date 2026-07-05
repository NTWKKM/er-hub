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
- **Portal List Layout:** Semantic ordered lists (`<ol class="order-list">`) of rows (`.order-row`) with `min-height: 56px` and padding (`12px 16px 12px 12px` — asymmetric to accommodate a `4px` transparent left border sentinel without text shift) for optimal touch targets. Visual separation via 1px hairline rules without drop shadows or card elevations. Background blends flatly with the `#ebe7df` page surface.
- **NSTEMI Compact Input Layout:** Patient Info (`.patient-section`) is a full-width top row with fields in a single-line flexbox (`.patient-fields`) containing: HN, Age, Weight(kg), Sex(M/F radio), Creatinine(mg/dL), and a red eGFR badge derived live via CKD-EPI 2021. Below it, a 3-column `.input-layout` row holds: (1) GRACE Score Variables (HR/SBP/Creatinine from patient info + binary flags), (2) Killip Class (compacted single-line radio labels with hover descriptions), (3) Risk Stratification (vertical checkbox list with standard labels). The GRACE creatinine input field is synchronized with the primary patient info creatinine input field via a robust two-way sync loop, allowing clinicians to input values in either location or calculate GRACE parameters independently. Troponin values block holds H0, H1, H3 values with no manual draw times. Anticoagulant selection is placed in the screen results box, featuring a small red "ล้างตัวเลือก" (Reset Option) button next to the "Anticoagulant Selection" header to allow clinicians to clear active selections. To ensure patient safety, options that are contraindicated (Fondaparinux at eGFR < 30, Enoxaparin at eGFR < 15) are styled as disabled (opacity 0.45, cursor not-allowed) and marked with a red `⛔ CI` badge, while the recommended option gets a green `✅ แนะนำ` badge. Clinicians can bypass the CI warning via a two-click safety override (first click prompts for validation with an orange dashed border, second click checks the radio and shows an override status). When overridden, the option is checked (☑) on-screen and in print preview, and uses color-fill/border highlights just like normal recommended options, and the warnings are changed to "ใช้นอกGuideline ไม่ควรให้เมื่อ eGFR < 30" (Fondapalinux) and "ใช้นอกGuideline ไม่ควรให้เมื่อ eGFR < 15" (Enoxaparin). Choosing an option dynamically updates the print area's Continuation column to show checkboxes for 0.4 ml vs 0.6 ml pre-filled syringes (line 1) and q12h vs OD frequency (line 2, indented 5 spaces) with a 2-line clinical guidance note detailing the calculated dose and package equivalence (0.4 ml = 40 mg, 0.6 ml = 60 mg). eGFR-based limits are labeled as eGFR rather than CrCl (e.g. CI: eGFR < 30 mL/min for Fondaparinux, and adding CI: eGFR < 15 mL/min hint for Enoxaparin). **Antiplatelet selection (DAPT):** Placed in the same results column block next to Anticoagulant selection, displaying a clean form with checkbox for Aspirin (300 mg) loading and radio buttons for P2Y12 loading (Hold, Clopidogrel 300/600 mg, Ticagrelor 180 mg, or Prasugrel 60 mg) along with a red "ล้างตัวเลือก" button. Features dynamic hint text and strict warnings (e.g. Prasugrel pre-treatment warning and invasive timeline-based loading guidelines) that update immediately.
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
| **Floating Print Action Bar** | Fixed bottom bar shown after generate/blank, hidden on clear. Text-only labels (no emoji, per ADR-09 consistency). | Green (#27ae60) bar with "พิมพ์ทันที" and "ดู Order" buttons. `position: fixed; bottom: 0; z-index: 1000`. Hidden in print via `@media print`. |
| **Field Error State** | Red border highlight for empty/invalid required fields. | `.field-error` class: `border-color: #c0392b; box-shadow: 0 0 5px rgba(192,57,43,0.4)`. |
| **Fibrinolytic / Drug Card** | Card layout to select drugs. | `.selected` (Red border + light red BG), `.hover` (Muted red border), Default (Light gray border) |
| **Print Order Grid** | 5-column grid mapping to hospital medical chart layout. | `grid-template-columns: 2fr 1fr 3fr 1fr 3fr;` |
| **Dose Summary Banner** | Large visual badge displaying computed dose on screen. | `#screen-dose` or `#screen-grace`. Light yellow/red backgrounds. |
| **Patient Sticker Box** | Standardized dashed bounding box mimicking paper patient label stickers. | Screen: `width: 200px; height: 65px;` Print: `width: 60mm; height: 20mm;` |
| **Titration Assistant Card** | Dynamic lookup display showing next titration step. | Shows action, rate change, and next recheck alert. |
| **Coupled Dose Slider & Stepping** | Coupled range slider + number inputs with touch-friendly step buttons + datalist ticks for range guidelines. | Min, Default, and Max datalist text labels. Clamps on blur/input to enforce safety boundaries. PageUp/PageDown adjusts by 10x step, Home/End to limits. Patient weight is set via a range slider (30-250 kg) with a 1-decimal display (defaults to 50 kg). Restores weight from sessionStorage. |
| **Drip Calculator Safety States** | Infusion pump rate readout card visual highlight based on max dose ceiling ratio, and custom recommend guide box. | **Safe (<60% max):** Green background (`#e8f8f0`) with green text (`#27ae60`). **Warning (60-85%):** Amber background (`#fdf5e6`) with orange text (`#d35400`). **Critical (>85%):** Red background (`#fde8e8`) with red text (`#c0392b`) and red badge warning of near max dose. **Recommend Guide:** High-prominence card styled to match pump rate results display. |
| **Drip Calculator Formula & Concentration** | Dynamic radio choices for medication formulas and plain text display of mixing concentration. | Formula selection uses dynamic radio buttons under Medication Formula. Concentration after mixing uses inline bold text span (since it is uneditable anyway) instead of a disabled input box. Group header titles and borders are removed for minimal cognitive load. All inputs localization updated to English. |

---

## 3. Accessibility & Printing Constraints

### Accessibility (Screen)

- **Favicon:** Hospital logo PNG (`docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png`) on all 9 pages for tab identification.
- **ARIA Landmarks:** `role="navigation"` on the sticky nav bar. `aria-label="Home"` on the Home link.
- **Live Regions:** `aria-live="polite"` on dose summary banners and stroke results container — screen readers announce computed doses without interrupting workflow.
- **Focus Indicators:** Interactive inputs feature a clear outline focus state (`border-color: #c0392b` or `#007bff` with `box-shadow` glow).
- **Contrasts:** Minimum contrast ratio of 4.5:1 maintained for clinical text labels.
- **Form Validation:** Non-blocking validation via `ED_VALIDATE` (`shared/form-validate.js`). Inline `.field-error` + `.inline-error-msg` for field-level errors. `.clinical-warning` banner for safety alerts (SK contraindication, absolute CI). Zero `alert()` calls in the codebase.

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
- **Lab/IV/O2 Hygiene:** Lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders always render as ☐ in print. Only drug-related orders auto-check (☑).
- **Clinical Guideline Hints:** Inline contraindication and prescribing notes rendered within the printed anticoagulant block using `font-size: 9px; color: #666`. Pattern: `(CI: [threshold] — [action])`. Applies to Fondaparinux `(CI: CrCl <30 mL/min — ถ้าทำ PCI ต้องเสริม UFH bolus)` and dosing reference notes for Enoxaparin syringe sizes. Critical alerts (drug absolutely contraindicated) use `color: #c0392b` with ⚠️ prefix. Non-critical guidance uses neutral `#666` grey.
- **Real-time UX Interaction:** `calculateAndRender()` pattern — all NSTEMI inputs wired to a single idempotent render function via `addEventListener('input'/'change')`. Results panel always visible; no gated "calculate" step. Graceful fallback: any missing field renders `--` rather than throwing. Auto-select of recommended drug fires only when a prerequisite value (eGFR) is available, preventing overwrite of manual clinician selection. Print triggered by `id="create-order-btn"` ("🖨️ สร้างใบสั่งยา") and `id="print-btn"` (inside results), both calling `window.print()` exactly once (duplicate listener removed). Clear button resets form + validation state + re-triggers blank template without hiding `#results-container`. Print signature block in Column 1 (Progress Note) shows 3-line version attribution: `Version: 2.1.1` / `2025 ACC/AHA ACS` / `2023 ESC NSTEMI Guideline`.
