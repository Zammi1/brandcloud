# @brandcloud/astro

BrandCloud marketing components for Astro sites. They ship as `.astro` source, render to plain
HTML and CSS, and send no client JavaScript unless a component needs a small progressive
script (Navbar and EnquiryFormShell, about 2 KB together). Every colour, font,
radius and shadow comes from `@brandcloud/tokens` custom properties, so one brand file restyles the
lot. Static pages never ship React just to render a button.

## Install

```sh
# npm packages are coming soon; until then, pack them from the repository (see its README)
pnpm add ../brandcloud/packs/brandcloud-astro-0.9.0.tgz ../brandcloud/packs/brandcloud-tokens-0.9.0.tgz astro
```

Load the tokens once, set the brand on `<html>`, then import components one by one (only the
components you import, and their CSS, end up on the page):

```astro
---
import "@brandcloud/tokens/css";
import "@brandcloud/tokens/brands/harbour.css"; // the brand palette, when the site uses one
import Hero from "@brandcloud/astro/components/Hero.astro";
import Button from "@brandcloud/astro/components/Button.astro";
import type { HeroCopy } from "@brandcloud/astro/copy-types";

const copy: HeroCopy = {
  heading: "Physio in Ashby Vale that gets you back to running",
  lede: "Assessment and treatment in one hour, with a written plan.",
  primary: { label: "Book an assessment", href: "/book/" },
  secondary: { label: "Message us on WhatsApp", href: "https://wa.me/447700900123", external: true, channel: "whatsapp" },
};
---
<html lang="en-GB" data-brand="harbour" data-theme="light">
  <body>
    <Hero copy={copy} variant="editorial" />
    <Button href="/prices/" tone="ink">See prices</Button>
  </body>
</html>
```

The barrel (`import { Hero } from "@brandcloud/astro"`) works too, but it pulls every component's CSS
into the page. Use it for types and helpers.

## Components

| Component | Layouts (`variant` / `layout`) | Notes |
|---|---|---|
| `Button` | `tone` brand, ink, neutral, danger, whatsapp, level; `appearance` depth, solid, outline, ghost; `level` sky, blue, navy, pearl, obsidian; `size` sm, md, lg; `loading`, `disabled` | Same props as the React `@brandcloud/ui` Button. `<a>` with `href`, otherwise `<button type="button">`. No arrows; `channel` adds a WhatsApp, phone or email glyph. `variant` is a shadcn alias only. |
| `Container` | `width` narrow, default, wide, full | |
| `Section` | `tone` default, muted, raised, ink, brand; `space` none, tight, default, loose | `tone` re-points the tokens for everything inside. `appearance` (neutral, brand, inverse) is accepted as an alias for props copied from `@brandcloud/blocks`. |
| `Heading` | `as` h1 to h4 or p; `size` display, h1 to h4 | Rank and look are independent. No eyebrow slot. |
| `Hero` | split, field, editorial | `copy: HeroCopy`. split needs `media` (falls back to editorial). field shows `facts`. |
| `Steps` | rail, list, split | A real `<ol>`, numbered in text. |
| `TrustStrip` | rule, inline, logos | Real credentials only. |
| `Faq` | split, stacked | Native `<details>`; `ask` adds a "still have questions" action. |
| `CtaBand` | band, card, split | `copy: CtaCopy`, optional `urgency: UrgencyCopy` (shown only with a reason and an end date or policy). Slot `aside` for split. |
| `Navbar` | split, left; `tone` default, raised, ink | Mobile menu is `<details>`; the script adds Escape, outside click and link-click close. |
| `Footer` | columns, simple | Long emails wrap at the `@`. |
| `EnquiryFormShell` | stacked, grid, panel | No backend: posts natively to `action`. The script adds inline errors and focus. `mode="preview"` never sends. Consent is unticked and separate. |

Content types (`HeroCopy`, `CtaCopy`, `FaqItem`, `UrgencyCopy`, `StepItem`, `TrustItem`, `NavLink`, `FooterColumn` and the offer,
proof and guarantee shapes) live in `@brandcloud/astro/copy-types`. They are plain interfaces: pass plain strings. Add-ons can
validate the same objects before they render; the components never depend on that.

## Tokens

Components read only `--brand-*` properties, with the meanings `@brandcloud/tokens` defines. Newer tokens
are read with a fallback to an existing token, so the package also works with an older tokens build:

- Depth button: `action-depth-from/to` (body), `action-depth-glow` + `action-depth-glow-reach` (light rising
  from the bottom edge), `action-depth-sheen`, `action-depth-rim`, `action-depth-text`,
  `shadow-action-depth(-hover)`; sizes `action-height-sm/md/lg`; corner `radius-sm`.
- Other tones: `action-ink(-hover/-text)`, `whatsapp`, `whatsapp-highlight`, `whatsapp-hover`, `whatsapp-text`.
- Levels (`sky`, `blue`, `navy`, `pearl`, `obsidian`): buttons use `level-<L>-highlight` (top), `-base`
  (bottom and solid fill), `-hover` (solid hover), `-deep` (contact shadow), `-halo`, `-text`.
- Type and layout: `font-display`, `font-body`, `font-size-display/h1/h2/h3/lead`, `section-space-y`,
  `content-max`, `content-narrow`.

The brand decides the default button look, the same way `@brandcloud/ui` does: a Button without
`appearance` is solid, and depth inside any `[data-button-appearance="depth"]`
ancestor (put it on `<html>` to make depth the site default). Set `appearance` to force one.

Fonts are not shipped by `@brandcloud/tokens`: a site loads its own font files and keeps their licence next to them.

Gradients follow one rule: one hue, lighter at the top, deeper at the bottom, a thin
sheen and a soft same-hue shadow. They exist only on buttons and the one `brand`
section tone. No gradient text, blobs, glass or glows behind content. The package tests fail if
component CSS contains a raw colour, `background-clip: text`, `filter: blur` or `backdrop-filter`.

## CSS layers

Component styles live in `@layer components`, declared in Tailwind v4 order
(`theme, base, components, utilities`), so Tailwind utilities can adjust a component and
preflight never overrides it. Unlayered site CSS beats the package: keep site-wide element
rules (`h1`, `a`, `button`) in `@layer base`.

## Tests

```sh
pnpm --filter @brandcloud/astro test        # Astro container render tests + helper tests
pnpm --filter @brandcloud/astro typecheck   # astro check
```

