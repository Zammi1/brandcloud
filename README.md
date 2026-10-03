# BrandCloud

Website and docs: https://brandui.cloud

Landing pages that look made by hand, in your own brand, and that pass accessibility checks before anyone sees them.

BrandCloud is a free, open-source kit for people who launch web pages: marketers, small studios and the developers
who work with them. Give it four things (your accent colour, your ink, your paper and your fonts) and it builds a
complete brand: buttons with real depth, sections, forms, light and dark modes, every colour pair checked against
WCAG 2.2 AA. Then it checks your page for the tells that make a site look AI-generated, and tells you how to fix
each one.

## For marketers

- **Brand builder.** Pick or upload your colours, see your brand on real buttons and sections, check contrast,
  export it. Nothing to install: it runs in the browser at https://brandui.cloud/brand-builder/.
- **AI-look score.** Paste a page's HTML and get a score from 0 to 100 with the reasons and the fix for each.
  Developers can run the same checks on any URL with `brand-detect`.
- **Page recipes.** A campaign landing page, an offer page, an event page and a local service page, ready to fill
  with your words and pictures.
- **Guides.** How to make a page not look AI-made, and how to pick brand colours that pass accessibility.

## For developers

| Package | What it does |
|---|---|
| `@brandcloud/tokens` | Semantic tokens, brands from a small JSON file (`make-brand`), WCAG AA enforced at build, Tailwind v4 layer, shadcn/ui bridge, `brand-ui-lint` |
| `@brandcloud/ui` | Accessible React primitives: buttons (depth, solid, outline, ghost, ink, level), forms, dialogs, drawers, menus, tabs, toasts and more |
| `@brandcloud/astro` | Astro marketing components with zero client JavaScript by default: hero, steps, FAQ, call-to-action band, navigation, footer, enquiry form |
| `@brandcloud/motion` | Motion tokens, CSS utilities, View Transitions, character presets and spring drivers for web, React, Svelte and React Native; reduced-motion safe |
| `@brandcloud/antipatterns` | 41 rules for the visual tells of generated design, a detector (`brand-detect`) and bad/good example pairs |

npm packages are coming soon. Until then, install from this repository: clone it, pack the packages, then add
the packed files to your project.

```sh
git clone https://github.com/Zammi1/brandcloud.git
cd brandcloud && pnpm install && pnpm packs     # builds every package and packs it into ./packs

# then, in your project (next to the brandcloud folder)
pnpm add ../brandcloud/packs/brandcloud-tokens-0.9.0.tgz ../brandcloud/packs/brandcloud-astro-0.9.0.tgz astro # an Astro site
pnpm add ../brandcloud/packs/brandcloud-tokens-0.9.0.tgz ../brandcloud/packs/brandcloud-ui-0.9.0.tgz react react-dom # a React or Next app
pnpm exec brand-make --name acme --accent "#0f766e" --ink "#111827" --paper "#fbfaf7" \
  --font-body "Georgia, serif" --out-dir brands --css src/styles/acme.css   # your brand, AA checked
```

Start with `packages/tokens/README.md`, then the package you need. The documentation site
(https://brandui.cloud) lives in `apps/docs-site` (`pnpm docs:dev`).

## Free and Pro

Everything in this repository is free under the MIT licence, and stays free. A separate, paid Pro edition adds a
guided copywriting system, a signature theme pack, selling sections and guided selling, built on the public APIs
here. The free packages never depend on Pro (`pnpm check:boundaries` enforces it).

## Working on this repository

```sh
pnpm install
pnpm check            # boundaries, secret and personal-data scan, build, typecheck, tests
pnpm test:detector    # detector pairs in headless Chromium
pnpm fixtures         # install the packed packages into fresh Vite, Next and Astro apps
```

See `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` and `SECURITY.md`. Licensed under MIT (`LICENSE`).
