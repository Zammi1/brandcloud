/**
 * Character and object motion: the physics behind a guide that follows the page, a mascot that hops
 * between places, an object that flies along an arc, and a 3D turntable that springs back to a pose.
 * Framework-agnostic and dependency-free. Every driver runs one requestAnimationFrame loop only while
 * something is moving, stops when settled, and jumps (or cross-fades) under reduced motion.
 *
 * Pair with the CSS presets in @brandcloud/motion/character.css (settle, pop-in, hop, celebrate ...):
 * the drivers move things, the CSS gives them weight when they land.
 */
import { prefersReducedMotion } from "./dom.ts";
import { cssBezier, duration, easing, spring as springTokens, type SpringConfig } from "./tokens.ts";

export interface Point { x: number; y: number }

/** Names of the CSS presets in character.css, for `el.dataset.motion = name` or `m-${name}` classes. */
export const characterPresets = [
  "settle", "pop-in", "hop", "celebrate", "settle-in", "hop-out", "stretch", "hold",
] as const;
export type CharacterPreset = (typeof characterPresets)[number];
/** Idle and surface presets (class names only, `m-${name}`). */
export const surfacePresets = [
  "breathe", "float", "blink", "nod", "wave", "phrase", "splash-art", "splash-rise", "splash-fade",
  "card-enter", "ripple", "typing", "progress", "squash",
] as const;
export type SurfacePreset = (typeof surfacePresets)[number];

/** Durations of the one-shot presets, so script can wait for a landing to finish. */
export const presetDurationMs: Readonly<Record<CharacterPreset, number>> = {
  settle: 380, "pop-in": 320, hop: 500, celebrate: 720, "settle-in": 850, "hop-out": 180, stretch: duration.fast, hold: duration.fast,
};

/**
 * Replays a one-shot CSS preset on an element by setting `data-motion`. Resolves when it has played
 * (immediately under reduced motion, where the CSS does nothing).
 */
export function playPreset(el: HTMLElement, name: CharacterPreset, { reduced = prefersReducedMotion() } = {}): Promise<void> {
  if (reduced) return Promise.resolve();
  delete el.dataset.motion;
  void el.offsetWidth; // restart the animation
  el.dataset.motion = name;
  return new Promise((resolve) => setTimeout(() => {
    if (el.dataset.motion === name && name !== "stretch" && name !== "hold") delete el.dataset.motion;
    resolve();
  }, presetDurationMs[name]));
}

