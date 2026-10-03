# @brandcloud/antipatterns

The visual tells of AI-generated web design, written down as rules, shown as bad and good page pairs, and
checked by a detector you can run on any page before it ships.

## What is here

| Path | What |
|---|---|
| `rules.json` | 41 rules with stable ids (`AP-GRAD-01` and on): colour and gradients, layout, type, components, imagery, motion and trust. Each has a description, why it reads as generated, how it is detected, the fix, severity, section types and cited sources. |
| `detect.mjs` (bin `brand-detect`) | Renders a URL or an HTML file in headless Chromium and reports which rules fire, with an AI-look score from 0 to 100. |
| `lib/page-checks.js`, `lib/engine.mjs` | The in-page checks (computed styles, DOM, `getAnimations()`, pointer and scroll probes) and the runner. |
| `patterns/<ID>/` | `bad.html` and `good.html` for every rule (same content, one difference) and screenshots at 1440 and 390 wide. |
| `gallery.html` | Every pair side by side, filterable by section type. |
| `research/sources.json` | The articles and studies behind the rules: title, author, date, URL. |

The example businesses in the pairs are invented. The pairs use Hanken Grotesk (SIL Open Font License, licence in
`patterns/_shared/fonts/OFL.txt`).

## Use it

```sh
# npm packages are coming soon; until then, pack them from the repository (see its README)
pnpm add -D ../brandcloud/packs/brandcloud-antipatterns-0.9.0.tgz   # needs a local Chrome or Chromium (set CHROME_PATH)
pnpm exec brand-detect https://example.com  # desktop, 1440 x 900
pnpm exec brand-detect page.html --mobile   # 390 x 844
pnpm exec brand-detect page.html --json     # machine-readable
pnpm exec brand-detect dist/index.html --max-score 9 --fail-on high   # CI gate: exit 1 on failure
```

Scoring: high 12, medium 7, low 4, capped at 100. Bands: 0 to 9 clean, 10 to 29 some tells, 30 to 59 reads as
generated, 60 and over obviously generated. Aim for 0 to 9 and no high-severity rule.

## Gradients

Gradients are allowed when they model light on a physical object: one hue family, lighter at the top, deeper at the
bottom, a thin sheen and a soft same-hue shadow. Hue-shifting "AI" gradients, mesh and aurora backgrounds, gradient
text, glow blobs and glass behind text are the tells.

## Extending

`addRules({ rules, copyRules, categories })` from `@brandcloud/antipatterns` (or a JSON file named by `AP_EXTRA_RULES`)
adds rule packs in the same shape as `rules.json`. Copy rules are plain regular expressions run over the page text;
this package ships none.

## Limits

These are heuristics, not proof. A hand-made site can trip a rule, so read the evidence before changing something
deliberate. Motion rules need the page's JavaScript to run; the detector waits about 1.5 seconds and probes pointer
and scroll.

## Develop

```sh
pnpm --filter @brandcloud/antipatterns test     # every bad page fires its rule, every good page fires nothing, at 1440 and 390
pnpm --filter @brandcloud/antipatterns build    # regenerate pairs, screenshots, taxonomy and gallery
```

Pairs are generated from `scripts/pairs/specs-*.mjs`; never edit `patterns/*/bad.html` or `good.html` by hand.
