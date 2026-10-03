/**
 * Parameters for svelte/transition and svelte/motion (Tween) built from the same presets.
 * No Svelte import here; pass `prefersReducedMotion.current` from "svelte/motion" (Svelte 5.7+).
 * <html data-motion="reduce"> is honoured as well. Reduced values match the CSS tokens: no travel,
 * no stagger, reveals shortened to duration.normal, count-up instant.
 *
 *   <script>
 *     import { fly } from "svelte/transition";
 *     import { prefersReducedMotion } from "svelte/motion";
 *     import { svelte } from "@brandcloud/motion/svelte";
 *   </script>
 *   <div in:fly={svelte.reveal(prefersReducedMotion.current)}>...</div>
 */
import { cubicBezier } from "./easing.ts";
import { presetSpecs } from "./presets.ts";
import { duration, easing, staggerDelay } from "./tokens.ts";

/** Token easings as functions t -> progress (for Svelte, canvas, WebGL loops). */
export const easingFns = Object.freeze({
  standard: cubicBezier(easing.standard),
  enter: cubicBezier(easing.enter),
  exit: cubicBezier(easing.exit),
  move: cubicBezier(easing.move),
  linear: cubicBezier(easing.linear),
});

const p = presetSpecs;
const num = (v: number | string | undefined) => (typeof v === "number" ? v : 0);
const isReduced = (reduced: boolean) =>
  reduced || (typeof document !== "undefined" && document.documentElement.dataset.motion === "reduce");

export const svelte = {
  /** `in:fly` params for a one-off reveal. Reduced motion: fade only. */
  reveal(reduced = false, index = 0) {
    const r = isReduced(reduced);
    return {
      y: r ? 0 : num(p.reveal.from.y),
      opacity: 0,
      duration: r ? duration.normal : p.reveal.enter.duration,
      delay: r ? 0 : staggerDelay(index, p.reveal.step),
      easing: easingFns.enter,
    };
  },
  /** `in:fly` params for list items with capped stagger. */
  listItem(reduced = false, index = 0) {
    const r = isReduced(reduced);
    return {
      y: r ? 0 : num(p.listItem.from.y),
      opacity: 0,
      duration: p.listItem.enter.duration,
      delay: r ? 0 : staggerDelay(index, p.listItem.step),
      easing: easingFns.enter,
    };
  },
  /** `in:scale` params for a dialog panel (Svelte has no spring transition, so this uses the slow timing) (pair with `out:fade={svelte.dialogOut()}`). */
  dialogIn(reduced = false) {
    return { start: isReduced(reduced) ? 1 : (p.dialog.from.scale ?? 1), opacity: 0, duration: duration.slow, easing: easingFns.enter };
  },
  dialogOut() {
    return { duration: p.dialog.exit.duration, easing: easingFns.exit };
  },
  /** `transition:fade` params for scrims. */
  overlay() {
    return { duration: p.overlay.enter.duration, easing: easingFns.standard };
  },
  /** `Tween` options for a count-up: new Tween(0, svelte.countUp()). */
  countUp(reduced = false) {
    return { duration: isReduced(reduced) ? 0 : p.countUp.enter.duration, easing: easingFns.enter };
  },
} as const;
