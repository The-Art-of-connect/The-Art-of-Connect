# Brand guide

**Legal name:** The Art of Connect, LLC (the logo artwork currently reads "The Art of Connection, LLC")
**Brand name / domain:** The Art of Connect · theartofconnect.com
**Tagline:** In business. In life. In love.

## Palette

| Name | Hex | Used for |
|---|---|---|
| Warm ivory cream | `#F8F3E9` | Main light sections, member dashboards, sign-in |
| Soft champagne cream | `#E8D9C5` | Accent light sections (privacy, pathways) |
| Rich espresso black | `#211C18` | Hero, explorer, header, footer, Owner Portal sidebar |
| Deep burgundy | `#781F35` | Professional recruitment section, ribbon accents |
| Champagne gold | `#C5A572` | Buttons, dividers, gold text on dark sections |

The public site is roughly 65% light and 35% dark, alternating section by section.
Each section picks a tone class (`theme-ivory`, `theme-cream`, `theme-dark` or
`theme-burgundy`), and all text and accent colors adapt automatically. The
palette and tones are defined once, at the top of `src/app/globals.css`.

### Readability rules (WCAG AA, verified)

- **Gold text on light sections** uses a deeper gold (`#6F5222`, 6.5:1 on ivory),
  because champagne gold on cream is only about 2:1. Champagne gold stays the
  color of buttons, dividers and decoration everywhere.
- **Gold text on burgundy** uses a light champagne (`#E2CBA0`, 6.6:1).
- **Gold buttons** always use espresso text on a champagne gradient (5.2:1 or higher).
- Green and red appear only as status indicators, with a darker variant on
  light sections.

## Logo assets (`public/brand/`)

- `monogram.webp`: the AC monogram on a transparent background (header, hero, icons)
- `lotus.webp`: the lotus ornament (section dividers)
- `logo-full.webp`: the full lockup on a transparent background
- `public/icon-512.png`, `public/apple-icon.png`, `public/og.jpg`: app icons and the social share image, on Onyx

## Typography

- Headlines: Cormorant Garamond (serif, italic for emphasis)
- Body: Manrope

Both fonts are bundled with the site, so there are no third-party font requests.
