import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KEYFRAMES, buildTailwindCss, buildTokensCss, cssVar, motionVariables, reducedVariables } from "./css.ts";
import { cubicBezier, simulateSpring, springToCss } from "./easing.ts";
import { createNativeMotion, native, poseToStyle } from "./native.ts";
import { presetNames, presetSpecs, reducePose } from "./presets.ts";
import * as react from "./react.ts";
import { easingFns, svelte } from "./svelte.ts";
import json from "./tokens.json" with { type: "json" };
import { budget, distance, duration, easing, scale, seconds, spring, stagger, staggerDelay } from "./tokens.ts";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function cssBlock(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, `selector ${selector}`).toBeGreaterThan(-1);
  const body = css.slice(start, css.indexOf("}", start));
  const map = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) map.set(m[1]!, m[2]!.trim());
  return map;
}

describe("token names", () => {
  it("TypeScript name unions match tokens.json", () => {
    const keys = (g: object) => Object.keys(g).filter((k) => !k.startsWith("$")).sort();
    expect(Object.keys(duration).sort()).toEqual(keys(json.duration));
    expect(Object.keys(easing).sort()).toEqual(keys(json.easing));
    expect(Object.keys(spring).sort()).toEqual(keys(json.spring));
    expect(Object.keys(distance).sort()).toEqual(keys(json.distance));
    expect(Object.keys(scale).sort()).toEqual(keys(json.scale));
    expect(Object.keys(stagger).sort()).toEqual(keys(json.stagger));
    expect(Object.keys(budget).sort()).toEqual(keys(json.budget));
  });

  it("every token has a description", () => {
    for (const [group, tokens] of Object.entries(json)) {
      if (group.startsWith("$")) continue;
      for (const [name, token] of Object.entries(tokens as Record<string, { $description?: string }>)) {
        expect(token.$description, `${group}.${name}`).toBeTruthy();
      }
    }
  });

  it("matches @brandcloud/tokens duration-fast and duration-normal", () => {
    const brand = JSON.parse(readFileSync(join(pkgRoot, "../tokens/src/tokens.json"), "utf8"));
    expect(`${duration.fast}ms`).toBe(brand.reference.duration.fast.$value);
    expect(`${duration.normal}ms`).toBe(brand.reference.duration.normal.$value);
  });

  it("respects its own budgets", () => {
    for (const [name, ms] of Object.entries(duration)) {
      if (name === "count") continue;
      expect(ms, name).toBeLessThanOrEqual(budget.maxUiDuration);
    }
    for (const name of ["press", "snappy", "gentle"] as const) {
      expect(simulateSpring(spring[name]).durationMs, name).toBeLessThanOrEqual(budget.maxUiDuration);
    }
  });
});

