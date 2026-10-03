/** Generates the CSS custom properties and the Tailwind v4 snippet from the tokens. */
import { springToCss } from "./easing.ts";
import { cssBezier, distance, duration, easing, scale, spring, stagger } from "./tokens.ts";

export const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
export const cssVar = (group: string, name: string) => `--brand-motion-${group}-${kebab(name)}`;

/** Every custom property and its value, in a stable order. */
export function motionVariables(): Array<[string, string]> {
  const vars: Array<[string, string]> = [["--brand-motion-travel", "1"]];
  for (const [k, v] of Object.entries(duration)) vars.push([cssVar("duration", k), `${v}ms`]);
  for (const [k, v] of Object.entries(easing)) vars.push([cssVar("ease", k), cssBezier(v)]);
  for (const [k, v] of Object.entries(spring)) {
    const { easing: curve, durationMs } = springToCss(v);
    vars.push([cssVar("spring", k), curve]);
    vars.push([`${cssVar("spring", k)}-duration`, `${durationMs}ms`]);
  }
  for (const [k, v] of Object.entries(distance)) vars.push([cssVar("distance", k), `${v}px`]);
  for (const [k, v] of Object.entries(scale)) vars.push([cssVar("scale", k), String(v)]);
  for (const [k, v] of Object.entries(stagger)) vars.push([cssVar("stagger", k), k === "maxItems" ? String(v) : `${v}ms`]);
  return vars;
}

/**
 * Reduced motion: no travel, no scale, no overshoot. Durations stay so short opacity changes still
 * explain what happened. Applies for the OS setting and for <html data-motion="reduce">.
 */
export function reducedVariables(): Array<[string, string]> {
  const vars: Array<[string, string]> = [["--brand-motion-travel", "0"]];
  for (const k of Object.keys(distance)) vars.push([cssVar("distance", k), "0px"]);
  for (const k of Object.keys(scale)) vars.push([cssVar("scale", k), "1"]);
  for (const k of Object.keys(spring)) {
    vars.push([cssVar("spring", k), cssBezier(easing.standard)]);
    vars.push([`${cssVar("spring", k)}-duration`, `${duration.fast}ms`]);
  }
  for (const k of Object.keys(stagger)) if (k !== "maxItems") vars.push([cssVar("stagger", k), "0ms"]);
  vars.push([cssVar("duration", "slower"), `${duration.normal}ms`]);
  vars.push([cssVar("duration", "count"), "0ms"]);
  return vars;
}

const block = (selector: string, vars: Array<[string, string]>, indent = "  ") =>
  [`${indent}${selector} {`, ...vars.map(([n, v]) => `${indent}  ${n}: ${v};`), `${indent}}`].join("\n");

export function buildTokensCss(): string {
  return [
    "/* @brandcloud/motion tokens. Generated from src/tokens.json: do not edit by hand. */",
    "@layer tokens {",
    block(":root", motionVariables()),
    block(':root[data-motion="reduce"]', reducedVariables()),
    "}",
    "@media (prefers-reduced-motion: reduce) {",
    "  @layer tokens {",
    block(":root", reducedVariables(), "    "),
    "  }",
    "}",
    "",
  ].join("\n");
}

export function buildTailwindCss(): string {
  const lines = [
    "/* @brandcloud/motion Tailwind v4 snippet. Import after tailwindcss and @brandcloud/motion/tokens.css. */",
    "@theme inline {",
  ];
  for (const k of Object.keys(easing)) lines.push(`  --ease-brand-${kebab(k)}: var(${cssVar("ease", k)});`);
  for (const k of Object.keys(spring)) lines.push(`  --ease-spring-${kebab(k)}: var(${cssVar("spring", k)});`);
  lines.push(`  --animate-brand-enter: brand-motion-enter var(--brand-motion-duration-slow) var(--brand-motion-ease-enter) both;`);
  lines.push(`  --animate-brand-exit: brand-motion-exit var(--brand-motion-duration-fast) var(--brand-motion-ease-exit) both;`);
  lines.push(`  --animate-brand-spin: brand-motion-spin 0.8s linear infinite;`);
  lines.push("}");
  lines.push(KEYFRAMES);
  for (const k of Object.keys(duration)) {
    lines.push(`@utility duration-brand-${kebab(k)} {`, `  transition-duration: var(${cssVar("duration", k)});`, `}`);
  }
  for (const k of Object.keys(spring)) {
    lines.push(
      `@utility transition-spring-${kebab(k)} {`,
      `  transition-duration: var(${cssVar("spring", k)}-duration);`,
      `  transition-timing-function: var(${cssVar("spring", k)});`,
      `}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

/** Keyframes shared by utilities.css and the Tailwind snippet. Movement uses --brand-motion-travel. */
export const KEYFRAMES = `@keyframes brand-motion-enter {
  from { opacity: 0; transform: translateY(calc(var(--brand-motion-distance-dialog) * var(--brand-motion-travel))) scale(var(--brand-motion-scale-dialog)); }
}
@keyframes brand-motion-exit {
  to { opacity: 0; transform: scale(var(--brand-motion-scale-dialog)); }
}
@keyframes brand-motion-reveal {
  from { opacity: 0; transform: translateY(var(--brand-motion-distance-reveal)); }
}
@keyframes brand-motion-spin {
  to { transform: rotate(1turn); }
}
@keyframes brand-motion-pulse {
  50% { opacity: 0.45; }
}`;
