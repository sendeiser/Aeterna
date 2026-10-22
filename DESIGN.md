---
name: Aeterna Cemetery Management System
description: Sistema Administrativo, Catastral y Funerario para Chamical, La Rioja
colors:
  primary: "#00236f"
  primary-container: "#1e3a8a"
  on-primary: "#ffffff"
  on-primary-container: "#90a8ff"
  primary-fixed: "#dce1ff"
  primary-fixed-dim: "#b6c4ff"
  on-primary-fixed: "#00164e"
  on-primary-fixed-variant: "#264191"
  secondary: "#0051d5"
  secondary-container: "#316bf3"
  on-secondary: "#ffffff"
  on-secondary-container: "#fefcff"
  secondary-fixed: "#dbe1ff"
  secondary-fixed-dim: "#b4c5ff"
  on-secondary-fixed: "#00174b"
  on-secondary-fixed-variant: "#003ea8"
  tertiary: "#003120"
  tertiary-container: "#004a32"
  on-tertiary: "#ffffff"
  on-tertiary-container: "#4ac08f"
  tertiary-fixed: "#85f8c4"
  tertiary-fixed-dim: "#68dba9"
  on-tertiary-fixed: "#002114"
  on-tertiary-fixed-variant: "#005137"
  surface: "#faf8ff"
  surface-bright: "#faf8ff"
  surface-dim: "#d2d9f4"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f2f3ff"
  surface-container: "#eaedff"
  surface-container-high: "#e2e7ff"
  surface-container-highest: "#dae2fd"
  surface-variant: "#dae2fd"
  surface-tint: "#4059aa"
  on-surface: "#131b2e"
  on-surface-variant: "#444651"
  outline: "#757682"
  outline-variant: "#c5c5d3"
  error: "#ba1a1a"
  error-container: "#ffdad6"
  on-error: "#ffffff"
  on-error-container: "#93000a"
  background: "#faf8ff"
  on-background: "#131b2e"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "38px"
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.015em"
  headline-md:
    fontFamily: "Inter, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.01em"
  headline-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  code-cadastral:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.02em"
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "14px"
    letterSpacing: "0.04em"
rounded:
  sm: "0.125rem"
  md: "0.25rem"
  lg: "0.25rem"
  xl: "0.5rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  gutter: "1rem"
  margin: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
  button-secondary:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Aeterna Cemetery Management System

## Overview

**Creative North Star: "Municipal Rigor & High-Density Civic Cadastre"**

Aeterna Parque is an institutional management and cadastral system engineered for municipal cemeteries and funeral services in Chamical, La Rioja. The interface pairs deep institutional navy tones with calm, high-legibility cool surfaces, evoking administrative authority, legal transparency, and serene solemnity.

The application follows an **Operate mode**: data scanability, immediate spatial awareness of plots, strict tabular record integrity, and instant financial transaction confirmations outrank decorative spectacle. Every screen serves clerks, sextons, and treasury collectors with high information density, clear status indicators, and keyboard-first accessibility.

**Key Characteristics:**
- **Institutional Authority:** Grounded in municipal deep navy (`#00236f`) and electric cobalt secondary accents (`#0051d5`).
- **Cool Surface Tinting:** Backgrounds never use sterile harsh white; surfaces leverage soft tinted blues (`#faf8ff` to `#eaedff`).
- **Cadastral Legibility:** JetBrains Mono typography for plot identifiers (e.g., `A-25-96`), Tomo/Folio records, and monetary values.
- **Biosecurity Distinctions:** Purple/violet accents strictly reserved for COVID-19 biosecurity protocol records.

## Colors

The palette balances administrative authority, clear operational states, and sanitary protocol badges.

### Primary
- **Municipal Deep Navy** (`#00236f`): Core brand authority, sidebar header, prominent primary action buttons, and top navigation titles.
- **Deep Navy Container** (`#1e3a8a`): Active states, focused badge containers, and high-emphasis headers.

### Secondary
- **Electric Cobalt** (`#0051d5`): Interactive highlights, focus rings, links, and secondary button hover states.
- **Cobalt Light Container** (`#316bf3`): Metric accent highlights and secondary badges.

### Tertiary
- **Cypress Deep Green** (`#003120`): Financial verification badges, paid insurance indicators, and solvency status.
- **Spring Mint** (`#4ac08f` / `#85f8c4`): Positive balance indicators, online sync badges, and paid installment pills.

### Neutral
- **Surface Canvas** (`#faf8ff`): The main workspace backdrop, providing a comfortable, glare-free operational environment.
- **Surface Container Lowest** (`#ffffff`): Foreground cards, tables, and modal containers.
- **Surface Container Low** (`#f2f3ff`): Subtle input backgrounds, table headers, and inactive tabs.
- **Surface Container** (`#eaedff`): Active navigation items, selected table rows, and secondary button fills.
- **Outline Variant** (`#c5c5d3`): Crisp 1px structural dividing lines between cadastral cells and tables.
- **Text On Surface** (`#131b2e`): High-contrast primary typographic content.
- **Text On Surface Variant** (`#444651`): Secondary captions, field descriptions, and metadata.

### Named Rules
**The Municipal Solemnity Rule.** The primary navy `#00236f` anchors top-level hierarchy and primary CTAs. Saturated tones are reserved strictly for status communication (emerald for paid/available, amber for reserved, crimson for mora/unpaid, violet for COVID-19).

## Typography

**Display & UI Font:** Inter (with system sans-serif fallback)  
**Cadastral & Numeric Font:** JetBrains Mono (monospace)  

