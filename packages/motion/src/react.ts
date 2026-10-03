/**
 * Motion (motion.dev) presets for React. Wrap the app once in <BrandMotionConfig> (or
 * <MotionConfig reducedMotion={useBrandMotionConfig().reducedMotion}>) so transforms are skipped for
 * people who ask for reduced motion, including <html data-motion="reduce">, while opacity still runs.
 */
import { MotionConfig, animate, useReducedMotion } from "motion/react";
import type { MotionProps, Transition, Variants } from "motion/react";
import { createElement, useEffect, useState, type ReactNode } from "react";
import { presetSpecs, type MotionSpec, type PoseSpec } from "./presets.ts";
import { seconds, staggerDelay, easing, type CubicBezier } from "./tokens.ts";

export function toTransition(spec: MotionSpec): Transition {
  if (spec.kind === "spring") return { type: "spring", ...spec.spring };
  return { duration: spec.duration / 1000, ease: [...spec.easing] as [number, number, number, number] };
}

function pose<T extends PoseSpec>(p: T): { -readonly [K in keyof T]: T[K] } {
  return { ...p };
}

/** Pass to <MotionConfig>. "user" follows the OS reduced-motion setting only. */
export const motionConfig = { reducedMotion: "user" } as const;

const forcedReduce = () => typeof document !== "undefined" && document.documentElement.dataset.motion === "reduce";

/** True while <html data-motion="reduce"> is set. Live: follows later changes to the attribute. */
export function useForcedReducedMotion(): boolean {
  const [forced, setForced] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return undefined;
    setForced(forcedReduce());
    const mo = new MutationObserver(() => setForced(forcedReduce()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    return () => mo.disconnect();
  }, []);
  return forced;
}

/** OS setting OR <html data-motion="reduce">. */
export function useBrandReducedMotion(): boolean {
  const os = useReducedMotion();
  const forced = useForcedReducedMotion();
  return Boolean(os) || forced;
}

/** MotionConfig props that honour both the OS setting and <html data-motion="reduce">. */
export function useBrandMotionConfig(): { reducedMotion: "user" | "always" } {
  return { reducedMotion: useForcedReducedMotion() ? "always" : "user" };
}

/** <MotionConfig> with the brand reduced-motion rule applied. */
export function BrandMotionConfig({ children }: { children?: ReactNode }) {
  return createElement(MotionConfig, useBrandMotionConfig(), children);
}

/** Named transitions built from the tokens. */
export const transitions = {
  instant: { duration: seconds.instant, ease: [...easing.standard] },
  fast: { duration: seconds.fast, ease: [...easing.standard] },
  normal: { duration: seconds.normal, ease: [...easing.standard] },
  slow: { duration: seconds.slow, ease: [...easing.enter] },
  slower: { duration: seconds.slower, ease: [...easing.enter] },
  press: toTransition(presetSpecs.press.release),
  snappy: toTransition(presetSpecs.depthButton.move),
  gentle: toTransition(presetSpecs.dialog.enter),
} satisfies Record<string, Transition>;

const p = presetSpecs;

/** Spread on any motion element that can be pressed: <motion.button {...press}>. */
export const press = {
  whileTap: { ...pose(p.press.pressed), transition: toTransition(p.press.down) },
  transition: toTransition(p.press.release),
} satisfies MotionProps;

/** Depth (gradient) button. Hover lift only fires for real hover pointers in Motion. */
export const depthButton = {
  whileHover: { ...pose(p.depthButton.hover), filter: `brightness(${p.depthButton.hoverBrightness})` },
  whileTap: { ...pose(p.depthButton.pressed), transition: toTransition(p.depthButton.down) },
  transition: toTransition(p.depthButton.release),
} satisfies MotionProps;

/** Offer level tile hover and press. */
export const tierTile = {
  whileHover: pose(p.tierTile.hover),
  whileTap: pose(p.tierTile.pressed),
  transition: toTransition(p.tierTile.move),
} satisfies MotionProps;

/** <motion.div variants={dialog} initial="hidden" animate="visible" exit="exit"> inside <AnimatePresence>. */
export const dialog: Variants = {
  hidden: pose(p.dialog.from),
  visible: { ...pose(p.dialog.to), transition: { ...toTransition(p.dialog.enter), opacity: toTransition(p.dialog.enterOpacity) } },
  exit: { ...pose(p.dialog.from), y: 0, transition: toTransition(p.dialog.exit) },
};

export const overlay: Variants = {
  hidden: pose(p.overlay.from),
  visible: { ...pose(p.overlay.to), transition: toTransition(p.overlay.enter) },
  exit: { ...pose(p.overlay.from), transition: toTransition(p.overlay.exit) },
};

export const drawer: Variants = {
  hidden: pose(p.drawer.from),
  visible: { ...pose(p.drawer.to), transition: toTransition(p.drawer.enter) },
  exit: { ...pose(p.drawer.from), transition: toTransition(p.drawer.exit) },
};

export const sheet: Variants = {
  hidden: pose(p.sheet.from),
  visible: { ...pose(p.sheet.to), transition: toTransition(p.sheet.enter) },
  exit: { ...pose(p.sheet.from), transition: toTransition(p.sheet.exit) },
};

/** Parent of a staggered list. Children use `listItem` with custom={index}. */
export const list: Variants = { hidden: {}, visible: {} };

/** <motion.li variants={listItem} custom={i}>. The stagger is capped by the tokens. */
export const listItem: Variants = {
  hidden: pose(p.listItem.from),
  visible: (index: number = 0) => ({
    ...pose(p.listItem.to),
    transition: { ...toTransition(p.listItem.enter), delay: staggerDelay(index, p.listItem.step) / 1000 },
  }),
};

/** One-off reveal on first view: <motion.section {...reveal}>. Use sparingly. */
export const reveal: Pick<MotionProps, "initial" | "whileInView" | "viewport" | "variants"> = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, margin: "0px 0px -10% 0px" },
  variants: {
    hidden: pose(p.reveal.from),
    visible: (index: number = 0) => ({
      ...pose(p.reveal.to),
      transition: { ...toTransition(p.reveal.enter), delay: staggerDelay(index, p.reveal.step) / 1000 },
    }),
  } satisfies Variants,
};

export interface CountUpOptions {
  from?: number;
  /** Start counting when true (pair with useInView). Defaults to true. */
  start?: boolean;
  format?: (value: number) => string;
  durationMs?: number;
  ease?: CubicBezier;
}

const defaultFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** Counts a number up once. With reduced motion it shows the final value straight away. */
export function useCountUp(to: number, options: CountUpOptions = {}): string {
  const { from = 0, start = true, format = (v: number) => defaultFormat.format(v), durationMs = p.countUp.enter.duration, ease = p.countUp.enter.easing } = options;
  const reduce = useBrandReducedMotion() || forcedReduce();
  const [value, setValue] = useState(reduce ? to : from);
  // Key the effect on the curve's values, not the array identity, so an inline `ease={[...]}`
  // does not restart the count on every render.
  const easeKey = ease.join(",");
  useEffect(() => {
    if (reduce) {
      setValue(to);
      return undefined;
    }
    if (!start) return undefined;
    const curve = easeKey.split(",").map(Number) as [number, number, number, number];
    const controls = animate(from, to, { duration: durationMs / 1000, ease: curve, onUpdate: setValue });
    return () => controls.stop();
  }, [to, from, start, durationMs, easeKey, reduce]);
  return format(value);
}
