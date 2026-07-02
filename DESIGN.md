# Design System Guidelines

## 1. Design Tokens

### Color Palette
- **Background:** `#f0f2f5` (Light neutral gray for screen background)
- **Container Background:** `#ffffff` (Card background)
- **Primary Text:** `#333333` (Charcoal gray)
- **Border Neutral:** `#cccccc` / `#dee2e6` (Light borders)
- **Card Selection Active:** `#ffeaa7` (High alert highlight / selected state background)

#### Module Specific Accents
- **Stroke (rt-PA):** Primary `#007bff` | Hover `#0056b3` | BG Highlight `#e6f0ff`
- **STEMI / NSTEMI / PE / Antivenom / Heparin / Sedation:** Primary `#c0392b` | Hover `#a93226` | BG Highlight `#fff5f5`
- **Success / Print:** Primary `#28a745` | Hover `#218838`
- **Neutral / Clear:** Primary `#7f8c8d` | Hover `#626c6d`

### Typography
- **Primary Font Family:** `'Sarabun', sans-serif` (Imported from Google Fonts)
- **Font Sizes:**
  - Page Heading (`h1`): `1.5em` (24px)
  - Section Heading (`h3`): `1.2em` (18px)
  - Input/Form Text: `15px`
  - Print Cells: `10.5px` (Optimized for space)
  - Print Headers: `16px`

### Breakpoints & Layout
- **Container Max-Width:** `1100px` (order pages), `1200px` (portal)
- **Form Grid Gaps:** `20px` (STEMI/NSTEMI), `30px` (Stroke)
- **NSTEMI Single-Line Input Layout:** Patient Info (`.patient-section`) is a full-width top row with fields in a single-line flexbox (`.patient-fields` nowrap) containing: HN, Age, Weight(kg), Sex(M/F radio), Creatinine(mg/dL). Live eGFR badge derived via CKD-EPI 2021 from Cr+age+sex. Below it, a 3-column `.input-layout` row holds: (1) GRACE Score Variables (HR/SBP/Creatinine synced from patient info + binary flags), (2) Killip Class (promoted to its own column — was previously stacked under GRACE), (3) Risk Stratification. Troponin kinetics section: 3-column grid for H0/H1/H3 values (ng/L) + manual time inputs (HH:MM). Continuation column has 3 anticoagulant options (Fondaparinux/Enoxaparin/Heparin) with doctor-select radio. Killip Class is its own column (separated from GRACE, ADR-18).
- **Responsive Breakpoints:**
  - `≤900px`: Columns stack vertically, inline-input labels go full-width
  - `≤899px` (tablet): Inline inputs stack vertically, buttons 44px min-height
  - `≤599px` (mobile): Single-column portal grid, compact padding, horizontal scroll hint for order grid, flag labels stack
- **Touch Targets:** Buttons min-height 44px on mobile

---

## 2. UI Components & States

