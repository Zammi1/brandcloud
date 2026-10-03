# Motion principles

How to use motion in sites and apps built on these packages. Applies to web and mobile, 2D and 3D. Written 1 Oct 2026.
The machine-readable version of section 5 is `antipatterns.json` (same shape as the
ai-design-antipatterns `rules.json`, category MOT).

## 1. Purpose first

Every animation has one of four jobs. If it has none, it goes.

| Job | What it does | Examples |
|---|---|---|
| Feedback | Confirms the interface heard you | Button press (scale 0.95, spring back), toggle, focus ring settling in, form saved tick |
| Orientation | Shows where something came from or went | Dialog settles in over the page it belongs to, drawer slides from the edge it lives on, sheet rises from the bottom |
| Continuity | Keeps one thing recognisable through a change | View Transition morph of a case-study image from list to page, tab indicator sliding |
| Delight | A small reward at a moment that earned it | One success moment per flow (a request sent), a 3D mark turning once when you open the About page |

Delight is spent like money: one or two places per site, never on structure.

## 2. Budgets

| Budget | Limit | Token |
|---|---|---|
| Interface movement | 500ms max. Most things 140 to 320ms | `budget.maxUiDuration`, `duration.*` |
| Exits | Shorter than the matching enter | `dialog.exit` uses `duration.fast` |
| Stagger | 300ms total, then everything else arrives together | `budget.maxStaggerTotal`, `stagger.maxItems` |
| Concurrency | 3 independent animations in view at once (a group counts as one) | `budget.maxConcurrent` |
| Distance | Small: 1px nudge, 4px lift, 8px dialog, 12px reveal | `distance.*` |
| Properties | `transform`, `opacity`, `filter` (sparingly). Never width, height, top, left, margin, padding | |
| Loops | Only for progress (a spinner). Never idle decoration | |
| 3D | Lazy-loaded, paused off screen and in hidden tabs, static image for reduced motion, under 150KB gzip for the scene | |

Page and view transitions may use `duration.slower` (480ms). Count-up uses `duration.count`
(900ms) because it moves digits, not layout.

## 3. Feel

- Physical, not floaty. Things have mass: press goes down fast (80ms) and comes back on a spring
  with a small overshoot (`spring.press`), like the physical button the depth gradient draws.
- Arrive decelerating (`ease.enter`), leave accelerating (`ease.exit`), move symmetrically
  (`ease.move`). Never linear for movement.
- Same names, same feel everywhere: springs are stiffness/damping/mass, so Motion on the web and
  Reanimated on the phone run identical physics. CSS gets the same springs as `linear()` curves.
- Light model: hover on a depth button lifts 1px and brightens 4%, as if it came closer to the
  light. It does not glow brighter, change hue or grow.

## 4. Reduced motion

`prefers-reduced-motion: reduce` (or `<html data-motion="reduce">`) means:

- No travel, no scale, no overshoot, no parallax, no auto-play, no 3D rotation.
- Short opacity changes stay, so a dialog still visibly appears.
- Count-ups show the final number at once.
- Spinners become a slow opacity pulse.
- 3D scenes render one still frame or a static image.

The tokens do most of this for you: under reduced motion every `--brand-motion-distance-*` is
`0px`, every scale is `1`, `--brand-motion-travel` is `0` and springs become a short standard
ease. React: wrap the app in `<BrandMotionConfig>`. React Native: every preset
carries `reduceMotion: "system"`. Svelte: pass `prefersReducedMotion.current`.

Content is never hidden waiting for motion. Reveals only hide elements below the fold that the
script is observing (`data-reveal-pending`), never content already painted, and show everything at
once without IntersectionObserver, with reduced motion, and in print.

## 5. AI-motion tells to avoid

These are the patterns that make a site feel generated. Each has a rule entry with a detection
heuristic and a fix in `antipatterns.json`.

