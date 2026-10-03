/**
 * React Native Reanimated presets (Expo). No runtime import of Reanimated here, so this file is safe
 * to load anywhere. Reanimated's own default for every animation is ReduceMotion.System, so the plain
 * configs below already jump to their end state when the device asks for reduced motion.
 *
 *   import { Easing, ReduceMotion, withSpring, withTiming } from "react-native-reanimated";
 *   import { native, createNativeMotion } from "@brandcloud/motion/native";
 *   scale.value = withSpring(native.press.pressed.scale, native.press.release);
 *   opacity.value = withTiming(1, native.timing(native.dialog.enterOpacity, Easing));
 *
 *   // Explicit, typed against Reanimated's ReduceMotion enum:
 *   const m = createNativeMotion({ ReduceMotion, Easing });
 *   scale.value = withSpring(1, m.spring(native.press.release));
 */
import { presetSpecs, type MotionSpec, type PoseSpec } from "./presets.ts";
import { duration, easing, spring, staggerDelay, type CubicBezier, type DurationName, type SpringConfig, type SpringName } from "./tokens.ts";

/** Same string value as Reanimated's ReduceMotion.System enum member. */
export const REDUCE_MOTION_SYSTEM = "system" as const;

export interface NativeTimingSpec {
  readonly duration: number;
  readonly bezier: CubicBezier;
}
export type NativeMotion = SpringConfig | NativeTimingSpec;

/** Minimal shape of Reanimated's Easing we rely on. */
export interface EasingLike<E> {
  bezier(x1: number, y1: number, x2: number, y2: number): E;
}
/** Minimal shape of Reanimated's ReduceMotion enum. */
export interface ReduceMotionLike<R> {
  readonly System: R;
}

function toSpring(spec: MotionSpec): SpringConfig {
  if (spec.kind !== "spring") throw new Error("@brandcloud/motion: expected a spring spec");
  return { ...spec.spring };
}
function toTiming(spec: MotionSpec): NativeTimingSpec {
  if (spec.kind !== "timing") throw new Error("@brandcloud/motion: expected a timing spec");
  return { duration: spec.duration, bezier: spec.easing };
}

/**
 * Reanimated transform style from a pose: { opacity, transform: [{ translateY }, { scale }] }.
 * Percentage offsets (drawer "100%", sheet "100%") need the measured size of that axis.
 */
export function poseToStyle(pose: PoseSpec, size?: { width?: number; height?: number }) {
  const transform: Array<Record<string, number>> = [];
  const resolve = (v: number | string | undefined, axis: number | undefined, name: string) => {
    if (typeof v !== "string") return v;
    if (!v.endsWith("%")) throw new Error(`@brandcloud/motion: unsupported ${name} offset "${v}"`);
    if (axis === undefined) throw new Error(`@brandcloud/motion: poseToStyle needs size.${name === "x" ? "width" : "height"} to resolve "${v}"`);
    return (Number.parseFloat(v) / 100) * axis;
  };
  const x = resolve(pose.x, size?.width, "x");
  const y = resolve(pose.y, size?.height, "y");
  if (x !== undefined) transform.push({ translateX: x });
  if (y !== undefined) transform.push({ translateY: y });
  if (pose.scale !== undefined) transform.push({ scale: pose.scale });
  return { ...(pose.opacity === undefined ? {} : { opacity: pose.opacity }), ...(transform.length ? { transform } : {}) };
}

const springs = Object.freeze({ ...spring }) as { readonly [K in SpringName]: SpringConfig };
const p = presetSpecs;

function timing<E>(spec: NativeTimingSpec, Easing: EasingLike<E>) {
  const [x1, y1, x2, y2] = spec.bezier;
  return { duration: spec.duration, easing: Easing.bezier(x1, y1, x2, y2) };
}

export const native = {
  springs,
  durations: duration,
  easings: easing,
  /** Builds a withTiming config from a timing spec using Reanimated's Easing. */
  timing,
  /** withTiming config by token names. */
  timingByName<E>(name: DurationName, ease: keyof typeof easing, Easing: EasingLike<E>) {
    return timing({ duration: duration[name], bezier: easing[ease] }, Easing);
  },
  staggerDelay,
  press: { pressed: p.press.pressed, down: toTiming(p.press.down), release: toSpring(p.press.release) },
  depthButton: { pressed: p.depthButton.pressed, down: toTiming(p.depthButton.down), release: toSpring(p.depthButton.release) },
  tierTile: { pressed: p.tierTile.pressed, move: toSpring(p.tierTile.move) },
  dialog: {
    from: p.dialog.from,
    to: p.dialog.to,
    enter: toSpring(p.dialog.enter),
    enterOpacity: toTiming(p.dialog.enterOpacity),
    exit: toTiming(p.dialog.exit),
  },
  overlay: { from: p.overlay.from, to: p.overlay.to, enter: toTiming(p.overlay.enter), exit: toTiming(p.overlay.exit) },
  drawer: { from: p.drawer.from, to: p.drawer.to, enter: toSpring(p.drawer.enter), exit: toTiming(p.drawer.exit) },
  sheet: { from: p.sheet.from, to: p.sheet.to, enter: toSpring(p.sheet.enter), exit: toTiming(p.sheet.exit) },
  listItem: { from: p.listItem.from, to: p.listItem.to, enter: toTiming(p.listItem.enter), step: p.listItem.step },
  reveal: { from: p.reveal.from, to: p.reveal.to, enter: toTiming(p.reveal.enter), step: p.reveal.step },
  countUp: { enter: toTiming(p.countUp.enter) },
} as const;

/**
 * Typed configs with an explicit reduceMotion taken from Reanimated's own enum, so they satisfy
 * WithSpringConfig / WithTimingConfig without casts.
 */
export function createNativeMotion<R, E>({ ReduceMotion, Easing }: { ReduceMotion: ReduceMotionLike<R>; Easing: EasingLike<E> }) {
  const reduceMotion = ReduceMotion.System;
  return {
    spring(config: SpringConfig = spring.snappy) {
      return { stiffness: config.stiffness, damping: config.damping, mass: config.mass, reduceMotion };
    },
    timing(spec: NativeTimingSpec) {
      return { ...timing(spec, Easing), reduceMotion };
    },
  };
}

/** Minimal shape of React Native's AccessibilityInfo. */
export interface AccessibilityInfoLike {
  isReduceMotionEnabled(): Promise<boolean>;
  addEventListener(event: "reduceMotionChanged", handler: (enabled: boolean) => void): { remove(): void };
}

/**
 * Live reduced-motion subscription. Reanimated's useReducedMotion() only reads the setting at app
 * start, so pair ReduceMotion.System with this for anything you start yourself (loops, Lottie, Rive).
 *
 *   useEffect(() => subscribeReducedMotion(AccessibilityInfo, setReduced), []);
 */
export function subscribeReducedMotion(info: AccessibilityInfoLike, callback: (reduced: boolean) => void): () => void {
  let active = true;
  info.isReduceMotionEnabled().then(
    (enabled) => {
      if (active) callback(enabled);
    },
    () => undefined,
  );
  const sub = info.addEventListener("reduceMotionChanged", callback);
  return () => {
    active = false;
    sub.remove();
  };
}
