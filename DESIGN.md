# Design System Guidelines

## 1. Design Tokens

### Color Palette (Dark Default)
- **Background Primary:** `#0d1117` (GitHub dark)
- **Background Secondary:** `#161b22` (Card/sidebar bg)
- **Background Tertiary:** `#21262d` (Input/hover bg)
- **Border:** `#30363d`
- **Border Active:** `#5E6AD2` (Accent)
- **Text Primary:** `#e6edf3`
- **Text Secondary:** `#8b949e`
- **Text Muted:** `#6e7681`
- **Accent:** `#5E6AD2` (Indigo — single accent for all active states)
- **Accent Hover:** `#7c84e0`
- **Accent BG:** `rgba(94, 106, 210, 0.12)`
- **Danger:** `#f85149`
- **Warning:** `#d29922`
- **Success:** `#3fb950`

### Light Theme (`:root[data-theme='light']`)
- **Background Primary:** `#f0f2f5`
- **Background Secondary:** `#ffffff`
- **Background Tertiary:** `#f6f8fa`
- **Border:** `#d0d7de`
- **Text Primary:** `#1f2328`
- **Text Secondary:** `#656d76`
- **Danger:** `#cf222e`
- **Warning:** `#bf8700`
- **Success:** `#1a7f37`

### Typography
- **Font Family:** `'Sarabun', sans-serif` (Google Fonts, weights 400/500/600/700)
- **Dose Result Value:** 32px bold accent color
- **Card Header:** 16px bold
- **Input/Form Text:** 15px
- **Slider Label:** 13px secondary, slider value 13px accent bold
- **Dose Result Label:** 12px uppercase secondary

### Layout
- **Sidebar Width:** 240px (sticky, full height)
- **Main Content:** max-width 1200px, padding 24px 32px
- **Card:** padding 20px, border-radius 8px, margin-bottom 16px
- **Grid:** `1fr 1fr` gap 16px for patient info form
- **Theme Toggle:** absolute top-right (16px/24px from edges)

---

## 2. UI Components

| Component | Role | States |
|---|---|---|
| **Sidebar** | Flat list of 8 nav items. Hospital logo (28px) + "MNRH-ED" header. Active item: accent bg + accent left border + bold. | `.active` (accent border-left 3px + accent-bg), `:hover` (bg-hover + text-primary) |
| **ThemeToggle** | Dark/light switch button. Top-right of main content. | Dark: "☀ Light", Light: "🌙 Dark" |
| **Card** | Container for form sections and results. | Default: bg-secondary + 1px border + 8px radius |
| **SliderInput** | Range slider with label + realtime value display. Label left, value right (accent color). | `:focus` — accent border + accent-bg box-shadow |
| **DoseResultCard** | Computed dose display: label (uppercase 12px), value (32px accent), unit (16px secondary), context (13px muted), ceiling (12px warning). | Default: accent-bg + accent border + 8px radius |
| **PatientInfoForm** | HN text input, eGFR text input (optional), weight slider (30-150, 0.1 step), age slider (18-120, 1 step). | Standard input states |
| **StickerBox** | Dashed border box for patient sticker in print area. | 2px dashed border, min 200px × 65px |
| **Clinical Warning** | Non-blocking safety banner. | warning bg (10% opacity) + warning border + warning text |
| **Field Error** | Red border + box-shadow on invalid inputs. | `.field-error` class via useFormValidation |

---

## 3. Accessibility & Print

### Accessibility
- **ARIA:** `role="navigation"` on sidebar, `aria-live="polite"` on dose result containers
- **Focus:** Accent border-color + accent-bg box-shadow on input focus
- **Contrast:** Minimum 4.5:1 for clinical text (dark theme: #e6edf3 on #0d1117 = 15:1)
- **Forms:** Non-blocking validation via useFormValidation (inline errors, clinical warnings — zero alert() calls)

### Print (A4 Layout)
- **Page Size:** `@page { size: A4 portrait; margin: 0 }`
- **Hidden Elements:** `.sidebar`, `.theme-toggle`, `.no-print` → `display: none !important`
- **Main Content:** padding 0, max-width none
- **Body:** white background, black text
- **HTML Blank Print:** rtpa, nstemi use `window.print()` on rendered template
- **PDF Pathway:** stemi, pe, heparin, antivenom, sedation open source PDF from `public/docs/` in new tab via `window.open()`