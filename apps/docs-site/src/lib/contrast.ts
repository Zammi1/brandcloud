/** Contrast numbers from the tokens build (dist/contrast-report.json): what the build actually measured. */
import report from "@brandcloud/tokens/contrast-report";

interface Check { fg: string; bg: string; ratio: number; need: number; pass: boolean; required: boolean }
const entries = report as unknown as { brand: string; mode: string; checks: Check[] }[];

export function ratio(brand: string, mode: string, fg: string, bg: string): Check {
  const set = entries.find((e) => e.brand === brand && e.mode === mode);
  const hit = set?.checks.find((c) => c.fg === fg && c.bg === bg);
  if (!hit) throw new Error(`contrast: no check ${fg} on ${bg} for ${brand} ${mode}`);
  return hit;
}
export const fmt = (n: number) => `${n.toFixed(2)}:1`;
