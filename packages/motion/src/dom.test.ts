// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countUp, prefersReducedMotion, reveal, viewTransition, whenVisible } from "./dom.ts";

type IOCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
const observers: Array<{ cb: IOCallback; targets: Set<Element> }> = [];

function installIO() {
  observers.length = 0;
  class FakeIO {
    targets = new Set<Element>();
    constructor(public cb: IOCallback) {
      observers.push(this);
    }
    observe(el: Element) { this.targets.add(el); }
    unobserve(el: Element) { this.targets.delete(el); }
    disconnect() { this.targets.clear(); }
  }
  vi.stubGlobal("IntersectionObserver", FakeIO);
}

function setReduced(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  document.documentElement.className = "";
  delete document.documentElement.dataset.motion;
  document.body.innerHTML = `
    <section data-reveal id="a">A</section>
    <div data-reveal-group>${Array.from({ length: 9 }, (_, i) => `<p data-reveal id="g${i}">${i}</p>`).join("")}</div>`;
  installIO();
  setReduced(false);
});
afterEach(() => vi.unstubAllGlobals());

// jsdom lays nothing out, so give each element a top position: "a" and the group sit below the fold.
function placeBelowFold(ids: string[], top = 2000) {
  for (const id of ids) {
    const el = document.getElementById(id)!;
    el.getBoundingClientRect = () => ({ top, bottom: top + 100, left: 0, right: 0, width: 0, height: 100, x: 0, y: top, toJSON() {} }) as DOMRect;
  }
}
const allIds = ["a", ...Array.from({ length: 9 }, (_, i) => `g${i}`)];

describe("reveal()", () => {
  it("hides only below-the-fold elements it observes, then reveals on intersection", () => {
    placeBelowFold(allIds);
    const stop = reveal();
    const a = document.getElementById("a")!;
    expect(a.hasAttribute("data-reveal-pending")).toBe(true);
    expect(document.documentElement.classList.contains("m-js")).toBe(false);
    observers[0]!.cb([{ isIntersecting: true, target: a }]);
    expect(a.hasAttribute("data-revealed")).toBe(true);
    expect(a.hasAttribute("data-reveal-pending")).toBe(false);
    stop();
  });

  it("never hides content that is already on screen when the script starts", () => {
    placeBelowFold(allIds.filter((id) => id !== "a"));
    placeBelowFold(["a"], 100); // in the first viewport
    reveal();
    const a = document.getElementById("a")!;
    expect(a.hasAttribute("data-reveal-pending")).toBe(false);
    expect(a.hasAttribute("data-revealed")).toBe(true);
    expect(observers[0]!.targets.has(a)).toBe(false);
  });

  it("scopes to root: elements outside it are left alone", () => {
    placeBelowFold(allIds);
    const group = document.querySelector<HTMLElement>("[data-reveal-group]")!;
    reveal({ root: group });
    expect(document.getElementById("a")!.hasAttribute("data-reveal-pending")).toBe(false);
    expect(document.getElementById("g3")!.hasAttribute("data-reveal-pending")).toBe(true);
  });

  it("uses threshold 0 so very tall sections still reveal", () => {
    placeBelowFold(allIds);
    const seen: Array<IntersectionObserverInit | undefined> = [];
    class SpyIO {
      constructor(_cb: unknown, init?: IntersectionObserverInit) { seen.push(init); }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", SpyIO);
    reveal();
    expect(seen[0]?.threshold).toBe(0);
  });

  it("caps the stagger index for groups", () => {
    reveal();
    expect(document.getElementById("g0")!.style.getPropertyValue("--m-index")).toBe("0");
    expect(document.getElementById("g8")!.style.getPropertyValue("--m-index")).toBe("5");
  });

  it("shows everything at once with reduced motion", () => {
    placeBelowFold(allIds);
    setReduced(true);
    reveal();
    expect(document.querySelectorAll("[data-reveal-pending]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-reveal]:not([data-revealed])")).toHaveLength(0);
  });

  it("respects <html data-motion=reduce>", () => {
    placeBelowFold(allIds);
    document.documentElement.dataset.motion = "reduce";
    expect(prefersReducedMotion()).toBe(true);
    reveal();
    expect(document.querySelectorAll("[data-reveal-pending]")).toHaveLength(0);
  });

  it("shows everything without IntersectionObserver", () => {
    placeBelowFold(allIds);
    vi.stubGlobal("IntersectionObserver", undefined);
    reveal();
    expect(document.querySelectorAll("[data-reveal]:not([data-revealed])")).toHaveLength(0);
  });

  it("cleanup un-hides anything still pending", () => {
    placeBelowFold(allIds);
    const stop = reveal();
    stop();
    expect(document.querySelectorAll("[data-reveal-pending]")).toHaveLength(0);
  });
});

describe("whenVisible()", () => {
  it("starts on enter, stops on leave and when the tab is hidden", () => {
    const el = document.getElementById("a")!;
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    const stop = whenVisible(el, { onEnter, onLeave });
    observers[0]!.cb([{ isIntersecting: true, target: el }]);
    expect(onEnter).toHaveBeenCalledTimes(1);
    observers[0]!.cb([{ isIntersecting: false, target: el }]);
    expect(onLeave).toHaveBeenCalledTimes(1);
    observers[0]!.cb([{ isIntersecting: true, target: el }]);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onLeave).toHaveBeenCalledTimes(2);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    stop();
  });
});

describe("countUp()", () => {
  it("sets the final en-GB value at once with reduced motion", () => {
    setReduced(true);
    const el = document.createElement("span");
    countUp(el, 12500);
    expect(el.textContent).toBe("12,500");
  });

  it("animates to the final value", () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const el = document.createElement("span");
    countUp(el, 400, { durationMs: 100 });
    now = 50;
    frames.shift()!(now);
    const mid = Number(el.textContent);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(400);
    now = 120;
    frames.shift()!(now);
    expect(el.textContent).toBe("400");
  });
});

describe("viewTransition()", () => {
  it("falls back to a plain update without the API", async () => {
    const update = vi.fn();
    await viewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("uses startViewTransition when present", async () => {
    const start = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: typeof start }).startViewTransition = start;
    const update = vi.fn();
    await viewTransition(update);
    expect(start).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
});

describe("Svelte presets honour <html data-motion=reduce>", () => {
  it("drop travel, stagger and count-up without the reduced flag", async () => {
    const { svelte } = await import("./svelte.ts");
    expect(svelte.reveal(false, 2).y).toBeGreaterThan(0);
    document.documentElement.dataset.motion = "reduce";
    expect(svelte.reveal(false, 2)).toMatchObject({ y: 0, delay: 0 });
    expect(svelte.listItem(false, 2).delay).toBe(0);
    expect(svelte.countUp(false).duration).toBe(0);
    expect(svelte.dialogIn(false).start).toBe(1);
  });
});
