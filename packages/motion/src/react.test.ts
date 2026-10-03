// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Motion caches the reduced-motion media query globally, so drive it directly.
const state = vi.hoisted(() => ({ reduced: false, animateCalls: 0 }));
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => state.reduced,
    animate: (...args: Parameters<typeof actual.animate>) => {
      state.animateCalls += 1;
      return (actual.animate as (...a: unknown[]) => ReturnType<typeof actual.animate>)(...args);
    },
  };
});

const { useBrandMotionConfig, useBrandReducedMotion, useCountUp } = await import("./react.ts");
afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.motion;
  state.animateCalls = 0;
});

describe("useCountUp", () => {
  it("shows the final value straight away with reduced motion", () => {
    state.reduced = true;
    const { result } = renderHook(() => useCountUp(2400));
    expect(result.current).toBe("2,400");
  });

  it("starts from the `from` value without reduced motion and does not run before start", () => {
    state.reduced = false;
    const { result } = renderHook(() => useCountUp(2400, { from: 100, start: false }));
    expect(result.current).toBe("100");
  });

  it("honours <html data-motion=reduce> even when the OS does not ask", () => {
    state.reduced = false;
    document.documentElement.dataset.motion = "reduce";
    const { result } = renderHook(() => useCountUp(2400, { from: 100 }));
    expect(result.current).toBe("2,400");
  });

  it("does not restart when the caller passes a new but equal ease array each render", () => {
    state.reduced = false;
    const { rerender } = renderHook(() => useCountUp(500, { ease: [0.22, 1, 0.36, 1] }));
    rerender();
    rerender();
    expect(state.animateCalls).toBe(1);
  });
});

describe("brand reduced-motion hooks", () => {
  it("follow data-motion=reduce live", async () => {
    state.reduced = false;
    const config = renderHook(() => useBrandMotionConfig());
    const reduced = renderHook(() => useBrandReducedMotion());
    expect(config.result.current.reducedMotion).toBe("user");
    expect(reduced.result.current).toBe(false);
    await act(async () => {
      document.documentElement.dataset.motion = "reduce";
      await Promise.resolve();
    });
    expect(config.result.current.reducedMotion).toBe("always");
    expect(reduced.result.current).toBe(true);
  });

  it("follow the OS setting", () => {
    state.reduced = true;
    const reduced = renderHook(() => useBrandReducedMotion());
    expect(reduced.result.current).toBe(true);
    state.reduced = false;
  });
});
