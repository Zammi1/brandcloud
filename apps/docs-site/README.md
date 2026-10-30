# BrandCloud public site

The public Astro site contains the free brand builder, page score, recipes, component explorer and Pro product information. Free tools run in the visitor's browser and do not require an account.

## Connecting the Pro application

Set `PUBLIC_PRO_APP_ORIGIN` at build time to the separate Pro application's HTTP(S) origin, without a path, credentials, query or fragment. Workspace links then open `/`; licence links open `/billing?tier=solo`, `team` or `studio`. The application determines authentication, entitlement and checkout availability. Configuring an origin does not enable sales.

Without a valid origin, Pro actions point to the existing explicit-consent launch form. Its existing capture configuration remains independent. Do not route the Pro application to `/app`: that address belongs to the preserved CRM proxy.

## Brand builder

The first preset uses the surface profile: blue working surfaces, white primary actions and black primary labels. Visitors can choose neutral surfaces or edit all inputs. JSON exports retain `profile` so regeneration reproduces the palette; CSS exports include both modes. Downloads are enabled only when colour inputs are valid and every required contrast check passes in both modes.

The selected fonts must also be loaded by the consuming application. The export panel includes installation steps and links to the actual package installation guide. Packages are installed from repository-generated tarballs until npm publishing is available.

## Checks

Build workspace packages before `pnpm --filter docs-site check`. Run `pnpm test:site` for capture consent, retry and CRM rewrite regression coverage. Browser verification should include the surface preset export, a failing colour input, restoring a valid preset, mobile layout and the configured Pro links.
