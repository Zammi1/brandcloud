# `@brandcloud/ui`

Accessible React primitives for crafted, brandable interfaces, styled only with `@brandcloud/tokens`.

Import the public root or a leaf export, and include the stylesheet once near the application root:

```tsx
import { Button } from "@brandcloud/ui/button";
import { TextButton } from "@brandcloud/ui/experimental/text-button";
import "@brandcloud/ui/styles.css";
```

## Button family

`Button` takes a colour role (`tone`), a treatment (`appearance`), an offer `level`, a `size` and `loading`:

```tsx
import { Button } from "@brandcloud/ui";

<Button>Save changes</Button>                                   {/* brand tone, appearance from the brand */}
<Button appearance="depth">Get my plan</Button>                 {/* tonal light-model gradient */}
<Button tone="ink">See the work</Button>
<Button tone="level" level="navy">Choose navy</Button>          {/* sky | blue | navy | pearl | obsidian */}
<Button tone="whatsapp"><WhatsAppIcon />Message us</Button>     {/* channel glyphs are the only icons allowed */}
<Button tone="neutral" appearance="outline" pressed>Grid view</Button>
<Button render={<Link href="/pricing" />}>See pricing</Button>   {/* or asChild */}
```

- Tones: `brand`, `ink`, `neutral`, `danger`, `whatsapp`, `level` (legacy `quiet` is neutral ghost). Appearances:
  `depth`, `solid`, `outline`, `ghost`. Sizes: `sm`, `md`, `lg`.
- When `appearance` is omitted the brand decides, in CSS: solid by default, depth inside any
  `[data-button-appearance="depth"]` ancestor (set it on `<html>` to make depth the default). The level tone is depth
  unless told otherwise.
- `variant` is a shadcn-compatible alias (`default`, `secondary`, `outline`, `ghost`, `destructive`, plus `depth`,
  `solid`, `ink`, `level`, `whatsapp`). Explicit `tone` and `appearance` win.
- Colours come from tokens only (`action-depth-*`, `action-ink*`, `whatsapp*`, `level-<name>-*`).
- No arrows inside buttons.

See `SHADCN-PARITY.md` for which export to use instead of a shadcn/ui component.

## Experimental

`TextButton` is a native, non-submitting button presented as inline text. Its action surface grows from an underline
on hover, keyboard focus and press, and it inherits typography and colour:

```tsx
<p>
  Your workspace is ready.{" "}
  <TextButton onClick={openWorkspace}>Open workspace</TextButton>
</p>
```

`StatusPillAction` and `HandwrittenAction` (`@brandcloud/ui/experimental/annotated-action`) decorate a link or button you
own without taking over routing:

```tsx
<StatusPillAction status="Booking now" active emphasis="accent">
  <a href="/enquiry" aria-label="Request details, booking now">Request details</a>
</StatusPillAction>

<HandwrittenAction note="Takes two minutes" noteStyle="handwritten" emphasis="accent">
  <a href="/memberships">View memberships</a>
</HandwrittenAction>
```

Annotations are decorative by default, so put anything that matters in the action's accessible name. Set
`statusAriaHidden={false}` or `noteAriaHidden={false}` only when the annotation should be announced. These components
are not in the stable root yet; their paths and props may change.

## Dialogs and drawers

Dialog and Drawer contain keyboard focus in both directions, manage initial focus, close on Escape, backdrop or the
close button, make the background inert and return focus to the trigger. The required `title` must be authored text
(a string, number, fragment or intrinsic elements). Rich presentation needs a separate non-empty
`titleAccessibleLabel`. Custom, memo, `forwardRef` and lazy title components are rejected because they cannot be
inspected before rendering.

`portalDataAttributes` passes data-only presentation context to the portalled root. Dialog and Drawer stack with the
`--brand-layer-modal` custom property (fallback `50`); override it at the portal context when you integrate with an
application shell.

Slots accept ordinary composite elements. Direct portals inside a slot are rejected before rendering; a component that
creates its own portal after rendering owns that overlay's focus, dismissal and stacking. Collections in slots must be
arrays or `Set` values; one-shot iterators are rejected.

## React versions

Works with React 18.2 and 19 (`react` and `react-dom` as peers). The repository's consumer fixtures build packed
tarballs in fresh Vite (React 18 and 19) and Next.js 15 apps. Astro sites should use `@brandcloud/astro` instead of this
package.