| Component | Role / Target | States & Props |
|---|---|---|
| **Portal Card** | Category-grouped card in single 3-column grid. Color-coded left border per category. No section titles, no emoji, no print-blank button, no card descriptions (removed per ADR-05). Stroke FAST TRACK is first card. Card title 17px bold for easy visibility. | `.hover` (Lift + shadow), Default (Light gray border + 4px category color left border). `padding: 18px 20px`, `gap: 16px`. Grid: `repeat(3, 1fr)` desktop, `repeat(2, 1fr)` tablet (600–900px), `1fr` mobile (<600px). |
| **Portal Header** | Removed. Nav bar replaces the portal header. Logo and title card deleted from `index.html`. | N/A |
| **Top Navigation Bar** | Sticky full-width bar injected by `ED_COMPONENTS.injectNavBar()`. Auto-detects page title from `document.title` (strips after `—`). Optional hospital logo (28px height) passed via `logoSrc` parameter — now shown on all 9 pages (portal + 7 orders + drip calculator, ADR-17 reverses ADR-14 Q3). Present on all 9 pages. "Home" text link (no icon) + title text. Negative margins (`-20px` top/left/right) escape `body { padding: 20px }` for flush-to-top, full-width display on order pages. `aria-label` on both Home link and title span. | Blue gradient (`#1e3c72 → #2a5298`), `position: sticky; top: 0; z-index: 100`. `width: calc(100% + 40px)`, negative margins to escape body padding. `Home` link + `.nav-title`. Hidden in print via `nav`, `.top-nav`, `a[href*="index.html"]` selectors in `@media print`. |
| **Floating Print Action Bar** | Fixed bottom bar shown after generate/blank, hidden on clear. Text-only labels (no emoji, per ADR-09 consistency). | Green (#27ae60) bar with "พิมพ์ทันที" and "ดู Order" buttons. `position: fixed; bottom: 0; z-index: 1000`. Hidden in print via `@media print`. |
| **Field Error State** | Red border highlight for empty/invalid required fields. | `.field-error` class: `border-color: #c0392b; box-shadow: 0 0 5px rgba(192,57,43,0.4)`. |
| **Fibrinolytic / Drug Card** | Card layout to select drugs. | `.selected` (Red border + light red BG), `.hover` (Muted red border), Default (Light gray border) |
| **Print Order Grid** | 5-column grid mapping to hospital medical chart layout. | `grid-template-columns: 2fr 1fr 3fr 1fr 3fr;` |
| **Dose Summary Banner** | Large visual badge displaying computed dose on screen. | `#screen-dose` or `#screen-grace`. Light yellow/red backgrounds. |
| **Patient Sticker Box** | Standardized dashed bounding box mimicking paper patient label stickers. | Screen: `width: 200px; height: 65px;` Print: `width: 60mm; height: 20mm;` |
| **Titration Assistant Card** | Dynamic lookup display showing next titration step. | Shows action, rate change, and next recheck alert. |

---

## 3. Accessibility & Printing Constraints

### Accessibility (Screen)
- **Favicon:** SVG medical cross icon (`favicon.svg`) on all 9 pages for tab identification.
- **ARIA Landmarks:** `role="navigation"` on the sticky nav bar. `aria-label="Home"` on the Home link.
- **Live Regions:** `aria-live="polite"` on dose summary banners and stroke results container — screen readers announce computed doses without interrupting workflow.
- **Focus Indicators:** Interactive inputs feature a clear outline focus state (`border-color: #c0392b` or `#007bff` with `box-shadow` glow).
- **Contrasts:** Minimum contrast ratio of 4.5:1 maintained for clinical text labels.
- **Form Validation:** Non-blocking validation via `ED_VALIDATE` (`shared/form-validate.js`). Inline `.field-error` + `.inline-error-msg` for field-level errors. `.clinical-warning` banner for safety alerts (SK contraindication, absolute CI). Zero `alert()` calls in the codebase.

### Printing Constraints (A4 Layout)
- **Page Size:** `@page { size: A4 portrait; margin: 0 }` — content uses full A4 area (210mm × 297mm). Results container padding `5mm` provides the printable margin.
- **Body Reset:** `body { width: 210mm; display: block !important }` overrides screen `display: flex; flex-direction: column` for proper print flow.
- **5-Column Grid:** `min-width: auto; width: 100%; font-size: 8pt; page-break-inside: avoid` — fits within A4 width and stays on one page. Screen retains `min-width: 900px` for readability.
- **Grid Header:** `padding: 3px; font-size: 8pt; line-height: 1.1`. First-child header (Progress Note) gets `padding-top/bottom: 5px` for visual balance.
- **Grid Cell:** `padding: 3px; font-size: 8pt; line-height: 1.3`. Order list items: `margin-bottom: 3px; line-height: 1.3`.
- **Page Break Control:** `page-break-inside: avoid` on order grid (prevents splitting). `page-break-inside: avoid` on individual grid cells, fib/AC cards, and sticker boxes. Stroke multi-page documents use `page-break-before: always`.
- **Stroke Pages:** `width: 195mm; margin: 0 auto; padding: 3mm 0` — matches original rtpamnrh.vercel.app layout for A4 fit.
- **Sticker Box:** Print dimensions `60mm × 20mm` (compact, matching stroke page sticker size). Screen size `200px × 65px`.
- **Back Link Hidden:** The sticky top navigation bar is hidden in print via `nav`, `.top-nav`, and `a[href*="index.html"]` selectors in `@media print`.
- **Signature Spacers:** rt-PA order grid uses `<div style="height:10em">` spacers before doctor signature lines (ลงชื่อแพทย์ ER/MED, ลงชื่อแพทย์ MED) to fill A4 page height and prevent a top-heavy table. Tuned from 5em (too little) and 15em (overflow to 5 pages) to 10em (exactly 4 pages).
- **No-Print Classes:** Screen-only controls, forms, banners, buttons, top nav, and floating print bar hidden via `display: none !important`.
- **Color:** All print output forced to black-on-white with `-webkit-print-color-adjust: exact`. Grid headers retain light gray background for structure.
- **Manual Fill Support:** When printing blank orders, checkboxes render as ☐, calculated fields replaced with dotted lines. All hardcoded ☑ items are explicitly reset to ☐.
- **Lab/IV/O2 Hygiene:** Lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders always render as ☐ in print. Only drug-related orders auto-check (☑).
