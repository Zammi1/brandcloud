/**
 * Platform-neutral preset specs. React (Motion), React Native (Reanimated), Svelte and the CSS
 * utilities are all mapped from these, so a preset has the same name and feel everywhere.
 * Durations in ms, distances in px, springs as stiffness/damping/mass.
 */
import { distance, duration, easing, scale, spring, stagger, type CubicBezier, type SpringConfig } from "./tokens.ts";

export interface TimingSpec {
  readonly duration: number;
  readonly easing: CubicBezier;
}
export type SpringSpec = { readonly kind: "spring"; readonly spring: SpringConfig };
export type TimingMotionSpec = { readonly kind: "timing" } & TimingSpec;
export type MotionSpec = SpringSpec | TimingMotionSpec;

export interface PoseSpec {
  readonly opacity?: number;
  readonly x?: number | string;
  readonly y?: number | string;
  readonly scale?: number;
}

const timing = (d: number, e: CubicBezier): TimingMotionSpec => ({ kind: "timing", duration: d, easing: e });
const springOf = (s: SpringConfig): SpringSpec => ({ kind: "spring", spring: s });

export const presetSpecs = {
  /** Any pressable surface: scales down quickly, springs back with a small physical overshoot. */
  press: {
    pressed: { scale: scale.press } satisfies PoseSpec,
    down: timing(duration.instant, easing.standard),
    release: springOf(spring.press),
  },
  /** Depth (gradient) button: 1px lift and 4% brighter on hover, press as above. Hover is pointer-only. */
  depthButton: {
    hover: { y: -distance.nudge } satisfies PoseSpec,
    hoverBrightness: 1.04,
    pressed: { y: 0, scale: scale.press } satisfies PoseSpec,
    move: springOf(spring.snappy),
    down: timing(duration.instant, easing.standard),
    release: springOf(spring.press),
  },
  /** Offer level tile (Sky, Blue, Navy, Pearl, Obsidian): lifts 4px on hover, light press. */
  tierTile: {
    hover: { y: -distance.lift } satisfies PoseSpec,
    pressed: { scale: scale.pressLarge } satisfies PoseSpec,
    move: springOf(spring.snappy),
  },
  /** Modal dialog: settles in with a soft spring, leaves faster than it arrived. */
  dialog: {
    from: { opacity: 0, y: distance.dialog, scale: scale.dialog } satisfies PoseSpec,
    to: { opacity: 1, y: 0, scale: 1 } satisfies PoseSpec,
    enter: springOf(spring.gentle),
    enterOpacity: timing(duration.normal, easing.enter),
    exit: timing(duration.fast, easing.exit),
  },
  /** Scrim behind dialogs, drawers and sheets. */
  overlay: {
    from: { opacity: 0 } satisfies PoseSpec,
    to: { opacity: 1 } satisfies PoseSpec,
    enter: timing(duration.normal, easing.standard),
    exit: timing(duration.fast, easing.exit),
  },
  /** Side drawer from the inline end. */
  drawer: {
    from: { x: "100%" } satisfies PoseSpec,
    to: { x: 0 } satisfies PoseSpec,
    enter: springOf(spring.gentle),
    exit: timing(duration.normal, easing.exit),
  },
  /** Bottom sheet (mobile menus, pickers). */
  sheet: {
    from: { y: "100%" } satisfies PoseSpec,
    to: { y: 0 } satisfies PoseSpec,
    enter: springOf(spring.gentle),
    exit: timing(duration.normal, easing.exit),
  },
  /** A short list or small group arriving together. Capped stagger, small rise. */
  listItem: {
    from: { opacity: 0, y: distance.reveal } satisfies PoseSpec,
    to: { opacity: 1, y: 0 } satisfies PoseSpec,
    enter: timing(duration.slow, easing.enter),
    step: stagger.tight,
  },
  /** Reveal on first view. Use for one or two moments per page, never every section. */
  reveal: {
    from: { opacity: 0, y: distance.reveal } satisfies PoseSpec,
    to: { opacity: 1, y: 0 } satisfies PoseSpec,
    enter: timing(duration.slower, easing.enter),
    step: stagger.normal,
  },
  /** Number count-up for one hero figure. Not for prices in a list. */
  countUp: {
    enter: timing(duration.count, easing.enter),
  },
} as const;

export type PresetName = keyof typeof presetSpecs;
export const presetNames = Object.keys(presetSpecs) as PresetName[];

/** Reduced motion keeps opacity changes and drops travel and scale (WCAG 2.3.3, vestibular safety). */
export function reducePose<T extends PoseSpec>(pose: T): PoseSpec {
  return pose.opacity === undefined ? {} : { opacity: pose.opacity };
}