/** A point on the quadratic Bezier from `a` to `b` with control point `c`, at t in [0, 1]. */
export function quadraticPoint(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

export interface ArcOptions {
  /** How high the arc rises above the straight line, as a share of its length (default 0.25). */
  lift?: number;
  /** Fixed lift in px; wins over `lift`. */
  liftPx?: number;
  /** Number of segments sampled (default 16). */
  steps?: number;
}

/** Control point for an arc that bows upwards (towards negative y) between two points. */
export function arcControl(from: Point, to: Point, { lift = 0.25, liftPx }: ArcOptions = {}): Point {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const rise = liftPx ?? len * lift;
  return { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - rise };
}

/** Samples a flight arc as points, start and end included. */
export function flightPath(from: Point, to: Point, options: ArcOptions = {}): Point[] {
  const steps = Math.max(2, Math.round(options.steps ?? 16));
  const c = arcControl(from, to, options);
  return Array.from({ length: steps + 1 }, (_, i) => quadraticPoint(from, c, to, i / steps));
}

/** Web Animations keyframes that move an element (positioned at `from`) along the arc to `to`. */
export function flightKeyframes(from: Point, to: Point, options: ArcOptions = {}): Keyframe[] {
  const points = flightPath(from, to, options);
  return points.map((p, i) => ({
    offset: i / (points.length - 1),
    transform: `translate3d(${(p.x - from.x).toFixed(1)}px, ${(p.y - from.y).toFixed(1)}px, 0)`,
  }));
}

export interface FlyOptions extends ArcOptions {
  /** Duration in ms (default: the slower token, the ceiling for a UI move). */
  duration?: number;
  /** Plays the settle squash on the element (or `landOn`) when it arrives. Default true. */
  settle?: boolean;
  landOn?: HTMLElement;
  reduced?: boolean;
}

/**
 * Flies an element along an arc from `from` to `to` (viewport or container pixels, matching how the
 * element is positioned), then settles it. Under reduced motion it fades out and in at the target.
 * Returns the finished promise; the caller places the element at `to` afterwards.
 */
export async function flyTo(el: HTMLElement, from: Point, to: Point, options: FlyOptions = {}): Promise<void> {
  const reduced = options.reduced ?? prefersReducedMotion();
  if (typeof el.animate !== "function") return;
  if (reduced) {
    await el.animate([{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], { duration: duration.normal, easing: "linear" }).finished.catch(() => {});
    return;
  }
  const animation = el.animate(flightKeyframes(from, to, options), {
    duration: options.duration ?? duration.slower,
    easing: cssBezier(easing.move),
    fill: "forwards",
  });
  await animation.finished.catch(() => {});
  animation.cancel();
  if (options.settle !== false) await playPreset(options.landOn ?? el, "settle", { reduced });
}

export interface FollowerOptions {
  /** Spring stiffness. Critically damped unless `damping` is set (default stiffness 190). */
  stiffness?: number;
  damping?: number;
  mass?: number;
  /** Called on every frame with the current position. Write it to a transform. */
  apply: (p: Point) => void;
  /** Called once when a glide ends (not after a jump). Play "settle" here. */
  onLand?: () => void;
  /** Called when a glide starts. Set "stretch" here. */
  onMove?: () => void;
  reduced?: () => boolean;
  /** Below this distance a move is a nudge: no stretch, no landing. Default 24px. */
  minTravel?: number;
}

export interface Follower {
  moveTo(p: Point, how?: "glide" | "jump"): void;
  position(): Point;
  isMoving(): boolean;
  stop(): void;
}

/**
 * A critically damped spring that follows a goal (a guide keeping level with what it talks about).
 * One rAF loop only while moving. Reduced motion: every move is a jump.
 */
export function springFollower(start: Point, options: FollowerOptions): Follower {
  const k = options.stiffness ?? 190;
  const mass = options.mass ?? 1;
  const c = options.damping ?? 2 * Math.sqrt(k * mass);
  const reduced = options.reduced ?? prefersReducedMotion;
  const minTravel = options.minTravel ?? 24;
  let pos = { ...start }, vel = { x: 0, y: 0 }, goal = { ...start };
  let raf = 0, last = 0, gliding = false;
  const raf$ = (cb: FrameRequestCallback) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(cb) : (setTimeout(() => cb(Date.now()), 16) as unknown as number));
  const cancel = (id: number) => (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(id) : clearTimeout(id));
  const step = (t: number) => {
    const dt = Math.min(1 / 30, (t - (last || t)) / 1000 || 1 / 60);
    last = t;
    for (const axis of ["x", "y"] as const) {
      vel[axis] += ((k * (goal[axis] - pos[axis]) - c * vel[axis]) / mass) * dt;
      pos[axis] += vel[axis] * dt;
    }
    const settled = Math.abs(goal.x - pos.x) < 0.5 && Math.abs(goal.y - pos.y) < 0.5 && Math.abs(vel.x) < 4 && Math.abs(vel.y) < 4;
    if (settled) {
      pos = { ...goal }; vel = { x: 0, y: 0 }; raf = 0; last = 0;
      options.apply(pos);
      if (gliding) { gliding = false; options.onLand?.(); }
      return;
    }
    options.apply(pos);
    raf = raf$(step);
  };
  return {
    moveTo(p, how = "glide") {
      goal = { ...p };
      if (how === "jump" || reduced()) {
        cancel(raf); raf = 0; last = 0; gliding = false;
        pos = { ...p }; vel = { x: 0, y: 0 };
        options.apply(pos);
        return;
      }
      if (Math.hypot(goal.x - pos.x, goal.y - pos.y) > minTravel && !gliding) { gliding = true; options.onMove?.(); }
      if (!raf) raf = raf$(step);
    },
    position: () => ({ ...pos }),
    isMoving: () => raf !== 0,
    stop() { cancel(raf); raf = 0; last = 0; },
  };
}

/**
 * Hops an element from one place to another without crossing the page: out with "hop-out", moved by
 * `place`, then in with "pop-in". Under reduced motion it simply moves.
 */
export async function hopTo(el: HTMLElement, place: () => void, { reduced = prefersReducedMotion() } = {}): Promise<void> {
  if (reduced) { place(); return; }
  await playPreset(el, "hop-out", { reduced });
  place();
  await playPreset(el, "pop-in", { reduced });
}

export interface TurntableOptions {
  /** Called with the current angle in radians on every frame. Render here. */
  render: (angle: number) => void;
  /** Spring for the release (default: the gentle token). */
  spring?: SpringConfig;
  /** Angles the turntable rests at after release (default: whole turns). */
  snap?: number;
  reduced?: () => boolean;
}

export interface Turntable {
  /** Drag support: call with a pointer x delta in px; `release(velocity)` springs to the nearest pose. */
  drag(deltaPx: number, pxToRad?: number): void;
  release(velocityRadPerSec?: number): void;
  /** Keyboard and button alternative to dragging. */
  turn(direction?: 1 | -1): void;
  angle(): number;
  isAnimating(): boolean;
  /** Pause while off screen or in a hidden tab; resume picks up where it was. */
  pause(): void;
  resume(): void;
}

/**
 * A spring turntable for a 3D object (or a 2D dial): drag to turn, release springs to the nearest
 * resting pose, `turn()` does a whole turn. Semi-implicit Euler at 1 ms steps, the same physics as the
 * CSS spring curves. Renders only while moving; under reduced motion every change is instant.
 */
export function turntable(start: number, options: TurntableOptions): Turntable {
  const { stiffness, damping, mass } = options.spring ?? springTokens.gentle;
  const snap = options.snap ?? Math.PI * 2;
  const reduced = options.reduced ?? prefersReducedMotion;
  let angle = start, target = start, velocity = 0, dragging = false, frame = 0, last = 0, paused = false;
  const tick = (now: number) => {
    frame = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!dragging) {
      for (let s = 0; s < Math.round(dt * 1000); s += 1) {
        const force = -stiffness * (angle - target) - damping * velocity;
        velocity += (force / mass) * 0.001;
        angle += velocity * 0.001;
      }
    }
    if (!dragging && Math.abs(angle - target) < 0.0005 && Math.abs(velocity) < 0.001) {
      angle = target; velocity = 0; last = 0; options.render(angle);
      return;
    }
    options.render(angle);
    if (!paused) frame = requestAnimationFrame(tick);
  };
  const wake = () => { if (!frame && !paused) { last = 0; frame = requestAnimationFrame(tick); } };
  const settleNow = () => { angle = target; velocity = 0; options.render(angle); };
  return {
    drag(deltaPx, pxToRad = 0.012) { dragging = true; angle += deltaPx * pxToRad; options.render(angle); },
    release(v = 0) {
      dragging = false;
      target = Math.round((angle + v * 0.12) / snap) * snap;
      velocity = v;
      if (reduced()) settleNow(); else wake();
    },
    turn(direction = 1) { target += snap * direction; if (reduced()) settleNow(); else wake(); },
    angle: () => angle,
    isAnimating: () => frame !== 0,
    pause() { paused = true; if (frame) cancelAnimationFrame(frame); frame = 0; },
    resume() { paused = false; if (angle !== target || velocity !== 0) wake(); },
  };
}