describe("CSS output", () => {
  const css = buildTokensCss();
  const root = cssBlock(css, ":root");

  it("emits every token as --brand-motion-* with the same value", () => {
    for (const [k, v] of Object.entries(duration)) expect(root.get(cssVar("duration", k))).toBe(`${v}ms`);
    for (const [k, v] of Object.entries(easing)) expect(root.get(cssVar("ease", k))).toBe(`cubic-bezier(${v.join(", ")})`);
    for (const [k, v] of Object.entries(distance)) expect(root.get(cssVar("distance", k))).toBe(`${v}px`);
    for (const [k, v] of Object.entries(scale)) expect(root.get(cssVar("scale", k))).toBe(String(v));
    for (const k of Object.keys(spring)) {
      expect(root.get(cssVar("spring", k))).toMatch(/^linear\(0, .*, 1\)$/);
      expect(root.get(`${cssVar("spring", k)}-duration`)).toMatch(/^\d+ms$/);
    }
    expect(root.get("--brand-motion-scale-press-large")).toBe("0.98");
    expect(root.get("--brand-motion-travel")).toBe("1");
  });

  it("reduced motion zeroes travel and scale for the OS setting and data-motion=reduce", () => {
    const forced = cssBlock(css, ':root[data-motion="reduce"]');
    const mediaStart = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(mediaStart).toBeGreaterThan(-1);
    const media = cssBlock(css.slice(mediaStart), ":root");
    for (const block of [forced, media]) {
      expect(block.get("--brand-motion-travel")).toBe("0");
      for (const k of Object.keys(distance)) expect(block.get(cssVar("distance", k))).toBe("0px");
      for (const k of Object.keys(scale)) expect(block.get(cssVar("scale", k))).toBe("1");
      for (const k of Object.keys(spring)) expect(block.get(cssVar("spring", k))).not.toContain("linear(");
      expect(block.get(cssVar("duration", "count"))).toBe("0ms");
    }
    expect(Object.fromEntries(reducedVariables())).toEqual(Object.fromEntries(forced));
  });

  it("utilities and the Tailwind snippet only reference variables that exist", () => {
    const defined = new Set(motionVariables().map(([n]) => n));
    const utilities = readFileSync(join(pkgRoot, "src/css/utilities.css"), "utf8") + KEYFRAMES;
    const tailwind = buildTailwindCss();
    const vts = readFileSync(join(pkgRoot, "src/css/view-transitions.css"), "utf8");
    for (const source of [utilities, tailwind, vts]) {
      for (const m of source.matchAll(/var\((--brand-motion-[\w-]+)/g)) expect(defined.has(m[1]!), m[1]).toBe(true);
    }
  });

  it("utilities handle reduced motion and only animate compositor-friendly properties", () => {
    const utilities = readFileSync(join(pkgRoot, "src/css/utilities.css"), "utf8");
    expect(utilities).toContain("@media (prefers-reduced-motion: reduce)");
    expect(utilities).toContain(':root[data-motion="reduce"]');
    for (const m of utilities.matchAll(/transition-property:\s*([^;]+);/g)) {
      const props = m[1]!.split(",").map((s) => s.trim());
      for (const prop of props) {
        expect(["transform", "opacity", "filter", "box-shadow", "outline-color", "outline-offset", "overlay", "display"], prop).toContain(prop);
      }
    }
    expect(utilities).not.toMatch(/transition:\s*all/);
    const vts = readFileSync(join(pkgRoot, "src/css/view-transitions.css"), "utf8");
    expect(vts).toContain("@media (prefers-reduced-motion: reduce)");
    // Reduced motion keeps a cross-fade (old/new get a duration) in both the media query and data-motion.
    expect(vts.match(/::view-transition-old\(\*\)[\s\S]*?animation-duration: var\(--brand-motion-duration-fast/g)).toHaveLength(2);
    // Reveal hides only observed, pending elements; drawer has a backdrop fade and an RTL direction.
    expect(utilities).toContain("[data-reveal][data-reveal-pending]");
    expect(utilities).not.toContain("m-js");
    expect(utilities).toContain("dialog.m-drawer::backdrop");
    expect(utilities).toContain("dialog.m-drawer:dir(rtl)");
    expect(utilities).not.toContain(".m-tile:focus-within");
  });

  it("spring curves start at 0, end at 1 and match the documented overshoot", () => {
    for (const config of Object.values(spring)) {
      const { samples } = simulateSpring(config);
      expect(samples[0]).toBe(0);
      expect(samples.at(-1)).toBe(1);
    }
    const peak = (name: keyof typeof spring) => Math.max(...simulateSpring(spring[name]).samples);
    expect(peak("snappy")).toBeLessThan(1.01);
    expect(peak("gentle")).toBeLessThan(1.01);
    expect(peak("press")).toBeGreaterThan(1.03);
    expect(peak("bouncy")).toBeGreaterThan(1.1);
    expect(springToCss(spring.press).easing.startsWith("linear(0,")).toBe(true);
  });
});

describe("easing functions", () => {
  it("cubicBezier matches the endpoints and is monotonic for the token curves", () => {
    for (const curve of Object.values(easing)) {
      const f = cubicBezier(curve);
      expect(f(0)).toBe(0);
      expect(f(1)).toBe(1);
      let last = 0;
      for (let t = 0.05; t <= 1; t += 0.05) {
        const y = f(t);
        expect(y).toBeGreaterThanOrEqual(last - 1e-9);
        last = y;
      }
    }
    expect(cubicBezier([0, 0, 1, 1])(0.37)).toBeCloseTo(0.37, 4);
    expect(easingFns.enter(0.5)).toBeGreaterThan(0.8);
  });

  it("stagger is capped", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2, 50)).toBe(100);
    expect(staggerDelay(50, 50)).toBe(staggerDelay(stagger.maxItems - 1, 50));
    expect(staggerDelay(50, 200)).toBe(budget.maxStaggerTotal);
  });
});

