# Contributing

Thank you for helping. Small, focused pull requests with a clear reason are the easiest to review.

## Set up

You need Node 22.18 or later and pnpm 11 (`corepack enable`).

```sh
pnpm install
pnpm build
pnpm check          # boundaries, scan, build, typecheck and tests
pnpm docs:dev       # the documentation site
```

The anti-AI detector tests need a local Chrome or Chromium (`CHROME_PATH` to choose one):
`pnpm test:detector`.

## Making a change

1. Open an issue first for a new component, prop, token, package or dependency, so we can agree the shape before
   you build it.
2. Keep the rules every package follows: colours only from tokens, WCAG 2.2 AA contrast, keyboard and focus-visible
   support, reduced-motion handling, no hard-coded copy in components, and none of the visual tells in
   `packages/antipatterns/rules.json`.
3. Add or update tests next to the code, and a changeset (`pnpm changeset`) for anything users will notice.
4. Run `pnpm check` and `git diff --check` before you push.

## What this repository includes

This is the free, MIT-licensed core. Some extra features are sold separately as Pro packages that build on the public
APIs here. The free packages never import Pro code, and `pnpm check:boundaries` fails if they do. Features can move
from Pro to free over time; a shipped free feature never moves to Pro.

## Licence

By contributing you agree that your contribution is licensed under the MIT licence in `LICENSE`.
