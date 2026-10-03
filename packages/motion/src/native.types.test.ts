// Compile-time check (run by `pnpm typecheck`): the README examples satisfy Reanimated 4's config
// types. The declarations below mirror react-native-reanimated's public types, including the
// string enum ReduceMotion, which a plain "system" literal would NOT satisfy.
import { describe, expect, it } from "vitest";
import { createNativeMotion, native } from "./native.ts";

enum ReduceMotion {
  System = "system",
  Always = "always",
  Never = "never",
}
type EasingFunction = (t: number) => number;
interface EasingFactory {
  factory: () => EasingFunction;
}
const Easing = {
  bezier: (x1: number, y1: number, x2: number, y2: number): EasingFactory => ({ factory: () => (t: number) => t + 0 * (x1 + y1 + x2 + y2) }),
};
interface WithSpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  overshootClamping?: boolean;
  reduceMotion?: ReduceMotion;
}
interface WithTimingConfig {
  duration?: number;
  easing?: EasingFunction | EasingFactory;
  reduceMotion?: ReduceMotion;
}
declare function withSpring(to: number, config?: WithSpringConfig): number;
declare function withTiming(to: number, config?: WithTimingConfig): number;

// These lines are the README examples. If they stop compiling, typecheck fails.
const typed = createNativeMotion({ ReduceMotion, Easing });
export const examples = [
  () => withSpring(native.press.pressed.scale, native.press.release),
  () => withTiming(1, native.timing(native.dialog.enterOpacity, Easing)),
  () => withSpring(1, typed.spring(native.press.release)),
  () => withTiming(1, typed.timing(native.dialog.exit)),
];

describe("Reanimated types", () => {
  it("createNativeMotion carries the enum member through", () => {
    expect(typed.spring().reduceMotion).toBe(ReduceMotion.System);
    expect(examples).toHaveLength(4);
  });
});
