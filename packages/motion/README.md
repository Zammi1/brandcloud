# @brandcloud/motion

One motion system for every project: Astro and static sites, React and Next,
SvelteKit, and Expo / React Native. Same names, same values, same feel on every platform.

- `PRINCIPLES.md`: what motion is for, budgets, reduced motion, and the AI-motion tells to avoid.
- `antipatterns.json`: the AI-motion tells as rules (AP-MOT ids, same shape as `@brandcloud/antipatterns` rules).
- `examples/motion-lab` (repository root): a live page with every preset (`pnpm --filter motion-lab dev`).

## Tokens

Source of truth: `src/tokens.json`. Durations are ms, distances px, springs are physical
stiffness/damping/mass, so Motion on the web and Reanimated on the phone run identical physics.

| Group | Values |
|---|---|
| duration | instant 80, fast 140, normal 220, slow 320, slower 480, count 900 |
| easing | standard, enter, exit, move, linear (cubic-bezier) |
| spring | press (small overshoot), snappy, gentle (no bounce), bouncy (one success moment only) |
| distance | nudge 1, lift 4, reveal 12, dialog 8 |
| scale | press 0.95, pressLarge 0.98, dialog 0.98 |
| stagger | tight 30, normal 50, maxItems 6 (total capped at 300ms) |
| budget | maxUiDuration 500, maxStaggerTotal 300, maxConcurrent 3 |

`fast` and `normal` match `@brandcloud/tokens` `duration-fast` / `duration-normal` (a test checks).

## Astro and static sites

```css
@import "@brandcloud/motion/motion.css";            /* tokens + utilities */
@import "@brandcloud/motion/view-transitions.css";  /* optional: cross-document transitions */
```

```html
<button class="btn btn-primary m-depth m-focus">Get my plan</button>
<a class="tile m-tile" href="/standard">Standard</a>
<dialog class="m-dialog">...</dialog>        <!-- enter/exit with @starting-style, no JS -->
<section data-reveal>One reveal per page</section>
<script>import { reveal } from "@brandcloud/motion/dom"; reveal();</script>
```

Utilities: `.m-press`, `.m-press-lg`, `.m-depth`, `.m-tile`, `.m-focus`, `[data-reveal]`,
`.m-reveal-scroll`, `dialog.m-dialog`, `.m-popover[popover]`, `dialog.m-drawer`, `.m-spinner`,
`.m-enter`. DOM helpers: `reveal()`, `whenVisible(el, { onEnter, onLeave })` (start and stop canvas,
WebGL, Lottie or Rive loops), `countUp(el, to)`, `viewTransition(update)`, `prefersReducedMotion()`.
The utilities live in the `brand-motion` cascade layer, so a site's own unlayered rules win.

Tailwind v4: `@import "@brandcloud/motion/tokens.css"; @import "@brandcloud/motion/tailwind.css";` gives
`ease-brand-enter`, `ease-spring-press`, `duration-brand-fast`, `transition-spring-snappy`,
`animate-brand-enter` and friends.

## React (Motion)

```tsx
import { LazyMotion, domAnimation, m, AnimatePresence } from "motion/react";
import { BrandMotionConfig, depthButton, dialog, listItem, useCountUp } from "@brandcloud/motion/react";

<BrandMotionConfig>                          {/* OS setting or <html data-motion="reduce"> */}
  <LazyMotion features={domAnimation}>
    <m.button {...depthButton}>Get my plan</m.button>
    <AnimatePresence>{open && <m.div variants={dialog} initial="hidden" animate="visible" exit="exit" />}</AnimatePresence>
    {items.map((item, i) => <m.li key={item.id} variants={listItem} custom={i} initial="hidden" animate="visible" />)}
  </LazyMotion>
</BrandMotionConfig>
```

Reduced motion: `BrandMotionConfig`, `useBrandMotionConfig()` (props for your own `<MotionConfig>`),
`useBrandReducedMotion()`; all follow the OS setting and `<html data-motion="reduce">`, live.
`motionConfig` (`reducedMotion: "user"`) follows the OS setting only.
Presets: `press`, `depthButton`, `tierTile`, `dialog`, `overlay`, `drawer`, `sheet`, `list` +
`listItem`, `reveal`, `transitions`, `useCountUp(to, { start })`. `motion` and `react` are optional
peer dependencies; only `@brandcloud/motion/react` needs them.

