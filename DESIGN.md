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
| **Portal Card** | Compact name-only card linking to each Standing Order. Center-aligned, icon + title only. | `.hover` (Blue border + lift), Default (Light gray border). `padding: 18px 20px`, `min-width: 280px`, `gap: 16px`. |
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
- **Fixed Width Canvas:** Print container forced to `210mm` (A4 standard width) under `@media print` rules.
- **Page Break Control:** `page-break-inside: avoid` applied to order grids and sticker boxes to prevent text orphans.
- **No-Print Classes:** Screen-only controls, forms, banners, and buttons are hidden using `display: none !important` during print layout formatting.
- **Manual Fill Support:** When printing blank orders, checkboxes are rendered as unchecked (`☐`), and calculated fields/patient variables are replaced with standard dotted lines (`....................`) to allow clear manual entries.
- **Lab/IV/O2 Hygiene:** Lab investigations, IV fluids, oxygen, monitoring, and non-drug continuation orders always render as ☐ in print output. Only drug-related orders auto-check (☑) based on input data.
