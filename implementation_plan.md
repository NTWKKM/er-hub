# Implementation Plan: Redesign of `index.html` to Braun × Mid-Century Modern Aesthetic

This document serves as a design and implementation specification to refactor the portal homepage (`index.html`) of NTWKKM/er-hub from the legacy glassmorphism aesthetic into a **Braun × Mid-Century Modern** layout. 

The redesign is inspired by Dieter Rams' "Ten Principles for Good Design," 1950s–60s Braun product graphics, and Swiss/Vignelli grid influences: clean layouts, honest typography, flat hierarchy, and clear functional priority.

---

## 1. Design Intent

*   **Thesis**: The hub is a functional clinical instrument panel, not a marketing portal. Visuals must convey clarity, quiet confidence, and immediate utility. 
*   **Anti-goals**: No backdrop blurs, no radial gradients, no card drop shadows, no category candy colors (purple/teal grids), no emojis, and no animated fade-ins on page load. All animations must be minimal, tactile, and respond to user actions.

---

## 2. Design Tokens (Inline `<style>` in `index.html`)

All styling must be defined strictly within the local `<style>` block in `index.html`, leaving the shared `shared/base.css` completely untouched to prevent regressions on clinical standing order pages.

*   **Palette (Braun-restrained with a single hot accent)**:
    *   `Paper`: `#f4f2ec` (warm off-white background)
    *   `Ink`: `#1a1a1a` (primary text, solid rules)
    *   `Graphite`: `#4a4a4a` (secondary metadata, status badges, and arrows)
    *   `Rule`: `#d8d4c8` (subtle hairline dividers)
    *   `Signal Orange`: `#d84315` (reserved ONLY for time-critical signal dots; meets WCAG graphical element 3:1 contrast requirements). For text-bound notifications of this color, adjust to `#c43c11` to satisfy WCAG AA 4.5:1 text contrast.
    *   `Muted Categories (text only)`: Ochre `#b8873a` (Neurology), Olive `#5a6b3b` (Anticoag/Procedural), Slate `#3a5566` (Cardiac/Pulmonary), Brick `#8a3a2a` (Toxicology).
*   **Typography**:
    *   *Display/UI*: `"Inter Tight"` as primary, falling back to `"Neue Haas Grotesk"` or standard sans-serif. Preserve `'Sarabun'` fallback strictly for Thai script rendering.
    *   *Numerals*: Apply `font-variant-numeric: tabular-nums` to `.order-num` for perfect horizontal alignment in lists.
    *   *Scale*: `12px` (badges/eyebrows), `14px` (category/metadata), `16px` (titles), `20px` (headers), `32px` (brand display) — strictly locked to this scale, no intermediate sizes.
    *   *Uppercase eyebrows*: `letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; font-size: 12px;`.
*   **Grid**:
    *   Single-column vertical layout centered on a 12-column Swiss grid (max-width `1120px`, gutter `24px`).
    *   8px baseline unit system.
*   **Radius**:
    *   `2px` only (representing Braun hardware corners). The legacy 12px pill radius is deprecated and must be removed.
*   **Shadows**:
    *   None. Visual separation is achieved strictly via 1px hairline rules (`--rule`).
*   **Motion**:
    *   `120ms linear` transitions applied strictly on interactive hovers. Staggered `fadeInUp` keyframes and springy cubic-bezier lifts are removed to ensure immediate performance and clinical sobriety.

---

## 3. Layout Rewrite of `index.html`

The legacy 3-column card grid is replaced with a clean vertical **numbered, ruled list** reminiscent of Braun product catalogs. 

```text
┌────────────────────────────────────────────────────────┐
│ [MNRH mark]   MNRH-ED HUB                 v · updated  │  ← 64px header, hairline bottom
├────────────────────────────────────────────────────────┤
│ STANDING ORDERS                                        │  ← eyebrow label, 12px caps
│ ──────────────────────────────────────────────────     │
│  01  Neurology     rt-PA Stroke FAST TRACK   ACTIVE   ●│  ← ACTIVE = production, ● = signal
│  02  Cardiac       STEMI Standing Order      PROTOTYPE●│  ← PROTOTYPE = beta-test/under-construction
│  03  Cardiac       NSTEMI Standing Order     ACTIVE    │
│  04  Pulmonary     Massive PE Fibrinolysis   PROTOTYPE●│
│  05  Anticoag.     Heparin Protocol          PROTOTYPE │
│  06  Toxicology    Antivenom Standing Order  PROTOTYPE │
│  07  Procedural    Post-Intubation Sedation  PROTOTYPE │
├────────────────────────────────────────────────────────┤
│ CLINICAL TOOLS                                         │
│ ──────────────────────────────────────────────────     │
│  T1  Calculator    IV Infusion Drip          PROTOTYPE │
└────────────────────────────────────────────────────────┘
```

*   **List Layout**: Each row has a `min-height: 56px` with vertical padding (`12px 16px`) to prevent touch targets overlaying on mobile.
*   **Visual Separators**: 1px horizontal hairline rules between rows.
*   **Hover State**: The background flatly transitions to a slightly darker warm gray (`#ece9df`) without vertical translation (no lift) or drop shadows.
*   **Responsiveness**: The page remains a clean, balanced single-column vertical list on all viewports.
    *   *Mobile (<640px)*: Category badges stack vertically above the protocol title to conserve horizontal space.

