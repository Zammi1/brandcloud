/** Facts about the anti-AI rules, read from the published rules.json so numbers on the site never drift. */
import rulesJson from "@brandcloud/antipatterns/rules.json";

export interface Rule {
  id: string;
  slug: string;
  category: string;
  title: string;
  description: string;
  whyAI: string;
  severity: "high" | "medium" | "low";
  detect: { kind: string; check: string; params?: Record<string, unknown> };
  fix: string;
  pair?: string;
  sectionTypes?: string[];
}

export const rules = rulesJson.rules as Rule[];
export const categories = rulesJson.categories as Record<string, string>;
export const scoring = rulesJson.scoring as {
  weights: Record<string, number>;
  bands: { max: number; label: string; meaning: string }[];
  cap: number;
};
/** Checks the engine runs from Node (pointer and scroll probes), so the browser tool cannot. */
export const NODE_ONLY_CHECKS = new Set(["cursorGlow", "parallaxDecor"]);
export const ruleCounts = {
  visual: rules.length,
  cliOnly: rules.filter((r) => NODE_ONLY_CHECKS.has(r.detect.check)).length,
  browser: rules.filter((r) => !NODE_ONLY_CHECKS.has(r.detect.check)).length,
};
/** Band ranges as text, e.g. "0 to 9". */
export const bandRanges = scoring.bands.map((b, i) => ({
  ...b,
  min: i === 0 ? 0 : scoring.bands[i - 1].max + 1,
  range: i === 0 ? `0 to ${b.max}` : i === scoring.bands.length - 1 ? `${scoring.bands[i - 1].max + 1} and over` : `${scoring.bands[i - 1].max + 1} to ${b.max}`,
}));

/**
 * Rule text as shown on this site. Two rules quote the very placeholders they detect; printing those
 * quotes would make the page trip the rule, so the quotes are described instead. The rule ids, fixes
 * and meaning are unchanged.
 */
export function displayText(text: string): string {
  return text
    .replace(/'Edit with Lovable' badges/g, "site builder badges")
    .replace(/lorem ipsum/gi, "dummy Latin text")
    .replace(/'\[Your Company\]'/g, "bracketed name placeholders");
}
