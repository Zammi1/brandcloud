import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { arcControl, characterPresets, flightKeyframes, flightPath, quadraticPoint, springFollower, surfacePresets, turntable } from "./character.ts";

const css = readFileSync(new URL("./css/character.css", import.meta.url), "utf8");

describe("flight arcs", () => {
  it("start and end exactly at the two points and bow upwards", () => {
    const from = { x: 0, y: 200 }, to = { x: 400, y: 200 };
    const path = flightPath(from, to, { steps: 8 });
    expect(path[0]).toEqual(from);
    expect(path.at(-1)).toEqual(to);
    expect(Math.min(...path.map((p) => p.y))).toBeLessThan(200);
    expect(arcControl(from, to).y).toBe(100); // a quarter of the length above the line
  });
  it("produces translate keyframes relative to the start with offsets 0 to 1", () => {
    const frames = flightKeyframes({ x: 10, y: 10 }, { x: 110, y: 10 }, { steps: 4, liftPx: 40 });
    expect(frames).toHaveLength(5);
    expect(frames[0]).toMatchObject({ offset: 0, transform: "translate3d(0.0px, 0.0px, 0)" });
    expect(frames[4]).toMatchObject({ offset: 1, transform: "translate3d(100.0px, 0.0px, 0)" });
  });
  it("quadratic midpoint is halfway between the line midpoint and the control point", () => {
    expect(quadraticPoint({ x: 0, y: 0 }, { x: 50, y: -100 }, { x: 100, y: 0 }, 0.5)).toEqual({ x: 50, y: -50 });
  });
});

describe("spring follower", () => {
  it("glides to the goal, lands once and stops its loop", async () => {
    vi.useFakeTimers();
    const seen: Array<{ x: number; y: number }> = [];
    const onLand = vi.fn(), onMove = vi.fn();
    const f = springFollower({ x: 0, y: 0 }, { apply: (p) => seen.push(p), onLand, onMove, reduced: () => false });
    f.moveTo({ x: 0, y: 300 });
    expect(onMove).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(f.position()).toEqual({ x: 0, y: 300 });
    expect(f.isMoving()).toBe(false);
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(Math.max(...seen.map((p) => p.y))).toBeLessThanOrEqual(300.5); // critically damped: no overshoot
    vi.useRealTimers();
  });
  it("jumps under reduced motion with no landing", () => {
    const onLand = vi.fn();
    const f = springFollower({ x: 0, y: 0 }, { apply: () => {}, onLand, reduced: () => true });
    f.moveTo({ x: 50, y: 50 });
    expect(f.position()).toEqual({ x: 50, y: 50 });
    expect(f.isMoving()).toBe(false);
    expect(onLand).not.toHaveBeenCalled();
  });
});

describe("turntable", () => {
  it("snaps to the nearest whole turn instantly under reduced motion", () => {
    let angle = 0;
    const t = turntable(0, { render: (a) => { angle = a; }, reduced: () => true });
    t.drag(400); // 4.8 rad
    t.release();
    expect(angle).toBeCloseTo(Math.PI * 2);
    t.turn(-1);
    expect(t.angle()).toBeCloseTo(0);
  });
});

describe("character.css", () => {
  it("defines every named preset as a class", () => {
    for (const name of [...characterPresets, ...surfacePresets]) expect(css).toContain(`.m-${name}`);
  });
  it("gates every animation behind prefers-reduced-motion and data-motion=reduce", () => {
    const [gated, rest] = css.split("/* Squash on press");
    expect(gated).toContain("@media (prefers-reduced-motion: no-preference)");
    for (const line of gated!.split("\n").filter((l) => /animation:/.test(l))) expect(line).toContain(':root:not([data-motion="reduce"])');
    expect(rest!.split("@keyframes")[0]).not.toMatch(/animation:/);
  });
  it("animates only transform and opacity in keyframes", () => {
    for (const block of css.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\}\s*(?=@keyframes|$)/g)) {
      const props = [...block[1]!.matchAll(/([a-z-]+):/g)].map((m) => m[1]);
      for (const prop of props) expect(["transform", "opacity"]).toContain(prop);
    }
  });
});