describe("cross-platform presets carry the same values", () => {
  it("React transitions use the token springs and seconds", () => {
    expect(react.transitions.press).toEqual({ type: "spring", ...spring.press });
    expect(react.transitions.gentle).toEqual({ type: "spring", ...spring.gentle });
    expect(react.transitions.fast).toEqual({ duration: seconds.fast, ease: [...easing.standard] });
    expect(react.press.whileTap.scale).toBe(scale.press);
    expect(react.press.transition).toEqual({ type: "spring", ...spring.press });
    expect(react.depthButton.whileHover.y).toBe(-distance.nudge);
    expect(react.tierTile.whileHover.y).toBe(-distance.lift);
    expect(react.dialog.hidden).toMatchObject({ opacity: 0, y: distance.dialog, scale: scale.dialog });
    expect(react.motionConfig.reducedMotion).toBe("user");
    const item = (react.listItem.visible as (i: number) => { transition: { delay: number; duration: number } })(3);
    expect(item.transition.delay).toBeCloseTo(staggerDelay(3, stagger.tight) / 1000);
    expect(item.transition.duration).toBe(seconds.slow);
  });

  it("React Native presets use the same springs, ms durations and reduceMotion: system", () => {
    expect(native.press.release).toEqual({ ...spring.press });
    expect(native.dialog.enter).toEqual({ ...spring.gentle });
    expect(native.dialog.exit).toEqual({ duration: duration.fast, bezier: easing.exit });
    expect(native.press.pressed.scale).toBe(scale.press);
    expect(native.tierTile.pressed.scale).toBe(scale.pressLarge);
    const fakeEasing = { bezier: (...a: number[]) => a };
    expect(native.timing(native.dialog.exit, fakeEasing)).toEqual({ duration: duration.fast, easing: [...easing.exit] });
    const m = createNativeMotion({ ReduceMotion: { System: "system" as const }, Easing: fakeEasing });
    expect(m.spring(native.press.release)).toEqual({ ...spring.press, reduceMotion: "system" });
    expect(m.timing(native.dialog.exit)).toEqual({ duration: duration.fast, easing: [...easing.exit], reduceMotion: "system" });
    expect(native.timingByName("normal", "enter", fakeEasing).duration).toBe(duration.normal);
  });

  it("every preset is exported for React, React Native and the neutral spec", () => {
    const reactNames = ["press", "depthButton", "tierTile", "dialog", "overlay", "drawer", "sheet", "listItem", "reveal"];
    for (const name of presetNames) {
      expect(native, name).toHaveProperty(name);
      if (name !== "countUp") expect(reactNames, name).toContain(name);
    }
    for (const name of reactNames) expect(react, name).toHaveProperty(name);
    expect(typeof react.useCountUp).toBe("function");
  });

  it("Svelte params match and drop travel for reduced motion", () => {
    expect(svelte.reveal(false)).toMatchObject({ y: distance.reveal, duration: duration.slower });
    expect(svelte.reveal(true).y).toBe(0);
    expect(svelte.dialogIn(true).start).toBe(1);
    expect(svelte.countUp(true).duration).toBe(0);
    expect(svelte.listItem(false, 2).delay).toBe(staggerDelay(2, stagger.tight));
    // Reduced values match the CSS tokens: reveal shortened to normal, no stagger.
    expect(svelte.reveal(true, 3)).toMatchObject({ y: 0, duration: duration.normal, delay: 0 });
    expect(svelte.listItem(true, 3).delay).toBe(0);
    const css = Object.fromEntries(reducedVariables());
    expect(css["--brand-motion-duration-slower"]).toBe(`${svelte.reveal(true).duration}ms`);
    expect(css["--brand-motion-stagger-normal"]).toBe("0ms");
  });

  it("poseToStyle resolves percentage offsets against the measured size and refuses to guess", () => {
    expect(poseToStyle(native.drawer.from, { width: 320 })).toEqual({ transform: [{ translateX: 320 }] });
    expect(poseToStyle(native.sheet.from, { height: 500 })).toEqual({ transform: [{ translateY: 500 }] });
    expect(() => poseToStyle(native.drawer.from)).toThrow(/size.width/);
    expect(poseToStyle(native.dialog.from)).toEqual({ opacity: 0, transform: [{ translateY: distance.dialog }, { scale: scale.dialog }] });
  });

  it("reducePose keeps only opacity", () => {
    expect(reducePose(presetSpecs.dialog.from)).toEqual({ opacity: 0 });
    expect(reducePose(presetSpecs.drawer.from)).toEqual({});
  });
});

