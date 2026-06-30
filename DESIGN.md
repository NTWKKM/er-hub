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
- **Container Max-Width:** `1100px`
- **Form Grid Gaps:** `20px` (STEMI/NSTEMI), `30px` (Stroke)
- **Mobile Responsive Breakpoint:** `900px` (or `768px` in stroke fast track). Below this, columns stack vertically.

---

## 2. UI Components & States

| Component | Role / Target | States & Props |
|---|---|---|
| **Portal Card** | Compact name-only card linking to each Standing Order. Center-aligned, icon + title + print-blank button only. No status badges. | `.hover` (Blue border + lift), Default (Light gray border). `padding: 18px 20px`, `min-width: 280px`, `gap: 16px`. |
| **Portal Header** | Flex row: Maharat Nakhon Ratchasima Hospital logo (52×52, `docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png`) inline with title. No subtitle. | `display: flex; align-items: center; gap: 18px;` Blue gradient background. |
| **Fibrinolytic / Drug Card** | Card layout to select drugs. | `.selected` (Red border + light red BG), `.hover` (Muted red border), Default (Light gray border) |
| **Print Order Grid** | 5-column grid mapping to hospital medical chart layout. | `grid-template-columns: 2fr 1fr 3fr 1fr 3fr;` |
| **Dose Summary Banner** | Large visual badge displaying computed dose on screen. | `#screen-dose` or `#screen-grace`. Light yellow/red backgrounds. |
| **Patient Sticker Box** | Standardized dashed bounding box mimicking paper patient label stickers. | `width: 200px; height: 65px; border: 1px dashed #999;` |
| **Titration Assistant Card** | Dynamic lookup display showing next titration step. | Shows action, rate change, and next recheck alert. |

---

## 3. Accessibility & Printing Constraints

### Accessibility (Screen)
- **Focus Indicators:** Interactive inputs feature a clear outline focus state (`border-color: #c0392b` or `#007bff` with `box-shadow` glow).
- **Contrasts:** Minimum contrast ratio of 4.5:1 maintained for clinical text labels.
- **Form Validation:** Visual alerts (`alert()`) and dynamic warning banners prevent incorrect ranges (e.g., weights outside 30-200 kg).

### Printing Constraints (A4 Layout)
- **Page Size:** `@page { size: A4; margin: 8mm 10mm 10mm 10mm }` — printable area ~190mm × 279mm.
- **Body Reset:** `body { display: block !important }` overrides screen `display: flex` for proper print flow.
- **5-Column Grid:** `min-width: auto; width: 100%; font-size: 8pt` — fits within A4 width. Screen retains `min-width: 900px` for readability.
- **Page Break Control:** `page-break-inside: avoid` applied to order grids, sticker boxes, and fib/AC cards. Stroke multi-page documents use `page-break-before: always`.
- **No-Print Classes:** Screen-only controls, forms, banners, and buttons hidden via `display: none !important`.
- **Color:** All print output forced to black-on-white with `-webkit-print-color-adjust: exact`. Grid headers retain light gray background for structure.
- **Manual Fill Support:** When printing blank orders, checkboxes render as ☐, calculated fields replaced with dotted lines.
- **Lab/IV/O2 Hygiene:** Lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders always render as ☐ in print. Only drug-related orders auto-check (☑).