**Character:** Balanced grotesque with exceptional micro-legibility paired with tabular monospaced numbers for financial figures and cadastral coordinates.

### Hierarchy
- **Display** (700, 30px, line-height 38px): Top-level summary heroes and printable receipts.
- **Headline-Lg** (600, 24px, line-height 32px): Primary module headings and invoice totals.
- **Headline-Md** (600, 20px, line-height 28px): Section titles and modal dialog headers.
- **Title-Md** (600, 14px, line-height 20px): Card titles, table header labels, and field groups.
- **Body-Md** (400, 13px, line-height 18px): Standard UI content, table row cells, and form inputs.
- **Body-Sm** (400, 12px, line-height 16px): Supporting metadata, subheadings, and help text.
- **Label-Caps** (600, 11px, line-height 14px, letter-spacing 0.04em): Uppercase pill tags, status pills, and keyboard shortcuts.
- **Code-Cadastral** (600, 12px, line-height 16px, monospaced): Plot codes (`A-01-01`), CBU numbers, receipt hashes, and dates.

### Named Rules
**The Tabular Alignment Rule.** All currencies, dates, phone numbers, and cadastral references must use `font-mono` (`JetBrains Mono`) with `tabular-nums` alignment to prevent horizontal jitter during rapid scanning.

## Layout

- **Spatial Model:** 16-column flexible desktop grid with a fixed 64px (`w-64`) left sidebar and 56px (`h-14`) top navigation bar.
- **Density:** High administrative density. Tables use compact cell padding (`py-2.5 px-3`) allowing 15+ rows per view without excessive vertical scrolling.
- **Two-Column Cadastral Layout:** Parcelas view splits into a 5-column left master entry form (`lg:col-span-5`) and a 7-column right detail inspector (`lg:col-span-7`).
- **Responsive Behavior:** Below 1024px, the layout transitions to a bottom bar with 5 navigation destinations and single-column stackable cards.

## Elevation & Depth

Aeterna employs **tonal layering over heavy drop shadows**. Flat borders and delicate background shifts demarcate zones of interest.

### Shadow Vocabulary
- **Ambient Low** (`shadow-xs` / `0 1px 2px rgba(19, 27, 46, 0.05)`): Subtle lift for buttons and segmented controls.
- **Card Rest** (`shadow-sm` / `0 1px 3px rgba(19, 27, 46, 0.08)`): Master containers, KPI cards, and cadastral panels.
- **Modal Elevation** (`shadow-2xl` / `0 25px 50px -12px rgba(19, 27, 46, 0.25)`): Popover dialogs, QR payment drawer, and omnibox palette.

### Named Rules
**The Structural Border Rule.** Depth is primarily established by `border border-outline-variant` on `bg-surface-container-lowest` rather than fuzzy shadows. This maintains crisp paper-like rendering suitable for printing.

## Shapes

- **Corners:** Tight, institutional radius (`rounded-md`: 4px, `rounded-lg`: 8px, `rounded-xl`: 12px).
- **Pills:** Full rounded capsules (`rounded-full`) exclusively used for status chips and filter tags.
- **Segmented Radios:** Flush 3-button segmented bars with seamless inner dividers for capacity selection (1, 2, 3 levels).

## Components

### Buttons
- **Shape:** Rounded-lg (8px) for primary CTAs; rounded-md (4px) for micro actions.
- **Primary:** `bg-primary` text `text-on-primary`, hover `bg-secondary` with smooth 150ms transition.
- **Secondary:** `bg-surface-container` text `text-primary`, hover `bg-surface-container-high`.
- **Destructive:** `bg-error-container` text `text-error`, hover `bg-error` hover:text-white.

### Cards / Containers
- **Corner Style:** Rounded-xl (12px).
- **Background:** `bg-surface-container-lowest` (`#ffffff`).
- **Border:** `border border-outline-variant` (`#c5c5d3`).
- **Internal Padding:** `p-4` to `p-6`.

### Inputs / Fields
- **Style:** `h-9` compact height, `bg-surface-container-lowest` or `bg-surface-bright`, `border border-outline-variant`, text `text-on-surface`.
- **Focus:** `focus:border-secondary focus:ring-1 focus:ring-secondary`.
- **Cadastral Fields:** Integrated mono font with fixed prefix chips (e.g., `+54 9` or sector badges).

### Navigation
- **Sidebar:** Fixed 256px wide, `bg-surface-container-lowest`, `border-r border-outline-variant`. Active item has `bg-surface-container text-primary font-semibold border-l-4 border-primary`.
- **TopBar:** 56px height, persistent quick search trigger (`Ctrl+K`), live Supabase status light, quick QR action button.

## Do's and Don'ts

### Do:
- **Do** format all plot nomenclatures as `SECTOR-MANZANA-PARCELA` (e.g. `A-25-96`) in `font-mono`.
- **Do** highlight COVID-19 inhumation records with violet badges (`#7C3AED` on `#F5F3FF`) per biosecurity standards.
- **Do** use `bg-surface-container-lowest` for cards and `bg-surface` for the root background.
- **Do** ensure all financial totals use Argentine Peso formatting (`$ 36.000,00`).

### Don't:
- **Don't** use generic red/green/blue shades when semantic tokens (`primary`, `secondary`, `tertiary`, `error`) are available.
- **Don't** use border-radius larger than 12px for system cards; keep the municipal silhouette crisp and orderly.
- **Don't** hide Tomo/Folio records or civil registry certificate numbers in inhumation views.
- **Don't** introduce floating floating elements without explicit `outline-variant` boundaries.