| Id | Tell | Do instead |
|---|---|---|
| AP-MOT-01 | Everything fades up on scroll | Content visible by default; one or two meaningful reveals per page |
| AP-MOT-02 | Staggered fade on every card | Lists arrive at once; stagger only after a user action, capped |
| AP-MOT-03 | Every card lifts on hover | Only interactive things respond; offer tiles lift because the tile is the action |
| AP-MOT-04 | Endless floating, bobbing, pulsing decoration | No idle loops |
| AP-MOT-05 | Auto-playing marquee of (fake) logos | A few real, named clients, still |
| AP-MOT-06 | Cursor glows and spotlight cards | Real hover, focus and pressed states |
| AP-MOT-07 | Typewriter or rotating-word headline | Static, plain headline |
| AP-MOT-08 | Parallax blobs and shapes | Depth on real objects only |
| AP-MOT-09 | Spinning 3D hero object with no purpose | 3D that explains something, paused off screen |
| AP-MOT-20 | No reduced-motion handling | @brandcloud/motion tokens and presets |
| AP-MOT-21 | Animating width, height, top, margin | transform, opacity, grid-template-rows |
| AP-MOT-22 | `transition: all` | Name the properties |
| AP-MOT-23 | Slow, floaty UI (over 500ms) | Duration tokens |
| AP-MOT-24 | Bounce on everything | Bouncy spring for one success moment only |
| AP-MOT-25 | Scroll hijacking (Lenis, Locomotive) | Native scroll |
| AP-MOT-26 | Choreographed hero intro | Static hero on load |
| AP-MOT-27 | Animated gradient or mesh background | Still backgrounds, tonal gradients on actions |
| AP-MOT-28 | Every number counts up | One hero figure at most; prices never animate |
| AP-MOT-29 | Cursor-tilt cards, magnetic buttons | Targets stay still under the pointer |
| AP-MOT-30 | Loops running off screen | `whenVisible()` start and stop |
| AP-MOT-31 | Letter-by-letter or blur-in headlines | Headlines appear whole |
| AP-MOT-32 | Preloader or splash | Fast pages, skeletons only for real loading |
| AP-MOT-33 | Auto-play with no pause | No auto-advance, or a pause control |
| AP-MOT-34 | Meaning only on hover | Show the content; hover adds emphasis only |
| AP-MOT-35 | Blur and glass entrances | Opacity and a small translate |

## 6. Where motion belongs on a marketing site

| Moment | Motion | Preset |
|---|---|---|
| Primary and level buttons | Hover lift 1px, brighten 4%, press 0.95, spring back | `depthButton`, `.m-depth` |
| Offer level tiles | Lift 4px on hover or focus, light press | `tierTile`, `.m-tile` |
| Focus | Ring settles in from 8px to 4px offset | `.m-focus` |
| Dialogs, drawers, sheets | Gentle spring in, faster exit, scrim fades | `dialog`, `drawer`, `sheet`, `overlay`, `.m-dialog`, `.m-drawer` |
| Page to page | Short cross-fade, one shared element may morph | `view-transitions.css`, `.vt-morph` |
| One proof figure | Count up once, in view | `useCountUp`, `countUp()` |
| One section that earns it | Reveal once | `reveal`, `[data-reveal]` |
| 3D | Small logo or product object, user-driven or one slow turn while visible | motion-lab turntable recipe |

Everything else is still.

## 7. Review checklist

1. Can you say the job (feedback, orientation, continuity, delight) of each animation?
2. Does anything move that the user did not cause? If yes, is it progress or a single earned moment?
3. Durations and easings from tokens, no hard-coded `0.6s ease-in-out`?
4. Only transform, opacity, filter animate?
5. Reduced motion checked (DevTools rendering panel, or `<html data-motion="reduce">`)?
6. Keyboard: focus states animate as well as hover states, and nothing hides behind hover?
7. Loops pause off screen and in hidden tabs?
8. Run the ai-design-antipatterns detector; no AP-MOT rule fires.
