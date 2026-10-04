# Public-site integration and release

The website stays a static Astro build with account-free browser tools. Pro source and
commerce remain in the separate private repository. A Brand CRM workspace is not a Pro
licence and is not needed to export a free brand file.

## Pro launch capture

Set `PUBLIC_BRANDCLOUD_CAPTURE_ENDPOINT` at build time to the **registered** HTTPS canonical
`/v1/public/capture/<key>` endpoint. Never put a provider credential here. Without it, the
form is visibly unavailable and cannot pretend to save. Published metadata must match
`apps/docs-site/src/lib/pro-capture.mjs`: tenant `brandcloud`, website `brandcloud-site`,
campaign `brandcloud-pro-launch` version `v1`, experience `pro-launch-interest` version `v1`,
placement `pro-updates`, source `brandcloud-pro`, purpose `email-marketing`, wording version
`brandcloud-pro-launch-2026-10-04`. Permission is for **one launch announcement only**.

The adapter sends V2 JSON, retains the submission ID for an unchanged retry and accepts only
`ok:true` with `accepted` or `duplicate`. It does not claim delivery of an email. Production
registration, allowed origin, owner notification and withdrawal handling must be verified
before enabling. No sequence is enabled by this code. No user input is written to analytics.

Tests: `pnpm test:site`; source/types: `pnpm --filter docs-site check`; build: `pnpm docs:build`.
A browser fixture can replace transport, but that is not evidence of a database write.

## Deployment and existing CRM access

Root `vercel.json` preserves the current production headers and `/app` proxy, confirmed
against deployment `dpl_6uAH1fgr5sGZ1VxW8VYBfEfc1LZj` on4October2026. It adds explicit
repository-root build/output settings. Run deployments from this repository root so the
config is included; root integration owns releases. Static-output-only manual deployment
must deliberately copy the routing config, omitting repo build fields, rather than lose it.

Do not remove `/app/(.*)`: it carries CRM routes **and assets**. Keep its noindex header and
robots exclusion. Verify sign-in/deep links after any deployment. The source backup before
the Oct3 repair does not contain the current rewrites; `/tmp/bc-deploy/vercel.json` and the
current deployment inspect agree on the repaired config.

## Package consumption

Existing `pnpm packs` and framework instructions remain the supported distribution path.
`node scripts/fixtures.mjs --only vite-react19,astro7` creates clean projects outside the
workspace, installs packed artifacts without lifecycle scripts and builds them. npm
publishing is not required. Neither fixture needs private Pro or a sibling source import.

## Known release gates

Final licence, customer identity/access, verified Stripe adapter, paid downloads/token
recovery and production capture provisioning remain separate from this static site.
No checkout or fake purchase button is introduced. The Pro inventory distinguishes private
implementation from planned extras. Keep prices and1.xlicence terms under owner authority.
