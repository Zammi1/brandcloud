import json from "./tokens.json" with { type: "json" };

export type CubicBezier = readonly [number, number, number, number];
export interface SpringConfig {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}

// Names are spelled out (not inferred from the JSON) so published types never need resolveJsonModule.
// tokens.test.ts checks they match tokens.json exactly.
export type DurationName = "instant" | "fast" | "normal" | "slow" | "slower" | "count";
export type EasingName = "standard" | "enter" | "exit" | "move" | "linear";
export type SpringName = "press" | "snappy" | "gentle" | "bouncy";
export type DistanceName = "nudge" | "lift" | "reveal" | "dialog";
export type ScaleName = "press" | "pressLarge" | "dialog";
export type StaggerName = "tight" | "normal" | "maxItems";
export type BudgetName = "maxUiDuration" | "maxStaggerTotal" | "maxConcurrent";

interface Token<V> {
  readonly $value: V;
  readonly $type: string;
  readonly $description: string;
}
type Group<N extends string, V> = { readonly [K in N]: Token<V> };
export interface TokenDocument {
  readonly $description: string;
  readonly duration: Group<DurationName, number>;
  readonly easing: Group<EasingName, readonly number[]>;
  readonly spring: Group<SpringName, SpringConfig>;
  readonly distance: Group<DistanceName, number>;
  readonly scale: Group<ScaleName, number>;
  readonly stagger: Group<StaggerName, number>;
  readonly budget: Group<BudgetName, number>;
}
const raw: TokenDocument = json;

function values<T extends object, V>(group: T): { readonly [K in keyof T]: V } {
  const out: Record<string, V> = {};
  for (const [key, token] of Object.entries(group) as Array<[string, Token<unknown>]>) {
    if (key.startsWith("$")) continue;
    out[key] = token.$value as V;
  }
  return Object.freeze(out) as { readonly [K in keyof T]: V };
}

/** Durations in milliseconds. */
export const duration = values<typeof raw.duration, number>(raw.duration);
/** Durations in seconds, for Motion (motion.dev) which takes seconds. */
export const seconds = Object.freeze(
  Object.fromEntries(Object.entries(duration).map(([k, v]) => [k, v / 1000])),
) as { readonly [K in DurationName]: number };
/** Cubic bezier control points [x1, y1, x2, y2]. */
export const easing = values<typeof raw.easing, CubicBezier>(raw.easing);
/** Physical springs, identical on web (Motion) and native (Reanimated). */
export const spring = values<typeof raw.spring, SpringConfig>(raw.spring);
/** Distances in px. */
export const distance = values<typeof raw.distance, number>(raw.distance);
export const scale = values<typeof raw.scale, number>(raw.scale);
/** Stagger steps in ms (maxItems is a count). */
export const stagger = values<typeof raw.stagger, number>(raw.stagger);
export const budget = values<typeof raw.budget, number>(raw.budget);

/** The raw DTCG-style token document (with $description per token). */
export const tokenDocument: TokenDocument = raw;

/** Stagger delay in ms for the item at `index`, capped so long lists never crawl in. */
export function staggerDelay(index: number, step: number = stagger.normal): number {
  const capped = Math.min(Math.max(0, Math.floor(index)), stagger.maxItems - 1);
  return Math.min(capped * step, budget.maxStaggerTotal);
}

export function cssBezier(points: CubicBezier): string {
  return `cubic-bezier(${points.join(", ")})`;
}