---

## 4. Element-by-Element Mapping

| Current Element | Replacement / New styling |
| :--- | :--- |
| `.portal-container` (radial-gradient body) | Flat `#f4f2ec` background, max-width `1120px` container, `48px` top padding. |
| `.portal-grid` (3-column layout) | `<ol class="order-list">` vertical list. |
| `.portal-card` (glassmorphism cards + colored border) | `<li class="order-row">` with hairline bottom border only. |
| `.card-category` (rounded pills) | Inline uppercase text, `12px`, letter-spaced, colored via muted category palette (Ochre/Olive/Slate/Brick). |
| `.card-title` (`17px` bold) | `16px` medium, ink color (applied locally; no global typography shifts). |
| `::before` (fading chevrons) | Static, clean `→` arrow at row end (`14px` graphite). |
| 7-Color Category System | Category is text-only. The **Signal Orange dot** is reserved strictly for time-critical protocols (rt-PA, STEMI, Massive PE). |
| Status badging | Small uppercase monospace badges (`ACTIVE` for verified clinical items, `PROTOTYPE` for beta-testing/under-construction worksheets). |
| `fadeInUp` keyframes | Completely removed. |
| Google Font imports | Add `Inter Tight` (preconnect + stylesheet) and retain `Sarabun` for Thai fallback. |

---

## 5. Status Annotation System

Standing orders are explicitly annotated with their clinical release state to guide physicians safely:
*   `ACTIVE`: Fully validated for production ER use. Applied to:
    *   `rt-PA Stroke FAST TRACK`
    *   `NSTEMI Standing Order`
*   `PROTOTYPE`: Currently under beta-test, verification, or construction. Applied to:
    *   `STEMI Standing Order`
    *   `Massive PE Fibrinolysis`
    *   `Heparin Protocol`
    *   `Antivenom Standing Order`
    *   `Post-Intubation Sedation`
    *   `IV Infusion Drip Calculator`

The status label is styled in uppercase monospace (`font-family: monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.05em;`), colored graphite (`#4a4a4a`), and placed inline before the signal dot.

---

## 6. Header & Footer

*   **Header Customization**: Use a custom script override inside `index.html` executing post-injection of the `.top-nav` container.
    *   *Left*: Hospital logo mark (`docs/Logo_of_Maharat_Nakhon_Ratchasima-removebg-preview.png` scaled to `28px` height).
    *   *Center*: Wordmark `MNRH-ED HUB` in tracked uppercase.
    *   *Right*: `v13 · Updated 2026-07-04` in `12px` graphite.
    *   *Bottom border*: `1px solid var(--rule)`.
*   **Footer**: A single line centered at the page bottom in `12px` graphite: `Maharat Nakhon Ratchasima Hospital · Emergency Department`. No hyperlinked text, no social icons.

---

## 7. Accessibility & PWA

*   **PWA Assets**: Update `service-worker.js` with the new Google Font stylesheet URL (`Inter Tight`). 
*   **Cache Busting**: Bump `CACHE_VERSION` in `service-worker.js` to `er-hub-v13` to force client updates and clear old glassmorphism caches.
*   **Contrast**: Keep primary contrast (ink on paper) $\ge$ 12:1. The Signal Orange dot on paper satisfies the WCAG graphical element 3:1 contrast requirement.
*   **Focus State**: Active keyboard focus ring must render as a `2px` solid ink border with a `2px` offset (`outline: 2px solid #1a1a1a; outline-offset: 2px;`).
*   **Redirects**: Retain the `<script>` block that redirects legacy URL query parameters (`order=rtpa`, etc.) unchanged.

---

## 8. Technical Notes & Checklist

*   [ ] Register the new `Inter Tight` Google Font preconnect and stylesheet URL inside `index.html`.
*   [ ] Add `https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700&display=swap` to the `ASSETS` cache registry in `service-worker.js`.
*   [ ] Bump `CACHE_VERSION` in `service-worker.js` to `er-hub-v13`.
*   [ ] Rewrite local `<style>` in `index.html` to define all Braun design tokens and rules.
*   [ ] Update `<meta name="theme-color">` to `#f4f2ec`.
*   [ ] Replace `.portal-grid` card list layout with a semantic ordered list `<ol class="order-list">` containing `.order-row` items.
*   [ ] Inject the `ACTIVE` status badge to `rtpa` and `nstemi` links, and the `PROTOTYPE` status badge to `stemi`, `pe`, `heparin`, `antivenom`, `sedation`, and `drip-calculator` links.
*   [ ] Remove all `.cat-*` visual properties from `index.html` (these visual variables remain in individual order forms where required).
*   [ ] Validate that the breakout styling in `shared/base.css` `.top-nav` continues to render with `--page-pad: 0`.
*   [ ] Conduct visual validation across responsive viewports: mobile (375px), tablet (768px), and desktop (1280px).
