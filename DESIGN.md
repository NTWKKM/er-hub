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
- **Responsive Breakpoints:**
  - `≤900px`: Columns stack vertically, inline-input labels go full-width
  - `≤899px` (tablet): Inline inputs stack vertically, buttons 44px min-height
  - `≤599px` (mobile): Single-column portal grid, compact padding, horizontal scroll hint for order grid, flag labels stack
- **Touch Targets:** Buttons min-height 44px on mobile

---

## 2. UI Components & States

| Component | Role / Target | States & Props |
|---|---|---|
| **Portal Card** | Category-grouped card in single 3-column grid. Color-coded left border per category. No section titles, no emoji, no print-blank button. Stroke FAST TRACK is first card. | `.hover` (Lift + shadow), Default (Light gray border + 4px category color left border). `padding: 18px 20px`, `gap: 16px`. Grid: `repeat(3, 1fr)` desktop, `repeat(2, 1fr)` tablet (600–900px), `1fr` mobile (<600px). |
| **Portal Header** | Flex row: hospital logo (64×64, `docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png`) inline with title only. No Thai subtitle. Compact padding `16px 20px`, margin-bottom `16px`. | `display: flex; align-items: center; gap: 16px;` Blue gradient background. `drop-shadow` on logo. |
| **Top Navigation Bar** | Back link injected by `ED_COMPONENTS.injectTopNav()`. | `← กลับหน้าหลัก` link, `#2a5298`, `font-size: 14px`, `font-weight: bold`. Hidden in print. |
| **Floating Print Action Bar** | Fixed bottom bar shown after generate/blank, hidden on clear. | Green (#27ae60) bar with "พิมพ์ทันที" and "ดู Order" buttons. `position: fixed; bottom: 0; z-index: 1000`. Hidden in print via `@media print`. |
| **Field Error State** | Red border highlight for empty/invalid required fields. | `.field-error` class: `border-color: #c0392b; box-shadow: 0 0 5px rgba(192,57,43,0.4)`. |
| **Fibrinolytic / Drug Card** | Card layout to select drugs. | `.selected` (Red border + light red BG), `.hover` (Muted red border), Default (Light gray border) |
| **Print Order Grid** | 5-column grid mapping to hospital medical chart layout. | `grid-template-columns: 2fr 1fr 3fr 1fr 3fr;` |
| **Dose Summary Banner** | Large visual badge displaying computed dose on screen. | `#screen-dose` or `#screen-grace`. Light yellow/red backgrounds. |
| **Patient Sticker Box** | Standardized dashed bounding box mimicking paper patient label stickers. | Screen: `width: 200px; height: 65px;` Print: `width: 60mm; height: 20mm;` |
| **Titration Assistant Card** | Dynamic lookup display showing next titration step. | Shows action, rate change, and next recheck alert. |

---

## 3. Accessibility & Printing Constraints

### Accessibility (Screen)
- **Focus Indicators:** Interactive inputs feature a clear outline focus state (`border-color: #c0392b` or `#007bff` with `box-shadow` glow).
- **Contrasts:** Minimum contrast ratio of 4.5:1 maintained for clinical text labels.
- **Form Validation:** Visual alerts (`alert()`) and dynamic warning banners prevent incorrect ranges (e.g., weights outside 30-200 kg).

### Printing Constraints (A4 Layout)
- **Page Size:** `@page { size: A4 portrait; margin: 0 }` — content uses full A4 area (210mm × 297mm). Results container padding `5mm` provides the printable margin.
- **Body Reset:** `body { width: 210mm; display: block !important }` overrides screen `display: flex` for proper print flow.
- **5-Column Grid:** `min-width: auto; width: 100%; font-size: 8pt; page-break-inside: avoid` — fits within A4 width and stays on one page. Screen retains `min-width: 900px` for readability.
- **Grid Header:** `padding: 3px; font-size: 8pt; line-height: 1.1`. First-child header (Progress Note) gets `padding-top/bottom: 5px` for visual balance.
- **Grid Cell:** `padding: 3px; font-size: 8pt; line-height: 1.3`. Order list items: `margin-bottom: 3px; line-height: 1.3`.
- **Page Break Control:** `page-break-inside: avoid` on order grid (prevents splitting). `page-break-inside: avoid` on individual grid cells, fib/AC cards, and sticker boxes. Stroke multi-page documents use `page-break-before: always`.
- **Stroke Pages:** `width: 195mm; margin: 0 auto; padding: 3mm 0` — matches original rtpamnrh.vercel.app layout for A4 fit.
- **Sticker Box:** Print dimensions `60mm × 20mm` (compact, matching stroke page sticker size). Screen size `200px × 65px`.
- **Back Link Hidden:** The "← กลับหน้าหลัก" navigation link is hidden in print via `.top-nav` and `a[href*="index.html"]` selectors in `@media print`.
- **Signature Spacers:** rt-PA order grid uses `<div style="height:10em">` spacers before doctor signature lines (ลงชื่อแพทย์ ER/MED, ลงชื่อแพทย์ MED) to fill A4 page height and prevent a top-heavy table. Tuned from 5em (too little) and 15em (overflow to 5 pages) to 10em (exactly 4 pages).
- **No-Print Classes:** Screen-only controls, forms, banners, buttons, top nav, and floating print bar hidden via `display: none !important`.
- **Color:** All print output forced to black-on-white with `-webkit-print-color-adjust: exact`. Grid headers retain light gray background for structure.
- **Manual Fill Support:** When printing blank orders, checkboxes render as ☐, calculated fields replaced with dotted lines. All hardcoded ☑ items are explicitly reset to ☐.
- **Lab/IV/O2 Hygiene:** Lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders always render as ☐ in print. Only drug-related orders auto-check (☑).
