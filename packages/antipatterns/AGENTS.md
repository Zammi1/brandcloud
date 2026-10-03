# AGENTS.md: check a page for AI-design tells before you hand it over

1. Build the page, then run `node detect.mjs <url or file>` and `node detect.mjs <url or file> --mobile`.
2. For each rule that fires, open `patterns/<ID>/` (or `gallery.html`): `bad.html` shows the tell and `good.html`
   the same content fixed. Compare your section with the good one for its section type.
3. Fix, re-run, repeat until the score is 0 to 9 with no high-severity rule. Report the final output.

Rules of thumb: gradients only as tonal light models; no eyebrow pills, mono caps kickers, accent or italic-serif
words in headlines, chip walls, floating chips, fake UI drawn in divs, grid or dot backdrops, sparkles, walls of
identical icon cards or everything centred; proof must be real (no typed logo walls, round unsourced stats, avatar
stacks or template leftovers); motion only where it explains something and none under `prefers-reduced-motion`.

Changing rules: edit `scripts/pairs/specs-*.mjs`, run `pnpm build`, then `pnpm test`. Every rule needs a pair.