## Svelte

```svelte
<script>
  import { fly } from "svelte/transition";
  import { prefersReducedMotion } from "svelte/motion";
  import { svelte } from "@brandcloud/motion/svelte";
</script>
<li in:fly={svelte.listItem(prefersReducedMotion.current, i)}>...</li>
```

Also `svelte.reveal`, `svelte.dialogIn/dialogOut`, `svelte.overlay`, `svelte.countUp` (Tween
options) and `easingFns` (token curves as functions, for canvas and WebGL loops too).

## React Native (Reanimated)

```ts
import { AccessibilityInfo } from "react-native";
import { Easing, ReduceMotion, withSpring, withTiming } from "react-native-reanimated";
import { createNativeMotion, native, subscribeReducedMotion } from "@brandcloud/motion/native";

scale.value = withSpring(native.press.pressed.scale, native.press.release);
opacity.value = withTiming(1, native.timing(native.dialog.enterOpacity, Easing));
useEffect(() => subscribeReducedMotion(AccessibilityInfo, setReduced), []);

const m = createNativeMotion({ ReduceMotion, Easing });   // explicit reduceMotion, typed
scale.value = withSpring(1, m.spring(native.press.release));
```

The plain configs leave `reduceMotion` unset, which Reanimated treats as `ReduceMotion.System`.
`createNativeMotion` adds `ReduceMotion.System` from your own Reanimated import, so the configs type
check against `WithSpringConfig` / `WithTimingConfig` (a compile-time test mirrors those types).
`poseToStyle(pose, { width, height })` turns a preset pose into a style; drawer and sheet poses use
`"100%"`, so pass the measured size (it throws rather than guess 0).

## Characters, guides and objects

`@brandcloud/motion/character.css` (also inside `motion.css`) holds the presets that give a moving thing
weight: `settle`, `pop-in`, `hop`, `celebrate`, `settle-in`, `hop-out`, `stretch`, `hold`, plus idle
and surface presets (`breathe`, `float`, `blink`, `nod`, `wave`, `phrase`, `splash-art`,
`splash-rise`, `splash-fade`, `card-enter`, `ripple`, `typing`, `progress`, `squash`). Use a class
(`m-settle`) or set `data-motion="settle"` from script. All of them stop under reduced motion.

`@brandcloud/motion/character` holds the physics:

```ts
import { springFollower, flyTo, hopTo, playPreset, turntable } from "@brandcloud/motion/character";

// A guide that keeps level with what it talks about: glides on a critically damped spring, lands with a settle.
const guide = springFollower({ x: 0, y: 0 }, {
  apply: ({ x, y }) => el.style.setProperty("transform", `translate3d(${x}px, ${y}px, 0)`),
  onMove: () => (el.dataset.motion = "stretch"),
  onLand: () => playPreset(el, "settle"),
});
guide.moveTo({ x: 24, y: 480 });

await flyTo(card, { x: 0, y: 0 }, { x: 320, y: -40 }); // along an arc, then settles
await hopTo(badge, () => target.append(badge));        // out, moved, popped in
const dial = turntable(0, { render: (a) => (mesh.rotation.y = a) }); // drag, release, turn()
```

Each driver runs one animation frame loop only while moving and jumps under reduced motion.

## Reduced motion

Under `prefers-reduced-motion: reduce` (or `<html data-motion="reduce">`) every distance becomes
`0px`, every scale `1`, `--brand-motion-travel` `0`, springs become a short standard ease and
count-ups jump to the final value, View Transitions keep a 140ms cross-fade without the morph.
Opacity changes stay, so things still visibly appear. The reveal script only hides elements below
the fold that it is observing (`data-reveal-pending`); content already on screen is never faded out.

## Develop

```sh
pnpm --filter @brandcloud/motion test       # vitest: tokens, CSS, presets, DOM helpers, rules
pnpm --filter @brandcloud/motion typecheck
pnpm --filter @brandcloud/motion build      # dist: js + d.ts + css + tokens.json + antipatterns.json
cd fixtures/motion-lab && pnpm install && pnpm build && pnpm shots
```
