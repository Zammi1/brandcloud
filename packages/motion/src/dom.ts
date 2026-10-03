/**
 * Tiny vanilla helpers for Astro and static sites. No dependencies. Every helper is a no-op on the
 * server and degrades to "show everything, no movement" without IntersectionObserver or with
 * reduced motion. Content is only hidden while this script has it marked `data-reveal-pending`.
 */
import { cubicBezier } from "./easing.ts";
import { duration, easing, stagger, staggerDelay } from "./tokens.ts";

const hasDom = () => typeof window !== "undefined" && typeof document !== "undefined";

/** True when the OS asks for reduced motion, or the page forces it with <html data-motion="reduce">. */
export function prefersReducedMotion(): boolean {
  if (!hasDom()) return true;
  if (document.documentElement.dataset.motion === "reduce") return true;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Calls `callback(reduced)` whenever the OS setting changes. Returns an unsubscribe function. */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  if (!hasDom() || typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => callback(prefersReducedMotion());
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

export interface RevealOptions {
  root?: ParentNode;
  selector?: string;
  /** Reveals a little before the element is fully in view. */
  rootMargin?: string;
}

/**
 * Reveals `[data-reveal]` elements inside `root` once, as they enter the viewport.
 * - Only elements below the fold are hidden (`data-reveal-pending`); anything already on screen or
 *   scrolled past when the script starts stays visible, so painted content never fades out.
 * - Threshold 0 with a bottom rootMargin, so very tall sections still reveal.
 * - Children of `[data-reveal-group]` get `--m-index` for a capped stagger.
 * Returns a cleanup function that also un-hides anything still pending.
 */
export function reveal(options: RevealOptions = {}): () => void {
  if (!hasDom()) return () => {};
  const { root = document, selector = "[data-reveal]", rootMargin = "0px 0px -8% 0px" } = options;
  const items = Array.from(root.querySelectorAll<HTMLElement>(selector));

  for (const group of Array.from(root.querySelectorAll<HTMLElement>("[data-reveal-group]"))) {
    Array.from(group.querySelectorAll<HTMLElement>(selector)).forEach((el, i) => {
      el.style.setProperty("--m-index", String(Math.min(i, stagger.maxItems - 1)));
    });
  }

  const show = (el: Element) => {
    el.removeAttribute("data-reveal-pending");
    el.setAttribute("data-revealed", "");
  };
  if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
    items.forEach(show);
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target);
        io.unobserve(entry.target);
      }
    },
    { rootMargin, threshold: 0 },
  );
  const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
  const pending: HTMLElement[] = [];
  for (const el of items) {
    if (el.hasAttribute("data-revealed")) continue;
    if (el.getBoundingClientRect().top < viewportBottom) {
      show(el); // already painted or scrolled past: never hide it
      continue;
    }
    el.setAttribute("data-reveal-pending", "");
    pending.push(el);
    io.observe(el);
  }
  const stopReduced = onReducedMotionChange((reduced) => {
    if (reduced) pending.forEach(show);
  });
  return () => {
    io.disconnect();
    stopReduced();
    pending.forEach((el) => el.removeAttribute("data-reveal-pending"));
  };
}

export interface VisibilityHandlers {
  onEnter?: () => void;
  onLeave?: () => void;
  rootMargin?: string;
}

/**
 * Runs onEnter/onLeave as an element scrolls in and out of view, and pauses (onLeave) while the tab is
 * hidden. Use it to start and stop canvas, WebGL, Lottie or Rive loops so nothing renders off screen.
 */
export function whenVisible(el: Element, { onEnter, onLeave, rootMargin = "100px" }: VisibilityHandlers): () => void {
  if (!hasDom() || typeof IntersectionObserver === "undefined") {
    onEnter?.();
    return () => {};
  }
  let inView = false;
  const update = (next: boolean) => {
    if (next === inView) return;
    inView = next;
    (next ? onEnter : onLeave)?.();
  };
  const io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (entry) update(entry.isIntersecting && document.visibilityState === "visible");
  }, { rootMargin });
  io.observe(el);
  const onVisibility = () => {
    if (document.visibilityState === "hidden") update(false);
    else {
      const rect = el.getBoundingClientRect();
      update(rect.bottom > 0 && rect.top < window.innerHeight);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * Same-document View Transition with a plain fallback. With reduced motion the CSS in
 * view-transitions.css drops movement and keeps a short cross-fade.
 */
export async function viewTransition(update: () => void | Promise<void>): Promise<void> {
  const doc = hasDom() ? (document as Document & { startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> } }) : undefined;
  if (!doc?.startViewTransition) {
    await update();
    return;
  }
  const transition = doc.startViewTransition(update);
  await transition.finished.catch(() => undefined);
}

export interface CountUpOptions {
  from?: number;
  durationMs?: number;
  format?: (value: number) => string;
}

const gbInteger = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** Counts the text of `el` up to `to` once. Reduced motion: sets the final value at once. */
export function countUp(el: HTMLElement, to: number, options: CountUpOptions = {}): () => void {
  const { from = 0, durationMs = duration.count, format = (v: number) => gbInteger.format(v) } = options;
  if (!hasDom() || prefersReducedMotion() || typeof requestAnimationFrame === "undefined") {
    el.textContent = format(to);
    return () => {};
  }
  const ease = cubicBezier(easing.enter);
  let frame = 0;
  const startedAt = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - startedAt) / durationMs);
    el.textContent = format(from + (to - from) * ease(t));
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

export { staggerDelay };
