# Brand guide

**Legal name:** The Art of Connect, LLC (the logo artwork currently reads "The Art of Connection, LLC")
**Brand name / domain:** The Art of Connect · theartofconnect.com
**Tagline:** In business. In life. In love.

## Signature colors

| Name | Hex | Used for |
|---|---|---|
| Onyx | `#171512` | Page background |
| Champagne Gold | `#C9AD83` | Primary accent, buttons, headings highlights; Business accent |
| Ivory | `#F5EFE6` | Text; Counseling accent |
| Bronze | `#725B3D` | Deep end of gold gradients, ambient glow |
| Burgundy | `#743F4D` | Ribbon lines, ambient glow; Relationships accent (as tint `#C98F9D` for legible text) |

The five colors are defined once, as tokens at the top of `src/app/globals.css`
(`--onyx`, `--champagne`, `--ivory`, `--bronze`, `--burgundy`). Change them there
and the whole site follows.

Full-strength Bronze and Burgundy are too dark to read as text on Onyx, so text
uses light tints of them. Green (`--success`) and red (`--danger`) appear only as
status indicators in forms and the Owner Portal, not as brand colors.

## Logo assets (`public/brand/`)

- `monogram.webp`: the AC monogram on a transparent background (header, hero, icons)
- `lotus.webp`: the lotus ornament (section dividers)
- `logo-full.webp`: the full lockup on a transparent background
- `public/icon-512.png`, `public/apple-icon.png`, `public/og.jpg`: app icons and the social share image, on Onyx

## Typography

- Headlines: Cormorant Garamond (serif, italic for emphasis)
- Body: Manrope

Both fonts are bundled with the site, so there are no third-party font requests.