describe("antipatterns.json", () => {
  const doc = JSON.parse(readFileSync(join(pkgRoot, "antipatterns.json"), "utf8"));
  it("has unique ids and every required field", () => {
    const ids = new Set<string>();
    for (const rule of doc.rules) {
      for (const field of ["id", "slug", "category", "severity", "title", "description", "whyAI", "heuristic", "detect", "fix"]) {
        expect(rule[field], `${rule.id}.${field}`).toBeTruthy();
      }
      expect(rule.id).toMatch(/^AP-MOT-\d{2}$/);
      expect(["high", "medium", "low"]).toContain(rule.severity);
      expect(["dom", "css", "runtime"]).toContain(rule.detect.kind);
      expect(ids.has(rule.id)).toBe(false);
      ids.add(rule.id);
    }
    expect(ids.size).toBeGreaterThanOrEqual(20);
  });

  it("css regex heuristics compile", () => {
    for (const rule of doc.rules) if (rule.detect.params?.pattern) expect(() => new RegExp(rule.detect.params.pattern)).not.toThrow();
  });

  it("every rule is listed in PRINCIPLES.md", () => {
    const principles = readFileSync(join(pkgRoot, "PRINCIPLES.md"), "utf8");
    for (const rule of doc.rules) expect(principles, rule.id).toContain(rule.id);
  });
});

describe("house style", () => {
  it("no em or en dashes in package text", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (["node_modules", "dist"].includes(name)) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(md|json|css|ts)$/.test(name)) files.push(path);
      }
    };
    walk(pkgRoot);
    for (const file of files) expect(readFileSync(file, "utf8"), file).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("React Native reduced-motion subscription", () => {
  it("reports the initial value and live changes, and unsubscribes", async () => {
    const { subscribeReducedMotion } = await import("./native.ts");
    let handler: ((v: boolean) => void) | undefined;
    let removed = false;
    const info = {
      isReduceMotionEnabled: () => Promise.resolve(true),
      addEventListener: (_e: "reduceMotionChanged", h: (v: boolean) => void) => {
        handler = h;
        return { remove: () => { removed = true; } };
      },
    };
    const seen: boolean[] = [];
    const stop = subscribeReducedMotion(info, (v) => seen.push(v));
    await Promise.resolve();
    handler!(false);
    expect(seen).toEqual([true, false]);
    stop();
    expect(removed).toBe(true);
  });
});
