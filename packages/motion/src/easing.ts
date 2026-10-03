import type { CubicBezier, SpringConfig } from "./tokens.ts";

/**
 * Returns an easing function t -> progress for a CSS cubic-bezier, so Svelte transitions,
 * Svelte Tween, canvas and WebGL loops use the exact same curve as CSS.
 */
export function cubicBezier([x1, y1, x2, y2]: CubicBezier): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  function solveT(x: number): number {
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      const v = sampleX(t);
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }

  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleY(solveT(t));
  };
}

export interface SpringCurve {
  /** Time until the spring is within 0.1% of rest and nearly still, in ms. */
  readonly durationMs: number;
  /** Position samples from 0 to 1 at even time steps (may overshoot 1). */
  readonly samples: readonly number[];
}

/**
 * Simulates a damped spring from 0 to 1 (unit mass-spring-damper, semi-implicit Euler at 1 ms),
 * the same physics Motion and Reanimated use for stiffness/damping/mass springs.
 */
export function simulateSpring({ stiffness, damping, mass }: SpringConfig, points = 40): SpringCurve {
  const dt = 1 / 1000;
  let x = 0;
  let v = 0;
  const trace: number[] = [0];
  let settledAt = 0;
  for (let ms = 1; ms <= 3000; ms += 1) {
    const force = -stiffness * (x - 1) - damping * v;
    v += (force / mass) * dt;
    x += v * dt;
    trace.push(x);
    if (Math.abs(1 - x) < 0.001 && Math.abs(v) < 0.05) {
      settledAt = ms;
      break;
    }
  }
  const durationMs = settledAt || 3000;
  const samples: number[] = [];
  for (let i = 0; i <= points; i += 1) {
    const idx = Math.round((i / points) * durationMs);
    samples.push(i === points ? 1 : (trace[idx] ?? 1));
  }
  samples[0] = 0;
  return { durationMs, samples };
}

/** CSS `linear()` easing that approximates the spring, plus the duration to pair it with. */
export function springToCss(config: SpringConfig, points = 40): { easing: string; durationMs: number } {
  const { durationMs, samples } = simulateSpring(config, points);
  const easing = `linear(${samples.map((s) => Number(s.toFixed(4)).toString()).join(", ")})`;
  return { easing, durationMs };
}
